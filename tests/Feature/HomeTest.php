<?php

test('the home page redirects to the login screen when the diary is locked', function () {
    $this->get(route('home'))->assertRedirect(route('login'));
});
