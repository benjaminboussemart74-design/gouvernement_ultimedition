const ROLE_LABELS = {
    leader: "Premier ministre",
    "minister-state": "Ministre d'État",
    minister: "Ministre",
    secretary: "Secrétaire d'État",
    collaborator: "Collaborateur"
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
let currentRole = "all";
let currentQuery = "";

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

const buildCard = (minister) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "minister-card";
    card.setAttribute("role", "listitem");
    card.dataset.role = minister.role ?? "";

    const photo = document.createElement("img");
    photo.src = minister.photo ?? "assets/placeholder-minister.svg";
    photo.alt = minister.photoAlt ?? `Portrait de ${minister.name ?? "ministre"}`;
    card.appendChild(photo);

    const role = document.createElement("p");
    role.className = "minister-role";
    role.textContent = formatRole(minister.role);
    card.appendChild(role);

    const name = document.createElement("h3");
    name.textContent = minister.name ?? "Nom du ministre";
    card.appendChild(name);

    const portfolio = document.createElement("p");
    portfolio.className = "minister-portfolio";
    portfolio.textContent = minister.portfolio ?? "Portefeuille à préciser";
    card.appendChild(portfolio);

    card.addEventListener("click", () => openModal(minister));

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
    items.forEach((minister) => fragment.appendChild(buildCard(minister)));
    grid.appendChild(fragment);
    grid.setAttribute("aria-busy", "false");
};

const applyFilters = () => {
    const filtered = ministers.filter((minister) => {
        const matchesRole = currentRole === "all" || minister.role === currentRole;
        if (!matchesRole) return false;

        if (!currentQuery) return true;
        const haystack = normalise(`${minister.name ?? ""} ${minister.portfolio ?? ""} ${minister.mission ?? ""}`);
        return haystack.includes(currentQuery);
    });

    renderGrid(filtered);
};

const openModal = (minister) => {
    if (!modal) return;

    modalElements.photo.src = minister.photo ?? "assets/placeholder-minister.svg";
    modalElements.photo.alt = minister.photoAlt ?? `Portrait de ${minister.name ?? "ministre"}`;
    modalElements.role.textContent = formatRole(minister.role);
    modalElements.title.textContent = minister.name ?? "Nom du ministre";
    modalElements.portfolio.textContent = minister.portfolio ?? "Portefeuille à préciser";
    modalElements.description.textContent = minister.description ?? "Ajoutez ici une biographie synthétique.";
    modalElements.mission.textContent = minister.mission ?? "Mission principale à renseigner.";
    modalElements.contact.textContent = minister.contact ?? "Contact prochainement disponible.";

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

const loadMinisters = async () => {
    grid.setAttribute("aria-busy", "true");
    try {
        const response = await fetch("data/ministers.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Impossible de charger les données (${response.status})`);
        const payload = await response.json();
        ministers = Array.isArray(payload) ? payload : [];
    } catch (error) {
        console.error("Erreur de chargement des ministres", error);
        ministers = [];
        emptyState.hidden = false;
        emptyState.textContent = "Impossible de charger les données. Vérifiez le fichier data/ministers.json.";
    }

    applyFilters();
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

modalBackdrop?.addEventListener("click", closeModal);
modalClose?.addEventListener("click", closeModal);
window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
        closeModal();
    }
});

loadMinisters();
