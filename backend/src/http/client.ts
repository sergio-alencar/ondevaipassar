// Retry + realistic-headers pattern ported from the old
// frontend/src/webscraping/services/httpService.js, which worked well enough
// in practice to avoid trivial bot-blocking.
const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
};

export interface FetchTextOptions {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export async function fetchText(url: string, options: FetchTextOptions = {}): Promise<string> {
  const { retries = 2, retryDelayMs = 1000, timeoutMs = 15000 } = options;

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      }
      return await response.text();
    } catch (error) {
      if (attempt >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
}
