const ROLE_LABELS = {
    leader: "Premier ministre",
    president: "Président de la République",
    "minister-state": "Ministre d'État",
    minister: "Ministre",
    "minister-delegate": "Ministre délégué",
    "ministre-delegue": "Ministre délégué",
    secretary: "Secrétaire d'État",
    collaborator: "Collaborateur"
};

// Ordre fixe des ministères pour l'affichage qui ne marche tout simplement pas il faudrait que j'intègre un sort index depuis supabase mais pour le moment je vais me contenter de ça 
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
// j'ai supprimé l'affichage par grandeur selon le rôle car c'était turbo moche
const ROLE_PRIORITY = {
    president: -1,
    leader: 0,
    "minister-state": 1, 
    minister: 2,
    "minister-delegate": 3,
    "ministre-delegue": 3,
    secretary: 4,
    collaborator: 5
};

const MINISTER_ROLES = new Set([
    "leader",
    "president",
    "minister-state",
    "minister",
    "minister-delegate",
    "ministre-delegue",
    "secretary"
]);

const DELEGATE_ROLES = new Set(["minister-delegate", "ministre-delegue", "secretary"]);
const CORE_ROLES = new Set(["leader", "president", "minister", "minister-state"]);
const HEAD_ROLES = new Set(["leader", "president"]);

const ensureImageSource = (value, fallback = "assets/placeholder-minister.svg") => {
    if (!value || typeof value !== "string") return fallback;
    
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    
    // URL absolue ou data URI → retourner tel quel
    if (/^(https?:)?\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
        return trimmed;
    }
    
    // Chemin relatif → retourner tel quel
    return trimmed || fallback;
};

// Basic HTML-escape to avoid XSS when injecting with innerHTML
function escapeHTML(value) {
    if (value == null) return "";
    return String(value).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch]));
}

// Safe image source validation - only allow trusted sources
function safeImgSrc(value) {
    const v = String(value || "").trim();

    // Allow only:
    // - relative paths to assets/
    // - https:// URLs
    if (v.startsWith("assets/")) return v;
    if (v.startsWith("https://")) return v;

    return "assets/placeholder-minister.svg";
}

// Mapping des valeurs `party` (valeurs possibles depuis Supabase) vers
// les étiquettes utilisées par les sélecteurs CSS `[data-party="$LABEL"]
// Si un jour on utilise le site sans moi ça permettra de d'éviter que les gens ce demande pourquoi ça affiche des données pas top
// J'ai postulé l'idée qu'il pouvait avoir un ministre LO c'est dire si je suis optimiste pour l'avenir.
const PARTY_MAP = new Map([
    ["renaissance", "Renaissance"],
    ["horizons", "Horizons"],
    ["modem", "MoDem"],
    ["prv", "PRV"],
    ["centristes", "Centristes"],
    ["udi", "UDI"],
    ["lr", "Les Républicains"],
    ["les republicains", "Les Républicains"],
    ["republicains", "Les Républicains"],
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
    ["regionalistes", "Regionalistes"],
    // indépendants / sans étiquette
    ["sans etiquette", "Sans étiquette"],
    ["sansetiquette", "Sans étiquette"],
    ["sans-etiquette", "Sans étiquette"],
]);

const KNOWN_PARTIES = Array.from(new Set(PARTY_MAP.values())).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
);

const PARTY_COLORS = {
    "Renaissance": "#b89c05",
    "Horizons": "#1E90FF",
    "MoDem": "#F2A900",
    "PRV": "#00A86B",
    "Centristes": "#8A2BE2",
    "UDI": "#0A4D8C",
    "LR": "#0055A4",
    "Les Républicains": "#0055A4",
    "RN": "#2E3348",
    "Reconquête": "#160201ff",
    "Patriotes": "#7A0019",
    "PS": "#E61F5A",
    "Génération.s": "#6CC02B",
    "EELV": "#2FA34A",
};

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
    // Dans le guide que je vais réaliser il faut que dise que si un ministre est sans étiquette il ne faut pas l'indiquer cela se fait automatiquement 
    if (!partyName) {
        const empty = document.createElement("span");
        empty.className = "party-badge no-party";
        empty.textContent = "Sans étiquette";
        empty.setAttribute("data-party", "Sans étiquette");
        return empty;
    }

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
const advancedToggleButton = document.getElementById("advanced-search-toggle");
const advancedSearchPanel = document.getElementById("advanced-search-panel");
const toolbarContainer = document.querySelector(".toolbar");
const exportPageButton = document.getElementById("export-page-pdf");
const modal = document.getElementById("minister-modal");
const modalBackdrop = modal?.querySelector("[data-dismiss]");
const modalClose = modal?.querySelector(".modal-close");
// Export functionality removed - button deleted from HTML
// const exportButton = document.getElementById("export-minister-pdf");
// if (exportButton) {
//     exportButton.disabled = true;
//     exportButton.setAttribute("aria-disabled", "true");
// }
const exportButton = null; // Disabled
const sortSelect = document.getElementById("sort-order");
const delegatesToggle = document.getElementById("filter-delegates");
const bioToggle = document.getElementById("filter-bio");
const resetButton = document.getElementById("filters-reset");
const resultsCurrentEl = document.getElementById("results-count-current");
const resultsTotalEl = document.getElementById("results-count-total");
const resultsLabelEl = document.getElementById("results-count-label");
const activeFiltersHint = document.getElementById("active-filters-hint");

const modalElements = {
    photo: document.getElementById("modal-photo"),
    title: document.getElementById("modal-title"),
    portfolio: document.getElementById("modal-portfolio"),
    description: document.getElementById("modal-description"),
};
// Career elements (optional; shown only when data exists)
const modalBiographySection = document.querySelector('.modal-module--biography');
const modalBiographyRoot = document.getElementById('modal-biography-root');
const modalDelegatesList = document.getElementById("modal-delegates");

// Ensure the modal busy overlay is visible for at least 2 seconds
let __modalBusySince = 0;
let __modalBusyClearTimer = null;
const setModalBusy = (busy) => {
    const content = modal?.querySelector('.modal-content');
    if (!content) return;
    if (busy) {
        if (__modalBusyClearTimer) {
            clearTimeout(__modalBusyClearTimer);
            __modalBusyClearTimer = null;
        }
        __modalBusySince = Date.now();
        content.setAttribute('aria-busy', 'true');
        return;
    }

    const elapsed = Date.now() - __modalBusySince;
    const remaining = Math.max(0, 2000 - elapsed);
    if (remaining > 0) {
        if (__modalBusyClearTimer) clearTimeout(__modalBusyClearTimer);
        __modalBusyClearTimer = setTimeout(() => {
            content.setAttribute('aria-busy', 'false');
            __modalBusyClearTimer = null;
        }, remaining);
    } else {
        content.setAttribute('aria-busy', 'false');
    }
};

// Ensure the main grid busy overlay is visible for at least 2 seconds
let __gridBusySince = 0;
let __gridBusyClearTimer = null;
const setGridBusy = (busy) => {
    if (!grid) return;
    if (busy) {
        if (__gridBusyClearTimer) {
            clearTimeout(__gridBusyClearTimer);
            __gridBusyClearTimer = null;
        }
        __gridBusySince = Date.now();
        grid.setAttribute('aria-busy', 'true');
        return;
    }
    const elapsed = Date.now() - __gridBusySince;
    const remaining = Math.max(0, 2000 - elapsed);
    if (remaining > 0) {
        if (__gridBusyClearTimer) clearTimeout(__gridBusyClearTimer);
        __gridBusyClearTimer = setTimeout(() => {
            grid.setAttribute('aria-busy', 'false');
            __gridBusyClearTimer = null;
        }, remaining);
    } else {
        grid.setAttribute('aria-busy', 'false');
    }
};

const initializeAdvancedSearchToggle = () => {
    if (!advancedToggleButton || !advancedSearchPanel) return null;

    const labelElement = advancedToggleButton.querySelector(".toggle-label");
    const openLabel = advancedToggleButton.dataset.openLabel?.trim() || "Ouvrir la recherche avancée";
    const closeLabel = advancedToggleButton.dataset.closeLabel?.trim() || "Fermer la recherche avancée";
    let hasUserInteracted = false;

    const applyExpandedState = (expanded) => {
        const isExpanded = Boolean(expanded);
        advancedToggleButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        advancedSearchPanel.hidden = !isExpanded;
        advancedToggleButton.classList.toggle("is-active", isExpanded);
        toolbarContainer?.classList.toggle("is-expanded", isExpanded);
        if (labelElement) {
            labelElement.textContent = isExpanded ? closeLabel : openLabel;
        } else {
            advancedToggleButton.textContent = isExpanded ? closeLabel : openLabel;
        }
    };

    const focusFirstControl = () => {
        const focusTarget = advancedSearchPanel.querySelector("input, select, button, textarea");
        if (focusTarget instanceof HTMLElement) {
            focusTarget.focus();
        }
    };

    applyExpandedState(false);

    advancedToggleButton.addEventListener("click", () => {
        const isExpanded = advancedToggleButton.getAttribute("aria-expanded") === "true";
        hasUserInteracted = true;
        applyExpandedState(!isExpanded);
        if (!isExpanded) {
            window.requestAnimationFrame(() => focusFirstControl());
        }
    });

    return {
        open() {
            applyExpandedState(true);
        },
        close() {
            applyExpandedState(false);
        },
        ensureOpen() {
            if (hasUserInteracted) return;
            applyExpandedState(true);
        }
    };
};

const advancedSearchControls = initializeAdvancedSearchToggle();

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
    const hasAdvancedFilters =
        currentRole !== "all" ||
        Boolean(currentParty) ||
        onlyWithDelegates ||
        onlyWithBio ||
        currentSort !== "role";

    if (hasAdvancedFilters) {
        advancedSearchControls?.ensureOpen?.();
    }

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

const updateMinistersGridLayout = () => {
    if (!grid) return;
    // Let CSS auto-fit with a fluid min width drive the layout
    if (grid.hasAttribute('data-columns')) {
        grid.removeAttribute('data-columns');
    }
};

const debouncedGridLayoutUpdate = debounce(updateMinistersGridLayout, 160);
window.addEventListener("resize", debouncedGridLayoutUpdate);
updateMinistersGridLayout();

const formatRole = (role) => ROLE_LABELS[role] ?? role ?? "";

function normalise(value) {
    return (
        value
            ?.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim() ?? ""
    );
}

// Global image fallback: if an <img> fails to load (or is broken), hide it and
// show a fallback SVG logo in its place. This covers static <img> tags that
// may already be in the DOM (templates) and dynamically created ones.
const GLOBAL_FALLBACK_SVG = "assets/LogoRP_Tete_logo_RP_bleu.svg";

const applyFallbackToImg = (img) => {
    if (!img || img.dataset.__fallbackHandled) return;
    // Do not apply the global fallback to leader/president avatars or hero avatars
    const isProtected = (el) => {
        if (!el) return false;
        // cards for leaders get class `is-leader`; hero areas use `.cabinet-tree-hero`
        return Boolean(el.closest && (el.closest('.is-leader') || el.closest('.cabinet-tree-hero')));
    };
    if (isProtected(img)) return;
    img.dataset.__fallbackHandled = "1";
    // If image loaded successfully, nothing to do
    if (img.complete && img.naturalWidth > 0) return;

    // Mark parent (if any) so existing CSS rules like .no-img can take effect
    const parent = img.parentElement;
    if (parent) parent.classList.add('no-img');

    // Hide the broken image so it doesn't show alt text over the fallback
    img.style.display = 'none';

    // Insert a fallback element only if one isn't already present
    if (!parent) return;
    if (!parent.querySelector('.avatar-fallback')) {
        const fallback = document.createElement('div');
        fallback.className = 'avatar-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.style.backgroundImage = `url(${GLOBAL_FALLBACK_SVG})`;
        parent.appendChild(fallback);
    }
};

const initGlobalImageFallbacks = () => {
    // Attach listeners to existing images
    document.querySelectorAll('img').forEach((img) => {
        // If already handled by inline onerror logic, still ensure fallback
        const check = () => {
            if (img.complete && img.naturalWidth === 0) {
                applyFallbackToImg(img);
            }
        };
        img.addEventListener('error', () => applyFallbackToImg(img), { once: true });
        img.addEventListener('load', () => {
            // remove any previous fallback state if it was applied earlier
            const parent = img.parentElement;
            if (parent) {
                parent.classList.remove('no-img');
                const fb = parent.querySelector('.avatar-fallback');
                if (fb) fb.remove();
            }
            img.style.display = '';
        }, { once: true });
        // If already complete but broken, apply fallback
        if (img.complete) setTimeout(check, 0);
    });

    // Observe future images added to the DOM
    const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of Array.from(m.addedNodes || [])) {
                if (node.nodeType !== 1) continue;
                if (node.tagName === 'IMG') {
                    const img = node;
                    img.addEventListener('error', () => applyFallbackToImg(img), { once: true });
                    img.addEventListener('load', () => {
                        const parent = img.parentElement;
                        if (parent) {
                            parent.classList.remove('no-img');
                            const fb = parent.querySelector('.avatar-fallback');
                            if (fb) fb.remove();
                        }
                        img.style.display = '';
                    }, { once: true });
                    if (img.complete && img.naturalWidth === 0) applyFallbackToImg(img);
                } else {
                    // if node contains imgs
                    const imgs = node.querySelectorAll && node.querySelectorAll('img');
                    if (imgs && imgs.length) {
                        imgs.forEach((img) => {
                            img.addEventListener('error', () => applyFallbackToImg(img), { once: true });
                            img.addEventListener('load', () => {
                                const parent = img.parentElement;
                                if (parent) {
                                    parent.classList.remove('no-img');
                                    const fb = parent.querySelector('.avatar-fallback');
                                    if (fb) fb.remove();
                                }
                                img.style.display = '';
                            }, { once: true });
                            if (img.complete && img.naturalWidth === 0) applyFallbackToImg(img);
                        });
                    }
                }
            }
        }
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
};

// Initialize fallbacks after DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initGlobalImageFallbacks, 0);
    } else {
        document.addEventListener('DOMContentLoaded', initGlobalImageFallbacks);
    }
}


