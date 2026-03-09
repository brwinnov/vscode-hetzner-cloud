# Contributing — Hetzner Cloud Toolkit

How to contribute to the Hetzner Cloud Toolkit extension.

## Welcome Contributors! 🎉

We're excited to have you contribute! Whether it's:
- **Bug reports** — Found an issue? Let us know!
- **Feature requests** — Great idea? Propose it!
- **Code contributions** — Want to implement? Awesome!
- **Documentation** — Help improve the wiki!
- **Testing** — Try new features and report findings!

All contributions are welcome to make this extension better for everyone.

---

## Code of Conduct

- **Be respectful** — Treat all contributors with kindness
- **Be inclusive** — Welcome diverse perspectives
- **Be constructive** — Provide helpful feedback
- **Be honest** — Give credit where due

---

## Getting Started

### Set Up Development Environment

1. **Fork the repo:**
   - https://github.com/brwinnov/vscode-hetzner-cloud
   - Click **Fork** button

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/vscode-hetzner-cloud.git
   cd vscode-hetzner-cloud
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Open in VS Code:**
   ```bash
   code .
   ```

5. **Start watch mode:**
   ```bash
   npm run watch
   ```

6. **Launch debug extension (F5):**
   - Press **F5** or **Run** → **Start Debugging**
   - A new VS Code window opens with your changes
   - Set breakpoints, inspect variables, etc.

---

## Types of Contributions

### 1. Bug Reports

Found a bug? Report it!

**Where:** https://github.com/brwinnov/vscode-hetzner-cloud/issues

**What to include:**
- **Summary:** Brief description of the bug
- **Steps to reproduce:** Numbered list of steps
- **Expected behavior:** What should happen
- **Actual behavior:** What actually happens
- **Environment:**
  - VS Code version
  - Extension version
  - OS (Windows, macOS, Linux)
  - Any error messages or logs

**Example:**
```markdown
## Bug: Server Creation Wizard Freezes

**Steps to Reproduce:**
1. Add Hetzner API token
2. Click SERVERS panel + button
3. Click Next on Step 1
4. Wait 30 seconds

**Expected:** Wizard moves to Step 2
**Actual:** Wizard shows loading spinner forever

**Environment:**
- VS Code 1.86.0
- Extension 0.1.1
- Windows 11

**Error Log:**
[Output from Extension Host console]
```

---

### 2. Feature Requests

Have an idea? Suggest it!

**Where:** https://github.com/brwinnov/vscode-hetzner-cloud/discussions

**What to include:**
- **Summary:** What you want to add
- **Problem it solves:** Why this is needed
- **Proposed solution:** How to implement it
- **Alternatives:** Other ways to solve it
- **Use case:** Real-world example

**Example:**
```markdown
## Feature: Quick Server Status in Status Bar

**Problem:** I have to click SERVERS panel to see server status
**Solution:** Show active server status in VS Code status bar
**Use Case:** At a glance, I want to see if my main production server is running
**Mockup:** [Status bar showing "🟢 prod-server (Running)"]
```

---

### 3. Code Contributions

Want to code? Great!

#### Small Fix (Typo, Small Bug)

