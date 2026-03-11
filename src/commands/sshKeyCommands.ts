import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TokenManager } from '../utils/secretStorage';
import { SshKeysProvider, SshKeyItem } from '../providers/sshKeysProvider';

export function registerSshKeyCommands(
  context: vscode.ExtensionContext,
  tokenManager: TokenManager,
  sshKeysProvider: SshKeysProvider
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.refreshSshKeys', () => sshKeysProvider.refresh())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.addSshKey', async () => {
      const client = await tokenManager.getActiveClient();
      if (!client) {
        vscode.window.showErrorMessage('No active Hetzner project.');
        return;
      }

      // Try to list local SSH public keys
      const sshDir = path.join(os.homedir(), '.ssh');
      let localKeyOptions: vscode.QuickPickItem[] = [];

      try {
        const files = fs.readdirSync(sshDir).filter((f) => f.endsWith('.pub'));
        localKeyOptions = files.map((f) => ({
          label: f,
          description: path.join(sshDir, f),
        }));
      } catch {
        // .ssh dir doesn't exist or unreadable
      }

      const manualOption: vscode.QuickPickItem = {
        label: '$(edit) Enter public key manually',
        description: 'Paste a public key',
      };

      const picked = await vscode.window.showQuickPick([manualOption, ...localKeyOptions], {
        title: 'Add SSH Key — Source',
        placeHolder: 'Select a local key file or enter manually',
      });
      if (!picked) return;

      let publicKey: string;
      if (picked.label === manualOption.label) {
        const input = await vscode.window.showInputBox({
          title: 'SSH Public Key',
          prompt: 'Paste your SSH public key',
          placeHolder: 'ssh-ed25519 AAAA...',
          validateInput: (v) => (!v?.trim() ? 'Public key cannot be empty' : undefined),
        });
        if (!input) return;
        publicKey = input.trim();
      } else {
        publicKey = fs.readFileSync(picked.description!, 'utf8').trim();
      }

      const keyName = await vscode.window.showInputBox({
        title: 'SSH Key Name',
        prompt: 'Enter a name for this SSH key in Hetzner',
        placeHolder: 'e.g. my-laptop',
        value: picked.label.replace('.pub', ''),
        validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
      });
      if (!keyName) return;

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Uploading SSH key...' },
        () => client.addSshKey(keyName.trim(), publicKey)
      );

      sshKeysProvider.refresh();
      vscode.window.showInformationMessage(`SSH key "${keyName}" added to Hetzner.`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hcloud.deleteSshKey', async (item: SshKeyItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Remove SSH key "${item.key.name}" from Hetzner?`,
        { modal: true },
        'Remove'
      );
      if (confirm !== 'Remove') return;

      const client = await tokenManager.getActiveClient();
      if (!client) return;

      try {
        await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Removing SSH key "${item.key.name}"...` },
          () => client.deleteSshKey(item.key.id)
        );
        sshKeysProvider.refresh();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Failed to remove SSH key: ${(err as Error).message}`);
      }
    })
  );
}
