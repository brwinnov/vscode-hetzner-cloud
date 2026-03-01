import * as vscode from 'vscode';
import { TokenManager } from '../utils/secretStorage';

type SetupItem = vscode.TreeItem & { itemType: string };

export class SetupProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const projects = await this.tokenManager.listProjects();
    const hasProject = projects.length > 0;
    const items: vscode.TreeItem[] = [];

    // Task 1: Add API Key
    const addToken = new vscode.TreeItem('Add Hetzner Project API Key');
    addToken.iconPath = hasProject
      ? new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'))
      : new vscode.ThemeIcon('key', new vscode.ThemeColor('charts.yellow'));
    addToken.description = hasProject ? `${projects.length} project${projects.length > 1 ? 's' : ''} configured` : 'Required — click to add';
    addToken.tooltip = hasProject
      ? 'API token configured. Click to add another project.'
      : 'No API token yet. Click to add your Hetzner Cloud API token.';
    addToken.command = { command: 'hetznet.addToken', title: 'Add API Token' };
    addToken.contextValue = 'setup-addtoken';
    items.push(addToken);

    // Task 2: SSH Key (shows as pending if no project yet, advisory if project exists)
    const sshKey = new vscode.TreeItem('SSH Key Pair Setup');
    sshKey.iconPath = new vscode.ThemeIcon(
      hasProject ? 'info' : 'warning',
      new vscode.ThemeColor(hasProject ? 'charts.blue' : 'charts.orange')
    );
    sshKey.description = 'Recommended for secure access';
    sshKey.tooltip = 'Open SSH key generation guide for Windows, macOS, WSL and Linux';
    sshKey.command = { command: 'hetznet.sshKeyGuide', title: 'SSH Key Guide' };
    sshKey.contextValue = 'setup-sshguide';
    items.push(sshKey);

    // Task 3: Tailscale Key (optional but shown as advisory)
    const tailscale = new vscode.TreeItem('Tailscale Auth Key');
    tailscale.iconPath = new vscode.ThemeIcon('lock', new vscode.ThemeColor('charts.purple'));
    tailscale.description = 'Optional — auto-install on every server';
    tailscale.tooltip = 'Set a Tailscale auth key to auto-provision servers into your Tailnet';
    tailscale.command = { command: 'hetznet.setTailscaleKey', title: 'Set Tailscale Key' };
    tailscale.contextValue = 'setup-tailscale';
    items.push(tailscale);

    return items;
  }
}
