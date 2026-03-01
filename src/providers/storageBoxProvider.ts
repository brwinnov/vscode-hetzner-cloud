import * as vscode from 'vscode';
import { HStorageBox } from '../api/robot';
import { RobotCredentialManager } from '../utils/secretStorage';

export class StorageBoxItem extends vscode.TreeItem {
  constructor(public readonly box: HStorageBox) {
    super(box.name, vscode.TreeItemCollapsibleState.None);

    this.description = `${box.disk} GB · ${box.login}`;
    this.tooltip = new vscode.MarkdownString(
      [
        `**${box.name}**`,
        `Login: \`${box.login}\``,
        `Hostname: \`${box.server}\``,
        `Disk: ${box.disk} GB`,
        `Status: ${box.status}`,
        `Protocols: SSH ${box.ssh ? '✓' : '✗'} · Samba ${box.samba ? '✓' : '✗'} · WebDAV ${box.webdav ? '✓' : '✗'}`,
        `Paid until: ${box.paid_until}`,
      ].join('\n\n')
    );
    this.tooltip.isTrusted = true;

    this.iconPath = new vscode.ThemeIcon('database');
    this.contextValue = 'storagebox';
  }
}

export class StorageBoxProvider implements vscode.TreeDataProvider<StorageBoxItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<StorageBoxItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly credentialManager: RobotCredentialManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: StorageBoxItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<StorageBoxItem[]> {
    const creds = await this.credentialManager.getCredentials();
    if (!creds) {
      const item = new vscode.TreeItem('Set Robot API credentials to list Storage Boxes');
      item.command = { command: 'hcloud.setRobotCredentials', title: 'Set Robot Credentials' };
      return [item as StorageBoxItem];
    }

    const client = await this.credentialManager.getClient();
    if (!client) return [];

    try {
      const boxes = await client.getStorageBoxes();
      if (boxes.length === 0) {
        return [new vscode.TreeItem('No Storage Boxes on this account') as StorageBoxItem];
      }
      return boxes.map((b) => new StorageBoxItem(b));
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Failed to load Storage Boxes: ${(err as Error).message}`);
      return [];
    }
  }
}
