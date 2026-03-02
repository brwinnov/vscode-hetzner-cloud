import * as vscode from 'vscode';

export class WelcomePage {
  private static panel: vscode.WebviewPanel | undefined;

  /** Open (or reveal) the welcome page. */
  static open(context: vscode.ExtensionContext): void {
    if (WelcomePage.panel) {
      WelcomePage.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.welcome',
      'Hetzner Cloud Toolkit',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    WelcomePage.panel = panel;

    panel.onDidDispose(() => {
      WelcomePage.panel = undefined;
    });

    panel.webview.html = getWelcomeHtml(generateNonce());

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'addToken':
          await vscode.commands.executeCommand('hcloud.addToken');
          break;
        case 'sshKeyGuide':
          await vscode.commands.executeCommand('hcloud.sshKeyGuide');
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/brwinnov/vscode-hetzner-cloud#readme'));
          break;
        case 'openHetznerConsole':
          vscode.env.openExternal(vscode.Uri.parse('https://console.hetzner.cloud'));
          break;
      }
    }, undefined, context.subscriptions);
  }

  /**
   * Show on first install only (not on every VS Code restart).
   * Tracks with globalState key `hcloud.welcomeShown`.
   */
  static openOnFirstInstall(context: vscode.ExtensionContext): void {
    const shown = context.globalState.get<boolean>('hcloud.welcomeShown');
    if (!shown) {
      context.globalState.update('hcloud.welcomeShown', true);
      WelcomePage.open(context);
    }
  }
}

function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let n = '';
  for (let i = 0; i < 32; i++) n += chars.charAt(Math.floor(Math.random() * chars.length));
  return n;
}

function getWelcomeHtml(nonce: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hetzner Cloud Toolkit</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --red: #d50000;
    --red-light: rgba(213,0,0,0.12);
    --red-border: rgba(213,0,0,0.35);
  }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    line-height: 1.6;
    overflow-x: hidden;
  }

  a { color: var(--vscode-textLink-foreground); text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* ── Hero ── */
  .hero {
    background: linear-gradient(135deg,
      var(--vscode-sideBar-background) 0%,
      var(--vscode-editor-background) 100%);
    border-bottom: 1px solid var(--vscode-panel-border);
    padding: 56px 60px 48px;
    display: flex;
    align-items: center;
    gap: 48px;
  }

  .hero-logo {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    background: var(--red);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    box-shadow: 0 4px 24px rgba(213,0,0,0.35);
  }

  .hero-text h1 {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }

  .hero-text h1 span { color: var(--red); }

  .hero-text .subtitle {
    font-size: 15px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 28px;
    max-width: 520px;
  }

  .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 20px;
    border-radius: 5px;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    border: none;
    font-weight: 600;
    transition: opacity 0.15s, transform 0.1s;
  }

  .btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }

  .btn-primary {
    background: var(--red);
    color: #fff;
  }

  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }

  .btn-ghost {
    background: transparent;
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-panel-border);
  }

  /* ── Section layout ── */
  .section {
    padding: 48px 60px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  .section:last-child { border-bottom: none; }

  .section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 24px;
  }

  /* ── Feature cards ── */
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .feature-card {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 20px;
    transition: border-color 0.15s;
  }

  .feature-card:hover { border-color: var(--red-border); }

  .feature-icon {
    font-size: 26px;
    margin-bottom: 10px;
  }

  .feature-title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .feature-desc {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.55;
  }

  /* ── Getting started steps ── */
  .steps {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 640px;
  }

  .step {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    position: relative;
    padding-bottom: 28px;
  }

  .step:last-child { padding-bottom: 0; }

  .step:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 17px;
    top: 36px;
    bottom: 0;
    width: 2px;
    background: var(--vscode-panel-border);
  }

  .step-num {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--red);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    z-index: 1;
  }

  .step-body { padding-top: 6px; }
  .step-heading { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
  .step-text { font-size: 12px; color: var(--vscode-descriptionForeground); line-height: 1.55; }
  .step-text code {
    font-family: var(--vscode-editor-font-family, monospace);
    background: var(--vscode-textBlockQuote-background);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 11px;
  }

  .step-action {
    margin-top: 10px;
  }

  /* ── Info strip ── */
  .info-strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .info-item {
    background: var(--red-light);
    border: 1px solid var(--red-border);
    border-radius: 8px;
    padding: 16px 18px;
  }

  .info-item-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--red);
    margin-bottom: 4px;
  }

  .info-item-value {
    font-size: 13px;
    font-weight: 600;
  }

  /* ── Footer links ── */
  .footer {
    padding: 24px 60px;
    display: flex;
    gap: 28px;
    flex-wrap: wrap;
    background: var(--vscode-sideBar-background);
    border-top: 1px solid var(--vscode-panel-border);
    font-size: 12px;
  }

  .footer a { color: var(--vscode-descriptionForeground); }
  .footer a:hover { color: var(--vscode-foreground); }
