# API & Development — Hetzner Cloud Toolkit

Architecture guide, API reference, and contribution guidelines for developers.

## Project Architecture

```
HetznerCloudToolkit/
├── src/
│   ├── extension.ts                 # Entry point - activate/deactivate
│   ├── api/
│   │   ├── hetzner.ts              # Hetzner Cloud REST API client
│   │   └── robot.ts                # Hetzner Robot API client
│   ├── commands/
│   │   ├── manageTokens.ts         # Token CRUD operations
│   │   ├── serverCommands.ts       # Server create/power/delete
│   │   ├── networkCommands.ts      # Network CRUD
│   │   ├── sshKeyCommands.ts       # SSH key CRUD
│   │   ├── firewallCommands.ts     # Firewall & rules CRUD
│   │   ├── volumeCommands.ts       # Volume operations
│   │   ├── storageBoxCommands.ts   # Robot storage boxes
│   │   └── loadBalancerCommands.ts # Load balancer CRUD
│   ├── providers/
│   │   ├── setupProvider.ts        # SETUP tree view (onboarding)
│   │   ├── projectsProvider.ts     # PROJECTS selector
│   │   ├── serversProvider.ts      # SERVERS tree + polling
│   │   ├── networksProvider.ts     # NETWORKS tree
│   │   ├── imagesProvider.ts       # IMAGES tree
│   │   ├── sshKeysProvider.ts      # SSH KEYS tree
│   │   ├── firewallsProvider.ts    # FIREWALLS tree
│   │   ├── volumesProvider.ts      # VOLUMES tree
│   │   ├── storageBoxProvider.ts   # STORAGE BOXES tree
│   │   └── loadBalancersProvider.ts # LOAD BALANCERS tree
│   ├── tailscale/
│   │   ├── authKeyManager.ts       # Secure Tailscale key storage
│   │   └── cloudInitInjector.ts    # Cloud-init Tailscale block
│   ├── utils/
│   │   ├── secretStorage.ts        # TokenManager, credential managers
│   │   └── storageBoxInjector.ts   # CIFS mount cloud-init
│   └── webviews/
│       ├── serverWizard.ts         # 7-step server creation WebView
│       ├── serverDetail.ts         # Server detail panel
│       ├── sshKeyGuide.ts          # SSH key generation guide
│       └── welcomePage.ts          # Welcome/overview panel
├── resources/
│   └── icon.png                     # Extension marketplace icon
├── package.json                     # Extension metadata
├── tsconfig.json                    # TypeScript config
└── esbuild.js                       # Build configuration
```

---

## Core Components

### 1. Extension Entry Point (`extension.ts`)

**Responsibilities:**
- Activate extension on first use
- Register all commands
- Initialize all TreeView providers
- Set up webviews
- Handle deactivation cleanup

**Key Functions:**
```typescript
export async function activate(context: vscode.ExtensionContext) {
  // Initialize TokenManager with SecretStorage
  // Register all commands
  // Create tree views
  // Start polling for server status
}

export function deactivate() {
  // Cleanup: stop polling, clear handlers
}
```

### 2. REST API Clients

#### `api/hetzner.ts`
Typed REST client for Hetzner Cloud API v1

```typescript
class HetznerClient {
  constructor(token: string) {};
  
  // Servers
  async listServers(): Promise<Server[]>
  async getServer(id: number): Promise<Server>
  async createServer(opts: CreateServerRequest): Promise<Server>
  async powerOnServer(id: number): Promise<void>
  async powerOffServer(id: number): Promise<void>
  async rebootServer(id: number): Promise<void>
  async deleteServer(id: number): Promise<void>
  
  // Networks
  async listNetworks(): Promise<Network[]>
  async createNetwork(name: string, cidr: string): Promise<Network>
  async deleteNetwork(id: number): Promise<void>
  
  // SSH Keys
  async listSSHKeys(): Promise<SSHKey[]>
  async createSSHKey(name: string, publicKey: string): Promise<SSHKey>
  async deleteSSHKey(id: number): Promise<void>
  
  // Images, Locations, ServerTypes, Firewalls, Volumes, etc.
}
```

**Features:**
- No external dependencies (native `fetch`)
- Type-safe requests/responses
- Automatic error handling
- Pagination support

#### `api/robot.ts`
Hetzner Robot API client (HTTP Basic Auth)

