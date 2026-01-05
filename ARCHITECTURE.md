# Architecture Documentation - Gouvernement Lecornu II

## 1. Project Overview

### Scope and Outputs

The Gouvernement Lecornu II project is a static, data-driven frontend application that renders the organizational structure of the French government. The system generates:

- A searchable minister grid displaying all government members
- Detailed minister profile pages with biographies and portfolios
- Hierarchical cabinet structures showing relationships between ministers and staff
- A complete organizational chart of ministerial departments

The application is built as a fully static website with no runtime backend dependencies. All data is pre-compiled into JSON structures during the build process, ensuring deterministic output and enabling offline functionality.

### Non-Goals

This project explicitly does not:

- Provide a hosted backend or database service (no Supabase, no BaaS)
- Implement real-time data synchronization
- Support user authentication or personalization
- Generate dynamic content at request time
- Manage sensitive operational data (only public government information)

## 2. Architecture Summary

### High-Level Design

The system follows a **source-of-truth pattern** where structured data in Google Sheets is periodically synchronized to a Git repository, validated, transformed into JSON, and deployed as a static website.

```
Google Sheets (Source of Truth)
    ↓
GitHub Actions (Scheduled Sync)
    ↓
CSV Validation (Schema + Business Rules)
    ↓
JSON Generation (Normalized Data Model)
    ↓
Static Site Deployment (Vercel)
```

### Key Design Principles

**Local-First Architecture**: All data transformations occur at build time. The deployed site contains no external data dependencies and can function entirely offline once loaded.

**Determinism**: Given identical source data, the build process produces byte-for-byte identical outputs. This enables reliable cache invalidation and simplifies debugging.

**Auditability**: Every data change is recorded as a Git commit with full provenance tracking. The Google Sheets sync creates commits attributed to "Google Sheets Sync Bot" with detailed change metadata.

**Security-by-Default**: 
- No API keys or secrets in the frontend
- All output is statically generated and served read-only
- Content Security Policy compatible (no inline scripts required)
- Input validation at the data ingestion boundary

## 3. Repository Structure

```
Gouvernement_Lecornu-II/
├── .github/
│   └── workflows/
│       ├── sync-google-sheets.yml    # Automated data synchronization
│       ├── validate-pr.yml           # Pull request validation checks
│       └── deploy-github-pages.yml.disabled  # Legacy deployment (replaced by Vercel)
├── data/
│   └── ministers/
│       ├── index.json                # Minister manifest (generated)
│       └── *.json                    # Individual minister files (generated)
├── scripts/
│   ├── validators/
│   │   └── validate-csv.js           # Schema and integrity validation
│   └── csv-to-json.js                # Data transformation pipeline
├── docs/
│   ├── GOOGLE_SHEETS_SETUP.md        # Initial setup instructions
│   └── QUICK_START.md                # Contributor onboarding
├── assets/                           # Static resources (images, fonts)
├── styles/                           # CSS modules
├── index.html                        # Application entrypoint
├── script.js                         # Frontend logic
└── Serveur gouvernement - *.csv      # Source data (synced from Sheets)
```

**Directory Ownership**:

- `.github/workflows/`: Platform team (modify with review)
- `data/ministers/`: Generated files (do not edit manually)
- `scripts/validators/`: Data quality team
- `scripts/csv-to-json.js`: Build engineering
- `docs/`: Documentation maintainers (open contribution)
- Root CSV files: Synced automatically (edit in Google Sheets only)

## 4. Data Model and Conventions

### Core Entities

**Ministries**: Government departments with hierarchical relationships

- Required: `id` (UUID), `name`, `short_name`, `sort_order`
- Optional: `color` (hex), `superior_id` (parent ministry UUID)

**Persons**: Ministers and cabinet staff

- Required: `id` (UUID), `full_name`, `role`
- Role values: `president`, `leader`, `minister`, `minister-delegate`, `minister-state`, `secretary`, `collaborator`
- Optional: `party`, `superior_id`, `cabinet_role`, `photo_url`, `description`, `wikipedia`

**Person-Ministry Assignments**: Links persons to portfolios

- Required: `person_id`, `ministry_id`, `is_primary` (boolean), `role_label`
- Constraint: Each minister must have exactly one `is_primary=TRUE` assignment
- Collaborators (detected by `role_label` containing "Cabinet") exempt from `is_primary` requirement

**Person Careers**: Biography entries

- Required: `id` (UUID), `person_id`, `bio_section`, `title`, `display_order`
- Bio sections: `education`, `career`, `political`, `achievements`, `personal`
- Optional: `description`, `start_date`, `end_date`

### ID Conventions

