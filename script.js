const ROLE_LABELS = {
    leader: "Premier ministre",
    "minister-state": "Ministre d'État",
    minister: "Ministre",
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
    "ministre-delegue": 3,
    secretary: 4,
    collaborator: 5
};

const MINISTER_ROLES = new Set(["leader", "minister-state", "minister", "ministre-delegue", "secretary"]);
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


const grid = document.getElementById("ministers-grid");
const emptyState = document.getElementById("ministers-empty");
const searchInput = document.getElementById("minister-search");
const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
const modal = document.getElementById("minister-modal");
const modalBackdrop = modal?.querySelector("[data-dismiss]");
const modalClose = modal?.querySelector(".modal-close");

const modalElements = {
    photo: document.getElementById("modal-photo"),
    role: document.getElementById("modal-role"),
    title: document.getElementById("modal-title"),
    portfolio: document.getElementById("modal-portfolio"),
    description: document.getElementById("modal-description"),
    mission: document.getElementById("modal-mission"),
    contact: document.getElementById("modal-contact")
};

let ministers = [];
let coreMinisters = [];
let delegateMinisters = [];
let showDelegates = false;
let currentRole = "all";
let currentQuery = "";
let lastFetchError = null; // store last fetch error for debug UI

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
    // Use an article element so we can safely include interactive controls inside the card
    const card = document.createElement("article");
    card.className = "minister-card";
    card.setAttribute("role", "listitem");
    card.dataset.role = minister.role ?? "";
    // expose person id for quick navigation
    if (minister.id != null) card.dataset.personId = String(minister.id);

    // Badge de rôle (sémantique)
    const [badgeText, badgeVariant] = (() => {
        const r = minister.role || "";
        if (r === "minister" || r === "minister-state") return ["Ministre de plein exercice", "plein"];
        if (r === "ministre-delegue") return ["Ministre délégué", "delegue"];
        if (r === "leader") return [ROLE_LABELS[r] || "", "leader"];
        if (r === "secretary") return [ROLE_LABELS[r] || "", "secretary"];
        return [ROLE_LABELS[r] || "", "other"];
    })();
    if (badgeText) {
        const badge = document.createElement("span");
        badge.className = `role-badge role-badge--${badgeVariant}`;
        badge.textContent = badgeText;
        card.appendChild(badge);
    }

    if (minister.role === "leader") {
        card.classList.add("is-leader");
        card.setAttribute("aria-label", "Premier ministre");
    }

    if (minister.accentColor) {
        card.style.setProperty("--accent-color", minister.accentColor);
    }

    // New rectangular layout: ministry on left, info to the right
    const left = document.createElement("div");
    left.className = "mc-left";
    const right = document.createElement("div");
    right.className = "mc-right";

    const portfolio = document.createElement("div");
    portfolio.className = "mc-ministry";
    portfolio.textContent = minister.portfolio ?? "Portefeuille à préciser";
    left.appendChild(portfolio);

    const name = document.createElement("h3");
    name.textContent = minister.name ?? "Nom du ministre";
    left.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "mc-meta";
    const role = document.createElement("p");
    role.className = "minister-role";
    role.textContent = (() => {
        if (minister.role === "minister" || minister.role === "minister-state") return "Ministre de plein exercice";
        if (minister.role === "ministre-delegue") return "Ministre délégué";
        return formatRole(minister.role);
    })();
    meta.appendChild(role);
    // Affiche le badge de parti : valeur fournie -> badge normal; valeur absente -> badge "Sans étiquette" plus visible
    const partyRaw = minister.party?.toString().trim();
    if (partyRaw) {
        const party = document.createElement("span");
        party.className = "party-badge";
        party.textContent = minister.party;
        // Try to map the raw party value to a known label used by CSS selectors
        const mapped = mapPartyLabel(partyRaw);
        if (mapped) {
            party.setAttribute("data-party", mapped);
        } else {
            // Fallback: try to apply a CSS variable if available (var(--party-<key>))
            const rawKey = normalise(partyRaw).replace(/[^a-z0-9]/g, "");
            party.style.backgroundColor = `var(--party-${rawKey})`;
            // ensure readable text if the var isn't present: CSS rule `.party-badge[style]` sets a default text color
        }
        meta.appendChild(party);
    } else {
        // Affiche un grand badge neutre "Sans étiquette"
        const none = document.createElement("span");
        none.className = "party-badge party-badge--untagged";
        none.textContent = "Sans étiquette";
        meta.appendChild(none);
    }
    left.appendChild(meta);

    // Bio affichée directement pour le Premier ministre
    if (minister.role === "leader") {
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

    // CTA: open modal (now a proper button to avoid nesting interactive elements)
    const cta = document.createElement("button");
    cta.type = "button";
    cta.className = "btn btn-primary minister-cta";
    cta.textContent = "Voir la fiche";
    cta.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openModal(minister);
    });
    right.appendChild(cta);

    // Determine delegates to show: prefer explicit `minister.delegates`, otherwise
    // try to derive related delegates from the global `delegateMinisters`.
    let delegatesContainer = null;
    let delegatesToShow = [];
    if (Array.isArray(minister.delegates) && minister.delegates.length > 0) {
        delegatesToShow = minister.delegates.slice();
    } else if (Array.isArray(delegateMinisters) && delegateMinisters.length > 0) {
        const primaryId = minister.primaryMinistryId || null;
        const keyA = normalise(minister.portfolio || minister.ministry || "");

        // 1) Relation par hiérarchie ministérielle: ministère parent de la tutelle
        if (primaryId) {
            delegatesToShow = delegateMinisters.filter((d) => {
                const a = d.primaryParentMinistryId != null ? String(d.primaryParentMinistryId) : null;
                const b = String(primaryId);
                return !!a && a === b;
            });
        }

        // 2) Relation directe par supérieur hiérarchique si renseignée
        if (delegatesToShow.length === 0 && minister.id != null) {
            delegatesToShow = delegateMinisters.filter((d) => {
                const sup = d.superiorId != null ? String(d.superiorId) : null;
                const mid = String(minister.id);
                return !!sup && sup === mid;
            });
        }

        // 3) Fallback: matching par libellé de portefeuille
        if (delegatesToShow.length === 0 && keyA) {
            // exact label match
            delegatesToShow = delegateMinisters.filter((d) => normalise(d.portfolio || d.ministry || "") === keyA);
        }

        // 4) Fuzzy tokens sur le libellé
        if (delegatesToShow.length === 0 && keyA) {
            const tokens = keyA.split(/[^a-z0-9]+/).filter(Boolean).filter((t) => t.length > 3);
            if (tokens.length) {
                delegatesToShow = delegateMinisters.filter((d) => {
                    const keyD = normalise(d.portfolio || d.ministry || "");
                    return tokens.some((tok) => keyD.includes(tok));
                });
            }
        }

        // Keep a rich shape for each delegate so we can open their fiche (modal)
        delegatesToShow = delegatesToShow.map((d) => ({
            id: d.id || d.person_id || null,
            name: d.name || d.full_name || "",
            role: d.role || d.mission || d.job_title || "",
            party: d.party || "",
            photo: d.photo || d.photo_url || "",
            photoAlt: d.photoAlt || (d.full_name ? `Portrait de ${d.full_name}` : undefined),
            description: d.description || "",
            mission: d.mission || d.role || "",
            contact: d.contact || d.email || "",
            portfolio: d.portfolio || d.ministry || "",
            accentColor: d.accentColor || d.color || undefined,
            superiorId: d.superiorId || d.superior_id || null,
            primaryMinistryId: d.primaryMinistryId || d.primary_ministry_id || null
        }));
    }

    // Always render the delegates block for visibility, even if empty
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "card-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "toggle-btn";
    toggleBtn.textContent = "Afficher les ministres délégués";

    delegatesContainer = document.createElement("div");
    delegatesContainer.className = "delegates";
    delegatesContainer.setAttribute("aria-hidden", "true");

    // populate delegate cards (or empty message)
        if (delegatesToShow.length > 0) {
        delegatesToShow.forEach((d) => {
            const delegate = document.createElement("div");
            delegate.className = "delegate-card";
            delegate.tabIndex = 0;
            delegate.setAttribute("role", "button");

            const info = document.createElement("div");
            const dn = document.createElement("h3");
            dn.textContent = d.name || "";
            const dr = document.createElement("p");
            dr.textContent = d.role || "";
            info.appendChild(dn);
            info.appendChild(dr);

            const party = document.createElement("span");
            party.textContent = d.party || "";
            party.className = "party-badge";
            const mapped = mapPartyLabel(d.party || "");
            if (mapped) party.setAttribute("data-party", mapped);

            delegate.appendChild(info);
            delegate.appendChild(party);

            // When clicking a delegate card, open the modal with the delegate's fiche
            const delegateFiche = {
                id: d.id,
                name: d.name,
                role: d.role === "" ? "Ministre délégué" : d.role,
                photo: d.photo || "assets/placeholder-minister.svg",
                photoAlt: d.photoAlt || `Portrait de ${d.name || "ministre"}`,
                portfolio: d.portfolio || "",
                description: d.description || "",
                mission: d.mission || "",
                contact: d.contact || "",
                ministries: d.primaryMinistryId ? [{ label: d.portfolio }] : []
            };

            delegate.addEventListener("click", (ev) => {
                ev.stopPropagation();
                openModal(delegateFiche);
            });
            delegate.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    openModal(delegateFiche);
                }
            });

            delegatesContainer.appendChild(delegate);
        });
    } else {
        const empty = document.createElement("p");
        empty.className = "legend";
        empty.textContent = "Aucun ministre délégué rattaché";
        delegatesContainer.appendChild(empty);
    }

    // Open by default for all
    delegatesContainer.classList.add("show");
    delegatesContainer.setAttribute("aria-hidden", "false");
    toggleBtn.textContent = "Masquer les ministres délégués";

    toggleBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const isVisible = delegatesContainer.classList.contains("show");
        if (isVisible) {
            delegatesContainer.classList.remove("show");
            delegatesContainer.setAttribute("aria-hidden", "true");
            toggleBtn.textContent = "Afficher les ministres délégués";
        } else {
            delegatesContainer.classList.add("show");
            delegatesContainer.setAttribute("aria-hidden", "false");
            toggleBtn.textContent = "Masquer les ministres délégués";
        }
    });

    actionsWrap.appendChild(toggleBtn);
    left.appendChild(actionsWrap);

    card.appendChild(left);
    card.appendChild(right);

    return card;
};

