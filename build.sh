#!/bin/bash
# Script de build pour Vercel - corrige les permissions

# Donner les permissions d'exécution aux binaires
chmod +x node_modules/.bin/* 2>/dev/null || true

# Lancer le build Vite
npm run build
