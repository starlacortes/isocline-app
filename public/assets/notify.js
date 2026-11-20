/*
  isocline.app — the launch-notice form.

  Without this script the form still works: it posts to /api/notify and the
  Worker sends the visitor back to the home page. With it, the address is sent
  in place and the result is written under the field.
*/
(function () {
  'use strict';

  var form = document.querySelector('[data-notify]');
  if (!form) { return; }
  var status = form.querySelector('[data-notify-status]');
  var input = form.querySelector('input[type="email"]');
  var trap = form.querySelector('input[name="company"]');
  var button = form.querySelector('button');

  var SAVED = 'Noted. One message at launch, then the address is deleted.';
  var INCOMPLETE = 'That address does not look complete.';
  var FAILED = 'The address could not be saved. Try again later.';

  function say(text) { if (status) { status.textContent = text; } }

  /* Arriving back from a plain form post. */
  if (/[?&]noted=1(&|$)/.test(window.location.search)) { say(SAVED); }

  if (!window.fetch) { return; }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!input.value || (input.checkValidity && !input.checkValidity())) { say(INCOMPLETE); input.focus(); return; }
    button.disabled = true;
    say('');
    fetch(form.getAttribute('action'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: input.value, company: trap ? trap.value : '' })
    }).then(function (response) {
      return response.json().then(function (body) { return { ok: response.ok && body && body.ok, error: body && body.error }; });
    }).then(function (result) {
      if (result.ok) { input.value = ''; say(SAVED); }
      else { say(result.error === 'invalid' ? INCOMPLETE : FAILED); }
    }).catch(function () {
      say(FAILED);
    }).then(function () {
      button.disabled = false;
    });
  });
})();