All entity identifiers use **UUID v4 format** (e.g., `48f9e0ff-ae25-4cf8-8d61-f2c10497a5a9`).

IDs must be:
- Globally unique across all entity types
- Stable (never reused after deletion)
- Generated using a cryptographically secure random source

### Integrity Rules

1. **Referential Integrity**: All foreign key references (`person_id`, `ministry_id`, `superior_id`) must resolve to existing entities
2. **Acyclic Hierarchies**: The `superior_id` graph must form a DAG (no circular reporting structures)
3. **Primary Assignment**: Non-collaborator persons must have exactly one ministry with `is_primary=TRUE`
4. **Ordering Uniqueness**: Within a ministry's staff, `cabinet_order` values should be distinct (enforced as warning)

## 5. Data Editing Workflow

### Editing Process

All data modifications occur in the **canonical Google Sheets document** (ID: `1jlJPjC7nlc4awxSVq0ZVg2xJjQTq1X04b9fCmqWRjSM`).

The spreadsheet contains four worksheets:
- **Ministries**: Department definitions
- **Persons**: Individual records
- **Person_Ministries**: Portfolio assignments
- **Person_Careers**: Biography entries

**Critical Rule**: Never edit CSV or JSON files in the Git repository directly. Changes will be overwritten by the next synchronization cycle.

### Standard Modification Steps

1. Open the Google Sheets document
2. Navigate to the appropriate worksheet
3. Add, modify, or delete rows as needed
4. Verify data consistency (no missing UUIDs, valid references)
5. Save changes (auto-saved by Google Sheets)
6. Wait for automatic synchronization (every 2 hours) or trigger manually via GitHub Actions

### Manual Synchronization Trigger

```bash
# Via GitHub web interface:
# 1. Navigate to Actions tab
# 2. Select "Sync Google Sheets → Git" workflow
# 3. Click "Run workflow" button
# 4. Confirm execution

# Via GitHub CLI:
gh workflow run sync-google-sheets.yml
```

### Review and Approval

Changes synchronized from Google Sheets bypass pull request review as the sheet itself serves as the collaborative editing environment. However:

- Sheet access is controlled via Google Workspace permissions
- All sync commits are signed by "Google Sheets Sync Bot" for provenance
- Validation failures block commits and create GitHub Issues for investigation

For structural changes (schema modifications, new validation rules), standard pull request review is required.

## 6. Validation and Quality Gates

### Schema Validation

The `scripts/validators/validate-csv.js` module enforces structural correctness:

```javascript
// Required columns per entity type
const REQUIRED_COLUMNS = {
  ministries: ['id', 'name', 'short_name', 'sort_order'],
  persons: ['id', 'full_name', 'role'],
  personMinistries: ['person_id', 'ministry_id', 'is_primary', 'role_label'],
  careers: ['id', 'person_id', 'bio_section']
};
```

Validation checks:
- Column presence and naming
- UUID format compliance (`/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i`)
- Email format (if provided)
- URL structure (if provided)
- Empty cell normalization (Google Sheets exports empty cells as `"""`)

### Business Rule Validation

Beyond structural checks, semantic rules are enforced:

1. **Foreign Key Integrity**: All `person_id`, `ministry_id`, and `superior_id` references must resolve
2. **Primary Ministry Constraint**: Ministers (excluding collaborators) require one `is_primary=TRUE` assignment
3. **Hierarchy Acyclicity**: Depth-first search detects cycles in `superior_id` graphs
4. **Collaborator Detection**: Persons with `role_label` containing "Cabinet" are classified as staff (337 detected)

### CI Pipeline Checks

The `.github/workflows/sync-google-sheets.yml` workflow enforces:

```yaml
- name: Validate CSV
  run: node scripts/validators/validate-csv.js
  
- name: Convert to JSON
  run: node scripts/csv-to-json.js
  
- name: Verify JSON Schema
  run: node scripts/verify-json-structure.js  # (planned)
```

Failures at any stage halt the pipeline and prevent corrupt data from reaching production.

## 7. Security Model

### Threat Landscape

The static architecture eliminates entire classes of vulnerabilities:

- **No SQL Injection**: No database queries
- **No SSRF**: No server-side request generation
- **No Authentication Bypass**: No authentication system
- **No Session Hijacking**: No sessions

Remaining attack surfaces:

1. **Cross-Site Scripting (XSS)**: Malicious data injected into Google Sheets could execute in browsers if not properly escaped
2. **Data Integrity**: Unauthorized Google Sheets access could corrupt the dataset
3. **Supply Chain**: Compromised dependencies in the build pipeline

### Controls

**Output Encoding**: All dynamic content rendering uses text-safe methods:

