import { defineConfig } from 'vite'

export default defineConfig({
  // Pour domaine personnalisé, utilisez '/' comme base
  // Pour GitHub Pages standard, utilisez '/gouvernement_ultimedition/'
  base: '/',
  
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
