import * as vscode from 'vscode';
import { HServer } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';

const TRANSIENT_STATES = new Set([
  'initializing', 'starting', 'stopping', 'rebuilding', 'migrating', 'deleting',
]);
const POLL_INTERVAL_MS = 3000;

export class ServerItem extends vscode.TreeItem {
  constructor(public readonly server: HServer) {
    super(server.name, vscode.TreeItemCollapsibleState.None);

    const ip = server.public_net.ipv4?.ip ?? server.public_net.ipv6?.ip ?? 'no ip';
    this.description = `${ip} · ${server.server_type.name} · ${server.datacenter.location.name}`;
    this.tooltip = new vscode.MarkdownString(
      `**${server.name}**\n\nIP: \`${ip}\`\nType: ${server.server_type.name}\nCores: ${server.server_type.cores} | RAM: ${server.server_type.memory}GB\nLocation: ${server.datacenter.location.city}\nCreated: ${new Date(server.created).toLocaleDateString()}`
    );

    this.iconPath = new vscode.ThemeIcon(
      TRANSIENT_STATES.has(server.status)
        ? 'sync~spin'
        : server.status === 'running' ? 'vm-running' : 'vm',
      TRANSIENT_STATES.has(server.status)
        ? new vscode.ThemeColor('charts.orange')
        : server.status === 'running'
          ? new vscode.ThemeColor('charts.green')
          : new vscode.ThemeColor('charts.red')
    );

    this.contextValue = TRANSIENT_STATES.has(server.status)
      ? 'server-transitioning'
      : server.status === 'running' ? 'server-on' : 'server-off';
    this.command = {
      command: 'hcloud.showServerDetail',
      title: 'Show Server Details',
      arguments: [this],
    };
  }
}

export class ServersProvider implements vscode.TreeDataProvider<ServerItem>, vscode.Disposable {
  private _onDidChangeTreeData = new vscode.EventEmitter<ServerItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _pollTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  dispose(): void {
    if (this._pollTimer !== undefined) {
      clearTimeout(this._pollTimer);
      this._pollTimer = undefined;
    }
    this._onDidChangeTreeData.dispose();
  }

  private _schedulePoll(): void {
    // Don't stack timers — only one pending at a time
    if (this._pollTimer !== undefined) return;
    this._pollTimer = setTimeout(() => {
      this._pollTimer = undefined;
      this.refresh();
    }, POLL_INTERVAL_MS);
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

      const hasTransient = servers.some((s) => TRANSIENT_STATES.has(s.status));
      if (hasTransient) {
        this._schedulePoll();
      } else {
        // All servers stable — cancel any pending poll
        if (this._pollTimer !== undefined) {
          clearTimeout(this._pollTimer);
          this._pollTimer = undefined;
        }
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
