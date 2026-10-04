import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequestPost as onAnthropicPost, onRequestOptions as onAnthropicOptions } from '../../../functions/api/proxy/anthropic';
import { onRequestPost as onTtsPost, onRequestOptions as onTtsOptions } from '../../../functions/api/proxy/tts';

describe('Cloudflare Pages Functions Proxy (TDD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('/api/proxy/anthropic', () => {
    it('handles OPTIONS preflight with CORS headers', async () => {
      const res = await onAnthropicOptions();
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('forwards requests to default Anthropic endpoint when x-target-endpoint is not set', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ content: [{ type: 'text', text: 'Hola' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = mockFetch;

      const req = new Request('https://talkdrill.pages.dev/api/proxy/anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-ant-test',
        },
        body: JSON.stringify({ model: 'claude-3-5-sonnet-20241022', messages: [] }),
      });

      const res = await onAnthropicPost({ request: req });
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
        })
      );
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('forwards requests to custom upstream when x-target-endpoint is specified', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ content: [{ type: 'text', text: 'Custom Hello' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = mockFetch;

      const req = new Request('https://talkdrill.pages.dev/api/proxy/anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'minimax-key',
          'x-target-endpoint': 'https://api.minimaxi.com/anthropic/v1/messages',
        },
        body: JSON.stringify({ model: 'MiniMax-M3', messages: [] }),
      });

      const res = await onAnthropicPost({ request: req });
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.minimaxi.com/anthropic/v1/messages',
        expect.anything()
      );
    });
  });

  describe('/api/proxy/tts', () => {
    it('handles OPTIONS preflight with CORS headers', async () => {
      const res = await onTtsOptions();
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('returns 400 error when x-target-endpoint header is missing', async () => {
      const req = new Request('https://talkdrill.pages.dev/api/proxy/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'test' }),
      });

      const res = await onTtsPost({ request: req });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing x-target-endpoint');
    });

    it('forwards TTS request to specified endpoint with authorization header', async () => {
      const mockAudio = new Uint8Array([1, 2, 3]).buffer;
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(mockAudio, {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        })
      );
      globalThis.fetch = mockFetch;

      const req = new Request('https://talkdrill.pages.dev/api/proxy/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer openai-key',
          'x-target-endpoint': encodeURIComponent('https://api.openai.com/v1/audio/speech'),
        },
        body: JSON.stringify({ input: 'Hola' }),
      });

      const res = await onTtsPost({ request: req });
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/speech',
        expect.anything()
      );
    });
  });
});
