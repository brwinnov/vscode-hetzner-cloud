import * as vscode from 'vscode';

export class VolumeGuide {
  private static panel: vscode.WebviewPanel | undefined;

  static open(context: vscode.ExtensionContext): void {
    if (VolumeGuide.panel) {
      VolumeGuide.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.volumeGuide',
      'Volumes — Guide',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    VolumeGuide.panel = panel;

    panel.onDidDispose(() => {
      VolumeGuide.panel = undefined;
    });

    panel.webview.html = getVolumeGuideHtml(generateNonce());

    panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'createVolume':
          await vscode.commands.executeCommand('hcloud.createVolume');
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://docs.hetzner.cloud/#volumes'));
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

function getVolumeGuideHtml(nonce: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Volumes — Guide</title>
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
  p  { font-size: 13px; margin-bottom: 12px; }

  .subtitle {
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 16px;
  }

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

  /* Summary cards */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .summary-card {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 14px 16px;
  }

  .summary-card .label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;
  }

  .summary-card .value {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .summary-card p {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 0;
  }

  /* Actions table */
  .action-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-bottom: 24px;
  }

  .action-table th {
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--vscode-descriptionForeground);
    padding: 6px 10px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  .action-table td {
    padding: 8px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 50%, transparent);
    vertical-align: top;
  }

  .action-table tr:last-child td { border-bottom: none; }

  .action-name {
    font-weight: 700;
    white-space: nowrap;
  }

  code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    background: var(--vscode-textBlockQuote-background);
    padding: 1px 5px;
    border-radius: 3px;
  }

  /* Use cases */
  .use-cases {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 28px;
  }

  .use-case {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 16px 18px;
  }

  .use-case-title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .use-case-desc {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 10px;
    line-height: 1.6;
  }

  .use-case-meta {
    display: flex;
    gap: 20px;
    font-size: 12px;
    flex-wrap: wrap;
  }

  .meta-item { display: flex; flex-direction: column; gap: 2px; }

  .meta-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--vscode-descriptionForeground);
  }

  .meta-value { font-weight: 600; }

  .tip {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 10px;
    font-style: italic;
  }

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

  .divider {
    border: none;
    border-top: 1px solid var(--vscode-panel-border);
    margin: 28px 0;
  }
</style>
</head>
<body>

<h1>💾 Block Volumes</h1>
<p class="subtitle">Hetzner Cloud Volumes are persistent network-attached block storage devices — independent of any server's lifecycle.</p>

<button class="btn btn-primary" id="btn-create">+ Create Volume</button>
<button class="btn btn-secondary" id="btn-docs">📖 Hetzner Volumes Docs</button>

<hr class="divider">

<h2>Overview</h2>
<div class="summary-grid">
  <div class="summary-card">
    <div class="label">Size</div>
    <div class="value">10 – 10,240 GB</div>
    <p>Minimum 10 GB. Can be grown at any time — no downtime required to resize the volume itself.</p>
  </div>
  <div class="summary-card">
    <div class="label">Formats</div>
    <div class="value">ext4 &nbsp;·&nbsp; XFS</div>
    <p>Hetzner formats the volume for you at creation. The filesystem is then expanded when you resize.</p>
  </div>
  <div class="summary-card">
    <div class="label">Location</div>
    <div class="value">Same as server</div>
    <p>Volumes are zone-local. A volume in Nuremberg can only be attached to servers in Nuremberg.</p>
  </div>
</div>

<div class="callout">
  <strong>ℹ Volumes survive server deletion</strong>
  Unlike a server's local disk, a volume is an independent resource. You can detach it, keep the data, and re-attach it to a new server at any time — or keep it detached as a cold backup.
</div>

<hr class="divider">

<h2>Available actions</h2>
<table class="action-table">
  <thead>
    <tr><th>Action</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr>
      <td class="action-name">Create</td>
      <td>Choose name, size (10–10,240 GB), location, filesystem (ext4 or XFS), and optionally attach to a server immediately with automount.</td>
    </tr>
    <tr>
      <td class="action-name">Attach</td>
      <td>Connect a detached volume to a running server in the same location. Optionally enable <strong>automount</strong> — Hetzner adds an <code>/etc/fstab</code> entry so the volume mounts automatically on reboot.</td>
    </tr>
    <tr>
      <td class="action-name">Detach</td>
      <td>Unmount the volume from its server. Data is preserved. The volume can then be attached to a different server.</td>
    </tr>
    <tr>
      <td class="action-name">Resize</td>
      <td>Increase the volume size (only growing is supported — volumes cannot be shrunk). After resizing, run <code>resize2fs /dev/disk/by-id/…</code> (ext4) or <code>xfs_growfs /mount/point</code> (XFS) on the server to expand the filesystem.</td>
    </tr>
    <tr>
      <td class="action-name">Delete</td>
      <td>Permanently removes the volume and all its data. The volume must be detached first. This action is irreversible.</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-warn">
  <strong>⚠ Filesystem resize after volume resize</strong>
  Resizing the volume in Hetzner only grows the block device. You must also expand the filesystem inside the server:
  <br><br>
  ext4: &nbsp;<code>sudo resize2fs /dev/disk/by-id/scsi-0HC_Volume_&lt;id&gt;</code><br>
  XFS: &nbsp;&nbsp;<code>sudo xfs_growfs /mnt/your-mount-point</code>
