import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CorpusStudio } from '../../../src/views/CorpusStudio';
import { db } from '../../../src/storage/db';

describe('CorpusStudio View (TDD)', () => {
  beforeEach(async () => {
    await db.articles.clear();
    await db.audios.clear();
    await db.drillLogs.clear();
  });

  it('switches between Mode A (Direct Foreign) and Mode B (AI Translation)', () => {
    render(<CorpusStudio onCancel={vi.fn()} onStartDrill={vi.fn()} />);

    const modeABtn = screen.getByRole('button', { name: 'Direct Foreign Text' });
    const modeBBtn = screen.getByRole('button', { name: 'AI Spoken Translation' });

    expect(modeABtn.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(modeBBtn);
    expect(modeBBtn.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Translate to Spoken Target' })).toBeDefined();
  });

  it('allows text input and title customization', () => {
    render(<CorpusStudio onCancel={vi.fn()} onStartDrill={vi.fn()} />);

    const titleInput = screen.getByPlaceholderText('Enter drill title (optional)');
    fireEvent.change(titleInput, { target: { value: 'Pedido en Restaurante' } });
    expect((titleInput as HTMLInputElement).value).toBe('Pedido en Restaurante');

    const textArea = screen.getByPlaceholderText('Enter or paste foreign text here...');
    fireEvent.change(textArea, { target: { value: 'Una mesa para dos, por favor.' } });
    expect((textArea as HTMLTextAreaElement).value).toBe('Una mesa para dos, por favor.');
  });

  it('saves article and triggers onStartDrill', async () => {
    const drillSpy = vi.fn();
    render(<CorpusStudio onCancel={vi.fn()} onStartDrill={drillSpy} />);

    const titleInput = screen.getByPlaceholderText('Enter drill title (optional)');
    fireEvent.change(titleInput, { target: { value: 'Cafe drill' } });

    const textArea = screen.getByPlaceholderText('Enter or paste foreign text here...');
    fireEvent.change(textArea, { target: { value: 'Dos cafés solos, gracias.' } });

    const submitBtn = screen.getByRole('button', { name: 'Save and Start Drill' });
    fireEvent.click(submitBtn);

    await waitFor(async () => {
      expect(drillSpy).toHaveBeenCalledTimes(1);
      const articleId = drillSpy.mock.calls[0]?.[0];
      const saved = await db.articles.get(articleId);
      expect(saved?.title).toBe('Cafe drill');
      expect(saved?.targetText).toBe('Dos cafés solos, gracias.');
    });
  });

  it('triggers AI translation in Mode B', async () => {
    render(<CorpusStudio onCancel={vi.fn()} onStartDrill={vi.fn()} />);

    // Switch to Mode B
    fireEvent.click(screen.getByRole('button', { name: 'AI Spoken Translation' }));

    const sourceArea = screen.getByPlaceholderText('Enter original text or expression draft to translate into idiomatic spoken target text...');
    fireEvent.change(sourceArea, { target: { value: '买单，谢谢。' } });

    // Mock fetch for translation
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'La cuenta, por favor.' }],
      }),
    } as Response);

    const translateBtn = screen.getByRole('button', { name: 'Translate to Spoken Target' });
    fireEvent.click(translateBtn);

    await waitFor(() => {
      const targetArea = screen.getByPlaceholderText('Translated spoken target text will appear here...') as HTMLTextAreaElement;
      expect(targetArea.value).toBe('La cuenta, por favor.');
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const cancelSpy = vi.fn();
    render(<CorpusStudio onCancel={cancelSpy} onStartDrill={vi.fn()} />);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('handles language and target reps selection, file parsing and audio upload without in-app TTS button', async () => {
    render(<CorpusStudio onCancel={vi.fn()} onStartDrill={vi.fn()} />);

    // In current version, in-app TTS generation button must not be present
    expect(screen.queryByRole('button', { name: /Generate AI Voice/i })).toBeNull();
    expect(screen.getByText(/Upload Reference Audio/i)).toBeDefined();

    // Select target language
    const langSelect = screen.getByLabelText('Target Language') as HTMLSelectElement;
    fireEvent.change(langSelect, { target: { value: 'en-US' } });
    expect(langSelect.value).toBe('en-US');

    // Select target count
    const countSelect = screen.getByLabelText('Muscle Memory Target Reps') as HTMLSelectElement;
    fireEvent.change(countSelect, { target: { value: '300' } });
    expect(countSelect.value).toBe('300');

    // Test text file upload
    const txtInput = document.querySelector('input[type="file"][accept=".txt"]') as HTMLInputElement;
    const txtFile = new File(['Imported text content'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(txtInput, { target: { files: [txtFile] } });

    await waitFor(() => {
      const targetArea = screen.getByPlaceholderText('Enter or paste foreign text here...') as HTMLTextAreaElement;
      expect(targetArea.value).toBe('Imported text content');
    });

    // Test audio upload
    const audioInput = document.querySelector('input[type="file"][accept="audio/*"]') as HTMLInputElement;
    const audioFile = new File(['fake-mp3-bytes'], 'speech.mp3', { type: 'audio/mpeg' });
    fireEvent.change(audioInput, { target: { files: [audioFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Audio Ready/i)).toBeDefined();
    });
  });

  it('loads existing drill in edit mode and saves updates without losing repetition count', async () => {
    await db.articles.add({
      id: 'art-edit-existing',
      title: 'Original Title',
      sourceText: 'Hello original',
      targetText: 'Hola original',
      sourceLang: 'en-US',
      targetLang: 'es-ES',
      mode: 'translate_needed',
      targetCount: 500,
      currentCount: 142,
      createdAt: 1000,
      updatedAt: 1000,
      isArchived: 0,
    });

    const drillSpy = vi.fn();
    render(<CorpusStudio editArticleId="art-edit-existing" onCancel={vi.fn()} onStartDrill={drillSpy} />);

    // Check header and button
    expect(await screen.findByText('Edit Drill')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDefined();

    // Verify existing fields pre-filled once async data is loaded
    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText('Enter drill title (optional)') as HTMLInputElement;
      expect(titleInput.value).toBe('Original Title');
    });

    const titleInput = screen.getByPlaceholderText('Enter drill title (optional)') as HTMLInputElement;
    const sourceArea = screen.getByPlaceholderText('Enter original text or expression draft to translate into idiomatic spoken target text...') as HTMLTextAreaElement;
    expect(sourceArea.value).toBe('Hello original');

    const targetArea = screen.getByPlaceholderText('Translated spoken target text will appear here...') as HTMLTextAreaElement;
    expect(targetArea.value).toBe('Hola original');

    // Modify fields
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    fireEvent.change(sourceArea, { target: { value: 'Hello modified' } });
    fireEvent.change(targetArea, { target: { value: 'Hola modificado' } });

    // Click Save Changes
    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      expect(drillSpy).toHaveBeenCalledWith('art-edit-existing');
      const updatedInDb = await db.articles.get('art-edit-existing');
      expect(updatedInDb?.title).toBe('Updated Title');
      expect(updatedInDb?.sourceText).toBe('Hello modified');
      expect(updatedInDb?.targetText).toBe('Hola modificado');
      // Crucial: currentCount must NOT be reset
      expect(updatedInDb?.currentCount).toBe(142);
    });
  });

  it('loads existing audio in edit mode and allows removing audio', async () => {
    const artId = 'art-with-audio';
    await db.articles.add({
      id: artId,
      title: 'Audio Edit Test',
      sourceText: '',
      targetText: 'Texto con audio',
      sourceLang: 'es-ES',
      targetLang: 'es-ES',
      mode: 'direct_foreign',
      targetCount: 300,
      currentCount: 50,
      createdAt: 1000,
      updatedAt: 1000,
      isArchived: 0,
    });

    await db.audios.add({
      id: 'existing-audio-id',
      articleId: artId,
      blob: new Blob(['audio-data'], { type: 'audio/mpeg' }),
      mimeType: 'audio/mpeg',
      fileName: 'existing.mp3',
      fileSize: 10,
      duration: 5,
      sourceType: 'upload',
      createdAt: 1000,
    });

    const drillSpy = vi.fn();
    render(<CorpusStudio editArticleId={artId} onCancel={vi.fn()} onStartDrill={drillSpy} />);

    // Verify audio ready is shown
    expect(await screen.findByText(/Audio Ready/i)).toBeDefined();

    // Click Remove audio
    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeBtn);
    expect(screen.queryByText(/Audio Ready/i)).toBeNull();

    // Save changes
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(async () => {
      expect(drillSpy).toHaveBeenCalledWith(artId);
      const remainingAudios = await db.audios.where('articleId').equals(artId).toArray();
      expect(remainingAudios.length).toBe(0);
    });
  });
});
