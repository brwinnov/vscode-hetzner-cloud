# Troubleshooting — Hetzner Cloud Toolkit

Solutions for common issues and error messages.

## Initial Setup Issues

### Extension Not Appearing in Sidebar

**Symptoms:** Install completes but no Hetzner Cloud icon in Activity Bar

**Solutions:**
1. **Reload VS Code:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Search for **Developer: Reload Window**
   - Press Enter

2. **Check VS Code Version:**
   - Open **Help** → **About**
   - Ensure version is **1.85.0 or later**
   - If older, update VS Code

3. **Reinstall Extension:**
   - Open **Extensions** (Ctrl+Shift+X)
   - Search for "Hetzner"
   - Click **Uninstall**
   - Restart VS Code
   - Reinstall from marketplace

### Extension Installed but Commands Don't Work

**Symptoms:** Commands not found in Command Palette

**Solutions:**
1. Check if extension is **active:**
   - Open **Extensions** (Ctrl+Shift+X)
   - Click **Hetzner Cloud Toolkit**
   - Verify it says **Installed** (not **Install**)

2. Check extension **output:**
   - Open **Output** panel (View → Output)
   - From dropdown, select **Hetzner Cloud Toolkit**
   - Look for error messages

3. Try reload:
   - `Ctrl+Shift+P` → **Developer: Reload Window**

---

## API Token Issues

### "Invalid API Token"

**Cause:** Token is wrong, expired, or has insufficient permissions

**Solutions:**
1. **Verify token format:**
   - Should start with numbers
   - Should be 40+ characters long
   - No spaces before/after

2. **Check permissions in Hetzner Cloud Console:**
   - Log in to https://console.hetzner.cloud
   - Project → **Security** → **API Tokens**
   - Click your token
   - Ensure **Read** and **Write** are both checked

3. **Regenerate token:**
   - Delete old token from Hetzner console
   - Create new token
   - Update in extension (SETUP panel → Add Token)

4. **Verify correct project:**
   - Make sure token belongs to the project you want to manage
   - Don't use cross-project tokens (if applicable)

### "No Projects Showing"

**Symptoms:** Token added but servers/networks list is empty

**Solutions:**
1. **Wait for data to load:**
   - If you just added the token, wait 5-10 seconds
   - Extension queries API in background

2. **Check API token permissions:**
   - Go to Hetzner console
   - Verify token has **Read** access to all resources
   - Some tokens might be Deploy-only (insufficient)

3. **Force refresh:**
   - Right-click **SERVERS** panel
   - Choose **Refresh** (if available)
   - Or reload: `Ctrl+Shift+P` → **Developer: Reload Window**

4. **Check internet connection:**
   - Hetzner API might be unreachable
   - Verify you can access https://api.hetzner.cloud in browser

5. **Check firewall/proxy:**
   - Corporate firewall might block API access
   - Try on different network (mobile hotspot) to test
   - Contact IT if on corporate network

### "Unauthorized: The request requires user authentication"

**Cause:** Token is missing or invalid

**Solutions:**
1. Verify token still exists in SETUP panel
2. If missing, add token again
3. Regenerate token in Hetzner console if uncertain

---

## Server Creation Issues

### Server Creation Hangs

**Symptoms:** Wizard is open but server creation seems stuck

**Solutions:**
1. **Check network connection:**
   - Ensure internet is stable
   - Try again after 30 seconds

2. **Check server count limit:**
   - Hetzner trials have server limits
   - Check https://console.hetzner.cloud for quota

3. **Check firewall rules:**
   - Hetzner Cloud API might be blocked
   - Try from different network

4. **Cancel and retry:**
   - Close wizard (Escape key)
   - Try creating again with simpler settings

### Server Creates but Doesn't Appear in Sidebar

**Symptoms:** Server created successfully but not showing in **SERVERS** panel

**Solutions:**
1. **Wait 10-15 seconds:**
   - Extension polls API every 5 seconds
   - New servers appear within one polling cycle

2. **Force refresh:**
   - Right-click **SERVERS** panel
   - If **Refresh** option exists, click it
   - Or reload: `Ctrl+Shift+P` → **Developer: Reload Window**

3. **Check in Hetzner console:**
   - Log in to https://console.hetzner.cloud
   - Verify server exists in Cloud Console
   - If it exists there, issue is with extension display

4. **Check project:**
   - Ensure correct project is active
   - Click project name in **PROJECTS** panel
   - Verify token belongs to that project

### "Server Type Not Available"

**Symptoms:** Selected server type shows error or unusable

