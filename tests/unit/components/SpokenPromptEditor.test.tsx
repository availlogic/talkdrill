import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpokenPromptEditor, PROMPT_LANG_TABS } from '../../../src/components/SpokenPromptEditor';

describe('SpokenPromptEditor Component (TDD)', () => {
  it('renders all language tabs and current prompt content', () => {
    const onSelectTab = vi.fn();
    const onPromptChange = vi.fn();
    const onRestoreDefault = vi.fn();

    render(
      <SpokenPromptEditor
        activeTab="es-ES"
        onSelectTab={onSelectTab}
        prompts={{ 'es-ES': 'Test Spanish' }}
        onPromptChange={onPromptChange}
        onRestoreDefault={onRestoreDefault}
      />
    );

    PROMPT_LANG_TABS.forEach((tab) => {
      expect(screen.getByRole('tab', { name: tab.label })).toBeDefined();
    });

    const textarea = screen.getByLabelText(/Spoken Prompt for Spanish/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Test Spanish');
  });

  it('triggers onSelectTab when a tab is clicked', () => {
    const onSelectTab = vi.fn();
    render(
      <SpokenPromptEditor
        activeTab="es-ES"
        onSelectTab={onSelectTab}
        onPromptChange={vi.fn()}
        onRestoreDefault={vi.fn()}
      />
    );

    const jaTab = screen.getByRole('tab', { name: /Japanese/i });
    fireEvent.click(jaTab);
    expect(onSelectTab).toHaveBeenCalledWith('ja-JP');
  });

  it('triggers onPromptChange when textarea content changes', () => {
    const onPromptChange = vi.fn();
    render(
      <SpokenPromptEditor
        activeTab="fr-FR"
        onSelectTab={vi.fn()}
        onPromptChange={onPromptChange}
        onRestoreDefault={vi.fn()}
      />
    );

    const textarea = screen.getByLabelText(/Spoken Prompt for French/i);
    fireEvent.change(textarea, { target: { value: 'New French Prompt' } });
    expect(onPromptChange).toHaveBeenCalledWith('fr-FR', 'New French Prompt');
  });

  it('triggers onRestoreDefault when Restore Default button is clicked', () => {
    const onRestoreDefault = vi.fn();
    render(
      <SpokenPromptEditor
        activeTab="de-DE"
        onSelectTab={vi.fn()}
        onPromptChange={vi.fn()}
        onRestoreDefault={onRestoreDefault}
      />
    );

    const restoreBtn = screen.getByRole('button', { name: /Restore Default/i });
    fireEvent.click(restoreBtn);
    expect(onRestoreDefault).toHaveBeenCalledWith('de-DE');
  });

  it('displays Customized badge when prompt differs from default', () => {
    render(
      <SpokenPromptEditor
        activeTab="es-ES"
        onSelectTab={vi.fn()}
        prompts={{ 'es-ES': 'Different from system default' }}
        onPromptChange={vi.fn()}
        onRestoreDefault={vi.fn()}
      />
    );

    expect(screen.getByText('Customized')).toBeDefined();
  });
});
