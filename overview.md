# vscode-hetzner-cloud — Project Blueprint

A first-class VS Code extension for managing Hetzner Cloud infrastructure without leaving your editor.

---

## Feature Areas

### 1. Authentication & Token Management
- Securely store multiple Hetzner API tokens (VS Code `SecretStorage`)
- Switch between projects/accounts
- Token validation on entry

### 2. Servers
- Create, start, stop, reboot, delete
- View server details (IP, status, specs, location)
- Console/SSH quick-launch from the sidebar
- Rebuild from image
- Rescue mode toggle

### 3. Networks & Firewalls
- Create/delete private networks and subnets
- Assign servers to networks
- Create/manage firewall rules

### 4. Images & OS
- Hetzner catalog images (Ubuntu, Debian, Fedora, etc.)
- **Custom ISO/images** — upload, register, use own OS not in catalog
- Snapshots management (create from server, restore)

### 5. Cloud-Init Scripts
- Built-in editor with syntax highlighting
- Save/load named templates
- Variable substitution (e.g. `{{hostname}}`, `{{tailscale_key}}`)
- **Auto-inject Tailscale block** into every build (on by default, toggle off)

### 6. Tailscale Integration *(default on)*
- Auto-inject into cloud-init:
  - Install Tailscale agent
  - `tailscale up --authkey=<key> --accept-routes --ssh`
  - Store Tailscale auth key in `SecretStorage`
  - Auto-approve device (via Tailscale API if key provided)

### 7. SSH Keys
- Upload/manage SSH keys to Hetzner
- Sync with local `~/.ssh/`

### 8. Regions & Datacenters
- Visual picker (nbg1, fsn1, hel1, ash, hil)
- Show current load/availability per location

---

## Extension Architecture

```
src/
├── extension.ts              # activate/deactivate
├── api/
│   ├── hetzner.ts            # Hetzner REST API client (hcloud-js or raw fetch)
│   └── tailscale.ts          # Tailscale API client
├── providers/
│   ├── serversProvider.ts    # TreeDataProvider for servers sidebar
│   ├── networksProvider.ts
│   ├── imagesProvider.ts
│   └── sshKeysProvider.ts
├── commands/
│   ├── createServer.ts       # multi-step wizard
│   ├── manageTokens.ts
│   ├── networkCommands.ts
│   └── imageCommands.ts
├── webviews/
│   ├── serverWizard.ts       # full WebviewPanel UI for server creation
│   └── cloudInitEditor.ts
├── tailscale/
│   ├── cloudInitInjector.ts  # injects tailscale block into cloud-init
│   └── authKeyManager.ts
└── utils/
    ├── secretStorage.ts      # wraps vscode.SecretStorage
    └── regionPicker.ts
```

---

## VS Code UI Surface

| Surface | Purpose |
|---|---|
| Activity Bar icon | "Hetzner" sidebar |
| TreeView: Servers | List all servers with status icons |
| TreeView: Networks | Private networks & subnets |
| TreeView: Images | Catalog + custom images |
| TreeView: SSH Keys | Registered keys |
| WebviewPanel | Server creation wizard |
| StatusBar item | Active project/token name |
| Notifications | Server state changes |

---

## Tech Stack

| What | Choice |
|---|---|
| Language | TypeScript |
| Bundler | esbuild (fast, minimal output) |
| Hetzner API | `hcloud-js` npm package or raw `fetch` |
| Credential storage | `vscode.SecretStorage` |
| Linting | ESLint + prettier |
| Testing | Mocha + `@vscode/test-electron` |

---

## Recommended Build Order

1. **Scaffold** — `yo code` extension template + esbuild setup
2. **Token manager** — SecretStorage, add/remove/switch tokens
3. **Hetzner API client** — typed wrapper around hcloud REST
4. **Servers TreeView** — list, status, basic commands
5. **Server creation wizard** — region picker, type picker, image picker
6. **Cloud-init editor** — template system + Tailscale auto-inject
7. **Custom images** — ISO upload flow
8. **Networks & Firewalls**
9. **SSH Key sync**
10. **Tailscale API integration** — auto-approve, key management
11. **Polish** — icons, status bar, notifications, error handling
12. **Package & publish** — `.vsix`, VS Code Marketplace
