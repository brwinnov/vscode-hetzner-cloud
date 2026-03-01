import * as vscode from 'vscode';
import { HServer } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';

export class ServerItem extends vscode.TreeItem {
  constructor(public readonly server: HServer) {
    super(server.name, vscode.TreeItemCollapsibleState.None);

    const ip = server.public_net.ipv4?.ip ?? server.public_net.ipv6?.ip ?? 'no ip';
    this.description = `${ip} · ${server.server_type.name} · ${server.datacenter.location.name}`;
    this.tooltip = new vscode.MarkdownString(
      `**${server.name}**\n\nIP: \`${ip}\`\nType: ${server.server_type.name}\nCores: ${server.server_type.cores} | RAM: ${server.server_type.memory}GB\nLocation: ${server.datacenter.location.city}\nCreated: ${new Date(server.created).toLocaleDateString()}`
    );

    this.iconPath = new vscode.ThemeIcon(
      server.status === 'running' ? 'vm-running' : 'vm',
      server.status === 'running'
        ? new vscode.ThemeColor('charts.green')
        : new vscode.ThemeColor('charts.red')
    );

    this.contextValue = server.status === 'running' ? 'server-on' : 'server-off';
  }
}

export class ServersProvider implements vscode.TreeDataProvider<ServerItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ServerItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ServerItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ServerItem[]> {
    const client = await this.tokenManager.getActiveClient();
    if (!client) {
      return [this.noTokenItem()];
    }

    try {
      const servers = await client.getServers();
      if (servers.length === 0) {
        return [new vscode.TreeItem('No servers found') as ServerItem];
      }
      return servers.map((s) => new ServerItem(s));
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Failed to load servers: ${(err as Error).message}`);
      return [];
    }
  }

  private noTokenItem(): ServerItem {
    const item = new vscode.TreeItem('Add a Hetzner API token to get started');
    item.command = { command: 'hcloud.addToken', title: 'Add Token' };
    return item as ServerItem;
  }
}
