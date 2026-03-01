# Code Review — Hetzner Cloud Toolkit

> Generated review for use with GitHub Copilot.
> Reference individual files using `#file:<path>` in Copilot Chat alongside this file.

---

## 🐛 Bugs

### BUG-1 · Dead methods that silently skip the project index
**File:** `src/utils/secretStorage.ts`

`TokenManager` has two orphaned methods — `addProject()` and `removeProject()` — that store/delete tokens in SecretStorage but never update the CSV project index. The methods actually used everywhere are `saveProject()` and `deleteProject()`. If `addProject()` or `removeProject()` is called by mistake, tokens are stored invisibly and will never appear in `listProjects()`.

**Fix:** Delete `addProject()` and `removeProject()` entirely.

```
Copilot prompt: #file:src/utils/secretStorage.ts #file:CODE_REVIEW.md
Remove the dead `addProject` and `removeProject` methods per BUG-1.
```

---

### BUG-2 · Double-indentation breaks runcmd YAML in cloud-init merge
**File:** `src/tailscale/cloudInitInjector.ts`

When an existing `runcmd:` block is detected, the injected lines are double-indented. The filter keeps lines starting with `  -` (2 spaces), then `.map((l) => \`  ${l}\`)` prepends 2 more spaces, producing `    - curl ...` (4-space indent) — invalid YAML for a sequence item.

**Fix:** Remove the extra `  ` prefix in the `.map()` call, or rewrite the merge to append raw command strings.

```
Copilot prompt: #file:src/tailscale/cloudInitInjector.ts #file:CODE_REVIEW.md
Fix the runcmd YAML double-indentation bug described in BUG-2.
```

---

### BUG-3 · `hcloud.deleteSshKey` is unregistered — SSH key delete is inaccessible in the UI
**Files:** `src/commands/sshKeyCommands.ts`, `package.json`

The `hcloud.deleteSshKey` command is implemented in `sshKeyCommands.ts` but is completely absent from `package.json` — missing from both the `"commands"` contribution array and the `"view/item/context"` menu. Users have no way to delete SSH keys from the UI.

**Fix:** Add to `package.json`:

```jsonc
// In "commands":
{ "command": "hcloud.deleteSshKey", "title": "Hetzner Cloud: Remove SSH Key", "icon": "$(trash)" }

// In "view/item/context":
{
  "command": "hcloud.deleteSshKey",
  "when": "view == hcloud.sshKeys && viewItem == sshkey",
  "group": "9_danger@1"
}
```

```
Copilot prompt: #file:package.json #file:src/commands/sshKeyCommands.ts #file:CODE_REVIEW.md
Register the hcloud.deleteSshKey command and context menu entry per BUG-3.
```

---

## ⚠️ Issues

### ISSUE-1 · Token validation uses an expensive wrong API call
**File:** `src/commands/manageTokens.ts`

`client.getServers()` is called just to validate a new token. This fetches the full server list unnecessarily. `HetznerClient` already has a purpose-built `validateToken()` method that hits `GET /`.

**Fix:** Replace `client.getServers()` with `client.validateToken()` in the token validation block.

```
Copilot prompt: #file:src/commands/manageTokens.ts #file:src/api/hetzner.ts #file:CODE_REVIEW.md
Fix token validation to use validateToken() per ISSUE-1.
```

---

### ISSUE-2 · All list endpoints silently truncate results — no pagination
**File:** `src/api/hetzner.ts`

All `get*` methods use a fixed `per_page` cap (`50` for servers/networks/SSH keys, `100` for images/server types) with no pagination loop. The Hetzner API returns `meta.pagination.next_page` when more pages exist. Users with >50 servers will silently see an incomplete list.

**Fix:** Implement a pagination loop in the `request()` method or per list method, following `meta.pagination.next_page` until it is `null`.

```
Copilot prompt: #file:src/api/hetzner.ts #file:CODE_REVIEW.md
Add pagination support to all list methods per ISSUE-2.
```

---

### ISSUE-3 · `activeProjectName` cache is set but never read
**File:** `src/utils/secretStorage.ts`

`this.activeProjectName` is assigned in `setActiveProject()` and cleared in `deleteProject()`, but `getActiveProjectName()` always calls `secrets.get()` directly and ignores the cache entirely. The field adds confusion with no benefit.

**Fix:** Either use the cache consistently in `getActiveProjectName()` (with proper invalidation), or remove the `activeProjectName` field entirely.

```
Copilot prompt: #file:src/utils/secretStorage.ts #file:CODE_REVIEW.md
Fix the unused activeProjectName cache per ISSUE-3.
```

---

### ISSUE-4 · Tailscale auth key is embedded as plaintext in cloud-init user-data
**File:** `src/tailscale/cloudInitInjector.ts`

The auth key is interpolated directly into the `tailscale up --authkey=<key>` runcmd. This is visible in Hetzner's server user-data API response to anyone with API access. 

**Fix:** Add a notice in the server wizard UI informing the user that the auth key will be embedded in cloud-init, and recommend using a short-lived ephemeral key.

```
Copilot prompt: #file:src/tailscale/cloudInitInjector.ts #file:src/webviews/serverWizard.ts #file:CODE_REVIEW.md
Add a UI warning about the plaintext auth key in cloud-init per ISSUE-4.
```

---

## 🧹 Minor / Polish

### MINOR-1 · Repository URL mismatch in `package.json`
**File:** `package.json`

`homepage` and `repository.url` reference `brwinnov/hcloud.ext`, while the README consistently links to `brwinnov/vscode-hetzner-cloud`. Align them.

---

### MINOR-2 · `refreshAll` logic is duplicated in `manageTokens.ts`
**File:** `src/commands/manageTokens.ts`

The local `refreshAll()` closure and the `hcloud.refreshProjects` command handler both independently call `setupProvider.refresh()` + `projectsProvider.refresh()`. The command handler should call `refreshAll()` instead.

---

### MINOR-3 · `retainContextWhenHidden: true` is unnecessary on the server wizard
**File:** `src/webviews/serverWizard.ts`

This flag keeps the WebView alive in memory when hidden. Since the wizard is a one-shot flow with no state to preserve between show/hide cycles, this just wastes memory. Remove it.

---

## Priority Order

| # | ID | Severity | File(s) |
|---|---|---|---|
| 1 | BUG-3 | 🐛 Bug | `package.json`, `sshKeyCommands.ts` |
| 2 | BUG-2 | 🐛 Bug | `cloudInitInjector.ts` |
| 3 | BUG-1 | 🐛 Bug | `secretStorage.ts` |
| 4 | ISSUE-2 | ⚠️ Issue | `hetzner.ts` |
| 5 | ISSUE-1 | ⚠️ Issue | `manageTokens.ts` |
| 6 | ISSUE-3 | ⚠️ Issue | `secretStorage.ts` |
| 7 | ISSUE-4 | ⚠️ Issue | `cloudInitInjector.ts`, `serverWizard.ts` |
| 8 | MINOR-1 | 🧹 Minor | `package.json` |
| 9 | MINOR-2 | 🧹 Minor | `manageTokens.ts` |
| 10 | MINOR-3 | 🧹 Minor | `serverWizard.ts` |
