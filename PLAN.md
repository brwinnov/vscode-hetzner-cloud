# vscode-hetzner-cloud — Project Plan

> Last updated: 2026-03-02 (Phase 32)

---

## Project Overview

A VS Code extension for managing Hetzner Cloud infrastructure directly from the editor.  
Repo: `brwinnov/vscode-hetzner-cloud` (private)  
Language: TypeScript · Bundler: esbuild · Engine: VS Code ^1.85.0

> Branch state: currently on `fix/onboarding-setup-ux` (ahead of `master` with post-Phase-31 fixes).

---

## Architecture

```
src/
  api/            hetzner.ts              — typed REST client (native fetch, no deps)
                  robot.ts                — Hetzner Robot API client (HTTP Basic Auth)
  commands/       manageTokens.ts         — add/remove/switch/activate project
                  serverCommands.ts       — create/power/delete server
                  networkCommands.ts      — create/delete/subnet mgmt
                  sshKeyCommands.ts       — add/delete SSH key
                  firewallCommands.ts     — firewall + rule CRUD, apply/remove
                  volumeCommands.ts       — volume create/attach/detach/resize/delete
                  storageBoxCommands.ts   — Robot storage box list, mount, cloud-init
                  loadBalancerCommands.ts — LB create/delete/add target/remove target
  providers/      setupProvider.ts        — SETUP tree view (onboarding tasks)
                  projectsProvider.ts     — PROJECTS tree view (multi-project selector)
                  serversProvider.ts      — SERVERS tree view (with status polling)
                  networksProvider.ts     — NETWORKS tree view (with subnets)
                  imagesProvider.ts       — IMAGES tree view
                  sshKeysProvider.ts      — SSH KEYS tree view
                  firewallsProvider.ts    — FIREWALLS tree view (rules as children)
                  volumesProvider.ts      — VOLUMES tree view
                  storageBoxProvider.ts   — STORAGE BOXES tree view
                  loadBalancersProvider.ts — LOAD BALANCERS tree view
  tailscale/      authKeyManager.ts       — Tailscale auth key store
                  cloudInitInjector.ts    — cloud-init Tailscale injection
  utils/          secretStorage.ts        — TokenManager, RobotCredentialManager,
                                            StorageBoxPasswordManager, CloudInitLibrary
                  storageBoxInjector.ts   — CIFS mount cloud-init injector
  webviews/       serverWizard.ts         — 7-step server creation wizard
                  serverDetail.ts         — server detail panel (actions, specs, labels)
                  sshKeyGuide.ts          — SSH key generation guide (tabbed WebView)
                  welcomePage.ts          — welcome/overview page (auto-opens on first install)
  extension.ts    — activate/deactivate, wires all providers & commands
resources/
  hcloud.svg      — activity bar icon
  icon.png        — marketplace icon (128×128)
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

### Phase 8 — Repo Hygiene & Public Docs
- [x] Security audit — all secrets confirmed in OS-encrypted SecretStorage, zero hardcoded credentials, HTTPS-only API, git history clean
- [x] `PLAN.md` untracked from git (added to `.gitignore`), kept locally as AI memory
- [x] `ROADMAP.md` created — public-facing, Mermaid mindmap + architecture graph + Gantt chart, backlog tables
- [x] Committed `bed69c3` — repo is ready to go public

### Phase 21 — Load Balancers (2026-03-01)
- [x] `hetzner.ts` — added `HLoadBalancerType` and `HLoadBalancer` interfaces (`id`, `name`, `public_net`, `location`, `load_balancer_type`, `algorithm`, `services[]`, `targets[]`, `created`, `labels`); added 8 API methods: `getLoadBalancerTypes`, `getLoadBalancers`, `getLoadBalancer`, `createLoadBalancer(name, type, location, algorithm)`, `deleteLoadBalancer`, `addLoadBalancerTarget(lbId, serverId, usePrivateIp?)`, `removeLoadBalancerTarget(lbId, serverId)`
- [x] `loadBalancersProvider.ts` — `LoadBalancerItem` (collapsible, `$(broadcast)` blue, `N targets · M services` description, full tooltip); `LBTargetItem` (leaf, `$(vm)` green for server / `$(tag)` yellow for label_selector / `$(remote)` orange for IP, contextValue `lb-target`); `LBServiceItem` (leaf, `$(globe)` or `$(plug)` purple, shows `PROTO :listenPort → :dstPort`, contextValue `lb-service`); `LoadBalancersProvider` with `paginateList`-backed `getLoadBalancers`
- [x] `loadBalancerCommands.ts` — registered 5 commands:
  - `hcloud.createLoadBalancer` — name InputBox; type QuickPick from `getLoadBalancerTypes()` (shows max targets/connections/services as detail); location QuickPick from `getLocations()`; algorithm QuickPick (Round Robin / Least Connections); `withProgress` + error handling
  - `hcloud.deleteLoadBalancer` — confirm modal + `withProgress`
  - `hcloud.addLoadBalancerTarget` — fetches servers, filters out already-targeted server IDs, QuickPick of remaining servers; `withProgress`
  - `hcloud.removeLoadBalancerTarget` — confirm modal (guards on `type === 'server'`); `withProgress`
  - `hcloud.refreshLoadBalancers`
- [x] `extension.ts` — imported `LoadBalancersProvider` and `registerLoadBalancerCommands`; wired `hcloud.loadBalancers` tree view; added `loadBalancersProvider` arg to `registerTokenCommands`; called `registerLoadBalancerCommands`
- [x] `manageTokens.ts` — added `LoadBalancersProvider` import + param; added `loadBalancersProvider.refresh()` to `refreshAll()`
- [x] `package.json` — added `hcloud.loadBalancers` view (after Storage Boxes); registered all 5 commands with icons; `view/title`: create + refresh; `view/item/context`: `loadbalancer` → addTarget + delete; `lb-target` → removeTarget

### Phase 20 — Code Review v0003 Bug Fixes (2026-03-01)
- [x] **BUG-6** — Added `FirewallsProvider` and `VolumesProvider` imports + params to `registerTokenCommands` in `manageTokens.ts`; added `firewallsProvider.refresh()` and `volumesProvider.refresh()` to `refreshAll()`; updated call-site in `extension.ts` to pass both providers — firewalls and volumes trees now stay in sync after project switches
- [x] **BUG-7** — Fixed `createNetwork` case in `serverWizard.ts`: replaced `await this.loadAndRender()` (which discarded all wizard state) with a targeted re-fetch + `postMessage({ command: 'networksUpdated', networks })` flow; changed `const NETWORKS` → `let NETWORKS` in webview JS; added `networksUpdated` message handler that updates the array and calls `renderNetworks()` — user's server name, type, image, SSH keys, cloud-init etc. are fully preserved
- [x] **BUG-8** — Rewrote `deleteFirewallRule` in `firewallCommands.ts` to match the target rule by content (protocol + direction + port + source_ips + destination_ips via `JSON.stringify`) instead of by cached array index — eliminates silent wrong-rule deletion when another client adds/removes rules between tree refresh and delete click
- [x] **ISSUE-7** — Migrated `CloudInitLibrary` from `vscode.SecretStorage` (OS keychain, ~256KB per-entry size limit) to `vscode.Memento` (`context.globalState`): constructor now takes `vscode.Memento`; `listTemplates()` and `loadTemplate()` are now synchronous (`state.get`); `saveTemplate()` and `deleteTemplate()` use `state.update()`; removed CSV index string serialisation (now stored as `string[]`); updated `serverWizard.ts` to pass `context.globalState` instead of `context.secrets`
- [x] **ISSUE-8** — Replaced hardcoded `VOLUME_LOCATIONS` constant in `volumeCommands.ts` with a dynamic `client.getLocations()` call at the start of `hcloud.createVolume`; QuickPick now shows `{ label: l.name, description: l.city }` entries — new Hetzner datacenters appear automatically without extension updates
- [x] **MINOR-6** — Changed `statusColor()` in `serverDetail.ts` from hardcoded hex values (`#4caf50`, `#f44336`, `#ff9800`) to VS Code semantic CSS tokens (`var(--vscode-testing-iconPassed/Failed/Queued)`); updated badge CSS to use `color-mix(in srgb, ${color} 13%, transparent)` for background and `color-mix(in srgb, ${color} 40%, transparent)` for border — status badge now adapts correctly to light and dark themes
- [x] **MINOR-7** — Already resolved: `escHtml()` helper and `row()` function in `serverDetail.ts` already escape all API-sourced strings; `s.name`, label keys/values, and image descriptions are all passed through `escHtml()` before HTML interpolation

