(function(){
    function createSearchBar(){
        try {
            if(document.getElementById('floating-search-bar')) return;
            const container = document.createElement('div');
            container.className = 'search-bar';
            container.id = 'floating-search-bar';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'search-btn';
            btn.id = 'search-toggle';
            btn.setAttribute('aria-label','Ouvrir la recherche');
            // Icon: magnifying glass SVG (author attribution: Ayub Irawan — Flaticon)
            // Source: https://www.flaticon.com/fr/icones-gratuites/loupe
            btn.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img"><title>Recherche</title><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

            const input = document.createElement('input');
            input.className = 'search-input';
            input.type = 'text';
            input.placeholder = 'Rechercher...';
            input.setAttribute('aria-label','Recherche');
            input.id = 'floating-search-input';

            container.appendChild(btn);
            container.appendChild(input);

            if (document.body) document.body.appendChild(container);
            else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(container));

            function open(){ container.classList.add('active'); setTimeout(()=> input.focus(), 120); }
            function close(){ container.classList.remove('active'); input.value = ''; }

            btn.addEventListener('click', (ev)=>{ ev.stopPropagation(); if(container.classList.contains('active')) close(); else open(); });

            document.addEventListener('click', (ev)=>{ if(!container.contains(ev.target)) close(); });

            input.addEventListener('keydown', (ev)=>{
                if(ev.key === 'Escape') close();
                if(ev.key === 'Enter') {
                    try{
                        const qRaw = String(input.value || '').trim();
                        const q = qRaw.toLowerCase();
                        if(!q) return;

                        // broaden selectors to cabinet nodes, minister names, delegates and common collab name classes
                        const nodes = Array.from(document.querySelectorAll('.cabinet-node, .cabinet-node-name, .collab-name, .minister-card h3, .delegate-name, .delegate-card, .collab-card'));
                        let firstMatch = null;

                        for (const n of nodes) {
                            const text = (n.textContent||'').toLowerCase();
                            if (!text.includes(q)) continue;

                            // find an enclosing element that might carry data-person-id / data-superior-id
                            const container = n.closest('[data-person-id], [data-superior-id], .minister-card, .collab-card, .cabinet-node');
                            if (container) {
                                // If collaborator element has a superior id, open the minister fiche
                                const superiorId = container.dataset && container.dataset.superiorId;
                                const personId = container.dataset && container.dataset.personId;
                                if (superiorId && typeof window.openMinisterById === 'function') {
                                    // open minister fiche for the superior
                                    window.openMinisterById(superiorId, { openModalIfFound: true });
                                    firstMatch = container;
                                    break;
                                }
                                // If element is a minister card (personId) open that minister fiche
                                if (personId && typeof window.openMinisterById === 'function') {
                                    window.openMinisterById(personId, { openModalIfFound: true });
                                    firstMatch = container;
                                    break;
                                }
                            }

                            // fallback: highlight and scroll to the matching node
                            const card = n.closest('.minister-card, .collab-card, .cabinet-node');
                            if (card) card.classList.add('layout-highlight');
                            if (!firstMatch) firstMatch = n;
                        }

                        if(firstMatch && typeof firstMatch.scrollIntoView === 'function') firstMatch.scrollIntoView({behavior:'smooth', block:'center'});
                        setTimeout(()=> document.querySelectorAll('.layout-highlight').forEach(el=>el.classList.remove('layout-highlight')), 2500);
                    } catch (e) { console.warn('floating search error', e); }
                }
            });

            if (typeof console !== 'undefined' && console.debug) console.debug('[ui] floating search created (standalone)');
        } catch (e) { if (typeof console !== 'undefined') console.error('[ui] createSearchBar failed', e); }
    }
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createSearchBar);
    else createSearchBar();
})();
