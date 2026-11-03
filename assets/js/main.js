/* Owode Baptist Church – site scripts (plain JavaScript, no libraries) */
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', function () {

  /* 1. Mobile navigation ------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('site-menu');
  if (toggle && menu) {
    var setOpen = function (open) {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });
  }

  /* 1b. Sticky header: solid background once the page is scrolled */
  var header = document.querySelector('.site-header');
  var onScroll = function () { if (header) header.classList.toggle('scrolled', window.scrollY > 40); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* 2. Footer year -------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* 3. Scroll-reveal + number counters ------------------------------ */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal');
  var countUp = function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce || isNaN(target)) { el.textContent = (target || 0).toLocaleString('en') + suffix; return; }
    var start = null, dur = 1200;
    var step = function (t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(target * p).toLocaleString('en') + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        en.target.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(countUp); });
  }

  /* 4. Forms: validation + sending to the Google Apps Script ------- */
  /* The Web App URL is set in assets/js/config.js (CONTACT_ENDPOINT).
     Until a real URL is pasted there, forms validate but do not send. */
  var cfg = window.OBC_CONFIG || {};
  var endpoint = String(cfg.CONTACT_ENDPOINT || '').trim();
  var endpointOk = /^https:\/\/script\.google\.com\/(macros|a\/macros\/[^\/]+)\/s\/[^\/]+\/exec$/.test(endpoint);
  var SUCCESS = 'Thank you for contacting Owode Baptist Church. We have received your message and will get back to you as soon as possible. God bless you.';
  var FAIL = 'Sorry, we could not send your message just now. Please check your internet connection and try again, or call us on 08038469771.';

  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    var submitBtn = form.querySelector('button[type="submit"]');
    var btnLabel = submitBtn ? submitBtn.textContent : '';
    var shownAt = Date.now();                       /* used as a simple bot check */
    var busy = false;
    var rules = {
      name:    function (v) { return v.trim().length >= 2 || 'Please enter your full name.'; },
      email:   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Please enter a valid email address.'; },
      phone:   function (v) { return v.trim() === '' || /^\+?[\d\s\-()]{7,16}$/.test(v.trim()) || 'Please enter a valid phone number.'; },
      subject: function (v) { return v.trim().length >= 3 || 'Please add a short subject.'; },
      message: function (v) { return v.trim().length >= 10 || 'Please write at least 10 characters.'; }
    };
    var setError = function (input, msg) {
      var field = input.closest('.field'), err = field.querySelector('.err');
      field.classList.toggle('invalid', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    };
    var check = function (input) {
      var rule = rules[input.name];
      if (!rule) return true;
      var res = rule(input.value);
      setError(input, res === true ? '' : res);
      return res === true;
    };
    var inputs = form.querySelectorAll('input[name], textarea[name]');
    inputs.forEach(function (i) {
      i.addEventListener('blur', function () { check(i); });
      i.addEventListener('input', function () { if (i.closest('.field') && i.closest('.field').classList.contains('invalid')) check(i); });
    });
    var show = function (type, msg) {
      status.className = 'form-status show ' + type;
      status.textContent = msg;
    };
    var setBusy = function (on) {
      busy = on;
      if (!submitBtn) return;
      submitBtn.disabled = on;
      submitBtn.textContent = on ? 'Sending…' : btnLabel;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var bad = null;
      inputs.forEach(function (i) { if (rules[i.name] && !check(i) && !bad) bad = i; });
      if (bad) { bad.focus(); show('bad', 'Please correct the highlighted fields and try again.'); return; }

      /* Honeypot: bots fill this hidden box, people never see it. */
      var hp = form.querySelector('.hp input');
      if (hp && hp.value) { form.reset(); show('ok', SUCCESS); return; }

      if (!endpointOk) {
        show('info', 'Thank you. Your details look good, but online sending is not switched on yet. Please call the church on 08038469771 so we can attend to you.');
        return;
      }

      var body = new URLSearchParams();
      ['form_type', 'name', 'email', 'phone', 'subject', 'message', 'website'].forEach(function (n) {
        var el = form.elements[n]; body.append(n, el ? el.value : '');
      });
      body.append('elapsed', String(Date.now() - shownAt));

      setBusy(true);
      show('info', 'Sending your message…');
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);

      /* A plain form-encoded POST needs no special headers, which keeps
         the request "simple" so the browser allows it cross-site. */
      fetch(endpoint, { method: 'POST', body: body, signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok) {
            form.reset();
            inputs.forEach(function (i) { if (rules[i.name]) setError(i, ''); });
            shownAt = Date.now();
            show('ok', SUCCESS);
          } else {
            if (res && res.errors) {
              Object.keys(res.errors).forEach(function (n) { if (form.elements[n]) setError(form.elements[n], res.errors[n]); });
            }
            show('bad', (res && res.error) || FAIL);
          }
        })
        .catch(function () { show('bad', FAIL); })
        .then(function () { clearTimeout(timer); setBusy(false); status.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    });
  });
});
