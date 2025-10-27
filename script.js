const ROLE_LABELS = {
    leader: "Premier ministre",
    "minister-state": "Ministre d'État",
    minister: "Ministre",
    "minister-delegate": "Ministre délégué",
    "ministre-delegue": "Ministre délégué",
    secretary: "Secrétaire d'État",
    collaborator: "Collaborateur"
};

// Ordre fixe des ministères pour l'affichage
const MINISTRY_ORDER = [
    "Premier ministre",
    "Ministère de l'Intérieur",
    "Ministère des Armées et des Anciens combattants",
    "Ministère du Travail et des Solidarités",
    "Ministère de la Transition écologique, de la Biodiversité et des Négociations internationales sur le climat et la nature",
    "Ministère de la Justice",
    "Ministère de l’Économie, des Finances et de la Souveraineté industrielle, énergétique et numérique",
    "Ministère des Petites et moyennes entreprises, du Commerce, de l’Artisanat et du Tourisme et du Pouvoir d’achat",
    "Ministère de l’Agriculture, de l’Agro-alimentaire et de la Souveraineté alimentaire",
    "Ministère de l'Éducation nationale",
    "Ministère de l'Europe et des Affaires étrangères",
    "Ministère de la Culture",
    "Ministère de la Santé, des Familles, de l’Autonomie et des Personnes handicapées",
    "Ministère des Outre-mer",
    "Ministère de l'Aménagement du territoire et de la Décentralisation",
    "Ministère de l’Action et des Comptes publics",
    "Ministère de l’Enseignement supérieur, de la Recherche et de l’Espace",
    "Ministère des Sports, de la Jeunesse et de la Vie associative",
    "Ministère des Transports",
    "Ministère de la Ville et du Logement"
];

const normalizeLabel = (value) =>
    value
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim() ?? "";

const MINISTRY_ORDER_MAP = new Map(
    MINISTRY_ORDER.map((label, idx) => [normalizeLabel(label), idx])
);

// Priorité d'importance par rôle
// 0 = plus important (haut gauche), grandissant vers la droite/bas
const ROLE_PRIORITY = {
    leader: 0,
    "minister-state": 1, // plus haut que "minister"
    minister: 2,
    "minister-delegate": 3,
    "ministre-delegue": 3,
    secretary: 4,
    collaborator: 5
};

const MINISTER_ROLES = new Set([
    "leader",
    "minister-state",
    "minister",
    "minister-delegate",
    "ministre-delegue",
    "secretary"
]);

const DELEGATE_ROLES = new Set(["minister-delegate", "ministre-delegue", "secretary"]);
const CORE_ROLES = new Set(["leader", "minister", "minister-state"]);
const FALLBACK_DATA_URL = "data/ministers.json";

// Mapping des valeurs `party` (valeurs possibles depuis Supabase) vers
// les étiquettes utilisées par les sélecteurs CSS `[data-party="$LABEL"]`.
const PARTY_MAP = new Map([
    ["renaissance", "Renaissance"],
    ["horizons", "Horizons"],
    ["modem", "MoDem"],
    ["prv", "PRV"],
    ["centristes", "Centristes"],
    ["udi", "UDI"],
    ["lr", "LR"],
    ["les republicains", "LR"],
    ["republicains", "LR"],
    ["dlf", "DLF"],
    ["rn", "RN"],
    ["rassemblement national", "RN"],
    ["reconquete", "Reconquête"],
    ["reconquête", "Reconquête"],
    ["patriotes", "Patriotes"],
    ["ps", "PS"],
    ["place publique", "Place Publique"],
    ["placepublique", "Place Publique"],
    ["generations", "Génération.s"],
    ["génération.s", "Génération.s"],
    ["eelv", "EELV"],
    ["pcf", "PCF"],
    ["lfi", "LFI"],
    ["npa", "NPA"],
    ["lo", "LO"],
    ["prg", "PRG"],
    ["poi", "POI"],
    ["animaliste", "Animaliste"],
    ["volt", "Volt"],
    ["regionalistes", "Regionalistes"]
]);

const KNOWN_PARTIES = Array.from(new Set(PARTY_MAP.values())).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
);

const mapPartyLabel = (raw) => {
    if (!raw) return null;
    const k = normalise(raw).replace(/[\s\u00A0]+/g, " ");
    if (PARTY_MAP.has(k)) return PARTY_MAP.get(k);
    const compact = k.replace(/[^a-z0-9]/g, "");
    if (PARTY_MAP.has(compact)) return PARTY_MAP.get(compact);
    const first = k.split(" ")[0];
    if (PARTY_MAP.has(first)) return PARTY_MAP.get(first);
    return null;
};


const createPartyBadge = (partyName) => {
    if (!partyName) return null;
    const badge = document.createElement("span");
    badge.className = "party-badge";
    const mapped = mapPartyLabel(partyName);
    badge.textContent = mapped || partyName;
    if (mapped) {
        badge.setAttribute("data-party", mapped);
    }
    return badge;
};


const grid = document.getElementById("ministers-grid");
const emptyState = document.getElementById("ministers-empty");
const searchInput = document.getElementById("minister-search");
const partyFilter = document.getElementById("party-filter");
const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
const exportPageButton = document.getElementById("export-page-pdf");
const modal = document.getElementById("minister-modal");
const modalBackdrop = modal?.querySelector("[data-dismiss]");
const modalClose = modal?.querySelector(".modal-close");
const exportButton = document.getElementById("export-minister-pdf");

const modalElements = {
    photo: document.getElementById("modal-photo"),
    role: document.getElementById("modal-role"),
    title: document.getElementById("modal-title"),
    portfolio: document.getElementById("modal-portfolio"),
    description: document.getElementById("modal-description"),
    mission: document.getElementById("modal-mission"),
    contact: document.getElementById("modal-contact")
};

const updatePartyFilterOptions = (pool = []) => {
    if (!partyFilter) return;

    const parties = new Set(KNOWN_PARTIES);
    if (Array.isArray(pool)) {
        pool.forEach((entry) => {
            const mapped = mapPartyLabel(entry?.party);
            if (mapped) parties.add(mapped);
        });
    }

    const sortedParties = Array.from(parties).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
    const previousValue = partyFilter.value || "";

    partyFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Tous partis";
    partyFilter.appendChild(allOption);

    sortedParties.forEach((label) => {
        const option = document.createElement("option");
        option.value = label;
        option.textContent = label;
        partyFilter.appendChild(option);
    });

    if (previousValue && sortedParties.includes(previousValue)) {
        partyFilter.value = previousValue;
        currentParty = previousValue;
    } else {
        partyFilter.value = "";
        currentParty = "";
    }
};

let ministers = [];
let coreMinisters = [];
let delegateMinisters = [];
let currentRole = "all";
let currentQuery = "";
let currentQueryInput = "";
let currentParty = "";
let currentSort = "role";
let onlyWithDelegates = false;
let onlyWithBio = false;
let lastFetchError = null; // store last fetch error for debug UI
let activeMinister = null;

