# Server Management — Hetzner Cloud Toolkit

Detailed guide for creating, configuring, and managing Hetzner Cloud servers.

## Creating a Server

The extension provides a **7-step wizard** for creating servers with all options available.

### Launch the Wizard

Choose one of:
1. Click the **＋** button in the **SERVERS** panel
2. Run **Hetzner Cloud Toolkit: Create Server** (Ctrl+Shift+P)
3. Right-click in the **SERVERS** panel and select **Create Server**

### Step 1: Basics

**Input:**
- **Server Name**: Unique identifier (alphanumeric, hyphens, underscores)
- **Location**: Choose a region
  - 🇩🇪 **Germany** (Falkenstein, Nuremberg)
  - 🇫🇮 **Finland** (Helsinki)
  - 🇸🇪 **Sweden** (Stockholm)
  - 🇸🇬 **Singapore**
  - 🇺🇸 **USA** (Virginia, Oregon)
  - 🇯🇵 **Japan** (Tokyo)

**Pricing:** Extension shows hourly/monthly pricing for your location choice.

**Tips:**
- Choose the location closest to your users
- Finland/Germany have the most availability zones
- Different zones may have different prices

---

### Step 2: Server Type

Choose the right server size for your workload.

**Available Types:**

| Type | CPU | RAM | Storage | Price |
|------|-----|-----|---------|-------|
| **CX11** | 1 (shared) | 1 GB | 25 GB SSD | ~€3/mo |
| **CX21** | 2 (shared) | 4 GB | 40 GB SSD | ~€6/mo |
| **CX31** | 2 | 8 GB | 80 GB SSD | ~€12/mo |
| **CX41** | 4 | 16 GB | 160 GB SSD | ~€24/mo |
| **CX51** | 8 | 32 GB | 240 GB SSD | ~€48/mo |
| **CPX11** | 2 (dedicated) | 4 GB | 40 GB SSD | ~€8/mo |
| **CPX21** | 4 (dedicated) | 8 GB | 80 GB SSD | ~€16/mo |
| **CPX41** | 8 (dedicated) | 16 GB | 160 GB SSD | ~€32/mo |

**Key Differences:**
- **CX** = Shared CPU (good for burstable workloads)
- **CPX** = Dedicated CPU (for consistent high performance)

**Tips:**
- Start with **CX11** or **CX21** for testing
- Scale up as needed (resize available)
- Dedicated CPU (**CPX**) best for databases, APIs
- Shared CPU (**CX**) best for web servers, cron jobs

**Upgrade/Downgrade:**
- Upgrades requires a reboot (can be resized with servers running)
- Downgrades require server shutdown

---

### Step 3: OS Image

Select your operating system.

**System Images:**
- **Ubuntu** (22.04 LTS, 20.04 LTS, 24.04 LTS)
- **Debian** (12, 11)
- **CentOS** (7, 8, Stream)
- **Fedora** (latest)
- **Rocky Linux** (9, 8)
- **AlmaLinux** (9, 8)
- **Arch Linux**
- **Windows Server** (2022, 2019)

**Snapshots:**
- Custom images created from your existing servers
- Useful for golden images, pre-configured setups
- Shows creation date and size

**Tips:**
- **Ubuntu 22.04 LTS** is most popular + best supported
- **Debian** for minimal/lightweight setups
- **CentOS/Rocky** for RHEL-compatible systems
- Snapshots great for multi-server deployments

**First-Time Setup:**
- All images come with cloud-init support
- Root user enabled by default
- APT/YUM package manager ready

---

### Step 4: SSH Keys

Configure authentication for the root user.

**Options:**

| Choice | Behavior |
|--------|----------|
| **Select SSH Key** | Root login limited to key holders |
| **No SSH Key** | Random root password generated (shown after creation) |

**Security Recommendations:**
- ✅ Always use SSH keys (more secure than passwords)
- ✅ Use passphrases with your local SSH key
- ❌ Don't share root passwords
- ❌ Don't use password authentication for production

**Add New Key:**
- Click **Add One** link to jump to SSH Key Management
- Generate a new key or import existing `.pub` file
- Return to wizard and select it

**Multiple Keys:**
- Select multiple keys to add them all (multi-select available)
- Any key can be used for root login

**Tips:**
- Store passphrases securely (use `ssh-agent` for convenience)
- Keep private keys safe (local machine only)
- Backup key files to secure location

---

### Step 5: Network

Add server to a private network.

**Options:**

| Option | Benefit |
|--------|---------|
| **No Network** | Server gets public IP only |
| **Existing Network** | Server joins internal network + gets public IP |
| **Create New Network** | Define new network inline |

**Why Use Private Networks?**
- **Security**: Internal traffic stays private
- **Multi-server apps**: Databases talk to apps privately
- **Cost**: Reduce public IP usage
- **Organization**: Group related servers

