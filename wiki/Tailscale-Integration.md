# Tailscale Integration — Hetzner Cloud Toolkit

Guide to using Tailscale VPN with the Hetzner Cloud Toolkit extension.

## What Is Tailscale?

**Tailscale** is a modern VPN that makes it easy to securely access your servers from anywhere.

**Key Features:**
- 🔒 End-to-end encryption (no central VPN server traffic)
- 🌍 Works worldwide (peer-to-peer, fallback to DERP relays)
- 📱 Multi-platform (Windows, macOS, Linux, iOS, Android)
- 🚀 Zero configuration (automatic IP assignment)
- 🔐 Uses WireGuard protocol (modern, fast, secure)
- ✅ Free tier available (up to 3 users)

**Use Cases:**
- **Remote Access** — SSH into servers from coffee shop
- **Multi-Region** — Access servers in multiple datacenters via private IPs
- **Team Access** — Share access to infrastructure securely
- **Split Tunneling** — Route only server traffic through VPN
- **Exit Node** — Use servers as VPN exit nodes

---

## Setting Up Tailscale

### 1. Create a Tailscale Account

1. Go to [tailscale.com](https://tailscale.com)
2. Sign up (Google, Microsoft, GitHub, or email)
3. No credit card required for free tier

### 2. Configure Tailscale Auth Key

1. Log into [Tailscale Admin Console](https://login.tailscale.com/admin)
2. Left sidebar → **Settings** → **Keys and OAuth** → **Auth keys**
3. Click **Generate auth key**
4. **Options:**
   - ✅ **Reusable** — Key can be used multiple times (recommended)
   - ✅ **Pre-approved** — Devices auto-join without approval (recommended)
   - ⏰ **Expires in** — Set expiration (3 months, 1 year, etc.)
5. Click **Generate**
6. Copy the key (shows only once: `tskey-...`)

### 3. Add Key to Extension

1. Open **Hetzner Cloud Toolkit** sidebar
2. Click the **SETUP** panel
3. Click **Set Tailscale Auth Key**
4. Paste the key
5. Key stored securely in VS Code's SecretStorage

**That's it!** Your servers created from now on will auto-inject Tailscale.

---

## Auto-Injecting Tailscale on Server Creation

During **Step 6** (Cloud-Init) of the server creation wizard:

1. You'll see **Inject Tailscale** toggle
2. Toggle **ON** to auto-add Tailscale
3. Extension appends cloud-init commands:
   ```bash
   runcmd:
     - curl -fsSL https://tailscale.com/install.sh | sh
     - tailscale up --authkey=tskey-... \
       --accept-routes \
       --ssh
   ```

4. Server automatically:
   - Installs Tailscale
   - Joins your Tailscale network
   - Appears in [Tailscale Admin Console](https://login.tailscale.com/admin/machines)
   - Gets a private Tailscale IP (e.g., `100.x.x.x`)

### What Those Flags Do

| Flag | Purpose |
|------|---------|
| `--authkey=...` | Auto-authenticate with your auth key (no manual approval needed) |
| `--accept-routes` | Accept subnet routes from other devices |
| `--ssh` | Enable SSH over Tailscale (use `ssh user@tailscale-ip`) |

---

## Connecting to Your Servers via Tailscale

### Method 1: Tailscale IP (Recommended)

Once server joins Tailscale:

1. Open [Tailscale Admin Console](https://login.tailscale.com/admin/machines)
2. Find your server in the **Machines** list
3. Note its Tailscale IP (e.g., `100.110.123.45`)
4. SSH using Tailscale IP:
   ```bash
   ssh root@100.110.123.45
   ```

**Advantage:** Works globally without public IP!

### Method 2: Using Tailscale DNS

Tailscale provides magic DNS:

```bash
# SSH using hostname
ssh root@web-server-01
```

Requires:
1. DNS enabled in [Tailscale Admin Console](https://login.tailscale.com/admin/dns)
2. Your device connected to Tailscale
3. Magic DNS enabled on your device

### Method 3: From Your Device

Install Tailscale on your **local machine**:

1. Download from [tailscale.com/download](https://tailscale.com/download)
2. Install and run
3. Click **Log in**
4. You're now on the same VPN as your servers
5. Access servers by private IP or hostname

**Example Workflow:**
```
Your Laptop (100.100.10.50)
       ↓ [Tailscale VPN]
Web Server (100.110.123.45)
       ↓
Database Server in Private Network (10.0.0.5)

ssh root@100.110.123.45          # Direct to server
ssh root@100.110.123.45           # From web server, reach database
  cd /path/to/app
  mysql -h 10.0.0.5 -u root      # Private network access
```

---

## Advanced: Custom Tailscale Configuration

### Extension Settings

Customize Tailscale injection via VS Code settings:

**Setting:** `Hetzner Cloud Toolkit.tailscale.extraArgs`

**Default:** `--accept-routes --ssh`

**Examples:**

```json
// Enable Funnel (public internet access via Tailscale)
"Hetzner Cloud Toolkit.tailscale.extraArgs": "--accept-routes --ssh --funnel=443"

// Disable SSH, accept routes only
"Hetzner Cloud Toolkit.tailscale.extraArgs": "--accept-routes"

// Enable exit node
"Hetzner Cloud Toolkit.tailscale.extraArgs": "--accept-routes --ssh --advertise-exit-node"
```

**Setting:** `Hetzner Cloud Toolkit.tailscale.enableByDefault`

**Default:** `true`

- `true` — Tailscale toggle pre-checked in wizard
- `false` — Tailscale toggle unchecked (you manually enable per server)

### Manual Cloud-Init Configuration

If you need fine-grained control, skip auto-injection:

1. During server wizard, toggle Tailscale OFF
2. In **Step 6** (Cloud-Init), manually add:

```yaml
#cloud-config
packages:
  - curl

runcmd:
  - curl -fsSL https://tailscale.com/install.sh | sh
  - tailscale up --authkey=tskey-XXXX \
    --hostname="custom-hostname" \
    --accept-routes \
    --ssh \
    --advertise-exit-node
```

---

## Common Tailscale Setups

### Setup 1: Remote Access to Single Server

```
Your Laptop (Tailscale client)
    ↓ [VPN]
    ↓
Server (Tailscale, public IP not needed for access)
```

**Benefits:** Access server globally without exposing public IP

**Setup:**
1. Create server with Tailscale enabled
2. Install Tailscale on laptop
3. SSH to server via Tailscale IP

### Setup 2: Private Network Access

```
Laptop (Tailscale)
    ↓ [VPN]
Web Server (Tailscale, in private network)
    ↓ [Hetzner private network]
Database (No public IP, no Tailscale needed)
```

**Benefits:** Secure access to entire infrastructure

**Setup:**
1. Create servers with Tailscale + Hetzner private networks
2. Laptop accesses web server via Tailscale IP
3. Web server accesses database via private IP (10.x.x.x)

### Setup 3: Multi-Region with Tailscale

```
Region A: Europe
  └─ Server A (Tailscale, 100.110.1.1)

Region B: Asia
  └─ Server B (Tailscale, 100.110.1.2)

Your Laptop (Tailscale)
  ↓ Can reach both servers
  └─ All communication encrypted & optimized
```

**Benefits:** Servers in different regions act like one network

**Setup:**
1. Create servers in different locations
2. All with Tailscale enabled
3. All auto-join same Tailscale network
4. Direct connection between servers (peer-to-peer)

---

## Security: Access Control

Once servers are on Tailscale, manage access:

### In Tailscale Admin Console

1. Open [Tailscale Admin Console](https://login.tailscale.com/admin/acl)
2. Go to **Access controls** (ACLs)
3. Define who can access what:

```
{
  "acls": [
    // Developers can SSH to all servers
    {
      "action": "accept",
      "src": ["group:developers"],
      "dst": ["tag:server:*:22"]
    },
    // Database access only from web servers
    {
      "action": "accept",
      "src": ["tag:web"],
      "dst": ["tag:database:5432"]
    },
    // Block everything else
    {
      "action": "deny",
      "src": ["*"],
      "dst": ["*"]
    }
  ]
}
```

### Using Tags

Label servers for easy ACL management:

1. In [Admin Console](https://login.tailscale.com/admin/machines), click server
2. Add tags (e.g., `tag:web`, `tag:database`)
3. Use in ACLs for flexible access control

---

## Monitoring & Debugging

### Check Server Status in Tailscale

1. Open [Tailscale Admin Console](https://login.tailscale.com/admin/machines)
2. Find your server
3. Status indicators:
   - 🟢 **Connected** — Server online and reachable
   - 🔴 **Offline** — Server down or internet lost
   - 🟡 **Pending** — Waiting for cloud-init to complete

### Debug Connection Issues

```bash
# Check Tailscale status on server
ssh root@server-public-ip
tailscale status

# Should show:
# 100.110.123.45     your-server       yourname ---
# 100.100.10.50      your-laptop       yourname

# Ping test
tailscale ping 100.100.10.50

# Force reconnect
sudo tailscale logout
sudo tailscale up --authkey=tskey-...
```

### Cloud-Init Logs

Check if Tailscale injection worked:

```bash
ssh root@server-public-ip
sudo cat /var/log/cloud-init-output.log | grep -i tailscale
```

---

## Troubleshooting

### Server Doesn't Appear in Tailscale Admin Console

**Cause:** cloud-init didn't run or failed

**Solutions:**
1. Check `/var/log/cloud-init.log`:
   ```bash
   ssh root@server-public-ip
   sudo cat /var/log/cloud-init.log | tail -50
   ```

2. Verify auth key is valid:
   - Check [Tailscale Admin Console](https://login.tailscale.com/admin/keys)
   - Is key still valid (not expired)?
   - Is it marked as "Reusable"?

3. Re-inject Tailscale manually:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up --authkey=tskey-XXXX --accept-routes --ssh
   ```

### Can't SSH via Tailscale IP

**Cause 1:** Tailscale not connected on your laptop

**Solution:**
- Open Tailscale app on your laptop
- Ensure it says "Connected"

**Cause 2:** SSH not enabled on server

**Solution:**
```bash
# On server
ssh root@server-public-ip
sudo tailscale up --ssh
```

**Cause 3:** Firewall blocking SSH

**Solution:**
- Check server's OS firewall
- Verify SSH service running: `sudo systemctl status ssh`

### Can't Access Private Network Resources

**Cause:** `--accept-routes` not enabled

**Solution:**
- Re-create server with Tailscale enabled
- Or manually:
  ```bash
  ssh root@server-public-ip
  sudo tailscale up --accept-routes
  ```

---

## Pricing

- **Free Tier:**
  - Up to 3 users
  - Unlimited devices per user
  - Perfect for personal projects

- **Teams:**
  - $12/month per team member
  - Advanced ACLs
  - Shared devices
  - Funnel & routing features

---

## Learn More

- **Official Docs:** https://tailscale.com/kb/
- **SSH Usage:** https://tailscale.com/kb/1193/tailscale-ssh/
- **ACLs:** https://tailscale.com/kb/1018/acls/
- **Funneling:** https://tailscale.com/kb/1223/tailscale-funnel/

---

**Next:** Check [Troubleshooting](Troubleshooting) for more help 👉