updatePartyFilterOptions();

const hasDelegates = (minister) => Array.isArray(minister?.delegates) && minister.delegates.length > 0;
const hasBiography = (minister) => Boolean((minister?.description ?? "").trim());

const updateResultsSummary = (visible, total) => {
    if (resultsCurrentEl) {
        resultsCurrentEl.textContent = String(visible);
    }
    if (resultsTotalEl) {
        resultsTotalEl.textContent = String(total);
    }
    if (resultsLabelEl) {
        resultsLabelEl.textContent = visible > 1 || visible === 0 ? "résultats" : "résultat";
    }
};

const updateActiveFiltersHint = (visible, total) => {
    if (!activeFiltersHint) return;
    const summaries = [];
    if (currentRole !== "all") {
        const roleButton = filterButtons.find((btn) => btn.dataset.role === currentRole);
        if (roleButton) summaries.push(roleButton.textContent.trim());
    }
    if (currentParty) {
        summaries.push(`Parti : ${currentParty}`);
    }
    if (onlyWithDelegates) {
        summaries.push("Cabinet renseigné");
    }
    if (onlyWithBio) {
        summaries.push("Bio disponible");
    }
    if (currentQueryInput.trim()) {
        summaries.push(`Recherche « ${currentQueryInput.trim()} »`);
    }

    if (!summaries.length) {
        activeFiltersHint.textContent = visible || total === 0 ? "Tous les profils sont affichés." : "Les profils disponibles sont affichés.";
        return;
    }

    const text = summaries.join(" • ");
    activeFiltersHint.textContent = visible ? text : `${text} — aucun résultat`;
};

const sortMinisters = (items) => {
    const list = items.slice();
    switch (currentSort) {
        case "alpha":
            return list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" }));
        case "portfolio":
            return list.sort((a, b) => {
                const byPortfolio = (a.portfolio || "").localeCompare(b.portfolio || "", "fr", { sensitivity: "base" });
                if (byPortfolio !== 0) return byPortfolio;
                return (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" });
            });
        case "role":
        default:
            return list.sort((a, b) => {
                const ra = ROLE_PRIORITY[a.role] ?? Number.MAX_SAFE_INTEGER;
                const rb = ROLE_PRIORITY[b.role] ?? Number.MAX_SAFE_INTEGER;
                if (ra !== rb) return ra - rb;
                const ia = MINISTRY_ORDER_MAP.get(normalise(a.portfolio || a.ministry || ""));
                const ib = MINISTRY_ORDER_MAP.get(normalise(b.portfolio || b.ministry || ""));
                const va = typeof ia === "number" ? ia : Number.MAX_SAFE_INTEGER;
                const vb = typeof ib === "number" ? ib : Number.MAX_SAFE_INTEGER;
                if (va !== vb) return va - vb;
                return (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" });
            });
    }
};

const debounce = (fn, wait = 220) => {
    let timeout;
    return (...args) => {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(...args), wait);
    };
};

const formatRole = (role) => ROLE_LABELS[role] ?? role ?? "";

const normalise = (value) =>
    value
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim() ?? "";

const ensureSupabaseClient = () => {
    try {
        if (window.supabaseClient) return window.supabaseClient;
        if (typeof window.supabase !== "undefined" && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            return window.supabaseClient;
        }
    } catch (error) {
        console.warn("[onepage] Impossible d'initialiser Supabase", error);
    }
    return null;
};

const buildCard = (minister) => {
    const card = document.createElement("article");
    card.className = "minister-card";
    card.setAttribute("role", "listitem");
    card.dataset.role = minister.role ?? "";
    if (minister.id != null) card.dataset.personId = String(minister.id);

    const roleKey = minister.role || "";
    if (roleKey === "leader") {
        card.classList.add("is-leader");
        card.setAttribute("aria-label", "Premier ministre");
    }

    if (minister.accentColor) {
        card.style.setProperty("--accent-color", minister.accentColor);
    }

    const left = document.createElement("div");
    left.className = "mc-left";
    const right = document.createElement("div");
    right.className = "mc-right";

    const portfolio = document.createElement("div");
    portfolio.className = "mc-ministry";
    portfolio.textContent = minister.portfolio ?? "Portefeuille à préciser";
    left.appendChild(portfolio);

    const ministriesEntries = Array.isArray(minister.ministries) ? minister.ministries : [];
    const normalizedPortfolio = normalise(minister.portfolio || "");
    const seenMinistries = new Set();
    const ministriesBadges = ministriesEntries
        .map((entry) => {
            const label = (entry?.label || "").trim();
            const roleLabel = (entry?.roleLabel || "").trim();
            const displayLabel = label || roleLabel;
            if (!displayLabel) return null;

            const normalizedLabel = normalise(label || roleLabel);
            if (normalizedLabel && normalizedLabel === normalizedPortfolio) {
                return null;
            }

            const normalizedRole = normalise(roleLabel);
            const dedupeKey = `${normalizedLabel}::${normalizedRole}`;
            if (seenMinistries.has(dedupeKey)) {
                return null;
            }
            seenMinistries.add(dedupeKey);

            return {
                label,
                roleLabel,
                displayLabel,
                isPrimary: Boolean(entry?.isPrimary)
            };
        })
        .filter(Boolean);

    if (ministriesBadges.length) {
        const ministriesContainer = document.createElement("div");
        ministriesContainer.className = "mc-ministries";

        ministriesBadges.forEach((entry) => {
            const badge = document.createElement("span");
            badge.className = "mc-ministry-badge";
            if (entry.isPrimary) {
                badge.classList.add("is-primary");
            }
            if (entry.label && entry.roleLabel) {
                badge.textContent = `${entry.label} • ${entry.roleLabel}`;
            } else if (entry.roleLabel) {
                badge.textContent = entry.roleLabel;
            } else {
                badge.textContent = entry.displayLabel;
            }
            ministriesContainer.appendChild(badge);
        });

        left.appendChild(ministriesContainer);
    }

    const name = document.createElement("h3");
    name.textContent = minister.name ?? "Nom du ministre";
    left.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "mc-meta";

    const role = document.createElement("p");
    role.className = "minister-role";
    role.textContent = formatRole(roleKey);
    meta.appendChild(role);

    const partyValue = minister.party;
    const partyBadge = createPartyBadge(partyValue == null ? "" : String(partyValue).trim());
    if (partyBadge) {
        meta.appendChild(partyBadge);
    }

    left.appendChild(meta);

    const missionText = (minister.mission ?? "").trim();
    if (missionText) {
        const mission = document.createElement("p");
        mission.className = "mc-mission";
        mission.textContent = missionText;
        left.appendChild(mission);
    }

    if (roleKey === "leader") {
        const bio = document.createElement("p");
        bio.className = "mc-bio";
        bio.textContent = (minister.description || "").trim() || "Biographie prochainement disponible.";
        left.appendChild(bio);
    }

    const photo = document.createElement("img");
    photo.className = "minister-photo";
    photo.src = minister.photo ?? "assets/placeholder-minister.svg";
    photo.alt = minister.photoAlt ?? `Portrait de ${minister.name ?? "ministre"}`;
    right.appendChild(photo);

    const cta = document.createElement("button");
    cta.type = "button";
    cta.className = "btn btn-primary minister-cta";
    cta.textContent = "Voir la fiche";
    cta.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openModal(minister);
    });
    right.appendChild(cta);

    const delegates = Array.isArray(minister.delegates) ? minister.delegates : [];
    if (delegates.length) {
        const delegatesContainer = document.createElement("div");
        delegatesContainer.className = "delegates";

        delegates.forEach((delegate) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "delegate-card";

            const info = document.createElement("div");
            info.className = "delegate-info";

            const dn = document.createElement("p");
            dn.className = "delegate-name";
            dn.textContent = delegate.name || "";
            info.appendChild(dn);

            const dr = document.createElement("p");
            dr.className = "delegate-role";
            dr.textContent = delegate.portfolio || formatRole(delegate.role) || "";
            info.appendChild(dr);

            btn.appendChild(info);

            const delegateBadge = createPartyBadge(
                delegate.party == null ? "" : String(delegate.party).trim()
            );
            if (delegateBadge) {
                btn.appendChild(delegateBadge);
            }

            btn.addEventListener("click", (event) => {
                event.stopPropagation();
                openModal(delegate);
            });

            delegatesContainer.appendChild(btn);
        });

        left.appendChild(delegatesContainer);
    }

    card.appendChild(left);
    card.appendChild(right);

    return card;
};

