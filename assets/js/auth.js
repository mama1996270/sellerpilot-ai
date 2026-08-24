/**
 * Thin Supabase auth/session helper shared by every account-area page
 * (login, register, account, checkout, orders, invoices, payment-success).
 *
 * Depends on:
 *  - assets/js/supabase-config.js  (window.SELLERPILOT_SUPABASE)
 *  - the Supabase JS UMD build     (window.supabase.createClient)
 * both must be loaded via <script> BEFORE this file on any page that uses it.
 *
 * No framework, no bundler, no jQuery — plain DOM/fetch APIs, matching
 * assets/js/main.js's style. Exposes a single global, window.SellerPilotAuth.
 */
(function () {
  "use strict";

  function isConfigured() {
    var cfg = window.SELLERPILOT_SUPABASE;
    return !!(cfg && cfg.url && cfg.anonKey);
  }

  var _client = null;
  function getClient() {
    if (!isConfigured()) return null;
    if (_client) return _client;
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("Supabase JS library did not load — check the CDN <script> tag.");
      return null;
    }
    _client = window.supabase.createClient(window.SELLERPILOT_SUPABASE.url, window.SELLERPILOT_SUPABASE.anonKey);
    return _client;
  }

  async function getSession() {
    var client = getClient();
    if (!client) return null;
    var result = await client.auth.getSession();
    return (result && result.data && result.data.session) || null;
  }

  async function getAccessToken() {
    var session = await getSession();
    return session ? session.access_token : null;
  }

  async function signInWithPassword(email, password) {
    var client = getClient();
    if (!client) return { data: null, error: { message: "Accounts are not connected yet." } };
    return client.auth.signInWithPassword({ email: email, password: password });
  }

  async function signUp(email, password, fullName) {
    var client = getClient();
    if (!client) return { data: null, error: { message: "Accounts are not connected yet." } };
    return client.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: fullName || "" } },
    });
  }

  async function signOut() {
    var client = getClient();
    if (!client) return;
    await client.auth.signOut();
  }

  /** Current path + query + hash, relative to the site root, for ?redirect=. */
  function currentRelativeUrl() {
    return window.location.pathname.split("/").pop() + window.location.search + window.location.hash;
  }

  /**
   * Gate for account-area pages.
   *
   * Returns { configured, session }:
   *  - configured=false            -> Supabase isn't set up yet; caller should
   *                                    render the "accounts aren't connected"
   *                                    state itself, nothing to redirect to.
   *  - configured=true, session=null -> nobody is signed in; this function has
   *                                    already redirected to login.html?redirect=...
   *                                    (caller should just stop rendering).
   *  - configured=true, session=obj  -> proceed normally.
   */
  async function requireAuth() {
    if (!isConfigured()) {
      return { configured: false, session: null };
    }
    var session = await getSession();
    if (!session) {
      var redirect = encodeURIComponent(currentRelativeUrl());
      window.location.href = "login.html?redirect=" + redirect;
      return { configured: true, session: null };
    }
    return { configured: true, session: session };
  }

  /**
   * Calls a Supabase Edge Function at {url}/functions/v1/{name}.
   * Adds the `apikey` header always, and `Authorization: Bearer <token>`
   * whenever a session exists (every function used on this site requires
   * auth). Returns { ok, status, data } — never throws for HTTP error
   * responses, only for network failure, so callers can branch on `ok`.
   */
  async function callFunction(name, options) {
    options = options || {};
    if (!isConfigured()) {
      throw new Error("Supabase is not configured.");
    }
    var cfg = window.SELLERPILOT_SUPABASE;
    var url = cfg.url.replace(/\/$/, "") + "/functions/v1/" + name;
    if (options.query) {
      var params = new URLSearchParams(options.query);
      url += "?" + params.toString();
    }
    var token = await getAccessToken();
    var headers = { apikey: cfg.anonKey, "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;

    var response = await fetch(url, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    var data = null;
    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }
    return { ok: response.ok, status: response.status, data: data };
  }

  window.SellerPilotAuth = {
    isConfigured: isConfigured,
    getClient: getClient,
    getSession: getSession,
    getAccessToken: getAccessToken,
    signInWithPassword: signInWithPassword,
    signUp: signUp,
    signOut: signOut,
    requireAuth: requireAuth,
    callFunction: callFunction,
    currentRelativeUrl: currentRelativeUrl,
  };
})();