### Phase 19 — Storage Box Management (2026-03-01)
- [x] `src/api/robot.ts` — `RobotClient(username, password)` with HTTP Basic Auth (separate from Cloud API); `HStorageBox` interface; `getStorageBoxes()` (maps `[{storagebox}]`); `getStorageBox(id)`
- [x] `src/utils/storageBoxInjector.ts` — `StorageBoxMount` interface (`login`, `server`, `password`, `mountName`); `injectStorageBoxMounts(cloudInit, mounts)` section-aware YAML merger (packages/write_files/mounts/runcmd); `injectItems()` generic section injector; `generateMountScript()` bash script using `printf` credentials file (`/etc/cifs-credentials/<login>` 0600) + CIFS fstab entry
- [x] `src/utils/secretStorage.ts` — added `RobotCredentialManager` (stores Robot username/password in VS Code SecretStorage; `getClient()` returns `RobotClient | null`); added `StorageBoxPasswordManager` (per-box CIFS passwords keyed `hcloud.storagebox.pwd.<login>`)
- [x] `src/providers/storageBoxProvider.ts` — `StorageBoxItem` (`$(database)` icon, `contextValue = 'storagebox'`, tooltip with login/hostname/disk/protocols/expiry); `StorageBoxProvider` (prompt link when no Robot creds)
- [x] `src/commands/storageBoxCommands.ts` — 5 commands + `promptStorageBoxMounts` shared helper:
  - `hcloud.setRobotCredentials` — InputBox username + password, validates by calling `getStorageBoxes()`, saves via `RobotCredentialManager`, refreshes provider
  - `hcloud.clearRobotCredentials` — confirm + clear + refresh
  - `hcloud.refreshStorageBoxes`
  - `hcloud.mountStorageBoxToServer` — QuickPick server; InputBox mount name; check/prompt CIFS password (offer to save); `generateMountScript()`; copy to clipboard; open SSH terminal
  - `hcloud.copyStorageBoxMountCommands` — same but clipboard only (no terminal)
  - `promptStorageBoxMounts()` — exported shared helper used by wizard and commands: multi-select boxes, prompt per-box mount name + password, return `StorageBoxMount[]`
- [x] `src/webviews/serverWizard.ts` — added `robotCredManager` + `boxPwdManager` params to constructor + `create()`; `requestStorageBoxMounts` message case (calls `promptStorageBoxMounts`, injects via `injectStorageBoxMounts`, posts `cloudInitTemplateLoaded`); "📦 Mount Storage Boxes" button in step 5; `requestStorageBoxMounts()` JS function
- [x] `src/commands/serverCommands.ts` — updated signature to accept + forward `robotCredManager` + `boxPwdManager` to `ServerWizardPanel.create()`
- [x] `src/extension.ts` — added `RobotCredentialManager`, `StorageBoxPasswordManager`, `StorageBoxProvider`, `registerStorageBoxCommands`; `hcloud.storageBoxes` tree view
- [x] `package.json` — `hcloud.storageBoxes` view; 5 commands; `view/title`: set credentials + refresh; `view/item/context`: mount to server + copy commands

