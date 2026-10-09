import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncPairingModal } from '../../../src/components/SyncPairingModal';

describe('SyncPairingModal Component (TDD)', () => {
  const syncKey = 'TD-9X7K-M2P4-W8N3-7B5D';

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SyncPairingModal isOpen={false} syncKey={syncKey} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders QR code and key string when isOpen is true', async () => {
    render(<SyncPairingModal isOpen={true} syncKey={syncKey} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(syncKey)).toBeDefined();

    await waitFor(() => {
      const img = screen.getByRole('img', { name: /sync qr code/i });
      expect(img).toBeDefined();
    });
  });

  it('copies key to clipboard when Copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<SyncPairingModal isOpen={true} syncKey={syncKey} onClose={vi.fn()} />);
    const copyBtn = screen.getByRole('button', { name: /copy key/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(syncKey);
    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeDefined();
    });
  });

  it('invokes onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(<SyncPairingModal isOpen={true} syncKey={syncKey} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
