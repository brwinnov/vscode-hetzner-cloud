import * as vscode from 'vscode';
import { TokenManager, CloudInitLibrary, RobotCredentialManager, StorageBoxPasswordManager } from '../utils/secretStorage';
import { ServersProvider } from '../providers/serversProvider';
import { TailscaleAuthKeyManager } from '../tailscale/authKeyManager';
import { injectTailscale } from '../tailscale/cloudInitInjector';
import { HetznerClient, HLocation, HServerType, HImage, HSshKey, HNetwork } from '../api/hetzner';
import { injectStorageBoxMounts } from '../utils/storageBoxInjector';
import { promptStorageBoxMounts } from '../commands/storageBoxCommands';

interface WizardData {
  locations: HLocation[];
  serverTypes: HServerType[];
  images: HImage[];
  sshKeys: HSshKey[];
  networks: HNetwork[];
  tailscaleEnabled: boolean;
  defaultRegion: string;
}

export class ServerWizardPanel {
  private panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly client: HetznerClient,
    private readonly tailscaleKeyManager: TailscaleAuthKeyManager,
    private readonly serversProvider: ServersProvider,
    private readonly library: CloudInitLibrary,
    private readonly robotCredManager: RobotCredentialManager,
    private readonly boxPwdManager: StorageBoxPasswordManager
  ) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables
    );
  }

  static async create(
    context: vscode.ExtensionContext,
    tokenManager: TokenManager,
    tailscaleKeyManager: TailscaleAuthKeyManager,
    serversProvider: ServersProvider,
    robotCredManager: RobotCredentialManager,
    boxPwdManager: StorageBoxPasswordManager
  ): Promise<void> {
    const client = await tokenManager.getActiveClient();
    if (!client) {
      vscode.window.showErrorMessage('No active Hetzner project. Add a token first.');
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'hcloud.serverWizard',
      'Create Server',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'resources')],
      }
    );

    const wizard = new ServerWizardPanel(
      panel,
      client,
      tailscaleKeyManager,
      serversProvider,
      new CloudInitLibrary(context.globalState),
      robotCredManager,
      boxPwdManager
    );
    await wizard.loadAndRender();
  }

  private async loadAndRender() {
    this.panel.webview.html = getLoadingHtml();

    try {
      const cfg = vscode.workspace.getConfiguration('hcloud');

      const [locations, serverTypes, systemImages, snapshots, sshKeys, networks] =
        await Promise.all([
          this.client.getLocations(),
          this.client.getServerTypes(),
          this.client.getImages('system'),
          this.client.getImages('snapshot'),
          this.client.getSshKeys(),
          this.client.getNetworks(),
        ]);

      const data: WizardData = {
        locations,
        serverTypes,
        images: [...systemImages, ...snapshots],
        sshKeys,
        networks,
        tailscaleEnabled: false,  // Default disabled; only enable if token exists
        defaultRegion: cfg.get<string>('defaultRegion', 'nbg1'),
      };

      this.panel.webview.html = getWizardHtml(data);
      
      // Check if Tailscale key exists and send initial state to webview
      const tsKey = await this.tailscaleKeyManager.getAuthKey();
      this.panel.webview.postMessage({ 
        command: 'tailscaleTokenExists',
        hasToken: !!tsKey
      });
    } catch (err: unknown) {
      this.panel.webview.html = getErrorHtml((err as Error).message);
    }
  }

  private async handleMessage(msg: { command: string; payload?: Record<string, unknown> }) {
    switch (msg.command) {
      case 'createServer':
        await this.handleCreateServer(msg.payload as CreateServerPayload);
        break;
      case 'cancel':
        this.panel.dispose();
        break;
      case 'setTailscaleKey':
        await this.tailscaleKeyManager.promptAndSave();
        this.panel.webview.postMessage({ command: 'tailscaleKeySet' });
        break;
      case 'addSshKey': {
        // Snapshot existing keys so we can detect what was newly added
        const existingKeys = await this.client.getSshKeys();
        const existingNames = new Set(existingKeys.map((k) => k.name));

        await vscode.commands.executeCommand('hcloud.addSshKey');

        // Re-fetch and diff — don't reload the whole wizard (that loses all state)
        const updatedKeys = await this.client.getSshKeys();
        const newKeyNames = updatedKeys
          .filter((k) => !existingNames.has(k.name))
          .map((k) => k.name);

        this.panel.webview.postMessage({
          command: 'sshKeysUpdated',
          keys: updatedKeys,
          newKeyNames,
        });
        break;
      }
      case 'createNetwork': {
        const name = await vscode.window.showInputBox({
          title: 'Create Network — Name',
          prompt: 'Enter a name for the private network',
          placeHolder: 'e.g. my-network',
          validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
        });
        if (!name) break;
        const ipRange = await vscode.window.showInputBox({
          title: 'Create Network — IP Range',
          prompt: 'CIDR notation',
          placeHolder: '10.0.0.0/8',
          value: '10.0.0.0/8',
          validateInput: (v) => (!v?.trim() || !/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(v.trim()) ? 'Must be a valid CIDR range' : undefined),
        });
        if (!ipRange) break;
        try {
          await this.client.createNetwork(name.trim(), ipRange.trim());
          const updatedNetworks = await this.client.getNetworks();
          this.panel.webview.postMessage({ command: 'networksUpdated', networks: updatedNetworks });
          vscode.window.showInformationMessage(`Network "${name}" created.`);
        } catch (err: unknown) {
          vscode.window.showErrorMessage(`Failed to create network: ${(err as Error).message}`);
        }
        break;
      }
      case 'saveCloudInitTemplate': {
        const content = (msg.payload as { content: string }).content;
        if (!content.trim()) {
          vscode.window.showWarningMessage('Cannot save an empty cloud-init template.');
          break;
        }
        const tplName = await vscode.window.showInputBox({
          title: 'Save Cloud-init Template',
          prompt: 'Enter a name for this template',
          placeHolder: 'e.g. nodejs-setup',
          validateInput: (v) => (!v?.trim() ? 'Name cannot be empty' : undefined),
        });
        if (!tplName) break;
        await this.library.saveTemplate(tplName.trim(), content);
        vscode.window.showInformationMessage(`Cloud-init template "${tplName}" saved.`);
        break;
      }
      case 'loadCloudInitTemplate': {
        const templates = await this.library.listTemplates();
        if (templates.length === 0) {
          vscode.window.showInformationMessage(
            'No saved cloud-init templates. Write a script and click \u201cSave as Template\u201d first.'
          );
          break;
        }
        const picked = await vscode.window.showQuickPick(
          templates.map((t) => ({ label: t, description: 'cloud-init template' })),
          { placeHolder: 'Select a template to load', title: 'Load Cloud-init Template' }
        );
        if (!picked) break;
        const tplContent = await this.library.loadTemplate(picked.label);
        if (tplContent !== undefined) {
          this.panel.webview.postMessage({ command: 'cloudInitTemplateLoaded', content: tplContent });
        }
        break;
      }
      case 'deleteCloudInitTemplate': {
        const allTemplates = await this.library.listTemplates();
        if (allTemplates.length === 0) {
          vscode.window.showInformationMessage('No saved cloud-init templates.');
          break;
        }
        const pickedDel = await vscode.window.showQuickPick(
          allTemplates.map((t) => ({ label: t })),
          { placeHolder: 'Select a template to delete', title: 'Delete Cloud-init Template' }
        );
        if (!pickedDel) break;
        const confirmDel = await vscode.window.showWarningMessage(
          `Delete cloud-init template "${pickedDel.label}"?`,
          { modal: true },
          'Delete'
        );
        if (confirmDel !== 'Delete') break;
        await this.library.deleteTemplate(pickedDel.label);
        vscode.window.showInformationMessage(`Template "${pickedDel.label}" deleted.`);
        break;
      }
      case 'requestStorageBoxMounts': {
        const existingCloudInit = ((msg.payload as { existingCloudInit?: string }) ?? {}).existingCloudInit ?? '';
        const mounts = await promptStorageBoxMounts(this.robotCredManager, this.boxPwdManager);
        if (!mounts || mounts.length === 0) break;
        const injected = injectStorageBoxMounts(existingCloudInit, mounts);
        this.panel.webview.postMessage({ command: 'cloudInitTemplateLoaded', content: injected });
        vscode.window.showInformationMessage(
          `Storage Box mount config injected into cloud-init (${mounts.length} box${mounts.length > 1 ? 'es' : ''}).`
        );
        break;
      }
      case 'createSubnet': {
        const payload = msg.payload as { networkId: number; ipRange: string; networkZone: string };
        const name = await vscode.window.showInputBox({
          title: 'Create Subnet',
          prompt: 'Enter the subnet CIDR range (must be within parent network)',
          placeHolder: '10.0.1.0/24',
          validateInput: (v) => {
            if (!v?.trim()) return 'Subnet CIDR cannot be empty';
            if (!/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(v.trim())) return 'Must be a valid CIDR range';
            return undefined;
          },
        });
        if (!name) break;
        
        try {
          await this.client.addSubnet(payload.networkId, name.trim(), payload.networkZone);
          const updatedNetworks = await this.client.getNetworks();
          this.panel.webview.postMessage({ command: 'networksUpdated', networks: updatedNetworks });
          vscode.window.showInformationMessage(`Subnet "${name}" created.`);
        } catch (err: unknown) {
          vscode.window.showErrorMessage(`Failed to create subnet: ${(err as Error).message}`);
        }
        break;
      }
    }
  }

  private async handleCreateServer(payload: CreateServerPayload) {
    this.panel.webview.postMessage({ command: 'setLoading', message: 'Creating server...' });

    try {
      let cloudInit = payload.cloudInit || '';

      if (payload.tailscaleEnabled) {
        const tsKey = await this.tailscaleKeyManager.getAuthKey();
        if (!tsKey) {
          this.panel.webview.postMessage({
            command: 'error',
            message: 'Tailscale is enabled but no auth key is set. Click "Set Tailscale Key" in the wizard.',
          });
          return;
        }
        cloudInit = injectTailscale(cloudInit, tsKey);
      }

      const { root_password } = await this.client.createServer({
        name: payload.name,
        server_type: payload.serverType,
        image: payload.image,
        location: payload.location,
        ssh_keys: payload.sshKeys,
        networks: payload.networks,
        user_data: cloudInit || undefined,
        start_after_create: true,
      });

      this.serversProvider.refresh();
      this.panel.dispose();

      if (root_password) {
        // Show root password in a modal — only time it's ever displayed
        const copy = await vscode.window.showInformationMessage(
          `✓ Server "${payload.name}" created!\n\nRoot password (save this now — shown only once):\n${root_password}`,
          { modal: true },
          'Copy Password'
        );
        if (copy === 'Copy Password') {
          await vscode.env.clipboard.writeText(root_password);
          vscode.window.showInformationMessage('Root password copied to clipboard.');
        }
      } else {
        vscode.window.showInformationMessage(`✓ Server "${payload.name}" created successfully!`);
      }
    } catch (err: unknown) {
      this.panel.webview.postMessage({
        command: 'error',
        message: (err as Error).message,
      });
    }
  }

  dispose() {
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

interface CreateServerPayload {
  name: string;
  location: string;
  serverType: string;
  image: string;
  sshKeys: string[];
  networks: number[];
  cloudInit: string;
  tailscaleEnabled: boolean;
}

/** Cryptographically-adequate nonce for CSP inline script allowlisting. */
function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let n = '';
  for (let i = 0; i < 32; i++) n += chars.charAt(Math.floor(Math.random() * chars.length));
  return n;
}

