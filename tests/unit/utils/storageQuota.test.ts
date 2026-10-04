import { describe, it, expect, vi } from 'vitest';
import { checkStorageCapacity, requestPersistentStorage } from '../../../src/utils/storageQuota';

describe('storageQuota utility', () => {
  it('returns estimates when navigator.storage is available', async () => {
    const mockEstimate = vi.fn().mockResolvedValue({
      quota: 1000,
      usage: 250,
    });
    const mockPersisted = vi.fn().mockResolvedValue(true);

    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: mockEstimate,
        persisted: mockPersisted,
        persist: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const result = await checkStorageCapacity();
    expect(result.quotaBytes).toBe(1000);
    expect(result.usageBytes).toBe(250);
    expect(result.percentageUsed).toBe(25);
    expect(result.isPersistent).toBe(true);
  });

  it('handles zero or missing quota without NaN', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({ quota: 0, usage: 0 }),
        persisted: vi.fn().mockResolvedValue(false),
      },
      writable: true,
      configurable: true,
    });

    const result = await checkStorageCapacity();
    expect(result.percentageUsed).toBe(0);
  });

  it('requests persistent storage when available', async () => {
    const mockPersist = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'storage', {
      value: {
        persist: mockPersist,
      },
      writable: true,
      configurable: true,
    });

    const success = await requestPersistentStorage();
    expect(success).toBe(true);
    expect(mockPersist).toHaveBeenCalledOnce();
  });

  it('handles environment when navigator.storage is not available', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const res = await checkStorageCapacity();
    expect(res.quotaBytes).toBe(0);
    expect(res.percentageUsed).toBe(0);

    const persistRes = await requestPersistentStorage();
    expect(persistRes).toBe(false);
  });
});
