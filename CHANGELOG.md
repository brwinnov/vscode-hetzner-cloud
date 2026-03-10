# Changelog

All notable changes to Hetzner Cloud Toolkit are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [0.3.0] - 2026-03-10

### Added
- **Networks guide WebView** — $(info) toolbar button opens a guide covering private network concepts, order of operations (network → subnet → attach server), and four real-world subnet layout examples
- **Firewalls guide WebView** — covers rule directions, protocols (TCP/UDP/ICMP/ESP/GRE), port syntax, default rule set, and five use-case rule tables (web server, private DB, game/UDP, Tailscale, locked-down egress)
- **Volumes guide WebView** — overview cards (size range, formats, location constraint), all five actions explained (create/attach/detach/resize/delete), filesystem resize commands, and five use cases
- **Images guide WebView** — tabbed page: Overview tab lists all four image types and available system OS images; Custom Images tab has a seven-step snapshot workflow guide plus cloud-init alternative and best-practice callouts
- **Robot API credentials WebView form** — replaces sequential `showInputBox` prompts with a persistent two-field form (username + password) that stays open while switching to a password manager; shows inline spinner and validation status without closing

### Changed
- `hcloud.setRobotCredentials` command now opens a WebView credentials form instead of VS Code input boxes
- Toolbar icon order standardised across all panels: **info → add → refresh**; fixed SSH Keys (was add → info → refresh) and Networks (refresh was before addSubnet)

---

## [0.2.9] - 2026-03-10

### Fixed
- README: corrected marketplace publisher ID from `brwinnov` to `brwinnovvsce` in all badge and install URLs
- README: added all features missing since v0.2.1 (Firewalls, Volumes, Load Balancers, Storage Boxes, Server Detail panel, status polling, cloud-init library)
- `package.json`: corrected repository URL format for vsce image resolution
- `tsconfig.json`: replaced stale `codereview` exclude with `scripts`
- TypeScript: fixed three pre-existing strict-mode errors (`hetzner.ts` TS7022, `secretStorage.ts` TS2835, `serverWizard.ts` TS2352)

### Changed
- Repo housekeeping: removed stale tracked files (`.aivory`, `verdict01.md`, `wiki/`, dangling `wiki-repo` submodule)
- `.gitignore` / `.vscodeignore`: updated to reflect current project structure

---

## [0.2.8] - 2026-03-10

### Fixed
- Load Balancer: remove-target confirmation now shows server name instead of numeric ID
- Load Balancer: add-target picker annotates servers in a different location with a warning
- Server Detail: all error catch handlers now use safe `unknown` type instead of `any`
- Server Detail: delete button danger styling now uses VS Code theme CSS variables (light theme support)

---

## [0.2.7] - 2026-03-10

### Changed
- Updated README with cleaner install links and marketplace badges

---

## [0.2.6] - 2026-03-09

### Changed
- Version bump for CI/publish pipeline maintenance

---

## [0.2.5] - 2026-03-09

### Fixed
- VSCE-PAT token roles updated for VS Marketplace publishing

---

## [0.2.4] - 2026-03-09

### Fixed
- Updated publisher ID to `brwinnovvsce` to match VS Marketplace account

---

## [0.2.3] - 2026-03-09

### Fixed
- CI: use Node 20 and `@vscode/vsce` for publish workflow

---

## [0.2.2] - 2026-03-09

### Fixed
- CI: publisher and GitHub Actions configuration for VS Marketplace publishing

---

## [0.2.1] - 2026-03-09

### Added
- **Load Balancers panel** — create, delete, add/remove server targets; type and algorithm selection
- **Storage Boxes panel** — Hetzner Robot storage box list, mount via cloud-init, copy CIFS mount commands
- Firewall commands — create with default or empty rule set, add/delete rules, apply/remove from servers
  - Tailscale UDP 41641 rule offered automatically when a Tailscale key is configured
- Volume commands — create (live location list from API), attach/detach, resize, delete
- Server Detail WebView — specs, network info, labels, in-panel power/reboot/delete, SSH terminal launch
- Server status polling — transient states (starting, stopping, rebuilding) auto-refresh the Servers tree
- Cloud-init template library — save, load, delete reusable templates (stored in extension global state)
- `refreshAll` extended to cover Firewalls, Volumes, and Load Balancers on project switch
- Network Detail WebView panel — view subnets, attached servers, inline subnet delete

### Fixed
- `deleteFirewallRule` now matches rules by content rather than cached array index (multi-client safe)
- Inline network creation in wizard no longer discards wizard form state
- Cloud-init library migrated from SecretStorage to `context.globalState` (removes keychain size limits)
- Server Detail status badge colors use VS Code theme CSS variables (dark and light theme support)
- HTML escaping added for all API-sourced values in Server Detail WebView

---

## [0.2.0] - 2026-03-09

### Added
- Enhanced Networks tree view: subnet count, improved tooltips, inline add-subnet action
- 'Add Subnet to Network' command with network picker
- 'Show Network Details' command

---

## [0.1.1] - 2026-03-03

### Fixed
- README formatting: left-aligned install links for cleaner presentation
- Improved `.vscodeignore` to exclude development files from package

### Added
- Welcome page link in Setup section for easy re-access
- Cloud Console placeholder (Coming Soon) in Setup section

---

## [0.1.0] - 2026-03-02

### Added
- **SERVERS panel** — live server list with status icons; power on / off / reboot / delete context menu actions
- **NETWORKS panel** — private network list; create and delete networks
- **IMAGES panel** — browse available OS images for the active project/region
- **SSH KEYS panel** — view, add (from `~/.ssh/*.pub`), and delete SSH keys
- **7-step server creation wizard** — Basics, Server Type, OS Image, SSH Keys, Network, Cloud-init, Review
  - Tailscale auto-install toggle with auth key injection into cloud-init
  - Inline network creation without leaving the wizard
  - Root password shown in-editor after creation when no SSH key is selected
- **SSH Key Generation Guide** — tabbed WebView covering Windows, macOS, WSL, Linux/RHEL
- **Tailscale auth key manager** — stored in SecretStorage; injected as `runcmd` cloud-init block
- **Status bar item** — shows active project name; click to switch
- **First-use onboarding** — SSH key guide prompt on first project add; Welcome page on install

[Unreleased]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.9...v0.3.0
[0.2.9]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.7...v0.2.8
[0.2.7]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/brwinnov/vscode-hetzner-cloud/releases/tag/v0.1.0
