# Features Guide — Hetzner Cloud Toolkit

A comprehensive overview of all extension features.

## 🗂️ Multi-Project Support

Work with multiple Hetzner Cloud projects (accounts) from a single extension instance.

### Add a Project
1. Open the **Hetzner Cloud Toolkit** sidebar
2. In the **SETUP** panel, click **Add Hetzner Project API Key**
3. Enter project name and API token
4. The project appears in the **PROJECTS** panel

### Switch Active Project
- Click a project name in the **PROJECTS** panel to make it active
- Alternatively, use the **Status Bar** dropdown (bottom right)
- All resource panels (servers, networks, SSH keys) update automatically

### Remove a Project
- Right-click a project in the **PROJECTS** panel
- Choose **Remove Project**
- Your token is deleted from VS Code's SecretStorage

---

## 🖥️ Server Management

### View Servers
- Open the **SERVERS** panel in the sidebar
- Servers show their:
  - **Status icon**: 🟢 Running | 🔴 Off | 🟡 Initializing
  - **Server Type**: CPU cores and RAM
  - **Location**: Region/datacenter
  - **Public IPs**: Click to copy

### Open Server Details
- Click on a server name to open the **Server Detail** panel
- Shows:
  - Status, IP addresses, server type
  - Labels and metadata
  - Quick action buttons (Power On, Power Off, Reboot, Delete)
  - Root password (if no SSH key was assigned)

### Create a Server

1. Click the **＋** button in the **SERVERS** panel
2. Follow the **7-step wizard**:

#### Step 1: Basics
- **Server Name**: Choose a unique name
- **Location**: Pick a region (EU, US, Asia, etc.)
- Hetzner shows pricing per location

#### Step 2: Server Type
- Choose CPU cores and RAM (e.g., CX11, CX31, CPX41)
- Live pricing displayed
- Dedicated CPU or shared options

#### Step 3: OS Image
- **System Images**: Ubuntu, Debian, CentOS, Fedora, etc.
- **Snapshots**: Custom images from previous servers
- Filters available for quick search

#### Step 4: SSH Keys
- Select SSH keys for root access (optional)
- If no key selected, Hetzner assigns a random root password (shown after creation)
- Click **Add One** to create/import a key from SSH Key Management

#### Step 5: Network
- Optionally add to a private network
- Leave empty for public-only access
- Networks can be created inline

#### Step 6: Cloud-Init
- View and edit cloud-init script
- Tailscale is auto-injected here (if enabled)
- Add custom commands for automated setup

#### Step 7: Review
- Review all settings
- Confirm and create
- Server spins up within seconds

### Manage Running Servers

Right-click any server in the **SERVERS** panel:

- **🟢 Power On** — Start a powered-off server
- **🔴 Power Off** — Gracefully shut down
- **🔄 Reboot** — Restart the server
- **🗑️ Delete** — Remove server (with confirmation)
- **📋 Copy IP** — Copy public IP to clipboard
- **🔑 Open SSH Terminal** — SSH into the server (if SSH key configured)

---

## 🌐 Network Management

Create and manage private networks for server communication.

### View Networks
- Open the **NETWORKS** panel in the sidebar
- Each network shows:
  - Network name
  - IP range (CIDR)
  - Subnets and their zones
  - Associated servers (as children)

### Create a Network

From the **NETWORKS** panel:
1. Click the **＋** button
2. Enter network name (e.g., `internal-staging`)
3. Choose IP range (default: `10.0.0.0/8`)
4. Network is created within seconds

Or during **server creation** (Step 5):
- Choose **Create New Network**
- Enter details inline
- Proceed with server wizard

### Manage Subnets

- View all subnets under each network
- Each subnet shows:
  - IP range (CIDR)
  - Zone (Zone 1, Zone 2, etc.)
  - Network type (vlan, vpc — upcoming)

### Delete a Network

- Right-click a network in the **NETWORKS** panel
- Choose **Delete Network** (with confirmation)
- Warning: Ensure no servers are attached

---

## 🔑 SSH Key Management

Securely manage SSH keys for authentication.

