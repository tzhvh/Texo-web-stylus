import { test as base } from '@playwright/test';
import { UserFactory } from './factories/user-factory';
import { WorkspaceFactory } from './factories/workspace-factory';

type TestFixtures = {
  userFactory: UserFactory;
  workspaceFactory: WorkspaceFactory;
};

export const test = base.extend<TestFixtures>({
  userFactory: async ({}, use) => {
    const factory = new UserFactory();
    await use(factory);
    await factory.cleanup(); // Auto-cleanup
  },

  workspaceFactory: async ({}, use) => {
    const factory = new WorkspaceFactory();
    await use(factory);
    await factory.cleanup(); // Auto-cleanup
  },
});

export { expect } from '@playwright/test';