**Solutions:**
1. **Check location:**
   - Not all server types available in all locations
   - Try different location in Step 1

2. **Check account limits:**
   - Trial accounts have restrictions
   - Upgrade account or try smaller server type

3. **Check API response:**
   - Open Debug Console (F12)
   - Check for API error messages

---

## SSH Key Issues

### "SSH Key Not Appearing in List"

**Symptoms:** Added key but not showing in **SSH KEYS** panel

**Solutions:**
1. **Wait for sync:**
   - Wait 5-10 seconds for API sync
   - Extension queries API every 5 seconds

2. **Force refresh:**
   - Right-click **SSH KEYS** panel
   - Choose **Refresh** (if available)
   - Or reload extension

3. **Check file permissions:**
   - Ensure `.pub` file is readable
   - Not corrupted or empty

4. **Verify in Hetzner console:**
   - Log in to https://console.hetzner.cloud
   - Project → **SSH Keys**
   - Should appear there if successfully added

### "Permission Denied" When Connecting via SSH

**Symptoms:** SSH connect fails with "Permission denied"

**Solutions:**
1. **Verify SSH key is installed:**
   - Check local `~/.ssh/` directory
   - Ensure private key exists (no passphrase required for root)

2. **Verify server has public key:**
   - Server was created with SSH key selected
   - Check Hetzner console: Server → SSH Keys section
   - Should show your key name

3. **Check SSH daemon on server:**
   - Connect via root password:
     ```bash
     ssh root@<server-public-ip>
     # (Use root password from server detail panel)
     ```
   - Verify SSH is running:
     ```bash
     sudo systemctl status ssh
     sudo systemctl restart ssh
     ```

