import * as vscode from 'vscode';
import { HNetwork } from '../api/hetzner';

function escHtml(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class NetworkDetailPanel {
  private static openPanels: Map<number, NetworkDetailPanel> = new Map();
  private readonly panel: vscode.WebviewPanel;
  private readonly network: HNetwork;

  private constructor(network: HNetwork) {
    this.network = network;
    this.panel = vscode.window.createWebviewPanel(
      'networkDetail',
      `Network: ${network.name}`,
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: false }
    );
    this.panel.webview.html = this.renderHtml(network);
    this.panel.onDidDispose(() => {
      NetworkDetailPanel.openPanels.delete(network.id);
    });
    this.panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === 'deleteSubnet' && msg.ipRange) {
        try {
          await vscode.commands.executeCommand('hcloud.deleteSubnet', {
            subnet: { ip_range: msg.ipRange, network_zone: '', type: '' },
            networkId: network.id,
            networkName: network.name
          });
          vscode.window.showInformationMessage(`Subnet ${msg.ipRange} removed from network "${network.name}".`);
          this.panel.dispose();
        } catch (err: unknown) {
          vscode.window.showErrorMessage(`Failed to remove subnet: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (msg.command === 'deleteNetwork') {
        const confirm = await vscode.window.showWarningMessage(
          `Delete network "${network.name}" and all its subnets? This action cannot be undone.`,
          { modal: true },
          'Delete'
        );
        if (confirm !== 'Delete') return;
        try {
          // Delete all subnets first
          if (network.subnets && network.subnets.length > 0) {
            for (const s of network.subnets) {
              await vscode.commands.executeCommand('hcloud.deleteSubnet', {
                subnet: { ip_range: s.ip_range, network_zone: s.network_zone, type: s.type },
                networkId: network.id,
                networkName: network.name
              });
            }
          }
          // Then delete the network
          await vscode.commands.executeCommand('hcloud.deleteNetwork', { network: network });
          vscode.window.showInformationMessage(`Network "${network.name}" and all subnets deleted.`);
          this.panel.dispose();
        } catch (err: unknown) {
          vscode.window.showErrorMessage(`Failed to delete network or subnets: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (msg.command === 'addSubnet') {
        await vscode.commands.executeCommand('hcloud.addSubnet', { network: network });
      }
    });
  }

  static open(network: HNetwork) {
    if (NetworkDetailPanel.openPanels.has(network.id)) {
      NetworkDetailPanel.openPanels.get(network.id)!.panel.reveal();
      return;
    }
    const detail = new NetworkDetailPanel(network);
    NetworkDetailPanel.openPanels.set(network.id, detail);
  }

  private renderHtml(network: HNetwork): string {
    const nonce = [...Array(32)].map(() => Math.random().toString(36)[2] ?? '0').join('');
    const subnetCards = network.subnets.map(s => `
      <div class="subnet-card">
        <div><b>Range:</b> ${escHtml(s.ip_range)}</div>
        <div><b>Zone:</b> ${escHtml(s.network_zone)}</div>
        <div><b>Type:</b> ${escHtml(s.type)}</div>
        <button data-action="deleteSubnet" data-ip-range="${escHtml(s.ip_range)}">🗑️ Remove</button>
      </div>
    `).join('');
    return `
      <html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <style>
          .header { font-size: 1.3em; margin-bottom: 8px; }
          .subnet-card { border: 1px solid #ccc; padding: 8px; margin-bottom: 8px; border-radius: 4px; }
          .section { margin-bottom: 16px; }
        </style>
        <script nonce="${nonce}">
          const vscode = window.acquireVsCodeApi();
          window.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('button[data-action="deleteSubnet"]').forEach(btn => {
              btn.addEventListener('click', () => {
                const ipRange = btn.getAttribute('data-ip-range');
                vscode.postMessage({ command: 'deleteSubnet', ipRange });
              });
            });
            document.querySelector('button[data-action="addSubnet"]')?.addEventListener('click', () => {
              vscode.postMessage({ command: 'addSubnet' });
            });
            document.querySelector('button[data-action="deleteNetwork"]')?.addEventListener('click', () => {
              vscode.postMessage({ command: 'deleteNetwork' });
            });
          });
        </script>
      </head>
      <body>
        <div class="header">${escHtml(network.name)} <span style="color:#888">(${escHtml(network.ip_range)})</span></div>
        <div class="section">
          <b>Created:</b> ${escHtml(new Date(network.created).toLocaleString())}<br>
          <b>Network ID:</b> ${escHtml(network.id)}
        </div>
        <div class="section">
          <b>Subnets:</b>
          ${subnetCards || '<i>No subnets defined.</i>'}
        </div>
        <div class="section">
          <b>Attached Servers:</b> ${escHtml(network.servers.length)}
        </div>
        <div class="section">
          <button data-action="addSubnet">+ Add Subnet</button>
          <button data-action="deleteNetwork">🗑️ Delete Network</button>
        </div>
      </body>
      </html>
    `;
  }
}

// Command registration helper
export function registerNetworkDetailCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.showNetworkDetail', async (item: HNetwork | { network: HNetwork } | undefined) => {
      if (!item) {
        return;
      }
      const network = 'network' in item ? item.network : item;
      NetworkDetailPanel.open(network);
    })
  );
}