const BIOGRAPHY_CATEGORY_ORDER = [
    // Ordre logique d'une biographie; titres affichés tels quels
    'Gouvernement',
    'Assemblée nationale',
    'Sénat',
    'Parti politique',
    'Mandats locaux',
    'Collectivités locales',
    'Société civile',
    'Vie professionnelle',
    'Administrations et associations',
    'Formation académique',
];

const BIOGRAPHY_CATEGORY_ORDER_MAP = new Map(
    BIOGRAPHY_CATEGORY_ORDER.map((label, idx) => [normalise(label), idx])
);

// Formatters for biography periods (year-only display per requirement)
const biographyYearFormatter = new Intl.DateTimeFormat('fr-FR', { year: 'numeric' });
const capitalizeFirst = (s) => {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
};

const normalizeBiographyDetails = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value
            .map((entry) => {
                if (entry == null) return '';
                if (typeof entry === 'object') {
                    if (typeof entry.text === 'string') return entry.text;
                    return Object.values(entry)
                        .map((v) => (v == null ? '' : String(v)))
                        .join(' ');
                }
                return String(entry);
            })
            .map((entry) => entry.trim())
            .filter(Boolean);
    }
    if (typeof value === 'object') {
        if (Array.isArray(value.items)) {
            return normalizeBiographyDetails(value.items);
        }
        return normalizeBiographyDetails(Object.values(value));
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed);
                return normalizeBiographyDetails(parsed);
            } catch (error) {
                // Silently ignore JSON parse errors and fallback to plain text splitting
            }
        }
        const sanitized = trimmed.replace(/[•●○◦·]/g, '\n');
        return sanitized
            .split(/\r?\n+/)
            .map((line) => line.replace(/^[\s\-–—•●○◦·]+/, '').trim())
            .filter(Boolean);
    }
    return [];
};

const normalizeBiographyEntries = (rows) => {
    const toDate = (value) => {
        if (!value) return null;
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }
        const raw = String(value).trim();
        // Accept YYYY-MM-DD | YYYY-MM | YYYY
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const d = new Date(raw);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        if (/^\d{4}-\d{2}$/.test(raw)) {
            const d = new Date(`${raw}-01`);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        if (/^\d{4}$/.test(raw)) {
            const d = new Date(`${raw}-01-01`);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        // Accept ranges like "2024-2025" or "2024 – 2025" → take first year
        if (/^\d{4}\s*[\-–]\s*\d{4}$/.test(raw)) {
            const first = raw.split(/[\-–]/)[0].trim();
            const d = new Date(`${first}-01-01`);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        // Accept month names in French like "septembre 2024" or "15 septembre 2024"
        const lower = raw.toLowerCase().replace(/\s+/g, ' ').trim();
        const monthMap = new Map([
            ['janvier', 0], ['janv.', 0], ['janv', 0],
            ['février', 1], ['fevrier', 1], ['févr.', 1], ['fevr.', 1], ['fevr', 1],
            ['mars', 2],
            ['avril', 3], ['avr.', 3], ['avr', 3],
            ['mai', 4],
            ['juin', 5],
            ['juillet', 6],
            ['août', 7], ['aout', 7],
            ['septembre', 8], ['sept.', 8], ['sept', 8],
            ['octobre', 9], ['oct.', 9], ['oct', 9],
            ['novembre', 10], ['nov.', 10], ['nov', 10],
            ['décembre', 11], ['decembre', 11], ['déc.', 11], ['dec.', 11], ['dec', 11],
        ]);
        // Match: [day ]month year OR month year
        // Escape month name tokens for safe inclusion in a dynamic RegExp
        const _escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const monthNames = Array.from(new Set(Array.from(monthMap.keys()).map((k) => _escapeRegex(k))))
            .sort((a, b) => b.length - a.length)
            .join('|');
        // When building a RegExp from a string literal we must double-escape
        // backslashes so sequences like \s and \d arrive intact to the
        // RegExp engine (in a string literal `\s` -> a single backslash+s).
        const reDayMonthYear = new RegExp(`^(?:([0-3]?\\d)\\s+)?(${monthNames})\\s+(\\d{4})$`, 'i');
        const m = lower.match(reDayMonthYear);
        if (m) {
            const monthKey = m[2];
            const monthIdx = monthMap.get(monthKey) ?? monthMap.get(monthKey.replace(/\.$/, ''));
            const year = m[3];
            if (typeof monthIdx === 'number') {
                const mm = String(monthIdx + 1).padStart(2, '0');
                const d = new Date(`${year}-${mm}-01`);
                return Number.isNaN(d.getTime()) ? null : d;
            }
        }
        // Fallback: extract first 4-digit year anywhere in the string
        const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            const y = yearMatch[0];
            const d = new Date(`${y}-01-01`);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? null : d;
    };
    const toText = (v) => (v == null ? '' : String(v).trim());

    return (Array.isArray(rows) ? rows : [])
        .map((row) => {
            // Accept multiple possible fields coming from various views/exports or already-normalized objects
            const startRaw = row.start_date || row.startDate || row.start_text || row.start || row.startYear || row.start_year;
            const endRaw = row.end_date || row.endDate || row.end_text || row.end || row.endYear || row.end_year;
            const startDate = toDate(startRaw);
            const endDate = toDate(endRaw);
        const eventDate = toDate(row.event_date || row.eventDate || row.event_text);
        const eventText = toText(row.event_text || row.eventText);
        // Support both camelCase (bioSection) and snake_case (bio_section) sources
        const category = toText(row.bioSection || row.bio_section || row.category);
        const title = toText(row.title);
        const org = toText(row.organisation || row.organization || row.org);
            const createdAt = row.created_at ? toDate(row.created_at) : (row.createdAt ? toDate(row.createdAt) : null);
            const sortIndex = Number.isFinite(row.sort_index) ? row.sort_index : (Number.isFinite(row.sortIndex) ? row.sortIndex : null);
            // Determine current status with explicit flags first.
            // If neither flag is provided, fall back to "no end date" heuristic.
            const hasIsCurrentFlag = Object.prototype.hasOwnProperty.call(row, 'isCurrent');
            const hasOngoingFlag = Object.prototype.hasOwnProperty.call(row, 'ongoing');
            const isCurrent = hasIsCurrentFlag
                ? Boolean(row.isCurrent)
                : (hasOngoingFlag
                    ? Boolean(row.ongoing)
                    : (endDate == null));
            return {
                id: row.id || null,
                category,
                title,
                org,
                details: Array.isArray(row.details) ? normalizeBiographyDetails(row.details) : [],
                startDate,
                endDate,
                eventDate,
                eventText,
                startText: toText(row.start_text || row.start || row.startText),
                endText: toText(row.end_text || row.end || row.endText),
                isCurrent,
                sortIndex,
                createdAt,
                color: (row.color || row.category_color) ? String((row.color || row.category_color)).trim() : null,
            };
        })
        // Conserver aussi les entrées d'événements ponctuels (event_date / event_text)
        .filter((e) => e.category || e.title || e.org || e.startDate || e.endDate || e.eventText || e.eventDate);
};

const formatBiographyPeriod = (entry) => {
    if (!entry) return '';
    const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());
    const fmtYear = (d) => biographyYearFormatter.format(d);
    const formatOne = (d, text) => {
        const t = (text || '').trim();
        if (isValidDate(d)) return fmtYear(d);
        const ym = t.match(/\b(19|20)\d{2}\b/);
        if (ym) return ym[0];
        if (/^\d{4}$/.test(t)) return t;
        return t ? capitalizeFirst(t) : '';
    };

    // Événements ponctuels: afficher l'année + libellé si possible
    if (entry.eventText) {
        const eventStr = formatOne(entry.eventDate, entry.eventText);
        return eventStr;
    }

    const startStr = formatOne(entry.startDate, entry.startText);
    const endStr = formatOne(entry.endDate, entry.endText);

    if (startStr && endStr) return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
    if (entry.isCurrent && startStr) return `Depuis ${startStr}`;
    return startStr || endStr || '';
};

const createBiographyEntryElement = (entry) => {
    const item = document.createElement('li');
    item.className = 'biography-entry';
    item.setAttribute('role', 'listitem');

    if (entry.color) {
        item.style.setProperty('--biography-entry-color', entry.color);
    }

    const period = formatBiographyPeriod(entry);
    const titleText = entry.title || '';
    const orgText = entry.org || '';

    const line = document.createElement('p');
    line.className = 'biography-entry__line';

    if (period) {
        const periodEl = document.createElement('span');
        periodEl.className = 'biography-entry__period';
        const needsColon = Boolean(titleText || orgText || (entry.details && entry.details.length));
        periodEl.textContent = needsColon ? `${period} :` : period;
        line.appendChild(periodEl);
    }

    if (titleText) {
        const titleEl = document.createElement('span');
        titleEl.className = 'biography-entry__title';
        titleEl.textContent = titleText;
        line.appendChild(titleEl);
    }

    if (orgText) {
        if (titleText) {
            const sep = document.createElement('span');
            sep.className = 'biography-entry__sep';
            sep.textContent = ' — ';
            line.appendChild(sep);
        }
        const orgEl = document.createElement('span');
        orgEl.className = 'biography-entry__org';
        orgEl.textContent = orgText;
        line.appendChild(orgEl);
    }

    if (!line.childElementCount) {
        line.textContent = titleText || orgText || 'Parcours';
    }

    item.appendChild(line);
    return item;
};

const populateBiographyModule = (entries, accentColor = null) => {
    if (!modalBiographySection || !modalBiographyRoot) return false;

    const normalized = normalizeBiographyEntries(entries);

    if (!normalized.length) {
        console.log('[onepage] Module biographie: aucune entrée normalisée, section masquée');
        modalBiographyRoot.innerHTML = '';
        modalBiographySection.hidden = true;
        modalBiographySection.style.removeProperty('--biography-accent');
        return false;
    }

    if (accentColor) {
        modalBiographySection.style.setProperty('--biography-accent', accentColor);
    } else {
        modalBiographySection.style.removeProperty('--biography-accent');
    }

    // 1) Group entries by section label (bio_section)
    const groups = new Map();
    normalized.forEach((entry) => {
        const category = entry.category || 'Autres';
        const key = normalise(category);
        if (!groups.has(key)) {
            groups.set(key, {
                label: category,
                items: [],
                order: BIOGRAPHY_CATEGORY_ORDER_MAP.get(key) ?? Number.POSITIVE_INFINITY
            });
        }
        groups.get(key).items.push(entry);
    });

    // Trie des sections : ordre prédéfini puis label alpha
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.label.localeCompare(b.label, 'fr');
    });

    const frag = document.createDocumentFragment();

    sortedGroups.forEach(({ label, items }) => {
        const group = document.createElement('article');
        group.className = 'biography-group';
        group.setAttribute('role', 'listitem');

        const heading = document.createElement('h5');
        heading.className = 'biography-group__title';
        heading.textContent = label ? `${label} :` : '';
        group.appendChild(heading);

        const list = document.createElement('ul');
        list.className = 'biography-list';
        // 2) Sort items within a section by sort_index ASC, then start_date DESC, then title
        items.sort((a, b) => {
            const sidx = (a.sortIndex ?? 9999) - (b.sortIndex ?? 9999);
            if (sidx !== 0) return sidx;
            const aTime = (a.startDate && a.startDate.getTime()) || Number.NEGATIVE_INFINITY;
            const bTime = (b.startDate && b.startDate.getTime()) || Number.NEGATIVE_INFINITY;
            if (aTime !== bTime) return bTime - aTime; // DESC
            return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
        });

        // 3) Render items as-is (no annotation merge; strict to schema)
        items.forEach((entry) => {
            const element = createBiographyEntryElement(entry);
            list.appendChild(element);
        });

        group.appendChild(list);
        frag.appendChild(group);
    });

    modalBiographyRoot.innerHTML = '';
    modalBiographyRoot.appendChild(frag);
    modalBiographySection.hidden = false;
    return true;
};

// ========== SUPPRIMÉ: fetchBiographyForPersonFallback() et ensureSupabaseClient() ==========
// Les biographies sont incluses dans les fichiers statiques data/ministers/

const createCardContainer = (minister) => {
    const card = document.createElement("article");
    card.className = "minister-card";
    card.setAttribute("role", "listitem");
    card.dataset.role = minister.role ?? "";
    // expose normalized party on the card so CSS can style it (and so tests/selectors can read it)
    const rawParty = minister.party == null ? "" : String(minister.party).trim();
    const partyLabelForCard = mapPartyLabel(rawParty) || (rawParty ? "" : "Sans étiquette");
    if (partyLabelForCard) card.dataset.party = partyLabelForCard;
    if (minister.id != null) card.dataset.personId = String(minister.id);

    const roleKey = minister.role || "";
    const isHead = HEAD_ROLES.has(roleKey);
    if (isHead) {
        card.classList.add("is-leader");
        const aria = roleKey === 'president' ? 'Président de la République' : 'Premier ministre';
        card.setAttribute("aria-label", aria);
    }

    // Resolve accent color:
    // - Prefer party color when a known party is present
    // - Fallback to ministry-provided accentColor
    // - Otherwise leave default theme accent
    const partyLabel = mapPartyLabel(rawParty) || "";
    const hasKnownPartyColor = Boolean(partyLabel && PARTY_COLORS[partyLabel]);
    // Only set inline accent when:
    // - party has a known color mapping, OR
    // - there is NO party at all and a ministry accentColor exists
    // Do NOT override for "Sans étiquette" so CSS mapping stays grey.
    const resolvedAccent = hasKnownPartyColor
        ? PARTY_COLORS[partyLabel]
        : (!partyLabel ? (minister.accentColor || null) : null);
    if (partyLabel || !rawParty) {
        // Ensure accent styling is activated whenever a party is known
        // or explicitly marked as "Sans étiquette"
        card.classList.add("has-accent");
    }
    if (resolvedAccent) {
        card.style.setProperty("--accent-color", resolvedAccent);
        card.dataset.accentColor = resolvedAccent;
    }

    return { card, roleKey };
};

