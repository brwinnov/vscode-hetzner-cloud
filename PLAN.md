# vscode-hetzner-cloud — Project Plan

> Last updated: 2026-03-01 (project renamed to Hetzner Cloud Toolkit)

---

## Project Overview

A VS Code extension for managing Hetzner Cloud infrastructure directly from the editor.  
Repo: `brwinnov/vscode-hetzner-cloud` (private)  
Language: TypeScript · Bundler: esbuild · Engine: VS Code ^1.85.0

---

## Architecture

```
src/
  api/            hetzner.ts          — typed REST client (native fetch, no deps)
  commands/       manageTokens.ts     — add/remove/switch/activate project
                  serverCommands.ts   — create/power/delete server
                  networkCommands.ts  — create/delete/refresh network
                  sshKeyCommands.ts   — add/delete SSH key
  providers/      setupProvider.ts    — SETUP tree view (onboarding tasks)
                  projectsProvider.ts — PROJECTS tree view (multi-project selector)
                  serversProvider.ts  — SERVERS tree view
                  networksProvider.ts — NETWORKS tree view
                  imagesProvider.ts   — IMAGES tree view
                  sshKeysProvider.ts  — SSH KEYS tree view
  tailscale/      authKeyManager.ts   — Tailscale auth key store
                  cloudInitInjector.ts — cloud-init Tailscale injection
  utils/          secretStorage.ts    — TokenManager (SecretStorage, multi-project)
  webviews/       serverWizard.ts     — 7-step server creation wizard
                  sshKeyGuide.ts      — SSH key generation guide (tabbed WebView)
  extension.ts    — activate/deactivate, wires all providers & commands
resources/
  Hetzner Cloud Toolkit.svg     — activity bar icon
```

---

## Completed Work

### Phase 1 — Repo & Scaffolding
- [x] Created private GitHub repo `brwinnov/vscode-hetzner-cloud`
- [x] GitHub CLI installed, authenticated via browser OAuth
- [x] PAT stored in Windows Credential Manager
- [x] Full TypeScript project scaffolded (esbuild, ESLint, Prettier, tsconfig)
- [x] `.vscode/launch.json` + `tasks.json` for F5 debug

### Phase 2 — Core Extension
- [x] `TokenManager` — SecretStorage, multi-project, CSV index, active project
- [x] `HetznerClient` — all CRUD: servers, networks, images, SSH keys, locations, server types
- [x] Four TreeView providers (servers, networks, images, SSH keys)
- [x] All commands registered, extension activates cleanly under F5

### Phase 3 — Server Creation Wizard
- [x] Replaced QuickPick flow with full 7-step WebView wizard (`serverWizard.ts`)
  - Steps: Basics → Server Type → OS Image → SSH Keys → Network → Cloud-init → Review
  - Sidebar step nav with ✓ badges
  - Tailscale toggle, loading overlay
- [x] Bug fix: SSH key "Add one" link (was `href="#"`, now `postMessage`)
- [x] Bug fix: Root password shown in modal after create (when no SSH key selected)
- [x] Bug fix: Network step — inline "+ Create Network" button, "Public IPv4 always on" row

### Phase 4 — Sidebar Restructure & Onboarding
- [x] `package.json` updated: 6 views (setup, projects, servers, networks, images, sshKeys)
- [x] New commands: `refreshProjects`, `removeProject`, `activateProject`, `deleteNetwork`, `sshKeyGuide`
- [x] `SetupProvider` — onboarding task list (API key, SSH key guide, Tailscale key)
- [x] `ProjectsProvider` — lists all projects, active shown first with ✓ icon, click to switch
- [x] `SshKeyGuidePanel` — tabbed WebView (Windows, macOS, WSL, Linux/RHEL, Why SSH Keys?, Why Ed25519?)
- [x] `extension.ts` updated — registers setup/projects views, sshKeyGuide command
- [x] `manageTokens.ts` updated — new providers in refreshAll(), first-use SSH guide prompt, activateProject/removeProject/refreshProjects commands
- [x] `networkCommands.ts` — `deleteNetwork` command added with confirm dialog

