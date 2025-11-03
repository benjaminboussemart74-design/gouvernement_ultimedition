// Example: local, not committed. Copy to config/supabase.local.js and fill values.
// This file defines __SUPABASE_CONFIG__ before config/supabase.js runs in the browser.
(function (g) {
  if (!g) return;
  g.__SUPABASE_CONFIG__ = {
    url: "https://YOUR-PROJECT.ref.supabase.co",
    anonKey: "YOUR_ANON_PUBLIC_KEY",
    ministersTable: "persons",
    careersTable: "person_careers",
    // Optionnel: si vous utilisez une vue SQL pour la biographie
    // laissez "biographyView" vide pour utiliser la table ci-dessus
    biographyView: "person_careers"
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