const buildLeftSection = ({ minister, roleKey, ministriesEntries, ministriesBadges, partyBadge, isHead }) => {
    const left = document.createElement("div");
    left.className = "mc-left";

    const header = document.createElement("div");
    header.className = "minister-header";

    // Do not show ministry label for the head cards (leader/president)
    if (!isHead) {
        const portfolio = document.createElement("div");
        portfolio.className = "mc-ministry";
        portfolio.textContent = minister.portfolio ?? "Portefeuille à préciser";
        header.appendChild(portfolio);
    }

    const name = document.createElement("h3");
    name.textContent = minister.name ?? "Nom du ministre";
    header.appendChild(name);

    // Afficher le libellé du rôle depuis persons_ministries (roleLabel)
    // Fallback sur le rôle générique si absent
    const primaryMinistryEntry = (Array.isArray(ministriesEntries) ? ministriesEntries : []).find((e) => e && e.isPrimary && typeof e.roleLabel === 'string' && e.roleLabel.trim());
    const firstRoleLabel = (Array.isArray(ministriesEntries) ? ministriesEntries : []).map(e => (e && typeof e.roleLabel === 'string' ? e.roleLabel.trim() : '')).find(Boolean);
    const roleLabelText = (primaryMinistryEntry?.roleLabel?.trim() || firstRoleLabel || "") || (formatRole(minister.role) || "");
    if (roleLabelText) {
        const roleEl = document.createElement("p");
        roleEl.className = "minister-role";
        roleEl.textContent = roleLabelText;
        header.appendChild(roleEl);
    }

    // Place party badge directly under the role, inside the header
    if (partyBadge) {
        header.appendChild(partyBadge);
    }

    left.appendChild(header);

    if (ministriesBadges.length) {
        const ministriesContainer = document.createElement("div");
        ministriesContainer.className = "mc-ministries";

        ministriesBadges.forEach((entry) => {
            // Skip primary ministries
            if (entry.isPrimary) {
                return;
            }
            const badge = document.createElement("span");
            badge.className = "mc-ministry-badge";
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

    // Meta block kept only if needed in future; no extra meta for now

    if (roleKey === "leader" || roleKey === "president") {
        const bio = document.createElement("p");
        bio.className = "mc-bio";
        bio.textContent = (minister.description || "").trim() || "Biographie prochainement disponible.";
        left.appendChild(bio);
    }

    return left;
};

const buildRightSection = (minister) => {
    const right = document.createElement("div");
    right.className = "mc-right";

    const photo = document.createElement("img");
    photo.className = "minister-photo";
    photo.src = ensureImageSource(minister.photo);
    photo.onerror = () => {
        photo.onerror = null;
        photo.src = "assets/placeholder-minister.svg";
    };
    photo.alt = minister.photoAlt ?? `Portrait de ${minister.name ?? "ministre"}`;
    right.appendChild(photo);

    const actions = document.createElement("div");
    // Use an inline/compact actions container when placed inside the right column
    // so it doesn't inherit the footer-styles used elsewhere for `.minister-actions`.
    actions.className = "minister-actions minister-actions--inline";

    const cta = document.createElement("button");
    cta.type = "button";
    cta.className = "btn btn-primary minister-cta";
    cta.textContent = "Voir le cabinet";
    cta.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openModal(minister);
    });
    actions.appendChild(cta);

    right.appendChild(actions);
    return right;
};

const buildDelegatesSection = (roleKey, delegates) => {
    const items = Array.isArray(delegates) ? delegates : [];
    // Do not render the delegates module for ministers that are themselves delegates
    if (DELEGATE_ROLES.has(roleKey) || !items.length) return null;

    const delegatesContainer = document.createElement("div");
    delegatesContainer.className = "delegates delegates-footer";

    items.forEach((delegate) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "delegate-card";

        const info = document.createElement("div");
        info.className = "delegate-info";

        const dn = document.createElement("p");
        dn.className = "delegate-name";
        // keep the minister's name visible
        dn.textContent = delegate.name || "";
        info.appendChild(dn);

        const dr = document.createElement("p");
        dr.className = "delegate-role";
        // prefer role_label from person_ministries (available as mission) as the displayed role
        dr.textContent = delegate.mission || delegate.portfolio || formatRole(delegate.role) || "";
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

    return delegatesContainer;
};

const buildCard = (minister) => {
    const { card, roleKey } = createCardContainer(minister);
    const isHead = HEAD_ROLES.has(roleKey);

    const ministriesEntries = Array.isArray(minister.ministries) ? minister.ministries : [];
    const normalizedPortfolio = normalise(minister.portfolio || "");
    const seenMinistries = new Set();
    const ministriesBadges = ministriesEntries
        .map((entry) => {
            const label = (entry?.label || "").trim();
            const roleLabel = (entry?.roleLabel || "").trim();
            const displayLabel = label || roleLabel;
            if (!displayLabel) return null;

            // Skip specific badges
            const badgesToSkip = [
                "Ministre de l'Action et des Comptes publics",
                "Ministre des Armées et des Anciens combattants",
                "Ministre de l'Agriculture et de la Souveraineté alimentaire"
            ];

            // Calculate the final text that will be displayed
            let finalText = "";
            if (label && roleLabel) {
                finalText = `${label} • ${roleLabel}`;
            } else if (roleLabel) {
                finalText = roleLabel;
            } else {
                finalText = displayLabel;
            }

            if (badgesToSkip.includes(finalText)) {
                return null;
            }

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

    const partyBadge = createPartyBadge(minister.party == null ? "" : String(minister.party).trim());

    const content = document.createElement("div");
    content.className = "minister-content";
    content.appendChild(buildRightSection(minister));
    content.appendChild(buildLeftSection({ minister, roleKey, ministriesEntries, ministriesBadges, partyBadge, isHead }));

    card.appendChild(content);

    const delegatesSection = buildDelegatesSection(roleKey, minister.delegates);
    if (delegatesSection) {
        card.appendChild(delegatesSection);
    }

    return card;
};

const renderGrid = (items) => {
    setGridBusy(true);
    grid.innerHTML = "";

    if (!items.length) {
        setGridBusy(false);
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;
    
    // Séparer les leaders des autres ministres
    const leaders = [];
    const others = [];
    
    items.forEach((minister) => {
        const roleKey = minister.role || "";
        if (HEAD_ROLES.has(roleKey)) {
            leaders.push(minister);
        } else {
            others.push(minister);
        }
    });
    
    // Créer un conteneur spécial pour les leaders s'ils existent
    if (leaders.length > 0) {
        const leadersContainer = document.createElement("div");
        leadersContainer.className = "leaders-row";
        
        leaders.forEach((leader) => {
            leadersContainer.appendChild(buildCard(leader));
        });
        
        grid.appendChild(leadersContainer);
    }
    
    // Ajouter les autres ministres normalement
    const fragment = document.createDocumentFragment();
    others.forEach((minister) => {
        fragment.appendChild(buildCard(minister));
    });

    grid.appendChild(fragment);
    updateMinistersGridLayout();
    setGridBusy(false);
};

const attachDelegatesToCore = () => {
    if (!Array.isArray(coreMinisters) || !Array.isArray(delegateMinisters)) return;

    const coreById = new Map();
    const delegateById = new Map();

    delegateMinisters.forEach((delegate) => {
        if (delegate && delegate.id != null) {
            delegateById.set(String(delegate.id), delegate);
        }
    });

    coreMinisters.forEach((minister) => {
        if (minister && minister.id != null) {
            coreById.set(String(minister.id), minister);
        }
        const existing = Array.isArray(minister?.delegates) ? minister.delegates : [];
        minister.delegates = existing
            .map((entry) => {
                if (entry && typeof entry === "object") return entry;
                const id = entry != null ? String(entry) : null;
                return id && delegateById.get(id);
            })
            .filter(Boolean);
    });

    const tryAssign = (delegate, target) => {
        if (!target) return false;
        target.delegates = Array.isArray(target.delegates) ? target.delegates : [];
        const delegateId = delegate?.id != null ? String(delegate.id) : null;
        if (
            delegateId &&
            target.delegates.some((entry) => String(entry?.id ?? "") === delegateId)
        ) {
            return true;
        }
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
        // Main grid: show only core ministers (exclude ministres délégués)
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
            const ministryNames = Array.isArray(minister.ministries)
                ? minister.ministries.map((m) => m && (m.label || "")).filter(Boolean).join(" ")
                : "";
            const haystack = normalise(`${minister.name ?? ""} ${minister.portfolio ?? ""} ${ministryNames}`);
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
// (Migration Static : désactivé - les collaborateurs ne sont plus chargés dynamiquement)
// ===============================
const fetchCollaboratorsForMinister = async (ministerId) => {
    // Les collaborateurs sont maintenant dans minister.collaborators (array de noms)
    // Pour l'affichage détaillé, on retourne un tableau vide
    console.warn('[onepage] fetchCollaboratorsForMinister est obsolète - les collaborateurs sont dans data/ministers/');
    return [];
};

// Legacy template removed - now using harmonized cabinet-node system for all collaborators display

// Cabinet grade helpers and caches
let collaboratorGradesLookup = null;
let collaboratorGradesPromise = null;

const toAlphaKey = (value) => {
    if (value == null) return null;
    try {
        return String(value)
            .normalize("NFD")
            .replace(/\p{Diacritic}+/gu, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "")
            .trim();
    } catch {
        const s = String(value).toLowerCase();
        return s.replace(/[^a-z0-9]+/g, "").trim();
    }
};

const CABINET_GRADE_ALIASES = [
    ["dircab", "direcab"],
    ["directeurdecabinet", "direcab"],
    ["directricedecabinet", "direcab"],
    ["directeurducabinet", "direcab"],
    ["directriceducabinet", "direcab"],
    ["chefcab", "chefcab"],
    ["chefdecabinet", "chefcab"],
    ["cheffedecabinet", "chefcab"],
    ["chefducabinet", "chefcab"],
    ["cheffeducabinet", "chefcab"],
    ["direcabadj", "direcab-adj"],
    ["directeuradjointdecabinet", "direcab-adj"],
    ["directeurdecabinetadjoint", "direcab-adj"],
    ["directeurducabinetadjoint", "direcab-adj"],
    ["directeurdecabinetadjointe", "direcab-adj"],
    ["directeurducabinetadjointe", "direcab-adj"],
    ["diradj", "direcab-adj"],
    ["chefcabadj", "chefcabadj"],
    ["adjointaucheffedecabinet", "chefcabadj"],
    ["chefadj", "chefcabadj"],
    ["chefdecabinetadjoint", "chefcabadj"],
    ["chefducabinetadjoint", "chefcabadj"],
    ["cheffedecabinetadjoint", "chefcabadj"],
    ["cheffeducabinetadjoint", "chefcabadj"],
    ["directricedecabinetadjointe", "direcab-adj"],
    ["directriceducabinetadjointe", "direcab-adj"],
    ["directricedecabinetadjoint", "direcab-adj"],
    ["directriceducabinetadjoint", "direcab-adj"],
    ["cheffedecabinetadjointe", "chefcabadj"],
    ["cheffeducabinetadjointe", "chefcabadj"],
    ["chefpole", "chefpole"],
    ["chefdepole", "chefpole"],
    ["chefpoleadjoint", "chefpole"],
    ["chefpoleadjointe", "chefpole"],
    ["conseiller", "conseiller"],
    ["conseillere", "conseiller"],
    ["conseillerspecial", "conseiller"],
    ["conseillerspeciale", "conseiller"],
    ["conseillertechnique", "conseiller"],
    ["conseilleretechnique", "conseiller"],
    ["conseillerprincipal", "conseiller"],
    ["conseillereprincipale", "conseiller"],
    ["conseillertechniqueprincipal", "conseiller"],
    ["conseilleretechniqueprincipale", "conseiller"],
];

const FALLBACK_COLLAB_GRADES = [
    { key: "direcab", code: "DIRECAB", label: "Directeur·rice de cabinet", rank: 1 },
    { key: "direcab-adj", code: "DIRECAB-ADJ", label: "Adjoint·e au directeur de cabinet", rank: 2 },
    { key: "chefcab", code: "CHEFCAB", label: "Chef·fe de cabinet", rank: 3 },
    { key: "chefcabadj", code: "CHEFCAB-ADJ", label: "Adjoint·e au·à la chef·fe de cabinet", rank: 4 },
    { key: "chefpole", code: "CHEFPOLE", label: "Chef·fe de pôle", rank: 5 },
    { key: "conseiller", code: "CONSEILLER", label: "Conseiller·ère", rank: 10 },
];

const canonicaliseCabinetGrade = (grade, gradeLookup) => {
    const key = toAlphaKey(grade);
    if (!key) return null;
    const alias = gradeLookup?.alias;
    if (alias && alias.has(key)) return alias.get(key);
    return key;
};

const createGradeLookup = (grades) => {
    const byKey = new Map();
    const alias = new Map(CABINET_GRADE_ALIASES);

    const register = (key, meta, sources = []) => {
        if (!key) return;
        const safeMeta = {
            key,
            code: meta?.code ?? key,
            label: meta?.label ?? key,
            rank: typeof meta?.rank === "number" ? meta.rank : Number.POSITIVE_INFINITY
        };
        byKey.set(key, safeMeta);
        alias.set(key, key);
        sources.forEach((source) => {
            const aliasKey = toAlphaKey(source);
            if (aliasKey) {
                alias.set(aliasKey, key);
            }
        });
    };

    FALLBACK_COLLAB_GRADES.forEach((fallbackGrade) => {
        register(fallbackGrade.key, fallbackGrade, [fallbackGrade.code, fallbackGrade.label]);
    });

    (grades || []).forEach((grade) => {
        if (!grade) return;
        const sources = [grade.code, grade.label];
        const preferredKey = sources
            .map((value) => {
                const key = toAlphaKey(value);
                if (key && byKey.has(key)) {
                    return key;
                }
                return null;
            })
            .find(Boolean);

        const key = preferredKey || toAlphaKey(grade.code) || toAlphaKey(grade.label);
        if (!key) return;

        const existing = byKey.get(key);
        register(key, {
            key,
            code: grade.code || existing?.code || key,
            label: grade.label || existing?.label || grade.code || key,
            rank:
                typeof grade.rank === "number"
                    ? grade.rank
                    : typeof existing?.rank === "number"
                    ? existing.rank
                    : Number.POSITIVE_INFINITY
        }, sources);
    });

    const ordered = Array.from(byKey.values()).sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return (a.label || "").localeCompare(b.label || "");
    });

    return { byKey, alias, ordered };
};

/**
 * Retourne un lookup de grades de collaborateurs statique
 * (migration Supabase → Static : plus de requête dynamique)
 */
const getCollaboratorGradeLookup = async () => {
    if (collaboratorGradesLookup) {
        return collaboratorGradesLookup;
    }

    // Grades statiques basés sur la structure habituelle des cabinets ministériels
    const staticGrades = [
        { code: "dircab", label: "Directeur de cabinet", rank: 1 },
        { code: "diradj", label: "Directeur adjoint de cabinet", rank: 2 },
        { code: "chefcab", label: "Chef de cabinet", rank: 3 },
        { code: "chefadj", label: "Chef de cabinet adjoint", rank: 4 },
        { code: "chefpole", label: "Chef de pôle", rank: 5 },
        { code: "conseiller", label: "Conseiller", rank: 6 }
    ];

    collaboratorGradesLookup = createGradeLookup(staticGrades);
    return collaboratorGradesLookup;
};

const DISPLAY_JOB_TITLE_ONLY_GRADES = new Set(["direcab", "direcab-adj", "chefcab", "chefcabadj"]);

const resolveGradeMeta = (gradeLookup, grade) => {
    const key = canonicaliseCabinetGrade(grade, gradeLookup);
    if (!key) {
        return {
            key: null,
            code: grade || null,
            label: grade || null,
            rank: Number.POSITIVE_INFINITY
        };
    }

    const meta = gradeLookup?.byKey?.get(key);
    if (meta) return meta;

    return {
        key,
        code: grade || key,
        label: grade || key,
        rank: Number.POSITIVE_INFINITY
    };
};

const toCabinetNode = (person, gradeLookup) => {
    const gradeMeta = resolveGradeMeta(gradeLookup, person?.collab_grade);

    return {
        id: person?.id != null ? String(person.id) : null,
        superiorId: person?.superior_id != null ? String(person.superior_id) : null,
        name: person?.full_name?.trim() || "Collaborateur·rice",
        cabinetRole: person?.cabinet_role?.trim() || null,
        jobTitle: person?.job_title?.trim() || null,
        poleName: person?.pole_name?.trim() || null,
        gradeLabel: gradeMeta?.label || person?.collab_grade?.trim() || null,
        gradeKey: gradeMeta?.key || null,
        gradeRank: typeof gradeMeta?.rank === "number" ? gradeMeta.rank : Number.POSITIVE_INFINITY,
        email: person?.email?.trim() || null,
        order: typeof person?.cabinet_order === "number" ? person.cabinet_order : null,
        photo: person?.photo_url || null
    };
};

const compareCabinetMembers = (a, b) => {
    const rankDiff = (a.gradeRank ?? Number.POSITIVE_INFINITY) - (b.gradeRank ?? Number.POSITIVE_INFINITY);
    if (rankDiff !== 0) return rankDiff;

    const orderA = a.order ?? Number.POSITIVE_INFINITY;
    const orderB = b.order ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;

    return (a.name || "").localeCompare(b.name || "");
};

const normaliseCabinetMembers = (collaborators, gradeLookup) => {
    if (!Array.isArray(collaborators)) return [];
    return collaborators
        .map((person) => toCabinetNode(person, gradeLookup))
        .filter((node) => node?.id)
        .sort(compareCabinetMembers);
};
const createCabinetNodeCard = (member) => {
    const card = document.createElement("article");
    card.className = "cabinet-node";
    if (member?.id != null) {
        // expose person id on the DOM node so other UI pieces can link to it
        card.dataset.personId = String(member.id);
    }
    if (member?.superiorId != null) {
        card.dataset.superiorId = String(member.superiorId);
    }
    if (member?.gradeKey) {
        card.dataset.grade = member.gradeKey;
    }

    const avatar = document.createElement("div");
    avatar.className = "cabinet-node-avatar";
    const avatarImg = document.createElement("img");
    const originalPhoto = member?.photo;
    avatarImg.alt = member?.name ? `Portrait de ${member.name}` : "Portrait";

    // Attach listeners BEFORE assigning src to avoid missing quick load/error events (cache)
    avatarImg.addEventListener('error', () => {
        avatar.classList.add('no-img');
        avatarImg.style.display = 'none';
    }, { once: true });
    avatarImg.addEventListener('load', () => {
        avatar.classList.remove('no-img');
        avatarImg.style.display = '';
    }, { once: true });

    // If there is no photo provided, mark parent with .no-img so the CSS
    // background logo is visible and the <img> can be hidden. Still set src
    // to the resolved fallback so accessibility/semantics remain for non-JS users.
    if (!originalPhoto) {
        avatar.classList.add('no-img');
    }

    avatarImg.src = ensureImageSource(originalPhoto);

    avatar.appendChild(avatarImg);
    card.appendChild(avatar);

    const info = document.createElement("div");
    info.className = "cabinet-node-info";

    // grade label intentionally omitted from cabinet node UI per design request

    const name = document.createElement("strong");
    name.className = "cabinet-node-name";
    name.textContent = member?.name || "Collaborateur·rice";
    info.appendChild(name);

    const normalizedRole = member?.cabinetRole?.trim() || null;
    const normalizedJob = member?.jobTitle?.trim() || null;
    const normalizedGrade = member?.gradeLabel?.trim() || null;

    // Special handling for pole heads (chefpole): show both cabinet_role and job_title
    if (member?.gradeKey === "chefpole") {
        if (normalizedRole) {
            const roleLine = document.createElement("p");
            roleLine.className = "cabinet-node-role";
            roleLine.textContent = normalizedRole;
            info.appendChild(roleLine);
        }
        if (normalizedJob && normalizedJob !== normalizedRole) {
            const jobLine = document.createElement("p");
            jobLine.className = "cabinet-node-role cabinet-node-role--secondary";
            jobLine.textContent = normalizedJob;
            info.appendChild(jobLine);
        }
    } else {
        // Standard behavior for other grades: render a single info line
        const preferJobOnly = DISPLAY_JOB_TITLE_ONLY_GRADES.has(member?.gradeKey);
        const infoLine = preferJobOnly
            ? (normalizedJob || normalizedRole || normalizedGrade)
            : (normalizedRole || normalizedJob || normalizedGrade);
        if (infoLine) {
            const line = document.createElement("p");
            line.className = "cabinet-node-role";
            line.textContent = infoLine;
            info.appendChild(line);
        }
    }

    if (member?.email) {
        const email = document.createElement("a");
        email.href = `mailto:${member.email}`;
        email.textContent = member.email;
        email.className = "cabinet-node-email";
        email.rel = "noopener";
        info.appendChild(email);
    }

    card.appendChild(info);
    return card;
};

const buildCabinetTree = (members) => {
    const map = new Map();
    members.forEach((member) => {
        map.set(member.id, { ...member, children: [] });
    });

    const roots = [];

    map.forEach((node) => {
        const parentId = node.superiorId;
        if (parentId && map.has(parentId)) {
            map.get(parentId).children.push(node);
        } else {
            roots.push(node);
        }
    });

    const sortBranch = (list) => {
        list.sort(compareCabinetMembers);
        list.forEach((child) => {
            if (Array.isArray(child.children) && child.children.length) {
                sortBranch(child.children);
            }
        });
    };

    sortBranch(roots);
    return roots;
};

const groupCabinetByDepth = (roots) => {
    const levels = [];
    const queue = [];

    roots.forEach((root) => {
        queue.push({ node: root, depth: 0 });
    });

    while (queue.length) {
        const { node, depth } = queue.shift();
        if (!levels[depth]) {
            levels[depth] = [];
        }
        levels[depth].push(node);
        node.children.forEach((child) => queue.push({ node: child, depth: depth + 1 }));
    }

    return levels;
};

const createCabinetTreeHero = (minister, totalMembers) => {
    const hero = document.createElement("div");
    hero.className = "cabinet-tree-hero";

    const portrait = document.createElement("img");
    portrait.className = "cabinet-tree-hero-avatar";
    portrait.src = ensureImageSource(minister?.photo);
    portrait.onerror = () => {
        portrait.onerror = null;
        portrait.src = "assets/placeholder-minister.svg";
    };
    portrait.onerror = () => {
        portrait.onerror = null;
        portrait.src = "assets/placeholder-minister.svg";
    };
    portrait.alt = minister?.name ? `Portrait de ${minister.name}` : "Portrait du ministre";

    const info = document.createElement("div");
    info.className = "cabinet-tree-hero-info";

    const title = document.createElement("strong");
    title.className = "cabinet-tree-hero-name";
    title.textContent = minister?.name || "Ministre";

    const subtitle = document.createElement("p");
    subtitle.className = "cabinet-tree-hero-role";
    subtitle.textContent = minister?.mission || minister?.portfolio || formatRole(minister?.role) || "Cabinet ministériel";

    const count = document.createElement("span");
    count.className = "cabinet-tree-hero-count";
    count.textContent = totalMembers
        ? `${totalMembers} membre${totalMembers > 1 ? "s" : ""}`
        : "Aucun collaborateur renseigné";

    info.appendChild(title);
    info.appendChild(subtitle);
    info.appendChild(count);

    hero.appendChild(portrait);
    hero.appendChild(info);

    return hero;
};

const renderCabinetSection = (minister, collaborators, gradeLookup) => {
    const lookup = gradeLookup || collaboratorGradesLookup || createGradeLookup(null);
    const members = normaliseCabinetMembers(collaborators, lookup);
    const section = document.createElement("section");
    section.className = "modal-collaborators is-hidden";
    section.setAttribute("role", "region");
    section.setAttribute("aria-label", "Cabinet du ministre");
    section.setAttribute("aria-live", "polite");
    if (minister && minister.accentColor) {
        section.style.setProperty('--minister-accent', String(minister.accentColor));
    }

    const panel = document.createElement("div");
    panel.className = "cabinet-panel";
    section.appendChild(panel);

    const header = document.createElement("header");
    header.className = "cabinet-panel-header";

    const title = document.createElement("h2");
    title.className = "cabinet-panel-title";
    title.textContent = "Le cabinet";
    header.appendChild(title);

    const context = document.createElement("p");
    context.className = "cabinet-panel-context";
    header.appendChild(context);

    panel.appendChild(header);

    if (!members.length) {
        const empty = document.createElement("p");
        empty.className = "cabinet-empty";
        empty.textContent = "Les collaborateurs de ce cabinet seront bientôt disponibles.";
        panel.appendChild(empty);
        return section;
    }

    // Removed cabinet tree hero for a more minimal header

    const treeWrapper = document.createElement("div");
    treeWrapper.className = "cabinet-tree";

    const roots = buildCabinetTree(members);
    const levels = groupCabinetByDepth(roots);

    levels.forEach((levelMembers, index) => {
        const level = document.createElement("section");
        level.className = "cabinet-tree-level";
        level.dataset.depth = String(index);

        levelMembers.forEach((member) => {
            level.appendChild(createCabinetNodeCard(member));
        });

        treeWrapper.appendChild(level);

        if (index < levels.length - 1) {
            const connector = document.createElement("div");
            connector.className = "cabinet-tree-connector";
            connector.setAttribute("aria-hidden", "true");
            treeWrapper.appendChild(connector);
        }
    });

    panel.appendChild(treeWrapper);
    return section;
};

const EXECUTIVE_DIRECTION_KEYS = new Set(["direcab", "direcab-adj", "chefcab", "chefcabadj", "conseiller"]);
const EXECUTIVE_DIRECTION_LEADERS = new Set(["direcab", "direcab-adj", "chefcab", "chefcabadj"]);
const EXECUTIVE_POLE_KEYS = new Set(["chefpole"]);
const EXECUTIVE_POLE_ACCENTS = [
    "executive-pole--accent-blue",
    "executive-pole--accent-rose",
    "executive-pole--accent-emerald",
    "executive-pole--accent-amber",
    "executive-pole--accent-violet",
    "executive-pole--accent-cyan"
];
const EXECUTIVE_PM_SUMMARY =
    "Les équipes stratégiques de Matignon sont présentées par directions et par pôles.";

const isExecutiveLeader = (minister) => {
    if (!minister) return false;
    if ((minister.role || "").toLowerCase() === "leader") return true;
    const portfolio = normalise(
        `${minister.portfolio ?? ""} ${minister.mission ?? ""} ${(minister.ministries || [])
            .map((entry) => entry?.label ?? "")
            .join(" ")}`
    );
    return portfolio.includes("premier ministre") || portfolio.includes("matignon");
};

// Détection du Président de la République
const isPresident = (minister) => {
    if (!minister) return false;
    return (
        minister.id === PRESIDENT_ID ||
        (minister.role || "").toLowerCase() === "president" ||
        normalise(minister.full_name || minister.name || "").includes("president de la republique")
    );
};

const createExecutiveCard = (member, options = {}) => {
    const card = document.createElement("article");
    card.className = "cabinet-node";  // Use same base class as cabinet nodes for consistency
    const { head = false, compact = false, context = null } = options;
    if (head) {
        card.classList.add("cabinet-node--head");
    }
    if (compact) {
        card.classList.add("cabinet-node--compact");
    }
    if (member?.id != null) {
        card.dataset.personId = String(member.id);
    }
    if (member?.gradeKey) {
        card.dataset.grade = member.gradeKey;
    }

    const avatar = document.createElement("div");
    avatar.className = "cabinet-node-avatar";  // Use same avatar class as cabinet nodes
    const img = document.createElement("img");
    const originalPhoto2 = member?.photo;
    img.alt = member?.name ? `Portrait de ${member.name}` : "Portrait";

    img.addEventListener('error', () => {
        avatar.classList.add('no-img');
        img.style.display = 'none';
    }, { once: true });
    img.addEventListener('load', () => {
        avatar.classList.remove('no-img');
        img.style.display = '';
    }, { once: true });

    if (!originalPhoto2) {
        avatar.classList.add('no-img');
    }

    img.src = ensureImageSource(originalPhoto2);

    avatar.appendChild(img);
    card.appendChild(avatar);

    const info = document.createElement("div");
    info.className = "cabinet-node-info";  // Use same info class as cabinet nodes

    // Grade label intentionally omitted for consistency with cabinet nodes

    const name = document.createElement("strong");
    name.className = "cabinet-node-name";  // Use same name class as cabinet nodes
    name.textContent = member?.name || "Collaborateur·rice";
    info.appendChild(name);

    const normalizedRole = member?.cabinetRole?.trim() || null;
    const normalizedJob = member?.jobTitle?.trim() || null;
    const normalizedGrade = member?.gradeLabel?.trim() || null;

    // Harmonize with cabinet node rendering: single role line with preference order
    const preferJobOnly = DISPLAY_JOB_TITLE_ONLY_GRADES.has(member?.gradeKey);
    const infoLine = preferJobOnly
        ? (normalizedJob || normalizedRole || normalizedGrade)
        : (normalizedRole || normalizedJob || normalizedGrade);
    
    if (infoLine) {
        const role = document.createElement("p");
        role.className = "cabinet-node-role";  // Use same role class as cabinet nodes
        role.textContent = infoLine;
        info.appendChild(role);
    }

    if (context) {
        const contextLine = document.createElement("p");
        contextLine.className = "cabinet-node-context";
        contextLine.textContent = context;
        info.appendChild(contextLine);
    }

    if (member?.email) {
        const contact = document.createElement("a");
        contact.className = "cabinet-node-email";  // Use same email class as cabinet nodes
        contact.href = `mailto:${member.email}`;
        contact.textContent = member.email;
        contact.rel = "noopener";
        info.appendChild(contact);
    }

    card.appendChild(info);
    return card;
};

// =====================================
// FONCTIONS POUR PÔLES ET COLLABORATEURS DU PREMIER MINISTRE
// =====================================

// ID du Premier ministre (racine de l'arbre)
const LEADER_ID = "1c71e08c-eabe-490c-82b2-262ae5df270a";

// ID du Président de la République (racine de l'arbre pour le cabinet présidentiel)
const PRESIDENT_ID = "48f9e0ff-ae25-4cf8-8d61-f2c10497a5a9";

// Priorité d'affichage des grades pour le PM
const PM_GRADE_ORDER = {
  direcab: 1,
  "direcab-adj": 2,
  chefcab: 3,
  chefadj: 4,
  diradj: 4,
  chefpole: 5,
  conseiller: 6
};

function getPMGradeLabel(grade, role, cabinetRole) {
  if (cabinetRole) return cabinetRole;
  if (!grade) return role || "";

  const map = {
    direcab: "Directeur de cabinet",
    "direcab-adj": "Directeur adjoint de cabinet",
    chefcab: "Chef de cabinet",
    chefadj: "Chef adjoint de cabinet",
    diradj: "Directeur adjoint",
    chefpole: "Chef de pôle",
    conseiller: "Conseiller"
  };

  return map[grade] || grade;
}

function generatePoleTitle(leader) {
  if (!leader) return "Pôle";
  
  const jobTitle = leader.job_title || "";
  const name = leader.full_name || "";
  
  // Mapping des titres de pôles courants je pense que c'est une mauvaise idée de le faire comme ça
  const poleTitles = {
    "communication": "Communication & Relations publiques",
    "presse": "Presse & Médias",
    "affaires": "Affaires générales",
    "juridique": "Juridique & Conseil",
    "economie": "Économie & Finances",
    "social": "Social & Solidarités",
    "securite": "Sécurité & Défense",
    "international": "International & Europe",
    "territorial": "Territorial & Collectivités",
    "environnement": "Environnement & Transition",
    "numerique": "Numérique & Innovation",
    "culture": "Culture & Éducation",
    "sante": "Santé & Bien-être",
    "transport": "Transport & Infrastructures",
    "energie": "Énergie & Industrie"
  };
  
  // Recherche par mots-clés dans le job_title
  const lowerJobTitle = jobTitle.toLowerCase();
  for (const [keyword, title] of Object.entries(poleTitles)) {
    if (lowerJobTitle.includes(keyword)) {
      return title;
    }
  }
  
  // Si pas de correspondance, utiliser le job_title ou un titre générique
  if (jobTitle) {
    return jobTitle;
  }
  
  return `Pôle dirigé par ${name.split(' ')[0]}`;
}

function buildPMStructures(rows) {
  const topCabinet = [];
  const polesByLeader = new Map(); // key = id du chef de pôle

  // 1) Cabinet haut + chefs de pôle (basé sur collab_grade)
  rows.forEach(person => {
    const grade = person.collab_grade;
    if (["direcab", "direcab-adj", "chefcab", "chefadj", "diradj"].includes(grade)) {
      topCabinet.push(person);
    }
    if (grade === "chefpole") {
      polesByLeader.set(person.id, { leader: person, members: [] });
    }
  });

  // 2) Membres rattachés aux chefs de pôle via superior_id
  rows.forEach(person => {
    if (!person.superior_id) return;
    const pole = polesByLeader.get(person.superior_id);
    if (pole && person.collab_grade !== "chefpole") {
      pole.members.push(person);
    }
  });

  // 3) Conseillers rattachés directement au ministre (ou hors pôles)
  const directAdvisors = rows.filter(person => {
    if (person.collab_grade !== "conseiller") return false;
    if (!person.superior_id) return true;
    return !polesByLeader.has(person.superior_id);
  });

  // 4) Tri du cabinet
  topCabinet.sort((a, b) => {
    const ga = PM_GRADE_ORDER[a.collab_grade] || 99;
    const gb = PM_GRADE_ORDER[b.collab_grade] || 99;
    if (ga !== gb) return ga - gb;
    return (a.cabinet_order || 999) - (b.cabinet_order || 999);
  });

  // 5) Tri des pôles (par cabinet_order du chef de pôle)
  const poles = Array.from(polesByLeader.values()).sort((a, b) => {
    const ao = a.leader?.cabinet_order || 999;
    const bo = b.leader?.cabinet_order || 999;
    return ao - bo;
  });

  console.log('[DEBUG][PM] buildPMStructures',
    'rows:', rows.length,
    'topCabinet:', topCabinet.length,
    'poles:', poles.length,
    'directAdvisors:', directAdvisors.length);

  return { topCabinet, poles, directAdvisors };
}

function Fonctionderendudesleaders(minister, collaborators) {
  // Filtrer uniquement le sous-arbre hiérarchique du Premier ministre
  const allowed = new Set([LEADER_ID]);
  
  function collectChildren(id) {
    for (const person of collaborators) {
      if (person.superior_id === id) {
        if (!allowed.has(person.id)) {
          allowed.add(person.id);
          collectChildren(person.id);
        }
      }
    }
  }

  collectChildren(LEADER_ID);
  const filteredRows = collaborators.filter(person => allowed.has(person.id));
  
  const { topCabinet, poles, directAdvisors } = buildPMStructures(filteredRows);

  const section = document.createElement("section");
  section.className = "modal-collaborators pm-cabinet-wrapper";
  section.setAttribute("role", "region");
  section.setAttribute("aria-label", "Cabinet du Premier ministre");
  section.setAttribute("aria-live", "polite");

  if (minister && minister.accentColor) {
    section.style.setProperty('--minister-accent', String(minister.accentColor));
  }

  // Section Cabinet
  const cabinetSection = document.createElement("section");
  cabinetSection.className = "pm-cabinet-section";
  
  const cabinetTitle = document.createElement("h2");
  cabinetTitle.className = "pm-cabinet-section-title";
  cabinetTitle.textContent = "Cabinet";
  cabinetSection.appendChild(cabinetTitle);

  const cabinetGrid = document.createElement("div");
  cabinetGrid.className = "pm-cabinet-top-grid";
  
  // Intégrer les conseillers rattachés directement au ministre dans le cabinet
  const combined = [...topCabinet, ...directAdvisors];
  
  if (!combined.length) {
    cabinetGrid.innerHTML = '<p class="pm-cabinet-empty">Aucun membre de cabinet de premier niveau.</p>';
  } else {
    cabinetGrid.innerHTML = combined
      .map(person => {
        const photo = person.photo_url || "assets/placeholder-minister.svg";
        const gradeLabel = getPMGradeLabel(person.collab_grade, person.role, person.cabinet_role);

        return `
          <article class="pm-cabinet-card">
            <div class="pm-cabinet-card-avatar">
              <img src="${photo}" alt="Portrait de ${person.full_name}" onerror="this.onerror=null;this.src='assets/placeholder-minister.svg';">
            </div>
            <div class="pm-cabinet-card-main">
              <div class="pm-cabinet-card-name">${person.full_name}</div>
              <div class="pm-cabinet-card-role">${gradeLabel}</div>
              ${person.job_title ? `<div class="pm-cabinet-card-role pm-cabinet-card-role--secondary">${person.job_title}</div>` : ''}
              ${person.description ? `<div class="pm-cabinet-card-desc">${person.description}</div>` : ''}
            </div>
          </article>
        `;
      })
      .join("");
  }
  
  cabinetSection.appendChild(cabinetGrid);
  section.appendChild(cabinetSection);

  // Section Pôles et collaborateurs
  const polesSection = document.createElement("section");
  polesSection.className = "pm-cabinet-section";
  
  const polesTitle = document.createElement("h2");
  polesTitle.className = "pm-cabinet-section-title";
  polesTitle.textContent = "Pôles";
  polesSection.appendChild(polesTitle);

  const polesContainer = document.createElement("div");
  polesContainer.className = "pm-poles-container";
  
  if (!poles.length) {
    polesContainer.innerHTML = '<p class="pm-cabinet-empty">Aucun pôle identifié pour l\'instant.</p>';
  } else {
    // Clear container and build safely
    polesContainer.textContent = "";

    poles.forEach(pole => {
      const article = document.createElement("article");
      article.className = "pm-pole-box";

      // Pole title
      const titleDiv = document.createElement("div");
      titleDiv.className = "pm-pole-title";
      const title = document.createElement("h3");
      title.className = "pm-pole-title-text";
      title.textContent = generatePoleTitle(pole.leader);
      titleDiv.appendChild(title);
      article.appendChild(titleDiv);

      // Pole leader header
      const header = document.createElement("header");
      header.className = "pm-pole-header";

      const leaderAvatar = document.createElement("div");
      leaderAvatar.className = "pm-pole-leader-avatar";
      const leaderImg = document.createElement("img");
      leaderImg.src = safeImgSrc(pole.leader?.photo_url);
      leaderImg.alt = `Portrait de ${pole.leader?.full_name || "Chef de pôle"}`;
      leaderAvatar.appendChild(leaderImg);
      header.appendChild(leaderAvatar);

      const leaderInfo = document.createElement("div");
      leaderInfo.className = "pm-pole-leader-info";

      const leaderName = document.createElement("div");
      leaderName.className = "pm-pole-leader-name";
      leaderName.textContent = pole.leader?.full_name || "Chef de pôle";
      leaderInfo.appendChild(leaderName);

      const leaderJob = document.createElement("div");
      leaderJob.className = "pm-pole-leader-job";
      leaderJob.textContent = getPMGradeLabel(pole.leader?.collab_grade, pole.leader?.role, pole.leader?.cabinet_role);
      leaderInfo.appendChild(leaderJob);

      if (pole.leader?.job_title) {
        const specialty = document.createElement("div");
        specialty.className = "pm-pole-leader-specialty";
        specialty.textContent = pole.leader.job_title;
        leaderInfo.appendChild(specialty);
      }

      header.appendChild(leaderInfo);
      article.appendChild(header);

      // Members list
      const membersList = document.createElement("div");
      membersList.className = "pm-pole-members-list";

      pole.members
        .sort((a, b) => (a.cabinet_order || 999) - (b.cabinet_order || 999))
        .forEach(member => {
          const memberDiv = document.createElement("div");
          memberDiv.className = "pm-pole-member";

          const memberAvatar = document.createElement("div");
          memberAvatar.className = "pm-pole-member-avatar";
          const memberImg = document.createElement("img");
          memberImg.src = safeImgSrc(member.photo_url);
          memberImg.alt = `Portrait de ${member.full_name || "Collaborateur"}`;
          memberImg.onerror = function() {
            this.onerror = null;
            this.src = 'assets/placeholder-minister.svg';
          };
          memberAvatar.appendChild(memberImg);
          memberDiv.appendChild(memberAvatar);

          const memberMain = document.createElement("div");
          memberMain.className = "pm-pole-member-main";

          const memberName = document.createElement("div");
          memberName.className = "pm-pole-member-name";
          memberName.textContent = member.full_name || "Collaborateur";
          memberMain.appendChild(memberName);

          const gradeLabel = getPMGradeLabel(member.collab_grade, member.role, member.cabinet_role);
          const jobTitle = member.job_title || "";
          const memberJob = document.createElement("div");
          memberJob.className = "pm-pole-member-job";
          memberJob.textContent = `${gradeLabel || ''}${jobTitle ? ' — ' + jobTitle : ''}`;
          memberMain.appendChild(memberJob);

          if (member.description) {
            const desc = document.createElement("div");
            desc.className = "pm-pole-member-desc";
            desc.textContent = member.description;
            memberMain.appendChild(desc);
          }

          memberDiv.appendChild(memberMain);
          membersList.appendChild(memberDiv);
        });

      article.appendChild(membersList);
      polesContainer.appendChild(article);
    });
  }
  
  polesSection.appendChild(polesContainer);
  section.appendChild(polesSection);

  return section;
}

// Wrapper used where older code expected `renderPMCabinetSection`.
// The project historically referenced `renderPMCabinetSection` but the
// mais j'ai souhaité l'appeler par ce queje ne comprends plus grand chose the French-named `Fonctionderendudesleaders`.
// Provide a friendly alias that uses the existing implementation and
// falls back to the executive cabinet renderer on unexpected errors.
const renderPMCabinetSection = (minister, collaborators) => {
    try {
        return Fonctionderendudesleaders(minister, collaborators);
    } catch (err) {
        console.warn('[onepage] renderPMCabinetSection fallback to executive renderer:', err);
        try {
            const gradeLookup = collaboratorGradesLookup || createGradeLookup(null);
            return buildExecutiveCabinetSection(minister, Array.isArray(collaborators) ? collaborators : [], gradeLookup, { error: true });
        } catch (e) {
            console.warn('[onepage] renderPMCabinetSection final fallback failed:', e);
            // Return a minimal section to avoid breaking callers
            const sec = document.createElement('section');
            sec.className = 'pm-cabinet-section';
            const p = document.createElement('p');
            p.className = 'pm-cabinet-empty';
            p.textContent = 'Impossible d\'afficher le cabinet pour le moment.';
            sec.appendChild(p);
            return sec;
        }
    }
};

// =====================================
// CABINET DU PRÉSIDENT DE LA RÉPUBLIQUE
// =====================================
// Affichage par pôles (pole_name) avec job_title pour chaque conseiller
// Utilise le même style graphique que le cabinet du Premier ministre
// Version corrigée : les collaborateurs sans pole_name apparaissent dans "Équipe centrale"
const renderPresidentCabinetSection = (minister, collaborators) => {
    const ministerId = minister?.id != null ? String(minister.id) : null;

    // Collaborateurs rattachés au Président
    const filtered = (collaborators || []).filter(
        c => ministerId && String(c.superior_id) === ministerId
    );

    // Séparation :
    // 1) "Équipe centrale" (sans pole_name)
    // 2) Pôles thématiques
    const centralTeam = [];
    const polesMap = new Map();

    for (const person of filtered) {
        const rawPole = (person.pole_name || "").trim();

        if (!rawPole) {
            // Pas de pole_name → équipe centrale
            centralTeam.push(person);
            continue;
        }

        // Sinon → pôle thématique
        const key = normalise(rawPole);
        if (!polesMap.has(key)) {
            polesMap.set(key, { display: rawPole, members: [] });
        }
        polesMap.get(key).members.push(person);
    }

    // Création section principale
    const section = document.createElement("section");
    section.className = "modal-collaborators pm-cabinet-wrapper";
    section.setAttribute("role", "region");
    section.setAttribute("aria-label", "Cabinet du Président de la République");
    section.setAttribute("aria-live", "polite");

    if (minister && minister.accentColor) {
        section.style.setProperty('--minister-accent', String(minister.accentColor));
    }

    // Si aucun collaborateur
    if (!filtered.length) {
        const emptySection = document.createElement("section");
        emptySection.className = "pm-cabinet-section";
        const emptyTitle = document.createElement("h2");
        emptyTitle.className = "pm-cabinet-section-title";
        emptyTitle.textContent = "Cabinet du Président de la République";
        emptySection.appendChild(emptyTitle);
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "pm-cabinet-empty";
        emptyMsg.textContent = "Les collaborateurs du Président seront bientôt disponibles.";
        emptySection.appendChild(emptyMsg);
        section.appendChild(emptySection);
        return section;
    }

    // ---- 1) ÉQUIPE CENTRALE (collaborateurs sans pole_name)
    if (centralTeam.length) {
        const centralSection = document.createElement("section");
        centralSection.className = "pm-cabinet-section";

        const centralTitle = document.createElement("h2");
        centralTitle.className = "pm-cabinet-section-title";
        centralTitle.textContent = "Cabinet";
        centralSection.appendChild(centralTitle);

        const centralGrid = document.createElement("div");
        centralGrid.className = "pm-cabinet-top-grid";

        // Build central team safely
        centralTeam
            .sort((a, b) => (a.cabinet_order || 999) - (b.cabinet_order || 999))
            .forEach(person => {
                const article = document.createElement("article");
                article.className = "pm-cabinet-card";

                const avatar = document.createElement("div");
                avatar.className = "pm-cabinet-card-avatar";
                const img = document.createElement("img");
                img.src = safeImgSrc(person.photo_url);
                img.alt = `Portrait de ${person.full_name || 'Collaborateur'}`;
                img.onerror = function() {
                    this.onerror = null;
                    this.src = 'assets/placeholder-minister.svg';
                };
                avatar.appendChild(img);
                article.appendChild(avatar);

                const main = document.createElement("div");
                main.className = "pm-cabinet-card-main";

                const name = document.createElement("div");
                name.className = "pm-cabinet-card-name";
                name.textContent = person.full_name || "Collaborateur";
                main.appendChild(name);

                const cabinetRole = person.cabinet_role || "";
                const jobTitle = person.job_title || "";
                const roleDisplay = cabinetRole || jobTitle;
                const secondaryRole = (cabinetRole && jobTitle && cabinetRole !== jobTitle) ? jobTitle : "";

                if (roleDisplay) {
                    const role = document.createElement("div");
                    role.className = "pm-cabinet-card-role";
                    role.textContent = roleDisplay;
                    main.appendChild(role);
                }

                if (secondaryRole) {
                    const secondary = document.createElement("div");
                    secondary.className = "pm-cabinet-card-role pm-cabinet-card-role--secondary";
                    secondary.textContent = secondaryRole;
                    main.appendChild(secondary);
                }

                if (person.description) {
                    const desc = document.createElement("div");
                    desc.className = "pm-cabinet-card-desc";
                    desc.textContent = person.description;
                    main.appendChild(desc);
                }

                article.appendChild(main);
                centralGrid.appendChild(article);
            });

        centralSection.appendChild(centralGrid);
        section.appendChild(centralSection);
    }

    // ---- 2) PÔLES THÉMATIQUES
    if (polesMap.size > 0) {
        const polesSection = document.createElement("section");
        polesSection.className = "pm-cabinet-section";

        const polesTitle = document.createElement("h2");
        polesTitle.className = "pm-cabinet-section-title";
        polesTitle.textContent = "Pôles";
        polesSection.appendChild(polesTitle);

        const polesContainer = document.createElement("div");
        polesContainer.className = "pm-poles-container";

        // Build poles safely
        polesContainer.textContent = "";
        [...polesMap.values()].forEach(pole => {
            const article = document.createElement("article");
            article.className = "pm-pole-box";

            const titleDiv = document.createElement("div");
            titleDiv.className = "pm-pole-title";
            const title = document.createElement("h3");
            title.className = "pm-pole-title-text";
            title.textContent = pole.display;
            titleDiv.appendChild(title);
            article.appendChild(titleDiv);

            const membersList = document.createElement("div");
            membersList.className = "pm-pole-members-list";

            if (pole.members && pole.members.length > 0) {
                pole.members
                    .sort((a, b) => (a.cabinet_order || 999) - (b.cabinet_order || 999))
                    .forEach(member => {
                        const memberDiv = document.createElement("div");
                        memberDiv.className = "pm-pole-member";

                        const memberAvatar = document.createElement("div");
                        memberAvatar.className = "pm-pole-member-avatar";
                        const memberImg = document.createElement("img");
                        memberImg.src = safeImgSrc(member.photo_url);
                        memberImg.alt = `Portrait de ${member.full_name || 'Collaborateur'}`;
                        memberImg.onerror = function() {
                            this.onerror = null;
                            this.src = 'assets/placeholder-minister.svg';
                        };
                        memberAvatar.appendChild(memberImg);
                        memberDiv.appendChild(memberAvatar);

                        const memberMain = document.createElement("div");
                        memberMain.className = "pm-pole-member-main";

                        const memberName = document.createElement("div");
                        memberName.className = "pm-pole-member-name";
                        memberName.textContent = member.full_name || "Collaborateur";
                        memberMain.appendChild(memberName);

                        const cabinetRole = member.cabinet_role || "";
                        const jobTitle = member.job_title || "";
                        const roleDisplay = cabinetRole || jobTitle;
                        const secondaryRole = (cabinetRole && jobTitle && cabinetRole !== jobTitle) ? jobTitle : "";

                        if (roleDisplay) {
                            const job = document.createElement("div");
                            job.className = "pm-pole-member-job";
                            job.textContent = roleDisplay;
                            memberMain.appendChild(job);
                        }

                        if (secondaryRole) {
                            const secondary = document.createElement("div");
                            secondary.className = "pm-pole-member-job pm-pole-member-job--secondary";
                            secondary.textContent = secondaryRole;
                            memberMain.appendChild(secondary);
                        }

                        if (member.description) {
                            const desc = document.createElement("div");
                            desc.className = "pm-pole-member-desc";
                            desc.textContent = member.description;
                            memberMain.appendChild(desc);
                        }

                        if (member.email) {
                            const email = document.createElement("a");
                            email.className = "pm-pole-member-email";
                            email.href = `mailto:${member.email}`;
                            email.rel = "noopener";
                            email.textContent = member.email;
                            memberMain.appendChild(email);
                        }

                        memberDiv.appendChild(memberMain);
                        membersList.appendChild(memberDiv);
                    });
            } else {
                const empty = document.createElement("span");
                empty.className = "pm-cabinet-empty";
                empty.textContent = "Aucun collaborateur dans ce pôle.";
                membersList.appendChild(empty);
            }

            article.appendChild(membersList);
            polesContainer.appendChild(article);
        });

        polesSection.appendChild(polesContainer);
        section.appendChild(polesSection);
    }

    return section;
};

const buildExecutiveCabinetSection = (minister, collaborators, gradeLookup, options = {}) => {
    const section = document.createElement("section");
    section.className = "executive-cabinet";
    if (minister && minister.accentColor) {
        section.style.setProperty('--minister-accent', String(minister.accentColor));
    }
    section.setAttribute("role", "region");
    section.setAttribute("aria-label", "Cabinet du Premier ministre");

    const hero = document.createElement("header");
    hero.className = "executive-cabinet__hero";

    const portrait = document.createElement("img");
    portrait.className = "executive-cabinet__hero-portrait";
    portrait.src = ensureImageSource(minister?.photo);
    portrait.alt = minister?.name ? `Portrait de ${minister.name}` : "Portrait du Premier ministre";
    hero.appendChild(portrait);

    const heroMeta = document.createElement("div");
    heroMeta.className = "executive-cabinet__hero-meta";

    const heroTitle = document.createElement("h2");
    heroTitle.className = "executive-cabinet__title";
    heroTitle.textContent = "Cabinet du Premier ministre";
    heroMeta.appendChild(heroTitle);

    const heroSubtitle = document.createElement("p");
    heroSubtitle.className = "executive-cabinet__subtitle";
    heroSubtitle.textContent = EXECUTIVE_PM_SUMMARY;
    heroMeta.appendChild(heroSubtitle);

    hero.appendChild(heroMeta);

    const members = normaliseCabinetMembers(collaborators, gradeLookup);
    const totalMembers = members.length;
    const count = document.createElement("span");
    count.className = "executive-cabinet__count";
    count.textContent = totalMembers
        ? `${totalMembers} membre${totalMembers > 1 ? "s" : ""}`
        : "Aucun collaborateur renseigné";
    hero.appendChild(count);

    section.appendChild(hero);

    if (!members.length) {
        const placeholder = document.createElement("p");
        placeholder.className = "executive-placeholder";
        placeholder.textContent = options?.error
            ? "Impossible de charger le cabinet du Premier ministre pour le moment."
            : "Aucun collaborateur n'est encore renseigné pour le cabinet du Premier ministre.";
        section.appendChild(placeholder);
        return section;
    }

    const directReports = members.filter((member) => member.superiorId === String(minister.id));
    const sortedDirectReports = directReports.slice().sort(compareCabinetMembers);
    const directionMembers = sortedDirectReports.filter((member) => EXECUTIVE_DIRECTION_KEYS.has(member.gradeKey));
    const poleHeads = sortedDirectReports.filter((member) => EXECUTIVE_POLE_KEYS.has(member.gradeKey));

    const usedIds = new Set();
    const membersById = new Map(members.map((member) => [member.id, member]));

    const directionSection = document.createElement("section");
    directionSection.className = "executive-cabinet__band";

    const directionTitle = document.createElement("h3");
    directionTitle.className = "executive-cabinet__band-title";
    directionTitle.textContent = "Direction du cabinet";
    directionSection.appendChild(directionTitle);

    if (!directionMembers.length) {
        const empty = document.createElement("p");
        empty.className = "executive-placeholder";
        empty.textContent = "Les postes de direction ne sont pas encore renseignés.";
        directionSection.appendChild(empty);
    } else {
        const directionGrid = document.createElement("div");
        directionGrid.className = "cabinet-tree";  // Use harmonized cabinet tree class
        directionMembers.forEach((member) => {
            directionGrid.appendChild(
                createExecutiveCard(member, {
                    head: EXECUTIVE_DIRECTION_LEADERS.has(member.gradeKey),
                    context: EXECUTIVE_DIRECTION_LEADERS.has(member.gradeKey)
                        ? null
                        : "Rattaché·e directement au Premier ministre"
                })
            );
            usedIds.add(member.id);
        });
        directionSection.appendChild(directionGrid);
    }

    section.appendChild(directionSection);

    const polesSection = document.createElement("section");
    polesSection.className = "executive-cabinet__poles";

    const polesTitle = document.createElement("h3");
    polesTitle.className = "executive-cabinet__poles-title";
    polesTitle.textContent = "Pôles stratégiques";
    polesSection.appendChild(polesTitle);

    if (!poleHeads.length) {
        const empty = document.createElement("p");
        empty.className = "executive-placeholder";
        empty.textContent = "Aucun pôle rattaché au Premier ministre n'est encore affiché.";
        polesSection.appendChild(empty);
    } else {
        poleHeads.forEach((head, index) => {
            const poleMembers = members
                .filter((member) => member.superiorId === head.id)
                .sort(compareCabinetMembers);
            const poleArticle = document.createElement("article");
            poleArticle.className = "executive-pole";
            poleArticle.classList.add(EXECUTIVE_POLE_ACCENTS[index % EXECUTIVE_POLE_ACCENTS.length]);

            // Prefer `jobTitle` (Supabase `job_title`) when available, then `job_titles` array, then cabinetRole, then name
            let poleNameSource = head.jobTitle ?? head.job_titles ?? head.cabinetRole ?? head.name;
            let poleName = "";
            if (Array.isArray(poleNameSource)) {
                // join multiple job titles with a separator
                poleName = poleNameSource.filter(Boolean).join(" • ");
            } else {
                poleName = poleNameSource || "";
            }

            if (poleName && !/^p[oô]le\b/i.test(poleName)) {
                poleName = `Pôle ${poleName}`;
            }

            const poleHeader = document.createElement("h4");
            poleHeader.className = "executive-pole__title";
            poleHeader.textContent = poleName || "Pôle";
            poleArticle.appendChild(poleHeader);

            const poleLayout = document.createElement("div");
            poleLayout.className = "executive-pole__layout";

            const headWrapper = document.createElement("div");
            headWrapper.className = "executive-pole__head";
            headWrapper.appendChild(createExecutiveCard(head, { head: true }));
            poleLayout.appendChild(headWrapper);
            usedIds.add(head.id);

            const membersGrid = document.createElement("div");
            membersGrid.className = "executive-pole__members cabinet-tree";  // Use harmonized cabinet tree class

            if (!poleMembers.length) {
                const emptyMembers = document.createElement("p");
                emptyMembers.className = "executive-placeholder";
                emptyMembers.textContent = "Les conseillers du pôle seront bientôt ajoutés.";
                membersGrid.appendChild(emptyMembers);
            } else {
                poleMembers.forEach((member) => {
                    membersGrid.appendChild(createExecutiveCard(member, { compact: true }));
                    usedIds.add(member.id);
                });
            }

            poleLayout.appendChild(membersGrid);
            poleArticle.appendChild(poleLayout);
            polesSection.appendChild(poleArticle);
        });
    }

    section.appendChild(polesSection);

    const remainingMembers = members.filter((member) => !usedIds.has(member.id));
    if (remainingMembers.length) {
        const othersSection = document.createElement("section");
        othersSection.className = "executive-cabinet__others";

        const othersTitle = document.createElement("h3");
        othersTitle.className = "executive-cabinet__others-title";
        othersTitle.textContent = "Autres collaborateurs rattachés";
        othersSection.appendChild(othersTitle);

        const othersGrid = document.createElement("div");
        othersGrid.className = "cabinet-tree cabinet-tree--compact";  // Use harmonized cabinet tree class

        remainingMembers.sort(compareCabinetMembers).forEach((member) => {
            const parent = membersById.get(member.superiorId);
            const context = parent?.name
                ? `Rattaché·e à ${parent.name}`
                : "Rattaché·e à Matignon";
            othersGrid.appendChild(createExecutiveCard(member, { compact: true, context }));
            usedIds.add(member.id);
        });

        othersSection.appendChild(othersGrid);
        section.appendChild(othersSection);
    }

    return section;
};

const toggleExecutiveCabinet = async (minister, toggleButton) => {
    if (!modal || !minister) return;
    const modalBody = modal.querySelector(".modal-body");
    const modalContent = modal.querySelector(".modal-content");
    if (!modalBody || !modalContent) return;

    modal.classList.remove("modal--cabinet-active", "modal--cabinet-mode");

    const overlay = modalContent.querySelector(".cabinet-overlay");
    if (overlay) {
        overlay.remove();
    }

    const existingSection = modalBody.querySelector(".executive-cabinet");
    if (existingSection) {
        existingSection.remove();
        if (toggleButton) {
            toggleButton.textContent = "Afficher les collaborateurs";
            toggleButton.setAttribute("aria-expanded", "false");
            toggleButton.dataset.cabinetState = "closed";
        }
        return;
    }

    let collabs = collaboratorsCache.get(minister.id);
    let fetchError = false;
    if (!collabs) {
        try {
            collabs = await fetchCollaboratorsForMinister(minister.id);
        } catch (error) {
            collabs = null;
        }
        fetchError = !Array.isArray(collabs);
        collaboratorsCache.set(minister.id, Array.isArray(collabs) ? collabs : []);
    }

    const gradeLookup = await getCollaboratorGradeLookup();
    const section = buildExecutiveCabinetSection(
        minister,
        Array.isArray(collabs) ? collabs : [],
        gradeLookup,
        { error: fetchError }
    );

    modalBody.insertBefore(section, modalBody.firstChild);
    if (toggleButton) {
        toggleButton.textContent = "Masquer les collaborateurs";
        toggleButton.setAttribute("aria-expanded", "true");
        toggleButton.dataset.cabinetState = "open";
    }

    if (typeof modalContent.scrollTo === "function") {
        modalContent.scrollTo({ top: 0, behavior: "smooth" });
    } else {
        modalContent.scrollTop = 0;
    }
};


const showCabinetInlineForMinister = async (minister) => {
    console.log('[DEBUG] showCabinetInlineForMinister appelé pour:', minister?.name, minister?.id);

    if (!modal || !minister) {
        console.log('[DEBUG] Modal ou minister manquant');
        return;
    }
    const modalBody = modal.querySelector(".modal-body");
    if (!modalBody) {
        console.log('[DEBUG] modalBody non trouvé');
        return;
    }

    const existingSection = modalBody.querySelector(".modal-collaborators");
    if (existingSection) {
        existingSection.remove();
    }

    // 1) CAS DU PRÉSIDENT DE LA RÉPUBLIQUE
    const isPresidentCase = isPresident(minister);

    // 2) Vérifier si c'est le Premier ministre pour utiliser la nouvelle structure
    // NB: ne PAS afficher la structure spéciale PM pour les ministres délégués
    // (certains ministres délégués peuvent être rattachés à Matignon mais ne
    // doivent pas déclencher la vue 'cabinet du Premier ministre').
    const isPrimeMinister = !isPresidentCase && isExecutiveLeader(minister) && !DELEGATE_ROLES.has(minister.role);

    let placeholder;
    if (isPresidentCase) {
        // Structure spéciale pour le Président avec pôles thématiques
        placeholder = document.createElement("section");
        placeholder.className = "modal-collaborators president-cabinet-wrapper";
        placeholder.innerHTML = '<p class="president-cabinet-empty">Chargement des collaborateurs…</p>';
    } else if (isPrimeMinister) {
        // Structure spéciale pour le PM avec pôles
        placeholder = document.createElement("section");
        placeholder.className = "modal-collaborators pm-cabinet-wrapper";
        placeholder.innerHTML = '<p class="pm-cabinet-empty">Chargement des collaborateurs…</p>';
    } else {
        // Structure normale pour les autres ministres
        placeholder = renderCabinetSection(minister, [], createGradeLookup(null));
        placeholder.classList.remove("is-hidden");

        const placeholderMessage = placeholder.querySelector(".cabinet-empty");
        if (placeholderMessage) {
            placeholderMessage.textContent = minister.id
                ? "Chargement des collaborateurs…"
                : "Cabinet non disponible pour le moment.";
        }
    }

    const modalLayout = modalBody.querySelector(".modal-layout");
    // Prefer inserting the collaborators section before the biographie module inside the layout
    const biographySection = modalLayout ? modalLayout.querySelector('.modal-module--biography') : null;
    if (modalLayout && biographySection && biographySection.parentNode) {
        biographySection.parentNode.insertBefore(placeholder, biographySection);
    } else {
        const parent = modalLayout?.parentElement || modalBody;
        parent.insertBefore(placeholder, modalLayout ? modalLayout.nextSibling : null);
    }

    // mark modal so we can apply expanded styles when collaborators are visible
    if (modal && !modal.classList.contains('modal--has-collaborators')) {
        modal.classList.add('modal--has-collaborators');
    }

    if (!minister.id) {
        console.log('[DEBUG] Pas d\'ID ministre');
        return;
    }

    // ========== MIGRATION: Utiliser minister.collaborators du JSON au lieu de Supabase ==========
    // Les collaborateurs sont maintenant des objets complets avec toutes leurs informations
    const collabs = Array.isArray(minister.collaborators) ? minister.collaborators : [];
    console.log('[DEBUG] Collaborateurs complets trouvés:', collabs.length, collabs.slice(0, 2));
    if (collabs.length) {
        console.log('[DEBUG] Premier collaborateur (dump):', collabs[0]);
    }

    console.log('[DEBUG] Objets collaborateurs créés:', collabs.length);

    const fetchError = false; // Pas d'erreur puisque les données sont déjà dans le JSON

    let finalSection;
    if (isPresidentCase) {
        console.log('[DEBUG] Cas Président - appel renderPresidentCabinetSection avec', collabs.length, 'collaborateurs');
        // Utiliser la structure spéciale pour le Président (pôles thématiques)
        finalSection = renderPresidentCabinetSection(
            minister,
            Array.isArray(collabs) ? collabs : []
        );

        if (fetchError) {
            const errorMessage = document.createElement("p");
            errorMessage.className = "president-cabinet-empty";
            errorMessage.textContent = "Impossible de charger les collaborateurs pour le moment.";
            finalSection.appendChild(errorMessage);
        }
    } else if (isPrimeMinister) {
        console.log('[DEBUG] Cas Premier Ministre - appel renderPMCabinetSection avec', collabs.length, 'collaborateurs');
        // Utiliser la nouvelle structure pour le Premier ministre
        finalSection = renderPMCabinetSection(
            minister,
            Array.isArray(collabs) ? collabs : []
        );

        if (fetchError) {
            const errorMessage = document.createElement("p");
            errorMessage.className = "pm-cabinet-empty";
            errorMessage.textContent = "Impossible de charger les collaborateurs pour le moment.";
            finalSection.appendChild(errorMessage);
        }
    } else {
        console.log('[DEBUG] Cas Ministre normal - appel renderCabinetSection avec', collabs.length, 'collaborateurs');
        // Utiliser la structure normale pour les autres ministres
        const gradeLookup = await getCollaboratorGradeLookup();
        console.log('[DEBUG] Grade lookup obtenu:', gradeLookup ? 'OK' : 'NULL');
        finalSection = renderCabinetSection(
            minister,
            Array.isArray(collabs) ? collabs : [],
            gradeLookup
        );
        finalSection.classList.remove("is-hidden");

        const finalMessage = finalSection.querySelector(".cabinet-empty");
        if (fetchError) {
            if (finalMessage) {
                finalMessage.textContent = "Impossible de charger les collaborateurs pour le moment.";
            } else {
                const panel = finalSection.querySelector(".cabinet-panel");
                if (panel) {
                    const errorMessage = document.createElement("p");
                    errorMessage.className = "cabinet-empty";
                    errorMessage.textContent = "Impossible de charger les collaborateurs pour le moment.";
                    panel.appendChild(errorMessage);
                }
            }
        }
    }

    if (activeMinister !== minister || !placeholder.isConnected) {
        return;
    }

    placeholder.replaceWith(finalSection);
    console.log('[DEBUG] Section finale insérée dans le DOM pour', minister.name);

    // ensure the has-collaborators marker remains while the section is present
    if (modal && !modal.classList.contains('modal--has-collaborators')) {
        modal.classList.add('modal--has-collaborators');
    }
};

const openModal = async (minister) => {
    if (!modal) return;
    setModalBusy(true);
    // C'est ici que le miracle se produit, la fiche s'ouvre le tigre tourne et je suis heureux
    const modalContent = modal.querySelector('.modal-content');
    const overlay = modalContent?.querySelector('.cabinet-overlay');
    if (overlay) {
        overlay.remove();
    }
    modal.classList.remove('modal--cabinet-mode', 'modal--cabinet-active');
    activeMinister = minister;
    const modalBody = modal.querySelector(".modal-body");
    if (modalBody) {
        modalBody.hidden = false;
        const executiveSection = modalBody.querySelector(".executive-cabinet");
        if (executiveSection) {
            executiveSection.remove();
        }
    }
    // Export functionality removed - button deleted from HTML
    // if (exportButton) {
    //     if (minister) {
    //         exportButton.disabled = false;
    //         exportButton.removeAttribute("aria-disabled");
    //         exportButton.removeAttribute("aria-busy");
    //         exportButton.onclick = () => handleExportMinisterClick(minister);
    //     } else {
    //         exportButton.disabled = true;
    //         exportButton.setAttribute("aria-disabled", "true");
    //         exportButton.onclick = null;
    //     }
    // }
    modalElements.photo.src = ensureImageSource(minister.photo);
    if (modalElements.photo) {
        modalElements.photo.onerror = () => {
            modalElements.photo.onerror = null;
            modalElements.photo.src = "assets/placeholder-minister.svg";
        };
    }
    modalElements.photo.alt = minister.photoAlt ?? `Portrait de ${minister.name ?? "ministre"}`;
    modalElements.title.textContent = minister.name ?? "Nom du ministre";

    // Portfolio now displays role label(s) from person_ministries
    let roleLabels = Array.isArray(minister.ministries)
        ? minister.ministries
              .map((entry) => (entry && typeof entry.roleLabel === 'string' ? entry.roleLabel.trim() : ''))
              .filter((v) => !!v)
        : [];
    // Prefer unique labels, preserve order (primary first if marked)
    if (Array.isArray(minister.ministries)) {
        const primaries = minister.ministries.filter((e) => e && e.isPrimary && e.roleLabel).map((e) => e.roleLabel.trim());
        const others = roleLabels.filter((rl) => !primaries.includes(rl));
        roleLabels = [...(primaries.length ? primaries : []), ...others];
    }
    const joinedRoleLabels = roleLabels.length ? Array.from(new Set(roleLabels.map((t) => t.toLowerCase()))).map((lower, idx) => roleLabels.find((t) => t.toLowerCase() === lower)).join(' • ') : '';
    modalElements.portfolio.textContent = joinedRoleLabels || formatRole(minister.role) || minister.portfolio || "Rôle à préciser";

    modalElements.description.textContent = minister.description ?? "Ajoutez ici une biographie synthétique.";

    // mission field removed from modal — no longer displayed

    // Populate biography module from preloaded view or fallback careers table
    try {
        let bioEntries = Array.isArray(minister.biography) ? minister.biography : [];
        if (!bioEntries.length && minister.id != null) {
            bioEntries = await fetchBiographyForPersonFallback(minister.id);
        }
        populateBiographyModule(bioEntries, minister.accentColor || null);
    } catch (_) {
        // ignore population errors
    }

    setModalBusy(false);

    if (modalBody) {
        const oldCollabSection = modalBody.querySelector(".modal-collaborators");
        if (oldCollabSection) oldCollabSection.remove();
        const oldToggle = modalBody.querySelector(".modal-collaborators-toggle");
        if (oldToggle) oldToggle.remove();
    }

    if (modalBody) {
        // Show cabinet inline for all ministers (including Prime Minister and delegates)
        showCabinetInlineForMinister(minister).catch((error) => {
            console.warn("[onepage] Impossible d'afficher le cabinet :", error);
        });

        // Populate inline ministres délégués section inside the fiche modal
        try {
            // Prefer to find an existing delegates section inside the modal
            let delegatesSection = modal.querySelector('.modal-module--delegates');
            // We'll query for a delegates list inside the modal (may not exist if section was removed)
            let delegatesList = delegatesSection ? delegatesSection.querySelector('#modal-delegates') : null;

            // If the current minister IS a delegate (role in DELEGATE_ROLES), ensure the delegates
            // module is removed from the modal and skip population.
            if (DELEGATE_ROLES.has(minister.role)) {
                if (delegatesSection && delegatesSection.parentNode) {
                    delegatesSection.parentNode.removeChild(delegatesSection);
                }
                // skip the rest of the delegates population logic
            } else {

            // Determine linked delegates: prefer minister.delegates if already attached
            let linkedDelegates = Array.isArray(minister.delegates) && minister.delegates.length ? minister.delegates.slice() : [];
            if (!linkedDelegates.length && Array.isArray(delegateMinisters) && delegateMinisters.length) {
                linkedDelegates = delegateMinisters.filter((d) => {
                    if (!d) return false;
                    if (d.superiorId && minister.id && String(d.superiorId) === String(minister.id)) return true;
                    if (minister.primaryMinistryId && d.primaryParentMinistryId && String(d.primaryParentMinistryId) === String(minister.primaryMinistryId)) return true;
                    const keyA = normalise(minister.portfolio || minister.ministry || '');
                    const keyB = normalise(d.portfolio || d.ministry || '');
                    if (keyA && keyB && keyA === keyB) return true;
                    try {
                        const mCats = new Set((Array.isArray(minister.ministries) ? minister.ministries : []).map((m) => (m && (m.category || m.cat || m.type) ? normalise(m.category || m.cat || m.type) : '')).filter(Boolean));
                        const dCats = new Set((Array.isArray(d.ministries) ? d.ministries : []).map((m) => (m && (m.category || m.cat || m.type) ? normalise(m.category || m.cat || m.type) : '')).filter(Boolean));
                        for (const c of dCats) {
                            if (mCats.has(c)) return true;
                        }
                    } catch (e) {
                        // ignore
                    }
                    return false;
                });
            }

                // If no linked delegates, remove the delegates section from the modal (so it doesn't appear)
                if (!Array.isArray(linkedDelegates) || !linkedDelegates.length) {
                    if (delegatesSection && delegatesSection.parentNode) {
                        delegatesSection.parentNode.removeChild(delegatesSection);
                    }
                } else {
                    // Ensure delegates section exists; create it if needed
                    if (!delegatesSection) {
                        delegatesSection = document.createElement('div');
                        delegatesSection.className = 'modal-module modal-module--delegates';
                        const h4 = document.createElement('h4');
                        h4.className = 'modal-module-title';
                        h4.textContent = 'Ministres délégués';
                        delegatesSection.appendChild(h4);
                        delegatesList = document.createElement('div');
                        delegatesList.id = 'modal-delegates';
                        delegatesList.className = 'modal-delegates-list';
                        delegatesList.setAttribute('role', 'list');
                        delegatesSection.appendChild(delegatesList);

                        // Insert delegates section before biography section if present, otherwise append to modal layout
                        const biographySec = modal.querySelector('.modal-module--biography');
                        const layout = modal.querySelector('.modal-layout') || modal.querySelector('.modal-body') || modal;
                        if (biographySec && biographySec.parentNode) {
                            biographySec.parentNode.insertBefore(delegatesSection, biographySec);
                        } else if (layout) {
                            layout.appendChild(delegatesSection);
                        }
                    }

                    // Populate delegates list (only if we have linkedDelegates)
                    delegatesList = delegatesList || delegatesSection.querySelector('#modal-delegates');
                    if (delegatesList) {
                        delegatesList.innerHTML = '';
                        linkedDelegates.forEach((delegate) => {
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'delegate-card delegate-card--inline';
                            btn.setAttribute('role', 'listitem');

                            const info = document.createElement('div');
                            info.className = 'delegate-info';
                            const dn = document.createElement('p');
                            dn.className = 'delegate-name';
                            // keep the minister's name visible
                            dn.textContent = delegate.name || '';
                            info.appendChild(dn);
                            const dr = document.createElement('p');
                            dr.className = 'delegate-role';
                            // prefer role_label from person_ministries (mapped to mission) as the displayed role
                            dr.textContent = delegate.mission || delegate.portfolio || formatRole(delegate.role) || '';
                            info.appendChild(dr);
                            btn.appendChild(info);

                            const delegateBadge = createPartyBadge(delegate.party == null ? '' : String(delegate.party).trim());
                            if (delegateBadge) btn.appendChild(delegateBadge);

                            btn.addEventListener('click', (ev) => {
                                ev.stopPropagation();
                                openModal(delegate);
                            });

                            delegatesList.appendChild(btn);
                        });
                    }
                }
            }
        } catch (e) {
            // ignore errors populating delegates section
        }
    }

    modal.hidden = false;
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
};

const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.classList.remove("modal--cabinet-active", "modal--cabinet-mode");
    // remove collaborators marker when closing
    modal.classList.remove('modal--has-collaborators');
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.hidden = false;
        const executiveSection = modalBody.querySelector('.executive-cabinet');
        if (executiveSection) {
            executiveSection.remove();
        }
    }
    const modalContent = modal.querySelector('.modal-content');
    const overlay = modalContent?.querySelector('.cabinet-overlay');
    if (overlay) {
        overlay.remove();
    }
    const toggleButton = modal.querySelector('.modal-collaborators-toggle');
    if (toggleButton) {
        toggleButton.textContent = 'Afficher les collaborateurs';
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.dataset.cabinetState = 'closed';
    }
    document.body.style.overflow = "";
    if (exportButton) {
        exportButton.onclick = null;
        exportButton.disabled = true;
        exportButton.removeAttribute("aria-busy");
        exportButton.setAttribute("aria-disabled", "true");
    }
    activeMinister = null;
};

// Switch modal content to cabinet-only view
const switchToCabinetView = async (minister) => {
    if (!modal) return;
    const modalBody = modal.querySelector(".modal-body");
    const modalContent = modal.querySelector(".modal-content");
    if (!modalBody || !modalContent) return;

    let collabs = collaboratorsCache.get(minister.id);
    if (!collabs) {
        try {
            collabs = await fetchCollaboratorsForMinister(minister.id);
        } catch (e) {
            collabs = [];
        }
        collaboratorsCache.set(minister.id, Array.isArray(collabs) ? collabs : []);
    }

    const gradeLookup = await getCollaboratorGradeLookup();

    // Create an overlay container above the detail content (kept intact)
    let overlay = modalContent.querySelector('.cabinet-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'cabinet-overlay';
        modalContent.appendChild(overlay);
    } else {
        overlay.innerHTML = '';
    }

    const backbar = document.createElement('div');
    backbar.className = 'cabinet-backbar';
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn-ghost cabinet-back';
    backBtn.textContent = 'Retour à la fiche';
    backBtn.addEventListener('click', () => switchToDetailView(minister));
    backbar.appendChild(backBtn);
    overlay.appendChild(backbar);

    const section = renderCabinetSection(minister, collabs, gradeLookup);
    section.classList.remove('is-hidden');
    overlay.appendChild(section);

    modalBody.hidden = true;
    overlay.hidden = false;
    modal.classList.add('modal--cabinet-mode');

    if (typeof overlay.scrollTo === 'function') {
        overlay.scrollTo({ top: 0 });
    } else {
        overlay.scrollTop = 0;
    }
};

const switchToDetailView = (minister) => {
    if (!modal) return;
    const modalBody = modal.querySelector('.modal-body');
    const modalContent = modal.querySelector('.modal-content');
    const overlay = modalContent?.querySelector('.cabinet-overlay');
    if (overlay) {
        overlay.remove();
    }
    if (modalBody) {
        modalBody.hidden = false;
    }
    modal.classList.remove('modal--cabinet-mode');
    // Ensure detail view shows current minister info
    openModal(minister);
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

    if (modal && !modal.hidden) {
        closeModal();
    }

    refreshGridForPrint();

    document.body.classList.add("print-all");

    const cleanup = () => {
        document.body.classList.remove("print-all");
        window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
};

const highlightFilter = (role) => {
    filterButtons.forEach((btn) => {
        const isActive = btn.dataset.role === role;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
};

// ========== SUPPRIMÉ: fetchMinistersFromSupabase() et fetchMinistersFromView() ==========
// Les données proviennent des fichiers statiques data/ministers/

const fetchMinistersFromSplitFiles = async () => {
    const manifestUrl = 'data/ministers/index.json';
    const manifestResponse = await fetch(manifestUrl, { cache: 'no-store' });
    if (!manifestResponse.ok) {
        throw new Error(`Erreur HTTP ${manifestResponse.status} lors du chargement de ${manifestUrl}`);
    }

    const manifest = await manifestResponse.json();
    if (!Array.isArray(manifest) || manifest.length === 0) {
        throw new Error('Le manifest data/ministers/index.json est vide ou invalide');
    }

    const entries = manifest.filter(item => item && item.file);
    if (entries.length === 0) {
        throw new Error('Aucun fichier listé dans data/ministers/index.json');
    }

    const results = await Promise.all(entries.map(async (entry) => {
        const url = entry.file;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error(`Erreur HTTP ${res.status} lors du chargement de ${url}`);
        }
        return res.json();
    }));

    return results;
};

const normaliseCollaboratorsForMinister = (collaborators, ministerId) => {
    if (!Array.isArray(collaborators)) return [];
    return collaborators.map((collab, index) => {
        const name = collab?.full_name || collab?.name || '';
        const role = collab?.cabinet_role || collab?.job_title || '';
        const order = typeof collab?.cabinet_order === 'number'
            ? collab.cabinet_order
            : parseInt(collab?.cabinet_order, 10);

        return {
            id: collab?.id ?? `collab-${ministerId || 'unknown'}-${index + 1}`,
            superior_id: collab?.superior_id || ministerId || null,
            full_name: name || 'Collaborateur·rice',
            name: name || 'Collaborateur·rice',
            cabinet_role: role || null,
            job_title: collab?.job_title || null,
            cabinet_order: Number.isFinite(order) ? order : 999,
            collab_grade: collab?.collab_grade || null,
            pole_name: collab?.pole_name || null,
            photo_url: collab?.photo_url || null,
            description: collab?.description || null,
            email: collab?.email || null,
            cabinet_badge: collab?.cabinet_badge || null
        };
    });
};

/**
 * Charge les données des ministres depuis le fichier JSON statique
 * (Migration Supabase → GitHub Pages)
 */
const loadMinisters = async () => {
    setGridBusy(true);
    emptyState.hidden = true;

    try {
        const data = await fetchMinistersFromSplitFiles();
        console.log(`[onepage] ✅ ${data.length} ministres chargés depuis les fichiers individuels`);

        // Normaliser les données (s'assurer que biography existe)
        ministers = data.map(item => ({
            ...item,
            biography: Array.isArray(item.biography) ? item.biography : [],
            collaborators: normaliseCollaboratorsForMinister(item.collaborators, item.id)
        }));

        // Séparer ministres core et délégués
        coreMinisters = ministers.filter(m => CORE_ROLES.has(m.role));
        delegateMinisters = ministers.filter(m => DELEGATE_ROLES.has(m.role));

        // Attacher les délégués aux ministres
        attachDelegatesToCore();

        // Mettre à jour les options de filtre parti
        updatePartyFilterOptions(ministers);

        // Appliquer les filtres et afficher
        applyFilters();

        // Construire l'index de recherche (si fonction disponible)
        if (typeof buildHeaderSearchIndex === 'function') {
            try {
                buildHeaderSearchIndex();
            } catch (e) {
                console.warn('[onepage] Erreur construction index recherche:', e);
            }
        } else {
            // Retry au cas où la fonction serait définie plus tard
            setTimeout(() => {
                if (typeof buildHeaderSearchIndex === 'function') {
                    try { 
                        buildHeaderSearchIndex(); 
                    } catch (e) { 
                        /* ignore */ 
                    }
                }
            }, 60);
        }

        console.log(`[onepage] ✅ ${ministers.length} ministres chargés depuis les fichiers individuels`);

    } catch (error) {
        console.error('[onepage] ❌ Erreur chargement données:', error);
        
        ministers = [];
        coreMinisters = [];
        delegateMinisters = [];
        grid.innerHTML = '';
        emptyState.hidden = false;
        emptyState.textContent = 
            'Impossible de charger les données. Vérifiez les fichiers data/ministers/index.json et le dossier data/ministers/.';
        updateResultsSummary(0, 0);
        updateActiveFiltersHint(0, 0);
    } finally {
        setGridBusy(false);
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

let __appInitialized = false;

// Contact button: assemble email on click to deter bots
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('contactBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const user = btn.dataset.u || 'contact';
        const domain = btn.dataset.d || 'rumeurpublique.fr';
        window.location.href = `mailto:${user}@${domain}`;
    });
});

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
    loadMinisters().then(() => {
    }).catch((err) => {
        console.error("[onepage] Echec du chargement initial", err);
        // Debug banner minimal pour diagnostiquer rapidement en front
        try {
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:rgba(209,0,123,0.1);border-top:1px solid rgba(209,0,123,0.35);color:#4B2579;padding:8px 12px;font:600 13px/1.4 \"Space Grotesk\",system-ui;backdrop-filter:saturate(120%) blur(2px)';
            banner.textContent = 'Diagnostic: échec du chargement des données. Vérifiez data/ministers/index.json et les fichiers individuels.';
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

// ========== SUPPRIMÉ: serverSearch() Supabase ==========
// La recherche utilise désormais uniquement l'index client-side

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
            img.src = ensureImageSource(it.photo);
            img.onerror = () => {
                img.onerror = null;
                img.src = 'assets/placeholder-minister.svg';
            };
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

// Expose a small global helper so external UI (floating search, other scripts)
// can open a minister's fiche by id or name. This is intentionally
// lightweight: it prefers exact id match, then normalized name match.
window.openMinisterById = async (identifier, { openModalIfFound = true } = {}) => {
    if (!identifier) return false;
    const idOrName = String(identifier).trim();
    const all = (coreMinisters || []).concat(delegateMinisters || []);

    // Try id match first
    let match = all.find((m) => String(m.id) === idOrName);
    // Then exact normalized name
    if (!match) match = all.find((m) => normalise(m.name || "") === normalise(idOrName));
    // Then contains
    if (!match) match = all.find((m) => normalise(m.name || "").includes(normalise(idOrName)));

    if (match) {
        // If openModal function is available and requested, open fiche
        try {
            if (openModalIfFound && typeof openModal === 'function') {
                await openModal(match);
                return true;
            }
        } catch (e) {
            console.warn('[onepage] openMinisterById: unable to open modal', e);
        }

        // Fallback: scroll to element
        const selector = `[data-person-id="${match.id}"]`;
        const el = document.querySelector(selector) || Array.from(document.querySelectorAll('.minister-card')).find(c => {
            const nameEl = c.querySelector('h3');
            return nameEl && normalise(nameEl.textContent || '') === normalise(match.name || '');
        });
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightElement(el, 2200);
            const cta = el.querySelector('.minister-cta');
            if (cta) cta.focus({ preventScroll: true });
            return true;
        }
        return true;
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
