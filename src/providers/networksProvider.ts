import * as vscode from 'vscode';
import { HNetwork } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';

export class NetworkItem extends vscode.TreeItem {
  constructor(public readonly network: HNetwork) {
    super(network.name, vscode.TreeItemCollapsibleState.Collapsed);
    const subnetCount = network.subnets?.length ?? 0;
    this.description = `${network.ip_range} · ${subnetCount} subnet${subnetCount === 1 ? '' : 's'}`;
    this.tooltip = `Network: ${network.name}\nRange: ${network.ip_range}\nSubnets: ${subnetCount}\nServers: ${network.servers.length}\n\nSubnets:\n${network.subnets.map(s => `- ${s.ip_range} (${s.network_zone}, ${s.type})`).join('\n')}`;
    this.iconPath = new vscode.ThemeIcon('cloud');
    this.contextValue = 'network';
    this.command = {
      command: 'hcloud.showNetworkDetail',
      arguments: [this],
      title: 'Show Network Details'
    };
  }
}

export class SubnetItem extends vscode.TreeItem {
  constructor(
    public readonly subnet: { type: string; ip_range: string; network_zone: string },
    public readonly networkId: number,
    public readonly networkName: string
  ) {
    super(subnet.ip_range, vscode.TreeItemCollapsibleState.None);
    this.description = `${subnet.network_zone} · ${subnet.type}`;
    this.tooltip = `Subnet: ${subnet.ip_range}\nZone: ${subnet.network_zone}\nType: ${subnet.type}\nNetwork: ${networkName}`;
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
      return element.network.subnets.map(
        (s) => new SubnetItem(s, element.network.id, element.network.name)
      );
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
