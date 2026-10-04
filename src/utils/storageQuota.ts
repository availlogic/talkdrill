export interface StorageEstimateResult {
  quotaBytes: number;
  usageBytes: number;
  percentageUsed: number;
  isPersistent: boolean;
}

export async function checkStorageCapacity(): Promise<StorageEstimateResult> {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    const isPersistent = navigator.storage.persisted
      ? await navigator.storage.persisted()
      : false;

    const percentageUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      quotaBytes: quota,
      usageBytes: usage,
      percentageUsed,
      isPersistent,
    };
  }

  return {
    quotaBytes: 0,
    usageBytes: 0,
    percentageUsed: 0,
    isPersistent: false,
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    return await navigator.storage.persist();
  }
  return false;
}
