// Script de debug pour les collaborateurs - à coller dans la console du navigateur

console.log('=== DEBUG COLLABORATEURS ===');

// 1. Vérifier si les données sont chargées
console.log('1. Vérification des données chargées:');
console.log('   - coreMinisters:', window.coreMinisters ? coreMinisters.length + ' ministres' : 'NON CHARGÉ');
console.log('   - delegateMinisters:', window.delegateMinisters ? delegateMinisters.length + ' ministres' : 'NON CHARGÉ');

// 2. Vérifier un ministre spécifique
const testMinister = coreMinisters?.[0];
console.log('2. Premier ministre de test:');
console.log('   - Nom:', testMinister?.name);
console.log('   - ID:', testMinister?.id);
console.log('   - Role:', testMinister?.role);
console.log('   - Collaborators (brut):', testMinister?.collaborators);
console.log('   - Nombre de collaborateurs:', testMinister?.collaborators?.length || 0);

// 3. Tester la fonction showCabinetInlineForMinister
console.log('3. Test de showCabinetInlineForMinister:');
if (testMinister) {
    console.log('   - Appel de showCabinetInlineForMinister...');
    showCabinetInlineForMinister(testMinister).then(() => {
        console.log('   - Fonction terminée');

        // 4. Vérifier le DOM et CSS
        console.log('4. Vérification du DOM et CSS:');
        const modal = document.querySelector('.modal');
        const collaboratorsSection = modal?.querySelector('.modal-collaborators');
        console.log('   - Modal trouvée:', !!modal);
        console.log('   - Section collaborateurs:', !!collaboratorsSection);

        if (collaboratorsSection) {
            console.log('   - Classes CSS de la section:', collaboratorsSection.className);
            console.log('   - Style display:', getComputedStyle(collaboratorsSection).display);
            console.log('   - Style visibility:', getComputedStyle(collaboratorsSection).visibility);
            console.log('   - Style opacity:', getComputedStyle(collaboratorsSection).opacity);
            console.log('   - A la classe is-hidden:', collaboratorsSection.classList.contains('is-hidden'));

            const collabCards = collaboratorsSection.querySelectorAll('.collaborator-card, .cabinet-member');
            console.log('   - Cartes collaborateurs trouvées:', collabCards.length);

            if (collabCards.length > 0) {
                console.log('   - Première carte - classes:', collabCards[0].className);
                console.log('   - Première carte - display:', getComputedStyle(collabCards[0]).display);
                console.log('   - Première carte - contenu HTML:', collabCards[0].innerHTML.substring(0, 100) + '...');
            }

            // Afficher les premiers noms
            const names = Array.from(collabCards).map(card => {
                const nameEl = card.querySelector('.collaborator-name, .member-name');
                return nameEl?.textContent?.trim();
            }).filter(Boolean);
            console.log('   - Noms affichés:', names.slice(0, 5));
        }

        // 5. Vérifier les styles appliqués
        console.log('5. Vérification des styles CSS:');
        const allModalCollaborators = document.querySelectorAll('.modal-collaborators');
        console.log('   - Nombre de sections .modal-collaborators:', allModalCollaborators.length);
        allModalCollaborators.forEach((section, index) => {
            console.log(`   - Section ${index + 1}: classes="${section.className}" display="${getComputedStyle(section).display}"`);
        });
    }).catch(error => {
        console.error('   - Erreur dans showCabinetInlineForMinister:', error);
    });
} else {
    console.log('   - Aucun ministre de test disponible');
}

// 6. Vérification des fonctions de rendu
console.log('6. Vérification des fonctions:');
console.log('   - renderCabinetSection existe:', typeof renderCabinetSection === 'function');
console.log('   - getCollaboratorGradeLookup existe:', typeof getCollaboratorGradeLookup === 'function');

// 7. Vérifier le cache
console.log('7. Cache collaborateurs:');
console.log('   - collaboratorsCache existe:', typeof collaboratorsCache !== 'undefined');
console.log('   - Taille du cache:', collaboratorsCache?.size || 0);

console.log('=== FIN DEBUG ===');