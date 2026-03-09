# Network Management — Hetzner Cloud Toolkit

Guide to creating, configuring, and managing Hetzner Cloud private networks.

## Why Use Private Networks?

Private networks allow your servers to communicate securely without exposing traffic to the public internet.

**Benefits:**
- 🔒 **Security** — Internal traffic encrypted and isolated
- 💰 **Cost** — Reduce public IP usage
- 🚀 **Performance** — No internet latency for inter-server traffic
- 🏗️ **Architecture** — Organize multi-tier applications (web, app, database)
- 🔄 **Scalability** — Add servers without new public IPs

**Common Use Cases:**
- **Database servers** in private network, accessed by app servers
- **Load balancer** in public, backend servers in private
- **Microservices cluster** all on private network
- **CI/CD infrastructure** isolated for security

---

## Creating a Network

### Method 1: Via Networks Panel

1. Open the **NETWORKS** panel in the sidebar
2. Click the **＋** button
3. Enter **Network Name** (e.g., `production-internal`)
4. Confirm **IP Range** (defaults to `10.0.0.0/8`)
5. Network created within seconds

### Method 2: During Server Creation

1. During **Step 5** of server wizard
2. Choose **Create New Network**
3. Enter network name and confirm CIDR
4. Server automatically joins on creation

### Network Configuration

**IP Range (CIDR):**
- Standard private ranges:
  - `10.0.0.0/8` (10.0.0.0 – 10.255.255.255) — Largest, most common
  - `172.16.0.0/12` (172.16.0.0 – 172.31.255.255) — Medium
  - `192.168.0.0/16` (192.168.0.0 – 192.168.255.255) — Smallest

**Default:** `10.0.0.0/8` (sufficient for most deployments)

**Important:**
- Don't overlap ranges across projects
- Ensure ranges don't conflict with your office/home network
- Hetzner assigns IPs within your range to servers

---

## Viewing Networks

### Networks Panel

The **NETWORKS** panel shows:
- **Network Name** — Friendly identifier
- **IP Range** — CIDR notation (e.g., `10.0.0.0/8`)
- **Subnets** — Child nodes showing zones and specific subnets
- **Servers** — Child nodes showing servers in this network

**Example:**
```
NETWORKS
├── production-internal (10.0.0.0/8)
│   ├── Zone 1 (10.0.0.0/24)
│   │   ├── web-server-01 (10.0.0.2)
│   │   └── db-01 (10.0.0.3)
│   ├── Zone 2 (10.0.1.0/24)
│   │   └── web-server-02 (10.0.1.2)
│   └── Zone 3 (10.0.2.0/24)
└── staging-network (172.16.0.0/12)
    ├── Zone 1 (172.16.0.0/24)
    └── staging-app-01 (172.16.0.2)
```

---

## Understanding Subnets & Zones

Hetzner automatically creates **subnets** within your network, organized by **zone**.

**What are Zones?**
- Hetzner datacenters in different locations have multiple zones
- Each zone represents physically separate infrastructure
- Distributing across zones improves **redundancy** and **fault tolerance**
- Examples: `us-west-1`, `eu-central-1a`, `eu-central-1b`, etc.

**Subnet Allocation:**
- `10.0.0.0/24` → Zone 1 (256 IPs)
- `10.0.1.0/24` → Zone 2 (256 IPs)
- `10.0.2.0/24` → Zone 3 (256 IPs)
- etc.

**Server IP Assignment:**
- When a server joins a network, Hetzner assigns an IP from the appropriate zone subnet
- Location chosen during server creation determines zone
- Private IP remains static for the server's lifetime

---

## Adding Servers to Networks

### New Server

During **Step 5** of server creation wizard:
1. Choose **Select Existing Network** or **Create New Network**
2. Server joins selected network
3. Server gets both public and private IP
4. Private IP is accessible to other network members

### Existing Server

Hetzner Cloud doesn't support adding/removing networks post-creation. To move a server:
1. Create snapshot of current server
2. Create new server from snapshot
3. Add it to desired network
4. Delete old server

---

## Common Network Architectures

### 3-Tier Architecture

