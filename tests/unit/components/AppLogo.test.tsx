import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLogo } from '../../../src/components/AppLogo';

describe('AppLogo Component (TDD)', () => {
  it('renders SVG logo with default accessible label and dimensions', () => {
    render(<AppLogo />);
    const logoSvg = screen.getByRole('img', { name: 'TalkDrill Logo' });
    expect(logoSvg).toBeDefined();
    expect(logoSvg.getAttribute('viewBox')).toBe('0 0 512 512');
    expect(logoSvg.getAttribute('class')).toContain('w-10 h-10');
  });

  it('renders custom className and dimensions when provided', () => {
    render(<AppLogo className="w-8 h-8 custom-brand-class" size={32} />);
    const logoSvg = screen.getByRole('img', { name: 'TalkDrill Logo' });
    expect(logoSvg.getAttribute('class')).toContain('w-8 h-8');
    expect(logoSvg.getAttribute('class')).toContain('custom-brand-class');
    expect(logoSvg.getAttribute('width')).toBe('32');
    expect(logoSvg.getAttribute('height')).toBe('32');
  });

  it('allows overriding aria-label for contextual accessibility', () => {
    render(<AppLogo aria-label="TalkDrill Brand Mark" />);
    const logoSvg = screen.getByRole('img', { name: 'TalkDrill Brand Mark' });
    expect(logoSvg).toBeDefined();
  });

  it('contains the blue gradient and the white calligraphy Zheng path', () => {
    const { container } = render(<AppLogo />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
    const zhengPath = container.querySelector('path[fill="#ffffff"]');
    expect(zhengPath).not.toBeNull();
    expect(zhengPath?.getAttribute('d')).toContain('M');
  });
});