```javascript
// Avoid: innerHTML with untrusted data
// element.innerHTML = minister.name;

// Prefer: textContent or setAttribute
element.textContent = minister.name;
element.setAttribute('data-id', minister.id);
```

**Input Validation**: The CSV validator rejects malformed input before it enters the build pipeline. This includes:
- Stripping or rejecting non-printable characters
- Validating URL schemes (http/https only)
- Email format enforcement

**Access Control**:
- Google Sheets editing requires explicit permission grants
- GitHub repository write access restricted to automation service accounts
- No API keys or secrets in the repository (all data is public government information)

**Dependency Management**:
- Lock file (`package-lock.json`) ensures reproducible builds
- Dependabot monitors for known vulnerabilities
- Regular dependency updates via scheduled PRs

### Policy Constraints

- No dynamic query construction (even though no database exists)
- No user-provided code execution (no template engines with code eval)
- All external resources (images, fonts) served with Subresource Integrity (SRI) hashes (planned)

## 8. Build, Run, and Deploy

### Local Development

**Prerequisites**:
- Node.js 20.x or later
- Git 2.x or later

**Start Development Server**:

```bash
# Clone repository
git clone https://github.com/benjaminboussemart74-design/gouvernement_ultimedition.git
cd gouvernement_ultimedition

# Install dependencies
npm install

# Run validation
npm run validate:csv

# Generate JSON data
npm run csv-to-json

# Start local server
python -m http.server 8000
# Or use any static file server
# npx serve .
# php -S localhost:8000
```

Navigate to `http://localhost:8000` to view the application.

### Build Process

The build is a two-step transformation:

```bash
# Step 1: Validate source data
node scripts/validators/validate-csv.js

# Step 2: Generate JSON artifacts
node scripts/csv-to-json.js
```

Output artifacts:
- `data/ministers/index.json`: Master index of all ministers
- `data/ministers/{slug}-{uuid}.json`: Individual minister files

### Deployment

**Automated Deployment** (Vercel + GitHub Actions):

```yaml
# .github/workflows/sync-google-sheets.yml
- name: Commit changes
  run: |
    git config user.name "Google Sheets Sync Bot"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add .
    git commit -m "sync: Mise à jour depuis Google Sheets"
    git push
```

Every successful sync triggers an automatic Vercel deployment (15-30 seconds).

**Manual Deployment**:

```bash
# Build artifacts locally
npm run build

# Commit changes (triggers Vercel auto-deploy)
git add data/ministers/
git commit -m "chore: rebuild data artifacts"
git push origin main

# Or deploy directly via Vercel CLI
vercel --prod
```

**Deployment Environments**:

- Production: `https://gouvernement-ultimedition.vercel.app`
- Preview: Automatic preview deployments for pull requests (Vercel)
- Staging: Branch-based deployments available on demand

## 9. Operational Guidance

### Versioning and Rollback

**Version Identification**:

Each deployment is uniquely identified by:
- Git commit SHA (e.g., `d47fd7c`)
- Sync timestamp in commit message (e.g., `2026-01-04T18:25:49+00:00`)

**Rollback Procedure**:

```bash
# Identify target commit
git log --grep="sync: Mise à jour" --oneline

# Create rollback commit
git revert <commit-sha>
git push origin main

# Or hard reset (destructive, use with caution)
git reset --hard <previous-commit-sha>
git push origin main --force
```

### Backup and Recovery

**Backup Sources**:

1. **Google Sheets**: Native version history (File > Version history)
2. **Git Repository**: Complete history of all data changes
3. **GitHub Release Tags**: Snapshots of known-good states (created manually)

**Recovery Scenarios**:

- **Corrupt sync**: Revert last commit, fix data in Sheets, re-sync
- **Data loss in Sheets**: Restore from Git by reversing the CSV export
- **Complete repository loss**: Clone from GitHub, data reconstructible from Sheets

### Monitoring and Logging

**GitHub Actions Logs**:

All synchronization runs produce detailed logs:
- CSV download results (HTTP status, file sizes)
- Validation output (pass/fail, error details)
- Conversion statistics (entity counts)
- Commit metadata (changed files, diff summary)

Access logs via: `https://github.com/benjaminboussemart74-design/gouvernement_ultimedition/actions`

**Error Notifications**:

Validation failures trigger:
- Workflow status badge update (README)
- GitHub Issue creation with error details (planned)
- Email notification to repository administrators (GitHub setting)

## 10. Contribution Guidelines

### Branching Strategy