const renderGrid = (items) => {
    grid.innerHTML = "";

    if (!items.length) {
        grid.setAttribute("aria-busy", "false");
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;
    const fragment = document.createDocumentFragment();

    // 1) Premier ministre en tête
    const leaders = items.filter((m) => m.role === "leader");
    leaders.forEach((m) => fragment.appendChild(buildCard(m)));

    // 2) Tous les autres ministres à la suite (pile verticale)
    const isFull = (m) => m.role === "minister" || m.role === "minister-state";
    let others = items.filter((m) => m.role !== "leader");
    if (!showDelegates) {
        // Par défaut, n'affiche que les ministres de plein exercice
        others = others.filter(isFull);
    }
    // Tri: priorité par rôle, puis ordre de ministère, puis nom
    others.sort((a, b) => {
        const ra = ROLE_PRIORITY[a.role] ?? 999;
        const rb = ROLE_PRIORITY[b.role] ?? 999;
        if (ra !== rb) return ra - rb;
        const ia = MINISTRY_ORDER_MAP.get(normalise(a.portfolio || a.ministry || ""));
        const ib = MINISTRY_ORDER_MAP.get(normalise(b.portfolio || b.ministry || ""));
        const va = typeof ia === "number" ? ia : Number.MAX_SAFE_INTEGER;
        const vb = typeof ib === "number" ? ib : Number.MAX_SAFE_INTEGER;
        if (va !== vb) return va - vb;
        return (a.name || "").localeCompare(b.name || "");
    });

    others.forEach((m) => fragment.appendChild(buildCard(m)));

    grid.appendChild(fragment);
    grid.setAttribute("aria-busy", "false");
};

const applyFilters = () => {
    const source = showDelegates ? coreMinisters.concat(delegateMinisters) : coreMinisters;
    const filtered = source.filter((minister) => {
        const matchesRole = currentRole === "all" || minister.role === currentRole;
        if (!matchesRole) return false;

        if (!currentQuery) return true;
        const haystack = normalise(
            `${minister.name ?? ""} ${minister.portfolio ?? ""} ${minister.mission ?? ""} ${minister.searchIndex ?? ""}`
        );
        return haystack.includes(currentQuery);
    });

    // Tri: ministère (ordre fixe) -> rôle (priorité) -> nom
    const ministryScore = (m) => {
        const key = normalise(m.portfolio || m.ministry || "");
        const idx = MINISTRY_ORDER_MAP.get(key);
        return typeof idx === "number" ? idx : Number.MAX_SAFE_INTEGER;
    };
    const roleScore = (m) => (ROLE_PRIORITY[m.role] ?? Number.MAX_SAFE_INTEGER);

    filtered.sort((a, b) => {
        const ma = ministryScore(a);
        const mb = ministryScore(b);
        if (ma !== mb) return ma - mb;

        const ra = roleScore(a);
        const rb = roleScore(b);
        if (ra !== rb) return ra - rb;

        return (a.name || "").localeCompare(b.name || "");
    });

    renderGrid(filtered);
};

// Chargement des ministres délégués / secrétaires d'État à la demande
const fetchDelegatesFromSupabase = async () => {
    const client = ensureSupabaseClient();
    if (!client) throw new Error("Client Supabase non initialisé");

    // Récupère toutes les personnes puis filtre côté client pour tolérer les variantes d'orthographe/accents
    const { data: persons, error } = await client
        .from("persons")
        .select("id, full_name, role, description, photo_url, job_title, cabinet_role, email, party, superior_id")
        .order("full_name", { ascending: true });
    if (error) throw error;
    // Filtrer côté client: accepter de multiples variantes
    const isDelegateRole = (r) => {
        const n = normalise(r || "");
        return (
            n === "ministre-delegue" ||
            n === "ministre delegue" ||
            n === "ministredelegue" ||
            n === "ministredetat" ||
            n === "secretaire" ||
            n === "secretaire-etat" ||
            n === "secretaire d'etat" ||
            n === "secretairedetat" ||
            n === "secretary"
        );
    };
    const delegatePersons = (persons || []).filter((p) => isDelegateRole(p.role));
    const ids = delegatePersons.map((p) => p.id);
    let ministries = new Map();
    if (ids.length) {
        const { data: links } = await client
            .from("person_ministries")
            .select("person_id, ministry_id, is_primary, role_label")
            .in("person_id", ids);
        const ministryIds = Array.from(new Set((links || []).map((l) => l.ministry_id).filter(Boolean)));
        if (ministryIds.length) {
            const { data: mins } = await client
                .from("ministries")
                .select("id, name, short_name, color, category, parent_ministry_id")
                .in("id", ministryIds);
            ministries = new Map((mins || []).map((m) => [m.id, m]));
        }
        const linksByPerson = new Map();
        (links || []).forEach((l) => {
            const arr = linksByPerson.get(l.person_id) || [];
            arr.push(l);
            linksByPerson.set(l.person_id, arr);
        });

        return delegatePersons.map((p) => {
            const lps = (linksByPerson.get(p.id) || []).sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1));
            const primary = lps[0];
            const m = primary ? ministries.get(primary.ministry_id) : null;
            return {
                id: p.id,
                name: p.full_name,
                role: p.role,
                description: p.description || "",
                mission: primary?.role_label || p.job_title || p.cabinet_role || "",
                portfolio: m?.short_name || m?.name || p.job_title || p.cabinet_role || "",
                contact: p.email || "",
                party: p.party || "",
                photo: p.photo_url || "",
                photoAlt: p.full_name ? `Portrait de ${p.full_name}` : undefined,
                accentColor: m?.color || undefined,
                ministries: lps.map((lk) => {
                    const mm = ministries.get(lk.ministry_id);
                    return { label: mm?.short_name || mm?.name || "", roleLabel: lk.role_label || null, isPrimary: !!lk.is_primary };
                }).filter((x) => x.label),
                superiorId: p.superior_id || null,
                primaryMinistryId: m?.id || null,
                primaryParentMinistryId: m?.parent_ministry_id || null,
            };
        });
    }
    return [];
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

        return (data || []).map((c) => ({
            id: c.id,
            name: c.full_name,
            role: c.cabinet_role || "Collaborateur",
            grade: c.collab_grade || "",
            photo: c.photo_url || "assets/placeholder-minister.svg",
            email: c.email || "",
        }));
    } catch (e) {
        console.warn("[onepage] Erreur lors de la récupération des collaborateurs :", e);
        return [];
    }
};

