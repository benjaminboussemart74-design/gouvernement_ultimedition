(function (global) {
  if (!global) {
    return;
  }

  function normalizeValue(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function mergeConfig(target, source) {
    if (!source || typeof source !== 'object') {
      return target;
    }
    const next = Object.assign({}, target);
    if (source.url || source.supabaseUrl) {
      next.url = normalizeValue(source.url || source.supabaseUrl);
    }
    if (source.anonKey || source.key || source.supabaseAnonKey) {
      next.anonKey = normalizeValue(source.anonKey || source.key || source.supabaseAnonKey);
    }
    if (source.ministersTable) {
      next.ministersTable = normalizeValue(source.ministersTable);
    }
    if (source.careersTable) {
      next.careersTable = normalizeValue(source.careersTable);
    }
    if (source.biographyView) {
      next.biographyView = normalizeValue(source.biographyView);
    }
    if (source.options && typeof source.options === 'object') {
      next.options = Object.assign({}, target.options || {}, source.options);
    }
    return next;
  }

  function readJsonScript(node) {
    if (!node || node.tagName !== 'SCRIPT') return null;
    try {
      const data = JSON.parse(node.textContent || '{}');
      return data && typeof data === 'object' ? data : null;
    } catch (err) {
      return null;
    }
  }

  function loadConfig() {
    let config = {};

    if (global.__SUPABASE_CONFIG__ && typeof global.__SUPABASE_CONFIG__ === 'object') {
      config = mergeConfig(config, global.__SUPABASE_CONFIG__);
    }

    if ((typeof process !== 'undefined') && process.env) {
      config = mergeConfig(config, {
        url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        ministersTable: process.env.SUPABASE_MINISTERS_TABLE || '',
        careersTable: process.env.SUPABASE_CAREERS_TABLE || '',
        biographyView: process.env.SUPABASE_BIOGRAPHY_VIEW || '',
      });
    }

    if ((!config.url || !config.anonKey) && typeof require === 'function') {
      try {
        const fs = require('fs');
        const path = require('path');
        const localPath = path.join(__dirname, 'supabase.local.json');
        if (fs.existsSync(localPath)) {
          const raw = fs.readFileSync(localPath, 'utf8');
          const parsed = JSON.parse(raw);
          config = mergeConfig(config, parsed);
        }
      } catch (err) {
        // Ignore filesystem errors, best-effort fallback
      }
    }

    if (typeof document !== 'undefined' && document) {
      const metaUrl = document.querySelector('meta[name="supabase-url"], meta[name="supabase_url"]');
      const metaKey = document.querySelector('meta[name="supabase-anon-key"], meta[name="supabase_anon_key"]');
      const scriptConfig = document.querySelector('script[type="application/json"][data-supabase-config]');
      if (metaUrl || metaKey) {
        config = mergeConfig(config, {
          url: metaUrl ? metaUrl.getAttribute('content') : '',
          anonKey: metaKey ? metaKey.getAttribute('content') : '',
        });
      }
      const jsonConfig = readJsonScript(scriptConfig);
      if (jsonConfig) {
        config = mergeConfig(config, jsonConfig);
      }
    }

    config.url = normalizeValue(config.url || '');
    config.anonKey = normalizeValue(config.anonKey || '');
    config.ministersTable = normalizeValue(config.ministersTable || 'persons');
    config.careersTable = normalizeValue(config.careersTable || 'person_careers');
    config.biographyView = normalizeValue(config.biographyView || 'biography_entries_view');

    return config;
  }

  const resolved = loadConfig();

  if (resolved.url) {
    global.SUPABASE_URL = resolved.url;
  }
  if (resolved.anonKey) {
    global.SUPABASE_ANON_KEY = resolved.anonKey;
  }
  if (resolved.ministersTable) {
    global.SUPABASE_MINISTERS_TABLE = resolved.ministersTable;
  }
  if (resolved.careersTable) {
    global.SUPABASE_CAREERS_TABLE = resolved.careersTable;
  }
  if (resolved.biographyView) {
    global.SUPABASE_BIOGRAPHY_VIEW = resolved.biographyView;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = resolved;
  } else if (!global.__SUPABASE_CONFIG__) {
    global.__SUPABASE_CONFIG__ = resolved;
  }

  if ((!resolved.url || !resolved.anonKey) && typeof console !== 'undefined') {
    console.warn('[supabase-config] Aucun identifiant Supabase détecté. Configurez SUPABASE_URL et SUPABASE_ANON_KEY via les variables d\'environnement, un fichier config/supabase.local.json ou des balises <meta>.');
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
