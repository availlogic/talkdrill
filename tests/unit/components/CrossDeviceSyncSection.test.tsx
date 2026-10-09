import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CrossDeviceSyncSection } from '../../../src/components/CrossDeviceSyncSection';
import { syncManager } from '../../../src/services/syncManager';

describe('CrossDeviceSyncSection Component (TDD)', () => {
  beforeEach(() => {
    localStorage.clear();
    syncManager.clearSyncKey();
    vi.restoreAllMocks();
  });

  it('renders disconnected state when no sync key is active', () => {
    render(<CrossDeviceSyncSection />);
    expect(screen.getByText(/cross-device cloud sync/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /enable cloud sync/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /connect/i })).toBeDefined();
  });

  it('generates new key and opens QR modal when Enable Cloud Sync is clicked', async () => {
    const syncSpy = vi.spyOn(syncManager, 'syncNow').mockResolvedValue({ success: true });
    render(<CrossDeviceSyncSection />);

    const enableBtn = screen.getByRole('button', { name: /enable cloud sync/i });
    fireEvent.click(enableBtn);

    await waitFor(() => {
      expect(syncManager.getSyncKey()).toBeDefined();
      expect(screen.getByRole('dialog')).toBeDefined();
      expect(syncSpy).toHaveBeenCalled();
    });
  });

  it('binds existing key when valid key is entered into input', async () => {
    const validKey = 'TD-9X7K-M2P4-W8N3-7B5D';
    const syncSpy = vi.spyOn(syncManager, 'syncNow').mockResolvedValue({ success: true });
    render(<CrossDeviceSyncSection />);

    const input = screen.getByPlaceholderText(/td-xxxx-xxxx-xxxx-xxxx/i);
    fireEvent.change(input, { target: { value: validKey } });

    const connectBtn = screen.getByRole('button', { name: /connect/i });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(syncManager.getSyncKey()).toBe(validKey);
      expect(syncSpy).toHaveBeenCalled();
    });
  });

  it('shows connected state and triggers syncNow on Sync Now click', async () => {
    const validKey = 'TD-9X7K-M2P4-W8N3-7B5D';
    syncManager.setSyncKey(validKey);
    const syncSpy = vi.spyOn(syncManager, 'syncNow').mockResolvedValue({ success: true });

    render(<CrossDeviceSyncSection />);
    expect(screen.getByText(/connected/i)).toBeDefined();

    const syncNowBtn = screen.getByRole('button', { name: /sync now/i });
    fireEvent.click(syncNowBtn);

    expect(syncSpy).toHaveBeenCalled();
  });

  it('disconnects and clears key when Disconnect button is clicked', async () => {
    const validKey = 'TD-9X7K-M2P4-W8N3-7B5D';
    syncManager.setSyncKey(validKey);

    render(<CrossDeviceSyncSection />);
    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    expect(syncManager.getSyncKey()).toBeNull();
  });

  it('shows error message when user attempts to connect with an invalid key format', async () => {
    render(<CrossDeviceSyncSection />);
    const input = screen.getByPlaceholderText(/td-xxxx-xxxx-xxxx-xxxx/i);
    fireEvent.change(input, { target: { value: 'invalid-key' } });

    const connectBtn = screen.getByRole('button', { name: /connect/i });
    fireEvent.click(connectBtn);

    expect(screen.getByText(/invalid sync key format/i)).toBeDefined();
    expect(syncManager.getSyncKey()).toBeNull();
  });

  it('opens QR modal when Show QR Code is clicked in connected state', async () => {
    const validKey = 'TD-9X7K-M2P4-W8N3-7B5D';
    syncManager.setSyncKey(validKey);

    render(<CrossDeviceSyncSection />);
    const showQrBtn = screen.getByRole('button', { name: /show qr code/i });
    fireEvent.click(showQrBtn);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Scan to Pair Device')).toBeDefined();
  });
});