### Phase 5 — SSH Key Guide Content
- [x] Added "Why Ed25519?" tab explaining:
  - `-t` flag meaning (type/algorithm)
  - Ed25519 origin (Curve25519, Daniel J. Bernstein, 2^255-19)
  - Algorithm comparison table (Ed25519, RSA 4096, RSA 2048, ECDSA, DSA)
  - Tool compatibility table (OpenSSH, PuTTY, Bitvise, WinSCP, VS Code Remote SSH)
  - File format vs algorithm distinction (.ppk vs OpenSSH PEM)
  - Both command variants with guidance on when to choose each

### Phase 6 — Marketplace Assets
- [x] `README.md` — full marketplace page (features, getting started, settings, privacy)
- [x] `CHANGELOG.md` — Keep a Changelog format, v0.1.0 entry
- [x] `LICENSE` — MIT
- [x] `resources/icon.png` — 128×128 PNG (Hetzner red background, white cloud + network nodes)
- [x] `package.json` — added `license`, `homepage`, `repository`, `bugs`, `galleryBanner` fields

### Phase 7 — Project Rename
- [x] Renamed from `HetzNet` to `Hetzner Cloud Toolkit` throughout all source files
- [x] npm package name: `vscode-hetzner-cloud` (was `hetznet-ext`)
- [x] All command/view/config/SecretStorage key prefixes: `hcloud.` (was `hetznet.`)
- [x] GitHub repo renamed: `brwinnov/vscode-hetzner-cloud` (was `brwinnov/vscode-hetzner-cloud`)
- [x] Git remote updated to new repo URL
- [x] All markdown files updated

---

## In Progress

_Nothing currently in flight._

---

## Backlog / Next Steps

### Near-term
- [ ] **Tailscale key command** — `Hetzner Cloud Toolkit.setTailscaleKey` exists in extension.ts but `TailscaleAuthKeyManager.promptAndSave()` needs verification it stores and retrieves correctly
- [ ] **Server power state refresh** — after power on/off/reboot, auto-refresh servers tree
- [ ] **Network subnets** — SubnetItem in networksProvider; add/remove subnet commands
- [ ] **SSH key import from wizard** — after "Add SSH Key" in wizard, newly added key should auto-select in the wizard step

### Medium-term
- [ ] **Server detail WebView** — click a server to open a panel with full details (IPs, specs, status, console link)
- [ ] **Cloud-init library** — save/load named cloud-init templates in SecretStorage
- [ ] **Status polling** — poll server status every N seconds while in "initializing" state, update tree icon

### Long-term / Nice-to-have
- [ ] **Firewall rules** — Hetzner Firewall CRUD
- [ ] **Volumes** — block storage attach/detach
- [ ] **Load balancers** — basic CRUD
- [ ] **Extension marketplace packaging** — `vsce package` to produce .vsix, then `vsce publish` (assets now ready)

---

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02 | No external runtime dependencies | Keep bundle small; native `fetch` available in Node 18+ |
| 2026-02 | SecretStorage for tokens (not workspace settings) | Tokens are sensitive; SecretStorage is encrypted per-user |
| 2026-02 | WebView wizard over QuickPick for server creation | Complex multi-step form with interdependencies needs proper UI |
| 2026-02 | esbuild over webpack/tsc | Faster builds, simpler config for single-file output |
| 2026-03 | Recommend Ed25519 but show RSA 4096 as alternative | Ed25519 is best practice; RSA needed for PuTTY/enterprise compat |
| 2026-03-01 | Renamed to `Hetzner Cloud Toolkit`, prefix `hcloud`, repo `vscode-hetzner-cloud` | "Hetzner Cloud" is user's search term; "Toolkit" signals unofficial third-party tool; `hcloud` matches Hetzner's own CLI shorthand |
| 2026-03 | PLAN.md maintained as living log | Track progress and decisions across sessions |

---

## Commit History (recent)

```
668f27c  feat: add 'Why Ed25519?' tab to SSH key guide
ce9a09a  feat: SETUP/PROJECTS panels, SSH key guide, network delete, first-use onboarding
48e7823  feat: server wizard bug fixes (SSH add, root password modal, inline network create)
...
```