const openModal = (minister) => {
    if (!modal) return;
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
    modalElements.mission.textContent = minister.mission ?? "Mission principale à renseigner.";
    modalElements.contact.textContent = minister.contact ?? "Contact prochainement disponible.";

    // Nettoie la section collaborateurs si elle existe
    try {
        const oldCollabSection = modal.querySelector(".modal-collaborators");
        if (oldCollabSection) oldCollabSection.remove();
    } catch (e) {
        /* noop */
    }

    // Récupère et affiche les collaborateurs (si Supabase présent)
    (async () => {
        try {
            const collabs = await fetchCollaboratorsForMinister(minister.id);
            if (!Array.isArray(collabs) || collabs.length === 0) return;

            const section = document.createElement("div");
            section.className = "modal-collaborators";

            const title = document.createElement("h4");
            title.textContent = "Collaborateurs";
            section.appendChild(title);

            const list = document.createElement("div");
            list.className = "collaborators-list";

            collabs.forEach((c) => {
                const card = document.createElement("div");
                card.className = "collaborator-card";

                const img = document.createElement("img");
                img.src = c.photo;
                img.alt = `Portrait de ${c.name}`;
                img.className = "collaborator-photo";

                const info = document.createElement("div");
                const name = document.createElement("p");
                name.className = "collab-name";
                name.textContent = c.name;

                const role = document.createElement("p");
                role.className = "collab-role";
                role.textContent = c.role;

                const grade = document.createElement("p");
                grade.className = "collab-grade";
                grade.textContent = c.grade;

                info.appendChild(name);
                info.appendChild(role);
                if (c.grade) info.appendChild(grade);

                card.appendChild(img);
                card.appendChild(info);
                list.appendChild(card);
            });

            section.appendChild(list);
            const bodyEl = modal.querySelector(".modal-body") || modal;
            bodyEl.appendChild(section);
        } catch (e) {
            console.warn('[onepage] Impossible de charger les collaborateurs', e);
        }
    })();

    modal.hidden = false;
    document.body.style.overflow = "hidden";
};

