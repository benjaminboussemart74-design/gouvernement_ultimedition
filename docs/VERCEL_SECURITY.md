# 🔐 Sécurité Vercel - Configuration

## Headers HTTP de Sécurité

Configurés dans `vercel.json` pour protéger contre les attaques courantes.

### 1️⃣ X-Content-Type-Options: nosniff
**Protection** : Empêche les navigateurs de deviner le type MIME
**Risque bloqué** : Attaques basées sur le sniffing MIME

### 2️⃣ X-Frame-Options: DENY
**Protection** : Interdit l'intégration du site dans une iframe
**Risque bloqué** : Attaques clickjacking

### 3️⃣ X-XSS-Protection: 1; mode=block
**Protection** : Active le filtre XSS du navigateur
**Risque bloqué** : Cross-Site Scripting (XSS) basique

### 4️⃣ Referrer-Policy: strict-origin-when-cross-origin
**Protection** : Limite les informations de referrer envoyées
**Risque bloqué** : Fuite d'informations sensibles via URL

### 5️⃣ Permissions-Policy
**Protection** : Désactive les APIs du navigateur non nécessaires
**APIs bloquées** : caméra, microphone, géolocalisation

### 6️⃣ Content-Security-Policy (CSP)
**Configuration actuelle** :
```
default-src 'self'
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: https:
connect-src 'self'
```

**Protection** : Contrôle strict des ressources chargées
**Risque bloqué** : XSS, injection de scripts malveillants

⚠️ **Note** : `'unsafe-inline'` est temporaire pour les styles/scripts inline. À migrer vers nonces pour une sécurité maximale.

## Vérification des Headers

### Test en ligne
```bash
# Déployer les changements
git add vercel.json
git commit -m "security: Add HTTP security headers"
git push

# Attendre le déploiement automatique (~30 sec)
# Puis tester sur : https://securityheaders.com/
```

### Test local
```bash
# Démarrer le serveur de preview
npm run preview

# Dans un autre terminal
curl -I http://localhost:4173
```

## Variables d'Environnement

### ✅ Bonnes pratiques
- **Jamais** de secrets dans le code source
- **Toujours** utiliser les Environment Variables Vercel
- **Jamais** commit de fichiers `.env`

### Configuration sur Vercel

1. Ouvrir : https://vercel.com/benjaminboussemart74-designs-projects/gouvernement-ultimedition/settings/environment-variables

2. Ajouter les variables si nécessaire :
   ```
   VITE_PUBLIC_URL=https://gouvernement-ultimedition.vercel.app
   NODE_ENV=production
   ```

3. Ne **jamais** ajouter de clés API pour ce projet (site 100% statique)

## Protection DDoS

### Inclus par défaut avec Vercel :
- ✅ Rate limiting automatique
- ✅ Protection DDoS intégrée
- ✅ CDN avec cache intelligent
- ✅ Gzip/Brotli compression

## Monitoring de Sécurité

### Audit automatique pré-déploiement
```bash
npm run security
```

### Vérifications Vercel
1. **Build Logs** : https://vercel.com/dashboard/deployments
2. **Analytics** : https://vercel.com/analytics
3. **Speed Insights** : https://vercel.com/speed-insights

## Checklist de Déploiement Sécurisé

Avant chaque déploiement en production :

- [ ] ✅ `npm run security` passe sans erreur
- [ ] ✅ Aucun console.log en production
- [ ] ✅ Sourcemaps désactivées (sourcemap: false)
- [ ] ✅ Headers de sécurité configurés dans vercel.json
- [ ] ✅ Pas de secrets dans le code
- [ ] ✅ .env dans .gitignore
- [ ] ✅ Dependencies à jour (`npm audit`)

## Mise à Jour des Headers

Si vous devez modifier les headers de sécurité :

1. Éditer `vercel.json`
2. Tester localement avec `npm run preview`
3. Commit et push (déploiement automatique)
4. Vérifier sur https://securityheaders.com/

## Ressources

- [Vercel Security](https://vercel.com/docs/security)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Security Headers Checker](https://securityheaders.com/)

## Score de Sécurité Attendu

Avec cette configuration, vous devriez obtenir :
- **Security Headers** : A ou A+
- **SSL Labs** : A+ (géré par Vercel)
- **Mozilla Observatory** : B+ à A

---

**Dernière mise à jour** : 2026-01-05  
**Configuration testée avec** : Vercel CLI 50.1.3
