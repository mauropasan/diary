@component('mail::message')
# {{ $heading }}

{{ __('messages.emails.two_factor.intro', ['name' => $user->name]) }}

{{ $body }}

@if ($signedOut)
{{ __('messages.emails.two_factor.signedOut') }}
@endif

@component('mail::button', ['url' => $url])
{{ __('messages.emails.two_factor.openDiary') }}
@endcomponent

{{ __('messages.emails.two_factor.warning') }}

{{ __('messages.emails.two_factor.noContent') }}

@endcomponent
