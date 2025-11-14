(function(){
  const statusEl = document.getElementById('status');
  const leaderCard = document.getElementById('leader-card');
  const leaderAvatar = document.getElementById('leader-avatar');
  const leaderName = document.getElementById('leader-name');
  const leaderRole = document.getElementById('leader-role');
  const leaderTitle = document.getElementById('leader-title');
  const leaderSummary = document.getElementById('leader-summary');
  const collabContainer = document.getElementById('collabs');
  const leaderInfo = document.getElementById('leader-info');
  const toggleButtons = Array.from(document.querySelectorAll('[data-target]'));
  const refreshBtn = document.getElementById('btn-refresh');

  const detailOverlay = document.getElementById('detail-overlay');
  const detailPanel = document.querySelector('.detail-panel');
  const detailClose = document.querySelector('.detail-close');
  const detailName = document.getElementById('detail-name');
  const detailRole = document.getElementById('detail-role');
  const detailJob = document.getElementById('detail-job');
  const detailContact = document.getElementById('detail-contact');

  const TARGETS = {
    pm: {
      key: 'pm',
      label: 'Premier ministre',
      summary: "Les équipes stratégiques de Matignon sont présentées par direction et par pôle pour visualiser rapidement la chaîne hiérarchique.",
      predicate(person){
        return (person.role && String(person.role).toLowerCase() === 'leader') ||
               (person.job_title && normalise(person.job_title).includes('premier ministre'));
      }
    },
    president: {
      key: 'president',
      label: 'Président de la République',
      summary: "L\'équipe rapprochée de l\'Élysée est regroupée par cercles stratégiques et par domaines de conseil.",
      predicate(person){
        const role = normalise(person.role);
        if (role === 'president' || role === 'président') return true;
        const job = normalise(person.job_title);
        return job.includes('président') || job.includes('elysee') || job.includes('elysée');
      }
    }
  };

  let currentTarget = 'pm';
  let personsCache = null;
  let personsById = new Map();

  function normalise(value){
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function escapeHTML(value){
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setStatus(message, type){
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.className = 'status' + (type ? ' ' + type : '');
  }

  function setLeaderInfo(message){
    if (!leaderInfo) return;
    leaderInfo.textContent = message || '';
  }

  function ensureSupabaseClient(){
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY){
      window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
      });
      return window.supabaseClient;
    }
    return null;
  }

  function generateAvatarDataUrl(name, size){
    const initials = (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || '??';
    const dimension = size || 72;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${dimension}' height='${dimension}'>`
      + `<rect width='100%' height='100%' rx='${Math.floor(dimension * 0.4)}' fill='#e4e7f5'/>`
      + `<text x='50%' y='50%' dy='.35em' text-anchor='middle' fill='#1f2937' font-family='Space Grotesk, system-ui' font-weight='700' font-size='${Math.floor(dimension / 2.4)}'>${initials}</text>`
      + `</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function resolveSafeImageSource(value, fallback){
    const fallbackValue = fallback || '';
    if (!value || typeof value !== 'string') {
      return { src: fallbackValue, isFallback: true };
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return { src: fallbackValue, isFallback: true };
    }
    const lowered = trimmed.toLowerCase();
    if (
      lowered.startsWith('javascript:') ||
      lowered.startsWith('vbscript:') ||
      (lowered.startsWith('data:') && !lowered.startsWith('data:image/'))
    ) {
      return { src: fallbackValue, isFallback: true };
    }
    if (/^data:image\//i.test(trimmed)) {
      return { src: trimmed, isFallback: false };
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return { src: trimmed, isFallback: false };
    }
    if (trimmed.startsWith('/')) {
      return { src: trimmed, isFallback: false };
    }
    const base = (typeof window !== 'undefined' && typeof window.SUPABASE_URL === 'string') ? window.SUPABASE_URL.replace(/\/$/, '') : '';
    if (base) {
      if (trimmed.startsWith('storage/v1/object/public/')) {
        return { src: `${base}/${trimmed.replace(/^\/+/, '')}`, isFallback: false };
      }
      if (/^[A-Za-z0-9_-]+\/.+/.test(trimmed)) {
        return { src: `${base}/storage/v1/object/public/${trimmed.replace(/^\/+/, '')}`, isFallback: false };
      }
    }
    if (/^[A-Za-z0-9/_\.-]+\.(png|jpe?g|gif|webp|avif|svg)$/i.test(trimmed)) {
      return { src: trimmed, isFallback: false };
    }
    return { src: fallbackValue, isFallback: true };
  }

  function getInitials(value){
    return (value || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || '??';
  }

  function renderAvatar(person, size){
    const dim = size || 72;
    const safeName = escapeHTML(person.full_name || '');
    const fallbackData = generateAvatarDataUrl(person.full_name, dim);
    const { src, isFallback } = resolveSafeImageSource(person.photo_url || '', fallbackData);
    const style = `width:${dim}px;height:${dim}px;object-fit:cover;`;
    const initials = escapeHTML(getInitials(person.full_name));
    if (!isFallback){
      return `<img src="${src}" alt="${safeName}" style="${style}" onerror="this.style.display='none';if(this.nextElementSibling){this.nextElementSibling.classList.remove('is-hidden');}"><div class="mini-initial is-hidden" aria-hidden="true">${initials}</div>`;
    }
    return `<div class="mini-initial" aria-hidden="true">${initials}</div>`;
  }

  function renderPersonCard(person, options){
    const opt = Object.assign({ size: 56, head: false }, options);
    const cls = ['collab-card'];
    if (opt.head) cls.push('is-head');
    const avatarHTML = `<div class="collab-avatar" style="width:${opt.size}px;height:${opt.size}px;flex:0 0 ${opt.size}px;">${renderAvatar(person, opt.size)}</div>`;
    const role = escapeHTML(person.cabinet_role || person.role || '');
    const job = person.job_title ? `<div class="collab-subrole">${escapeHTML(person.job_title)}</div>` : '';
    const attrs = `class="${cls.join(' ')}" data-person-id="${escapeHTML(person.id)}" tabindex="0" role="button" aria-label="${escapeHTML((person.full_name || '') + (role ? ', ' + role : ''))}"`;
    return `<div ${attrs}>${avatarHTML}<div class="collab-meta"><div class="collab-name">${escapeHTML(person.full_name)}</div><div class="collab-role">${role}</div>${job}</div></div>`;
  }

  async function fetchPersons(){
    if (personsCache) return personsCache;
    const client = ensureSupabaseClient();
    if (!client){
      throw new Error('Client Supabase non initialisé.');
    }

    let persons = [];
    try {
      const { data, error } = await client
        .from('persons')
        .select('id, full_name, role, superior_id, collab_grade, cabinet_role, job_title, cabinet_order, email, photo_url, collab_grade_info(rank)');
      if (error) throw error;
      persons = Array.isArray(data) ? data : [];
    } catch (err){
      // fallback without relation
      const { data, error } = await window.supabaseClient
        .from('persons')
        .select('id, full_name, role, superior_id, collab_grade, cabinet_role, job_title, cabinet_order, email, photo_url');
      if (error) throw error;
      persons = Array.isArray(data) ? data : [];
    }

    // attach grade info if missing
    const needsGrade = persons.some(p => !p.collab_grade_info || typeof p.collab_grade_info.rank === 'undefined');
    if (needsGrade){
      try {
        const { data, error } = await window.supabaseClient
          .from('collab_grades')
          .select('code, rank');
        if (!error && Array.isArray(data)){
          const gradeMap = new Map(data.map(item => [item.code, item.rank]));
          persons = persons.map(p => ({
            ...p,
            collab_grade_info: p.collab_grade_info && typeof p.collab_grade_info.rank !== 'undefined'
              ? p.collab_grade_info
              : (gradeMap.has(p.collab_grade) ? { rank: gradeMap.get(p.collab_grade) } : null)
          }));
        }
      } catch (err){
        // ignore
      }
    }

    personsCache = persons;
    personsById = new Map(persons.map(p => [String(p.id), p]));
    return persons;
  }

  function belongsToLeader(person, leaderId){
    let current = person;
    let guard = 0;
    while (current && guard < 64){
      if (!current.superior_id) return false;
      if (String(current.superior_id) === String(leaderId)) return true;
      current = personsById.get(String(current.superior_id));
      guard += 1;
    }
    return false;
  }

  function byRankOrderThenName(a, b){
    const rankA = (a.collab_grade_info && typeof a.collab_grade_info.rank === 'number') ? a.collab_grade_info.rank : 999;
    const rankB = (b.collab_grade_info && typeof b.collab_grade_info.rank === 'number') ? b.collab_grade_info.rank : 999;
    if (rankA !== rankB) return rankA - rankB;
    const orderA = typeof a.cabinet_order === 'number' ? a.cabinet_order : 999;
    const orderB = typeof b.cabinet_order === 'number' ? b.cabinet_order : 999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.full_name || '').localeCompare(b.full_name || '');
  }

  function findLeader(target){
    const persons = personsCache || [];
    const def = TARGETS[target];
    if (!def) return null;
    const found = persons.find(p => def.predicate(p));
    return found || null;
  }

  function renderLeaderCard(leader, contextKey){
    if (!leader) return;
    leaderCard?.setAttribute('data-context', contextKey);
    leaderAvatar.innerHTML = renderAvatar(leader, leaderCard ? parseInt(getComputedStyle(leaderCard).getPropertyValue('--leader-avatar-size')) || 220 : 220);
    leaderName.textContent = leader.full_name || '';
    if (contextKey === 'pm'){
      leaderRole.textContent = leader.cabinet_role && leader.cabinet_role.toLowerCase() !== 'leader'
        ? leader.cabinet_role
        : 'Premier ministre';
    } else {
      const roleLabel = leader.cabinet_role || leader.role || 'Président de la République';
      leaderRole.textContent = roleLabel;
    }
    leaderTitle.textContent = leader.job_title || '';
    leaderSummary.textContent = TARGETS[contextKey]?.summary || '';
  }

  function renderPMCcabinet(leader, collabs){
    const DIR = new Set(['dircab', 'diradj', 'chefcab', 'chefadj']);
    const directReports = collabs.filter(p => String(p.superior_id) === String(leader.id));
    const cabinetCoeur = directReports
      .filter(p => p.collab_grade !== 'chefpole')
      .sort(byRankOrderThenName);
    const chefsDePole = directReports.filter(p => p.collab_grade === 'chefpole').sort(byRankOrderThenName);

    const polePalette = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

    let html = '';
    html += `<section class="pm-cabinet"><div class="cabinet-header"><h2>Cabinet du Premier ministre</h2></div><div class="cabinet-inner">`;
    if (cabinetCoeur.length === 0){
      html += '<div class="placeholder">Aucune direction renseignée.</div>';
    } else {
      cabinetCoeur.forEach(person => {
        const isHead = DIR.has(person.collab_grade);
        html += renderPersonCard(person, { size: isHead ? 64 : 56, head: isHead });
      });
    }
    html += '</div></section>';

    html += '<section class="poles-section">';
    if (chefsDePole.length === 0){
      html += '<div class="placeholder">Aucun chef de pôle associé au Premier ministre.</div>';
    } else {
      chefsDePole.forEach((head, index) => {
        const accent = polePalette[index % polePalette.length];
        const members = collabs
          .filter(p => String(p.superior_id) === String(head.id))
          .sort(byRankOrderThenName);
        let poleName = head.job_title || head.cabinet_role || head.full_name;
        if (poleName && !/^p[oô]le\b/i.test(poleName)){
          poleName = `Pôle ${poleName}`;
        }
        html += `<article class="pole-article" style="--pole-accent:${accent}">`;
        html += `<div class="pole-title">${escapeHTML(poleName)}</div>`;
        html += '<div class="pole-body">';
        html += `<div class="pole-row">`;
        html += `<div class="pole-head">${renderPersonCard(head, { size: 64, head: true })}</div>`;
        if (members.length === 0){
          html += '<div class="pole-members"><div class="placeholder">En attente de conseillers affectés.</div></div>';
        } else {
          html += '<div class="pole-members">';
          members.forEach(member => {
            html += renderPersonCard(member, { size: 52, head: false });
          });
          html += '</div>';
        }
        html += '</div>'; // pole-row
        html += '</div>'; // pole-body
        html += '</article>';
      });
    }
    html += '</section>';

    return html;
  }

  function renderPresidentCabinet(leader, collabs){
    const DIR = new Set(['dircab', 'diradj', 'chefcab', 'chefadj']);
    const directReports = collabs.filter(p => String(p.superior_id) === String(leader.id));
    const strategic = directReports.filter(p => DIR.has(p.collab_grade) || normalise(p.job_title).includes('special')).sort(byRankOrderThenName);
    const poleHeads = directReports.filter(p => p.collab_grade === 'chefpole').sort(byRankOrderThenName);

    let html = '';
    html += '<section class="presidential-band"><div class="cabinet-header"><h2>Cabinet présidentiel</h2></div><div class="cabinet-inner">';
    if (strategic.length === 0){
      html += '<div class="placeholder">Équipe stratégique non renseignée pour le Président.</div>';
    } else {
      strategic.forEach(person => {
        const isHead = DIR.has(person.collab_grade) || normalise(person.job_title).includes('special');
        html += renderPersonCard(person, { size: isHead ? 64 : 56, head: isHead });
      });
    }
    html += '</div></section>';

    html += '<section class="presidential-grid">';
    if (poleHeads.length === 0){
      const advisors = collabs.filter(p => p.collab_grade === 'conseiller' && String(p.superior_id) === String(leader.id)).sort(byRankOrderThenName);
      html += '<article class="presidential-cluster" data-tone="advisors">';
      html += '<h3>Conseillers auprès du Président</h3>';
      if (advisors.length === 0){
        html += '<div class="placeholder">Aucun conseiller direct renseigné.</div>';
      } else {
        html += '<div class="cluster-grid">';
        advisors.forEach(member => {
          html += renderPersonCard(member, { size: 52 });
        });
        html += '</div>';
      }
      html += '</article>';
    } else {
      poleHeads.forEach(head => {
        const members = collabs.filter(p => p.collab_grade === 'conseiller' && String(p.superior_id) === String(head.id)).sort(byRankOrderThenName);
        let poleName = head.job_title || head.cabinet_role || head.full_name;
        if (poleName && !/^cercle|^p[oô]le\b/i.test(poleName)){
          poleName = `Cercle ${poleName}`;
        }
        html += '<article class="presidential-cluster" data-tone="strategic">';
        html += `<h3>${escapeHTML(poleName)}</h3>`;
        if (members.length === 0){
          html += '<div class="placeholder">Ce cercle ne possède pas encore de conseillers affichés.</div>';
        } else {
          html += '<div class="cluster-grid">';
          html += renderPersonCard(head, { size: 60, head: true });
          members.forEach(member => {
            html += renderPersonCard(member, { size: 52 });
          });
          html += '</div>';
        }
        html += '</article>';
      });
    }
    html += '</section>';

    return html;
  }

  function renderOrganisation(targetKey){
    const leader = findLeader(targetKey);
    if (!leader){
      collabContainer.innerHTML = '<div class="placeholder">Aucun profil ne correspond à cette sélection.</div>';
      setLeaderInfo('');
      return;
    }
    renderLeaderCard(leader, targetKey);
    const persons = personsCache || [];
    personsById = new Map(persons.map(p => [String(p.id), p]));
    const collabs = persons.filter(p => p.role === 'collaborator' && belongsToLeader(p, leader.id));
    if (collabs.length === 0){
      collabContainer.innerHTML = '<div class="placeholder">Aucun collaborateur n\'est rattaché à cette personnalité dans Supabase.</div>';
      return;
    }

    let html = '';
    if (targetKey === 'pm'){
      html = renderPMCcabinet(leader, collabs);
    } else {
      html = renderPresidentCabinet(leader, collabs);
    }
    collabContainer.innerHTML = html;
    setLeaderInfo(`Dernière mise à jour : ${new Date().toLocaleString('fr-FR')}`);
  }

  function handleToggleClick(event){
    const target = event.currentTarget?.getAttribute('data-target');
    if (!target || !TARGETS[target] || target === currentTarget) return;
    currentTarget = target;
    toggleButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-target') === currentTarget);
    });
    if (personsCache){
      renderOrganisation(currentTarget);
    } else {
      load();
    }
  }

  function openDetail(person){
    if (!detailOverlay || !person) return;
    detailName.textContent = person.full_name || '';
    detailRole.textContent = person.cabinet_role || person.role || '';
    detailJob.textContent = person.job_title || '';
    detailContact.innerHTML = person.email ? `<a href="mailto:${escapeHTML(person.email)}">${escapeHTML(person.email)}</a>` : '<span>Aucun contact communiqué.</span>';
    detailOverlay.setAttribute('aria-hidden', 'false');
    detailOverlay.classList.add('is-visible');
    detailClose?.focus();
  }

  function closeDetail(){
    if (!detailOverlay) return;
    detailOverlay.classList.remove('is-visible');
    detailOverlay.setAttribute('aria-hidden', 'true');
  }

  function attachCardEvents(){
    collabContainer?.addEventListener('click', event => {
      const card = event.target.closest('.collab-card');
      if (!card) return;
      const id = card.getAttribute('data-person-id');
      const person = personsById.get(String(id));
      if (person) openDetail(person);
    });

    collabContainer?.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' '){
        const card = event.target.closest('.collab-card');
        if (!card) return;
        event.preventDefault();
        const id = card.getAttribute('data-person-id');
        const person = personsById.get(String(id));
        if (person) openDetail(person);
      }
    });
  }

  function attachDetailEvents(){
    detailClose?.addEventListener('click', closeDetail);
    detailOverlay?.addEventListener('click', event => {
      if (event.target === detailOverlay){
        closeDetail();
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape'){
        closeDetail();
      }
    });
  }

  async function load(){
    try {
      setStatus('Chargement des données Supabase…', '');
      setLeaderInfo('');
      await fetchPersons();
      setStatus('Organigramme chargé avec succès.', 'ok');
      renderOrganisation(currentTarget);
    } catch (error){
      console.error('[organigrammes] Échec du chargement', error);
      setStatus('Impossible de récupérer les données Supabase.', 'err');
      collabContainer.innerHTML = '<div class="placeholder">La connexion Supabase a échoué. Vérifiez les clés de configuration.</div>';
    }
  }

  function init(){
    if (!ensureSupabaseClient()){
      setStatus('Client Supabase indisponible – vérifiez config/supabase.js.', 'err');
      return;
    }
    attachCardEvents();
    attachDetailEvents();
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', handleToggleClick);
      btn.classList.toggle('is-active', btn.getAttribute('data-target') === currentTarget);
    });
    refreshBtn?.addEventListener('click', () => {
      personsCache = null;
      personsById.clear();
      load();
    });
    load();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