</style>
</head>
<body>

<!-- ── Hero ── -->
<div class="hero">
  <div class="hero-logo">☁️</div>
  <div class="hero-text">
    <h1>Hetzner <span>Cloud</span> Toolkit</h1>
    <p class="subtitle">
      Manage your entire Hetzner Cloud infrastructure directly from VS Code —
      servers, networks, firewalls, volumes, load balancers, and more.
      No browser tab needed.
    </p>
    <div class="hero-actions">
      <button class="btn btn-primary" id="btn-add-token">🔑 Add API Token</button>
      <button class="btn btn-secondary" id="btn-ssh-guide">📋 SSH Key Guide</button>
      <button class="btn btn-ghost" id="btn-docs">📖 Documentation</button>
      <button class="btn btn-ghost" id="btn-console">🌐 Hetzner Console</button>
    </div>
  </div>
</div>

<!-- ── Stats strip ── -->
<div class="section" style="padding-top:32px;padding-bottom:32px">
  <div class="info-strip">
    <div class="info-item">
      <div class="info-item-label">Views</div>
      <div class="info-item-value">10 sidebar panels</div>
    </div>
    <div class="info-item">
      <div class="info-item-label">Commands</div>
      <div class="info-item-value">40+ palette commands</div>
    </div>
    <div class="info-item">
      <div class="info-item-label">Dependencies</div>
      <div class="info-item-value">Zero runtime deps</div>
    </div>
    <div class="info-item">
      <div class="info-item-label">API</div>
      <div class="info-item-value">Hetzner Cloud + Robot</div>
    </div>
  </div>
</div>

<!-- ── Features ── -->
<div class="section">
  <div class="section-title">What you can do</div>
  <div class="features">

    <div class="feature-card">
      <div class="feature-icon">🖥️</div>
      <div class="feature-title">Server Management</div>
      <div class="feature-desc">
        Create, start, stop, reboot and delete servers. Full 7-step wizard with
        server type, OS image, SSH keys, networking, and cloud-init configuration.
        Status polling keeps the tree in sync during transitions.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">📋</div>
      <div class="feature-title">Server Detail Panel</div>
      <div class="feature-desc">
        Click any server to open a rich detail view — status badge, specs, network info,
        labels, and one-click action buttons for start / stop / reboot / SSH / delete.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">🌐</div>
      <div class="feature-title">Networks &amp; Subnets</div>
      <div class="feature-desc">
        Create and delete private networks. Add and remove subnets with IP range
        and network zone selection directly from the tree view.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">🛡️</div>
      <div class="feature-title">Firewalls</div>
      <div class="feature-desc">
        Create firewalls with sensible defaults (SSH, HTTP, HTTPS, ICMP).
        Add and delete individual rules with protocol, port range, and IP CIDR support.
        Apply firewalls to servers and remove them — all from the sidebar.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">💾</div>
      <div class="feature-title">Volumes</div>
      <div class="feature-desc">
        Create block storage volumes with ext4 or XFS formatting, attach them to servers,
        detach, resize, and delete. Prevents deletion of attached volumes with a clear warning.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">⚖️</div>
      <div class="feature-title">Load Balancers</div>
      <div class="feature-desc">
        Create load balancers with algorithm selection (Round Robin / Least Connections),
        add and remove server targets. View services and targets in the tree.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">📦</div>
      <div class="feature-title">Storage Boxes</div>
      <div class="feature-desc">
        Browse Hetzner Robot storage boxes. Generate CIFS mount cloud-init scripts
        and inject them into new server configurations — credentials stored securely.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">🔑</div>
      <div class="feature-title">SSH Keys</div>
      <div class="feature-desc">
        Upload and manage SSH keys on your Hetzner projects. Includes a built-in
        SSH Key Generation Guide with instructions for Windows, macOS, WSL, Linux,
        Bitvise Client, and deep dives into key algorithms.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">🗂️</div>
      <div class="feature-title">Multi-Project Support</div>
      <div class="feature-desc">
        Store multiple Hetzner API tokens under named projects. Switch the active
        project with a single click — all views refresh automatically.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">🐉</div>
      <div class="feature-title">Tailscale Integration</div>
      <div class="feature-desc">
        Store a Tailscale auth key and inject it automatically into the cloud-init
        configuration when creating a new server — new servers join your Tailnet on first boot.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">📝</div>
      <div class="feature-title">Cloud-Init Library</div>
      <div class="feature-desc">
        Save, load, and delete named cloud-init templates from within the server wizard.
        Reuse complex startup configurations across multiple server deployments.
      </div>
    </div>

    <div class="feature-card">
      <div class="feature-icon">🔒</div>
      <div class="feature-title">Secure by Design</div>
      <div class="feature-desc">
        All API tokens, robot credentials, SSH passwords, and Tailscale keys are stored
        in VS Code's OS-encrypted SecretStorage. Zero hardcoded credentials. HTTPS only.
      </div>
    </div>

  </div>