```
┌─────────────────────────────────────────────────────┐
│ PUBLIC NETWORK (Default)                             │
│  ┌──────────────────────────────────────────────┐   │
│  │ Load Balancer (Public IP)                     │   │
│  │  ↓                            ↓              │   │
└──────────────────────────────────────────────────────┘
        │                            │
        ↓                            ↓
┌─────────────────────────────────────────────────────┐
│ PRIVATE NETWORK (10.0.0.0/8)                         │
│  ┌──────────────────────────────────────────────┐   │
│  │ Web Server #1 (10.0.0.2)   Web Server #2    │   │
│  │ Web Server #3 (10.0.0.4)   (10.0.0.3)      │   │
│  │                                              │   │
│  │ All ↓ communicate privately                 │   │
│  │                                              │   │
│  │ ┌──────────────────────────────────────┐   │   │
│  │ │ Database Server (10.0.0.5)           │   │   │
│  │ │ (No public IP)                       │   │   │
│  │ └──────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Benefits:**
- Database not exposed to internet
- Web servers communicate privately
- Load balancer distributes traffic
- Single point of entry

### Multi-Region Deployment

```
EUROPE (us-east-1)
├── Network: eu-prod (10.0.0.0/8)
│   ├── web-01 (10.0.0.2)
│   ├── app-01 (10.0.0.3)
│   └── db-01 (10.0.0.4)

ASIA (ap-south-1)
├── Network: ap-prod (10.1.0.0/8)
│   ├── web-02 (10.1.0.2)
│   ├── app-02 (10.1.0.3)
│   └── db-02 (10.1.0.4)
```

Note: Different networks **cannot** directly communicate. Use Tailscale or VPN to link them.

---

## Network Security

### What Hetzner Provides

- Traffic within a network is encrypted
- Private IPs are not routable on the public internet
- Built-in firewall rules can be applied

### Best Practices

1. **Use security groups/firewalls** to restrict port access
2. **No public IPs on databases** — Keep them in private networks
3. **Principle of least privilege** — Each server only exposes needed ports
4. **VPN for multi-region** — Use Tailscale for cross-network communication
5. **Separate staging/prod networks** — Never mix environments

### Example: Port Rules

```
Network: production-internal (10.0.0.0/8)

Load Balancer (10.0.0.2):
  - Accepts port 80 (HTTP) from internet
  - Forwards to port 8080 on app servers privately

App Servers (10.0.0.3, 10.0.0.4):
  - Accept port 8080 from 10.0.0.2 (load balancer only)
  - Accept port 5432 from database only
  - All other ports DENYed

Database (10.0.0.5):
  - Accept port 5432 from 10.0.0.3, 10.0.0.4 only
  - No public IP
  - No internet access
```

---

## Deleting a Network

⚠️ **Destructive action — cannot be undone**

1. Right-click network in **NETWORKS** panel
2. Choose **Delete Network**
3. Confirm (warning shown if servers attached)
4. Network deleted immediately

**Before Deleting:**
- Remove all servers from network
- Verify no dependencies
- No data recovery possible

---

## Troubleshooting

### Servers Can't Communicate

**Symptoms:** Ping fails between servers in same network

**Solutions:**
1. Check firewall rules (Hetzner Cloud Console)
2. Ensure both servers use same network
3. Verify no OS-level firewall is blocking (e.g., ufw)
4. Try from another server to isolate issue

### Slow Private Network Traffic

**Possible Causes:**
- Network saturation (rare)
- OS-level TCP window issues
- Packet loss on public internet
- Wrong MTU settings

**Solutions:**
1. Check cloud-init logs on servers: `/var/log/cloud-init.log`
2. Use `iperf` to meter throughput
3. Verify no burst/rate limiting on storage

### Private IPs Not Assigned

**Symptoms:** Server shows public IP but no private IP

**Cause:** Server created before network, or not added during creation

**Solution:** Create new server in next 30 days (old servers can't be added post-creation in current Hetzner API)

---

## Advanced: Cloud-Init for Networking

Configure networking on boot via cloud-init:

```yaml
#cloud-config
packages:
  - net-tools
  - curl

runcmd:
  - ip route show  # Verify routing
  - hostname -I   # Show all IPs
  - ping 10.0.0.3 # Test connectivity
```

---

**Next:** Set up [SSH Keys & Authentication](SSH-Keys-Authentication) 👉