### Phase 18 — Volumes (2026-03-01)
- [x] `hetzner.ts` — added `HVolume` interface (id, name, size, status, server|null, location, linux_device, format|null, created, labels); added 6 API methods: `getVolumes`, `createVolume(name, size, location, format, automount, serverId?)`, `deleteVolume`, `attachVolume(automount)`, `detachVolume`, `resizeVolume`
- [x] `volumesProvider.ts` — `VolumeItem`: `$(database)` green when attached, `$(circle-outline)` yellow when detached; `contextValue` = `volume-attached` | `volume-detached`; tooltip shows size, format, device path, location, attached server id; `VolumesProvider` with paginated `getVolumes`
- [x] `volumeCommands.ts` — registered 6 commands:
  - `hcloud.createVolume` — name, size (10–10240 GB), location QuickPick, format QuickPick (ext4/xfs), attach-now QuickPick; if attach selected shows servers filtered to same location, automount=true if attaching
  - `hcloud.deleteVolume` — blocks if still attached; confirm modal + `deleteVolume`
  - `hcloud.attachVolume` — QuickPick of same-location servers + automount QuickPick
  - `hcloud.detachVolume` — confirm modal
  - `hcloud.resizeVolume` — InputBox validates new size > current, modal confirm; shows post-resize filesystem reminder (`resize2fs`)
  - `hcloud.refreshVolumes`
- [x] `extension.ts` — imported `VolumesProvider` and `registerVolumeCommands`; wired `hcloud.volumes` tree view
- [x] `package.json` — added `hcloud.volumes` view; registered all 6 commands; `view/title` create + refresh; `view/item/context`: detached → attach + resize + delete; attached → detach + resize

### Phase 17 — Firewall Rules (2026-03-01)
- [x] `hetzner.ts` — added `HFirewallRule` interface (direction, protocol, port?, source_ips, destination_ips, description?) and `HFirewall` interface (id, name, rules, applied_to, created); added 7 API methods: `getFirewalls`, `getFirewall`, `createFirewall`, `deleteFirewall`, `setFirewallRules`, `applyFirewallToServer`, `removeFirewallFromServer`
- [x] `firewallsProvider.ts` — `FirewallItem` (collapsible, `$(shield)`, shows `N rules · M servers`); `RuleItem` (leaf, directional arrow icon green/blue, shows `↓ TCP:22 · 0.0.0.0/0`); `FirewallsProvider` with paginated `getFirewalls`
- [x] `firewallCommands.ts` — registered 7 commands:
  - `hcloud.createFirewall` — prompts name, QuickPick default/empty rule set; if default, optionally adds Tailscale UDP 41641 rule when a key is configured; default set: SSH TCP 22, HTTP TCP 80, HTTPS TCP 443, ICMP/Ping
  - `hcloud.deleteFirewall` — confirm modal
  - `hcloud.addFirewallRule` — multi-step: direction QuickPick, protocol QuickPick, port InputBox (TCP/UDP only, supports ranges), IP InputBox, optional description; re-fetches rules, appends, `setFirewallRules`
  - `hcloud.deleteFirewallRule` — confirm + re-fetch + filter-by-index + `setFirewallRules`
  - `hcloud.applyFirewallToServer` — QuickPick unattached servers; `applyFirewallToServer`
  - `hcloud.removeFirewallFromServer` — QuickPick currently applied servers (fetches names); `removeFirewallFromServer`
  - `hcloud.refreshFirewalls`
- [x] `extension.ts` — imported `FirewallsProvider` and `registerFirewallCommands`; wired up `hcloud.firewalls` tree view; called `registerFirewallCommands(context, tokenManager, tailscaleKeyManager, firewallsProvider)`
- [x] `package.json` — added `hcloud.firewalls` view (after SSH Keys); registered all 7 commands with icons; added `view/title` entries (create + refresh for firewalls view); `view/item/context` entries: `firewall` → addRule, apply, removeFrom, delete; `firewall-rule` → deleteRule

### Phase 16 — Cloud-init Template Library (2026-03-01)
- [x] `secretStorage.ts` — added `CloudInitLibrary` class: `TEMPLATE_INDEX_KEY = 'hcloud.cloudInit.index'`, `TEMPLATE_KEY_PREFIX = 'hcloud.cloudInit.'`; methods: `listTemplates()`, `saveTemplate(name, content)`, `loadTemplate(name)`, `deleteTemplate(name)` — same CSV index pattern as `TokenManager`
- [x] `serverWizard.ts` — imported `CloudInitLibrary`; added `private readonly library` field to constructor; `create()` passes `new CloudInitLibrary(context.secrets)` 
- [x] `handleMessage` — added three new cases: `saveCloudInitTemplate` (prompts for name, saves via library), `loadCloudInitTemplate` (QuickPick of saved names, posts `cloudInitTemplateLoaded` back to webview), `deleteCloudInitTemplate` (QuickPick + confirm dialog + delete)
- [x] Step 5 HTML — added three small buttons below the `<textarea>`: “&#128190; Save as Template”, “&#128194; Load Template”, “&#128465; Delete Template”
- [x] Webview JS — added `saveCloudInitTemplate()`, `loadCloudInitTemplate()`, `deleteCloudInitTemplate()` functions; added `cloudInitTemplateLoaded` message handler that sets `cloudInitInput.value` and `state.cloudInit`

### Phase 15 — Status Polling (2026-03-01)
- [x] Added `TRANSIENT_STATES` constant set (`initializing | starting | stopping | rebuilding | migrating | deleting`) and `POLL_INTERVAL_MS = 3000` to `serversProvider.ts`
- [x] `ServerItem` icon updated: transient state → `$(sync~spin)` orange; `running` → `vm-running` green; `off` → `vm` red; `contextValue = 'server-transitioning'` for transient (action buttons remain disabled during transitions)
- [x] `ServersProvider` now implements `vscode.Disposable`; `dispose()` clears pending timer and disposes `EventEmitter`
- [x] `_schedulePoll()` — stacks-safe single-timer scheduler; sets a 3 s `setTimeout` that calls `refresh()` only when no timer is already pending
- [x] `getChildren()` — after resolving server list: if any server is transient calls `_schedulePoll()`; if all stable cancels any pending timer → polling stops automatically when all servers settle
- [x] `extension.ts` — `context.subscriptions.push(serversProvider)` so timer is cleared on extension deactivation

