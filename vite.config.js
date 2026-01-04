import { defineConfig } from 'vite'

export default defineConfig({
  // Définit la base URL pour GitHub Pages
  // Remplacez 'gouvernement_ultimedition' par le nom exact de votre repository
  base: '/gouvernement_ultimedition/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Génère les sourcemaps pour le debug
    sourcemap: true,
  },
  
  // Configuration du serveur de développement
  server: {
    port: 3000,
    open: true,
  },
})