</div>

<hr class="divider">

<h2>Use case examples</h2>
<div class="use-cases">

  <div class="use-case">
    <div class="use-case-title">🗄 Database data directory</div>
    <div class="use-case-desc">
      Keep your PostgreSQL or MySQL data directory on a volume separate from the OS disk.
      If the server needs to be rebuilt or upgraded, detach the volume and re-attach to the new server —
      your data survives intact.
    </div>
    <div class="use-case-meta">
      <div class="meta-item"><span class="meta-label">Suggested size</span><span class="meta-value">50–500 GB</span></div>
      <div class="meta-item"><span class="meta-label">Format</span><span class="meta-value">ext4</span></div>
      <div class="meta-item"><span class="meta-label">Mount point</span><span class="meta-value"><code>/var/lib/postgresql</code></span></div>
      <div class="meta-item"><span class="meta-label">Automount</span><span class="meta-value">Yes</span></div>
    </div>
    <p class="tip">Move the data directory to the volume mount point and symlink, or configure the DB engine to use the path directly.</p>
  </div>

  <div class="use-case">
    <div class="use-case-title">📦 Shared media / upload storage</div>
    <div class="use-case-desc">
      An application server handles uploads and stores files on a volume. When you scale horizontally
      (add more app servers), detach and re-attach, or migrate to object storage. The volume holds the
      data independently of app server restarts or replacements.
    </div>
    <div class="use-case-meta">
      <div class="meta-item"><span class="meta-label">Suggested size</span><span class="meta-value">100 GB → resize as needed</span></div>
      <div class="meta-item"><span class="meta-label">Format</span><span class="meta-value">ext4 or XFS</span></div>
      <div class="meta-item"><span class="meta-label">Mount point</span><span class="meta-value"><code>/var/www/uploads</code></span></div>
    </div>
  </div>

  <div class="use-case">
    <div class="use-case-title">🔄 Hot-swap data between servers</div>
    <div class="use-case-desc">
      Use a volume as a portable data carrier. Write data on server A, detach, attach to server B for
      processing. Useful for batch jobs, dataset handoffs, or migration workflows without copying data
      over the network.
    </div>
    <div class="use-case-meta">
      <div class="meta-item"><span class="meta-label">Suggested size</span><span class="meta-value">As needed for dataset</span></div>
      <div class="meta-item"><span class="meta-label">Format</span><span class="meta-value">ext4</span></div>
      <div class="meta-item"><span class="meta-label">Automount</span><span class="meta-value">No — mount manually per job</span></div>
    </div>
    <p class="tip">Both servers must be in the same Hetzner location for the volume to be transferable between them.</p>
  </div>

  <div class="use-case">
    <div class="use-case-title">📜 Persistent logs &amp; audit trail</div>
    <div class="use-case-desc">
      Store application or audit logs on a dedicated volume so they outlive any individual server.
      Mount it read-write on your active server; for review, attach it read-only to an analysis instance.
    </div>
    <div class="use-case-meta">
      <div class="meta-item"><span class="meta-label">Suggested size</span><span class="meta-value">10–50 GB, resize as log volume grows</span></div>
      <div class="meta-item"><span class="meta-label">Format</span><span class="meta-value">XFS (good for many small files)</span></div>
      <div class="meta-item"><span class="meta-label">Mount point</span><span class="meta-value"><code>/var/log/app</code></span></div>
    </div>
  </div>

  <div class="use-case">
    <div class="use-case-title">🏗 Build cache / CI artefacts</div>
    <div class="use-case-desc">
      A CI runner server uses a volume to cache build dependencies (npm, Maven, Docker layers) across
      builds. If you destroy and recreate the runner server (e.g. to upgrade), attach the same volume
      to the new instance to avoid a cold-cache warm-up.
    </div>
    <div class="use-case-meta">
      <div class="meta-item"><span class="meta-label">Suggested size</span><span class="meta-value">20–100 GB</span></div>
      <div class="meta-item"><span class="meta-label">Format</span><span class="meta-value">ext4</span></div>
      <div class="meta-item"><span class="meta-label">Mount point</span><span class="meta-value"><code>/cache</code></span></div>
      <div class="meta-item"><span class="meta-label">Automount</span><span class="meta-value">Yes</span></div>
    </div>
  </div>

</div>

<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  function wire(id, command) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function () { vscode.postMessage({ command: command }); });
  }
  wire('btn-create', 'createVolume');
  wire('btn-docs',   'openDocs');
})();
</script>
</body>
</html>`;
}
