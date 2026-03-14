import * as vscode from 'vscode';
import { HServer, HetznerClient } from '../api/hetzner';
import { ServersProvider } from '../providers/serversProvider';

// Re-use a single panel per server id rather than opening duplicates
const openPanels = new Map<number, ServerDetailPanel>();

export class ServerDetailPanel {
  private panel: vscode.WebviewPanel;
  private server: HServer;
  private readonly client: HetznerClient;
  private readonly serversProvider: ServersProvider;

  private constructor(
    panel: vscode.WebviewPanel,
    server: HServer,
    client: HetznerClient,
    serversProvider: ServersProvider
  ) {
    this.panel = panel;
    this.server = server;
    this.client = client;
    this.serversProvider = serversProvider;

    this.panel.webview.html = renderHtml(this.server);

    this.panel.webview.onDidReceiveMessage(async (msg) => {
      await this.handleMessage(msg);
    });

    this.panel.onDidDispose(() => {
      openPanels.delete(this.server.id);
    });
  }

  static open(
    context: vscode.ExtensionContext,
    server: HServer,
    client: HetznerClient,
    serversProvider: ServersProvider
  ): void {
    const existing = openPanels.get(server.id);
    if (existing) {
      existing.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.serverDetail',
      server.name,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    const instance = new ServerDetailPanel(panel, server, client, serversProvider);
    openPanels.set(server.id, instance);
  }

  private async handleMessage(msg: { command: string }) {
    switch (msg.command) {
      case 'refresh':
        await this.doRefresh();
        break;
      case 'start':
        await this.doAction('start', () => this.client.powerOnServer(this.server.id));
        break;
      case 'stop':
        await this.doAction('stop', () => this.client.powerOffServer(this.server.id));
        break;
      case 'reboot':
        await this.doAction('reboot', () => this.client.rebootServer(this.server.id));
        break;
      case 'ssh': {
        const ip = this.server.public_net.ipv4?.ip ?? this.server.public_net.ipv6?.ip;
        if (!ip) {
          vscode.window.showErrorMessage('Server has no public IP address.');
          return;
        }
        const term = vscode.window.createTerminal(`SSH: ${this.server.name}`);
        term.sendText(`ssh root@${ip}`);
        term.show();
        break;
      }
      case 'delete': {
        const confirm = await vscode.window.showWarningMessage(
          `Permanently delete server "${this.server.name}"? This cannot be undone.`,
          { modal: true },
          'Delete'
        );
        if (confirm !== 'Delete') return;
        try {
          await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: `Deleting ${this.server.name}...` },
            () => this.client.deleteServer(this.server.id)
          );
          this.serversProvider.refresh();
          this.panel.dispose();
        } catch (err: unknown) {
          vscode.window.showErrorMessage(`Delete failed: ${(err as Error).message}`);
        }
        break;
      }
    }
  }

  private async doRefresh() {
    try {
      this.server = await this.client.getServer(this.server.id);
      this.panel.webview.html = renderHtml(this.server);
      this.serversProvider.refresh();
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Failed to refresh server: ${(err as Error).message}`);
    }
  }

  private async doAction(label: string, action: () => Promise<void>) {
    this.panel.webview.postMessage({ command: 'setLoading', label });
    try {
      await action();
      await this.doRefresh();
    } catch (err: unknown) {
      this.panel.webview.postMessage({ command: 'clearLoading' });
      vscode.window.showErrorMessage(`Action "${label}" failed: ${(err as Error).message}`);
    }
  }
}

// ── HTML renderer ──────────────────────────────────────────────────────────

function statusColor(status: HServer['status']): string {
  switch (status) {
    case 'running': return 'var(--vscode-testing-iconPassed)';
    case 'off':     return 'var(--vscode-testing-iconFailed)';
    default:        return 'var(--vscode-testing-iconQueued)';
  }
}

function statusLabel(status: HServer['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Cryptographically-adequate nonce for CSP inline script allowlisting. */
function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let n = '';
  for (let i = 0; i < 32; i++) n += chars.charAt(Math.floor(Math.random() * chars.length));
  return n;
}

/** HTML-escape a string for safe use in text content and attribute values. */
function escHtml(s: string): string {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function row(label: string, value: string): string {
  return `<tr><td class="lbl">${escHtml(label)}</td><td class="val">${escHtml(value)}</td></tr>`;
}

function renderHtml(s: HServer): string {
  const nonce = generateNonce();
  const ipv4 = s.public_net.ipv4?.ip ?? '—';
  const ipv6 = s.public_net.ipv6?.ip ?? '—';
  const image = s.image ? (s.image.name ?? s.image.description) : '—';
  const created = new Date(s.created).toLocaleString();
  const labelEntries = Object.entries(s.labels);
  const isOn = s.status === 'running';
  const isOff = s.status === 'off';
  const color = statusColor(s.status);

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 24px 28px;
    max-width: 760px;
  }
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 600; flex: 1; }
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;
    background: color-mix(in srgb, ${color} 13%, transparent); color: ${color}; border: 1px solid color-mix(in srgb, ${color} 40%, transparent);
  }
  .badge::before {
    content: ''; display: inline-block; width: 7px; height: 7px;
    border-radius: 50%; background: ${color};
  }
  .btn-icon {
    cursor: pointer; background: none; border: 1px solid var(--vscode-button-border, transparent);
    color: var(--vscode-foreground); padding: 5px 8px; border-radius: 4px;
    font-size: 13px; opacity: 0.7;
  }
  .btn-icon:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
  .section { margin-bottom: 22px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .06em; color: var(--vscode-descriptionForeground);
    margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5px 0; vertical-align: top; }
  td.lbl { color: var(--vscode-descriptionForeground); width: 130px; font-size: 12px; }
  td.val { font-size: 13px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 22px; }
  .btn {
    cursor: pointer; padding: 6px 14px; border-radius: 4px; font-size: 13px;
    border: 1px solid transparent; font-family: inherit;
  }
  .btn-primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
  .btn-secondary { background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground); }
  .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .btn-danger {
    background: color-mix(in srgb, var(--vscode-errorForeground) 12%, transparent);
    color: var(--vscode-errorForeground);
    border: 1px solid color-mix(in srgb, var(--vscode-errorForeground) 35%, transparent);
  }
  .btn-danger:hover { background: color-mix(in srgb, var(--vscode-errorForeground) 22%, transparent); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .code {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px; background: var(--vscode-textCodeBlock-background);
    padding: 8px 12px; border-radius: 4px; display: flex;
    align-items: center; gap: 8px; justify-content: space-between;
  }
  .copy-btn { cursor: pointer; background: none; border: none; color: var(--vscode-foreground);
    font-size: 11px; opacity: 0.6; padding: 2px 6px; }
  .copy-btn:hover { opacity: 1; }
  .label-chip {
    display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px;
    background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
    margin: 2px 4px 2px 0;
  }
  #loadingBar {
    display: none; font-size: 12px; color: var(--vscode-descriptionForeground);
    margin-bottom: 12px;
  }
</style>
</head>
<body>
<div class="header">
  <h1>${escHtml(s.name)}</h1>
  <span class="badge">${statusLabel(s.status)}</span>
  <button class="btn-icon" id="refreshBtn" title="Refresh (30 sec limit)">↺ Refresh</button>
</div>

<div id="loadingBar">⏳ Working…</div>

<div class="actions">
  <button class="btn btn-primary" id="startBtn"   ${isOn  ? 'disabled' : ''}>▶ Start</button>
  <button class="btn btn-secondary" id="stopBtn"  ${isOff ? 'disabled' : ''}>■ Stop</button>
  <button class="btn btn-secondary" id="rebootBtn"${isOff ? 'disabled' : ''}>↺ Reboot</button>
  <button class="btn btn-danger" id="deleteBtn">✕ Delete</button>
</div>

<div class="section">
  <div class="section-title">Network</div>
  <table>
    ${row('IPv4', ipv4)}
    ${row('IPv6', ipv6)}
  </table>
</div>

<div class="section">
  <div class="section-title">Specification</div>
  <table>
    ${row('Server type', s.server_type.name)}
    ${row('CPU cores',   String(s.server_type.cores))}
    ${row('RAM',         `${s.server_type.memory} GB`)}
    ${row('Disk',        `${s.server_type.disk} GB`)}
  </table>
</div>

<div class="section">
  <div class="section-title">Location</div>
  <table>
    ${row('Datacenter', s.datacenter.name)}
    ${row('Location',   `${s.datacenter.location.city} (${s.datacenter.location.name})`)}
  </table>
</div>

<div class="section">
  <div class="section-title">System</div>
  <table>
    ${row('OS image', image)}
    ${row('Server ID', String(s.id))}
    ${row('Created',   created)}
  </table>
</div>

${labelEntries.length > 0 ? `
<div class="section">
  <div class="section-title">Labels</div>
  <div>${labelEntries.map(([k, v]) => `<span class="label-chip">${escHtml(k)}=${escHtml(v)}</span>`).join('')}</div>
</div>` : ''}

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
function send(cmd) { vscode.postMessage({ command: cmd }); }
function copyText(t) {
  navigator.clipboard.writeText(t).catch(() => {});
}
window.addEventListener('message', e => {
  if (e.data.command === 'setLoading') {
    document.getElementById('loadingBar').style.display = 'block';
    document.querySelectorAll('.btn').forEach(b => b.disabled = true);
  }
  if (e.data.command === 'clearLoading') {
    document.getElementById('loadingBar').style.display = 'none';
    document.querySelectorAll('.btn').forEach(b => b.disabled = false);
  }
});

// Wire button event listeners (CSP-compliant)
document.addEventListener('DOMContentLoaded', () => {
  const btns = {
    startBtn: 'start',
    stopBtn: 'stop',
    rebootBtn: 'reboot',
    deleteBtn: 'delete'
  };
  Object.entries(btns).forEach(([id, cmd]) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => vscode.postMessage({ command: cmd }));
  });
  
  // Wire refresh button with 30-second rate limit
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      const now = Date.now();
      const lastRefresh = window.__lastRefreshTime || 0;
      if (now - lastRefresh < 30000) {
        // Still within rate limit, ignore
        return;
      }
      window.__lastRefreshTime = now;
      refreshBtn.disabled = true;
      refreshBtn.title = 'Refresh (30 sec rate limit)';
      vscode.postMessage({ command: 'refresh' });
      // Re-enable after 30 seconds
      setTimeout(() => {
        refreshBtn.disabled = false;
        refreshBtn.title = 'Refresh (30 sec limit)';
      }, 30000);
    });
  }
});
</script>
</body>
</html>`;
}
