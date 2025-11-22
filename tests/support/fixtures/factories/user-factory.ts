import { faker } from '@faker-js/faker';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
  createdAt: Date;
  isActive: boolean;
};

export class UserFactory {
  private createdUsers: string[] = [];

  async createUser(overrides: Partial<User> = {}): Promise<User> {
    const user = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: 'user' as const,
      createdAt: new Date(),
      isActive: true,
      ...overrides,
    };

    // For Texo, we don't have user API - store in localStorage for tests
    if (typeof window !== 'undefined') {
      const users = JSON.parse(localStorage.getItem('testUsers') || '[]');
      users.push(user);
      localStorage.setItem('testUsers', JSON.stringify(users));
    }

    this.createdUsers.push(user.id);
    return user;
  }

  async createAdminUser(overrides: Partial<User> = {}): Promise<User> {
    return this.createUser({ role: 'admin', ...overrides });
  }

  async cleanup(): Promise<void> {
    // Clean up from localStorage
    if (typeof window !== 'undefined') {
      const users = JSON.parse(localStorage.getItem('testUsers') || '[]');
      const filteredUsers = users.filter((user: User) => !this.createdUsers.includes(user.id));
      localStorage.setItem('testUsers', JSON.stringify(filteredUsers));
    }
    this.createdUsers = [];
  }
}