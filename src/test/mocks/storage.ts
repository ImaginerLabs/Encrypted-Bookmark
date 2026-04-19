import type { IStorageAdapter } from '@/storage/interfaces/IStorageAdapter';

/**
 * Mock Storage Adapter for testing
 */
export function createMockStorageAdapter(): IStorageAdapter {
  return {
    read: async () => null,
    write: async () => {},
    clear: async () => {},
    getCapacity: async () => ({ used: 0, total: -1, usagePercent: 0 }),
    isAvailable: async () => true,
    getType: () => 'chrome',
  };
}
