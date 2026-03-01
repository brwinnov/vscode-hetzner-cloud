import * as vscode from 'vscode';
import { HetznerClient } from '../api/hetzner';

const SECRET_PREFIX = 'hcloud.token.';
const ACTIVE_KEY = 'hcloud.activeProject';

/**
 * One-time migration: removes all keys written under the old 'hetznet.' prefix.
 * Safe to call on every activation — does nothing when there is nothing to clean up.
 */
export async function cleanupLegacyKeys(secrets: vscode.SecretStorage): Promise<boolean> {
  const oldIndex = await secrets.get('hetznet.projectIndex');
  let cleaned = false;

  if (oldIndex) {
    const names = oldIndex.split(',').filter(Boolean);
    for (const name of names) {
      await secrets.delete(`hetznet.token.${name}`);
    }
    await secrets.delete('hetznet.projectIndex');
    cleaned = true;
  }

  // Delete remaining known legacy keys regardless of index
  for (const key of ['hetznet.activeProject', 'hetznet.tailscale.authkey']) {
    await secrets.delete(key);
  }

  return cleaned;
}

export interface StoredProject {
  name: string;
  token: string;
}

export class TokenManager {
  private secrets: vscode.SecretStorage;
  constructor(secrets: vscode.SecretStorage) {
    this.secrets = secrets;
  }

  async listProjects(): Promise<string[]> {
    // SecretStorage doesn't support listing keys; we maintain a CSV index
    const index = await this.secrets.get('hcloud.projectIndex');
    if (!index) return [];
    return index.split(',').filter(Boolean);
  }

  async addToIndex(name: string): Promise<void> {
    const existing = await this.listProjects();
    if (!existing.includes(name)) {
      await this.secrets.store('hcloud.projectIndex', [...existing, name].join(','));
    }
  }

  async removeFromIndex(name: string): Promise<void> {
    const existing = await this.listProjects();
    await this.secrets.store(
      'hcloud.projectIndex',
      existing.filter((p) => p !== name).join(',')
    );
  }

  async saveProject(name: string, token: string): Promise<void> {
    await this.secrets.store(`${SECRET_PREFIX}${name}`, token);
    await this.addToIndex(name);
    const projects = await this.listProjects();
    if (projects.length === 1) {
      await this.setActiveProject(name);
    }
  }

  async deleteProject(name: string): Promise<void> {
    await this.secrets.delete(`${SECRET_PREFIX}${name}`);
    await this.removeFromIndex(name);
    const active = await this.secrets.get(ACTIVE_KEY);
    if (active === name) {
      await this.secrets.delete(ACTIVE_KEY);
    }
  }

  async setActiveProject(name: string): Promise<void> {
    await this.secrets.store(ACTIVE_KEY, name);
  }

  async getActiveProjectName(): Promise<string | undefined> {
    return await this.secrets.get(ACTIVE_KEY);
  }

  async getActiveToken(): Promise<string | undefined> {
    const name = await this.getActiveProjectName();
    if (!name) return undefined;
    return await this.secrets.get(`${SECRET_PREFIX}${name}`);
  }

  async getActiveClient(): Promise<HetznerClient | undefined> {
    const token = await this.getActiveToken();
    if (!token) return undefined;
    return new HetznerClient(token);
  }
}

// ── Robot API Credentials ─────────────────────────────────────────────────
// Robot credentials (for Storage Boxes) are separate from Cloud API tokens.
// They are set at https://robot.hetzner.com → Settings → Webservice & API.

export class RobotCredentialManager {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async setCredentials(username: string, password: string): Promise<void> {
    await this.secrets.store('hcloud.robot.username', username);
    await this.secrets.store('hcloud.robot.password', password);
  }

  async getCredentials(): Promise<{ username: string; password: string } | undefined> {
    const username = await this.secrets.get('hcloud.robot.username');
    const password = await this.secrets.get('hcloud.robot.password');
    if (!username || !password) return undefined;
    return { username, password };
  }

  async clearCredentials(): Promise<void> {
    await this.secrets.delete('hcloud.robot.username');
    await this.secrets.delete('hcloud.robot.password');
  }

  async getClient(): Promise<import('../api/robot').RobotClient | undefined> {
    const creds = await this.getCredentials();
    if (!creds) return undefined;
    const { RobotClient } = await import('../api/robot');
    return new RobotClient(creds.username, creds.password);
  }
}

// ── Storage Box Password Store ────────────────────────────────────────────
// Per-box CIFS passwords are stored keyed by box login (e.g. "u123456").

const BOX_PWD_PREFIX = 'hcloud.storagebox.pwd.';

export class StorageBoxPasswordManager {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async setPassword(login: string, password: string): Promise<void> {
    await this.secrets.store(`${BOX_PWD_PREFIX}${login}`, password);
  }

  async getPassword(login: string): Promise<string | undefined> {
    return this.secrets.get(`${BOX_PWD_PREFIX}${login}`);
  }

  async clearPassword(login: string): Promise<void> {
    await this.secrets.delete(`${BOX_PWD_PREFIX}${login}`);
  }
}

// ── Cloud-init Template Library ───────────────────────────────────────────

const TEMPLATE_INDEX_KEY = 'hcloud.cloudInit.index';
const TEMPLATE_KEY_PREFIX = 'hcloud.cloudInit.';

export class CloudInitLibrary {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async listTemplates(): Promise<string[]> {
    const index = await this.secrets.get(TEMPLATE_INDEX_KEY);
    if (!index) return [];
    return index.split(',').filter(Boolean);
  }

  async saveTemplate(name: string, content: string): Promise<void> {
    await this.secrets.store(`${TEMPLATE_KEY_PREFIX}${name}`, content);
    const existing = await this.listTemplates();
    if (!existing.includes(name)) {
      await this.secrets.store(TEMPLATE_INDEX_KEY, [...existing, name].join(','));
    }
  }

  async loadTemplate(name: string): Promise<string | undefined> {
    return this.secrets.get(`${TEMPLATE_KEY_PREFIX}${name}`);
  }

  async deleteTemplate(name: string): Promise<void> {
    await this.secrets.delete(`${TEMPLATE_KEY_PREFIX}${name}`);
    const existing = await this.listTemplates();
    await this.secrets.store(TEMPLATE_INDEX_KEY, existing.filter((n) => n !== name).join(','));
  }
}
