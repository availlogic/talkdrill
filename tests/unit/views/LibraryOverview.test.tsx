import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LibraryOverview } from '../../../src/views/LibraryOverview';
import { db } from '../../../src/storage/db';
import { corpusService } from '../../../src/services/corpusService';

describe('LibraryOverview View (TDD)', () => {
  beforeEach(async () => {
    await db.articles.clear();
    await db.audios.clear();
    await db.drillLogs.clear();
  });

  it('renders empty state illustration and CTA when no drills exist', async () => {
    render(<LibraryOverview onSelectArticle={vi.fn()} onNewArticle={vi.fn()} onOpenSettings={vi.fn()} />);

    expect(await screen.findByText('No Shadowing Drills Yet')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create First Drill' })).toBeDefined();
  });

  it('renders list of article cards with progress and language tags', async () => {
    await corpusService.createArticle({
      title: 'Restaurante en Madrid',
      sourceText: 'Hello',
      targetText: '¿Nos cobras, por favor?',
      sourceLang: 'en',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 500,
    });

    render(<LibraryOverview onSelectArticle={vi.fn()} onNewArticle={vi.fn()} onOpenSettings={vi.fn()} />);

    expect(await screen.findByText('Restaurante en Madrid')).toBeDefined();
    expect(screen.getByText('es-ES')).toBeDefined();
    expect(screen.getByText('0 / 500 reps')).toBeDefined();
  });

  it('calls onSelectArticle when an article card is clicked', async () => {
    const art = await corpusService.createArticle({
      title: 'Spanish Shadowing',
      sourceText: '',
      targetText: '¡Buenos días a todos!',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    const selectSpy = vi.fn();
    render(<LibraryOverview onSelectArticle={selectSpy} onNewArticle={vi.fn()} onOpenSettings={vi.fn()} />);

    const card = await screen.findByText('Spanish Shadowing');
    fireEvent.click(card);
    expect(selectSpy).toHaveBeenCalledWith(art.id);
  });

  it('calls onNewArticle when create button is clicked', async () => {
    const newSpy = vi.fn();
    render(<LibraryOverview onSelectArticle={vi.fn()} onNewArticle={newSpy} onOpenSettings={vi.fn()} />);

    const newBtn = await screen.findByRole('button', { name: 'Create First Drill' });
    fireEvent.click(newBtn);
    expect(newSpy).toHaveBeenCalledTimes(1);
  });

  it('navigates to settings when settings button is clicked', async () => {
    const settingsSpy = vi.fn();
    render(<LibraryOverview onSelectArticle={vi.fn()} onNewArticle={vi.fn()} onOpenSettings={settingsSpy} />);

    const settingsBtn = await screen.findByRole('button', { name: 'Settings' });
    fireEvent.click(settingsBtn);
    expect(settingsSpy).toHaveBeenCalledTimes(1);
  });

  it('filters between active and archived drills and allows deleting an article', async () => {
    const art = await corpusService.createArticle({
      title: 'Drill to Delete',
      sourceText: '',
      targetText: 'Texto',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    // Mock confirm
    window.confirm = vi.fn().mockReturnValue(true);

    render(<LibraryOverview onSelectArticle={vi.fn()} onNewArticle={vi.fn()} onOpenSettings={vi.fn()} />);

    // Switch to archived tab
    const archivedTab = await screen.findByRole('button', { name: 'Archived' });
    fireEvent.click(archivedTab);
    await waitFor(() => expect(screen.queryByText('Drill to Delete')).toBeNull());

    // Switch back to active tab
    const activeTab = screen.getByRole('button', { name: 'Active' });
    fireEvent.click(activeTab);

    const deleteBtn = await screen.findByRole('button', { name: `Delete ${art.title}` });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
  });

  it('correctly filters active vs archived drills', async () => {
    await corpusService.createArticle({
      title: 'Active Drill Item',
      sourceText: '',
      targetText: 'Activo',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    const archivedArt = await corpusService.createArticle({
      title: 'Archived Drill Item',
      sourceText: '',
      targetText: 'Archivado',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });
    await corpusService.updateArticle(archivedArt.id, { isArchived: true });

    render(<LibraryOverview onSelectArticle={vi.fn()} onNewArticle={vi.fn()} onOpenSettings={vi.fn()} />);

    // Active tab initially
    expect(await screen.findByText('Active Drill Item')).toBeDefined();
    expect(screen.queryByText('Archived Drill Item')).toBeNull();

    // Click Archived tab
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
    expect(await screen.findByText('Archived Drill Item')).toBeDefined();
    expect(screen.queryByText('Active Drill Item')).toBeNull();
  });

  it('allows archiving and restoring drills from card actions', async () => {
    const art = await corpusService.createArticle({
      title: 'Card To Archive',
      sourceText: '',
      targetText: 'Prueba',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    render(<LibraryOverview onSelectArticle={vi.fn()} onNewArticle={vi.fn()} onOpenSettings={vi.fn()} />);

    // Find and click archive button on the card
    const archiveBtn = await screen.findByRole('button', { name: `Archive ${art.title}` });
    fireEvent.click(archiveBtn);

    // Should no longer be in active list
    await waitFor(() => expect(screen.queryByText('Card To Archive')).toBeNull());

    // Go to Archived tab
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
    expect(await screen.findByText('Card To Archive')).toBeDefined();

    // Restore it
    const restoreBtn = await screen.findByRole('button', { name: `Restore ${art.title}` });
    fireEvent.click(restoreBtn);

    // Should disappear from archived tab
    await waitFor(() => expect(screen.queryByText('Card To Archive')).toBeNull());
  });

  it('triggers onEditArticle when Edit button on card is clicked', async () => {
    const art = await corpusService.createArticle({
      title: 'Drill To Edit',
      sourceText: '',
      targetText: 'Para editar',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
    });

    const editSpy = vi.fn();
    render(
      <LibraryOverview
        onSelectArticle={vi.fn()}
        onNewArticle={vi.fn()}
        onOpenSettings={vi.fn()}
        onEditArticle={editSpy}
      />
    );

    const editBtn = await screen.findByRole('button', { name: `Edit ${art.title}` });
    fireEvent.click(editBtn);

    expect(editSpy).toHaveBeenCalledWith(art.id);
  });
});
