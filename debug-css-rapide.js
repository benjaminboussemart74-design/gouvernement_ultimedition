// Script de debug CSS rapide - coller dans la console
console.log('🔍 DEBUG CSS COLLABORATEURS');

// Trouver la section des collaborateurs
const modal = document.querySelector('.modal');
const collabSection = modal?.querySelector('.modal-collaborators');

if (!collabSection) {
    console.log('❌ Aucune section .modal-collaborators trouvée');
} else {
    console.log('✅ Section trouvée:', collabSection);

    // Vérifier les classes et styles
    console.log('📋 Classes:', collabSection.className);
    console.log('👁️ Display:', getComputedStyle(collabSection).display);
    console.log('👁️ Visibility:', getComputedStyle(collabSection).visibility);
    console.log('👁️ Opacity:', getComputedStyle(collabSection).opacity);

    // Vérifier si elle a is-hidden
    const hasHidden = collabSection.classList.contains('is-hidden');
    console.log('🚫 Classe is-hidden:', hasHidden);

    // Chercher les cartes collaborateurs
    const cards = collabSection.querySelectorAll('.collaborator-card, .cabinet-member');
    console.log('🃏 Cartes trouvées:', cards.length);

    if (cards.length > 0) {
        console.log('📄 Première carte:', cards[0].outerHTML.substring(0, 200) + '...');
    }

    // Test rapide : forcer l'affichage
    console.log('🔧 Test: Forcer display: block');
    collabSection.style.display = 'block';
    collabSection.style.visibility = 'visible';
    collabSection.style.opacity = '1';
    collabSection.classList.remove('is-hidden');

    console.log('✨ Si ça apparaît maintenant, c\'est un problème CSS !');
}