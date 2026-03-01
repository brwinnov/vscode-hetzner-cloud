import * as vscode from 'vscode';
import { TokenManager } from '../utils/secretStorage';
import { HetznerClient } from '../api/hetzner';
import { ServersProvider } from '../providers/serversProvider';
import { NetworksProvider } from '../providers/networksProvider';
import { ImagesProvider } from '../providers/imagesProvider';
import { SshKeysProvider } from '../providers/sshKeysProvider';

export function registerTokenCommands(
  context: vscode.ExtensionContext,
  tokenManager: TokenManager,
  refreshStatusBar: () => Promise<void>,
  serversProvider: ServersProvider,
  networksProvider: NetworksProvider,
  imagesProvider: ImagesProvider,
  sshKeysProvider: SshKeysProvider
) {
  const refreshAll = () => {
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
}
