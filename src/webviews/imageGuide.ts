import * as vscode from 'vscode';

export class ImageGuide {
  private static panel: vscode.WebviewPanel | undefined;

  static open(context: vscode.ExtensionContext): void {
    if (ImageGuide.panel) {
      ImageGuide.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.imageGuide',
      'Images — Guide',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    ImageGuide.panel = panel;

    panel.onDidDispose(() => {
      ImageGuide.panel = undefined;
    });

    panel.webview.html = getImageGuideHtml(generateNonce());

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'createServer':
          await vscode.commands.executeCommand('hcloud.createServer');
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://docs.hetzner.cloud/#images'));
          break;
        case 'openSnapshotDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://docs.hetzner.cloud/#server-actions-create-an-image'));
          break;
        case 'openAppMarketplace':
          vscode.env.openExternal(vscode.Uri.parse('https://www.hetzner.com/cloud/apps'));
          break;
      }
    }, undefined, context.subscriptions);
  }
}

function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let n = '';
  for (let i = 0; i < 32; i++) n += chars.charAt(Math.floor(Math.random() * chars.length));
  return n;
}

function getImageGuideHtml(nonce: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Images — Guide</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    line-height: 1.65;
    padding: 32px 40px 48px;
    max-width: 860px;
  }

  a { color: var(--vscode-textLink-foreground); text-decoration: none; }
  a:hover { text-decoration: underline; }

  h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  h2 { font-size: 14px; font-weight: 700; margin: 28px 0 10px; text-transform: uppercase;
       letter-spacing: .06em; color: var(--vscode-descriptionForeground); }
  h3 { font-size: 13px; font-weight: 700; margin: 18px 0 6px; }
  p  { font-size: 13px; margin-bottom: 12px; }

  .subtitle {
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 16px;
  }

  /* ── Tabs ── */
  .tab-bar {
    display: flex;
    gap: 0;
    border-bottom: 2px solid var(--vscode-panel-border);
    margin-bottom: 28px;
  }

  .tab-btn {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    padding: 8px 20px;
    font-family: var(--vscode-font-family);
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    transition: color 0.1s;
  }

  .tab-btn:hover { color: var(--vscode-foreground); }

  .tab-btn.active {
    color: var(--vscode-foreground);
    border-bottom-color: var(--vscode-focusBorder);
  }

  .tab-panel { display: none; }
  .tab-panel.active { display: block; }

  /* ── Callouts ── */
  .callout {
    background: color-mix(in srgb, var(--vscode-inputValidation-infoBackground, #003366) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-inputValidation-infoBorder, #007acc) 55%, transparent);
    border-radius: 6px;
    padding: 14px 18px;
    font-size: 13px;
    margin-bottom: 24px;
  }

  .callout strong { display: block; margin-bottom: 4px; }

  .callout-warn {
    background: color-mix(in srgb, var(--vscode-inputValidation-warningBackground, #6c4f00) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-inputValidation-warningBorder, #b89500) 55%, transparent);
  }

  /* ── Image type cards ── */
  .type-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }

  .type-card {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 16px 18px;
  }

  .type-card .type-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;
  }

  .type-card .type-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .type-card p {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
    line-height: 1.6;
  }

  .type-card p:last-child { margin-bottom: 0; }

  /* ── OS table ── */
  .os-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 24px;
  }

  .os-card {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 12px 14px;
  }

  .os-name { font-size: 13px; font-weight: 700; margin-bottom: 2px; }

  .os-versions {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }

  /* ── Steps ── */
  .steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 28px; }

  .step {
    display: flex;
    gap: 18px;
    align-items: flex-start;
    position: relative;
    padding-bottom: 24px;
  }

  .step:last-child { padding-bottom: 0; }

  .step:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 15px; top: 32px; bottom: 0;
    width: 2px;
    background: var(--vscode-panel-border);
  }

  .step-num {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; z-index: 1;
  }

  .step-body { padding-top: 4px; }
  .step-heading { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
  .step-text { font-size: 12px; color: var(--vscode-descriptionForeground); line-height: 1.6; }
  .step-text p { font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 6px; }
  .step-text p:last-child { margin-bottom: 0; }

  /* ── Code block ── */
  code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    background: var(--vscode-textBlockQuote-background);
    padding: 1px 5px;
    border-radius: 3px;
  }

  pre {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    background: var(--vscode-textBlockQuote-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 5px;
    padding: 12px 14px;
    margin: 8px 0 12px;
    overflow-x: auto;
    line-height: 1.6;
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 18px; border-radius: 4px; font-size: 13px;
    font-family: var(--vscode-font-family); cursor: pointer; border: none;
    font-weight: 600; margin-top: 0; margin-right: 8px;
  }

  .btn-primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  .btn-primary:hover { background: var(--vscode-button-hoverBackground); }

  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

  .btn-row { margin-bottom: 24px; }

  .divider {
    border: none;
    border-top: 1px solid var(--vscode-panel-border);
    margin: 28px 0;
  }

  .tip {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 8px;
    font-style: italic;
  }
</style>
</head>
<body>

<h1>🖼 Images</h1>
<p class="subtitle">Images are the starting point for every server — choose from Hetzner system images, app images, or build your own via snapshots.</p>

<div class="tab-bar">
  <button class="tab-btn active" data-tab="overview">Overview</button>
  <button class="tab-btn" data-tab="custom">Custom Images</button>
</div>

<!-- ══════════════════════════════════════════════════════════
     TAB 1 — OVERVIEW
     ══════════════════════════════════════════════════════════ -->
<div class="tab-panel active" id="tab-overview">

  <div class="btn-row">
    <button class="btn btn-primary" id="btn-create-server">+ New Server</button>
    <button class="btn btn-secondary" id="btn-docs">📖 Image Docs</button>
  </div>

  <h2>Image types</h2>
  <div class="type-grid">
    <div class="type-card">
      <div class="type-label">Type · system</div>
      <div class="type-title">📦 System images</div>
      <p>Official OS images maintained by Hetzner. Always up-to-date at the time you create a server.
         Free to use — no extra charge beyond the server cost.</p>
      <p>These are what you see in the Images panel under the server wizard.</p>
    </div>
    <div class="type-card">
      <div class="type-label">Type · app</div>
      <div class="type-title">🚀 App images</div>
      <p>Pre-configured application stacks from the Hetzner App Marketplace — one-click deployments for
         Docker, WordPress, LAMP, Nextcloud, GitLab, and more.</p>
      <p>App images are OS images with software pre-installed and ready to run.</p>
    </div>
    <div class="type-card">
      <div class="type-label">Type · snapshot</div>
      <div class="type-title">📸 Snapshots</div>
      <p>A point-in-time copy of a server's disk. Created manually via the API or Cloud Console.
         Snapshots persist independently of the originating server — they are your <strong>custom images</strong>.</p>
      <p>Billed per GB of compressed snapshot storage.</p>
    </div>
    <div class="type-card">
      <div class="type-label">Type · backup</div>
      <div class="type-title">🗓 Backups</div>
      <p>Automatic daily/weekly backups created by Hetzner when the backup feature is enabled on a server.
         Up to 7 rolling backup images are kept.</p>
      <p>Backups cost 20% of the server price. They can be converted to snapshots for permanent retention.</p>
    </div>
  </div>

  <hr class="divider">

  <h2>Available system images</h2>
  <div class="os-grid">
    <div class="os-card">
      <div class="os-name">Ubuntu</div>
      <div class="os-versions">20.04 LTS · 22.04 LTS · 24.04 LTS</div>
    </div>
    <div class="os-card">
      <div class="os-name">Debian</div>
      <div class="os-versions">11 (Bullseye) · 12 (Bookworm)</div>
    </div>
    <div class="os-card">
      <div class="os-name">Fedora</div>
      <div class="os-versions">39 · 40</div>
    </div>
    <div class="os-card">
      <div class="os-name">Rocky Linux</div>
      <div class="os-versions">8 · 9</div>
    </div>
    <div class="os-card">
      <div class="os-name">AlmaLinux</div>
      <div class="os-versions">8 · 9</div>
    </div>
    <div class="os-card">
      <div class="os-name">CentOS Stream</div>
      <div class="os-versions">9</div>
    </div>
  </div>

  <div class="callout">
    <strong>ℹ Available images are project- and location-specific</strong>
    The Images panel shows images available for your active project.
    Snapshots are global to the project but can only be used to create servers in the same account.
    App images may vary by datacenter location.
  </div>

  <h2>Choosing the right base image</h2>
  <p>For most use cases, start with <strong>Ubuntu 24.04 LTS</strong> — it has the broadest community support,
     longest LTS window, and is the basis for most cloud tutorials.
     Use <strong>Debian 12</strong> for minimal footprint and stability. Choose <strong>Rocky / AlmaLinux</strong>
     when RHEL compatibility is required (e.g. enterprise software, RPM packages).</p>
  <p>For pre-configured stacks, browse the <strong>App images</strong> tab — they save setup time for
     common services like Docker, Wordpress, or Nextcloud.</p>

  <button class="btn btn-secondary" id="btn-marketplace">🚀 Hetzner App Marketplace</button>

</div>

<!-- ══════════════════════════════════════════════════════════
     TAB 2 — CUSTOM IMAGES
     ══════════════════════════════════════════════════════════ -->
<div class="tab-panel" id="tab-custom">

  <div class="btn-row">
    <button class="btn btn-secondary" id="btn-snapshot-docs">📖 Snapshot API Docs</button>
  </div>

  <div class="callout">
    <strong>ℹ How custom images work in Hetzner Cloud</strong>
    Hetzner does not support direct image file uploads. Instead, the workflow is:
    build and configure a server, then <strong>take a snapshot</strong>. That snapshot becomes a reusable
    image you can select when creating new servers — just like a system image.
  </div>

  <h2>Step-by-step: creating a custom image</h2>
  <div class="steps">

    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <div class="step-heading">Create a builder server</div>
        <div class="step-text">
          <p>Use the <strong>New Server</strong> wizard to create a small temporary server (CX22 or similar).
          Choose the OS that will be the base of your image — typically Ubuntu 24.04 LTS or Debian 12.</p>
          <p>Name it something like <code>image-builder</code> so it is easy to identify and delete afterwards.</p>
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <div class="step-heading">SSH in and configure</div>
        <div class="step-text">
          <p>Connect to the server and install/configure everything your image needs:</p>
<pre>ssh root@&lt;server-ip&gt;

# Update the base OS
apt update && apt upgrade -y

# Install your software
apt install -y nginx postgresql docker.io

# Perform any configuration
systemctl enable nginx
# ... configure services, users, directories etc.</pre>
          <p>Keep the image lean — avoid leaving secrets, SSH authorized keys, or machine-specific config
          in the snapshot. Strip those out before snapshotting.</p>
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <div class="step-heading">Clean up before snapshotting</div>
        <div class="step-text">
          <p>Remove anything that should not be baked into the image:</p>
<pre># Clear shell history
history -c && history -w

# Remove SSH host keys (regenerated on first boot)
rm -f /etc/ssh/ssh_host_*

# Remove root's authorized_keys (new servers get their own)
rm -f /root/.ssh/authorized_keys

# Clear temporary files and package cache
apt clean
rm -rf /tmp/* /var/tmp/*

# Zero free space (optional — reduces snapshot size)
dd if=/dev/zero of=/zero bs=1M 2>/dev/null; rm /zero</pre>
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">4</div>
      <div class="step-body">
        <div class="step-heading">Power off the server</div>
        <div class="step-text">
          <p>Shut down cleanly before taking the snapshot. This ensures filesystem consistency and avoids
          capturing any stale in-memory state.</p>
<pre>shutdown -h now</pre>
          <p>Wait for the server status to change to <strong>off</strong> in the Servers panel before proceeding.</p>
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">5</div>
      <div class="step-body">
        <div class="step-heading">Create the snapshot</div>
        <div class="step-text">
          <p>Use the Hetzner Cloud Console or API to create the snapshot:</p>
<pre># Via hcloud CLI
hcloud server create-image --type snapshot --description "my-custom-image-v1" &lt;server-name&gt;</pre>
          <p>Or in the Cloud Console: open the server → <strong>Snapshots</strong> tab → <strong>Take Snapshot</strong>.
          Give it a descriptive name like <code>ubuntu-24-nginx-v1</code>.</p>
          <p>The snapshot will appear in the Images panel (type: snapshot) once it is ready.</p>
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">6</div>
      <div class="step-body">
        <div class="step-heading">Delete the builder server</div>
        <div class="step-text">
          <p>The builder server is no longer needed. Delete it from the Servers panel to stop incurring charges.
          The snapshot is now an independent resource and will remain available.</p>
        </div>
      </div>
    </div>

    <div class="step">
      <div class="step-num">7</div>
      <div class="step-body">
        <div class="step-heading">Use the snapshot as an image</div>
        <div class="step-text">
          <p>When creating a new server in the wizard, select the snapshot from the <strong>OS Image</strong>
          step — it will appear under <em>Snapshots</em>. All new servers will start from your
          pre-configured state.</p>
          <p>You can continue using cloud-init on top of snapshot-based servers to inject per-server
          config (SSH keys, hostnames, secrets) without baking them into the image.</p>
        </div>
      </div>
    </div>

  </div>

  <hr class="divider">

  <h2>Cloud-init as a lightweight alternative</h2>
  <p>For many use cases you do not need a full custom snapshot. Use <strong>cloud-init</strong> to
  install packages and configure a server automatically on first boot from a stock system image:</p>

<pre>#cloud-config
packages:
  - nginx
  - postgresql
  - docker.io

runcmd:
  - systemctl enable --now nginx
  - mkdir -p /var/www/myapp

users:
  - name: deploy
    groups: sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL</pre>

  <p>The server wizard in this extension has a <strong>Cloud-init</strong> step where you can paste or
  load a saved template from the cloud-init library. This works on top of any base image — including
  your own snapshots.</p>

  <hr class="divider">

  <h2>Tips &amp; best practices</h2>
  <div class="callout">
    <strong>Version your snapshots</strong>
    Use a naming convention like <code>ubuntu-24-app-v1</code>, <code>ubuntu-24-app-v2</code>.
    Keep the previous version until the new one is confirmed working. Snapshots are cheap per-GB.
  </div>
  <div class="callout callout-warn">
    <strong>⚠ Do not bake secrets into snapshots</strong>
    API keys, passwords, or SSH private keys stored in the image will be present in every server
    created from it. Use cloud-init environment injection, HashiCorp Vault, or a secrets manager
    instead. Always strip <code>/root/.ssh/authorized_keys</code> before snapshotting.
  </div>

</div>

<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');
    });
  });

  // Button wiring
  function wire(id, command) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function () { vscode.postMessage({ command: command }); });
  }
  wire('btn-create-server',  'createServer');
  wire('btn-docs',           'openDocs');
  wire('btn-marketplace',    'openAppMarketplace');
  wire('btn-snapshot-docs',  'openSnapshotDocs');
})();
</script>
</body>
</html>`;
}
