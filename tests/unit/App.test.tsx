import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import { db } from '../../src/storage/db';

describe('App Root Shell (TDD)', () => {
  beforeEach(async () => {
    window.location.hash = '';
    await db.articles.clear();
    await db.audios.clear();
    await db.drillLogs.clear();
  });

  it('renders LibraryOverview on default route', async () => {
    render(<App />);
    expect(await screen.findByText('TalkDrill')).toBeDefined();
    expect(screen.getByText('Offline Shadowing')).toBeDefined();
  });

  it('navigates to CorpusStudio when hash changes to #studio', async () => {
    render(<App />);
    window.location.hash = '#studio';
    fireEvent(window, new HashChangeEvent('hashchange'));

    expect(await screen.findByText('Corpus Studio')).toBeDefined();
  });

  it('navigates to SettingsHub when hash changes to #settings', async () => {
    render(<App />);
    window.location.hash = '#settings';
    fireEvent(window, new HashChangeEvent('hashchange'));

    expect(await screen.findByText('Settings & Integrations')).toBeDefined();
  });

  it('navigates to DrillWorkspace when hash changes to #drill?id=art-123', async () => {
    await db.articles.add({
      id: 'art-123',
      title: 'App Drill Test',
      sourceText: '',
      targetText: '¡Hola mundo!',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 500,
      currentCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: 0,
    });

    render(<App />);
    window.location.hash = '#drill?id=art-123';
    fireEvent(window, new HashChangeEvent('hashchange'));

    expect(await screen.findByText('¡Hola mundo!')).toBeDefined();

    // Trigger pointerdown to test first gesture unlock
    fireEvent.pointerDown(window);
  });

  it('navigates from LibraryOverview UI buttons to studio and settings', async () => {
    render(<App />);
    const newBtn = await screen.findByRole('button', { name: 'Create First Drill' });
    fireEvent.click(newBtn);
    expect(await screen.findByText('Corpus Studio')).toBeDefined();
  });

  it('navigates to CorpusStudio in edit mode when hash changes to #studio?edit=art-123', async () => {
    await db.articles.add({
      id: 'art-edit-app',
      title: 'Drill For Edit Route',
      sourceText: '',
      targetText: 'Texto a editar',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 500,
      currentCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: 0,
    });

    render(<App />);
    window.location.hash = '#studio?edit=art-edit-app';
    fireEvent(window, new HashChangeEvent('hashchange'));

    expect(await screen.findByText('Edit Drill')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDefined();
  });

  it('navigates to studio edit from DrillWorkspace edit button', async () => {
    await db.articles.add({
      id: 'art-workspace-edit',
      title: 'Drill In Workspace',
      sourceText: '',
      targetText: 'Workspace Target',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 500,
      currentCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: 0,
    });

    render(<App />);
    window.location.hash = '#drill?id=art-workspace-edit';
    fireEvent(window, new HashChangeEvent('hashchange'));

    const editBtn = await screen.findByRole('button', { name: /edit drill/i });
    fireEvent.click(editBtn);

    expect(window.location.hash).toBe('#studio?edit=art-workspace-edit');
  });

  it('automatically binds sync key and triggers sync when pair query param is detected', async () => {
    const validKey = 'TD-9X7K-M2P4-W8N3-7B5D';
    window.history.pushState({}, '', `/?pair=${validKey}`);

    const { syncManager } = await import('../../src/services/syncManager');
    const syncSpy = vi.spyOn(syncManager, 'syncNow').mockResolvedValue({ success: true });

    render(<App />);

    expect(syncManager.getSyncKey()).toBe(validKey);
    expect(syncSpy).toHaveBeenCalled();
  });

  it('triggers syncNow when document visibility changes to visible', async () => {
    const validKey = 'TD-9X7K-M2P4-W8N3-7B5D';
    const { syncManager } = await import('../../src/services/syncManager');
    syncManager.setSyncKey(validKey);
    const syncSpy = vi.spyOn(syncManager, 'syncNow').mockResolvedValue({ success: true });

    render(<App />);
    syncSpy.mockClear();

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    fireEvent(document, new Event('visibilitychange'));

    expect(syncSpy).toHaveBeenCalled();
  });
});
