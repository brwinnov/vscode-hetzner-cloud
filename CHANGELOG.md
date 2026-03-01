# Changelog

All notable changes to Hetzner Cloud Toolkit are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned
- Server detail WebView (IPs, specs, console link)
- Cloud-init template library (save/load named templates)
- Server status polling during initialisation
- Network subnet add/remove
- Firewall rules CRUD
- Volumes (block storage)
- Load balancers

---

## [0.1.0] — 2026-03-01

Initial release.

### Added
- **Multi-project token management** — add, switch, and remove Hetzner Cloud projects; tokens stored in VS Code SecretStorage
- **SETUP panel** — onboarding task list (API key, SSH key guide, Tailscale key)
- **PROJECTS panel** — lists all configured projects; active project shown first with indicator; click to switch
- **SERVERS panel** — live server list with status icons; power on / off / reboot / delete context menu actions
- **NETWORKS panel** — private network list; create and delete networks
- **IMAGES panel** — browse available OS images for the active project/region
- **SSH KEYS panel** — view, add (from `~/.ssh/*.pub`), and delete SSH keys
- **7-step server creation wizard** — full WebView panel covering: Basics, Server Type, OS Image, SSH Keys, Network, Cloud-init, Review
  - Tailscale auto-install toggle with auth key injection into cloud-init
  - Inline network creation without leaving the wizard
  - Root password shown in-editor after creation when no SSH key is selected
- **SSH Key Generation Guide** — tabbed WebView covering Windows (PowerShell + PuTTYgen), macOS, WSL, Linux/RHEL, Why SSH Keys?, Why Ed25519?
- **Tailscale auth key manager** — stored in SecretStorage; injected as `runcmd` cloud-init block
- **Status bar item** — shows active project name; click to switch
- **First-use onboarding** — SSH key guide prompt on first project add

[Unreleased]: https://github.com/brwinnov/vscode-hetzner-cloud/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/brwinnov/vscode-hetzner-cloud/releases/tag/v0.1.0