### Phase 14 — Server Detail WebView (2026-03-01)
- [x] Created `src/webviews/serverDetail.ts` — `ServerDetailPanel` with `openPanels: Map<number, ServerDetailPanel>` de-dupe guard; static `open()` factory re-uses existing panel per server
- [x] `renderHtml(s: HServer)` — status badge (green/red/orange), action buttons with disabled states (Start/Stop/Reboot/SSH/Delete), network section (IPv4/IPv6), SSH copy button, specs section (server type, cores, RAM, disk), location, system (OS image, ID, created), labels, loading bar overlay
- [x] `handleMessage()` — routes `refresh | start | stop | reboot | ssh | delete` messages; `doAction()` sends `setLoading` then calls API then `doRefresh()`; SSH opens `vscode.Terminal`
- [x] `serverCommands.ts` — imported `ServerDetailPanel`; registered `hcloud.showServerDetail` command (gets active client, calls `ServerDetailPanel.open()`)
- [x] `serversProvider.ts` — `ServerItem` constructor sets `this.command = { command: 'hcloud.showServerDetail', arguments: [this] }` so single-clicking a server opens the detail panel
- [x] `package.json` — added `hcloud.showServerDetail` to commands array (icon `$(info)`); added context-menu entry for all server items (group `1_server@5`)

### Phase 13 — Network Subnets (2026-03-01)
- [x] `hetzner.ts` — added `addSubnet(networkId, ipRange, networkZone, type?)` (`POST /networks/{id}/actions/add_subnet`) and `deleteSubnet(networkId, ipRange)` (`POST /networks/{id}/actions/delete_subnet`)
- [x] `networksProvider.ts` — updated `SubnetItem` constructor to accept and expose `subnet`, `networkId`, `networkName`; updated `getChildren` to pass network id/name; added tooltip showing all subnet details
- [x] `networkCommands.ts` — added `hcloud.addSubnet` (prompt: CIDR range + network zone QuickPick from `eu-central/us-east/us-west/ap-southeast`, `withProgress` + `try/catch`) and `hcloud.deleteSubnet` (confirm dialog, `withProgress` + `try/catch`); imported `SubnetItem`; added `NETWORK_ZONES` constant
- [x] `package.json` — registered both commands; `hcloud.addSubnet` in `view/item/context` for `viewItem == network` (group `1_network@1`); `hcloud.deleteSubnet` for `viewItem == subnet` (group `9_danger@1`)

### Phase 12 — SSH Key Auto-Select in Wizard (2026-03-01)
- [x] Replaced the `loadAndRender()` call in the `addSshKey` wizard message handler with a targeted diff-and-update flow
- [x] TypeScript host: snapshots existing key names, executes `hcloud.addSshKey`, re-fetches keys, diffs to find new names, sends `sshKeysUpdated` postMessage with full updated list + `newKeyNames`
- [x] Webview: changed `const SSH_KEYS` → `let SSH_KEYS` (needed for live update); added `sshKeysUpdated` message handler that updates the array, auto-pushes new key names into `state.sshKeys`, and calls `renderSshKeys()` — user's other step selections are fully preserved

### Phase 11 — Marketplace Packaging (2026-03-01)
- [x] Fixed `.vscodeignore`: removed `dist` (was incorrectly excluding compiled output), added `src/`, `.vscode/`, `esbuild.js`, `tsconfig.json`, `dist/extension.js.map`, `codereview/`, `overview.md`
- [x] Renamed `resources/hetznet.svg` → `resources/hcloud.svg` to match the `package.json` `viewsContainers` icon reference (was causing a missing asset at runtime)
- [x] Added `npm run package` script (`npx vsce package`) to `package.json`
- [x] Installed `@vscode/vsce` as dev dependency
- [x] `vsce package` produces `vscode-hetzner-cloud-0.1.0.vsix` — 33.32 KB, 10 files (clean: `dist/extension.js`, `resources/`, `README.md`, `CHANGELOG.md`, `LICENSE`, `ROADMAP.md`, `package.json`)

### Phase 10 — Code Review v0002 Bug Fixes (2026-03-01)
- [x] **BUG-4** — Added `.banner.warning` CSS rule to `serverWizard.ts`; the Tailscale security notice was hidden because the base `.banner` rule sets `display:none` and no `.warning` variant existed — users never saw the ephemeral-key recommendation
- [x] **BUG-5** — Rewrote runcmd inject in `cloudInitInjector.ts` from a regex-replace-after-header approach (which prepended) to a line-scan that finds the end of the existing sequence and splices new entries after the last item — Tailscale commands now correctly run last
- [x] **ISSUE-5** — Added `HetznerPage` typed envelope (`{ meta?: { pagination?:... }; [key: string]: unknown }`) and replaced `request<any>` with `request<HetznerPage>` in `paginateList`; added `Array.isArray()` null guard before push — eliminates runtime crash on unexpected API responses
- [x] **ISSUE-6** — Wrapped `client.deleteSshKey()` in `vscode.window.withProgress` and added `try/catch` with `showErrorMessage` in `sshKeyCommands.ts`, matching the pattern used by all other destructive commands
- [x] **MINOR-4** — Changed `let tsKey` to `const tsKey` in `serverWizard.ts` (never reassigned)
- [x] **MINOR-5** — Fixed implicit `window.event` global in `sshKeyGuide.ts`: all six tab `onclick` attributes now pass `event` explicitly; `showTab(name)` signature updated to `showTab(name, event)`

