/**
 * Normalizes user-configured Anthropic-compatible Base URL into a valid messages endpoint.
 * Supports official Anthropic, third-party endpoints (MiniMax, OpenRouter), and Cloudflare Pages relative proxy.
 */
export function getAnthropicMessagesEndpoint(baseUrl?: string): string {
  const trimmed = (baseUrl ?? '').trim();
  if (!trimmed) {
    return 'https://api.anthropic.com/v1/messages';
  }

  const cleanBase = trimmed.replace(/\/+$/, '');

  if (cleanBase.startsWith('/') && !cleanBase.includes('/messages') && !cleanBase.endsWith('/v1')) {
    return cleanBase;
  }

  if (cleanBase.endsWith('/v1/messages') || cleanBase.endsWith('/messages')) {
    return cleanBase;
  }

  if (cleanBase.endsWith('/v1')) {
    return `${cleanBase}/messages`;
  }

  return `${cleanBase}/v1/messages`;
}