- **main**: Production-ready code, protected branch
- **feature/**: New functionality (e.g., `feature/cabinet-hierarchy-view`)
- **fix/**: Bug corrections (e.g., `fix/email-validation-regex`)
- **docs/**: Documentation updates (e.g., `docs/update-architecture`)

### Commit Conventions

**Data Changes** (via Google Sheets sync):

```
sync: Mise à jour depuis Google Sheets

Synchronisation automatique effectuée le 2026-01-04T18:25:49+00:00

Fichiers synchronisés:
- ministries.csv
- persons.csv
- person_ministries.csv
- person_careers.csv

Source: Google Sheets (ID: 1jlJPjC7...)
Workflow: Sync Google Sheets → Git #12
```

**Code Changes** (manual commits):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
fix(validator): handle empty cells from Google Sheets export

Google Sheets exports empty cells as triple quotes ("""), which
breaks email and URL validation. Modified isEmpty() helper to
normalize these values to empty strings before validation.

Closes #42
```

### Adding a New Minister

1. **Open Google Sheets**: Navigate to "Persons" worksheet
2. **Generate UUID**: Use `uuidgen` (Linux/Mac) or an online generator
3. **Add Person Row**:
   ```
   id: <new-uuid>
   full_name: Prénom NOM
   role: minister
   party: <party-name>
   description: <short-bio>
   created_at: 2026-01-04T19:00:00+00:00
   updated_at: 2026-01-04T19:00:00+00:00
   ```
4. **Link to Ministry**: In "Person_Ministries" worksheet:
   ```
   person_id: <new-uuid>
   ministry_id: <ministry-uuid>
   is_primary: TRUE
   role_label: Ministre
   sort_order: 1
   ```
5. **Add Biography** (optional): In "Person_Careers" worksheet
6. **Trigger Sync**: Wait 2 hours or run workflow manually
7. **Verify**: Check GitHub Actions logs for validation results

### Adding a Cabinet Member (Collaborator)

Same process as minister, but:
- Set `role: collaborator`
- Set `superior_id: <minister-uuid>`
- Set `cabinet_role: "Conseiller diplomatique"` (or appropriate title)
- In "Person_Ministries", set `is_primary: FALSE`

## 11. Roadmap and Planned Improvements

### Near-Term (Q1 2026)

- **Stricter Schema Validation**: Migrate to JSON Schema or Zod for formal contract definition
- **Automated Testing**: Add unit tests for validation logic and edge cases
- **Preview Environments**: Per-PR preview deployments via Netlify/Vercel
- **Issue Auto-Creation**: Generate GitHub Issues for validation failures with actionable context

### Mid-Term (Q2-Q3 2026)

- **Visual Diff Tool**: Web interface to preview data changes before sync
- **Advanced Search**: Full-text search across biographies and portfolios
- **Accessibility Audit**: WCAG 2.1 AA compliance verification
- **Performance Optimization**: Lazy-load images, code splitting, service worker caching

### Long-Term (2026+)

- **Bidirectional Sync**: Allow Git-based edits to propagate back to Google Sheets (complex)
- **Multi-Language Support**: Internationalization for French/English content
- **API Generation**: REST API endpoints generated from static data for external consumers
- **Historical Timeline**: Interactive visualization of government composition changes over time

### Security Enhancements

- **Content Security Policy**: Strict CSP headers to prevent XSS
- **Subresource Integrity**: SRI hashes for all external resources
- **Dependency Scanning**: Automated vulnerability detection in CI pipeline
- **Data Sanitization**: HTML sanitization library for rich-text biography content

---

## Appendix A: Validation Error Reference

Common validation errors and resolutions:

**Error**: `Référence invalide vers persons.id: "e617d3ee-..."`
- **Cause**: Orphaned reference in Person_Ministries to deleted person
- **Fix**: Remove the corresponding row in Person_Ministries worksheet

**Error**: `Email invalide: "invalid@"`
- **Cause**: Malformed email address
- **Fix**: Correct the email format or leave cell empty

**Error**: `Cycle détecté dans la hiérarchie superior_id`
- **Cause**: Circular reporting structure (A reports to B, B reports to A)
- **Fix**: Break the cycle by correcting superior_id values

**Error**: `Personne doit avoir is_primary=TRUE pour au moins un ministère`
- **Cause**: Minister has no primary portfolio assignment
- **Fix**: Set is_primary=TRUE for one Person_Ministries row

---

## Appendix B: System Assumptions

This documentation assumes:

- **Hosting Target**: Public internet (GitHub Pages)
- **Validation Stack**: Node.js with custom validation logic
- **Deployment Target**: GitHub Pages with automated rebuilds
- **Editing Mode**: Google Sheets + automated PR creation via GitHub Actions

Modifications to these assumptions may require architecture adjustments.

---

**Last Updated**: 2026-01-04  
**Document Version**: 1.0  
**Maintained By**: Platform Engineering Team