1. **Fork and clone** (see [Getting Started](#set-up-development-environment))
2. **Create feature branch:**
   ```bash
   git checkout -b fix/my-fix
   ```
3. **Make changes**
4. **Test in debug mode (F5)**
5. **Commit:**
   ```bash
   git add .
   git commit -m "fix: Brief description of fix"
   ```
6. **Push:**
   ```bash
   git push origin fix/my-fix
   ```
7. **Create Pull Request** on GitHub

#### Medium Feature (New Command/Panel)

1. **Create an issue first** to discuss approach
2. **Get approval** from maintainers
3. **Follow development setup** above
4. **Create feature branch:**
   ```bash
   git checkout -b feat/my-feature
   ```
5. **Implement feature** with tests
6. **Update CHANGELOG.md**
7. **Create Pull Request** with clear description

#### Large Feature (Significant Changes)

1. **Create a discussion** first: https://github.com/brwinnov/vscode-hetzner-cloud/discussions
2. **Propose design** and get feedback
3. **Break into smaller PRs** if possible
4. **Follow medium feature process** above

---

## Code Style & Standards

### TypeScript

- Use **strict mode** (`"strict": true` in tsconfig.json)
- **Type all public methods** — Don't use `any`
- **Export only what's needed** — Keep modules focused
- **Use const** — Not `var` or `let`

**Example:**
```typescript
// ✅ Good
export async function createServer(
  options: CreateServerRequest
): Promise<Server> {
  const client = await tokenManager.getActiveClient();
  if (!client) throw new Error('No active client');
  return client.createServer(options);
}

// ❌ Bad
async function createServer(options: any): any {
  var client = await tokenManager.getActiveClient();
  return client.createServer(options); // Might return undefined
}
```

### Formatting

Code is automatically formatted on commit (Husky + Prettier).

**Manual format:**
```bash
npm run format
```

### Linting

Catch issues with ESLint:

```bash
npm run lint
```

Fix auto-fixable issues:
```bash
npm run lint -- --fix
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| **Classes** | PascalCase | `TokenManager`, `HetznerClient` |
| **Methods/Functions** | camelCase | `getActiveServer()`, `addToken()` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_VERSION` |
| **Private members** | `_camelCase` | `_onDidChangeTreeData` |
| **Files** | kebab-case | `token-manager.ts`, `server-commands.ts` |

---

## Git Workflow

### Commit Messages

Follow **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes (wiki, README)
- `refactor` — Code reorganization (no functional change)
- `test` — Add/update tests
- `chore` — Build, deps, tooling

**Scopes** (optional):
- `api` — API client changes
- `ui` — UI/webview changes
- `commands` — Command implementation
- `providers` — TreeView providers

**Examples:**
```bash
# Good commits
git commit -m "feat(commands): Add delete volume command"
git commit -m "fix(providers): Fix server status icon not updating"
git commit -m "docs: Update SSH key guide"
git commit -m "refactor(api): Simplify error handling"

# Bad commits
git commit -m "Fixed stuff"
git commit -m "WIP"
git commit -m "asdf"
```

### Opening a Pull Request

1. **Push your branch:**
   ```bash
   git push origin feat/my-feature
   ```

2. **Open PR on GitHub:**
   - Go to https://github.com/brwinnov/vscode-hetzner-cloud
   - Click **Pull requests** → **New Pull Request**
   - Select your branch

3. **Fill PR template:**
   - **Title:** Clear, descriptive (e.g., "Add volume delete command")
   - **Description:** Explain changes, why needed, how tested
   - **Linked issues:** Reference issue if applicable (`Closes #123`)

4. **PR checklist:**
   ```markdown
   - [x] Code is formatted (`npm run format`)
   - [x] No linting errors (`npm run lint`)
   - [x] Builds cleanly (`npm run build`)
   - [x] Tested in debug mode (F5)
   - [x] CHANGELOG.md updated
   - [x] Tests pass (if applicable)
   ```

5. **Respond to feedback:**
   - Maintainers may request changes
   - Push new commits to your branch
   - Respond to comments
   - Don't force-push (preserve history)

---

## Testing

### Manual Testing

1. **Build extension:**
   ```bash
   npm run build
   ```

2. **Launch debug (F5):**
   - Opens extension in new VS Code window
   - Test interactively

3. **Test checklist:**
   - Add/remove projects
   - Create server (with various options)
   - Create networks
   - Manage SSH keys
   - Check error handling

### Automated Testing

Currently no automated tests, but encouraged to add:

```typescript
// Example test structure (tests/ folder)
describe('TokenManager', () => {
  describe('addToken', () => {
    it('should store token securely', async () => {
      // Test that token is stored
    });
    it('should handle invalid token', async () => {
      // Test error handling
    });
  });
});
```

Run tests:
```bash
npm test
```

---

## Documentation

### Update Wiki

The wiki helps users! Please keep it up-to-date.

**Edit wiki files:**
```bash
# Wiki files in git
wiki/*.md

# Edit and push
git add wiki/
git commit -m "docs: Update Server Management guide"
git push
```

**Don't forget to:**
- Add links between pages
- Include examples
- Update table of contents

### Update CHANGELOG

Add your changes to `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added
- New volume delete command
- Better error messages for API failures

### Fixed
- Server status icon not updating sometimes

### Changed
- Improved cloud-init validation
```

---

## Review Process

### What Maintainers Look For

✅ **Code Quality**
- Clear, readable code
- Proper typing
- No console errors

✅ **Functionality**
- Feature works as intended
- Edge cases handled
- No regressions

✅ **Documentation**
- Changes documented
- CHANGELOG updated
- Wiki updated if user-facing

✅ **Testing**
- Tested in debug mode
- Works on different OS if applicable
- No performance regressions

### Getting Feedback

- Be **patient** — Maintainers are volunteers
- Be **respectful** — Critical feedback is constructive
- Ask **questions** — If feedback is unclear, ask for clarification
- Make **updates** — Address feedback promptly

---

## Helpful Links

| Link | Purpose |
|------|---------|
| https://github.com/brwinnov/vscode-hetzner-cloud | Main repository |
| https://github.com/brwinnov/vscode-hetzner-cloud/issues | Bug reports |
| https://github.com/brwinnov/vscode-hetzner-cloud/discussions | Feature requests & questions |
| https://docs.hetzner.cloud/ | Hetzner API documentation |
| https://code.visualstudio.com/api | VS Code Extension API |
| https://www.typescriptlang.org/docs/ | TypeScript handbook |

---

## Questions?

- **Development questions?** Open a discussion: https://github.com/brwinnov/vscode-hetzner-cloud/discussions
- **Found a bug?** Create an issue: https://github.com/brwinnov/vscode-hetzner-cloud/issues
- **Stuck somewhere?** Comment on the PR, maintainers are here to help!

---

## Thank You! 🙌

Every contribution — big or small — makes this extension better. Thank you for being part of the community!

---

**Ready to contribute?** Visit the [Getting Started](#getting-started) section above!
