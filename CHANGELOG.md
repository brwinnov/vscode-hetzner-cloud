# Changelog

All notable changes to Hetzner Cloud Toolkit are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.1.1] - 2026-03-03

### Fixed
- README formatting: left-aligned install links with hidden URLs for cleaner presentation
- Improved .vscodeignore to exclude development files from package

### Added
- Welcome page link in Setup section for easy re-access
- Cloud Console placeholder (Coming Soon) in Setup section
- Future feature ideas for API token management

---

## [0.1.0] - 2026-03-02

## [0.2.0] - 2026-03-09

### Added
- Enhanced Networks tree view: subnet count, improved tooltips, inline actions
- New 'Add Subnet to Network' command with network picker
- Network Detail WebView panel: view/edit subnets, attached servers, delete actions
- 'Show Network Details' command for quick access
- Updated package.json with new commands and contributions

### Changed
- Version bump to 0.2.0 for new feature release

### Fixed
- None

---

## [0.1.1] - 2026-03-03
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
