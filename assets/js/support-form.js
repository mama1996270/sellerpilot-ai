/**
 * Support Center form handler — shared by support-complaint.html,
 * support-feature-request.html and support-contact.html.
 *
 * Calls the create-support-ticket Edge Function via the existing
 * window.SellerPilotAuth.callFunction() helper (assets/js/auth.js) - the
 * same helper/pattern login/register/checkout already use, so this needs
 * no new client-side plumbing. Requires assets/js/supabase-config.js, the
 * Supabase JS UMD build, and assets/js/auth.js to be loaded before this
 * file (see the <script> order in support-complaint.html etc.).
 *
 * NOT YET LIVE: create-support-ticket has not been deployed and its
 * database migration has not been applied, so every real submission will
 * currently fail with a network/HTTP error - which this script surfaces
 * as a real, visible error message (never a fake success), exactly as
 * intended once the backend genuinely isn't reachable for any reason.
 *
 * No framework, no bundler — matches assets/js/main.js's own style.
 */
(function () {
  "use strict";

  function isValidEmail(value) {
    // Same-permissiveness pragmatic check as the browser's own
    // type="email" validation - not a full RFC 5322 parser, just enough to
    // catch an obviously malformed address before it's sent to the server,
    // which re-validates independently and is the check that actually matters.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // Mirrors _shared/support_tickets.ts's own MIN_MESSAGE_LENGTH/
  // MAX_MESSAGE_LENGTH/MAX_SUBJECT_LENGTH exactly - kept in sync manually
  // (no shared module between the two runtimes). The server remains the
  // check that actually matters; these just give a visitor feedback before
  // submitting instead of only after a rejected request.
  var MIN_MESSAGE_LENGTH = 10;
  var MAX_MESSAGE_LENGTH = 5000;
  var MAX_SUBJECT_LENGTH = 200;

  function formatFakeTicketNumber() {
    // Mirrors _shared/support_tickets.ts's own formatFakeTicketNumber() -
    // shown only on the honeypot-tripped path below, which never calls the
    // backend at all, so the success panel still has *some* ticket-number-
    // shaped text rather than a visibly blank slot.
    var now = new Date();
    var datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
    var randomPart = Math.floor(1000 + Math.random() * 9000);
    return "SP-" + datePart + "-" + randomPart;
  }

  // Server error codes (see create-support-ticket/index.ts) mapped to a
  // human-readable message. Falls back to a generic message for anything
  // unrecognized, rather than surfacing a raw error code to the visitor.
  var ERROR_MESSAGES = {
    invalid_email: "Enter a valid email address.",
    // The server reports too-short and too-long subject/message with the
    // same code either way (server-side validation is intentionally
    // unchanged here) - worded to be honest regardless of which direction
    // it is. In normal use the client-side checks below catch both
    // directions first, so a visitor should rarely see these at all.
    invalid_subject: "Your subject doesn't meet the length requirements (1–" + MAX_SUBJECT_LENGTH + " characters) — please check it and try again.",
    invalid_message: "Your message doesn't meet the length requirements (" + MIN_MESSAGE_LENGTH + "–" + MAX_MESSAGE_LENGTH + " characters) — please check it and try again.",
    invalid_type: "Something went wrong with this form — please reload the page.",
    invalid_body: "Something went wrong sending this form — please try again.",
    rate_limited: "Too many submissions from you recently — please try again in a while.",
    ticket_creation_failed: "The server couldn't save your ticket. Please try again shortly.",
    method_not_allowed: "Something went wrong sending this form — please reload the page.",
  };
  var GENERIC_ERROR_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

  function describeError(result) {
    var code = result && result.data && result.data.error;
    return (code && ERROR_MESSAGES[code]) || GENERIC_ERROR_MESSAGE;
  }

  function initSupportForm(form) {
    var errorEl = form.querySelector(".js-form-message");
    var successEl = form.parentElement.querySelector(".js-form-success");
    var ticketNumberEl = successEl ? successEl.querySelector(".js-ticket-number") : null;
    var submitBtn = form.querySelector(".js-submit");
    var btnLabel = submitBtn ? submitBtn.querySelector(".js-btn-label") : null;
    var honeypot = form.querySelector(".js-hp-field");
    var ticketType = form.getAttribute("data-ticket-type") || "contact";

    function showError(text) {
      if (successEl) successEl.hidden = true;
      if (!errorEl) return;
      errorEl.textContent = text;
      errorEl.classList.add("is-visible");
    }

    function clearError() {
      if (errorEl) errorEl.classList.remove("is-visible");
    }

    function showSuccess(ticketNumber) {
      form.hidden = true;
      if (ticketNumberEl) ticketNumberEl.textContent = ticketNumber;
      if (!successEl) return;
      successEl.hidden = false;
      successEl.setAttribute("tabindex", "-1");
      successEl.focus();
    }

    function resetSubmitButton() {
      if (submitBtn) submitBtn.disabled = false;
      if (btnLabel) btnLabel.textContent = "Send";
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError();

      // Honeypot: a real visitor never sees or fills this field (see
      // .hp-field in support.css). A non-empty value means a bot filled
      // every field programmatically - accept-and-discard silently rather
      // than reveal the check by rejecting it, so bots don't learn to
      // adapt, and skip the network call entirely (the same check runs
      // again server-side for any bot that bypasses this script and posts
      // straight to the Edge Function - see _shared/support_tickets.ts).
      var honeypotTripped = !!(honeypot && honeypot.value.trim());

      var emailField = form.querySelector('[name="email"]');
      var subjectField = form.querySelector('[name="subject"]');
      var messageField = form.querySelector('[name="message"]');

      var email = emailField ? emailField.value.trim() : "";
      var subject = subjectField ? subjectField.value.trim() : "";
      var message = messageField ? messageField.value.trim() : "";

      if (honeypotTripped) {
        showSuccess(formatFakeTicketNumber());
        return;
      }

      if (!email || !subject || !message) {
        showError("Fill in every required field.");
        return;
      }
      if (!isValidEmail(email)) {
        showError("Enter a valid email address.");
        return;
      }
      if (subject.length > MAX_SUBJECT_LENGTH) {
        showError("Your subject is too long — please shorten it to " + MAX_SUBJECT_LENGTH + " characters or fewer.");
        return;
      }
      if (message.length < MIN_MESSAGE_LENGTH) {
        showError("Add a few more details so we understand what you need — at least " + MIN_MESSAGE_LENGTH + " characters.");
        return;
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        showError("Your message is too long — please shorten it to " + MAX_MESSAGE_LENGTH + " characters or fewer.");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (btnLabel) btnLabel.textContent = "Sending…";

      if (!window.SellerPilotAuth) {
        resetSubmitButton();
        showError(GENERIC_ERROR_MESSAGE);
        return;
      }

      window.SellerPilotAuth.callFunction("create-support-ticket", {
        method: "POST",
        body: {
          type: ticketType,
          email: email,
          subject: subject,
          message: message,
          // Always forwarded, even though it's empty on every real request
          // that reaches this point (a genuinely tripped honeypot returns
          // early above and never calls the backend at all) - the JSON key
          // the backend's normalizeTicketInput() reads (see
          // _shared/support_tickets.ts), not the field's own id/name,
          // which is a frontend-only concern.
          honeypot: honeypot ? honeypot.value : "",
        },
      })
        .then(function (result) {
          resetSubmitButton();
          if (!result.ok || !result.data || !result.data.ticket_number) {
            showError(describeError(result));
            return;
          }
          showSuccess(result.data.ticket_number);
        })
        .catch(function () {
          resetSubmitButton();
          showError(GENERIC_ERROR_MESSAGE);
        });
    });
  }

  document.querySelectorAll(".js-support-form").forEach(initSupportForm);
})();
