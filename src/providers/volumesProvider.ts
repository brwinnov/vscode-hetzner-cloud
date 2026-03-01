import * as vscode from 'vscode';
import { HVolume } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';

export class VolumeItem extends vscode.TreeItem {
  constructor(public readonly volume: HVolume) {
    super(volume.name, vscode.TreeItemCollapsibleState.None);

    const attached = volume.server !== null;
    this.description = `${volume.size} GB · ${volume.location.name}${attached ? ' · attached' : ' · detached'}`;
    this.tooltip = new vscode.MarkdownString(
      [
        `**${volume.name}**`,
        `Size: ${volume.size} GB`,
        `Status: ${volume.status}`,
        `Format: ${volume.format ?? 'none'}`,
        `Location: ${volume.location.city} (${volume.location.name})`,
        `Device: \`${volume.linux_device}\``,
        attached ? `Attached to server: \`${volume.server}\`` : 'Detached',
        `Created: ${new Date(volume.created).toLocaleDateString()}`,
      ].join('\n\n')
    );
    this.tooltip.isTrusted = true;

    this.iconPath = new vscode.ThemeIcon(
      attached ? 'database' : 'circle-outline',
      attached
        ? new vscode.ThemeColor('charts.green')
        : new vscode.ThemeColor('charts.yellow')
    );

    this.contextValue = attached ? 'volume-attached' : 'volume-detached';
  }
}

export class VolumesProvider implements vscode.TreeDataProvider<VolumeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<VolumeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: VolumeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<VolumeItem[]> {
    const client = await this.tokenManager.getActiveClient();
    if (!client) return [];

    try {
      const volumes = await client.getVolumes();
      if (volumes.length === 0) {
        return [new vscode.TreeItem('No volumes yet') as VolumeItem];
      }
      return volumes.map((v) => new VolumeItem(v));
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Failed to load volumes: ${(err as Error).message}`);
      return [];
    }
  }
}
