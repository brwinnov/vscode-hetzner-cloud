import * as vscode from 'vscode';
import { HSshKey } from '../api/hetzner';
import { TokenManager } from '../utils/secretStorage';

export class SshKeyItem extends vscode.TreeItem {
  constructor(public readonly key: HSshKey) {
    super(key.name, vscode.TreeItemCollapsibleState.None);
    this.description = key.fingerprint;
    this.tooltip = `Name: ${key.name}\nFingerprint: ${key.fingerprint}\nCreated: ${new Date(key.created).toLocaleDateString()}`;
    this.iconPath = new vscode.ThemeIcon('key');
    this.contextValue = 'sshkey';
  }
}

export class SshKeysProvider implements vscode.TreeDataProvider<SshKeyItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SshKeyItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SshKeyItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<SshKeyItem[]> {
    const client = await this.tokenManager.getActiveClient();
    if (!client) return [];

    try {
      const keys = await client.getSshKeys();
      return keys.map((k) => new SshKeyItem(k));
    } catch (err: unknown) {
      vscode.window.showErrorMessage(`Failed to load SSH keys: ${(err as Error).message}`);
      return [];
    }
  }
}