4. **Fix permissions:**
   ```bash
   ssh root@<server-public-ip>
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

5. **Check .ssh/authorized_keys file:**
   ```bash
   cat ~/.ssh/authorized_keys
   # Should contain your public key
   ```

---

## Tailscale Issues

### Tailscale Auth Key Not Saving

**Symptoms:** Error when entering Tailscale key in SETUP

**Solutions:**
1. **Verify auth key format:**
   - Should start with `tskey-`
   - Should be long alphanumeric string

2. **Check key validity:**
   - Log in to https://login.tailscale.com/admin
   - **Settings** → **Keys and OAuth** → **Auth keys**
   - Is your key still valid (not revoked)?

3. **Check expiration:**
   - Auth keys have expiration dates
   - Generate new key if expired

4. **Clear and retry:**
   - Remove old key if stored
   - Enter key again carefully

### Server Doesn't Join Tailscale Network

**Symptoms:** Server created with Tailscale but doesn't appear in Admin Console

**Solutions:**
1. **Check cloud-init logs:**
   ```bash
   ssh root@server-public-ip
   sudo tail -50 /var/log/cloud-init-output.log
   # Look for Tailscale installation lines
   ```

2. **Manually inject Tailscale:**
   ```bash
   ssh root@server-public-ip
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up --authkey=tskey-XXXX --accept-routes --ssh
   ```

3. **Verify auth key still valid:**
   - Hetzner only allows auth key per cloud-init run
   - Some keys are single-use
   - Generate new **Reusable** auth key in Tailscale Admin Console

4. **Check network:**
   - Server might not have internet access
   - Try pinging external IP: `ping 8.8.8.8`
   - Check cloud-init logs for network errors

### Can't SSH via Tailscale IP

**Symptoms:** Get "connection refused" or "no route to host"

**Solutions:**
1. **Verify server joined Tailscale:**
   - Open [Admin Console](https://login.tailscale.com/admin/machines)
   - Should see your server in **Machines** list
   - Status should be 🟢 **Connected**

2. **Verify your device is connected:**
   - Open Tailscale app on laptop
   - Should show "Connected"
   - Try: `tailscale status` in terminal

3. **SSH might not be enabled:**
   - Server created with `--ssh` flag needs this on
   - Log in via public IP and enable:
     ```bash
     ssh root@server-public-ip
     sudo tailscale up --ssh
     ```

4. **Try using hostname instead of IP:**
   - `ssh root@server-hostname`
   - Requires magic DNS enabled in Tailscale

5. **Firewall rules might block it:**
   - Open [Tailscale Admin Console](https://login.tailscale.com/admin/acls)
   - Check **Access controls**
   - Ensure SSH (port 22) is allowed

---

## Network Issues

### Servers Can't Communicate via Private Network

**Symptoms:** Ping between servers in same network fails

**Solutions:**
1. **Verify both in same network:**
   - Check **NETWORKS** panel
   - Both servers should be listed under same network
   - Click each server to verify in detail panel

2. **Check OS firewall:**
   ```bash
   ssh root@server1-public-ip
   
   # Ubuntu/Debian
   sudo ufw status
   sudo ufw allow from 10.0.0.0/24
   sudo ufw reload
   
   # CentOS
   sudo firewall-cmd --list-all
   sudo firewall-cmd --add-source=10.0.0.0/24
   sudo firewall-cmd --runtime-to-permanent
   ```

3. **Verify private IPs:**
   ```bash
   ssh root@server-public-ip
   ip addr show
   # Should see 10.x.x.x or 172.x.x.x address
   ```

4. **Test connectivity:**
   ```bash
   # Get server2's private IP from detail panel
   ping 10.0.0.3
   
   # Try more verbose
   ping -c 3 -v 10.0.0.3
   ```

### Network Deleted Unexpectedly

**Symptoms:** Network disappeared from panel

**Solutions:**
1. **Force refresh:**
   - Right-click **NETWORKS** panel
   - Choose **Refresh**
   - Or reload extension

2. **Check Hetzner console:**
   - Log in to https://console.hetzner.cloud
   - **Networks** section
   - Is network still there?

3. **Check for errors:**
   - Open **Output** → **Hetzner Cloud Toolkit**
   - Look for error messages

---

## Performance & Polling

### Extension Is Slow / Laggy

**Symptoms:** VS Code UI sluggish when extension active

**Solutions:**
1. **Disable status polling (if needed):**
   - Open **Settings** (Ctrl+,)
   - Search `Hetzner`
   - Look for polling interval setting
   - Increase polling interval (default: 5 seconds)

2. **Close unused panels:**
   - Fewer open panels = less UI redraws
   - Close unused tree views

3. **Reduce number of projects:**
   - More projects = more API calls
   - Remove unused projects

4. **Check system resources:**
   - Open Task Manager
   - Check CPU/Memory usage
   - Close other heavy applications

### Too Many API Calls / Rate Limited

**Symptoms:** "Rate limit exceeded" error from API

**Solutions:**
1. **Reduce polling frequency:**
   - Settings → Hetzner Cloud Toolkit
   - Increase polling interval
   - Default is 5 seconds (aggressive)

2. **Limit concurrent projects:**
   - Keep only active projects configured
   - Remove test/throwaway projects

3. **Wait for rate limit reset:**
   - Hetzner Cloud limits: varies by plan
   - Usually resets after 1 hour
   - Check Hetzner console for limits

---

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `ENOTFOUND api.hetzner.cloud` | DNS lookup failed | Check internet, firewall, proxy |
| `401 Unauthorized` | Invalid API token | Regenerate token in Hetzner console |
| `403 Forbidden` | Token lacks permissions | Check Read & Write permissions |
| `404 Not Found` | Resource doesn't exist | Verify resource ID, refresh |
| `409 Conflict` | Resource in bad state | Wait, then retry |
| `429 Too Many Requests` | Rate limited | Reduce polling frequency |
| `500 Server Error` | Hetzner API issue | Check status page, try later |

---

## Getting Help

### Before Asking for Help

1. **Check this page** — Your issue might be listed
2. **Check Hetzner API Docs** — https://docs.hetzner.cloud/
3. **Check GitHub Issues** — https://github.com/brwinnov/vscode-hetzner-cloud/issues
4. **Enable debug logging:**
   ```json
   // settings.json
   {
     "Hetzner Cloud Toolkit.debug": true
   }
   ```

### How to Report Issues

1. Open **GitHub Issues:** https://github.com/brwinnov/vscode-hetzner-cloud/issues
2. Click **New Issue**
3. Include:
   - **VS Code version** (Help → About)
   - **Extension version** (Extensions → Hetzner)
   - **What you tried** (steps to reproduce)
   - **What happened** (actual error)
   - **What should happen** (expected behavior)
   - **Screenshots/logs** (if applicable)

### Example Issue Report

```markdown
**VS Code Version:** 1.85.2
**Extension Version:** 0.1.1

**Steps to Reproduce:**
1. Add Hetzner token
2. Open SERVERS panel
3. Click create server button
4. Fill in details and click Create

**Expected:** Server appears in sidebar after 10 seconds
**Actual:** No server appears, no error message shown

**Error Log:**
[Paste output from Output → Hetzner Cloud Toolkit]

**Screenshots:**
[Attach any relevant screenshots]
```

---

**Still stuck?** Ask in GitHub Discussions: https://github.com/brwinnov/vscode-hetzner-cloud/discussions