### Phase 9 — Code Review Bug Fixes (2026-03-01)
- [x] **BUG-3** — Registered `hcloud.deleteSshKey` command in `package.json` `"commands"` array (with `$(trash)` icon) and added `"view/item/context"` menu entry for `viewItem == sshkey` in the SSH Keys tree — command implementation already existed in `sshKeyCommands.ts`
- [x] **BUG-2** — Fixed double-indentation bug in `cloudInitInjector.ts`: the `.map((l) => \`  ${l}\`)` call that prepended 2 extra spaces to lines already indented with 2 spaces was removed; merged runcmd lines now emit correct 2-space YAML sequences
- [x] **BUG-1** — Deleted dead `addProject()` and `removeProject()` methods from `TokenManager` (`secretStorage.ts`); these stored tokens without updating the CSV index, making tokens invisible to `listProjects()`
- [x] **ISSUE-2** — Added `paginateList<T>()` private helper to `HetznerClient` that follows `meta.pagination.next_page` until `null`; updated all five list methods (`getServers`, `getNetworks`, `getImages`, `getSshKeys`, `getServerTypes`) to use it — users with >50 servers/keys no longer see silently truncated results
- [x] **ISSUE-1** — Replaced `client.getServers()` with `client.validateToken()` in the `hcloud.addToken` command handler; token validation now hits `GET /` (lightweight) instead of fetching the full server list
- [x] **ISSUE-3** — Removed `activeProjectName: string | undefined` cache field from `TokenManager` and all assignments to it; `getActiveProjectName()` already read directly from `SecretStorage`, so the unread field was pure dead weight
- [x] **ISSUE-4** — Added a persistent security notice banner to the Cloud-init & Tailscale step in `serverWizard.ts` warning users that the auth key is embedded as plaintext in cloud-init user-data and recommending a short-lived ephemeral key
- [x] **MINOR-1** — Fixed `homepage`, `repository.url`, and `bugs.url` in `package.json` from stale `brwinnov/hcloud.ext` to correct `brwinnov/vscode-hetzner-cloud`
- [x] **MINOR-2** — Replaced duplicate `projectsProvider.refresh(); setupProvider.refresh()` body in `hcloud.refreshProjects` handler with a single `refreshAll()` call
- [x] **MINOR-3** — Removed `retainContextWhenHidden: true` from the server wizard `WebviewPanel` options; the wizard is a one-shot flow with no state to preserve across hide/show cycles

---

## In Progress

_Nothing currently in flight._

---

## Completed Work (continued)

### Phase 22 — Welcome Page (2026-03-02)
- [x] `src/webviews/welcomePage.ts` — `WelcomePage` static class with `open()` (shows/reveals panel) and `openOnFirstInstall()` (checks `hcloud.welcomeShown` globalState flag, shows once on first install)
- [x] Welcome HTML: full-width hero (logo, title, subtitle, 4 CTA buttons); stats strip (10 views, 40+ commands, zero runtime deps, Hetzner Cloud + Robot APIs); 12-card feature grid (Servers, Detail Panel, Networks, Firewalls, Volumes, Load Balancers, Storage Boxes, SSH Keys, Multi-Project, Tailscale, Cloud-Init Library, Secure by Design); 5-step Getting Started guide with inline action buttons; footer links
- [x] Button actions post messages to the extension host: `addToken` → `hcloud.addToken`, `sshKeyGuide` → `hcloud.sshKeyGuide`, `openDocs` → opens GitHub README, `openHetznerConsole` → opens Hetzner Console
- [x] `extension.ts` — imported `WelcomePage`; registered `hcloud.welcome` command; called `WelcomePage.openOnFirstInstall(context)` on activation
- [x] `package.json` — registered `hcloud.welcome` command with `$(home)` icon

### Phase 23 — UI Review Fixes (2026-03-02)
- [x] **Activity bar icon missing** — `viewsContainers` container `id` was `"Hetzner Cloud Toolkit"` (spaces not allowed); renamed to `"hetzner-cloud-toolkit"` and updated matching `views` key — extension now shows its own icon in the activity bar instead of collapsing into Explorer
- [x] **SSH Key Guide tabs not working** — all tab `onclick="showTab(...)"` and copy button `onclick="copy(this)"` attributes were silently blocked by CSP nonce policy (inline event handlers are forbidden when a nonce is in use); replaced all `onclick` attributes with `data-tab` attributes on tabs and removed `onclick` from copy buttons; rewrote `<script>` block to wire listeners via `addEventListener` inside the nonce-protected script — tabs now switch correctly and copy buttons work
- [x] **Bitvise Client tab** — added new `🛡️ Bitvise Client` tab to SSH Key Guide (positioned between Linux/RHEL and Why SSH Keys?); content: praise as all-in-one swiss army knife replacing PuTTY + WinSCP + PuTTYgen; feature comparison table; download link (`bitvise.com/ssh-client-download`); step-by-step key pair generation via built-in Key Manager; two export-public-key paths (save file vs clipboard one-click); connecting to Hetzner walkthrough; save-profile tip
- [x] **README badge URLs broken** — marketplace badge URLs used `brwinnov.Hetzner Cloud Toolkit-ext` (spaces, wrong ID); corrected to `brwinnov.vscode-hetzner-cloud` (publisher + `.` + package name) for both Version and Installs badges

### Phase 24 — README Install/Download CTA (2026-03-02)
- [x] Added top-of-page `Install / Download` section in `README.md`
- [x] Added VS Marketplace link (`marketplace.visualstudio.com/items?itemName=brwinnov.vscode-hetzner-cloud`)
- [x] Added GitHub Releases link (`github.com/brwinnov/vscode-hetzner-cloud/releases`)
- [x] Added direct latest VSIX link (`/releases/latest/download/vscode-hetzner-cloud.vsix`) plus fallback note to use the Releases page if the direct asset URL returns 404

