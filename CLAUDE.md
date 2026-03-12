# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # Development build (with source maps) via esbuild
npm run build:prod     # Production build (minified, no source maps)
npm run watch          # Incremental watch build for development
npm run lint           # ESLint over src/ (TypeScript rules)
npm run package        # Bundle as .vsix with vsce
npm run test           # Run extension tests via @vscode/test-cli
```

There is no separate type-check script; `tsc` is not used for building (esbuild handles that). To check types manually: `npx tsc --noEmit`.

Press **F5** in VS Code to launch the Extension Development Host (configured in `.vscode/launch.json`).

## Architecture

The extension follows a standard VS Code extension pattern: one entry point activates all tree views and registers all commands.

**`src/extension.ts`** — Activation entry point. Instantiates all managers, registers tree views, and delegates command registration to per-resource modules.

**`src/api/`** — API clients with typed interfaces:
- `hetzner.ts` — `HetznerClient` wraps the Hetzner Cloud REST API v1. Uses `paginateList()` to follow cursor-based pagination automatically. Token validation calls `/servers?per_page=1` (not the root endpoint).
- `robot.ts` — `RobotClient` wraps the Hetzner Robot API (used for Storage Boxes only).

**`src/utils/secretStorage.ts`** — All credential storage goes through here:
- `TokenManager` — stores Cloud API tokens per project using VS Code `SecretStorage`. Because `SecretStorage` cannot list keys, a CSV index is maintained under `hcloud.projectIndex`.
- `RobotCredentialManager` — stores Robot API username/password.
- `StorageBoxPasswordManager` — stores per-box CIFS passwords keyed by login.
- `CloudInitLibrary` — stores named cloud-init templates in `globalState` (not SecretStorage, to avoid keychain size limits).

**`src/providers/`** — One `vscode.TreeDataProvider<T>` per sidebar panel. Each provider implements `refresh()` which fires `_onDidChangeTreeData`. `ServersProvider` also implements `vscode.Disposable` and polls every 3 seconds when any server is in a transient state (starting, stopping, etc.).

**`src/commands/`** — Each file exports a `registerXxxCommands(context, tokenManager, provider, ...)` function that registers VS Code commands. After mutating API state, commands call `provider.refresh()`.

**`src/webviews/`** — Static HTML/CSS WebView panels (no frontend framework). Includes detail panels (server detail, network detail) and informational guide pages (SSH key guide, firewall guide, etc.).

**`src/tailscale/`** — `TailscaleAuthKeyManager` stores the auth key; `CloudInitInjector` appends a Tailscale `runcmd` block to cloud-init YAML.

## Key Conventions

- **viewItem context values** drive which context-menu commands appear. Example: `server-on`, `server-off`, `server-transitioning`; `volume-attached`, `volume-detached`. When adding commands, match these in `package.json` `"when"` clauses.
- The build target is CJS (`format: "cjs"`) bundled to `dist/extension.js`. `vscode` is the only external dependency.
- All API tokens and credentials are stored in `vscode.SecretStorage` (never in settings or globalState).
- Both Cloud API (multi-project) and Robot API (single account, for Storage Boxes) credentials are managed separately.
