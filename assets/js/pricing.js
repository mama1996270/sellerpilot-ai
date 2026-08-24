/**
 * Pricing section interactivity for index.html: the yearly "2 months free"
 * per-card tags, and the Starter/Pro/Business CTA buttons that create a real
 * (mock-payment) checkout session via the create-checkout Edge Function and
 * redirect into checkout.html?token=...
 *
 * The Free Trial card is a plain link to download.html and needs no JS.
 * Price digit swapping (data-price-monthly/yearly) is handled generically by
 * assets/js/main.js already — this file only adds what main.js doesn't.
 */
(function () {
  "use strict";

  var PLAN_LABELS = { starter: "Starter", pro: "Pro", business: "Business" };

  var periodToggle = document.querySelector(".js-period-toggle");
  if (periodToggle) {
    var yearlyTags = document.querySelectorAll(".js-yearly-tag");
    var monthlyTags = document.querySelectorAll(".js-monthly-tag");
    periodToggle.addEventListener("change", function () {
      var yearly = periodToggle.checked;
      yearlyTags.forEach(function (el) {
        el.hidden = !yearly;
      });
      monthlyTags.forEach(function (el) {
        el.hidden = yearly;
      });
    });
  }

  var messageEl = document.getElementById("js-plan-cta-message");
  function showMessage(text) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.add("is-visible");
  }
  function clearMessage() {
    if (!messageEl) return;
    messageEl.classList.remove("is-visible");
  }

  document.querySelectorAll(".js-plan-cta").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      clearMessage();

      if (!window.SellerPilotAuth) {
        showMessage("Checkout isn't available right now. Try again later.");
        return;
      }

      var plan = btn.getAttribute("data-plan");
      var billingCycle = periodToggle && periodToggle.checked ? "yearly" : "monthly";

      // getSession() resolves to null both when nobody is signed in AND when
      // Supabase isn't configured yet — either way, login.html is the right
      // next stop: it shows its own graceful "not connected" state when
      // Supabase isn't configured, or the sign-in form otherwise.
      var session = await window.SellerPilotAuth.getSession();
      if (!session) {
        window.location.href = "login.html?redirect=" + encodeURIComponent("index.html%23pricing");
        return;
      }

      var originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Setting up checkout…';

      try {
        var result = await window.SellerPilotAuth.callFunction("create-checkout", {
          method: "POST",
          body: { plan: plan, billing_cycle: billingCycle },
        });

        if (!result.ok || !result.data || !result.data.checkout_token) {
          showMessage(
            "Couldn't start checkout for " + (PLAN_LABELS[plan] || plan) + ". Try again in a moment."
          );
          btn.disabled = false;
          btn.innerHTML = originalHTML;
          return;
        }

        window.location.href = "checkout.html?token=" + encodeURIComponent(result.data.checkout_token);
      } catch (err) {
        showMessage("Couldn't start checkout. Try again in a moment.");
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    });
  });
})();