### Phase 25 — Controlled Dependency Upgrade (2026-03-02)
- [x] Created `chore/dependency-upgrade` branch (branched from master@94471c4)
- [x] Upgraded dev dependencies:
  - `@typescript-eslint/*` v6.0.0 → v7.0.0 (fixes minimatch ReDoS chain, eliminates 3 high CVEs via @typescript-eslint/typescript-estree)
  - `esbuild` v0.20.0 → v0.22.0 (minor version bump, dev-time only)
  - `@vscode/test-cli` v0.0.6 → v0.0.9 (test infrastructure, dev-time only)
  - `typescript` v5.3.0 → v5.4.0 (minor version bump, dev-time only)
- [x] `npm install` succeeds; regenerated `package-lock.json` with new transitive deps
- [x] `npm run build` passes cleanly (no build errors or warnings)
- [x] `npm run lint` passes: 0 errors, 9 pre-existing warnings (no new issues introduced)
- [x] `npm audit` report: vulnerabilities reduced from 10 → 4 (60% reduction)
  - **Remaining vulnerabilities (all dev-time only, do not ship in extension bundle):**
    - 1 moderate: `esbuild <=0.24.2` (CVE-2024-46149, dev server request read exposure; fix available at v0.27.3 but breaking change)
    - 3 high: `serialize-javascript <=7.0.2` (via mocha → @vscode/test-cli, RCE in RegExp/Date; no upstream fix available)
- [x] Committed to branch: `74dda91` — "chore: upgrade dev dependencies to reduce vulnerabilities"
- [x] Ready to merge into `main` or stay on branch for further testing

### Phase 26 — Onboarding Flow UX Fix (2026-03-02)
- [x] **Smoke test findings:** Welcome page doesn't auto-open on subsequent launches (expected—user can manually trigger via Ctrl+Shift+P → "Hetzner Cloud: Open Welcome Page")
- [x] **SETUP pane UX issue identified:** "SSH Key Pair Setup" item pointed to `hcloud.sshKeyGuide` (instructions only), not to the actual `hcloud.addSshKey` command (which prompts for public key input)
- [x] **Fixed setupProvider.ts:**
  - Renamed "SSH Key Pair Setup" → "Add Public SSH Key" (clearer intent)
  - Changed command from `hcloud.sshKeyGuide` → `hcloud.addSshKey` (actual key addition flow)
  - Updated tooltip to clarify: "Add your public SSH key to Hetzner Cloud for secure server access. (SSH key generation guide available in sidebar.)"
  - Changed contextValue from `setup-sshguide` → `setup-sshkey` (better semantics)
- [x] `npm run build` passes cleanly post-change
- [x] **FOLLOW-UP FIX** — Added "📖 SSH Key Generation Guide" item to SETUP pane (points to `hcloud.sshKeyGuide`)
  - New workflow: Click guide first for instructions → then click "Add Public SSH Key" to paste the generated public key
  - Both items now visible in SETUP with clear, separate intents
- [x] Users now have clear two-step flow: Learn → Generate → Add

### Phase 27 — Server Wizard CSP Event Listener Fix (2026-03-02)
- [x] **Smoke test findings:** Server wizard location selection not working, NEXT button on Basics step unresponsive
- [x] **Root cause identified:** CSP policy `script-src 'nonce-...'` blocks all inline onclick handlers in HTML; only code inside nonce-protected `<script nonce="...">` block is allowed
- [x] **Fixed serverWizard.ts — Quick Fix (critical path only):**
  - Removed `onclick="selectLocation(...)"` from location cards; added `data-location` attribute for event delegation
  - Removed `onclick="goToStep(...)"` from step nav items
  - Removed `onclick` from Cancel/NEXT buttons
  - Wired all listeners in `DOMContentLoaded`:
    - **Location cards:** Event delegation on `#locationCards` container with `e.target.closest('.card[data-location]')`
    - **Step nav:** `querySelectorAll('.step-nav li').forEach()` + `click` listener → calls `goToStep(idx)`
    - **Action buttons (refined):** Query buttons within `.actions` divs only; use `startsWith()` text matching
  - Kept `selectLocation()` function for backward compat (not called, but present)
- [x] `npm run build` passes cleanly
- [x] **Testing validated:** Location selection works, NEXT button progresses to Server Type step
- [x] Committed: `c25584e` — "fix: enable server wizard location selection and navigation — wire event listeners"
- [x] **Follow-up commit:** `5b1dd2b` — "fix: improve server wizard button listener selector — target action divs only"
- [x] **Assessment (2026-03-02 later):** Server Type cards now selectable; Image cards functional too
  - Work-in-progress commit `d8d6dbe` attempted full wizard event listener refactor (server types, images, filters, etc.)
  - **Decision:** Reverted WIP commit; defer full wizard CSP refactor to post-publication phase
  - **Rationale:** Extension is feature-complete and smoke-tested for critical paths (Basics → Type → Image progression verified); remaining wizard steps have same CSP issue but are not blocking MVP publication
  - **Parked backlog:** Complete event listener wiring for SSH keys, networks, cloud-init templates, storage boxes, Tailscale key in future maintenance release

### Phase 28 — Complete Server Wizard CSP Fix (2026-03-02)
- [x] **TypeScript compilation error fix** — Added `codereview` directory to `tsconfig.json` exclude list; the `codereview/review.ts` file was outside the `rootDir` and causing a build error
- [x] **Completed CSP event listener wiring** — Un-parked previously deferred work:
  - Replaced all remaining inline `onclick` handlers with data attributes in `renderSshKeys()` and `renderNetworks()`:
    - `onclick="toggleSshKey(...)"` → `data-key-name="..."`
    - `onclick="toggleNetwork(...)"` → `data-network-id="..."`
  - Wired event listeners in `DOMContentLoaded` section:
    - **SSH key cards:** Event delegation on `#sshKeyCards` container; reads `data-key-name`, toggles selection state, updates `state.sshKeys` array
    - **Network cards:** Event delegation on `#networkCards` container; reads `data-network-id`, toggles selection state, updates `state.networks` array
    - **Data-action buttons:** Global event delegation for all `[data-action]` elements (add-ssh-key, create-network, set-tailscale-key, save-cloud-init-template, load-cloud-init-template, delete-cloud-init-template, request-storage-box-mounts)
  - All wizard steps now fully functional and CSP-compliant: SSH keys, networks, cloud-init templates, storage boxes, Tailscale key
