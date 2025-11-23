import { jsonSchema, tool } from 'ai';

const TAVILY_BASE_URL = 'https://api.tavily.com';
const MAX_CONTENT_LENGTH = 6000;

type RawSearchResult = {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  score?: number;
  published_date?: string;
  favicon?: string;
};

type RawSearchResponse = {
  answer?: string;
  results?: RawSearchResult[];
};

type RawExtractResult = {
  url?: string;
  title?: string;
  content?: string;
  raw_content?: string;
  images?: string[];
  favicon?: string;
};

type RawExtractResponse = {
  results?: RawExtractResult[];
  failed_results?: Array<{ url?: string; error?: string }>;
};

export type TavilySearchResult = {
  title: string;
  url: string;
  content?: string;
  score?: number;
  publishedDate?: string;
  favicon?: string;
};

export type TavilyExtractResult = {
  url: string;
  title?: string;
  content?: string;
  images?: string[];
  favicon?: string;
};

function getApiKey() {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) {
    throw new Error('Tavily API key is missing. Set TAVILY_API_KEY in your environment.');
  }
  return key;
}

function truncateContent(content: unknown, maxLength = MAX_CONTENT_LENGTH) {
  const value = typeof content === 'string' ? content.trim() : '';
  if (!value) return undefined;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

async function tavilyRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${TAVILY_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const reason =
      data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).error)
        : res.statusText || 'unknown error';
    throw new Error(`Tavily request to ${path} failed (${res.status}): ${reason}`);
  }

  if (!data) {
    throw new Error(`Tavily request to ${path} returned no data.`);
  }

  return data;
}

export async function tavilySearch(query: string, maxResults = 5) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error('Search query is required.');
  }

  const limit = Math.min(Math.max(maxResults, 1), 20);

  const data = await tavilyRequest<RawSearchResponse>('/search', {
    query: trimmedQuery,
    search_depth: 'advanced',
    max_results: limit,
    include_answer: false,
    include_raw_content: false,
    include_images: false,
    include_image_descriptions: false,
    include_favicon: true,
  });

  const results: TavilySearchResult[] = Array.isArray(data.results)
    ? data.results
        .slice(0, limit)
        .map((raw) => {
          const url = typeof raw.url === 'string' ? raw.url.trim() : '';
          if (!url) return null;
          const title =
            typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : url;
          const content = truncateContent(raw.content ?? raw.raw_content);
          const score = typeof raw.score === 'number' ? raw.score : undefined;
          const publishedDate =
            typeof raw.published_date === 'string' && raw.published_date.trim()
              ? raw.published_date.trim()
              : undefined;
          const favicon =
            typeof raw.favicon === 'string' && raw.favicon.trim()
              ? raw.favicon.trim()
              : undefined;

          return { title, url, content, score, publishedDate, favicon };
        })
        .filter((item): item is TavilySearchResult => Boolean(item))
    : [];

  return {
    query: trimmedQuery,
    answer: typeof data.answer === 'string' && data.answer.trim() ? data.answer.trim() : undefined,
    results,
  };
}

export async function tavilyExtract(urls: string[]) {
  const cleanedUrls = Array.from(
    new Set(urls.map((url) => url.trim()).filter((url) => !!url))
  ).slice(0, 5);

  if (cleanedUrls.length === 0) {
    throw new Error('At least one URL is required for extraction.');
  }

  const data = await tavilyRequest<RawExtractResponse>('/extract', {
    urls: cleanedUrls,
    extract_depth: 'advanced',
    format: 'markdown',
    include_images: false,
    include_favicon: true,
  });

  const results: TavilyExtractResult[] = Array.isArray(data.results)
    ? data.results
        .map((raw) => {
          const url = typeof raw.url === 'string' ? raw.url.trim() : '';
          if (!url) return null;

          const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : undefined;
          const content = truncateContent(raw.content ?? raw.raw_content, MAX_CONTENT_LENGTH * 2);
          const images = Array.isArray(raw.images)
            ? raw.images.filter((img) => typeof img === 'string' && img.trim()).slice(0, 10)
            : undefined;
          const favicon =
            typeof raw.favicon === 'string' && raw.favicon.trim()
              ? raw.favicon.trim()
              : undefined;

          return { url, title, content, images, favicon };
        })
        .filter((item): item is TavilyExtractResult => Boolean(item))
    : [];

  const failedResults =
    Array.isArray(data.failed_results) && data.failed_results.length > 0
      ? data.failed_results
          .map((item) => {
            const url = typeof item.url === 'string' ? item.url.trim() : undefined;
            const error = typeof item.error === 'string' ? item.error : undefined;
            if (!url && !error) return null;
            return { url, error };
          })
          .filter((item): item is { url?: string; error?: string } => Boolean(item))
      : [];

  return { results, failedResults };
}

export const tavilySearchTool = tool({
  description:
    'Search the live web with Tavily for up-to-date information. Use this when the question needs current sources. Cite sources with Markdown links in your response.',
  inputSchema: jsonSchema({
    type: 'object',
    additionalProperties: false,
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 3,
        description: 'The search query to run.',
      },
      maxResults: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        default: 5,
        description: 'Maximum number of results to return (1-20).',
      },
    },
  }),
  execute: async ({ query, maxResults }) => {
    return tavilySearch(String(query), Number(maxResults ?? 5));
  },
});

export const tavilyReadPageTool = tool({
  description:
    'Extract the readable content from one or more URLs using Tavily. Helpful for pulling quotes or verifying claims. Cite sources with Markdown links in your response.',
  inputSchema: jsonSchema({
    type: 'object',
    additionalProperties: false,
    required: ['urls'],
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string', format: 'uri' },
        minItems: 1,
        maxItems: 5,
        description: 'List of URLs to fetch and read.',
      },
    },
  }),
  execute: async ({ urls }) => {
    const list = Array.isArray(urls) ? urls : [urls];
    return tavilyExtract(list);
  },
});