const renderGrid = (items) => {
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = "";

    if (!items.length) {
        grid.setAttribute("aria-busy", "false");
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;
    const fragment = document.createDocumentFragment();

    items.forEach((minister) => {
        fragment.appendChild(buildCard(minister));
    });

    grid.appendChild(fragment);
    grid.setAttribute("aria-busy", "false");
};

const attachDelegatesToCore = () => {
    if (!Array.isArray(coreMinisters) || !Array.isArray(delegateMinisters)) return;

    const coreById = new Map();
    coreMinisters.forEach((minister) => {
        if (minister && minister.id != null) {
            coreById.set(String(minister.id), minister);
        }
        if (Array.isArray(minister?.delegates)) {
            minister.delegates = minister.delegates.slice();
        } else {
            minister.delegates = [];
        }
    });

    const tryAssign = (delegate, target) => {
        if (!target) return false;
        target.delegates = Array.isArray(target.delegates) ? target.delegates : [];
        target.delegates.push(delegate);
        return true;
    };

    delegateMinisters.forEach((delegate) => {
        if (!delegate) return;
        let parent = null;
        const supId = delegate.superiorId != null ? String(delegate.superiorId) : null;
        if (supId && coreById.has(supId)) {
            parent = coreById.get(supId);
        }
        if (!parent && supId) {
            parent = coreMinisters.find((minister) => String(minister.id) === supId) || null;
        }
        if (!parent && delegate.primaryParentMinistryId) {
            const parentId = String(delegate.primaryParentMinistryId);
            parent = coreMinisters.find((minister) => String(minister.primaryMinistryId || "") === parentId) || null;
        }
        if (!parent && delegate.primaryMinistryId) {
            const ministryId = String(delegate.primaryMinistryId);
            parent = coreMinisters.find((minister) => String(minister.primaryMinistryId || "") === ministryId) || null;
        }
        if (!parent) {
            const delegateKey = normalise(delegate.portfolio || "");
            if (delegateKey) {
                parent = coreMinisters.find((minister) => normalise(minister.portfolio || "") === delegateKey) || null;
            }
        }

        if (!tryAssign(delegate, parent)) {
            // keep delegates accessible individually when no parent found
            delegate.isOrphanDelegate = true;
        }
    });

    coreMinisters.forEach((minister) => {
        if (Array.isArray(minister.delegates) && minister.delegates.length > 1) {
            minister.delegates.sort((a, b) => {
                const ra = ROLE_PRIORITY[a.role] ?? Number.MAX_SAFE_INTEGER;
                const rb = ROLE_PRIORITY[b.role] ?? Number.MAX_SAFE_INTEGER;
                if (ra !== rb) return ra - rb;
                return (a.name || "").localeCompare(b.name || "");
            });
        }
    });
};

const applyFilters = () => {
    let basePool;
    if (currentRole === "all") {
        basePool = coreMinisters.slice();
    } else if (currentRole === "secretary") {
        basePool = delegateMinisters.filter((minister) => DELEGATE_ROLES.has(minister.role));
    } else {
        basePool = coreMinisters.filter((minister) => minister.role === currentRole);
    }

    const totalAvailable = basePool.length;
    let filtered = basePool;

    if (currentQuery) {
        filtered = filtered.filter((minister) => {
            const haystack = normalise(
                `${minister.name ?? ""} ${minister.portfolio ?? ""} ${minister.mission ?? ""} ${minister.searchIndex ?? ""}`
            );
            return haystack.includes(currentQuery);
        });
    }

    if (currentParty) {
        filtered = filtered.filter((minister) => mapPartyLabel(minister.party) === currentParty);
    }

    if (onlyWithDelegates) {
        filtered = filtered.filter((minister) => hasDelegates(minister));
    }

    if (onlyWithBio) {
        filtered = filtered.filter((minister) => hasBiography(minister));
    }

    const sorted = sortMinisters(filtered);
    renderGrid(sorted);
    updateResultsSummary(sorted.length, totalAvailable);
    updateActiveFiltersHint(sorted.length, totalAvailable);
};

// ===============================
// Récupération des collaborateurs pour un ministre donné
// ===============================
const fetchCollaboratorsForMinister = async (ministerId) => {
    const client = ensureSupabaseClient();
    if (!client || !ministerId) return [];

    try {
        const { data, error } = await client
            .from("persons")
            .select("id, full_name, photo_url, cabinet_role, collab_grade, email, cabinet_order")
            .eq("role", "collaborator")
            .eq("superior_id", ministerId)
            .order("cabinet_order", { ascending: true });

        if (error) {
            console.warn("[onepage] Impossible de récupérer les collaborateurs :", error);
            return [];
        }

        return data || [];
    } catch (e) {
        console.warn("[onepage] Erreur lors de la récupération des collaborateurs :", e);
        return [];
    }
};

const collaboratorsCache = new Map();

const renderCollaboratorsTemplate = (collaborators) => `
      <h4>Collaborateurs</h4>
      <div class="collaborators-list">
        ${collaborators
            .map(
                (c) => `
          <div class="collaborator-card">
            <img src="${c.photo_url || 'assets/placeholder-minister.svg'}" class="collaborator-photo" alt="${c.full_name ? `Portrait de ${c.full_name}` : 'Portrait collaborateur'}">
            <div>
              <p class="collab-name">${c.full_name ?? 'Collaborateur·rice'}</p>
              <p class="collab-role">${c.cabinet_role || 'Collaborateur'}</p>
              ${c.collab_grade ? `<p class="collab-grade">${c.collab_grade}</p>` : ''}
            </div>
          </div>
        `
            )
            .join("")}
      </div>`;

const ensureCollaboratorsForPrint = async (minister) => {
    if (!minister?.id) return [];

    if (!collaboratorsCache.has(minister.id)) {
        const collabs = await fetchCollaboratorsForMinister(minister.id);
        collaboratorsCache.set(minister.id, Array.isArray(collabs) ? collabs : []);
    }

    return collaboratorsCache.get(minister.id) || [];
};

const printMinisterSheet = async (minister) => {
    if (!minister) return;

    let printSheet = document.getElementById("print-sheet");
    if (!printSheet) {
        printSheet = document.createElement("div");
        printSheet.id = "print-sheet";
    } else {
        printSheet.innerHTML = "";
    }

    const ensureText = (value, fallback = "") => {
        if (typeof value !== "string") {
            return value != null ? String(value) : fallback;
        }
        const trimmed = value.trim();
        return trimmed || fallback;
    };

    const createElement = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text != null) element.textContent = text;
        return element;
    };

    const ministriesLabel = minister.ministries?.length
        ? minister.ministries
              .map((entry) => entry?.label)
              .filter(Boolean)
              .join(" • ")
        : null;

    const roleLabel = ensureText(formatRole(minister.role));
    const nameLabel = ensureText(minister.name, "Nom du ministre");
    const portfolioLabel = ensureText(ministriesLabel || minister.portfolio);
    const descriptionText = ensureText(
        minister.description,
        "Ajoutez ici une biographie synthétique."
    );
    const missionText = ensureText(minister.mission);
    const contactText = ensureText(minister.contact, "Contact prochainement disponible.");

    const header = createElement("header", "print-sheet-header");
    const brand = createElement("div", "print-sheet-brand");
    brand.appendChild(createElement("p", "print-sheet-eyebrow", "RumeurLAB • Gouvernement Lecornu II"));
    brand.appendChild(createElement("h1", "print-sheet-name", nameLabel));
    if (roleLabel) brand.appendChild(createElement("p", "print-sheet-role", roleLabel));
    if (portfolioLabel) brand.appendChild(createElement("p", "print-sheet-portfolio", portfolioLabel));

    const photoWrapper = createElement("div", "print-sheet-photo");
    const photo = document.createElement("img");
    photo.src = minister.photo || "assets/placeholder-minister.svg";
    photo.alt = minister.photoAlt || (minister.name ? `Portrait de ${minister.name}` : "Portrait du ministre");
    photoWrapper.appendChild(photo);

    header.appendChild(brand);
    header.appendChild(photoWrapper);
    printSheet.appendChild(header);

    const summarySection = createElement("section", "print-sheet-section");
    summarySection.appendChild(createElement("h2", "print-section-title", "Présentation"));
    summarySection.appendChild(createElement("p", "print-section-text", descriptionText));
    printSheet.appendChild(summarySection);

    const metaItems = [];
    if (missionText) {
        metaItems.push({ label: "Mission", value: missionText });
    }
    if (portfolioLabel) {
        metaItems.push({ label: "Responsabilités", value: portfolioLabel });
    }
    if (contactText) {
        metaItems.push({ label: "Contact", value: contactText });
    }

    if (metaItems.length) {
        const metaSection = createElement("section", "print-sheet-section");
        metaSection.appendChild(createElement("h2", "print-section-title", "Informations clés"));
        const metaList = createElement("dl", "print-sheet-meta");
        metaItems.forEach((entry) => {
            const wrapper = createElement("div", "print-meta-item");
            wrapper.appendChild(createElement("dt", "print-meta-label", entry.label));
            wrapper.appendChild(createElement("dd", "print-meta-value", entry.value));
            metaList.appendChild(wrapper);
        });
        metaSection.appendChild(metaList);
        printSheet.appendChild(metaSection);
    }

    let collaborators = [];
    try {
        collaborators = await ensureCollaboratorsForPrint(minister);
    } catch (error) {
        console.warn("[onepage] Impossible de préparer les collaborateurs pour l'impression", error);
    }
    const hasCollaborators = Array.isArray(collaborators) && collaborators.length;
    if (hasCollaborators) {
        const collabSection = createElement("section", "print-sheet-section print-collaborators-section");
        collabSection.appendChild(createElement("h2", "print-section-title", "Collaborateurs"));
        const collabGrid = createElement("div", "print-collaborators-grid");
        collaborators.forEach((collab) => {
            const card = createElement("div", "print-collaborator-card");
            const collabPhotoWrapper = createElement("div", "print-collaborator-photo");
            const collabImg = document.createElement("img");
            collabImg.src = collab.photo_url || "assets/placeholder-minister.svg";
            collabImg.alt = collab.full_name
                ? `Portrait de ${collab.full_name}`
                : "Portrait collaborateur";
            collabPhotoWrapper.appendChild(collabImg);
            card.appendChild(collabPhotoWrapper);

            const details = createElement("div", "print-collaborator-details");
            details.appendChild(
                createElement("p", "print-collaborator-name", ensureText(collab.full_name, "Collaborateur·rice"))
            );
            details.appendChild(
                createElement("p", "print-collaborator-role", ensureText(collab.cabinet_role, "Collaborateur"))
            );
            if (collab.collab_grade) {
                details.appendChild(
                    createElement("p", "print-collaborator-grade", ensureText(collab.collab_grade))
                );
            }
            card.appendChild(details);
            collabGrid.appendChild(card);
        });
        collabSection.appendChild(collabGrid);
        printSheet.appendChild(collabSection);
    }

    document.body.appendChild(printSheet);
    document.body.classList.add("print-single");

    const cleanup = () => {
        document.body.classList.remove("print-single");
        if (printSheet.parentElement) {
            printSheet.parentElement.removeChild(printSheet);
        } else {
            printSheet.innerHTML = "";
        }
        window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();

    window.setTimeout(() => {
        if (document.body.classList.contains("print-single")) {
            cleanup();
        }
    }, 1000);
};

