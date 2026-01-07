/**
 * ============================================================================
 * MODAL V3 - Système de modale accessible et modulaire
 * ============================================================================
 *
 * Architecture:
 * 1. FocusTrap - Gestion du focus clavier (Tab, Shift+Tab)
 * 2. ModalStateMachine - États de la modale (closed, opening, open, loading, error, closing)
 * 3. Data Fetching & Caching - Cache des données ministres
 * 4. Content Population - Injection du HTML
 * 5. Event Handlers - Gestionnaires d'événements
 * 6. Public API - Fonctions exportées (openMinisterModal, closeModal)
 *
 * @module modal-v3
 * @version 3.0.0
 */

// ============================================================================
// 1. FOCUS TRAP CLASS - Gestion du focus accessible
// ============================================================================

class FocusTrap {
    constructor(element) {
        this.element = element;
        this.focusableElements = [];
        this.firstFocusable = null;
        this.lastFocusable = null;
        this.previouslyFocusedElement = null;
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    /**
     * Met à jour la liste des éléments focusables
     */
    updateFocusableElements() {
        const focusableSelector = [
            'a[href]',
            'button:not([disabled])',
            'textarea:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(',');

        this.focusableElements = Array.from(
            this.element.querySelectorAll(focusableSelector)
        ).filter(el => {
            // Exclure les éléments cachés
            return el.offsetParent !== null &&
                   !el.hasAttribute('hidden') &&
                   el.getAttribute('aria-hidden') !== 'true';
        });

        this.firstFocusable = this.focusableElements[0] || null;
        this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;
    }

    /**
     * Gère la navigation au clavier (Tab/Shift+Tab)
     */
    handleKeydown(e) {
        if (e.key !== 'Tab') return;

        // Mettre à jour la liste au cas où le DOM aurait changé
        this.updateFocusableElements();

        if (this.focusableElements.length === 0) {
            e.preventDefault();
            return;
        }

        // Si on est sur le dernier élément et on appuie sur Tab
        if (e.target === this.lastFocusable && !e.shiftKey) {
            e.preventDefault();
            this.firstFocusable?.focus();
        }
        // Si on est sur le premier élément et on appuie sur Shift+Tab
        else if (e.target === this.firstFocusable && e.shiftKey) {
            e.preventDefault();
            this.lastFocusable?.focus();
        }
    }

    /**
     * Active le focus trap
     */
    activate() {
        this.previouslyFocusedElement = document.activeElement;
        this.updateFocusableElements();
        this.element.addEventListener('keydown', this.handleKeydown);
    }

    /**
     * Désactive le focus trap
     */
    deactivate() {
        this.element.removeEventListener('keydown', this.handleKeydown);
    }

    /**
     * Focus le premier élément focusable
     */
    focusFirst() {
        this.updateFocusableElements();
        if (this.firstFocusable) {
            this.firstFocusable.focus();
        }
    }

    /**
     * Restaure le focus à l'élément précédent
     */
    restoreFocus() {
        if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
            this.previouslyFocusedElement.focus();
        }
    }
}

// ============================================================================
// 2. MODAL STATE MACHINE - Gestion des états
// ============================================================================

const ModalState = {
    CLOSED: 'closed',
    OPENING: 'opening',
    OPEN: 'open',
    LOADING: 'loading',
    ERROR: 'error',
    CLOSING: 'closing'
};

class ModalStateMachine {
    constructor(element) {
        this.element = element;
        this.currentState = ModalState.CLOSED;
    }

    /**
     * Transition vers un nouvel état
     */
    transitionTo(newState) {
        const validTransitions = {
            [ModalState.CLOSED]: [ModalState.OPENING],
            [ModalState.OPENING]: [ModalState.LOADING, ModalState.OPEN, ModalState.ERROR, ModalState.CLOSING],
            [ModalState.LOADING]: [ModalState.OPEN, ModalState.ERROR, ModalState.CLOSING],
            [ModalState.OPEN]: [ModalState.LOADING, ModalState.CLOSING],
            [ModalState.ERROR]: [ModalState.CLOSING, ModalState.LOADING],
            [ModalState.CLOSING]: [ModalState.CLOSED]
        };

        const allowedStates = validTransitions[this.currentState] || [];

        if (!allowedStates.includes(newState)) {
            console.warn(`[ModalStateMachine] Transition invalide: ${this.currentState} → ${newState}`);
            return false;
        }

        this.currentState = newState;
        this.element.dataset.state = newState;
        return true;
    }

    /**
     * Vérifie si la modale est dans un état donné
     */
    is(state) {
        return this.currentState === state;
    }

