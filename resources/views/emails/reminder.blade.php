@component('mail::message')
# {{ __('messages.emails.reminder.heading', ['app' => $app]) }}

{{ __('messages.emails.reminder.intro', ['name' => $user->name]) }}

{{ __('messages.emails.reminder.body') }}

@component('mail::button', ['url' => $url])
{{ __('messages.emails.reminder.openDiary') }}
@endcomponent

{{ __('messages.emails.reminder.note') }}

@endcomponent
