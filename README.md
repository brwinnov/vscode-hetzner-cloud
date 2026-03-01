<div align="center">

<img src="resources/icon.png" width="96" alt="Hetzner Cloud Toolkit icon">

# Hetzner Cloud Toolkit

**Manage your Hetzner Cloud infrastructure directly from VS Code.**

[![Version](https://img.shields.io/visual-studio-marketplace/v/brwinnov.Hetzner Cloud Toolkit-ext?color=D50C2D&label=marketplace)](https://marketplace.visualstudio.com/items?itemName=brwinnov.Hetzner Cloud Toolkit-ext)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/brwinnov.Hetzner Cloud Toolkit-ext)](https://marketplace.visualstudio.com/items?itemName=brwinnov.Hetzner Cloud Toolkit-ext)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

Hetzner Cloud Toolkit brings the Hetzner Cloud control panel into your editor. Create servers, manage networks, organise SSH keys, and inject Tailscale — all without leaving VS Code.

## Features

### 🖥 Server Management
- View all servers with live status indicators (running, off, initializing)
- **7-step creation wizard** — name, server type, OS image, SSH keys, network, cloud-init, review
- Power on / off / reboot from the context menu
- Delete with confirmation
- Root password shown in-editor when no SSH key is used

### 🗂 Multi-Project Support
- Add as many Hetzner projects (API tokens) as you need
- Switch active project from the sidebar or status bar
- All tokens stored encrypted in VS Code's SecretStorage

### 🌐 Network Management
- View all private networks and their subnets
- Create networks inline — even from inside the server wizard
- Delete networks with confirmation

### 🔑 SSH Key Management
- View all SSH keys in your Hetzner project
- Add a key by selecting a `.pub` file from `~/.ssh/`
- Delete keys with confirmation
- Built-in **SSH Key Generation Guide** with step-by-step instructions for Windows, macOS, WSL, and Linux/RHEL — including a full explainer on Ed25519 vs RSA

### 🐟 Tailscale Auto-Install
- Set a Tailscale auth key once — stored securely in SecretStorage
- Toggle auto-injection in the server wizard
- Automatically appends the correct `runcmd` block to your cloud-init

### 🚀 First-Use Onboarding
- **SETUP** panel guides you through: adding your API key, generating SSH keys, and configuring Tailscale
- Prompts the SSH key guide automatically when you add your first project

---

## Getting Started

### 1. Get a Hetzner Cloud API Token

1. Log in to [console.hetzner.cloud](https://console.hetzner.cloud)
2. Open your project → **Security** → **API Tokens**
3. Click **Generate API Token** — give it Read & Write permissions
4. Copy the token (shown only once)

### 2. Add the token to Hetzner Cloud Toolkit

1. Open the Hetzner Cloud Toolkit sidebar (cloud icon in the Activity Bar)
2. In **SETUP**, click **Add Hetzner Project API Key**
3. Enter a project name and paste your token
4. Your servers, networks, images, and SSH keys will load automatically

### 3. Create your first server

1. In the **SERVERS** panel, click the **＋** button or run `Hetzner Cloud Toolkit: Create Server`
2. Work through the 7-step wizard
3. Your new server appears in the tree within seconds

---

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `Hetzner Cloud Toolkit.tailscale.enableByDefault` | `true` | Pre-check the Tailscale toggle in the server wizard |
| `Hetzner Cloud Toolkit.tailscale.extraArgs` | `--accept-routes --ssh` | Extra arguments passed to `tailscale up` in cloud-init |

---

## Requirements

- VS Code **1.85.0** or later
- A [Hetzner Cloud](https://www.hetzner.com/cloud) account and API token
- No other dependencies — no Node modules are bundled at runtime

---

## Privacy & Security

- API tokens are stored using VS Code's built-in `SecretStorage` API (OS-level encrypted keychain — Windows Credential Manager, macOS Keychain, libsecret on Linux)
- No data is sent anywhere except directly to `api.hetzner.cloud`
- The extension makes no telemetry calls

---

## Contributing

Issues and PRs welcome at [github.com/brwinnov/vscode-hetzner-cloud](https://github.com/brwinnov/vscode-hetzner-cloud).

---

## License

[MIT](LICENSE) © 2026 brwinnov