**Network Details:**
- Each network has CIDR range (e.g., `10.0.0.0/8`)
- Server assigned IP within range
- Multiple servers can join same network
- Subnets organized by zone

**Creating a Network:**
1. Choose **Create New Network**
2. Enter network name
3. Confirm CIDR range
4. Server joins upon creation

**Tips:**
- Use descriptive names: `staging-db-network`, `prod-app-tier`
- Standard private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- Don't use overlapping ranges across projects

---

### Step 6: Cloud-Init

Custom startup script (optional).

**What is Cloud-Init?**
- Scripts running as **root** on first boot
- Good for:
  - Installing packages (`apt-get install`, `yum install`)
  - Setting environment variables
  - Creating users
  - Starting services
  - Injecting Tailscale (extension does this)

**Pre-filled Content:**
- Extension auto-adds Tailscale block (if enabled)
- You can edit before confirming creation

**Common Commands:**
```yaml
#cloud-config
packages:
  - nginx
  - curl
  - git

runcmd:
  - systemctl start nginx
  - echo "Hello from $(hostname)" > /var/www/html/index.html
```

**Reserved Keywords:**
- `#cloud-config` — Format indicator (must be first)
- `packages` — List of packages to install
- `runcmd` — Shell commands to run

**Tailscale Injection:**
- If enabled in settings, extension adds:
  ```yaml
  runcmd:
    - curl -fsSL https://tailscale.com/install.sh | sh
    - tailscale up --authkey=ts_... --accept-routes --ssh
  ```
- Your custom commands appear after this

**Tips:**
- Start simple; test on small server first
- Use **Ubuntu/Debian** for best cloud-init support
- Avoid blocking operations (keep scripts fast)
- Log output to check results: `cloud-init status --long`

---

### Step 7: Review

Final confirmation before server creation.

**Review Shows:**
- ✅ Server name
- ✅ Type (CPU, RAM, storage)
- ✅ OS image
- ✅ Location
- ✅ SSH keys (if any)
- ✅ Network (if any)
- ✅ Total monthly cost estimate

**After Create:**
- Server appears in **SERVERS** panel within seconds
- Status starts as 🟡 **Initializing**
- Changes to 🟢 **Running** once ready (~30 seconds)
- Cloud-init runs in background

---

## Managing Existing Servers

### Open Server Details

Click on any server in the **SERVERS** panel to open the **Server Detail** view.

**Shows:**
- Server name and status
- Public IPv4 and IPv6 addresses
- Private IP (if in network)
- Server type specs (CPU, RAM, storage)
- Labels and metadata
- Root password (if generated)

**Actions Available:**
- 📋 Click IP to copy
- 🔓 Copy root password to clipboard
- 🟢 Power On
- 🔴 Power Off
- 🔄 Reboot
- 🗑️ Delete

### Power Management

Right-click any server in the **SERVERS** panel:

**Power On**
- Starts a powered-off server
- Takes 10-30 seconds
- Status changes to 🟡 then 🟢
- SSH access restored

**Power Off**
- Graceful shutdown (OS signal)
- Server takes time to shut down cleanly
- Status changes to 🟡 then 🔴
- Data preserved on storage

**Reboot**
- Restarts the server
- Status goes 🟡 → 🔴 → 🟡 → 🟢
- Services restart
- Cloud-init doesn't re-run

### Deleting a Server

⚠️ **Destructive action — cannot be undone**

1. Right-click server → **Delete Server**
2. Confirm the action
3. Server is deleted immediately
4. All data is lost
5. Backups aren't kept (unless you have snapshots)

**Before Deleting:**
- Back up important data
- Export snapshots if needed
- Confirm no production traffic
- Note IP addresses if needed

---

## Advanced: SSH Terminal Access

If SSH key is configured on server:

1. Right-click server in **SERVERS** panel
2. Choose **Open SSH Terminal** (if available)
3. Terminal opens with SSH connection
4. Root login via your SSH key

**Requirements:**
- SSH key installed locally
- Server has SSH key in Step 4
- `ssh` command available in PATH
- Public IP accessible from your network

---

## Monitoring & Automation

The extension updates server status every few seconds.

**Status Indicators:**
- 🟢 **Running** — Server is online and ready
- 🔴 **Off** — Server powered down
- 🟡 **Initializing** — Starting up or provisioning
- ❌ **Error** — Something went wrong (rare)

**Manual Refresh:**
- Right-click **SERVERS** panel
- Choose **Refresh** to force update

---

## Cost Optimization Tips

1. **Right-size instances** — Start small, upgrade as needed
2. **Use snapshots** — Clone from golden images vs. rebuild
3. **Power off unused servers** — Keep snapshots, delete instances
4. **Location choice** — Farther = sometimes cheaper
5. **Monthly billing** — Commit to better rates

---

**Next:** Learn about [Network Management](Network-Management) 👉
