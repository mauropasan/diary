import { Node, mergeAttributes } from '@tiptap/core';
import {
    NodeViewWrapper,
    ReactNodeViewRenderer,
    type NodeViewProps,
} from '@tiptap/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { attachmentByRef, attachmentObjectUrl } from '@/native/repo';
import type { AttachmentMeta } from '@/native/types';

/**
 * The media node of the native editor.
 *
 * Same DOM contract as the web's `MediaNode` (`figure[data-media]` with a
 * `data-attachment-id`), with two native-side differences:
 *
 * - The id is a STRING, because a file created offline carries a local uuid
 *   until the sync engine swaps in the server's numeric id (the web node
 *   coerces to number and would destroy it).
 * - Rendering goes through a React NodeView that resolves the id against the
 *   encrypted blob store (downloading and caching on first view when the file
 *   only exists on the server), so images keep working with no connection.
 */

export type NativeMediaKind = 'image' | 'audio' | 'video' | 'file';

/** `src` embedded for a file this device has not uploaded yet. */
export const PENDING_SRC_PREFIX = 'diary-attachment://';

function srcFor(kind: NativeMediaKind, src: string, id: string): string {
    return src !== '' ? src : `${PENDING_SRC_PREFIX}${id}`;
}

const NativeMediaNode = Node.create({
    name: 'media',

    group: 'block',

    atom: true,

    draggable: true,

    selectable: true,

    addAttributes() {
        return {
            kind: {
                default: 'file',
                parseHTML: (element) => element.getAttribute('data-kind'),
                renderHTML: (attributes) => ({
                    'data-kind': attributes.kind,
                }),
            },
            originalName: {
                default: '',
                parseHTML: (element) =>
                    element.getAttribute('data-original-name') ?? '',
                renderHTML: (attributes) => ({
                    'data-original-name': attributes.originalName || null,
                }),
            },
            mime: {
                default: '',
            },
            size: {
                default: 0,
                parseHTML: (element) =>
                    Number(element.getAttribute('data-size') ?? 0) || 0,
                renderHTML: (attributes) => ({
                    'data-size': attributes.size || null,
                }),
            },
            attachmentId: {
                default: '',
                parseHTML: (element) =>
                    element.getAttribute('data-attachment-id') ?? '',
                renderHTML: (attributes) => ({
                    'data-attachment-id': attributes.attachmentId,
                }),
            },
            src: {
                default: '',
                parseHTML: (element) => {
                    const media = element.querySelector(
                        'img, audio, video, a',
                    );

                    return (
                        media?.getAttribute('src') ??
                        media?.getAttribute('href') ??
                        ''
                    );
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'figure[data-media]',
            },
        ];
    },

    renderHTML({ node }) {
        const attributes = node.attrs as unknown as {
            kind: NativeMediaKind;
            originalName: string;
            mime: string;
            size: number;
            attachmentId: string;
            src: string;
        };

        const common = mergeAttributes(
            { 'data-media': '' },
            {
                'data-kind': attributes.kind,
                'data-attachment-id': attributes.attachmentId,
                'data-original-name': attributes.originalName || null,
                'data-size': attributes.size || null,
                'data-mime': attributes.mime || null,
            },
        );

        const src = srcFor(
            attributes.kind,
            attributes.src,
            attributes.attachmentId,
        );

        switch (attributes.kind) {
            case 'image':
                return [
                    'figure',
                    common,
                    [
                        'img',
                        {
                            src,
                            alt: attributes.originalName || 'attachment',
                        },
                    ],
                ];
            case 'audio':
                return [
                    'figure',
                    common,
                    ['audio', { src, controls: 'true' }],
                    ['figcaption', attributes.originalName],
                ];
            case 'video':
                return [
                    'figure',
                    common,
                    ['video', { src, controls: 'true' }],
                    ['figcaption', attributes.originalName],
                ];
            default:
                return [
                    'figure',
                    common,
                    [
                        'a',
                        {
                            href: src,
                            download: attributes.originalName || 'attachment',
                        },
                        attributes.originalName || 'attachment',
                    ],
                ];
        }
    },

    renderText({ node }) {
        return node.attrs.originalName ?? '';
    },
});

/**
 * Render one media node from the local (or cached) bytes: the id in the
 * content is looked up in the entry's attachment metadata, then the encrypted
 * blob is opened — downloading it from the server on first view when needed.
 */
function MediaView({ node }: NodeViewProps): React.JSX.Element {
    const { t } = useTranslation();
    const attachmentId = String(node.attrs.attachmentId ?? '');
    const kind = String(node.attrs.kind ?? 'file') as NativeMediaKind;
    const originalName = String(node.attrs.originalName ?? '');

    const [attachment, setAttachment] = useState<AttachmentMeta | null>(null);
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let owned: string | null = null;

        void (async () => {
            const meta = await attachmentByRef(attachmentId);

            if (meta === null) {
                if (!cancelled) {
                    setFailed(true);
                }

                return;
            }

            const objectUrl = await attachmentObjectUrl(meta).catch(
                () => null,
            );

            if (cancelled) {
                if (objectUrl !== null) {
                    URL.revokeObjectURL(objectUrl);
                }

                return;
            }

            if (objectUrl === null) {
                setAttachment(meta);
                setFailed(true);

                return;
            }

            owned = objectUrl;
            setAttachment(meta);
            setUrl(objectUrl);
        })();

        return () => {
            cancelled = true;

            if (owned !== null) {
                URL.revokeObjectURL(owned);
            }
        };
    }, [attachmentId]);

    const label = originalName !== '' ? originalName : t('media.attach');

    return (
        <NodeViewWrapper
            contentEditable={false}
            className="relative my-3"
            as="figure"
        >
            {failed || url === null ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    {label}
                </div>
            ) : kind === 'image' ? (
                <img
                    src={url}
                    alt={label}
                    className="max-h-96 rounded-lg object-contain"
                />
            ) : kind === 'audio' ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio src={url} controls className="w-full" />
                    <p className="mt-1 truncate text-xs text-zinc-500">
                        {label}
                    </p>
                </div>
            ) : kind === 'video' ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={url} controls className="w-full rounded" />
                    <p className="mt-1 truncate text-xs text-zinc-500">
                        {label}
                    </p>
                </div>
            ) : (
                <a
                    href={url}
                    download={label}
                    className="block rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                    {label}
                </a>
            )}

            {attachment?.pendingUpload === true && (
                <span className="absolute top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-medium text-white">
                    {t('media.uploading')}
                </span>
            )}
        </NodeViewWrapper>
    );
}

/** The native editor's media node: web DOM contract + local blob rendering. */
export const NativeMedia = NativeMediaNode.extend({
    addNodeView() {
        return ReactNodeViewRenderer(MediaView);
    },
});