- [x] **Zero inline onclick handlers remaining** — Verified with grep search: no CSP violations
- [x] `npm run build` passes cleanly; no TypeScript errors

### Phase 29 — Server Wizard UX Fixes (2026-03-02)
- [x] **Cloud-init step NEXT button not active** — Fixed button event listener: step 5 button is labeled "Review →" but listener was checking `text.startsWith('Next')`; updated condition to `text.startsWith('Next') || text.startsWith('Review')` — now "Review →" button works
- [x] **Tailscale default setting & token requirement:**
  - Changed default from `tailscaleEnabled: true` to `false` (users must opt-in)
  - Added `tailscaleTokenExists` message from backend that checks if Tailscale auth key is configured
  - Tailscale toggle now disabled by default; enabled only if a token exists
  - Toggle shows tooltip: "Tailscale auth key not configured. Click 'Set Tailscale Key' to enable."
  - When user sets a Tailscale key via `setTailscaleKey()`, toggle is re-enabled with tooltip: "Enable Tailscale auto-install on this server"
  - Banner now properly shown/hidden based on token existence
- [x] **Create Server button not responding** — Button text is "⚡ Create Server" (emoji prefix) which didn't match `text.startsWith('Create')`; changed listener to use button ID selector: `document.getElementById('createBtn').addEventListener('click', createServer)` — now "Create Server" button works
- [x] **Tailscale toggle CSP compliance** — Changed `onchange="updateTailscaleState()"` to event listener wire-up in `DOMContentLoaded`: `document.getElementById('tailscaleToggle').addEventListener('change', updateTailscaleState)`
- [x] **Code cleanup** — Removed unused `tailscaleCfg` variable from wizard initialization (was reading `hcloud.tailscale` config but no longer needed after switching to default-disabled Tailscale)
- [x] `npm run build` passes cleanly; no TypeScript errors
- [x] `npm run lint` clean: 0 errors, 9 warnings (down from 10; removed unused variable warning)
- [x] **Testing path validated:** Basics → Server Type → Image → SSH Keys → Networks → Cloud-init → Review → Create now fully functional

### Phase 30 — Enhanced Network/Subnet UI (2026-03-02)
- [x] **Improved Networks step UX** — Following Hetzner best practices for network topology:
  - **Network selection display:** Shows each network with:
    - Network name and overall IP range (e.g. 10.0.0.0/16)
    - List of subnets with their CIDR ranges and assigned zones
    - Example: "📍 10.0.1.0/24 · Zone: eu-central"
  - **Collapsible network cards:** Each network is a bordered card with subnet details nested below
  - **Helpful practices banner:** Explains three common patterns:
    - One network per project (complete isolation) ← **Recommended**
    - Multiple subnets (for environments or regions within one product)
    - Zone-specific subnets (for multi-region deployments)
  - **Improved empty state:** When no networks exist, shows three clear options:
    - Create a new network now
    - Skip and use public IP only
    - Attach later via Networks tree view
  - **Better summary:** Review page now shows "None (public IP only)" instead of "Public only" for clarity
- [x] **Subnet-aware rendering:** Uses optional chaining (`n.subnets?.length`) to safely handle networks with/without subnets
- [x] **Zone information display:** Each subnet shows its network zone (eu-central, us-east, us-west, ap-southeast)
- [x] **CSS improvements:** Added `.network-list` class for proper spacing; styled `.empty-state` with left border accent and background
- [x] `npm run build` passes cleanly; no TypeScript errors
- [x] **User can now:**
  - See which subnets exist and their zones before attaching a network
  - Understand Hetzner's network topology via in-wizard education
  - Make informed decisions about one network per project vs multi-subnet

---

## In Progress

_Nothing currently in flight._

---

## Completed Work (continued)

### Near-term
- [x] **Tailscale key command** — `promptAndSave()` validated: correct `tskey-` prefix check, SecretStorage store/retrieve, confirmation message; `hcloud.setTailscaleKey` properly registered in `extension.ts`
- [x] **Server power state refresh** — all power commands (`startServer`, `stopServer`, `rebootServer`) already call `serversProvider.refresh()` in their success path — backlog item was stale
- [x] **Network subnets** — `SubnetItem` updated to carry `networkId` + `networkName`; `addSubnet` / `deleteSubnet` API methods added; `hcloud.addSubnet` and `hcloud.deleteSubnet` commands implemented with progress + error handling; both registered in `package.json` with context menus (`addSubnet` on network items, `deleteSubnet` on subnet items)
- [x] **SSH key auto-select after wizard add** — replaced `loadAndRender()` (which wiped all wizard state) with a targeted `sshKeysUpdated` flow: snapshot existing key names before `hcloud.addSshKey`, re-fetch after, diff to identify new key(s), post `{ command: 'sshKeysUpdated', keys, newKeyNames }` to the webview; webview handler updates `SSH_KEYS` array, auto-selects new keys into `state.sshKeys`, re-renders only the SSH key cards — user's other wizard selections (name, type, OS, network etc.) are preserved