```typescript
class RobotClient {
  constructor(username: string, password: string) {};
  
  // Storage boxes
  async listStorageBoxes(): Promise<StorageBox[]>
  async getStorageBox(id: number): Promise<StorageBox>
}
```

---

### 3. TokenManager (Secure Storage)

Manages Hetzner API tokens securely using VS Code's SecretStorage.

```typescript
class TokenManager {
  async addToken(projectName: string, token: string): Promise<void>
  async removeToken(projectName: string): Promise<void>
  async listProjects(): Promise<Project[]>
  async getActiveProject(): Promise<Project | null>
  async setActiveProject(projectName: string): Promise<void>
  
  // Returns HetznerClient or null if no active token
  async getActiveClient(): Promise<HetznerClient | null>
}
```

**Storage:**
- Uses `context.secrets` (VS Code's SecretStorage API)
- Encrypted by OS (Windows: Credential Manager, macOS: Keychain, Linux: gnome-keyring)
- Tokens never logged or exposed
- CSV index in state (non-sensitive metadata)

**File:** `utils/secretStorage.ts`

---

### 4. TreeView Providers

TreeView providers display resources in the VS Code sidebar.

**Base Pattern:**

```typescript
class ServersProvider implements vscode.TreeDataProvider<ServerItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  
  async getTreeItem(element: ServerItem): Promise<vscode.TreeItem> {
    // Return item with icon, label, collapsible state
  }
  
  async getChildren(element?: ServerItem): Promise<ServerItem[]> {
    // Return children nodes
  }
  
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
```

**Providers:**
- `setupProvider.ts` — SETUP panel (onboarding tasks)
- `projectsProvider.ts` — PROJECTS selector (multi-project)
- `serversProvider.ts` — SERVERS tree (with status polling every 5s)
- `networksProvider.ts` — NETWORKS tree (subnets as children)
- `sshKeysProvider.ts` — SSH KEYS tree
- `firewallsProvider.ts` — FIREWALLS tree (rules as children)
- `volumesProvider.ts` — VOLUMES tree
- `loadBalancersProvider.ts` — LOAD BALANCERS tree

---

### 5. WebView Panels

Interactive WebViews for complex UIs.

#### Server Wizard (`webviews/serverWizard.ts`)

7-step form in a WebView panel:
1. **Basics** — Name, Location
2. **Server Type** — CPU/RAM selection
3. **OS Image** — System or snapshot
4. **SSH Keys** — Authentication
5. **Network** — Private network
6. **Cloud-Init** — Custom scripts
7. **Review** — Confirmation

**Communication:**
- Extension ↔ WebView via `postMessage()`
- WebView sends form data, extension validates & creates server
- Polling updates server status in extension

**File:** `webviews/serverWizard.ts`

#### Server Detail (`webviews/serverDetail.ts`)

Shows server info and action buttons:
- Status, IPs, specs
- Quick actions (Power On/Off, Reboot, Delete)
- Root password (if no SSH key)

#### SSH Key Generation Guide (`webviews/sshKeyGuide.ts`)

Tabbed WebView with OS-specific SSH key generation instructions:
- Windows (OpenSSH + PuTTY)
- macOS
- Linux

---

## API Reference

### Hetzner Cloud API

**Base URL:** `https://api.hetzner.cloud/v1`

**Authentication:** Bearer token in `Authorization` header

**Example Request:**
```typescript
const response = await fetch('https://api.hetzner.cloud/v1/servers', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

**Key Endpoints:**
- `GET /servers` — List servers
- `POST /servers` — Create server
- `GET /servers/{id}` — Get server details
- `POST /servers/{id}/actions/power/on` — Power on
- `POST /servers/{id}/actions/power/off` — Power off
- `POST /servers/{id}/actions/reboot` — Reboot
- `DELETE /servers/{id}` — Delete server

**Official Docs:** https://docs.hetzner.cloud/cloud/servers/overview

---

## Development Setup

### Prerequisites

- Node.js 18+
- VS Code 1.85.0+
- TypeScript
- esbuild (bundler)

### Clone & Install

```bash
git clone https://github.com/brwinnov/vscode-hetzner-cloud.git
cd vscode-hetzner-cloud

npm install
```

### Build

```bash
# Development build
npm run build

# Watch mode (rebuilds on file changes)
npm run watch
```

### Debug

1. Open project in VS Code
2. Press **F5** to launch debug extension host
3. A new VS Code window opens with extension active
4. Set breakpoints in TypeScript files
5. Breakpoints pause execution in debug window

**Debug Configuration:** `.vscode/launch.json`

### Package & Release

```bash
# Build VSIX package
npm run build
vsce package

# This creates: vscode-hetzner-cloud-0.1.0.vsix
```

---

## Extension APIs Used

### VS Code Extension API

- **Sidebar TreeViews** — `vscode.window.createTreeView()`
- **WebView Panels** — `vscode.window.createWebviewPanel()`
- **Commands** — `vscode.commands.registerCommand()`
- **SecretStorage** — `context.secrets.store/get/delete()`
- **Status Bar** — `vscode.window.createStatusBarItem()`

**Reference:** https://code.visualstudio.com/api/references/vscode-api

---

## Contributing

### Setting Up for Development

1. Fork repo on GitHub
2. Clone your fork locally
3. Create feature branch: `git checkout -b feat/my-feature`
4. Install dependencies: `npm install`
5. Run watch mode: `npm run watch`
6. Test in extension host (F5)

### Code Style

- **Language:** TypeScript
- **Linter:** ESLint
- **Formatter:** Prettier
- **Indentation:** 2 spaces

### Before Submitting PR

```bash
# Format code
npm run format

# Lint
npm run lint

# Build
npm run build

# Test in extension host (F5)
```

### Commit Messages

Follow conventional commits:

```
feat: Add feature X
fix: Fix bug in Y
docs: Update README
refactor: Reorganize module Z
test: Add tests for X
```

### Pull Request Checklist

- ✅ Tests pass in extension host (F5)
- ✅ Code formatted with Prettier
- ✅ No ESLint errors
- ✅ Changelog updated (CHANGELOG.md)
- ✅ Clear PR title and description

### Development Tips

1. **Find what changed:** Open Source Control in VS Code
2. **Test with real token:** Use a test Hetzner Cloud project
3. **Check extension logs:** Open **Extension Host** console (F5)
4. **Reload extension:** `Developer: Reload Window` (Ctrl+R)
5. **Build before testing:** Always run `npm run build` first

---

## Common Patterns

### Adding a New Command

1. Create function in `commands/`:
   ```typescript
   // commands/exampleCommand.ts
   export async function exampleCommand() {
     const client = await tokenManager.getActiveClient();
     // Do something
   }
   ```

2. Register in `extension.ts`:
   ```typescript
   const exampleCmd = vscode.commands.registerCommand(
     'hcloud.example',
     () => exampleCommand()
   );
   context.subscriptions.push(exampleCmd);
   ```

3. Add to `package.json` contributions:
   ```json
   {
     "command": "hcloud.example",
     "title": "Hetzner Cloud: Example Command"
   }
   ```

### Adding a New TreeView Provider

1. Create class implementing `vscode.TreeDataProvider<ItemType>`
2. Implement `getTreeItem()` and `getChildren()`
3. Create event emitter for `onDidChangeTreeData`
4. Register in `extension.ts`:
   ```typescript
   const provider = new MyProvider();
   vscode.window.createTreeView('myView', { treeDataProvider: provider });
   ```

5. Add to `package.json` contributions:
   ```json
   {
     "id": "myView",
     "name": "My View"
   }
   ```

---

## Troubleshooting Development

### Build Fails

```bash
npm run clean
npm install
npm run build
```

### Extension doesn't load (F5)

1. Check **Extension Host** output (Debug Console)
2. Verify `package.json` contributions syntax
3. Reload: `Developer: Reload Window`

### SecretStorage not working

- SecretStorage only available in VS Code 1.85.0+
- Check `logLevel` in `.npmrc` for debugging
- Verify token manager initialization

---

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v0.1.1`
4. Push to GitHub: `git push origin main --tags`
5. Build VSIX: `npm run build && vsce package`
6. Create GitHub Release with VSIX attached
7. Publish to marketplace (requires publisher account)

---

## Resources

- **Hetzner Cloud API Docs:** https://docs.hetzner.cloud/
- **VS Code Extension API:** https://code.visualstudio.com/api
- **WebView Best Practices:** https://code.visualstudio.com/api/extension-guides/webview
- **esbuild Docs:** https://esbuild.github.io/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/

---

**Questions?** Open an issue on GitHub: https://github.com/brwinnov/vscode-hetzner-cloud/issues

