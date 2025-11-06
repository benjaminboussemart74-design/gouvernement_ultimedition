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
            btn.innerHTML = '<span aria-hidden="true">🔍</span>';

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
                        const q = String(input.value || '').trim().toLowerCase();
                        if(!q) return;
                        const nodes = Array.from(document.querySelectorAll('.collab-name, .minister-card h3, .collab-meta .collab-name'));
                        let first = null;
                        nodes.forEach(n => {
                            const text = (n.textContent||'').toLowerCase();
                            if(text.includes(q)){
                                const card = n.closest('.minister-card, .collab-card');
                                if(card) card.classList.add('layout-highlight');
                                if(!first) first = n;
                            }
                        });
                        if(first && typeof first.scrollIntoView === 'function') first.scrollIntoView({behavior:'smooth', block:'center'});
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
