(function (global) {
  const DEFAULT_CONTAINER_SELECTOR = '.cabinet-tree';
  const FALLBACK_AVATAR = 'assets/placeholder-minister.svg';
  const DEFAULT_EMPTY_MESSAGE = 'Les pôles de ce cabinet seront bientôt disponibles.';
  const RPC_NAME = 'get_cabinet_poles';

  function getSupabaseClient() {
    if (global.supabaseClient) return global.supabaseClient;

    const hasFactory = global.supabase && typeof global.supabase.createClient === 'function';
    const url = global.SUPABASE_URL;
    const key = global.SUPABASE_ANON_KEY;
    if (hasFactory && url && key) {
      global.supabaseClient = global.supabase.createClient(url, key);
      return global.supabaseClient;
    }

    console.warn('[cabinet-tree] Client Supabase indisponible : vérifiez config/supabase.js.');
    return null;
  }

  const toSafeOrder = (value) => (typeof value === 'number' ? value : Number.POSITIVE_INFINITY);

  function normalisePoles(rows) {
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row) => ({
        poleId: row?.pole_id || row?.id || null,
        poleLeader: row?.pole_leader || '',
        poleName: row?.pole_name || '',
        poleAvatar: row?.pole_avatar || '',
        poleOrder: toSafeOrder(row?.pole_order),
        advisors: Array.isArray(row?.advisors)
          ? row.advisors
              .map((advisor) => ({
                id: advisor?.id || advisor?.advisor_id || null,
                name: advisor?.name || advisor?.full_name || 'Conseiller',
                photo: advisor?.photo || advisor?.photo_url || '',
                jobTitle: advisor?.job_title || advisor?.role || 'Conseiller',
                order: toSafeOrder(advisor?.order),
              }))
              .sort((a, b) => a.order - b.order)
          : [],
      }))
      .sort((a, b) => a.poleOrder - b.poleOrder);
  }

  async function loadCabinet(ministerId, options = {}) {
    const targetSelector = options.containerSelector || DEFAULT_CONTAINER_SELECTOR;
    if (!ministerId) {
      console.warn('[cabinet-tree] ministerId requis pour charger le cabinet.');
      renderCabinetTree([], { containerSelector: targetSelector, emptyMessage: options.emptyMessage });
      return [];
    }

    const client = getSupabaseClient();
    if (!client) {
      renderCabinetTree([], { containerSelector: targetSelector, emptyMessage: options.emptyMessage });
      return [];
    }

    const { data, error } = await client.rpc(RPC_NAME, { minister_id: ministerId });
    if (error) {
      console.error('[cabinet-tree] Erreur Supabase RPC', error);
      renderCabinetTree([], {
        containerSelector: targetSelector,
        emptyMessage: options.emptyMessage || "Impossible de charger l'arborescence du cabinet pour le moment.",
      });
      throw error;
    }

    const poles = normalisePoles(data || []);
    renderCabinetTree(poles, { containerSelector: targetSelector, emptyMessage: options.emptyMessage });
    return poles;
  }

  function renderCabinetTree(poles = [], { containerSelector = DEFAULT_CONTAINER_SELECTOR, emptyMessage = DEFAULT_EMPTY_MESSAGE } = {}) {
    const container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;

    if (!container) {
      console.warn('[cabinet-tree] Conteneur introuvable pour', containerSelector);
      return;
    }

    container.innerHTML = '';

    if (!Array.isArray(poles) || poles.length === 0) {
      if (emptyMessage) {
        const empty = document.createElement('p');
        empty.className = 'cabinet-empty';
        empty.textContent = emptyMessage;
        container.appendChild(empty);
      }
      return;
    }

    poles.forEach((pole) => {
      const section = document.createElement('section');
      section.className = 'cabinet-tree-level';

      const leaderCard = createNode({
        grade: 'chefpole',
        name: pole.poleLeader || 'Chef de pôle',
        role: 'Chef de pôle',
        roleSecondary: pole.poleName || '',
        photo: pole.poleAvatar || FALLBACK_AVATAR,
      });
      section.appendChild(leaderCard);

      (pole.advisors || []).forEach((advisor) => {
        const advisorCard = createNode({
          grade: 'conseiller',
          name: advisor.name || 'Conseiller',
          role: advisor.jobTitle || 'Conseiller',
          photo: advisor.photo || FALLBACK_AVATAR,
        });
        section.appendChild(advisorCard);
      });

      container.appendChild(section);
    });
  }

  function createNode({ grade, name, role, roleSecondary = '', photo }) {
    const article = document.createElement('article');
    article.className = 'cabinet-node fade-in';
    article.dataset.grade = grade;

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'cabinet-node-avatar';
    const img = document.createElement('img');
    img.src = photo || FALLBACK_AVATAR;
    img.loading = 'lazy';
    img.alt = name ? `Portrait de ${name}` : 'Portrait';
    img.onerror = () => {
      img.onerror = null;
      img.src = FALLBACK_AVATAR;
    };
    avatarWrap.appendChild(img);

    const info = document.createElement('div');
    info.className = 'cabinet-node-info';

    const strong = document.createElement('strong');
    strong.className = 'cabinet-node-name';
    strong.textContent = name || '';
    info.appendChild(strong);

    const primaryRole = document.createElement('p');
    primaryRole.className = 'cabinet-node-role';
    primaryRole.textContent = role || '';
    info.appendChild(primaryRole);

    if (roleSecondary) {
      const secondaryRole = document.createElement('p');
      secondaryRole.className = 'cabinet-node-role cabinet-node-role--secondary';
      secondaryRole.textContent = roleSecondary;
      info.appendChild(secondaryRole);
    }

    article.appendChild(avatarWrap);
    article.appendChild(info);
    return article;
  }

  const api = { loadCabinet, renderCabinetTree };
  global.cabinetTree = Object.assign({}, global.cabinetTree || {}, api);
  global.loadCabinet = loadCabinet;
  global.renderCabinetTree = renderCabinetTree;
})(typeof window !== 'undefined' ? window : globalThis);
