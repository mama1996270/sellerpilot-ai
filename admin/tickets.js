/**
 * Support Center admin dashboard — lists and updates support tickets via
 * the admin-list-tickets / admin-update-ticket Edge Functions.
 *
 * NOT YET FUNCTIONAL: neither Edge Function is deployed and the
 * support_tickets/admin_users tables don't exist yet - every call here
 * will fail with a network/HTTP error until the backend (see
 * SellerPilot_AI_v1.5.0_DEV/supabase/) is applied and deployed.
 *
 * Client-side gating here is a CONVENIENCE only (redirect to sign-in,
 * show a "not authorized" message) - the real authorization boundary is
 * entirely server-side in admin-list-tickets/admin-update-ticket, which
 * check the caller's verified user_id against admin_users. A signed-in
 * non-admin who reaches this page sees nothing but the 403 message below,
 * regardless of anything this script does.
 *
 * No framework, no bundler — matches assets/js/support-form.js's own style.
 */
(function () {
  "use strict";

  var STATUS_LABELS = {
    open: "Open",
    in_progress: "In progress",
    resolved: "Resolved",
    closed: "Closed",
  };

  var TYPE_LABELS = {
    complaint: "Complaint",
    feature_request: "Feature request",
    contact: "Contact",
  };

  var signinPanel = document.getElementById("js-signin-required");
  var signinLink = document.getElementById("js-signin-link");
  var forbiddenPanel = document.getElementById("js-forbidden");
  var loadErrorPanel = document.getElementById("js-load-error");
  var loadErrorMessage = loadErrorPanel ? loadErrorPanel.querySelector(".js-load-error-message") : null;
  var dashboard = document.getElementById("js-dashboard");
  var emptyEl = document.getElementById("js-empty");
  var rowsEl = document.getElementById("js-ticket-rows");
  var statusFilter = document.getElementById("status-filter");
  var refreshBtn = document.querySelector(".js-refresh");
  var retryBtn = document.querySelector(".js-retry");

  function hideAllPanels() {
    [signinPanel, forbiddenPanel, loadErrorPanel, dashboard].forEach(function (el) {
      if (el) el.hidden = true;
    });
  }

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString();
    } catch (err) {
      return iso || "";
    }
  }

  function truncate(text, max) {
    if (!text) return "";
    return text.length > max ? text.slice(0, max).trim() + "…" : text;
  }

  function renderRows(tickets) {
    rowsEl.innerHTML = "";
    if (!tickets.length) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    tickets.forEach(function (ticket) {
      var row = document.createElement("tr");

      var typeLabel = TYPE_LABELS[ticket.type] || ticket.type;
      var messagePreview = truncate(ticket.message || "", 140);

      row.innerHTML =
        '<td class="ticket-number-cell">' + escapeHtml(ticket.ticket_number) + "</td>" +
        '<td><span class="ticket-type-badge">' + escapeHtml(typeLabel) + "</span></td>" +
        '<td class="ticket-subject-cell ticket-message-cell">' +
        "<strong>" + escapeHtml(ticket.subject) + "</strong><br>" +
        '<span style="color:var(--text-muted);">' + escapeHtml(messagePreview) + "</span></td>" +
        "<td>" + escapeHtml(ticket.submitter_email) + "</td>" +
        "<td>" + escapeHtml(formatDate(ticket.created_at)) + "</td>" +
        "<td></td>";

      var statusCell = row.lastElementChild;
      var select = document.createElement("select");
      select.className = "admin-select js-status-select";
      Object.keys(STATUS_LABELS).forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = STATUS_LABELS[value];
        if (value === ticket.status) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        updateTicketStatus(ticket.id, select.value, select);
      });
      statusCell.appendChild(select);

      rowsEl.appendChild(row);
    });
  }

  function updateTicketStatus(ticketId, status, selectEl) {
    selectEl.disabled = true;
    window.SellerPilotAuth.callFunction("admin-update-ticket", {
      method: "POST",
      body: { ticket_id: ticketId, status: status },
    })
      .then(function (result) {
        selectEl.disabled = false;
        if (!result.ok) {
          window.alert("Couldn't update this ticket's status. Please try again.");
        }
      })
      .catch(function () {
        selectEl.disabled = false;
        window.alert("Couldn't reach the server. Please try again.");
      });
  }

  function showLoadError(message) {
    hideAllPanels();
    if (loadErrorMessage) loadErrorMessage.textContent = message;
    if (loadErrorPanel) loadErrorPanel.hidden = false;
  }

  function loadTickets() {
    hideAllPanels();
    var query = statusFilter && statusFilter.value ? { status: statusFilter.value } : undefined;

    window.SellerPilotAuth.callFunction("admin-list-tickets", { method: "GET", query: query })
      .then(function (result) {
        if (result.status === 403) {
          hideAllPanels();
          if (forbiddenPanel) forbiddenPanel.hidden = false;
          return;
        }
        if (!result.ok || !result.data || !Array.isArray(result.data.tickets)) {
          showLoadError("The server returned an unexpected response.");
          return;
        }
        hideAllPanels();
        if (dashboard) dashboard.hidden = false;
        renderRows(result.data.tickets);
      })
      .catch(function () {
        showLoadError("Couldn't reach the server. Check your connection and try again.");
      });
  }

  function init() {
    if (signinLink) {
      signinLink.href = "../login.html?redirect=" + encodeURIComponent("admin/tickets.html");
    }

    if (!window.SellerPilotAuth || !window.SellerPilotAuth.isConfigured()) {
      showLoadError("Accounts aren't connected on this site yet.");
      return;
    }

    window.SellerPilotAuth.getSession().then(function (session) {
      if (!session) {
        hideAllPanels();
        if (signinPanel) signinPanel.hidden = false;
        return;
      }
      loadTickets();
    });
  }

  if (statusFilter) statusFilter.addEventListener("change", loadTickets);
  if (refreshBtn) refreshBtn.addEventListener("click", loadTickets);
  if (retryBtn) retryBtn.addEventListener("click", loadTickets);

  init();
})();
