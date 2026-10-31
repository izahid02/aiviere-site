(function () {
  'use strict';

  // Web3Forms access key. It tells Web3Forms which inbox to send entries to.
  // The email address itself is set in your Web3Forms account, not here.
  var WEB3FORMS_KEY = '8024b028-b505-4bbb-b86e-febad35e2d0e';
  var FORM_ENDPOINT = 'https://api.web3forms.com/submit';

  var tabs = document.querySelectorAll('[role="tab"]');
  var forms = { waitlist: document.getElementById('form-waitlist'), contact: document.getElementById('form-contact') };
  var done = document.querySelector('.done');
  var loadedAt = Date.now();


  function selectTab(name, focus) {
    tabs.forEach(function (t) {
      var on = t.id === 'tab-' + name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    Object.keys(forms).forEach(function (k) { forms[k].hidden = k !== name; });
    done.hidden = true;
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t.id.replace('tab-', ''), false); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next.id.replace('tab-', ''), true);
    });
  });

  document.querySelectorAll('[data-open="contact"]').forEach(function (a) {
    a.addEventListener('click', function () { selectTab('contact', false); });
  });

  function showDone(type, message) {
    Object.keys(forms).forEach(function (k) { forms[k].hidden = true; });
    done.querySelector('.done-title').textContent = type === 'contact' ? 'Message sent.' : "You're on the list.";
    done.querySelector('.done-text').textContent = message;
    done.hidden = false;
    done.focus();
  }

  function check(form) {
    var problems = [];
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    var name = form.elements.name, email = form.elements.email;
    if (!name.value.trim()) problems.push([name, 'Please add your name.']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) problems.push([email, 'Please check your email address.']);
    if (form.elements.phone && form.elements.phone.value.trim()) {
      var digits = form.elements.phone.value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
      if (!/^[6-9]\d{9}$/.test(digits)) problems.push([form.elements.phone, 'Please enter a 10-digit Indian mobile number, or leave it blank.']);
    }
    if (form.elements.message && form.elements.message.value.trim().length < 5) problems.push([form.elements.message, 'Please write a short message.']);
    if (form.elements.consent && !form.elements.consent.checked) problems.push([form.elements.consent, 'Please tick the box so we can send you updates.']);
    problems.forEach(function (p) { p[0].setAttribute('aria-invalid', 'true'); });
    return problems;
  }

  Object.keys(forms).forEach(function (type) {
    var form = forms[type];
    var status = form.querySelector('.status');
    var button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      status.classList.remove('error');

      var problems = check(form);
      if (problems.length) {
        status.textContent = problems[0][1];
        status.classList.add('error');
        problems[0][0].focus();
        return;
      }

      // Spam traps: hidden field real people never fill, and forms sent within 3 seconds of opening.
      if (form.elements.website.value || Date.now() - loadedAt < 3000) {
        form.reset();
        showDone(type, type === 'contact' ? "Thanks for writing. We'll reply by email soon." : "We'll write to you before Drop 01 opens.");
        return;
      }

      button.disabled = true;
      var label = button.innerHTML;
      button.textContent = 'Sending…';

      var name = form.elements.name.value.trim();
      var payload = {
        access_key: WEB3FORMS_KEY,
        from_name: 'AIVIERE Website',
        subject: type === 'contact' ? 'Website message from ' + name : 'New waitlist sign-up: ' + name,
        name: name,
        email: form.elements.email.value.trim()
      };
      if (type === 'contact') {
        payload.message = form.elements.message.value.trim();
      } else {
        var phone = form.elements.phone.value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
        payload.mobile = phone ? '+91 ' + phone : 'Not given';
        payload.consent = 'Yes, updates about AIVIERE drops (privacy note v1)';
      }

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
        .then(function (data) {
          if (data && data.success) {
            form.reset();
            showDone(type, type === 'contact' ? "Thanks for writing. We'll reply by email soon." : "We'll write to you before Drop 01 opens.");
          } else {
            status.textContent = 'Something went wrong. Please try again in a minute.';
            status.classList.add('error');
          }
        })
        .catch(function () {
          status.textContent = 'Could not connect. Check your internet and try again.';
          status.classList.add('error');
        })
        .then(function () {
          button.disabled = false;
          button.innerHTML = label;
        });
    });
  });

  var params = new URLSearchParams(window.location.search);
  if (params.get('form') === 'contact') selectTab('contact', false);
})();