### View SSH Keys
- Open the **SSH KEYS** panel
- Each key shows:
  - Key name
  - Key type (Ed25519, RSA)
  - Fingerprint
  - Public key (click to preview)

### Add an SSH Key

1. Click the **＋** button in the **SSH KEYS** panel
2. Choose an existing `.pub` file from your `~/.ssh/` directory
3. Key is uploaded to Hetzner Cloud
4. Appears in the SSH KEYS panel

### Generate a New SSH Key

1. In the **SETUP** panel, click **Generate SSH Key**
2. The **SSH Key Generation Guide** opens with tabs for:
   - **Windows**: How to generate with PuTTY or WSL
   - **macOS**: Instructions for Terminal
   - **Linux/RHEL**: Native OpenSSH commands
3. Follow the guide to generate and add a key

### Delete an SSH Key

- Right-click a key in the **SSH KEYS** panel
- Choose **Delete SSH Key** (with confirmation)
- Warning: Ensure no servers are using this key

---

## 🐟 Tailscale Integration

Auto-install Tailscale VPN on servers during creation.

### Set Up Tailscale Auth Key

1. Create a free account at [tailscale.com](https://tailscale.com)
2. Go to [Admin Console](https://login.tailscale.com/admin)
3. Sidebar → **Settings** → **Keys and OAuth** → **Auth keys**
4. Click **Generate auth key**
   - Enable **Reusable** (optional)
   - Enable **Pre-approved** (recommended)
5. Copy the key
6. In extension's **SETUP** panel, click **Set Tailscale Auth Key**
7. Paste the key
8. Stored securely in VS Code's SecretStorage

### Auto-Inject Tailscale

During **server creation** (Step 6: Cloud-Init):
- Toggle **Inject Tailscale** on/off
- If enabled, Hetzner Cloud Toolkit adds cloud-init commands:
  ```bash
  runcmd:
    - curl -fsSL https://tailscale.com/install.sh | sh
    - tailscale up --authkey=ts_[...] --accept-routes --ssh
  ```
- Server joins your Tailscale network automatically

### Tailscale Configuration

Via extension settings, customize Tailscale injection:
- `Hetzner Cloud Toolkit.tailscale.enableByDefault` — Pre-check Tailscale toggle
- `Hetzner Cloud Toolkit.tailscale.extraArgs` — Extra flags (default: `--accept-routes --ssh`)

---

## 🖼️ Additional Resource Panels

The sidebar includes read-only views of other Hetzner resources:

### Images
- System images (Ubuntu, Debian, etc.)
- Snapshots from your servers
- Good reference before server creation

### Firewalls
- View firewall rules
- Manage allow/deny rules
- Apply to server groups

### Volumes
- Attach/detach block storage
- Resize and manage
- Attach to servers

### Load Balancers
- Create and manage load balancers
- Add server targets
- Configure algorithms

### Storage Boxes
- View Hetzner Robot storage boxes
- Mount via cloud-init
- Backup and archival storage

---

## 🎛️ Extension Settings

Customize behavior via VS Code settings:

| Setting | Default | Purpose |
|---------|---------|---------|
| `Hetzner Cloud Toolkit.tailscale.enableByDefault` | `true` | Pre-check Tailscale in server wizard |
| `Hetzner Cloud Toolkit.tailscale.extraArgs` | `--accept-routes --ssh` | Extra CLI args for `tailscale up` |

Edit settings:
1. Open **VS Code Settings** (Ctrl+,)
2. Search for `Hetzner Cloud Toolkit`
3. Modify as needed

---

## 📋 Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| **Create Server** | - |
| **Reload Servers** | - |
| **Toggle Project** | - |

Use the **Command Palette** (Ctrl+Shift+P) to run any command.

---

## 🎨 Visual Indicators

The extension uses consistent icons and colors:

- **🟢 Green** = Running status
- **🔴 Red** = Off/error status
- **🟡 Yellow** = Processing/initializing
- **+ icon** = Add/create action
- **Gear icon** = Settings
- **Cloud icon** = Hetzner-specific

---

**Need help with a specific feature?** Check [Troubleshooting](Troubleshooting) 👉
