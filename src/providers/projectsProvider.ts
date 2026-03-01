import * as vscode from 'vscode';
import { TokenManager } from '../utils/secretStorage';

export class ProjectItem extends vscode.TreeItem {
  constructor(
    public readonly projectName: string,
    public readonly isActive: boolean
  ) {
    super(projectName, vscode.TreeItemCollapsibleState.None);

    this.description = isActive ? 'active' : '';
    this.tooltip = isActive
      ? `${projectName} — currently active project`
      : `${projectName} — click to activate`;

    this.iconPath = new vscode.ThemeIcon(
      isActive ? 'server-environment' : 'server',
      isActive
        ? new vscode.ThemeColor('charts.green')
        : new vscode.ThemeColor('descriptionForeground')
    );

    this.contextValue = isActive ? 'project-active' : 'project-inactive';

    // Click to activate
    if (!isActive) {
      this.command = {
        command: 'hetznet.activateProject',
        title: 'Activate Project',
        arguments: [this],
      };
    }
  }
}

export class ProjectsProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ProjectItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly tokenManager: TokenManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ProjectItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ProjectItem[]> {
    const [projects, active] = await Promise.all([
      this.tokenManager.listProjects(),
      this.tokenManager.getActiveProjectName(),
    ]);

    if (projects.length === 0) {
      const empty = new vscode.TreeItem('No projects — add an API key in Setup');
      empty.iconPath = new vscode.ThemeIcon('info');
      empty.command = { command: 'hetznet.addToken', title: 'Add API Token' };
      return [empty as ProjectItem];
    }

    // Sort so active project is first
    return [...projects]
      .sort((a, b) => {
        if (a === active) return -1;
        if (b === active) return 1;
        return a.localeCompare(b);
      })
      .map((name) => new ProjectItem(name, name === active));
  }
}