    /**
     * Réinitialise l'état à CLOSED
     */
    reset() {
        this.currentState = ModalState.CLOSED;
        this.element.dataset.state = ModalState.CLOSED;
    }
}

// ============================================================================
// 3. DATA FETCHING & CACHING - Cache des données
// ============================================================================

const ministerCache = new Map();
const collaboratorsCache = new Map();

/**
 * Récupère les données d'un ministre (avec cache)
 */
async function fetchMinisterData(ministerId, ministerSlug) {
    if (ministerCache.has(ministerId)) {
        return ministerCache.get(ministerId);
    }

    // Construction de l'URL du fichier JSON
    const fileName = `${ministerSlug}-${ministerId}.json`;
    const url = `data/ministers/${fileName}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        ministerCache.set(ministerId, data);
        return data;
    } catch (error) {
        console.error(`[Modal] Erreur chargement ministre ${ministerId}:`, error);
        throw error;
    }
}

/**
 * Vide le cache (utile pour le développement)
 */
export function clearModalCache() {
    ministerCache.clear();
    collaboratorsCache.clear();
}

// ============================================================================
// 4. CONTENT POPULATION - Injection du HTML
// ============================================================================

/**
 * Échappe les caractères HTML pour éviter XSS
 */
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

/**
 * Assure une source d'image valide
 */
function ensureImageSource(value, fallback = "assets/placeholder-minister.svg") {
    if (!value || typeof value !== "string") return fallback;

    const trimmed = value.trim();
    if (!trimmed) return fallback;

    // URL absolue ou data URI
    if (/^(https?:)?\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
        return trimmed;
    }

    // Chemin relatif
    return trimmed || fallback;
}

/**
 * Remplit l'en-tête de la modale (photo, nom, rôle)
 */
function populateModalHeader(minister, modalElements) {
    // Photo
    modalElements.photo.src = ensureImageSource(minister.photo);
    modalElements.photo.alt = minister.photoAlt ?? `Portrait de ${minister.name ?? "ministre"}`;
    modalElements.photo.onerror = () => {
        modalElements.photo.onerror = null;
        modalElements.photo.src = "assets/placeholder-minister.svg";
    };

    // Nom
    modalElements.title.textContent = minister.name ?? "Nom du ministre";

    // Rôle/Portfolio
    let roleLabels = Array.isArray(minister.ministries)
        ? minister.ministries
              .map((entry) => (entry && typeof entry.roleLabel === 'string' ? entry.roleLabel.trim() : ''))
              .filter((v) => !!v)
        : [];

    // Préférer les labels primaires
    if (Array.isArray(minister.ministries)) {
        const primaries = minister.ministries
            .filter((e) => e && e.isPrimary && e.roleLabel)
            .map((e) => e.roleLabel.trim());
        const others = roleLabels.filter((rl) => !primaries.includes(rl));
        roleLabels = [...(primaries.length ? primaries : []), ...others];
    }

    const joinedRoleLabels = roleLabels.length
        ? Array.from(new Set(roleLabels.map((t) => t.toLowerCase())))
            .map((lower) => roleLabels.find((t) => t.toLowerCase() === lower))
            .join(' • ')
        : '';

    modalElements.portfolio.textContent = joinedRoleLabels || minister.portfolio || "Rôle à préciser";
}

/**
 * Remplit la description du ministre
 */
function populateModalDescription(minister, modalElements) {
    modalElements.description.textContent = minister.description ?? "Ajoutez ici une biographie synthétique.";
}

/**
 * Remplit la section biographie
 */
function populateBiographyModule(bioEntries, modal, accentColor = null) {
    const bioRoot = modal.querySelector('#modal-biography-root');
    const bioSection = modal.querySelector('.modal-module--biography');

    if (!bioRoot) return;

    if (!Array.isArray(bioEntries) || bioEntries.length === 0) {
        if (bioSection) bioSection.hidden = true;
        return;
    }

    // Grouper par bioSection
    const grouped = bioEntries.reduce((acc, entry) => {
        const section = entry.bioSection || 'other';
        if (!acc[section]) acc[section] = [];
        acc[section].push(entry);
        return acc;
    }, {});

    // Trier chaque groupe par sortIndex
    Object.keys(grouped).forEach(section => {
        grouped[section].sort((a, b) => (a.sortIndex || 999) - (b.sortIndex || 999));
    });

    // Générer le HTML
    bioRoot.innerHTML = '';

    const sectionOrder = ['Formation académique', 'Gouvernement', 'Mandats', 'Parcours', 'Réalisations', 'Personnel'];
    const sectionTitles = {
        'Formation académique': 'Formation',
        'Gouvernement': 'Gouvernement',
        'Mandats': 'Mandats électifs',
        'Parcours': 'Parcours professionnel',
        'Réalisations': 'Réalisations',
        'Personnel': 'Informations personnelles'
    };

    sectionOrder.forEach(sectionKey => {
        if (!grouped[sectionKey] || grouped[sectionKey].length === 0) return;

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'biography-group';

        const h5 = document.createElement('h5');
        h5.className = 'biography-group-title';
        h5.textContent = sectionTitles[sectionKey] || sectionKey;
        sectionDiv.appendChild(h5);

        const ul = document.createElement('ul');
        ul.className = 'biography-list';

        grouped[sectionKey].forEach(entry => {
            const li = document.createElement('li');
            li.className = 'biography-item';

            const title = document.createElement('strong');
            title.className = 'biography-item-title';
            title.textContent = entry.title || '';
            li.appendChild(title);

            if (entry.organization) {
                const org = document.createElement('span');
                org.className = 'biography-item-org';
                org.textContent = ` - ${entry.organization}`;
                li.appendChild(org);
            }

            if (entry.startDate || entry.endDate) {
                const period = document.createElement('span');
                period.className = 'biography-item-period';
                const start = entry.startDate ? new Date(entry.startDate).getFullYear() : '';
                const end = entry.ongoing ? "aujourd'hui" : (entry.endDate ? new Date(entry.endDate).getFullYear() : '');
                period.textContent = ` (${start}${end ? ' - ' + end : ''})`;
                li.appendChild(period);
            }

            ul.appendChild(li);
        });

        sectionDiv.appendChild(ul);
        bioRoot.appendChild(sectionDiv);
    });

    if (bioSection) bioSection.hidden = false;
}

/**
 * Remplit la section des ministres délégués
 */
function populateDelegatesSection(minister, modal, onDelegateClick) {
    const delegatesSection = modal.querySelector('.modal-module--delegates');
    const delegatesList = modal.querySelector('#modal-delegates');

    if (!delegatesSection || !delegatesList) return;

    // Si le ministre actuel EST un délégué, masquer la section
    const DELEGATE_ROLES = new Set(["minister-delegate", "ministre-delegue", "secretary"]);
    if (DELEGATE_ROLES.has(minister.role)) {
        delegatesSection.hidden = true;
        return;
    }

    // Récupérer les délégués liés
    let linkedDelegates = Array.isArray(minister.delegates) && minister.delegates.length
        ? minister.delegates.slice()
        : [];

    if (!linkedDelegates.length) {
        delegatesSection.hidden = true;
        return;
    }

    // Afficher la section et remplir la liste
    delegatesSection.hidden = false;
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
        dn.textContent = delegate.name || '';
        info.appendChild(dn);

        const dr = document.createElement('p');
        dr.className = 'delegate-role';
        dr.textContent = delegate.mission || delegate.portfolio || '';
        info.appendChild(dr);

        btn.appendChild(info);

        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            if (typeof onDelegateClick === 'function') {
                onDelegateClick(delegate);
            }
        });

        delegatesList.appendChild(btn);
    });
}

/**
 * Remplit tout le contenu de la modale
 */
async function populateModalContent(minister, modal, modalElements, onDelegateClick) {
    populateModalHeader(minister, modalElements);
    populateModalDescription(minister, modalElements);

    // Biographie
    try {
        const bioEntries = Array.isArray(minister.biography) ? minister.biography : [];
        populateBiographyModule(bioEntries, modal, minister.accentColor || null);
    } catch (error) {
        console.error('[Modal] Erreur population biographie:', error);
    }

    // Ministres délégués
    try {
        populateDelegatesSection(minister, modal, onDelegateClick);
    } catch (error) {
        console.error('[Modal] Erreur population délégués:', error);
    }
}

// ============================================================================
// 5. DOM ELEMENTS & INITIALIZATION - Initialisation
// ============================================================================

let modal = null;
let modalBackdrop = null;
let modalClose = null;
let modalElements = null;
let focusTrap = null;
let modalState = null;
let activeMinister = null;

/**
 * Initialise les références DOM
 */
function initModalElements() {
    modal = document.getElementById("minister-modal");
    if (!modal) {
        console.error('[Modal] Élément #minister-modal introuvable');
        return false;
    }

    modalBackdrop = modal.querySelector("[data-dismiss]");
    modalClose = modal.querySelector(".modal-close");

    modalElements = {
        photo: document.getElementById("modal-photo"),
        title: document.getElementById("modal-title"),
        portfolio: document.getElementById("modal-portfolio"),
        description: document.getElementById("modal-description"),
    };

    // Vérifier que tous les éléments existent
    const missingElements = Object.entries(modalElements)
        .filter(([key, el]) => !el)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error(`[Modal] Éléments manquants: ${missingElements.join(', ')}`);
        return false;
    }

    focusTrap = new FocusTrap(modal);
    modalState = new ModalStateMachine(modal);

    return true;
}

// ============================================================================
// 6. EVENT HANDLERS - Gestionnaires d'événements
// ============================================================================

/**
 * Ferme la modale
 */
export function closeModal() {
    if (!modal || !modalState) return;

    if (!modalState.is(ModalState.OPEN) && !modalState.is(ModalState.ERROR)) {
        return;
    }

    modalState.transitionTo(ModalState.CLOSING);

    // Désactiver le focus trap
    if (focusTrap) {
        focusTrap.deactivate();
        focusTrap.restoreFocus();
    }

    // Masquer la modale
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.classList.remove("modal--cabinet-active", "modal--cabinet-mode", "modal--has-collaborators");

    // Restaurer le scroll du body
    document.body.style.overflow = "";

    // Nettoyer
    activeMinister = null;

    // Transition finale vers CLOSED
    setTimeout(() => {
        if (modalState) {
            modalState.transitionTo(ModalState.CLOSED);
        }
    }, 300); // Attendre la fin de l'animation CSS
}

/**
 * Gère le clic sur le backdrop
 */
function handleBackdropClick(e) {
    if (e.target === modalBackdrop) {
        closeModal();
    }
}

/**
 * Gère la touche Escape
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape' && modalState && modalState.is(ModalState.OPEN)) {
        closeModal();
    }
}

/**
 * Attache les event listeners
 */
function attachEventListeners() {
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', handleBackdropClick);
    }

    document.addEventListener('keydown', handleEscapeKey);
}

// ============================================================================
// 7. PUBLIC API - Fonctions exportées
// ============================================================================

/**
 * Ouvre la modale pour un ministre donné
 *
 * @param {Object} minister - Objet ministre avec id, name, slug, etc.
 * @returns {Promise<void>}
 */
export async function openMinisterModal(minister) {
    if (!modal || !modalState || !focusTrap) {
        console.error('[Modal] Modal non initialisée. Appeler initModal() d\'abord.');
        return;
    }

    if (!minister || !minister.id) {
        console.error('[Modal] Ministre invalide:', minister);
        return;
    }

    try {
        // Transition vers OPENING
        modalState.transitionTo(ModalState.OPENING);

        // Activer le focus trap
        focusTrap.activate();

        // Afficher la modale
        modal.hidden = false;
        modal.removeAttribute("hidden");
        document.body.style.overflow = "hidden";

        // Transition vers LOADING
        modalState.transitionTo(ModalState.LOADING);

        // Charger les données du ministre si nécessaire
        let ministerData = minister;
        if (!minister.biography && minister.id && minister.slug) {
            ministerData = await fetchMinisterData(minister.id, minister.slug);
        }

        // Remplir le contenu
        await populateModalContent(
            ministerData,
            modal,
            modalElements,
            (delegate) => openMinisterModal(delegate) // Callback pour ouvrir un délégué
        );

        activeMinister = ministerData;

        // Transition vers OPEN
        modalState.transitionTo(ModalState.OPEN);

        // Focus le premier élément
        focusTrap.focusFirst();

    } catch (error) {
        console.error('[Modal] Erreur ouverture modale:', error);
        modalState.transitionTo(ModalState.ERROR);

        // Afficher un message d'erreur dans la modale
        if (modalElements.description) {
            modalElements.description.textContent = "Impossible de charger les données du ministre. Veuillez réessayer.";
        }
    }
}

/**
 * Initialise le système de modale
 * À appeler une fois au chargement de la page
 *
 * @returns {boolean} - true si l'initialisation a réussi
 */
export function initModal() {
    const success = initModalElements();
    if (success) {
        attachEventListeners();
        console.log('[Modal v3] Initialisée avec succès');
    } else {
        console.error('[Modal v3] Échec de l\'initialisation');
    }
    return success;
}

/**
 * Récupère l'état actuel de la modale
 */
export function getModalState() {
    return modalState ? modalState.currentState : null;
}

/**
 * Récupère le ministre actuellement affiché
 */
export function getActiveMinister() {
    return activeMinister;
}

// Export des états pour utilisation externe
export { ModalState };
