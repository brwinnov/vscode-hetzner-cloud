import * as vscode from 'vscode';
import { HetznerClient } from '../api/hetzner';

const SECRET_PREFIX = 'hetznet.token.';
const ACTIVE_KEY = 'hetznet.activeProject';

export interface StoredProject {
  name: string;
  token: string;
}

export class TokenManager {
  private secrets: vscode.SecretStorage;
  private activeProjectName: string | undefined;

  constructor(secrets: vscode.SecretStorage) {
    this.secrets = secrets;
  }

  async addProject(name: string, token: string): Promise<void> {
    await this.secrets.store(`${SECRET_PREFIX}${name}`, token);
    // Auto-activate if first project
    const projects = await this.listProjects();
    if (projects.length === 1) {
      await this.setActiveProject(name);
    }
  }

  async removeProject(name: string): Promise<void> {
    await this.secrets.delete(`${SECRET_PREFIX}${name}`);
    if (this.activeProjectName === name) {
      this.activeProjectName = undefined;
      await this.secrets.delete(ACTIVE_KEY);
    }
  }

  async listProjects(): Promise<string[]> {
    // SecretStorage doesn't support listing keys; we maintain a CSV index
    const index = await this.secrets.get('hetznet.projectIndex');
    if (!index) return [];
    return index.split(',').filter(Boolean);
  }

  async addToIndex(name: string): Promise<void> {
    const existing = await this.listProjects();
    if (!existing.includes(name)) {
      await this.secrets.store('hetznet.projectIndex', [...existing, name].join(','));
    }
  }

  async removeFromIndex(name: string): Promise<void> {
    const existing = await this.listProjects();
    await this.secrets.store(
      'hetznet.projectIndex',
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
      this.activeProjectName = undefined;
    }
  }

  async setActiveProject(name: string): Promise<void> {
    await this.secrets.store(ACTIVE_KEY, name);
    this.activeProjectName = name;
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
