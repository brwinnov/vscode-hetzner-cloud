import * as vscode from 'vscode';
import { HNetwork } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';

export class NetworkItem extends vscode.TreeItem {
  constructor(public readonly network: HNetwork) {
    super(network.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.description = network.ip_range;
    this.tooltip = `Network: ${network.name}\nRange: ${network.ip_range}\nServers: ${network.servers.length}`;
    this.iconPath = new vscode.ThemeIcon('cloud');
    this.contextValue = 'network';
  }
}

export class SubnetItem extends vscode.TreeItem {
  constructor(subnet: { type: string; ip_range: string; network_zone: string }) {
    super(subnet.ip_range, vscode.TreeItemCollapsibleState.None);
    this.description = `${subnet.network_zone} · ${subnet.type}`;
    this.iconPath = new vscode.ThemeIcon('symbol-namespace');
    this.contextValue = 'subnet';
  }
}

export class NetworksProvider implements vscode.TreeDataProvider<NetworkItem | SubnetItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<NetworkItem | SubnetItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: NetworkItem | SubnetItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: NetworkItem): Promise<(NetworkItem | SubnetItem)[]> {
    if (element) {
      return element.network.subnets.map((s) => new SubnetItem(s));
    }

    const client = await this.tokenManager.getActiveClient();
    if (!client) return [];

    try {
      const networks = await client.getNetworks();
      return networks.map((n) => new NetworkItem(n));
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Failed to load networks: ${(err as Error).message}`);
      return [];
    }
  }
}
