import * as vscode from 'vscode';
import { HImage } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';

export class ImageItem extends vscode.TreeItem {
  constructor(public readonly image: HImage) {
    const label = image.name ?? image.description;
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = `${image.os_flavor} ${image.os_version ?? ''} · ${image.type}`;
    this.tooltip = `${image.description}\nType: ${image.type}\nCreated: ${new Date(image.created).toLocaleDateString()}`;
    this.iconPath = new vscode.ThemeIcon(
      image.type === 'snapshot' ? 'layers' : image.type === 'backup' ? 'history' : 'package'
    );
    this.contextValue = `image-${image.type}`;
  }
}

export class ImagesProvider implements vscode.TreeDataProvider<ImageItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ImageItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ImageItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ImageItem[]> {
    const client = await this.tokenManager.getActiveClient();
    if (!client) return [];

    try {
      const [system, snapshots, backups] = await Promise.all([
        client.getImages('system'),
        client.getImages('snapshot'),
        client.getImages('backup'),
      ]);
      return [...system, ...snapshots, ...backups].map((i) => new ImageItem(i));
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Failed to load images: ${(err as Error).message}`);
      return [];
    }
  }
}
