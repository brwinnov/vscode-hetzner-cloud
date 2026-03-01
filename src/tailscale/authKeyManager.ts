import * as vscode from 'vscode';

const TAILSCALE_SECRET_KEY = 'hcloud.tailscale.authkey';

export class TailscaleAuthKeyManager {
  private secrets: vscode.SecretStorage;

  constructor(secrets: vscode.SecretStorage) {
    this.secrets = secrets;
  }

  async getAuthKey(): Promise<string | undefined> {
    return await this.secrets.get(TAILSCALE_SECRET_KEY);
  }

  async saveAuthKey(key: string): Promise<void> {
    await this.secrets.store(TAILSCALE_SECRET_KEY, key);
  }

  async deleteAuthKey(): Promise<void> {
    await this.secrets.delete(TAILSCALE_SECRET_KEY);
  }

  async promptAndSave(): Promise<string | undefined> {
    const key = await vscode.window.showInputBox({
      title: 'Tailscale Auth Key',
      prompt: 'Enter your Tailscale auth key (tskey-auth-...)',
      password: true,
      placeHolder: 'tskey-auth-xxxxxxxxxxxxxxxx',
      validateInput: (v) => {
        if (!v || v.trim().length === 0) return 'Auth key cannot be empty';
        if (!v.startsWith('tskey-')) return 'Key should start with tskey-';
        return undefined;
      },
    });

    if (key) {
      await this.saveAuthKey(key.trim());
      vscode.window.showInformationMessage('Tailscale auth key saved securely.');
    }
    return key;
  }
}
