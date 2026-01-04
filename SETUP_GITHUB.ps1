# Script de configuration GitHub
# Exécutez ce script pour pousser votre code

Write-Host "🚀 Configuration GitHub pour Gouvernement Lecornu II" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Git est installé
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git n'est pas installé. Téléchargez-le sur https://git-scm.com" -ForegroundColor Red
    exit 1
}

# Demander l'URL du dépôt GitHub
Write-Host "📋 Créez d'abord votre dépôt sur https://github.com/new" -ForegroundColor Yellow
Write-Host ""
$repoUrl = Read-Host "Collez l'URL de votre dépôt GitHub (ex: https://github.com/username/repo.git)"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "❌ URL invalide" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Initialisation Git..." -ForegroundColor Green

# Initialiser Git si nécessaire
if (-not (Test-Path ".git")) {
    git init
    Write-Host "✅ Git initialisé" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Git déjà initialisé" -ForegroundColor Blue
}

# Ajouter tous les fichiers
Write-Host "📁 Ajout des fichiers..." -ForegroundColor Green
git add .

# Commit
Write-Host "💾 Création du commit..." -ForegroundColor Green
git commit -m "feat: Configuration initiale avec sync Google Sheets"

# Vérifier si remote existe déjà
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "⚠️  Remote 'origin' existe déjà: $existingRemote" -ForegroundColor Yellow
    $overwrite = Read-Host "Voulez-vous le remplacer? (o/n)"
    if ($overwrite -eq "o") {
        git remote remove origin
        git remote add origin $repoUrl
        Write-Host "✅ Remote mis à jour" -ForegroundColor Green
    }
} else {
    git remote add origin $repoUrl
    Write-Host "✅ Remote configuré" -ForegroundColor Green
}

# Pousser vers GitHub
Write-Host "📤 Push vers GitHub..." -ForegroundColor Green
git branch -M main
git push -u origin main

Write-Host ""
Write-Host "✅ Code poussé avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "🔑 PROCHAINE ÉTAPE:" -ForegroundColor Cyan
Write-Host "1. Allez sur votre dépôt GitHub" -ForegroundColor White
Write-Host "2. Settings > Secrets and variables > Actions" -ForegroundColor White
Write-Host "3. New repository secret" -ForegroundColor White
Write-Host "4. Name: GOOGLE_SHEET_ID" -ForegroundColor White
Write-Host "5. Secret: 1jlJPjC7nlc4awxSVq0ZVg2xJjQTq1X04b9fCmqWRjSM" -ForegroundColor Yellow
Write-Host "6. Add secret" -ForegroundColor White
Write-Host ""
Write-Host "Puis testez dans Actions > Sync Google Sheets → Run workflow" -ForegroundColor Cyan
