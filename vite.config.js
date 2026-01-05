import { defineConfig } from 'vite'

export default defineConfig({
  // Pour domaine personnalisé, utilisez '/' comme base
  // Pour GitHub Pages, utilisez le nom du repository
  base: '/gouvernement_ultimedition/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Désactivé en production pour la sécurité
    sourcemap: false,
  },
  
  // Configuration du serveur de développement
  server: {
    port: 3000,
    open: true,
  },
})
