import * as vscode from 'vscode';
import { TokenManager } from '../utils/secretStorage';
import { HetznerClient } from '../api/hetzner';
import { SetupProvider } from '../providers/setupProvider';
import { ProjectsProvider } from '../providers/projectsProvider';
import { ProjectItem } from '../providers/projectsProvider';
import { ServersProvider } from '../providers/serversProvider';
import { NetworksProvider } from '../providers/networksProvider';
import { ImagesProvider } from '../providers/imagesProvider';
import { SshKeysProvider } from '../providers/sshKeysProvider';

export function registerTokenCommands(
  context: vscode.ExtensionContext,
  tokenManager: TokenManager,
  refreshStatusBar: () => Promise<void>,
  setupProvider: SetupProvider,
  projectsProvider: ProjectsProvider,
  serversProvider: ServersProvider,
  networksProvider: NetworksProvider,
  imagesProvider: ImagesProvider,
  sshKeysProvider: SshKeysProvider
) {
  const refreshAll = () => {
    setupProvider.refresh();
    projectsProvider.refresh();
    serversProvider.refresh();
    networksProvider.refresh();
    imagesProvider.refresh();
    sshKeysProvider.refresh();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.addToken', async () => {
      const name = await vscode.window.showInputBox({
        title: 'Project Name',
        prompt: 'Enter a name for this Hetzner project',
        placeHolder: 'e.g. production, staging',
        validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
      });
      if (!name) return;

      const token = await vscode.window.showInputBox({
        title: 'Hetzner API Token',
        prompt: 'Paste your Hetzner Cloud API token',
        password: true,
        validateInput: (v) => (!v?.trim() ? 'Token cannot be empty' : undefined),
      });
      if (!token) return;

      // Validate the token against the API
      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'Validating token...' },
          async () => {
            const client = new HetznerClient(token.trim());
            await client.getServers();
          }
        );
      } catch {
        const proceed = await vscode.window.showWarningMessage(
          'Could not validate token. Save anyway?',
          'Save',
          'Cancel'
        );
        if (proceed !== 'Save') return;
      }

      await tokenManager.saveProject(name.trim(), token.trim());
      await tokenManager.setActiveProject(name.trim());
      await refreshStatusBar();
      refreshAll();
      vscode.window.showInformationMessage(`Project "${name}" added and activated.`);

      // First-use: prompt SSH key guide if this is the first project
      const allProjects = await tokenManager.listProjects();
      if (allProjects.length === 1) {
        const choice = await vscode.window.showInformationMessage(
          'Project added! Do you have an SSH key pair set up? SSH keys are recommended for secure server access.',
          'Open SSH Key Guide',
          'Skip'
        );
        if (choice === 'Open SSH Key Guide') {
          vscode.commands.executeCommand('hetznet.sshKeyGuide');
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.removeToken', async () => {
      const projects = await tokenManager.listProjects();
      if (projects.length === 0) {
        vscode.window.showInformationMessage('No projects configured.');
        return;
      }

      const picked = await vscode.window.showQuickPick(projects, {
        title: 'Remove Project',
        placeHolder: 'Select project to remove',
      });
      if (!picked) return;

      const confirm = await vscode.window.showWarningMessage(
        `Remove project "${picked}"?`,
        { modal: true },
        'Remove'
      );
      if (confirm !== 'Remove') return;

      await tokenManager.deleteProject(picked);
      await refreshStatusBar();
      refreshAll();
      vscode.window.showInformationMessage(`Project "${picked}" removed.`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.switchToken', async () => {
      const projects = await tokenManager.listProjects();
      if (projects.length === 0) {
        const add = await vscode.window.showInformationMessage(
          'No projects configured. Add one now?',
          'Add Token'
        );
        if (add) vscode.commands.executeCommand('hetznet.addToken');
        return;
      }

      const active = await tokenManager.getActiveProjectName();
      const items = projects.map((p) => ({
        label: p,
        description: p === active ? '$(check) active' : '',
      }));

      const picked = await vscode.window.showQuickPick(items, {
        title: 'Switch Project',
        placeHolder: 'Select active Hetzner project',
      });
      if (!picked) return;

      await tokenManager.setActiveProject(picked.label);
      await refreshStatusBar();
      refreshAll();
      vscode.window.showInformationMessage(`Switched to project "${picked.label}".`);
    })
  );

  // Activate project directly from the Projects tree view
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.activateProject', async (item: ProjectItem | undefined) => {
      let projectName: string | undefined;

      if (item instanceof ProjectItem) {
        projectName = item.projectName;
      } else {
        // Invoked from command palette — show picker
        const projects = await tokenManager.listProjects();
        if (projects.length === 0) {
          vscode.window.showInformationMessage('No projects configured.');
          return;
        }
        const active = await tokenManager.getActiveProjectName();
        const picked = await vscode.window.showQuickPick(
          projects.map((p) => ({ label: p, description: p === active ? '$(check) active' : '' })),
          { title: 'Activate Project', placeHolder: 'Select project to activate' }
        );
        if (!picked) return;
        projectName = picked.label;
      }

      await tokenManager.setActiveProject(projectName);
      await refreshStatusBar();
      refreshAll();
      vscode.window.showInformationMessage(`Project "${projectName}" is now active.`);
    })
  );

  // Remove project from context menu
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.removeProject', async (item: ProjectItem | undefined) => {
      let projectName: string | undefined;

      if (item instanceof ProjectItem) {
        projectName = item.projectName;
      } else {
        const projects = await tokenManager.listProjects();
        if (projects.length === 0) {
          vscode.window.showInformationMessage('No projects configured.');
          return;
        }
        const picked = await vscode.window.showQuickPick(projects, {
          title: 'Remove Project',
          placeHolder: 'Select project to remove',
        });
        if (!picked) return;
        projectName = picked;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Remove project "${projectName}"? This deletes the stored API token.`,
        { modal: true },
        'Remove'
      );
      if (confirm !== 'Remove') return;

      await tokenManager.deleteProject(projectName);
      await refreshStatusBar();
      refreshAll();
      vscode.window.showInformationMessage(`Project "${projectName}" removed.`);
    })
  );

  // Refresh projects tree
  context.subscriptions.push(
    vscode.commands.registerCommand('hetznet.refreshProjects', () => {
      projectsProvider.refresh();
      setupProvider.refresh();
    })
  );
}