const openModal = (minister) => {
    if (!modal) return;
    activeMinister = minister;
    const modalBody = modal.querySelector(".modal-body");
    modalElements.photo.src = minister.photo ?? "assets/placeholder-minister.svg";
    modalElements.photo.alt = minister.photoAlt ?? `Portrait de ${minister.name ?? "ministre"}`;
    modalElements.role.textContent = formatRole(minister.role);
    modalElements.title.textContent = minister.name ?? "Nom du ministre";

    const ministriesLabel = minister.ministries?.length
        ? minister.ministries
              .map((entry) => entry.label)
              .filter(Boolean)
              .join(" • ")
        : null;
    modalElements.portfolio.textContent = ministriesLabel || minister.portfolio || "Portefeuille à préciser";

    modalElements.description.textContent = minister.description ?? "Ajoutez ici une biographie synthétique.";

    const missionWrapper = modalElements.mission?.closest("div");
    const missionText = (minister.mission ?? "").trim();
    if (missionText) {
        modalElements.mission.textContent = missionText;
        if (missionWrapper) missionWrapper.hidden = false;
    } else {
        modalElements.mission.textContent = "";
        if (missionWrapper) missionWrapper.hidden = true;
    }
    modalElements.contact.textContent = minister.contact ?? "Contact prochainement disponible.";

    if (modalBody) {
        const oldCollabSection = modalBody.querySelector(".modal-collaborators");
        if (oldCollabSection) oldCollabSection.remove();
        const oldToggle = modalBody.querySelector(".modal-collaborators-toggle");
        if (oldToggle) oldToggle.remove();
    }

    if (modalBody) {
        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.className = "btn btn-ghost modal-collaborators-toggle";
        toggleButton.textContent = minister.id ? "Voir le cabinet" : "Cabinet non disponible";
        toggleButton.setAttribute("aria-expanded", "false");

        if (!minister.id) {
            toggleButton.disabled = true;
            toggleButton.setAttribute("aria-disabled", "true");
        }

        const metaSection = modalBody.querySelector(".modal-meta");
        if (metaSection) {
            metaSection.insertAdjacentElement("afterend", toggleButton);
        } else {
            modalBody.appendChild(toggleButton);
        }

        if (minister.id) {
            let collaboratorsSection = null;
            let isExpanded = false;
            let isLoadingCollaborators = false;
            const collabSectionId = `modal-collaborators-${minister.id}`;
            toggleButton.setAttribute("aria-controls", collabSectionId);

            const ensureCollaboratorsSection = () => {
                const cachedCollabs = collaboratorsCache.get(minister.id);
                if (!cachedCollabs || cachedCollabs.length === 0) {
                    return null;
                }

                if (!collaboratorsSection || !modalBody.contains(collaboratorsSection)) {
                    collaboratorsSection = document.createElement("div");
                    collaboratorsSection.className = "modal-collaborators is-hidden";
                    collaboratorsSection.id = collabSectionId;
                    modalBody.appendChild(collaboratorsSection);
                }

                collaboratorsSection.innerHTML = renderCollaboratorsTemplate(cachedCollabs);
                return collaboratorsSection;
            };

            toggleButton.addEventListener("click", async () => {
                if (isLoadingCollaborators) return;

                if (!collaboratorsCache.has(minister.id)) {
                    isLoadingCollaborators = true;
                    toggleButton.disabled = true;
                    toggleButton.textContent = "Chargement...";

                    const collabs = await fetchCollaboratorsForMinister(minister.id);
                    collaboratorsCache.set(minister.id, Array.isArray(collabs) ? collabs : []);

                    isLoadingCollaborators = false;
                    const cachedCollabs = collaboratorsCache.get(minister.id) || [];

                    if (!cachedCollabs.length) {
                        toggleButton.textContent = "Aucun collaborateur renseigné";
                        toggleButton.disabled = true;
                        toggleButton.setAttribute("aria-expanded", "false");
                        toggleButton.setAttribute("aria-disabled", "true");
                        return;
                    }

                    toggleButton.disabled = false;
                    toggleButton.removeAttribute("aria-disabled");
                    ensureCollaboratorsSection();
                    isExpanded = true;
                    collaboratorsSection?.classList.remove("is-hidden");
                    toggleButton.textContent = "Masquer le cabinet";
                    toggleButton.setAttribute("aria-expanded", "true");
                    return;
                }

                const cachedCollabs = collaboratorsCache.get(minister.id) || [];
                if (!cachedCollabs.length) {
                    toggleButton.textContent = "Aucun collaborateur renseigné";
                    toggleButton.disabled = true;
                    toggleButton.setAttribute("aria-expanded", "false");
                    toggleButton.setAttribute("aria-disabled", "true");
                    return;
                }

                ensureCollaboratorsSection();
                isExpanded = !isExpanded;
                collaboratorsSection?.classList.toggle("is-hidden", !isExpanded);
                toggleButton.textContent = isExpanded ? "Masquer le cabinet" : "Voir le cabinet";
                toggleButton.setAttribute("aria-expanded", String(isExpanded));
            });
        }
    }

    if (exportButton && !exportButton.dataset.bound) {
        exportButton.addEventListener("click", async () => {
            if (!activeMinister) return;
            exportButton.disabled = true;
            try {
                await printMinisterSheet(activeMinister);
            } finally {
                exportButton.disabled = false;
            }
        });
        exportButton.dataset.bound = "true";
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";
};

const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    activeMinister = null;
};

