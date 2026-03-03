# Roadmap — Hetzner Cloud Toolkit

> A VS Code extension for managing [Hetzner Cloud](https://www.hetzner.com/cloud) infrastructure directly from the editor.
> This is an unofficial community extension, unaffiliated with Hetzner Online GmbH.

---

## Current State — v0.1.0

The initial release is feature-complete and marketplace-ready.

```mermaid
mindmap
  root((Hetzner Cloud Toolkit))
    Token Management
      Multi-project support
      Secure SecretStorage
      Active project switcher
    Servers
      List with status icons
      Create via 7-step wizard
      Power on / off / reboot
      Delete with confirmation
      SSH terminal shortcut
    Networks
      List with subnets
      Create / Delete
    SSH Keys
      List with fingerprints
      Add / Delete
      Key generation guide
    Images
      List system + snapshots
    Tailscale
      Auth key store
      Cloud-init injection
    Onboarding
      SETUP panel task list
      SSH Key Guide WebView
```

---

## Architecture

```mermaid
graph TD
    A[VS Code Extension Host] --> B[TokenManager<br/>SecretStorage]
    A --> C[HetznerClient<br/>REST v1]
    B --> C

    C --> D[Servers TreeView]
    C --> E[Networks TreeView]
    C --> F[Images TreeView]
    C --> G[SSH Keys TreeView]

    A --> H[Server Wizard<br/>WebView]
    A --> I[SSH Key Guide<br/>WebView]
    A --> J[SETUP Panel]
    A --> K[PROJECTS Panel]

    H --> C
    B --> L[TailscaleAuthKeyManager<br/>SecretStorage]
    L --> M[CloudInitInjector]
    M --> H
```

---

## Release Plan

```mermaid
gantt
    dateFormat  YYYY-MM
    title Hetzner Cloud Toolkit — Release Timeline

    section v0.1.0 (Done)
    Core extension & wizard      :done, 2026-02, 2026-03
    Marketplace assets           :done, 2026-03, 2026-03

    section v0.2.0
    Auto-refresh after power ops :active, 2026-03, 1w
    Server detail panel          :2026-03, 2w
    Network subnets              :2026-03, 1w

    section v0.3.0
    Cloud-init template library  :2026-04, 2w
    Server status polling        :2026-04, 1w
    Tailscale wizard integration :2026-04, 1w

    section v1.0.0
    Firewall CRUD                :2026-05, 3w
    Volumes                      :2026-05, 2w
    Load balancers               :2026-06, 3w
    Marketplace publish          :2026-06, 1w
```

---

## Backlog

### v0.2.0 — Polish

| # | Feature | Notes |
|---|---------|-------|
| 1 | **Auto-refresh trees after power actions** | After start/stop/reboot, `serversProvider.refresh()` auto-fires |
| 2 | **Server detail WebView** | Click a server → panel with IPs, specs, datacenter, Hetzner console link |
| 3 | **Network subnets** | Expand network node to show subnets; add/remove subnet commands |
| 4 | **SSH key auto-select after add in wizard** | Newly added key pre-selected when wizard step reloads |

### v0.3.0 — Productivity

| # | Feature | Notes |
|---|---------|-------|
| 5 | **Cloud-init template library** | Save/load named templates via SecretStorage |
| 6 | **Server status polling** | Poll while `initializing`, update tree icon live |
| 7 | **Tailscale key linked into wizard** | Warn/prompt if Tailscale toggled on but no key stored |

### v1.0.0 — Full Coverage

| # | Feature | Notes |
|---|---------|-------|
| 8 | **Firewall rules CRUD** | List, create, apply, delete Hetzner Firewalls |
| 9 | **Volumes** | Block storage attach / detach |
| 10 | **Load balancers** | Basic CRUD |
| 11 | **Marketplace publish** | `vsce package` + `vsce publish` — assets already ready |

### Future Ideas

| # | Feature | Notes |
|---|---------|-------|
| 12 | **Multiple API tokens per project** | Support adding multiple tokens for same project (token rotation, different access levels). Current: 1 token = 1 project. Note: Hetzner Cloud API tokens are per-project only (no global account token exists). |
| 13 | **Token metadata & labels** | Label tokens by purpose (e.g. "Production Read-Only", "Staging Full Access") for better organization |
| 14 | **API token health check** | Periodic validation to detect expired/revoked tokens; show warning icon in Projects tree |

---

## Contributing

Contributions, bug reports, and feature requests are welcome.
Open an [issue](https://github.com/brwinnov/vscode-hetzner-cloud/issues) or submit a PR.

This extension uses **no external runtime dependencies** — just native `fetch` and the VS Code API.