function getLoadingHtml(): string {
  return `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background)">
    <div style="text-align:center"><div style="font-size:24px;margin-bottom:12px">⏳</div><div>Loading Hetzner data...</div></div>
  </body></html>`;
}

function getErrorHtml(msg: string): string {
  const safe = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html><html><body style="padding:24px;font-family:var(--vscode-font-family);color:var(--vscode-errorForeground);background:var(--vscode-editor-background)">
    <h2>Failed to load wizard</h2><p>${safe}</p>
  </body></html>`;
}

function getWizardHtml(data: WizardData): string {
  const nonce = generateNonce();
  const locationsJson = JSON.stringify(data.locations);
  const serverTypesJson = JSON.stringify(data.serverTypes);
  const imagesJson = JSON.stringify(data.images);
  const sshKeysJson = JSON.stringify(data.sshKeys);
  const networksJson = JSON.stringify(data.networks);

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Create Server</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 0;
    min-height: 100vh;
  }

  /* ── Layout ── */
  .wizard {
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 100vh;
  }

  /* ── Sidebar ── */
  .sidebar {
    background: var(--vscode-sideBar-background, #252526);
    border-right: 1px solid var(--vscode-panel-border, #3c3c3c);
    padding: 24px 0;
  }

  .sidebar h2 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
    padding: 0 16px 16px;
  }

  .step-nav { list-style: none; }

  .step-nav li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: background 0.15s;
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
  }

  .step-nav li.active {
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
    border-left-color: var(--vscode-focusBorder, #007fd4);
  }

  .step-nav li.done {
    color: var(--vscode-foreground);
  }

  .step-badge {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--vscode-badge-background, #4d4d4d);
    color: var(--vscode-badge-foreground, #fff);
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-weight: 600;
  }

  .step-nav li.done .step-badge {
    background: var(--vscode-testing-iconPassed, #73c991);
    color: #000;
  }

  .step-nav li.active .step-badge {
    background: var(--vscode-focusBorder, #007fd4);
    color: #fff;
  }

  /* ── Main content ── */
  .main {
    display: flex;
    flex-direction: column;
    padding: 32px 40px;
    max-width: 860px;
  }

  .step-panel { display: none; }
  .step-panel.active { display: block; }

  h1 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .subtitle {
    color: var(--vscode-descriptionForeground);
    margin-bottom: 28px;
    font-size: 13px;
  }

  /* ── Form controls ── */
  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
  }

  input[type="text"], textarea, select {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, #3c3c3c);
    border-radius: 3px;
    padding: 6px 10px;
    font-family: inherit;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s;
  }

  input[type="text"]:focus, textarea:focus {
    border-color: var(--vscode-focusBorder, #007fd4);
  }

  .field { margin-bottom: 20px; }

  .field-hint {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 4px;
  }

  /* ── Cards grid ── */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
  }

  .cards.wide {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .card {
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    border-radius: 6px;
    padding: 12px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    user-select: none;
  }

  .card:hover {
    border-color: var(--vscode-focusBorder, #007fd4);
    background: var(--vscode-list-hoverBackground);
  }

  .card.selected {
    border-color: var(--vscode-focusBorder, #007fd4);
    background: var(--vscode-list-activeSelectionBackground);
  }

  .card-title {
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .card-desc {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
  }

  .card-badge {
    display: inline-block;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    margin-bottom: 6px;
  }

  /* ── Checkbox cards ── */
  .check-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    margin-bottom: 20px;
  }

  .check-card {
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    border-radius: 6px;
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: border-color 0.15s;
    user-select: none;
  }

  .check-card:hover { border-color: var(--vscode-focusBorder, #007fd4); }
  .check-card.selected {
    border-color: var(--vscode-focusBorder, #007fd4);
    background: var(--vscode-list-activeSelectionBackground);
  }

  .check-card input[type="checkbox"] { display: none; }

  .check-icon {
    width: 16px;
    height: 16px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
  }

  .check-card.selected .check-icon {
    background: var(--vscode-focusBorder, #007fd4);
    border-color: var(--vscode-focusBorder, #007fd4);
    color: #fff;
  }

  /* ── Toggle ── */
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .toggle-label { font-size: 13px; font-weight: 600; }
  .toggle-sub { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; }

  .toggle {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
  }

  .toggle input { opacity: 0; width: 0; height: 0; }

  .toggle-slider {
    position: absolute;
    inset: 0;
    background: var(--vscode-input-border);
    border-radius: 20px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    left: 3px;
    top: 3px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle input:checked + .toggle-slider { background: var(--vscode-focusBorder, #007fd4); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }

  /* ── Cloud-init editor ── */
  textarea.code {
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
    font-size: 12px;
    min-height: 200px;
    resize: vertical;
    white-space: pre;
    tab-size: 2;
  }

  /* ── Summary table ── */
  .summary {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 24px;
  }

  .summary-row {
    display: flex;
    align-items: flex-start;
    padding: 10px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
    font-size: 13px;
  }

  .summary-row:last-child { border-bottom: none; }
  .summary-key { width: 140px; flex-shrink: 0; color: var(--vscode-descriptionForeground); font-size: 12px; padding-top: 1px; }
  .summary-val { font-weight: 500; }

  /* ── Buttons ── */
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid var(--vscode-panel-border);
  }

  button {
    padding: 7px 18px;
    border-radius: 3px;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: opacity 0.15s;
  }

  button:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-primary {
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
  }
  .btn-primary:hover:not(:disabled) { background: var(--vscode-button-hoverBackground, #1177bb); }

  .btn-secondary {
    background: var(--vscode-button-secondaryBackground, #3a3d41);
    color: var(--vscode-button-secondaryForeground, #fff);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--vscode-button-secondaryHoverBackground, #45494e); }

  .btn-danger {
    background: var(--vscode-errorForeground, #f48771);
    color: #fff;
  }

  .ml-auto { margin-left: auto; }

  /* ── Search ── */
  .search-wrap { position: relative; margin-bottom: 12px; }
  .search-wrap input {
    padding-left: 28px;
  }
  .search-icon {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--vscode-descriptionForeground);
    pointer-events: none;
    font-size: 13px;
  }

  /* ── Error / info banner ── */
  .banner {
    padding: 10px 14px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 16px;
    display: none;
  }

  .banner.error {
    background: rgba(244,135,113,0.15);
    border: 1px solid var(--vscode-errorForeground);
    color: var(--vscode-errorForeground);
    display: block;
  }

  .banner.info {
    background: rgba(0,127,212,0.12);
    border: 1px solid var(--vscode-focusBorder);
    color: var(--vscode-foreground);
    display: block;
  }

  .banner.warning {
    background: rgba(255,180,0,0.1);
    border: 1px solid rgba(255,180,0,0.5);
    color: var(--vscode-foreground);
    display: block;
  }

  .loading-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    font-size: 14px;
    z-index: 999;
  }

  .loading-overlay.active { display: flex; }

  .spinner {
    width: 32px; height: 32px;
    border: 3px solid var(--vscode-panel-border);
    border-top-color: var(--vscode-focusBorder, #007fd4);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Filter tabs ── */
  .filter-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .filter-tab {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    cursor: pointer;
    border: 1px solid var(--vscode-panel-border);
    background: transparent;
    color: var(--vscode-foreground);
    transition: background 0.15s;
  }

  .filter-tab.active {
    background: var(--vscode-focusBorder, #007fd4);
    border-color: var(--vscode-focusBorder, #007fd4);
    color: #fff;
  }

  .network-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty-state {
    text-align: left;
    padding: 16px;
    color: var(--vscode-descriptionForeground);
    background: rgba(128,128,128,0.08);
    border-radius: 6px;
    border-left: 3px solid var(--vscode-panelBorder);
    font-size: 13px;
  }
</style>
</head>
<body>

<div class="loading-overlay" id="loadingOverlay">
  <div class="spinner"></div>
  <div id="loadingMsg">Creating server...</div>
</div>

<div class="wizard">
  <!-- Sidebar -->
  <nav class="sidebar">
    <h2>Create Server</h2>
    <ul class="step-nav" id="stepNav">
      <li class="active"><span class="step-badge" id="badge0">1</span> Basics</li>
      <li><span class="step-badge" id="badge1">2</span> Server Type</li>
      <li><span class="step-badge" id="badge2">3</span> OS Image</li>
      <li><span class="step-badge" id="badge3">4</span> SSH Keys</li>
      <li><span class="step-badge" id="badge4">5</span> Network</li>
      <li><span class="step-badge" id="badge5">6</span> Cloud-init</li>
      <li><span class="step-badge" id="badge6">7</span> Review</li>
    </ul>
  </nav>

  <!-- Main -->
  <div class="main">

    <!-- ── Step 0: Basics ── -->
    <div class="step-panel active" id="step0">
      <h1>Basics</h1>
      <p class="subtitle">Name your server and choose a datacenter location.</p>

      <div class="field">
        <label>Server Name</label>
        <input type="text" id="serverName" placeholder="e.g. web-01" autocomplete="off" />
        <div class="field-hint">Lowercase letters, numbers, and hyphens only.</div>
      </div>

      <div class="field">
        <label>Datacenter Location</label>
        <div class="cards wide" id="locationCards"></div>
      </div>

      <div class="actions">
        <button class="btn-secondary">Cancel</button>
        <button class="btn-primary ml-auto">Next →</button>
      </div>
    </div>

    <!-- ── Step 1: Server Type ── -->
    <div class="step-panel" id="step1">
      <h1>Server Type</h1>
      <p class="subtitle">Choose the CPU, RAM, and disk configuration.</p>

      <div class="filter-tabs" id="typeFilter">
        <button class="filter-tab active">All</button>
        <button class="filter-tab">Shared vCPU</button>
        <button class="filter-tab">Dedicated vCPU</button>
        <button class="filter-tab">Arm64</button>
      </div>

      <div class="cards wide" id="typeCards"></div>

      <div class="actions">
        <button class="btn-secondary">← Back</button>
        <button class="btn-primary ml-auto">Next →</button>
      </div>
    </div>

    <!-- ── Step 2: OS Image ── -->
    <div class="step-panel" id="step2">
      <h1>OS Image</h1>
      <p class="subtitle">Select a system image, snapshot, or enter a custom image.</p>

      <div class="filter-tabs" id="imageFilter">
        <button class="filter-tab active">System</button>
        <button class="filter-tab">Snapshots</button>
        <button class="filter-tab">Custom Image</button>
      </div>

      <div class="search-wrap" id="imageSearchWrap">
        <span class="search-icon">⌕</span>
        <input type="text" id="imageSearch" placeholder="Search images..." />
      </div>

      <div class="cards wide" id="imageCards"></div>

      <div id="customImagePanel" style="display:none">
        <div class="field">
          <label>Custom Image ID or Name</label>
          <input type="text" id="customImageInput" placeholder="e.g. 12345678 or my-image-name" autocomplete="off"/>
          <div class="field-hint">Enter a Hetzner image ID, snapshot ID, or ISO name not listed in the catalog.</div>
        </div>
      </div>

      <div class="actions">
        <button class="btn-secondary">← Back</button>
        <button class="btn-primary ml-auto">Next →</button>
      </div>
    </div>

    <!-- ── Step 3: SSH Keys ── -->
    <div class="step-panel" id="step3">
      <h1>SSH Keys</h1>
      <p class="subtitle">Select which SSH keys to authorize on this server. Multiple allowed.</p>

      <div id="sshKeyCards" class="check-cards"></div>
      <div id="noSshKeysMsg" class="empty-state" style="display:none">
        No SSH keys found. Proceeding without one will generate a root password shown after creation.
      </div>

      <div class="actions">
        <button class="btn-secondary">← Back</button>
        <button class="btn-secondary" data-action="add-ssh-key">+ Add SSH Key</button>
        <button class="btn-primary ml-auto">Next →</button>
      </div>
    </div>

    <!-- ── Step 4: Network ── -->
    <div class="step-panel" id="step4">
      <h1>Network</h1>
      <p class="subtitle">Each server always gets a public IPv4. Optionally attach it to one or more private networks for internal communication.</p>

      <div class="toggle-row" style="margin-bottom:16px">
        <div>
          <div class="toggle-label">🌐 Public IPv4</div>
          <div class="toggle-sub">Always enabled — every server gets a public IP</div>
        </div>
        <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:var(--vscode-testing-iconPassed,#73c991);color:#000">Always on</span>
      </div>

      <div style="background:rgba(0,100,200,0.1);padding:12px;border-radius:8px;border-left:3px solid var(--vscode-focusBorder);margin-bottom:16px;font-size:12px;line-height:1.5">
        <strong>💡 Network Best Practice:</strong><br/>
        • <strong>One network per project:</strong> Complete isolation (recommended)<br/>
        • <strong>Multiple subnets:</strong> For environments or regions within one network<br/>
        • Servers in the same network can communicate privately<br/>
        • Consider zone-specific subnets for multi-region setups
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <label style="margin:0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Private Networks (Optional)</label>
        <button class="btn-secondary" style="padding:4px 12px;font-size:12px" data-action="create-network">+ Create New Network</button>
      </div>

      <div id="networkCards" class="network-list"></div>
      <div id="noNetworksMsg" class="empty-state" style="display:none">
        <p><strong>No private networks created yet.</strong></p>
        <p>Options:</p>
        <ul style="margin:8px 0;padding-left:24px">
          <li>Create a new network now with "+ Create New Network"</li>
          <li>Continue with public IP only (no private network)</li>
          <li>Attach to a network later via the Networks tree view</li>
        </ul>
      </div>

      <div class="actions">
        <button class="btn-secondary">← Back</button>
        <button class="btn-primary ml-auto">Next →</button>
      </div>
    </div>

    <!-- ── Step 5: Cloud-init ── -->
    <div class="step-panel" id="step5">
      <h1>Cloud-init &amp; Tailscale</h1>
      <p class="subtitle">Customize startup scripts. Tailscale is injected automatically when enabled.</p>

      <div class="toggle-row">
        <div>
          <div class="toggle-label">🔒 Tailscale Auto-install</div>
          <div class="toggle-sub">Installs Tailscale and activates it on first boot</div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="tailscaleToggle" disabled title="Tailscale auth key not configured. Click 'Set Tailscale Key' to enable." />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div id="tailscaleKeyBanner" class="banner info" style="display:none">
        ⚠ No Tailscale auth key set. <a href="#" data-action="set-tailscale-key" style="color:var(--vscode-textLink-foreground);cursor:pointer">Set key now</a>
      </div>

      <div class="banner warning">
        🔒 <strong>Security notice:</strong> The Tailscale auth key is embedded as plaintext in cloud-init user-data and is readable via the Hetzner API by anyone with API access. Use a <strong>short-lived ephemeral key</strong> to minimise exposure.
      </div>

      <div class="field">
        <label>Cloud-init Script <span style="font-weight:400;text-transform:none">(optional)</span></label>
        <textarea class="code" id="cloudInitInput" placeholder="#cloud-config&#10;&#10;# Your cloud-init YAML here.&#10;# Tailscale block will be appended automatically if enabled."></textarea>
        <div class="field-hint">YAML cloud-config format. Tailscale runcmd will be merged in automatically.</div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button class="btn-secondary" style="font-size:12px;padding:4px 10px" data-action="save-cloud-init-template">&#128190; Save as Template</button>
          <button class="btn-secondary" style="font-size:12px;padding:4px 10px" data-action="load-cloud-init-template">&#128194; Load Template</button>
          <button class="btn-secondary" style="font-size:12px;padding:4px 10px" data-action="delete-cloud-init-template">&#128465; Delete Template</button>
          <button class="btn-secondary" style="font-size:12px;padding:4px 10px" data-action="request-storage-box-mounts">&#128230; Mount Storage Boxes</button>
        </div>
      </div>

      <div class="actions">
        <button class="btn-secondary">← Back</button>
        <button class="btn-primary ml-auto">Review →</button>
      </div>
    </div>

    <!-- ── Step 6: Review ── -->
    <div class="step-panel" id="step6">
      <h1>Review &amp; Create</h1>
      <p class="subtitle">Confirm your configuration before creating the server.</p>

      <div id="errorBanner" class="banner"></div>

      <div class="summary" id="summaryTable"></div>

      <div class="actions">
        <button class="btn-secondary">← Back</button>
        <button class="btn-primary ml-auto" id="createBtn">⚡ Create Server</button>
      </div>
    </div>

  </div><!-- /main -->
</div><!-- /wizard -->

<script nonce="${nonce}">
const vscode = acquireVsCodeInstance();
const LOCATIONS = ${locationsJson};
const SERVER_TYPES = ${serverTypesJson};
const IMAGES = ${imagesJson};
let SSH_KEYS = ${sshKeysJson};
let NETWORKS = ${networksJson};

// HTML-escape helper — used in all innerHTML renders
function h(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  currentStep: 0,
  completedSteps: new Set(),
  name: '',
  location: ${JSON.stringify(data.defaultRegion)},
  serverType: '',
  image: '',
  imageDisplay: '',
  customImage: '',
  useCustomImage: false,
  sshKeys: [],
  networks: [],
  cloudInit: '',
  tailscaleEnabled: ${data.tailscaleEnabled},
  imageFilter: 'system',
};

// ── Init ───────────────────────────────────────────────────────────────────
window.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg.command === 'setLoading') showLoading(msg.message);
  if (msg.command === 'error') { hideLoading(); showError(msg.message); }
  if (msg.command === 'tailscaleTokenExists') {
    const toggle = document.getElementById('tailscaleToggle');
    const banner = document.getElementById('tailscaleKeyBanner');
    if (msg.hasToken) {
      // Token exists: enable toggle, hide banner
      toggle.disabled = false;
      toggle.title = 'Enable Tailscale auto-install on this server';
      banner.style.display = 'none';
    } else {
      // No token: disable toggle, show banner with hint
      toggle.disabled = true;
      toggle.checked = false;
      toggle.title = 'Tailscale auth key not configured. Click "Set Tailscale Key" to configure.';
      banner.style.display = 'block';
    }
  }
  if (msg.command === 'tailscaleKeySet') {
    document.getElementById('tailscaleKeyBanner').style.display = 'none';
    document.getElementById('tailscaleToggle').disabled = false;
    document.getElementById('tailscaleToggle').title = 'Enable Tailscale auto-install on this server';
  }
  if (msg.command === 'sshKeysUpdated') {
    SSH_KEYS = msg.keys;
    // Auto-select any newly added keys
    msg.newKeyNames.forEach(name => {
      if (!state.sshKeys.includes(name)) state.sshKeys.push(name);
    });
    renderSshKeys();
  }
  if (msg.command === 'cloudInitTemplateLoaded') {
    document.getElementById('cloudInitInput').value = msg.content;
    state.cloudInit = msg.content;
  }
  if (msg.command === 'networksUpdated') {
    NETWORKS = msg.networks;
    renderNetworks();
  }
});

function saveCloudInitTemplate() {
  vscode.postMessage({ command: 'saveCloudInitTemplate', payload: { content: document.getElementById('cloudInitInput').value } });
}
function loadCloudInitTemplate() {
  vscode.postMessage({ command: 'loadCloudInitTemplate' });
}
function deleteCloudInitTemplate() {
  vscode.postMessage({ command: 'deleteCloudInitTemplate' });
}
function requestStorageBoxMounts() {
  vscode.postMessage({ command: 'requestStorageBoxMounts', payload: { existingCloudInit: document.getElementById('cloudInitInput').value } });
}

function acquireVsCodeInstance() {
  try { return acquireVsCodeApi(); } catch(e) { return { postMessage: console.log }; }
}

document.addEventListener('DOMContentLoaded', () => {
  renderLocations();
  renderServerTypes('all');
  renderImages();
  renderSshKeys();
  renderNetworks();
  updateTailscaleState();

  // Wire location card listeners (CSP: remove inline onclick, use addEventListener)
  const locationCardsDiv = document.getElementById('locationCards');
  if (locationCardsDiv) {
    locationCardsDiv.addEventListener('click', (e) => {
      const card = e.target.closest('.card[data-location]');
      if (!card) return;
      const location = card.dataset.location;
      state.location = location;
      document.querySelectorAll('#locationCards .card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  }

  // Wire server type card listeners
  const typeCardsDiv = document.getElementById('typeCards');
  if (typeCardsDiv) {
    typeCardsDiv.addEventListener('click', (e) => {
      const card = e.target.closest('.card[data-server-type]');
      if (!card) return;
      const serverType = card.dataset.serverType;
      state.serverType = serverType;
      document.querySelectorAll('#typeCards .card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  }

  // Wire image card listeners
  const imageCardsDiv = document.getElementById('imageCards');
  if (imageCardsDiv) {
    imageCardsDiv.addEventListener('click', (e) => {
      const card = e.target.closest('.card[data-image]');
      if (!card) return;
      const image = card.dataset.image;
      const imageDisplay = card.dataset.imageDisplay;
      state.image = image;
      state.imageDisplay = imageDisplay;
      document.querySelectorAll('#imageCards .card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  }

  // Wire server type filter tabs
  const typeFilterDiv = document.getElementById('typeFilter');
  if (typeFilterDiv) {
    typeFilterDiv.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        typeFilterDiv.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.textContent.toLowerCase().includes('shared') ? 'shared' : 
                      btn.textContent.toLowerCase().includes('dedicated') ? 'dedicated' :
                      btn.textContent.toLowerCase().includes('arm') ? 'arm' : 'all';
        renderServerTypes(filter);
        // Re-wire type card listeners after render
        document.getElementById('typeCards').addEventListener('click', (e) => {
          const card = e.target.closest('.card[data-server-type]');
          if (!card) return;
          state.serverType = card.dataset.serverType;
          document.querySelectorAll('#typeCards .card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        });
      });
    });
  }

  // Wire image filter tabs
  const imageFilterDiv = document.getElementById('imageFilter');
  if (imageFilterDiv) {
    imageFilterDiv.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.imageFilter = btn.textContent.toLowerCase().includes('snapshot') ? 'snapshot' :
                           btn.textContent.toLowerCase().includes('custom') ? 'custom' : 'system';
        imageFilterDiv.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const isCustom = state.imageFilter === 'custom';
        document.getElementById('customImagePanel').style.display = isCustom ? 'block' : 'none';
        document.getElementById('imageCards').style.display = isCustom ? 'none' : 'grid';
        document.getElementById('imageSearchWrap').style.display = isCustom ? 'none' : 'block';
        state.useCustomImage = isCustom;
        if (!isCustom) {
          renderImages();
          // Re-wire image card listeners after render
          document.getElementById('imageCards').addEventListener('click', (e) => {
            const card = e.target.closest('.card[data-image]');
            if (!card) return;
            state.image = card.dataset.image;
            state.imageDisplay = card.dataset.imageDisplay;
            document.querySelectorAll('#imageCards .card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
          });
        }
      });
    });
  }

  // Wire image search input
  const imageSearchInput = document.getElementById('imageSearch');
  if (imageSearchInput) {
    imageSearchInput.addEventListener('input', () => {
      renderImages();
      // Re-wire image card listeners after render
      document.getElementById('imageCards').addEventListener('click', (e) => {
        const card = e.target.closest('.card[data-image]');
        if (!card) return;
        state.image = card.dataset.image;
        state.imageDisplay = card.dataset.imageDisplay;
        document.querySelectorAll('#imageCards .card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });
  }

  // Wire step navigation listeners (CSP: remove inline onclick, use addEventListener)
  document.querySelectorAll('.step-nav li').forEach((li, idx) => {
    li.addEventListener('click', () => goToStep(idx));
  });

  // Wire action button listeners (NEXT, BACK, CANCEL, CREATE) — target buttons in .actions divs
  document.querySelectorAll('.actions').forEach(actionDiv => {
    actionDiv.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent.trim();
      if (text.startsWith('Next') || text.startsWith('Review')) {
        btn.addEventListener('click', () => {
          const step = Array.from(document.querySelectorAll('.step-panel')).findIndex(p => p.classList.contains('active'));
          nextStep(step);
        });
      } else if (text.startsWith('Back')) {
        btn.addEventListener('click', () => {
          const step = Array.from(document.querySelectorAll('.step-panel')).findIndex(p => p.classList.contains('active'));
          prevStep(step);
        });
      } else if (text.startsWith('Cancel')) {
        btn.addEventListener('click', cancel);
      }
    });
  });

  // Wire Create Server button by ID (special handling since button text starts with emoji)
  const createBtn = document.getElementById('createBtn');
  if (createBtn) {
    createBtn.addEventListener('click', createServer);
  }

  // Wire Tailscale toggle listener
  const tailscaleToggle = document.getElementById('tailscaleToggle');
  if (tailscaleToggle) {
    tailscaleToggle.addEventListener('change', updateTailscaleState);
  }

  // Wire SSH key card listeners (CSP: use event delegation)
  const sshKeyCardsDiv = document.getElementById('sshKeyCards');
  if (sshKeyCardsDiv) {
    sshKeyCardsDiv.addEventListener('click', (e) => {
      const card = e.target.closest('.check-card[data-key-name]');
      if (!card) return;
      const keyName = card.dataset.keyName;
      if (state.sshKeys.includes(keyName)) {
        state.sshKeys = state.sshKeys.filter(k => k !== keyName);
        card.classList.remove('selected');
        card.querySelector('.check-icon').textContent = '';
      } else {
        state.sshKeys.push(keyName);
        card.classList.add('selected');
        card.querySelector('.check-icon').textContent = '✓';
      }
    });
  }

  // Wire network card listeners (CSP: use event delegation)
  const networkCardsDiv = document.getElementById('networkCards');
  if (networkCardsDiv) {
    networkCardsDiv.addEventListener('click', (e) => {
      const card = e.target.closest('.check-card[data-network-id]');
      if (!card) return;
      const networkId = parseInt(card.dataset.networkId, 10);
      if (state.networks.includes(networkId)) {
        state.networks = state.networks.filter(n => n !== networkId);
        card.classList.remove('selected');
        card.querySelector('.check-icon').textContent = '';
      } else {
        state.networks.push(networkId);
        card.classList.add('selected');
        card.querySelector('.check-icon').textContent = '✓';
      }
    });
  }

  // Wire data-action button listeners (CSP: delegate all action buttons)
  document.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === 'add-ssh-key') {
      addSshKeyFromWizard();
    } else if (action === 'create-network') {
      createNetworkFromWizard();
    } else if (action === 'create-subnet') {
      createSubnetFromWizard(actionEl);
    } else if (action === 'set-tailscale-key') {
      setTailscaleKey();
    } else if (action === 'save-cloud-init-template') {
      saveCloudInitTemplate();
    } else if (action === 'load-cloud-init-template') {
      loadCloudInitTemplate();
    } else if (action === 'delete-cloud-init-template') {
      deleteCloudInitTemplate();
    } else if (action === 'request-storage-box-mounts') {
      requestStorageBoxMounts();
    }
  });
});

// ── Navigation ─────────────────────────────────────────────────────────────
function goToStep(idx) {
  // Only allow going back to completed steps
  if (idx >= state.currentStep && !state.completedSteps.has(idx)) return;
  showStep(idx);
}

function nextStep(from) {
  if (!validateStep(from)) return;
  state.completedSteps.add(from);
  updateBadge(from);
  if (from === 5) renderSummary();
  showStep(from + 1);
}

function prevStep(from) {
  showStep(from - 1);
}

function showStep(idx) {
  document.querySelectorAll('.step-panel').forEach((p, i) => {
    p.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.step-nav li').forEach((li, i) => {
    li.classList.toggle('active', i === idx);
  });
  state.currentStep = idx;
}

function updateBadge(idx) {
  const badge = document.getElementById('badge' + idx);
  badge.textContent = '✓';
  document.querySelectorAll('.step-nav li')[idx].classList.add('done');
}

// ── Validation ─────────────────────────────────────────────────────────────
function validateStep(step) {
  switch(step) {
    case 0:
      state.name = document.getElementById('serverName').value.trim();
      if (!state.name) { alert('Please enter a server name.'); return false; }
      if (!/^[a-z0-9-]+$/.test(state.name)) { alert('Name must be lowercase letters, numbers, and hyphens only.'); return false; }
      if (!state.location) { alert('Please select a location.'); return false; }
      return true;
    case 1:
      if (!state.serverType) { alert('Please select a server type.'); return false; }
      return true;
    case 2:
      if (state.useCustomImage) {
        state.customImage = document.getElementById('customImageInput').value.trim();
        if (!state.customImage) { alert('Please enter a custom image ID or name.'); return false; }
        state.image = state.customImage;
        state.imageDisplay = 'Custom: ' + state.customImage;
      } else {
        if (!state.image) { alert('Please select an OS image.'); return false; }
      }
      return true;
    case 5:
      state.cloudInit = document.getElementById('cloudInitInput').value;
      state.tailscaleEnabled = document.getElementById('tailscaleToggle').checked;
      return true;
    default: return true;
  }
}

// ── Step 0: Locations ──────────────────────────────────────────────────────
function renderLocations() {
  const container = document.getElementById('locationCards');
  if (!container) { console.error('locationCards container not found'); return; }
  
  const locationFlags = { nbg1:'🇩🇪', fsn1:'🇩🇪', hel1:'🇫🇮', ash:'🇺🇸', hil:'🇺🇸', sin:'🇸🇬' };
  if (LOCATIONS.length === 0) {
    container.innerHTML = '<div class="empty-state">No locations available.</div>';
    return;
  }
  
  container.innerHTML = LOCATIONS.map(l => \`
    <div class="card \${l.name === state.location ? 'selected' : ''}"
         data-location="\${l.name}">
      <div class="card-title">\${locationFlags[l.name] || '🌍'} \${l.name.toUpperCase()}</div>
      <div class="card-desc">\${l.city}, \${l.country}</div>
      <div class="card-desc" style="margin-top:4px;opacity:0.7">\${l.network_zone}</div>
    </div>
  \`).join('');
}

function selectLocation(val, el) {
  state.location = val;
  document.querySelectorAll('#locationCards .card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}
// Note: selectLocation is kept for backward compat but listeners are now wired via addEventListener in DOMContentLoaded

// ── Step 1: Server Types ───────────────────────────────────────────────────
function filterTypes(filter, btn) {
  document.querySelectorAll('#typeFilter .filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderServerTypes(filter);
}

function renderServerTypes(filter) {
  const container = document.getElementById('typeCards');
  if (!container) { console.error('typeCards container not found'); return; }
  
  let types = SERVER_TYPES;
  if (filter === 'shared') types = types.filter(t => t.cpu_type === 'shared');
  if (filter === 'dedicated') types = types.filter(t => t.cpu_type === 'dedicated');
  if (filter === 'arm') types = types.filter(t => t.architecture === 'arm');

  if (types.length === 0) {
    container.innerHTML = '<div class="empty-state">No server types found.</div>';
    return;
  }

  container.innerHTML = types.map(t => \`
    <div class="card \${t.name === state.serverType ? 'selected' : ''}"
         data-server-type="\${t.name}">
      <div class="card-badge">\${t.cpu_type}</div>
      <div class="card-title">\${t.name}</div>
      <div class="card-desc">
        \${t.cores} vCPU · \${t.memory}GB RAM<br>
        \${t.disk}GB \${t.storage_type}<br>
        \${t.architecture}
      </div>
    </div>
  \`).join('');
}

function selectType(val, el) {
  state.serverType = val;
  document.querySelectorAll('#typeCards .card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Step 2: Images ─────────────────────────────────────────────────────────
function filterImages(filter, btn) {
  state.imageFilter = filter;
  document.querySelectorAll('#imageFilter .filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const isCustom = filter === 'custom';
  document.getElementById('customImagePanel').style.display = isCustom ? 'block' : 'none';
  document.getElementById('imageCards').style.display = isCustom ? 'none' : 'grid';
  document.getElementById('imageSearchWrap').style.display = isCustom ? 'none' : 'block';
  state.useCustomImage = isCustom;
  if (!isCustom) renderImages();
}

function renderImages() {
  const container = document.getElementById('imageCards');
  if (!container) { console.error('imageCards container not found'); return; }
  
  const search = (document.getElementById('imageSearch').value || '').toLowerCase();
  const osIcons = { ubuntu:'🟠', debian:'🔴', fedora:'💙', centos:'🟣', rocky:'🟢', alma:'🔵', default:'📦' };

  let imgs = IMAGES.filter(i => i.type === state.imageFilter || (state.imageFilter === 'system' && i.type === 'system'));
  if (search) imgs = imgs.filter(i => (i.name || i.description || '').toLowerCase().includes(search));

  if (imgs.length === 0) {
    container.innerHTML = '<div class="empty-state">No images found.</div>';
    return;
  }

  container.innerHTML = imgs.map(i => {
    const label = i.name || i.description;
    const iconKey = Object.keys(osIcons).find(k => label.toLowerCase().includes(k)) || 'default';
    return \`
      <div class="card \${i.name === state.image ? 'selected' : ''}"
           data-image="\${h(i.name || i.id)}"
           data-image-display="\${h(label)}">
        <div class="card-badge">\${h(i.type)}</div>
        <div class="card-title">\${osIcons[iconKey]} \${h(label)}</div>
        <div class="card-desc">\${h(i.os_flavor)} \${h(i.os_version || '')}</div>
      </div>
    \`;
  }).join('');
}

function selectImage(val, display, el) {
  state.image = val;
  state.imageDisplay = display;
  document.querySelectorAll('#imageCards .card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ── Step 3: SSH Keys ───────────────────────────────────────────────────────
function renderSshKeys() {
  const container = document.getElementById('sshKeyCards');
  if (!container) { console.error('sshKeyCards container not found'); return; }
  
  if (SSH_KEYS.length === 0) {
    const noMsg = document.getElementById('noSshKeysMsg');
    if (noMsg) noMsg.style.display = 'block';
    container.style.display = 'none';
    return;
  }
  const noMsg = document.getElementById('noSshKeysMsg');
  if (noMsg) noMsg.style.display = 'none';
  container.style.display = 'block';
  
  container.innerHTML = SSH_KEYS.map(k => \`
    <label class="check-card \${state.sshKeys.includes(k.name) ? 'selected' : ''}"
           data-key-name="\${h(k.name)}">
      <div class="check-icon">\${state.sshKeys.includes(k.name) ? '✓' : ''}</div>
      <div>
        <div style="font-size:13px;font-weight:600">\${h(k.name)}</div>
        <div style="font-size:11px;color:var(--vscode-descriptionForeground)">\${h(k.fingerprint.substring(0, 28))}…</div>
      </div>
    </label>
  \`).join('');
}

function toggleSshKey(name, el) {
  if (state.sshKeys.includes(name)) {
    state.sshKeys = state.sshKeys.filter(k => k !== name);
    el.classList.remove('selected');
    el.querySelector('.check-icon').textContent = '';
  } else {
    state.sshKeys.push(name);
    el.classList.add('selected');
    el.querySelector('.check-icon').textContent = '✓';
  }
}

// ── Step 4: Networks ───────────────────────────────────────────────────────
function renderNetworks() {
  const container = document.getElementById('networkCards');
  if (!container) { console.error('networkCards container not found'); return; }
  
  if (NETWORKS.length === 0) {
    const noMsg = document.getElementById('noNetworksMsg');
    if (noMsg) noMsg.style.display = 'block';
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  const noMsg = document.getElementById('noNetworksMsg');
  if (noMsg) noMsg.style.display = 'none';
  
  container.innerHTML = NETWORKS.map(n => \`
    <div style="margin-bottom:12px;border:1px solid var(--vscode-panel-border);border-radius:6px;overflow:hidden">
      <label class="check-card \${state.networks.includes(n.id) ? 'selected' : ''}"
             data-network-id="\${n.id}"
             style="border-radius:0;margin:0;border-bottom:1px solid var(--vscode-panel-border)">
        <div class="check-icon">\${state.networks.includes(n.id) ? '✓' : ''}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">\${h(n.name)}</div>
          <div style="font-size:11px;color:var(--vscode-descriptionForeground)">Network: \${h(n.ip_range)}</div>
        </div>
      </label>
      <div style="background:rgba(128,128,128,0.1);padding:8px;border-radius:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:10px;font-weight:600;color:var(--vscode-descriptionForeground);text-transform:uppercase">Subnets (\${n.subnets?.length || 0})</div>
          <button class="btn-secondary" style="padding:2px 8px;font-size:10px" data-action="create-subnet" data-network-id="\${n.id}" data-network-zone="\${h(n.network_zone || 'eu-central')}">+ Add Subnet</button>
        </div>
        \${n.subnets && n.subnets.length > 0 
          ? n.subnets.map(s => \`
              <div style="font-size:10px;padding:4px 0;color:var(--vscode-foreground)">
                📍 \${h(s.ip_range)} · Zone: <strong>\${h(s.network_zone)}</strong>
              </div>
            \`).join('')
          : '<div style="font-size:10px;color:var(--vscode-descriptionForeground);font-style:italic">No subnets yet</div>'
        }
      </div>
    </div>
  \`).join('');
}

function toggleNetwork(id, el) {
  if (state.networks.includes(id)) {
    state.networks = state.networks.filter(n => n !== id);
    el.classList.remove('selected');
    el.querySelector('.check-icon').textContent = '';
  } else {
    state.networks.push(id);
    el.classList.add('selected');
    el.querySelector('.check-icon').textContent = '✓';
  }
}

function addSshKeyFromWizard() {
  vscode.postMessage({ command: 'addSshKey' });
}

function createNetworkFromWizard() {
  vscode.postMessage({ command: 'createNetwork' });
}

function createSubnetFromWizard(btn) {
  const networkId = parseInt(btn.dataset.networkId, 10);
  const networkZone = btn.dataset.networkZone || 'eu-central';
  vscode.postMessage({ 
    command: 'createSubnet', 
    payload: { networkId, networkZone } 
  });
}

// ── Step 5: Cloud-init / Tailscale ─────────────────────────────────────────
function updateTailscaleState() {
  state.tailscaleEnabled = document.getElementById('tailscaleToggle').checked;
  // Banner is shown/hidden by the extension host after key check
}

function setTailscaleKey() {
  vscode.postMessage({ command: 'setTailscaleKey' });
}

// ── Step 6: Review ─────────────────────────────────────────────────────────
function renderSummary() {
  const rows = [
    ['Name', state.name],
    ['Location', state.location.toUpperCase()],
    ['Server Type', state.serverType],
    ['OS Image', state.imageDisplay || state.image],
    ['SSH Keys', state.sshKeys.length ? state.sshKeys.join(', ') : 'None'],
    ['Networks', state.networks.length ? state.networks.length + ' network(s)' : 'None (public IP only)'],
    ['Tailscale', state.tailscaleEnabled ? '✓ Auto-install enabled' : '✗ Disabled'],
    ['Cloud-init', state.cloudInit.trim() ? '✓ Custom script provided' : 'None'],
  ];

  document.getElementById('summaryTable').innerHTML = rows.map(([k, v]) => \`
    <div class="summary-row">
      <span class="summary-key">\${h(k)}</span>
      <span class="summary-val">\${h(v)}</span>
    </div>
  \`).join('');
}

// ── Create ─────────────────────────────────────────────────────────────────
function createServer() {
  document.getElementById('errorBanner').className = 'banner';
  vscode.postMessage({
    command: 'createServer',
    payload: {
      name: state.name,
      location: state.location,
      serverType: state.serverType,
      image: state.image,
      sshKeys: state.sshKeys,
      networks: state.networks,
      cloudInit: state.cloudInit,
      tailscaleEnabled: state.tailscaleEnabled,
    }
  });
}

function cancel() {
  vscode.postMessage({ command: 'cancel' });
}

function showLoading(msg) {
  document.getElementById('loadingMsg').textContent = msg || 'Working...';
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = '⚠ ' + msg;
  banner.className = 'banner error';
  showStep(6);
}
</script>
</body>
</html>`;
}
