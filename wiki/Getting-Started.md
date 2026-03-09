# Getting Started — Hetzner Cloud Toolkit

Follow this guide to set up the Hetzner Cloud Toolkit and create your first server.

## 1️⃣ Install the Extension

### Option A: VS Code Marketplace (Recommended)
1. Open VS Code
2. Go to **Extensions** (Ctrl+Shift+X)
3. Search for **Hetzner Cloud Toolkit**
4. Click **Install**

### Option B: Direct VSIX Download
1. Download from [GitHub Releases](https://github.com/brwinnov/vscode-hetzner-cloud/releases/latest/download/vscode-hetzner-cloud.vsix)
2. In VS Code, go to **Extensions** → **Install from VSIX**
3. Select the `.vsix` file

## 2️⃣ Get Your Hetzner API Token

You need a Hetzner Cloud API token to use this extension.

1. Log in to [console.hetzner.cloud](https://console.hetzner.cloud)
2. Select your project → **Security** → **API Tokens**
3. Click **Generate API Token**
4. Give it a **Name** and ensure **Read & Write** permissions are enabled
5. Click **Generate**
6. ⚠️ **Copy the token immediately** — Hetzner only shows it once!

### Token Permissions

The extension requires **Read & Write** access to:
- Servers
- Networks
- SSH Keys
- Firewalls
- Volumes
- Load Balancers

## 3️⃣ Add Your Token to the Extension

1. Open the **Hetzner Cloud Toolkit** sidebar (cloud icon in the Activity Bar)
2. Find the **SETUP** panel at the top
3. Click **Add Hetzner Project API Key**
4. Enter:
   - **Project Name**: A friendly name (e.g., `Production`, `Dev`, `Staging`)
   - **API Token**: Paste your token from step 2
5. Click **Add**

The extension will verify your token and load your resources automatically.

## 4️⃣ (Optional) Set Up SSH Keys

For password-less server access, set up SSH keys:

1. In the **SETUP** panel, click **Generate SSH Key** (or use an existing key)
2. The **SSH Key Generation Guide** will walk you through:
   - Generating a new Ed25519 key
   - Adding it to your Hetzner Cloud project
   - Saving it locally

**Note**: You only need to do this once per project.

## 5️⃣ (Optional) Configure Tailscale

To auto-install Tailscale on your servers:

1. Create a Tailscale account at [tailscale.com](https://tailscale.com)
2. In the **SETUP** panel, click **Set Tailscale Auth Key**
3. Log in to [Tailscale Admin Console](https://login.tailscale.com/admin) and generate an **Auth Key** (one-time, pre-approved)
4. Paste it into the extension
5. The extension will now auto-inject Tailscale into your server's cloud-init

**Note**: Authentication keys are stored securely in VS Code's SecretStorage.

## 6️⃣ Create Your First Server

1. Open the **SERVERS** panel in the sidebar
2. Click the **＋** button, or run `Hetzner Cloud Toolkit: Create Server` from the Command Palette
3. Follow the **7-step wizard**:
   - **Step 1: Basics** — Name your server, choose location
   - **Step 2: Server Type** — Choose CPU, RAM, storage (shows pricing)
   - **Step 3: OS Image** — Pick your OS (Ubuntu, Debian, CentOS, etc.)
   - **Step 4: SSH Keys** — Select keys for root access
   - **Step 5: Network** — Optionally add to a private network
   - **Step 6: Cloud-Init** — Add custom scripts (Tailscale auto-injects here)
   - **Step 7: Review** — Confirm all settings and create

4. Your new server will appear in the **SERVERS** panel within seconds
5. Right-click to **Power On**, **Power Off**, **Reboot**, or **Delete**

## 7️⃣ Next Steps

- **[Manage Networks](Network-Management)** — Create private networks for your servers
- **[Learn about Tailscale Integration](Tailscale-Integration)** — Auto-install VPN on servers
- **[Explore the Full Feature Guide](Features-Guide)** — Discover all capabilities

## ❓ Troubleshooting Initial Setup

### Extension Not Showing in Sidebar
- Reload VS Code: `Ctrl+Shift+P` → **Developer: Reload Window**
- Check VS Code version: Extension requires v1.85.0 or later

### Token Not Working
- Ensure token has **Read & Write** permissions
- Check that you're using the correct token (not a Deploy Token)
- Verify you're in the correct project

### No Projects Showing
1. Check your internet connection
2. Verify API token permissions
3. Try reloading: `Ctrl+Shift+P` → **Developer: Reload Window**

### Need More Help?
- Check **[Troubleshooting](Troubleshooting)** page
- Open an issue: https://github.com/brwinnov/vscode-hetzner-cloud/issues

---

**Ready to explore more?** Check out the **[Features Guide](Features-Guide)** 👉
