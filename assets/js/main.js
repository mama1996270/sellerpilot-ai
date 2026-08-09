(function () {
  "use strict";

  var doc = document;

  /* ---- Mobile navigation ---- */
  var navToggle = doc.querySelector(".js-nav-toggle");
  var navPanel = doc.querySelector(".js-nav-panel");
  var header = doc.querySelector(".site-header");

  if (navToggle && navPanel) {
    navToggle.addEventListener("click", function () {
      var isOpen = navPanel.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      doc.body.classList.toggle("nav-open", isOpen);
    });

    navPanel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navPanel.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        doc.body.classList.remove("nav-open");
      });
    });

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navPanel.classList.contains("is-open")) {
        navPanel.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        doc.body.classList.remove("nav-open");
        navToggle.focus();
      }
    });
  }

  /* ---- Header shadow on scroll ---- */
  if (header) {
    var updateHeaderState = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
  }

  /* ---- FAQ accordion ---- */
  doc.querySelectorAll(".js-faq-item").forEach(function (item) {
    var trigger = item.querySelector(".js-faq-trigger");
    var panel = item.querySelector(".js-faq-panel");
    if (!trigger || !panel) return;

    trigger.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");
      doc.querySelectorAll(".js-faq-item.is-open").forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove("is-open");
          openItem.querySelector(".js-faq-trigger").setAttribute("aria-expanded", "false");
        }
      });
      item.classList.toggle("is-open", !isOpen);
      trigger.setAttribute("aria-expanded", (!isOpen).toString());
    });
  });

  /* ---- Pricing period toggle (monthly / yearly) ---- */
  var periodToggle = doc.querySelector(".js-period-toggle");
  if (periodToggle) {
    var priceEls = doc.querySelectorAll("[data-price-monthly]");
    var proCheckoutLink = doc.querySelector('[data-checkout-plan="proMonthly"]');

    periodToggle.addEventListener("change", function () {
      var yearly = periodToggle.checked;
      priceEls.forEach(function (el) {
        el.textContent = yearly ? el.getAttribute("data-price-yearly") : el.getAttribute("data-price-monthly");
      });
      doc.querySelectorAll(".js-price-suffix").forEach(function (el) {
        el.textContent = yearly ? "/year" : "/month";
      });
      if (proCheckoutLink && window.SELLERPILOT_CHECKOUT) {
        proCheckoutLink.setAttribute(
          "href",
          yearly ? window.SELLERPILOT_CHECKOUT.proYearly : window.SELLERPILOT_CHECKOUT.proMonthly
        );
        proCheckoutLink.setAttribute("data-checkout-plan", yearly ? "proYearly" : "proMonthly");
      }
    });
  }

  /* ---- Showcase tabs ---- */
  var showcaseTabs = doc.querySelectorAll(".showcase-tabs [role='tab']");
  var showcasePanels = doc.querySelectorAll(".js-showcase-panel");
  if (showcaseTabs.length && showcasePanels.length) {
    showcaseTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tab");
        showcaseTabs.forEach(function (t) {
          t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        showcasePanels.forEach(function (panel) {
          panel.style.display = panel.getAttribute("data-panel") === target ? "" : "none";
        });
      });
    });
  }

  /* ---- Footer year ---- */
  var yearEl = doc.querySelector(".js-current-year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }
})();
