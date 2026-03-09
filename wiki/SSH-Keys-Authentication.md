# SSH Keys & Authentication — Hetzner Cloud Toolkit

Comprehensive guide to SSH key management and secure authentication.

## What Are SSH Keys?

SSH keys provide **password-less, encrypted authentication** to servers.

**Advantages:**
- 🔒 More secure than passwords
- ⚡ Faster login
- 🤖 Enables automation (no interactive password)
- 🛡️ Resistant to brute-force attacks
- 💪 Support for strong algorithms (Ed25519)

**Disadvantages of passwords:**
- Weak passwords can be guessed
- Traffic can be sniffed
- Reuse across systems increases risk
- Takes time to type

---

## How SSH Keys Work

SSH uses **public/private key pairs**:

1. **Private Key** (kept secret, on your machine)
   - Never share this
   - Guards like a password
   - Stored in `~/.ssh/id_ed25519` (or `id_rsa`)

2. **Public Key** (shared freely, on servers)
   - Added to server's `~/.ssh/authorized_keys`
   - Proves you own the private key
   - Cannot be reverse-engineered

**Authentication Flow:**
```
Your Machine                    Server
┌──────────────┐              ┌──────────────┐
│ Private Key  │              │ Public Key   │
│ (id_ed25519) │              │ (authorized_ │
│              │ ──encodes──> │  keys)       │
│              │              │              │
│              │ <──verifies─ │              │
└──────────────┘              └──────────────┘
     ✅ Access Granted
```

---

## Key Types: Ed25519 vs RSA

### Ed25519 (Recommended)

**Pros:**
- ✅ Shorter keys (256-bit)
- ✅ Faster signing
- ✅ Modern, resistant to attacks
- ✅ Better security margins

**Cons:**
- ❌ Older systems may not support (unlikely in 2024+)

**Generate:**
```bash
ssh-keygen -t ed25519 -C "user@domain.com"
```

### RSA (Legacy)

**Pros:**
- ✅ Widely supported
- ✅ Compatible with old systems
- ✅ Standard for years

**Cons:**
- ❌ Requires longer keys (4096-bit minimum)
- ❌ Slower signing
- ❌ Small risk of future weakness

**Generate:**
```bash
ssh-keygen -t rsa -b 4096 -C "user@domain.com"
```

**Recommendation:** Use **Ed25519** for all new keys.

---

## SSH Key Management in the Extension

### View SSH Keys

Open the **SSH KEYS** panel in the sidebar:

```
SSH KEYS
├── web-key (Ed25519)
│   Fingerprint: SHA256:abc123...
│   ✓ Added on Mar 01, 2024
│
├── backup-key (RSA)
│   Fingerprint: SHA256:def456...
│   ✓ Added on Feb 15, 2024
│
└── my-macbook (Ed25519)
    Fingerprint: SHA256:ghi789...
    ✓ Added on Jan 10, 2024
```

**Each Key Shows:**
- 🔑 Key name
- 📊 Key type (Ed25519 or RSA)
- 🔗 Fingerprint (short identifier)
- 📅 Date added

### Add an SSH Key

