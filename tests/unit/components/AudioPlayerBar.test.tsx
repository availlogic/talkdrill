import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioPlayerBar } from '../../../src/components/AudioPlayerBar';

describe('AudioPlayerBar Component (TDD)', () => {
  const defaultProps = {
    audioUrl: 'blob:mock-audio',
    isPlaying: false,
    playbackRate: 1.0,
    currentTime: 15,
    duration: 65,
    isLooping: false,
    loopStart: null,
    loopEnd: null,
    onPlayPause: vi.fn(),
    onSeek: vi.fn(),
    onRateChange: vi.fn(),
    onJump: vi.fn(),
    onSetLoopPoint: vi.fn(),
    onClearLoop: vi.fn(),
  };

  it('renders time formatted in mm:ss and progress bar', () => {
    render(<AudioPlayerBar {...defaultProps} />);
    expect(screen.getByText('00:15 / 01:05')).toBeDefined();
    const scrubber = screen.getByRole('slider') as HTMLInputElement;
    expect(scrubber.value).toBe('15');
  });

  it('toggles play and pause when center button is clicked', () => {
    const playPauseSpy = vi.fn();
    render(<AudioPlayerBar {...defaultProps} onPlayPause={playPauseSpy} />);
    const playBtn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);
    expect(playPauseSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers onJump with step values (-2s, +2s, -5s, +5s)', () => {
    const jumpSpy = vi.fn();
    render(<AudioPlayerBar {...defaultProps} onJump={jumpSpy} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rewind 2s' }));
    expect(jumpSpy).toHaveBeenCalledWith(-2);

    fireEvent.click(screen.getByRole('button', { name: 'Forward 2s' }));
    expect(jumpSpy).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole('button', { name: 'Rewind 5s' }));
    expect(jumpSpy).toHaveBeenCalledWith(-5);

    fireEvent.click(screen.getByRole('button', { name: 'Forward 5s' }));
    expect(jumpSpy).toHaveBeenCalledWith(5);
  });

  it('triggers onRateChange when speed pill is clicked', () => {
    const rateSpy = vi.fn();
    render(<AudioPlayerBar {...defaultProps} onRateChange={rateSpy} />);

    fireEvent.click(screen.getByRole('button', { name: '0.75x' }));
    expect(rateSpy).toHaveBeenCalledWith(0.75);

    fireEvent.click(screen.getByRole('button', { name: '1.25x' }));
    expect(rateSpy).toHaveBeenCalledWith(1.25);
  });

  it('sets and clears A-B loop points', () => {
    const loopPointSpy = vi.fn();
    const clearLoopSpy = vi.fn();

    const { rerender } = render(
      <AudioPlayerBar
        {...defaultProps}
        onSetLoopPoint={loopPointSpy}
        onClearLoop={clearLoopSpy}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set loop start A' }));
    expect(loopPointSpy).toHaveBeenCalledWith('A');

    fireEvent.click(screen.getByRole('button', { name: 'Set loop end B' }));
    expect(loopPointSpy).toHaveBeenCalledWith('B');

    // Rerender with loop active
    rerender(
      <AudioPlayerBar
        {...defaultProps}
        isLooping={true}
        loopStart={5}
        loopEnd={20}
        onSetLoopPoint={loopPointSpy}
        onClearLoop={clearLoopSpy}
      />
    );

    const clearBtn = screen.getByRole('button', { name: 'Clear loop' });
    fireEvent.click(clearBtn);
    expect(clearLoopSpy).toHaveBeenCalledTimes(1);
  });

  it('disables controls when audioUrl is null', () => {
    render(<AudioPlayerBar {...defaultProps} audioUrl={null} />);
    const playBtn = screen.getByRole('button', { name: /play/i }) as HTMLButtonElement;
    expect(playBtn.disabled).toBe(true);
  });
});
