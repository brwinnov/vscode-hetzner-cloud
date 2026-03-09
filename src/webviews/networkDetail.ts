import * as vscode from 'vscode';
import { HNetwork } from '../api/hetzner';

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
    // TODO: Add message handler for add/remove subnet actions
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
    const subnetCards = network.subnets.map(s => `
      <div class="subnet-card">
        <div><b>Range:</b> ${s.ip_range}</div>
        <div><b>Zone:</b> ${s.network_zone}</div>
        <div><b>Type:</b> ${s.type}</div>
        <button data-action="addSubnet">+ Add Subnet</button>
        <button data-action="deleteSubnet">🗑️ Remove</button>
      </div>
    `).join('');
    return `
      <html>
      <head>
        <style>
          .header { font-size: 1.3em; margin-bottom: 8px; }
          .subnet-card { border: 1px solid #ccc; padding: 8px; margin-bottom: 8px; border-radius: 4px; }
          .section { margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="header">${network.name} <span style="color:#888">(${network.ip_range})</span></div>
        <div class="section">
          <b>Created:</b> ${new Date(network.created).toLocaleString()}<br>
          <b>Network ID:</b> ${network.id}
        </div>
        <div class="section">
          <b>Subnets:</b>
          ${subnetCards || '<i>No subnets defined.</i>'}
        </div>
        <div class="section">
          <b>Attached Servers:</b> ${network.servers.length}
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
    vscode.commands.registerCommand('hcloud.showNetworkDetail', async (item: any) => {
      const network = item.network || item;
      NetworkDetailPanel.open(network);
    })
  );
}
