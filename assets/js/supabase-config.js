/**
 * Supabase project configuration placeholder.
 *
 * No real Supabase project is connected yet. Both values below are
 * intentionally empty strings — replace them once a real Supabase project
 * exists for SellerPilot AI Pro:
 *
 *   url     -> the project's API URL, e.g. "https://xxxxxxxx.supabase.co"
 *   anonKey -> the project's public "anon" key (safe to expose client-side;
 *              Postgres Row Level Security is what actually restricts data
 *              access per user, not secrecy of this key)
 *
 * Every page that touches auth/checkout/account data (auth.js and anything
 * that calls it) checks `window.SELLERPILOT_SUPABASE.url` before doing
 * anything — while it's empty, those pages show an explicit "accounts
 * aren't connected yet" state instead of guessing or throwing.
 *
 * Mirrors the placeholder pattern used by assets/js/checkout-config.js.
 */
window.SELLERPILOT_SUPABASE = {
  url: "https://vqmybzymouxxkzgelbku.supabase.co",
  anonKey: "sb_publishable_7GzvBhiJ-QDCO1WrXoVWOA_g2JO1ZVJ",
};
