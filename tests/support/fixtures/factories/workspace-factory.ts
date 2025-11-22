import { faker } from '@faker-js/faker';

type Workspace = {
  id: string;
  name: string;
  description: string;
  equations: Array<{
    id: string;
    latex: string;
    handwritten: boolean;
    createdAt: Date;
  }>;
  createdAt: Date;
  lastModified: Date;
};

type Equation = {
  id: string;
  latex: string;
  handwritten: boolean;
  createdAt: Date;
};

export class WorkspaceFactory {
  private createdWorkspaces: string[] = [];

  async createWorkspace(overrides: Partial<Workspace> = {}): Promise<Workspace> {
    const workspace = {
      id: faker.string.uuid(),
      name: faker.lorem.words(3),
      description: faker.lorem.sentences(2),
      equations: [],
      createdAt: new Date(),
      lastModified: new Date(),
      ...overrides,
    };

    // Store in IndexedDB for tests
    if (typeof window !== 'undefined') {
      await this.storeWorkspace(workspace);
    }

    this.createdWorkspaces.push(workspace.id);
    return workspace;
  }

  async createEquation(overrides: Partial<Equation> = {}): Promise<Equation> {
    const equation = {
      id: faker.string.uuid(),
      latex: faker.helpers.arrayElement([
        'x^2 + 3x + 2 = 0',
        '\\frac{d}{dx}(x^2) = 2x',
        '\\int_0^\\pi \\sin(x) dx = 2',
        'E = mc^2',
        '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
      ]),
      handwritten: faker.datatype.boolean(),
      createdAt: new Date(),
      ...overrides,
    };

    return equation;
  }

  async createWorkspaceWithEquations(
    equationCount: number = 3,
    overrides: Partial<Workspace> = {}
  ): Promise<Workspace> {
    const equations = Array.from({ length: equationCount }, () => this.createEquation());
    
    return this.createWorkspace({
      equations,
      lastModified: new Date(),
      ...overrides,
    });
  }

  private async storeWorkspace(workspace: Workspace): Promise<void> {
    // Use IndexedDB for realistic test data
    if ('indexedDB' in window) {
      const request = indexedDB.open('texo-workspace-test', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('workspaces')) {
          db.createObjectStore('workspaces', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['workspaces'], 'readwrite');
        const store = transaction.objectStore('workspaces');
        store.add(workspace);
      };
    }
  }

  async cleanup(): Promise<void> {
    // Clean up from IndexedDB
    if ('indexedDB' in window) {
      const request = indexedDB.open('texo-workspace-test', 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['workspaces'], 'readwrite');
        const store = transaction.objectStore('workspaces');
        
        for (const workspaceId of this.createdWorkspaces) {
          store.delete(workspaceId);
        }
      };
    }
    
    this.createdWorkspaces = [];
  }
}