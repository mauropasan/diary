import {
    isTextSelection,
    mergeAttributes,
    Node,
    type Editor,
} from '@tiptap/core';

export type MediaKind = 'image' | 'audio' | 'video' | 'file';

export type MediaAttributes = {
    src: string;
    kind: MediaKind;
    originalName: string;
    mime: string;
    size: number;
    attachmentId: number;
};

export type MediaData = MediaAttributes;

/**
 * Delete an adjacent media atom when the cursor sits right before or after it
 * and the surrounding text block is empty, mirroring how leaving an image
 * clears it in most editors.
 */
function deleteAdjacentMedia(
    editor: Editor,
    direction: 'backward' | 'forward',
): boolean {
    const { selection } = editor.state;

    if (!isTextSelection(selection) || !selection.$from.parent.isTextblock) {
        return false;
    }

    const { $from } = selection;

    const target =
        direction === 'backward' ? $from.nodeBefore : $from.nodeAfter;

    if (target === null || target.type.name !== 'media') {
        return false;
    }

    const start =
        direction === 'backward'
            ? $from.before() - target.nodeSize
            : $from.after();

    return editor.commands.deleteRange({
        from: start,
        to: start + target.nodeSize,
    });
}

/**
 * A block-level, atomic media node. Renders an inline image, an audio or video
 * player, or a downloadable file link inside a `figure[data-media]`, and is the
 * only place in the diary where an attachment id gets referenced.
 */
export const MediaNode = Node.create({
    name: 'media',

    group: 'block',

    atom: true,

    draggable: true,

    selectable: true,

    addAttributes() {
        return {
            src: {
                default: null,
            },
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
                default: null,
                parseHTML: (element) =>
                    Number(element.getAttribute('data-attachment-id') ?? 0) ||
                    0,
                renderHTML: (attributes) => ({
                    'data-attachment-id': attributes.attachmentId,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'figure[data-media]',
                getAttrs: (element) => {
                    const figure = element as HTMLElement;
                    const kind =
                        (figure.getAttribute('data-kind') as MediaKind) ||
                        'file';
                    let src = '';
                    const mime = figure.getAttribute('data-mime') || '';

                    if (kind === 'image') {
                        const img = figure.querySelector('img');
                        src = img?.getAttribute('src') || '';
                    } else if (kind === 'audio') {
                        const audio = figure.querySelector('audio');
                        src = audio?.getAttribute('src') || '';
                    } else if (kind === 'video') {
                        const video = figure.querySelector('video');
                        src = video?.getAttribute('src') || '';
                    } else {
                        const link = figure.querySelector('a');
                        src = link?.getAttribute('href') || '';
                    }

                    return {
                        src,
                        kind,
                        originalName:
                            figure.getAttribute('data-original-name') || '',
                        mime,
                        size:
                            Number(figure.getAttribute('data-size') ?? 0) || 0,
                        attachmentId:
                            Number(
                                figure.getAttribute('data-attachment-id') ?? 0,
                            ) || 0,
                    };
                },
            },
        ];
    },

    renderHTML({ node }) {
        const attributes = node.attrs as unknown as MediaAttributes;

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

        switch (attributes.kind) {
            case 'image':
                return [
                    'figure',
                    common,
                    [
                        'img',
                        {
                            src: attributes.src,
                            alt: attributes.originalName || 'attachment',
                        },
                    ],
                ];
            case 'audio':
                return [
                    'figure',
                    common,
                    ['audio', { src: attributes.src, controls: 'true' }],
                    ['figcaption', attributes.originalName],
                ];
            case 'video':
                return [
                    'figure',
                    common,
                    ['video', { src: attributes.src, controls: 'true' }],
                    ['figcaption', attributes.originalName],
                ];
            default:
                return [
                    'figure',
                    common,
                    [
                        'a',
                        {
                            href: attributes.src,
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

    addKeyboardShortcuts() {
        return {
            Backspace: () => deleteAdjacentMedia(this.editor, 'backward'),
            Delete: () => deleteAdjacentMedia(this.editor, 'forward'),
        };
    },
});
