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
  for (const key of ['hetznet.activeProject']) {
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

// ── Cloud-init Template Library ───────────────────────────────────────────

const TEMPLATE_INDEX_KEY = 'hcloud.cloudInit.index';
const TEMPLATE_KEY_PREFIX = 'hcloud.cloudInit.';

export class CloudInitLibrary {
  constructor(private readonly state: vscode.Memento) {}

  listTemplates(): string[] {
    return this.state.get<string[]>(TEMPLATE_INDEX_KEY) ?? [];
  }

  async saveTemplate(name: string, content: string): Promise<void> {
    await this.state.update(`${TEMPLATE_KEY_PREFIX}${name}`, content);
    const existing = this.listTemplates();
    if (!existing.includes(name)) {
      await this.state.update(TEMPLATE_INDEX_KEY, [...existing, name]);
    }
  }

  loadTemplate(name: string): string | undefined {
    return this.state.get<string>(`${TEMPLATE_KEY_PREFIX}${name}`);
  }

  async deleteTemplate(name: string): Promise<void> {
    await this.state.update(`${TEMPLATE_KEY_PREFIX}${name}`, undefined);
    const existing = this.listTemplates();
    await this.state.update(TEMPLATE_INDEX_KEY, existing.filter((n) => n !== name));
  }
}