### Medium-term
- [x] **Server detail WebView** — `ServerDetailPanel` opens on server click; full detail HTML with status badge, action buttons (start/stop/reboot/ssh/delete), specs, network, location, labels sections; loading bar; `openPanels` map prevents duplicate panels per server
- [x] **Cloud-init library** — `CloudInitLibrary` class in `secretStorage.ts` (`context.globalState`-backed, `string[]` index); save/load/delete named templates via three buttons in the wizard cloud-init step; `cloudInitTemplateLoaded` postMessage fills textarea and updates `state.cloudInit`
- [x] **Status polling** — `ServersProvider` auto-polls every 3 s while any server is in a transient state (`initializing/starting/stopping/rebuilding/migrating/deleting`); stops automatically when all servers reach a stable state; spinner icon (`$(sync~spin)` orange) shown for transitioning servers; timer cleared on deactivation via `Disposable`

### Long-term / Nice-to-have
- [x] **Firewall rules** — full CRUD: create with default rule set (SSH 22 + HTTP 80 + HTTPS 443 + ICMP + optional Tailscale UDP 41641), add/delete individual rules, apply/remove firewall to/from servers; `hcloud.firewalls` tree view with `FirewallItem` (collapsible) + `RuleItem` children
- [x] **Volumes** — full CRUD: create with location/format/optional immediate attach, attach/detach, resize (with filesystem reminder), delete (blocked while attached); `hcloud.volumes` tree with attached (green `$(database)`) and detached (yellow `$(circle-outline)`) states
- [x] **Load balancers** — basic CRUD
- [x] **Extension marketplace packaging** — `vsce package` produces `vscode-hetzner-cloud-0.1.0.vsix` (33 KB, 10 files); fixed `.vscodeignore` (`dist` was incorrectly excluded, added `src/`, `.vscode/`, `esbuild.js`, `tsconfig.json`, `dist/extension.js.map`); renamed `resources/hetznet.svg` → `resources/hcloud.svg` to match `package.json` reference; added `npm run package` script; `.vsix` stays out of git via `.gitignore`

### Phase 31 — Server Wizard Robustness & Subnet Management (2026-03-02)
- [x] **Location list visibility fix** — Added null safety checks to all render functions (`renderLocations`, `renderServerTypes`, `renderImages`, `renderSshKeys`, `renderNetworks`); prevents "Cannot set property 'innerHTML' of null" errors when DOM elements are missing; added console.error logging for debugging
- [x] **Event listener null checks** — All event listener registrations for `locationCards`, `typeCards`, `imageCards`, `sshKeyCards`, `networkCards`, `tailscaleToggle` now check if element exists before calling `addEventListener`; eliminates silent failures if HTML structure is malformed
- [x] **Subnet creation from wizard** — Added subnet creation workflow:
  - `createSubnet` postMessage handler in extension TypeScript code prompts for subnet CIDR range via InputBox with CIDR validation
  - `createSubnetFromWizard(btn)` JavaScript function extracts network ID and zone from button data attributes, prompts user for CIDR via `prompt()`, sends `createSubnet` postMessage
  - `networksUpdated` postMessage handler already present; re-fetches networks and re-renders
  - Network cards in wizard now display "Subnets (N)" header with "+ Add Subnet" button next to each network
  - Button click handler delegates to `createSubnetFromWizard()` via data-action button listener
- [x] **Network CIDR display** — Each network in wizard now shows total subnet count and collapsible subnet list with individual CIDR ranges and network zones; users can see existing subnets before creating new ones
- [x] `npm run build` passes cleanly; no TypeScript errors or warnings introduced

### Phase 32 — Post-merge Regression Recovery (2026-03-02)
- [x] **Basics location list restored** — Fixed malformed JavaScript block in `serverWizard.ts` around the `createBtn` listener (`});` / `});` mismatch) that broke script execution and prevented step-0 location cards from rendering
- [x] **Wizard CSS parse issue fixed** — Corrected malformed `.empty-state` CSS block in `serverWizard.ts` (stray `font-size` line outside rule) to ensure stylesheet integrity
- [x] **Verification** — `npm run build` passes after fix; Basics locations visible again in server wizard
- [x] **Branch sync** — Pushed fixes to `origin/fix/onboarding-setup-ux`:
  - `ef45da7` — `fix: restore server wizard basics location rendering`
  - `7e60323` — `chore: include remaining workspace and tsconfig updates`

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
| 2026-03-01 | PLAN.md untracked from git, stays local only | Internal AI dev notes; not useful to public repo users |
| 2026-03-01 | ROADMAP.md created as public-facing equivalent | Mermaid diagrams (mindmap, graph, gantt), clean backlog table, no internal detail |
| 2026-03-01 | `CloudInitLibrary` uses `context.globalState` not `SecretStorage` | Templates are config data, not credentials; OS keystores have per-entry size limits (~256KB on macOS) that cloud-init scripts could hit |

---

## Commit History (recent)

```
7e60323  chore: include remaining workspace and tsconfig updates
ef45da7  fix: restore server wizard basics location rendering
d8d6dbe  work in progress: extend server wizard event listener wiring — fix server types and images
5b1dd2b  fix: improve server wizard button listener selector — target action divs only
c25584e  fix: enable server wizard location selection and navigation — wire event listeners
94471c4  docs: add install/download section with marketplace, releases, and direct VSIX links
0c810ca  fix: restore dynamic marketplace badge URLs
c248f2d  fix: replace dynamic marketplace badges with static placeholders until extension is published
5548a2c  feat: welcome page, SSH key guide CSP fix, Bitvise tab, activity bar fix, README badges
c05d4c0  feat: load balancers (create/delete/add target/remove target); untrack overview.md
e06fa6b  security: audit fixes — shell injection, YAML injection, CSP nonces, XSS escaping
8d3a911  feat: storage box management — list, mount to servers, cloud-init injection via Robot API
212c7f0  feat: volumes — create, attach, detach, resize, delete block storage
e171a78  feat: firewall rules — create, manage rules, apply/remove to servers
c4e722c  feat: cloud-init template library — save/load/delete named templates in SecretStorage
847b2ff  feat: status polling — auto-refresh tree while servers are in transient states
eadcfff  feat: server detail WebView — click server to open detail panel
```