1. Generate a key locally (see [Generating Keys](#generating-keys) below)
2. In extension's **SSH KEYS** panel, click **＋**
3. A file picker opens to `~/.ssh/`
4. Select your `.pub` file (public key)
5. Key uploaded to Hetzner Cloud
6. Appears in **SSH KEYS** panel within seconds

**Important:** Upload the `.pub` file, NOT the private key!

### Delete an SSH Key

⚠️ **Ensure no running servers are using this key before deleting**

1. Right-click key in **SSH KEYS** panel
2. Choose **Delete SSH Key**
3. Confirm the action
4. Key removed from Hetzner Cloud

**After deletion:**
- Existing servers **keep access** (key already authorized)
- New servers **cannot** use this key
- Existing servers **cannot add** this key back (must supply new key)

---

## Generating SSH Keys

### Using the Extension Guide

1. In the **SETUP** panel, click **Generate SSH Key**
2. **SSH Key Generation Guide** opens with tabs for your OS:
   - 🪟 **Windows**
   - 🍎 **macOS**
   - 🐧 **Linux**

3. Follow step-by-step instructions
4. At the end, add the public key to Hetzner

### Windows SSH Key Generation

#### Option A: Windows 10+ (Built-in OpenSSH)

```powershell
# Open PowerShell as Administrator

# Generate Ed25519 key
ssh-keygen -t ed25519 -C "you@example.com"

# When prompted, press Enter for default location (~/.ssh/id_ed25519)
# Enter a strong passphrase (or leave empty for no passphrase)
```

**Result:**
- `~/.ssh/id_ed25519` (private key)
- `~/.ssh/id_ed25519.pub` (public key)

#### Option B: PuTTY (GUI Tool)

1. Download & install [PuTTY](https://www.putty.org/)
2. Open **PuTTYgen** (comes with PuTTY)
3. Select **Ed25519** under **Key Type**
4. Click **Generate** and move mouse for entropy
5. Enter a passphrase (recommended)
6. Click **Save Private Key** → save as `.ppk`
7. Copy **Public Key** text (top box)
8. Paste into Hetzner Cloud → save file as `id_ed25519.pub`

#### Option C: WSL (Windows Subsystem for Linux)

```bash
# Install WSL2 with Ubuntu

# Generate key
ssh-keygen -t ed25519 -C "you@example.com"

# Key stored in /home/<username>/.ssh/id_ed25519
```

### macOS SSH Key Generation

```bash
# Open Terminal

# Generate Ed25519 key
ssh-keygen -t ed25519 -C "you@example.com"

# When prompted:
#   Location: Press Enter (uses ~/.ssh/id_ed25519)
#   Passphrase: Enter a strong passphrase

# Verify key creation
cat ~/.ssh/id_ed25519.pub

# (Optional) Add key to macOS Keychain
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

### Linux/RHEL SSH Key Generation

```bash
# Open Terminal

# Generate Ed25519 key
ssh-keygen -t ed25519 -C "you@example.com"

# When prompted:
#   Location: Press Enter (uses ~/.ssh/id_ed25519)
#   Passphrase: Enter a strong passphrase

# Verify permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# Verify key
ssh-keygen -l -f ~/.ssh/id_ed25519.pub
```

---

## Using SSH Keys to Connect

### Connect to a Server

Once a server is created with your SSH key:

```bash
# Default: SSH as root
ssh root@<server-public-ip>

# Example
ssh root@192.0.2.123

# If you set a non-standard port
ssh -p 2222 root@192.0.2.123
```

### Using the Extension's SSH Terminal

If SSH is configured on your machine:

1. In **SERVERS** panel, right-click server
2. Choose **Open SSH Terminal** (if available)
3. Terminal opens with active SSH connection
4. You're logged in as root

### SSH Config File

Create `~/.ssh/config` for easier connections:

```
Host hcloud-web-01
  HostName 192.0.2.123
  User root
  IdentityFile ~/.ssh/id_ed25519
  AddKeysToAgent yes
  IdentitiesOnly yes

Host hcloud-*
  StrictHostKeyChecking accept-new
  UserKnownHostsFile ~/.ssh/known_hosts
```

Then connect simply:
```bash
ssh hcloud-web-01
```

---

## Security Best Practices

### 1. Use Strong Passphrases

✅ Good: `MyDog#Likes9BlueBerries!`
❌ Bad: `password`, `123456`, `qwerty`

A passphrase **protects your private key** if someone steals the file.

### 2. Never Share Private Keys

- Keep private keys on **your machine only**
- Don't email or Slack private keys
- Don't commit to GitHub
- Don't put in config files

### 3. Use SSH Agent

Store passphrase temporarily so you don't type it repeatedly:

```bash
# Start SSH agent (usually automatic on macOS/Linux)
eval "$(ssh-agent -s)"

# Add key with passphrase
ssh-add ~/.ssh/id_ed25519
# (Enter passphrase once)

# Now SSH works without typing passphrase
ssh root@server.com
```

### 4. Rotate Keys Periodically

- Delete old keys from Hetzner after replacing them
- Keep private keys for 1-3 years max
- After leaving a company, revoke all keys

### 5. One Key per Machine

✅ Good: `laptop-ed25519`, `desktop-ed25519`, `ci-server-ed25519`
❌ Bad: Single key on all machines

If one key is compromised, revoke only that key.

### 6. Disable Root Password Login

After adding SSH keys, disable password authentication:

```bash
# SSH to server
ssh root@server.com

# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Find and change these lines:
# PasswordAuthentication no
# PubkeyAuthentication yes
# PermitRootLogin prohibit-password

# Restart SSH daemon
sudo systemctl restart ssh
```

---

## Troubleshooting SSH

### "Permission denied (publickey)"

**Cause:** Public key not in `authorized_keys` on server

**Solution:**
1. Use **root password** (if created without SSH key) to login:
   ```bash
   ssh root@server.com
   # (Enter password from server detail panel)
   ```
2. Manually add your key:
   ```bash
   cat >> ~/.ssh/authorized_keys << EOF
   ssh-ed25519 AAAA... you@example.com
   EOF
   ```
3. Verify permissions:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

### "Could not open a connection to your authentication agent"

**Cause:** SSH agent not running

**Solution:**
```bash
# Start SSH agent
eval "$(ssh-agent -s)"

# Add your key
ssh-add ~/.ssh/id_ed25519
```

### "Host key verification failed"

**Cause:** Server not in `known_hosts`

**Solution:**
```bash
# Accept the key
ssh-keyscan -t ed25519 <server-ip> >> ~/.ssh/known_hosts

# Or accept interactively
ssh root@server.com
# (Type "yes" when prompted)
```

### Fingerprint Mismatch

**Cause:** Different key being used or key compromised

**Solution:**
1. Verify fingerprint from Hetzner Cloud console
2. Ensure correct key in `~/.ssh/`
3. Check `ssh -v` for debugging:
   ```bash
   ssh -vvv root@server.com
   ```

---

## Advanced: SSH for Automation

### Passwordless Sudo

Allow scripts to run commands with sudo without password:

```bash
# SSH to server
ssh root@server.com

# Edit sudoers (safely)
sudo visudo

# Add this line:
# app ALL=(ALL) NOPASSWD: /usr/bin/systemctl

# Now run without password
/usr/bin/systemctl restart nginx
```

### SCP File Transfer

```bash
# Copy file to server
scp /local/file root@server.com:/remote/path/

# Copy from server
scp root@server.com:/remote/file /local/path/

# Recursive copy
scp -r /local/dir root@server.com:/remote/
```

### Automation Example

```bash
#!/bin/bash
# Deploy script

SERVER="web-01.example.com"

# Copy app
scp -r ./app root@$SERVER:/opt/

# Run commands
ssh root@$SERVER << 'EOF'
  cd /opt/app
  npm install
  npm run build
  systemctl restart app
EOF

echo "Deployment complete"
```

---

**Next:** Set up [Tailscale Integration](Tailscale-Integration) 👉