</div>

<!-- ── Getting started ── -->
<div class="section">
  <div class="section-title">Getting started</div>
  <div class="steps">

    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <div class="step-heading">Add a Hetzner API token</div>
        <div class="step-text">
          Log in to the <a href="https://console.hetzner.cloud" target="_blank">Hetzner Cloud Console</a>,
          navigate to your project → Security → API Tokens, and create a Read/Write token.
          Then click the button below (or use <code>Ctrl+Shift+P</code> → <em>Add Hetzner API Token</em>).
        </div>
        <div class="step-action">
          <button class="btn btn-primary" id="btn-add-token-2">🔑 Add API Token</button>
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <div class="step-heading">Generate an SSH key pair</div>
        <div class="step-text">
          You need an SSH key to access your servers without a password.
          Open the SSH Key Generation Guide for step-by-step instructions for your OS
          — Windows PowerShell, macOS, WSL, Linux, or Bitvise GUI client.
        </div>
        <div class="step-action">
          <button class="btn btn-secondary" id="btn-ssh-guide-2">📋 Open SSH Key Guide</button>
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <div class="step-heading">Upload your public key to Hetzner</div>
        <div class="step-text">
          Click the <strong>SSH Keys</strong> panel in the sidebar, then use the
          <code>+</code> button to add the public key. It will be available to select
          when creating servers.
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">4</div>
      <div class="step-body">
        <div class="step-heading">Create your first server</div>
        <div class="step-text">
          Click the <strong>Servers</strong> panel and use the <code>+</code> button
          to open the 7-step server creation wizard. Choose your server type, OS image,
          SSH key, network, and optional cloud-init script — then click <em>Create Server</em>.
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">5</div>
      <div class="step-body">
        <div class="step-heading">Connect via SSH</div>
        <div class="step-text">
          Once the server reaches <em>running</em> state, click it to open the detail panel
          and hit the <strong>Open SSH Terminal</strong> button. VS Code opens a terminal
          connected directly to your server.
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ── Footer ── -->
<div class="footer">
  <a href="https://github.com/brwinnov/vscode-hetzner-cloud" target="_blank">GitHub Repository</a>
  <a href="https://github.com/brwinnov/vscode-hetzner-cloud/issues" target="_blank">Report an Issue</a>
  <a href="https://docs.hetzner.cloud" target="_blank">Hetzner Cloud API Docs</a>
  <a href="https://robot.hetzner.com" target="_blank">Hetzner Robot</a>
  <a href="https://tailscale.com" target="_blank">Tailscale</a>
  <span style="margin-left:auto;color:var(--vscode-descriptionForeground)">Hetzner Cloud Toolkit v0.1.0 — Not affiliated with Hetzner Online GmbH</span>
</div>

<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();

  function wire(id, command) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', function () {
        vscode.postMessage({ command: command });
      });
    }
  }

  wire('btn-add-token',   'addToken');
  wire('btn-add-token-2', 'addToken');
  wire('btn-ssh-guide',   'sshKeyGuide');
  wire('btn-ssh-guide-2', 'sshKeyGuide');
  wire('btn-docs',        'openDocs');
  wire('btn-console',     'openHetznerConsole');
})();
</script>
</body>
</html>`;
}