const refreshGridForPrint = () => {
    if (!grid) return;

    if (currentRole === "all" && !currentQuery) {
        renderGrid(coreMinisters);
    } else {
        applyFilters();
    }
};

const printAllMinisters = () => {
    if (!document?.body) return;

    refreshGridForPrint();

    if (modal && !modal.hidden) {
        closeModal();
    }

    const cleanup = () => {
        document.body.classList.remove("print-all");
        window.removeEventListener("afterprint", cleanup);
    };

    document.body.classList.add("print-all");
    window.addEventListener("afterprint", cleanup, { once: true });

    window.requestAnimationFrame(() => {
        window.print();
    });
};

const highlightFilter = (role) => {
    filterButtons.forEach((btn) => {
        const isActive = btn.dataset.role === role;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
};

const fetchMinistersFromSupabase = async () => {
    const client = ensureSupabaseClient();
    if (!client) {
        throw new Error("Client Supabase non initialisé");
    }

    const { data: persons, error: personsError } = await client
        .from("persons")
        .select(
            `id, full_name, role, description, photo_url, email, party, superior_id,
             person_ministries(
                role_label,
                is_primary,
                ministries(id, short_name, name, color, parent_ministry_id)
             )`
        )
        .order("role", { ascending: true })
        .order("full_name", { ascending: true });

    if (personsError) {
        throw personsError;
    }

    const validPersons = (persons || []).filter((person) => MINISTER_ROLES.has(person.role));
    if (!validPersons.length) {
        return [];
    }

    return validPersons.map((person) => {
        const links = Array.isArray(person.person_ministries) ? person.person_ministries.slice() : [];
        links.sort((a, b) => {
            if (!!a.is_primary === !!b.is_primary) {
                const labelA = a?.ministries?.short_name || a?.ministries?.name || "";
                const labelB = b?.ministries?.short_name || b?.ministries?.name || "";
                return labelA.localeCompare(labelB);
            }
            return a.is_primary ? -1 : 1;
        });

        const primaryLink = links.find((link) => link.is_primary) ?? links[0] ?? null;
        const primaryMinistry = primaryLink?.ministries ?? null;

        const ministriesLabels = links
            .map((link) => {
                const ministry = link?.ministries;
                if (!ministry) return null;
                const label = ministry.short_name || ministry.name || "";
                if (!label) return null;
                return {
                    label,
                    roleLabel: link.role_label || null,
                    isPrimary: !!link.is_primary
                };
            })
            .filter(Boolean);

        const searchIndexParts = [
            person.full_name,
            person.description,
            ...ministriesLabels.map((entry) => entry.label),
            ...ministriesLabels.map((entry) => entry.roleLabel || "")
        ];

        return {
            id: person.id,
            name: person.full_name ?? "",
            role: person.role ?? "",
            description: person.description ?? "",
            mission: primaryLink?.role_label || "",
            portfolio: primaryMinistry?.short_name || primaryMinistry?.name || "",
            contact: person.email || "",
            party: person.party || "",
            photo: person.photo_url || "",
            photoAlt: person.full_name ? `Portrait de ${person.full_name}` : undefined,
            accentColor: primaryMinistry?.color || undefined,
            ministries: ministriesLabels,
            superiorId: person.superior_id || null,
            primaryMinistryId: primaryMinistry?.id || null,
            primaryParentMinistryId: primaryMinistry?.parent_ministry_id || null,
            searchIndex: searchIndexParts.filter(Boolean).join(" ")
        };
    });
};

const fetchMinistersFromView = async () => {
    const client = ensureSupabaseClient();
    if (!client) throw new Error("Client Supabase non initialisé");

    const { data, error } = await client
        .from("vw_ministernode")
        .select("person_id, full_name, is_leader, ministry_name, color, photo_url, party")
        .order("is_leader", { ascending: false })
        .order("full_name", { ascending: true });

    if (error) {
        lastFetchError = error;
        // Provide a clearer diagnostic when PostgREST reports missing table/view (PGRST205)
        // This commonly means the DB view `public.vw_ministernode` has not been created in the project
        // or is in a different schema. Useful message for debugging in the browser console.
        if (error.code === "PGRST205" || (error.message && error.message.includes("Could not find the table"))) {
            console.warn("[onepage] La view 'public.vw_ministernode' est introuvable côté Supabase (404).\n" +
                "Vérifiez que vous avez exécuté sql/vw_ministernode.sql dans l'éditeur SQL Supabase et que la view appartient au schema 'public'.\n" +
                "Si la view existe dans un autre schema, adaptez l'endpoint PostgREST ou créez la view dans 'public'.");
        } else {
            console.warn("[onepage] Erreur lors de l'appel à vw_ministernode :", error);
        }
        throw error;
    }

    const rows = data ?? [];

    // Compléter la bio du Premier ministre depuis la table persons si possible
    const leaderIds = rows.filter((r) => r.is_leader).map((r) => r.person_id);
    let leaderDescriptions = new Map();
    if (leaderIds.length) {
        try {
            const { data: persons } = await client
                .from("persons")
                .select("id, description")
                .in("id", leaderIds);
            leaderDescriptions = new Map((persons ?? []).map((p) => [p.id, p.description || ""]));
        } catch (e) {
            // Silencieux: si la table/colonne n'est pas dispo, on continue sans bio
        }
    }

    // Essaye de retrouver l'identifiant du ministère par libellé
    const ministryNames = Array.from(new Set(rows.map((r) => r.ministry_name).filter(Boolean)));
    let ministryIdByName = new Map();
    if (ministryNames.length) {
        try {
            // 1) Match sur short_name
            const { data: byShort } = await client
                .from("ministries")
                .select("id, short_name")
                .in("short_name", ministryNames);
            (byShort || []).forEach((m) => ministryIdByName.set(m.short_name, m.id));
            // 2) Match restant sur name
            const remaining = ministryNames.filter((n) => !ministryIdByName.has(n));
            if (remaining.length) {
                const { data: byName } = await client
                    .from("ministries")
                    .select("id, name")
                    .in("name", remaining);
                (byName || []).forEach((m) => ministryIdByName.set(m.name, m.id));
            }
        } catch (e) {
            // best-effort; ignorer en cas d'erreur
        }
    }

    return rows.map((row) => ({
        id: row.person_id,
        name: row.full_name,
        role: row.is_leader ? "leader" : "minister",
        portfolio: row.ministry_name || (row.is_leader ? "Premier ministre" : ""),
        photo: row.photo_url || "",
        photoAlt: row.full_name ? `Portrait de ${row.full_name}` : undefined,
        accentColor: row.color || undefined,
        party: row.party || "",
        description: leaderDescriptions.get(row.person_id) || "",
        primaryMinistryId: row.ministry_name ? (ministryIdByName.get(row.ministry_name) || null) : null,
        ministries: row.ministry_name ? [{ label: row.ministry_name, isPrimary: true }] : [],
    }));
};

const fetchMinistersFromFallback = async () => {
    const response = await fetch(FALLBACK_DATA_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Impossible de charger les données (${response.status})`);
    }
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
};

const loadMinisters = async () => {
    grid.setAttribute("aria-busy", "true");
    emptyState.hidden = true;

    let dataLoaded = false;

    try {
        let supabaseMinisters = [];
        try {
            supabaseMinisters = await fetchMinistersFromSupabase();
            ministers = supabaseMinisters;
            coreMinisters = supabaseMinisters.filter((m) => CORE_ROLES.has(m.role));
            delegateMinisters = supabaseMinisters.filter((m) => DELEGATE_ROLES.has(m.role));
        } catch (firstErr) {
            lastFetchError = firstErr;
            console.warn('[onepage] fetchMinistersFromSupabase failed, attempting vw_ministernode as fallback', firstErr);
            try {
                supabaseMinisters = await fetchMinistersFromView();
                ministers = supabaseMinisters;
                coreMinisters = supabaseMinisters.filter((m) => CORE_ROLES.has(m.role));
                delegateMinisters = supabaseMinisters.filter((m) => DELEGATE_ROLES.has(m.role));
            } catch (viewErr) {
                lastFetchError = viewErr;
                throw viewErr;
            }
        }
        if (supabaseMinisters.length) {
            attachDelegatesToCore();
            dataLoaded = true;
            updatePartyFilterOptions(ministers);
        }
    } catch (error) {
        lastFetchError = error;
        console.error("[onepage] Erreur lors du chargement des ministres depuis Supabase", error);
    }

    if (!dataLoaded) {
        try {
            const fallbackMinisters = await fetchMinistersFromFallback();
            if (fallbackMinisters.length) {
                ministers = fallbackMinisters;
                coreMinisters = fallbackMinisters.filter((m) => CORE_ROLES.has(m.role));
                delegateMinisters = fallbackMinisters.filter((m) => DELEGATE_ROLES.has(m.role));
                attachDelegatesToCore();
                dataLoaded = true;
                updatePartyFilterOptions(ministers);
            }
        } catch (error) {
            lastFetchError = error;
            console.error("[onepage] Erreur lors du chargement du fichier de secours", error);
        }
    }

    if (dataLoaded) {
        applyFilters();
        // build header search index for autocomplete
        // build header search index for autocomplete (may be defined later)
        if (typeof buildHeaderSearchIndex === 'function') {
            try {
                buildHeaderSearchIndex();
            } catch (e) {
                /* ignore */
            }
        } else {
            // schedule a short retry in case the function is defined after this block
            setTimeout(() => {
                if (typeof buildHeaderSearchIndex === 'function') {
                    try { buildHeaderSearchIndex(); } catch (e) { /* ignore */ }
                }
            }, 60);
        }
    } else {
        ministers = [];
        coreMinisters = [];
        delegateMinisters = [];
        grid.innerHTML = "";
        grid.setAttribute("aria-busy", "false");
        emptyState.hidden = false;
        emptyState.textContent =
            "Aucune donnée disponible. Vérifiez la configuration Supabase ou ajoutez un fichier data/ministers.json.";
        updateResultsSummary(0, 0);
        updateActiveFiltersHint(0, 0);
    }
};

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        currentRole = button.dataset.role ?? "all";
        highlightFilter(currentRole);
        applyFilters();
    });
});

partyFilter?.addEventListener("change", () => {
    currentParty = partyFilter.value || "";
    applyFilters();
});

searchInput?.addEventListener(
    "input",
    debounce((event) => {
        const value = event.target.value || "";
        currentQueryInput = value;
        currentQuery = normalise(value);
        applyFilters();
    }, 180)
);

sortSelect?.addEventListener("change", () => {
    const value = sortSelect.value || "role";
    currentSort = ["role", "alpha", "portfolio"].includes(value) ? value : "role";
    applyFilters();
});

delegatesToggle?.addEventListener("change", () => {
    onlyWithDelegates = Boolean(delegatesToggle.checked);
    applyFilters();
});

bioToggle?.addEventListener("change", () => {
    onlyWithBio = Boolean(bioToggle.checked);
    applyFilters();
});

resetButton?.addEventListener("click", () => {
    currentRole = "all";
    currentQuery = "";
    currentQueryInput = "";
    currentParty = "";
    currentSort = "role";
    onlyWithDelegates = false;
    onlyWithBio = false;

    highlightFilter(currentRole);

    if (searchInput) {
        searchInput.value = "";
    }
    if (partyFilter) {
        partyFilter.value = "";
    }
    if (sortSelect) {
        sortSelect.value = "role";
    }
    if (delegatesToggle) {
        delegatesToggle.checked = false;
    }
    if (bioToggle) {
        bioToggle.checked = false;
    }

    applyFilters();
});

highlightFilter(currentRole);
updateResultsSummary(0, 0);
updateActiveFiltersHint(0, 0);

// Safe bootstrap after DOM is ready to avoid null elements
let __appInitialized = false;
const initApp = () => {
    if (__appInitialized) return;
    __appInitialized = true;

    modalBackdrop?.addEventListener("click", closeModal);
    modalClose?.addEventListener("click", closeModal);
    exportPageButton?.addEventListener("click", printAllMinisters);
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });

    // Lancer le chargement des données
    loadMinisters().catch((err) => {
        console.error("[onepage] Echec du chargement initial", err);
        // Debug banner minimal pour diagnostiquer rapidement en front
        try {
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:rgba(209,0,123,0.1);border-top:1px solid rgba(209,0,123,0.35);color:#4B2579;padding:8px 12px;font:600 13px/1.4 \"Space Grotesk\",system-ui;backdrop-filter:saturate(120%) blur(2px)';
            banner.textContent = 'Diagnostic: échec du chargement des données. Vérifiez Supabase (URL/KEY) ou data/ministers.json.';
            document.body.appendChild(banner);
            setTimeout(() => banner.remove(), 6000);
        } catch { /* no-op */ }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
    initApp();
}

// Header quick search: navigate to a minister or ministry card
const headerSearchForm = document.getElementById("header-search");
const headerSearchInput = document.getElementById("header-search-input");
const headerSearchToggle = document.getElementById("header-search-toggle");
const headerSuggestionsEl = document.getElementById("header-search-suggestions");

let _headerSearchIndex = [];
const buildHeaderSearchIndex = () => {
    const people = (coreMinisters || []).concat(delegateMinisters || []);
    const seen = new Set();
    const items = [];

    people.forEach((p) => {
        const name = (p.name || "").trim();
        if (name && !seen.has(`p:${normalise(name)}`)) {
            items.push({ type: 'person', label: name, value: name, id: p.id, photo: p.photo || p.photo_url || '', portfolio: p.portfolio || '' , description: p.description || p.mission || '' });
            seen.add(`p:${normalise(name)}`);
        }
        const port = (p.portfolio || p.ministry || '').trim();
        if (port && !seen.has(`m:${normalise(port)}`)) {
            items.push({ type: 'ministry', label: port, value: port });
            seen.add(`m:${normalise(port)}`);
        }
    });

    // Also include MINISTRY_ORDER canonical names
    (MINISTRY_ORDER || []).forEach((m) => {
        if (m && !seen.has(`m:${normalise(m)}`)) {
            items.push({ type: 'ministry', label: m, value: m });
            seen.add(`m:${normalise(m)}`);
        }
    });

    _headerSearchIndex = items;
};

// server-side as-you-type search (Supabase) — best-effort: only runs if client available
const serverSearch = async (query, limit = 6) => {
    if (!query || query.length < 3) return [];
    const client = ensureSupabaseClient();
    if (!client) return [];
    try {
        const q = `%${query}%`;
        const { data: persons } = await client
            .from('persons')
            .select('id, full_name, photo_url, job_title, description')
            .ilike('full_name', q)
            .limit(limit);

        const { data: ministries } = await client
            .from('ministries')
            .select('id, name, short_name')
            .ilike('name', q)
            .limit(4);

        const results = [];
        (persons || []).forEach((p) => results.push({ type: 'person', label: p.full_name, value: p.full_name, id: p.id, photo: p.photo_url || '', portfolio: p.job_title || '', description: p.description || '' }));
        (ministries || []).forEach((m) => results.push({ type: 'ministry', label: m.short_name || m.name, value: m.short_name || m.name }));
        return results;
    } catch (e) {
        // silent fail — fallback to client-side index
        return [];
    }
};

const renderHeaderSuggestions = (query) => {
    if (!headerSuggestionsEl) return;
    headerSuggestionsEl.innerHTML = "";
    const qn = normalise(query || '');
    if (!qn) {
        headerSuggestionsEl.hidden = true;
        return;
    }
    const max = 6;
    let matches = _headerSearchIndex.filter((it) => normalise(it.label || '').includes(qn)).slice(0, max);
    // if server available, try server-side suggestions (as-you-type) and merge
    if (typeof ensureSupabaseClient === 'function') {
        // fire-and-forget; but prefer to await to show server results quickly
    }
    if (!matches.length) {
        headerSuggestionsEl.hidden = true;
        return;
    }
    matches.forEach((it, idx) => {
        const el = document.createElement('div');
        el.className = 'header-suggestion';
        el.setAttribute('role', 'option');
        el.dataset.index = String(idx);

        // avatar for person
        if (it.type === 'person') {
            const img = document.createElement('img');
            img.className = 'avatar';
            img.alt = it.label;
            img.src = it.photo || 'assets/placeholder-minister.svg';
            el.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.style.width = '40px';
            placeholder.style.height = '40px';
            placeholder.style.borderRadius = '9999px';
            placeholder.style.background = 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))';
            el.appendChild(placeholder);
        }

        const text = document.createElement('div');
        text.className = 'text';
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = it.label;
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = it.type === 'person' ? (it.portfolio || 'Personne') : 'Ministère';
        text.appendChild(label);
        text.appendChild(meta);
        el.appendChild(text);

        // tooltip / title with extra info
        if (it.description) el.title = it.description;

        el.addEventListener('click', (ev) => {
            ev.preventDefault();
            headerSearchInput.value = it.value;
            clearSuggestions();
            navigateToQuery(it.value);
        });

            headerSuggestionsEl.appendChild(el);
    });
    headerSuggestionsEl.hidden = false;
};

const clearSuggestions = () => {
    if (!headerSuggestionsEl) return;
    headerSuggestionsEl.innerHTML = '';
    headerSuggestionsEl.hidden = true;
};

let _suggestionIndex = -1;
const setActiveSuggestion = (idx) => {
    if (!headerSuggestionsEl) return;
    const items = Array.from(headerSuggestionsEl.querySelectorAll('.header-suggestion'));
    items.forEach((it, i) => {
        const sel = (i === idx);
        it.setAttribute('aria-selected', sel ? 'true' : 'false');
        if (sel) it.scrollIntoView({ block: 'nearest' });
    });
    _suggestionIndex = idx;
};

const clearHighlight = (el) => {
    if (!el) return;
    el.classList.remove("search-highlight");
};

const highlightElement = (el, duration = 2000) => {
    if (!el) return;
    el.classList.add("search-highlight");
    window.setTimeout(() => clearHighlight(el), duration);
};

const navigateToQuery = (q) => {
    const qn = normalise(q || "").trim();
    if (!qn) return false;

    // Prefer exact name match, then contains, then ministry match
    const all = (coreMinisters || []).concat(delegateMinisters || []);
    let match = all.find((m) => normalise(m.name || "") === qn);
    if (!match) match = all.find((m) => normalise(m.name || "").includes(qn));
    if (!match) match = all.find((m) => normalise(m.portfolio || m.ministry || "") === qn);
    if (!match) match = all.find((m) => normalise(m.portfolio || m.ministry || "").includes(qn));

    // If still not found, try tokenized ministry label match
    if (!match && qn.length > 2) {
        const tokens = qn.split(/[^a-z0-9]+/).filter(Boolean);
        match = all.find((m) => {
            const hay = normalise(m.portfolio || m.ministry || m.name || "");
            return tokens.some((t) => hay.includes(t));
        });
    }

    if (match) {
        const selector = `[data-person-id="${match.id}"]`;
        const el = document.querySelector(selector) || Array.from(document.querySelectorAll('.minister-card')).find(c => {
            // fallback: match by visible name text
            const nameEl = c.querySelector('h3');
            return nameEl && normalise(nameEl.textContent || '') === normalise(match.name || '');
        });
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // temporarily highlight
            highlightElement(el, 2200);
            // focus the primary CTA for keyboard users
            const cta = el.querySelector('.minister-cta');
            if (cta) cta.focus({ preventScroll: true });
            return true;
        }
    }

    return false;
};

if (headerSearchForm && headerSearchInput) {
    headerSearchForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const q = headerSearchInput.value || '';
        const found = navigateToQuery(q);
        if (!found) {
            // fallback: go to ministers section
            const section = document.getElementById('ministres');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        clearSuggestions();
    });

    // show suggestions as the user types (finer debounce)
    headerSearchInput.addEventListener('input', debounce(async (ev) => {
        const q = ev.target.value || '';
        if (!_headerSearchIndex || !_headerSearchIndex.length) buildHeaderSearchIndex();
        // try server-side suggestions first when possible
        let suggestions = [];
        if (q.length >= 3 && typeof ensureSupabaseClient === 'function') {
            try {
                suggestions = await serverSearch(q, 6);
            } catch (e) {
                suggestions = [];
            }
        }
        // merge server suggestions with local index, de-duplicated
        const localMatches = _headerSearchIndex.filter((it) => normalise(it.label || '').includes(normalise(q)));
        const merged = [];
        const seen = new Set();
        (suggestions.concat(localMatches)).forEach((it) => {
            const key = `${it.type}:${normalise(it.label || '')}`;
            if (!seen.has(key) && merged.length < 6) {
                merged.push(it);
                seen.add(key);
            }
        });
        // temporarily set index to merged to render
        const prevIndex = _headerSearchIndex;
        _headerSearchIndex = merged.concat(prevIndex);
        renderHeaderSuggestions(q);
        // restore original index
        _headerSearchIndex = prevIndex;
        _suggestionIndex = -1;
    }, 80));

    headerSearchInput.addEventListener('keydown', (ev) => {
        const items = headerSuggestionsEl ? Array.from(headerSuggestionsEl.querySelectorAll('.header-suggestion')) : [];
        if (ev.key === 'Escape') {
            clearSuggestions();
            headerSearchInput.blur();
            return;
        }
        if (!items.length) return;
        if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            const next = Math.min(_suggestionIndex + 1, items.length - 1);
            setActiveSuggestion(next);
        } else if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            const prev = Math.max(_suggestionIndex - 1, 0);
            setActiveSuggestion(prev);
        } else if (ev.key === 'Enter') {
            // If a suggestion is active, pick it
            if (_suggestionIndex >= 0 && items[_suggestionIndex]) {
                ev.preventDefault();
                const labelText = items[_suggestionIndex].querySelector('.label').textContent;
                const it = _headerSearchIndex.find((it2) => normalise(it2.label) === normalise(labelText));
                if (it) {
                    headerSearchInput.value = it.value;
                    clearSuggestions();
                    navigateToQuery(it.value);
                }
            }
        }
    });

    // hide suggestions when focus lost (allow click)
    headerSearchInput.addEventListener('blur', () => setTimeout(() => clearSuggestions(), 150));

    // toggle button behaviour: collapse/expand
    if (headerSearchToggle) {
        headerSearchToggle.addEventListener('click', () => {
            const expanded = headerSearchToggle.getAttribute('aria-expanded') === 'true';
            headerSearchToggle.setAttribute('aria-expanded', String(!expanded));
            const form = headerSearchForm;
            if (!expanded) {
                form.classList.add('expanded');
                headerSearchInput.focus();
            } else {
                form.classList.remove('expanded');
                headerSearchInput.blur();
                clearSuggestions();
            }
        });
    }
}
