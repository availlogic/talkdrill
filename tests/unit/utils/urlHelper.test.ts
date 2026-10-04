import { describe, it, expect } from 'vitest';
import { getAnthropicMessagesEndpoint } from '../../../src/utils/urlHelper';

describe('urlHelper (TDD)', () => {
  describe('getAnthropicMessagesEndpoint', () => {
    it('normalizes bare official Anthropic domain to v1/messages', () => {
      expect(getAnthropicMessagesEndpoint('https://api.anthropic.com')).toBe('https://api.anthropic.com/v1/messages');
      expect(getAnthropicMessagesEndpoint('https://api.anthropic.com/')).toBe('https://api.anthropic.com/v1/messages');
    });

    it('normalizes official Anthropic with v1 suffix to v1/messages', () => {
      expect(getAnthropicMessagesEndpoint('https://api.anthropic.com/v1')).toBe('https://api.anthropic.com/v1/messages');
      expect(getAnthropicMessagesEndpoint('https://api.anthropic.com/v1/')).toBe('https://api.anthropic.com/v1/messages');
    });

    it('preserves complete Anthropic-compatible endpoints ending in /v1/messages or /messages', () => {
      expect(getAnthropicMessagesEndpoint('https://api.minimaxi.com/anthropic/v1/messages')).toBe('https://api.minimaxi.com/anthropic/v1/messages');
      expect(getAnthropicMessagesEndpoint('https://api.minimaxi.com/anthropic/v1/messages/')).toBe('https://api.minimaxi.com/anthropic/v1/messages');
      expect(getAnthropicMessagesEndpoint('https://my-proxy.com/messages')).toBe('https://my-proxy.com/messages');
      expect(getAnthropicMessagesEndpoint('https://my-proxy.com/messages/')).toBe('https://my-proxy.com/messages');
    });

    it('normalizes third-party Anthropic-compatible endpoints with custom subpaths', () => {
      expect(getAnthropicMessagesEndpoint('https://openrouter.ai/api/v1')).toBe('https://openrouter.ai/api/v1/messages');
      expect(getAnthropicMessagesEndpoint('https://my-proxy.com/anthropic/v1')).toBe('https://my-proxy.com/anthropic/v1/messages');
      expect(getAnthropicMessagesEndpoint('https://custom.internal/api')).toBe('https://custom.internal/api/v1/messages');
    });

    it('preserves same-origin Cloudflare Pages Functions relative proxy path', () => {
      expect(getAnthropicMessagesEndpoint('/api/proxy/anthropic')).toBe('/api/proxy/anthropic');
      expect(getAnthropicMessagesEndpoint('/api/proxy/anthropic/')).toBe('/api/proxy/anthropic');
      expect(getAnthropicMessagesEndpoint('/api/proxy/anthropic/messages')).toBe('/api/proxy/anthropic/messages');
    });

    it('falls back to official Anthropic v1/messages when empty or undefined', () => {
      expect(getAnthropicMessagesEndpoint('')).toBe('https://api.anthropic.com/v1/messages');
      expect(getAnthropicMessagesEndpoint('   ')).toBe('https://api.anthropic.com/v1/messages');
      expect(getAnthropicMessagesEndpoint(undefined)).toBe('https://api.anthropic.com/v1/messages');
    });
  });
});