const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
};

const highlightFilter = (role) => {
    filterButtons.forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.role === role);
    });
};

const fetchMinistersFromSupabase = async () => {
    const client = ensureSupabaseClient();
    if (!client) {
        throw new Error("Client Supabase non initialisé");
    }

    const { data: persons, error: personsError } = await client
        .from("persons")
        .select("id, full_name, role, description, photo_url, job_title, cabinet_role, email, party, superior_id")
        // Don't filter by role enum here to avoid invalid enum errors — some projects have different role values.
        // The join with person_ministries below will determine which persons have ministries.
        .order("role", { ascending: true })
        .order("full_name", { ascending: true });

    if (personsError) {
        throw personsError;
    }

    if (!persons || !persons.length) {
        return [];
    }

    const personIds = persons.map((person) => person.id).filter((value) => typeof value === "number" || typeof value === "string");
    if (!personIds.length) {
        return [];
    }

    const { data: links, error: linksError } = await client
        .from("person_ministries")
        .select("person_id, ministry_id, is_primary, role_label")
        .in("person_id", personIds);

    if (linksError) {
        throw linksError;
    }

    const ministryIds = Array.from(
        new Set((links || []).map((link) => link.ministry_id).filter((value) => value != null))
    );

    let ministries = [];
    if (ministryIds.length) {
        const { data: ministriesData, error: ministriesError } = await client
            .from("ministries")
            .select("id, name, short_name, color, category, parent_ministry_id")
            .in("id", ministryIds);

        if (ministriesError) {
            throw ministriesError;
        }
        ministries = ministriesData ?? [];
    }

    const ministriesById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
    const linksByPerson = new Map();
    (links || []).forEach((link) => {
        const list = linksByPerson.get(link.person_id) ?? [];
        list.push(link);
        linksByPerson.set(link.person_id, list);
    });

    return persons.map((person) => {
        const personLinks = linksByPerson.get(person.id) ?? [];
        const sortedLinks = personLinks
            .slice()
            .sort((a, b) => {
                if (!!a.is_primary === !!b.is_primary) {
                    const ministryA = ministriesById.get(a.ministry_id);
                    const ministryB = ministriesById.get(b.ministry_id);
                    const labelA = ministryA?.short_name || ministryA?.name || "";
                    const labelB = ministryB?.short_name || ministryB?.name || "";
                    return labelA.localeCompare(labelB);
                }
                return a.is_primary ? -1 : 1;
            });

        const primaryLink = sortedLinks.find((link) => link.is_primary) ?? sortedLinks[0] ?? null;
        const primaryMinistry = primaryLink ? ministriesById.get(primaryLink.ministry_id) : null;

        const ministriesLabels = sortedLinks.map((link) => {
            const ministry = ministriesById.get(link.ministry_id);
            if (!ministry) return null;
            const label = ministry.short_name || ministry.name || null;
            return {
                label,
                roleLabel: link.role_label || null,
                isPrimary: !!link.is_primary
            };
        }).filter(Boolean);

        const searchIndexParts = [
            person.full_name,
            person.job_title,
            person.cabinet_role,
            person.description,
            ...ministriesLabels.map((entry) => entry?.label ?? ""),
            ...ministriesLabels.map((entry) => entry?.roleLabel ?? "")
        ];

        return {
            id: person.id,
            name: person.full_name ?? "",
            role: person.role ?? "",
            description: person.description ?? "",
            mission: primaryLink?.role_label || person.job_title || person.cabinet_role || "",
            portfolio:
                primaryMinistry?.short_name ||
                primaryMinistry?.name ||
                person.job_title ||
                person.cabinet_role ||
                "",
            contact: person.email || "",
            party: person.party || "",
            photo: person.photo_url || "",
            photoAlt: person.full_name ? `Portrait de ${person.full_name}` : undefined,
            accentColor: primaryMinistry?.color || undefined,
            ministries: ministriesLabels,
            superiorId: person.superior_id || null,
            primaryMinistryId: primaryMinistry?.id || null,
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
        // Try the multi-query strategy first (persons + person_ministries + ministries)
        // This avoids generating a 404 when the optional view `vw_ministernode` is not present.
        let supabaseMinisters = [];
        try {
            supabaseMinisters = await fetchMinistersFromSupabase();
            coreMinisters = supabaseMinisters.filter((m) => m.role === "leader" || m.role === "minister" || m.role === "minister-state");
            delegateMinisters = supabaseMinisters.filter((m) => m.role === "ministre-delegue" || m.role === "secretary");
        } catch (firstErr) {
            // If the multi-query fails (network / permissions), try the view as a fallback
            lastFetchError = firstErr;
            console.warn('[onepage] fetchMinistersFromSupabase failed, attempting vw_ministernode as fallback', firstErr);
            try {
                supabaseMinisters = await fetchMinistersFromView();
                coreMinisters = supabaseMinisters;
                // Préchargement: récupérer les délégués/SE pour activer le toggle dès le rendu
                try {
                    delegateMinisters = await fetchDelegatesFromSupabase();
                } catch (preErr) {
                    console.warn('[onepage] Préchargement des délégués indisponible', preErr);
                    delegateMinisters = [];
                }
            } catch (viewErr) {
                // propagate the view error after recording it
                lastFetchError = viewErr;
                throw viewErr;
            }
        }
        if (supabaseMinisters.length) {
            ministers = supabaseMinisters;
            // Ensure leader is first visually
            const score = (m) => (m.role === "leader" ? 0 : 1);
            ministers.sort((a, b) => score(a) - score(b));
            dataLoaded = true;
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
                coreMinisters = fallbackMinisters.filter((m) => m.role === "leader" || m.role === "minister" || m.role === "minister-state");
                delegateMinisters = fallbackMinisters.filter((m) => m.role === "ministre-delegue" || m.role === "secretary");
                dataLoaded = true;
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
        // If we have delegate ministers available from the data source, show them by default
        // so the UI displays ministres délégués without requiring an extra click.
        try {
            if (!showDelegates && Array.isArray(delegateMinisters) && delegateMinisters.length > 0) {
                showDelegates = true;
                const toggleBtnEl = document.getElementById('toggle-delegates');
                if (toggleBtnEl) {
                    toggleBtnEl.setAttribute('aria-pressed', 'true');
                    toggleBtnEl.textContent = 'Masquer les ministres délégués';
                }
                applyFilters();
            }
        } catch (e) {
            // ignore any errors when adjusting UI
        }
    } else {
        ministers = [];
        coreMinisters = [];
        grid.innerHTML = "";
        grid.setAttribute("aria-busy", "false");
        emptyState.hidden = false;
        emptyState.textContent =
            "Aucune donnée disponible. Vérifiez la configuration Supabase ou ajoutez un fichier data/ministers.json.";
    }
};

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        currentRole = button.dataset.role ?? "all";
        highlightFilter(currentRole);
        applyFilters();
    });
});

searchInput?.addEventListener(
    "input",
    debounce((event) => {
        currentQuery = normalise(event.target.value);
        applyFilters();
    }, 180)
);

// Safe bootstrap after DOM is ready to avoid null elements
let __appInitialized = false;
const initApp = () => {
    if (__appInitialized) return;
    __appInitialized = true;

    modalBackdrop?.addEventListener("click", closeModal);
    modalClose?.addEventListener("click", closeModal);
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });

    // Toggle: afficher/masquer les ministres délégués
    const toggleDelegatesBtn = document.getElementById("toggle-delegates");
    if (toggleDelegatesBtn) {
        toggleDelegatesBtn.addEventListener("click", async () => {
            showDelegates = !showDelegates;
            toggleDelegatesBtn.setAttribute("aria-pressed", String(showDelegates));
            toggleDelegatesBtn.textContent = showDelegates
                ? "Masquer les ministres délégués"
                : "Afficher les ministres délégués";

            if (showDelegates && delegateMinisters.length === 0) {
                try {
                    delegateMinisters = await fetchDelegatesFromSupabase();
                } catch (e) {
                    console.warn("[onepage] Impossible de charger les ministres délégués", e);
                }
            }
            applyFilters();
        });
    }

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
