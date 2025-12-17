'use client';

import * as React from 'react';
import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useChat } from '@ai-sdk/react';
import type { ChatStatus, FileUIPart, ToolUIPart, UIMessage } from 'ai';
import {
  Conversation,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import { MessageLoading } from '@/components/ui/message-loading';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
} from '@/components/ai-elements/chain-of-thought';
import { Actions, Action } from '@/components/ai-elements/actions';
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from '@/components/ai-elements/context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { RefreshCcwIcon, Trash2Icon, CopyIcon, CheckIcon, Brain as BrainIcon, GlobeIcon, Download as DownloadIcon, PencilIcon, XIcon, SendIcon, FileTextIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authClient } from '@/lib/auth-client';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  addConversationOptimistically,
  revalidateConversations,
  generateConversationTitleAsync,
} from '@/lib/conversations-cache';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AGENT_MODEL_CHANGE_EVENT, AGENT_NEW_CHAT_EVENT, AgentModelChangeEvent, AgentNewChatEvent, dispatchAgentModelChange } from '@/lib/agent-events';
import { deriveProviderSlug, getDisplayName } from '@/lib/model-display';
import { ProviderAvatar } from '@/components/ProviderAvatar';
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from '@/components/ai-elements/source';

interface ChatProps {
  className?: string;
  systemPrompt?: string;
  model?: string;
  modelOptions?: string[];
  avatarUrl?: string; // optional avatar URL like /avatars/filename.png
  getChatContext?: () => { systemPrompt?: string; model?: string } | null;
  isAuthenticated?: boolean;
  agentTag?: string;
  initialConversationId?: string;
  initialMessages?: unknown[];
  // Optional knowledge text to persist as a system message at conversation creation time
  knowledgeText?: string;
  showModelSelectorInPrompt?: boolean;
}

type UsageSnapshot = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
};

interface BasicUIPart {
  type: string;
  text?: string;
  title?: string;
  url?: string;
  data?: string;
  input?: unknown;
  output?: unknown;
  args?: unknown;
  errorText?: string;
  rawInput?: unknown;
  toolCallId?: string;
  mediaType?: string;
  filename?: string;
  sourceId?: string;
  file?: {
    base64?: string;
    mediaType?: string;
    url?: string;
  };
  toolInvocation?: {
    toolCallId: string;
    toolName: string;
    args: unknown;
    result?: unknown;
  };
  state?: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  error?: string;
}
interface BasicUISource { title: string; url: string }
interface BasicUIAnnotation { type: string; value?: BasicUISource[] }
interface BasicUIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: BasicUIPart[];
  annotations?: BasicUIAnnotation[];
}

const ModelLabel = React.memo(function ModelLabel({ label, providerSlug }: { label: string; providerSlug: string | null }) {
  return (
    <div className="flex items-center gap-2 truncate">
      <ProviderAvatar providerSlug={providerSlug} size={20} />
      <span className="truncate text-sm">{label}</span>
    </div>
  );
});
ModelLabel.displayName = 'ModelLabel';

const InlineModelSelector = React.memo(function InlineModelSelector({
  models,
  value,
  onChange,
}: {
  models: string[];
  value?: string;
  onChange: (modelId: string) => void;
}) {
  const availableModels = useMemo(
    () => Array.from(new Set(models.filter((m) => typeof m === 'string' && m.trim().length > 0))),
    [models]
  );
  const selectedValue = useMemo(() => {
    if (value && availableModels.includes(value)) return value;
    return availableModels[0] ?? '';
  }, [availableModels, value]);
  const modelsWithMeta = useMemo(
    () =>
      availableModels.map((id) => ({
        id,
        label: getDisplayName(undefined, id),
        providerSlug: deriveProviderSlug(undefined, id),
      })),
    [availableModels]
  );
  const selectedMeta = useMemo(
    () => modelsWithMeta.find((m) => m.id === selectedValue),
    [modelsWithMeta, selectedValue]
  );

  if (!selectedValue) return null;

  if (availableModels.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/60 px-3 py-1.5">
        <ModelLabel
          label={selectedMeta?.label || getDisplayName(undefined, selectedValue)}
          providerSlug={selectedMeta?.providerSlug || deriveProviderSlug(undefined, selectedValue)}
        />
      </div>
    );
  }

  return (
    <Select value={selectedValue} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full min-w-[140px] max-w-[240px] text-sm">
        <SelectValue asChild>
          <ModelLabel
            label={selectedMeta?.label || getDisplayName(undefined, selectedValue)}
            providerSlug={selectedMeta?.providerSlug || deriveProviderSlug(undefined, selectedValue)}
          />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {modelsWithMeta.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            <ModelLabel label={m.label} providerSlug={m.providerSlug} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
InlineModelSelector.displayName = 'InlineModelSelector';

const isSearchToolName = (toolName: string): boolean => {
  const lowerName = toolName.toLowerCase();
  return (
    lowerName.includes('web-search') ||
    lowerName.includes('web_search') ||
    lowerName.includes('websearch') ||
    lowerName.includes('search-web') ||
    lowerName.includes('search_web') ||
    lowerName.includes('tavily') ||
    lowerName === 'search'
  );
};

const isReadToolName = (toolName: string): boolean => {
  const lowerName = toolName.toLowerCase();
  return (
    lowerName.includes('read-page') ||
    lowerName.includes('read_page') ||
    lowerName.includes('readpage') ||
    lowerName.includes('fetch-url') ||
    lowerName.includes('fetch_url') ||
    lowerName.includes('fetchurl') ||
    lowerName.includes('read-url') ||
    lowerName.includes('read_url') ||
    lowerName.includes('readurl') ||
    lowerName.includes('scrape')
  );
};

type PromptInputFormProps = {
  text: string;
  status: ChatStatus;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  onStop: () => void;
  onChangeText: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  webSearchOn: boolean;
  onToggleWebSearch: () => void;
  renderContextControl: () => React.ReactNode;
  supportsReasoning: boolean;
  reasoningOn: boolean;
  onToggleReasoning: () => void;
  showModelSelectorInPrompt: boolean;
  modelChoices: string[];
  currentModel?: string;
  onModelChange: (modelId: string) => void;
  className?: string;
};

const PromptInputForm = React.memo(function PromptInputForm({
  text,
  status,
  onSubmit,
  onStop,
  onChangeText,
  textareaRef,
  webSearchOn,
  onToggleWebSearch,
  renderContextControl,
  supportsReasoning,
  reasoningOn,
  onToggleReasoning,
  showModelSelectorInPrompt,
  modelChoices,
  currentModel,
  onModelChange,
  className,
}: PromptInputFormProps) {
  const isSubmitDisabled = status !== 'streaming' && !text.trim();

  return (
    <PromptInput
      onSubmit={onSubmit}
      className={className}
      multiple
      maxFiles={10}
      maxFileSize={10 * 1024 * 1024} // 10MB
    >
      <PromptInputBody>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment key={attachment.id} data={attachment} />}
        </PromptInputAttachments>
        <div className="grid items-end gap-2 p-2 grid-cols-[auto_1fr_auto] grid-rows-[auto_auto] w-full">
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            onChange={(e) => onChangeText(e.target.value)}
            value={text}
            placeholder="Type your message..."
            className="min-h-[40px] py-2 text-base row-start-1 col-start-1 col-end-4"
          />
          <div className="row-start-2 col-start-1">
            <div className="flex items-center gap-1">
              {/* Direct file upload button - no dropdown needed */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <PromptInputButton
                    onClick={() => {
                      // Access the file input through form
                      const form = document.querySelector('form');
                      const input = form?.querySelector('input[type="file"]') as HTMLInputElement;
                      input?.click();
                    }}
                    className="transition-all duration-200 hover:scale-105 active:scale-95"
                    aria-label="Add files"
                  >
                    <PlusIcon className="size-4" />
                  </PromptInputButton>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Add files</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer',
                      'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                      webSearchOn
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                    onClick={onToggleWebSearch}
                    aria-pressed={webSearchOn}
                    aria-label={webSearchOn ? 'Turn web search off' : 'Turn web search on'}
                  >
                    <GlobeIcon className="size-3.5" />
                    <span>Search</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Web Search: {webSearchOn ? 'On' : 'Off'}</TooltipContent>
              </Tooltip>
              {renderContextControl()}
              {supportsReasoning && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer',
                        'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                        reasoningOn
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                      onClick={onToggleReasoning}
                      aria-pressed={reasoningOn}
                      aria-label={reasoningOn ? 'Turn reasoning off' : 'Turn reasoning on'}
                    >
                      <BrainIcon className="size-3.5" />
                      <span>Reason</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>{reasoningOn ? 'Reasoning: On' : 'Reasoning: Off'}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          {showModelSelectorInPrompt && modelChoices.length > 0 && (
            <div className="row-start-2 col-start-2 flex justify-center md:justify-end">
              <InlineModelSelector
                models={modelChoices}
                value={currentModel}
                onChange={onModelChange}
              />
            </div>
          )}
          <div className="row-start-2 col-start-3">
            <PromptInputSubmit
              disabled={isSubmitDisabled}
              status={status}
              onStop={onStop}
              className="shrink-0"
            />
          </div>
        </div>
      </PromptInputBody>
    </PromptInput >
  );
});
PromptInputForm.displayName = 'PromptInputForm';

const getImageSrcFromPart = (part: BasicUIPart): string | null => {
  if (part.type !== 'file') return null;

  const mediaType = (part.mediaType || part.file?.mediaType || '').trim();
  const rawContent =
    (typeof part.url === 'string' && part.url.trim()) ||
    (typeof part.data === 'string' && part.data.trim()) ||
    (typeof part.file?.url === 'string' && part.file.url.trim()) ||
    (typeof part.file?.base64 === 'string' && part.file.base64.trim()) ||
    '';

  if (!rawContent) return null;

  const isImageLike =
    mediaType.startsWith('image/') ||
    /^data:image\//i.test(rawContent) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(rawContent);

  if (!isImageLike) return null;

  if (/^(data:|[a-z][a-z0-9+.-]*:|\/)/i.test(rawContent)) {
    return rawContent;
  }

  const safeMediaType = mediaType || 'image/png';
  return `data:${safeMediaType};base64,${rawContent}`;
};

const pickFirstString = (value: unknown, keys: string[]): string | null => {
  if (!value || typeof value !== 'object') return null;
  const asRecord = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = asRecord[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
};

const extractSourcesFromToolOutput = (output: unknown): BasicUISource[] => {
  if (!output || typeof output !== 'object') return [];
  const sources: BasicUISource[] = [];
  const seen = new Set<string>();
  const asRecord = output as Record<string, unknown>;

  if (Array.isArray(asRecord.results)) {
    for (const [idx, item] of (asRecord.results as unknown[]).entries()) {
      if (!item || typeof item !== 'object') continue;
      const url = pickFirstString(item, ['url', 'link', 'href', 'pageUrl', 'page_url']);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const title =
        pickFirstString(item, ['title', 'name', 'heading']) ?? `Result ${idx + 1}`;
      sources.push({ title, url });
    }
  }

  const singleUrl = pickFirstString(asRecord, ['url', 'page_url', 'pageUrl', 'link', 'href']);
  if (singleUrl && !seen.has(singleUrl)) {
    seen.add(singleUrl);
    const title =
      pickFirstString(asRecord, ['title', 'name', 'heading', 'pageTitle']) ?? 'Source';
    sources.push({ title, url: singleUrl });
  }

  return sources;
};

const extractSourcesFromToolPart = (part: BasicUIPart): BasicUISource[] => {
  const toolName =
    part.toolInvocation?.toolName ||
    (typeof part.type === 'string' && part.type.startsWith('tool-') ? part.type.replace(/^tool-/, '') : null);
  if (!toolName) return [];

  const toolInput = part.toolInvocation?.args ?? part.input ?? part.rawInput ?? part.args ?? null;
  const toolOutput = part.toolInvocation?.result ?? part.output ?? null;
  const sources: BasicUISource[] = [];
  const seen = new Set<string>();

  const addIfNew = (source: BasicUISource | null) => {
    if (!source?.url || seen.has(source.url)) return;
    seen.add(source.url);
    sources.push(source);
  };

  if (isReadToolName(toolName)) {
    const urlFromInput = pickFirstString(toolInput, ['url', 'page_url', 'pageUrl', 'link', 'href']);
    addIfNew(urlFromInput ? { title: 'Read page', url: urlFromInput } : null);
    extractSourcesFromToolOutput(toolOutput).forEach(addIfNew);
  }

  if (isSearchToolName(toolName)) {
    extractSourcesFromToolOutput(toolOutput).forEach(addIfNew);
  }

  return sources;
};

function extractSources(text: string) {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const sources: Array<{ title: string; url: string }> = [];
  const seenUrls = new Set<string>();

  let match;
  while ((match = regex.exec(text)) !== null) {
    const [, title, url] = match;
    if (!seenUrls.has(url)) {
      sources.push({ title, url });
      seenUrls.add(url);
    }
  }
  return sources;
}

function getToolDisplayInfo(
  toolName: string,
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error',
  input?: unknown,
  output?: unknown
): { displayName: string; hideStatus: boolean; icon: React.ReactNode | null; preview: string | null; fullPreview: string | null } {
  const isRunning = state === 'input-streaming' || state === 'input-available';
  const isComplete = state === 'output-available';

  // Helper to extract a string value from an object by key paths
  const extractFromObject = (obj: unknown, keys: string[]): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    const objRecord = obj as Record<string, unknown>;
    for (const key of keys) {
      const value = objRecord[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  };

  // Helper to truncate text for preview
  const truncate = (text: string, maxLen = 60): string => {
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  };

  // Helper to extract preview from input (returns both truncated and full)
  const extractPreviewPair = (keys: string[]): { preview: string | null; fullPreview: string | null } => {
    const result = extractFromObject(input, keys);
    if (!result) return { preview: null, fullPreview: null };
    return { preview: truncate(result), fullPreview: result };
  };

  // Helper to extract title from output (handles results array structure)
  const extractTitleFromOutput = (): { preview: string | null; fullPreview: string | null } => {
    if (!output || typeof output !== 'object') return { preview: null, fullPreview: null };
    const outputObj = output as Record<string, unknown>;

    // Check for results array (common pattern: { results: [{ title, url, ... }] })
    if (Array.isArray(outputObj.results) && outputObj.results.length > 0) {
      const firstResult = outputObj.results[0] as Record<string, unknown>;
      const title = extractFromObject(firstResult, ['title', 'name', 'heading']);
      if (title) return { preview: truncate(title, 80), fullPreview: title };
    }

    // Check for direct title field
    const directTitle = extractFromObject(outputObj, ['title', 'name', 'heading', 'pageTitle']);
    if (directTitle) return { preview: truncate(directTitle, 80), fullPreview: directTitle };

    return { preview: null, fullPreview: null };
  };

  // Web search tool
  if (isSearchToolName(toolName)) {
    const { preview, fullPreview } = extractPreviewPair(['query', 'search_query', 'searchQuery', 'q', 'text', 'input']);
    return {
      displayName: isRunning ? 'Searching The Web' : isComplete ? 'Searched The Web' : toolName,
      hideStatus: true,
      icon: <SearchIcon className={`size-4 shrink-0 ${isRunning ? 'text-blue-500 animate-pulse' : 'text-blue-500'}`} />,
      preview,
      fullPreview,
    };
  }

  // Read page tool
  if (isReadToolName(toolName)) {
    // When complete, show the page title from output; otherwise show the URL from input
    let previewPair = { preview: null as string | null, fullPreview: null as string | null };
    if (isComplete) {
      previewPair = extractTitleFromOutput();
    }
    if (!previewPair.preview) {
      previewPair = extractPreviewPair(['url', 'page_url', 'pageUrl', 'link', 'href']);
    }

    return {
      displayName: isRunning ? 'Reading Page' : isComplete ? 'Read Page' : toolName,
      hideStatus: true,
      icon: <FileTextIcon className={`size-4 shrink-0 ${isRunning ? 'text-green-500 animate-pulse' : 'text-green-500'}`} />,
      preview: previewPair.preview,
      fullPreview: previewPair.fullPreview,
    };
  }

  // Default - use original name and show status
  return { displayName: toolName, hideStatus: false, icon: null, preview: null, fullPreview: null };
}

// Types for grouped message parts
type ThinkingStepType = 'reasoning' | 'tool';
interface ThinkingStep {
  type: ThinkingStepType;
  index: number;
  part: BasicUIPart;
}
interface ThinkingGroup {
  type: 'thinking';
  steps: ThinkingStep[];
  startIndex: number;
}
interface ContentGroup {
  type: 'content';
  part: BasicUIPart;
  index: number;
}
type PartGroup = ThinkingGroup | ContentGroup;

/**
 * Groups message parts into thinking groups (consecutive reasoning + tools) and content groups.
 * This allows us to render all reasoning/tool steps in a single ChainOfThought block.
 */
function groupMessageParts(parts: BasicUIPart[]): PartGroup[] {
  const groups: PartGroup[] = [];
  let currentThinkingGroup: ThinkingGroup | null = null;

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const partType = part.type;

    // Skip step-start markers
    if (partType === 'step-start') {
      continue;
    }

    // Check if this is a "thinking" part (reasoning or tool)
    const isReasoning = partType === 'reasoning';
    const isToolInvocation = partType === 'tool-invocation';
    const isToolPart = typeof partType === 'string' && partType.startsWith('tool-');
    const isThinkingPart = isReasoning || isToolInvocation || isToolPart;

    if (isThinkingPart) {
      // Start a new thinking group if needed
      if (currentThinkingGroup === null) {
        currentThinkingGroup = {
          type: 'thinking',
          steps: [],
          startIndex: index,
        };
      }

      // Add to current thinking group
      currentThinkingGroup.steps.push({
        type: isReasoning ? 'reasoning' : 'tool',
        index,
        part,
      });
    } else {
      // This is a content part (text, file, etc.)
      // First, close any open thinking group
      if (currentThinkingGroup !== null) {
        groups.push(currentThinkingGroup);
        currentThinkingGroup = null;
      }

      // Add the content part
      groups.push({
        type: 'content',
        part,
        index,
      });
    }
  }

  // Don't forget any trailing thinking group
  if (currentThinkingGroup !== null) {
    groups.push(currentThinkingGroup);
  }

  return groups;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Unsupported FileReader result'));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

async function convertFilesToUIParts(files: File[]): Promise<FileUIPart[]> {
  const parts = await Promise.all(
    files.map(async (file) => {
      try {
        const url = await fileToDataUrl(file);
        return {
          type: 'file',
          mediaType: file.type || 'application/octet-stream',
          filename: file.name,
          url,
        } satisfies FileUIPart;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to convert file to UI part', { fileName: file.name, error });
        }
        return null;
      }
    })
  );

  return parts.filter(Boolean) as FileUIPart[];
}

function useThrottledValue<T>(value: T, fps: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdateRef = useRef<number>(0);
  useEffect(() => {
    const now = performance.now();
    const minInterval = 1000 / Math.max(1, fps);
    const elapsed = now - lastUpdateRef.current;

    if (elapsed >= minInterval) {
      lastUpdateRef.current = now;
      setThrottledValue(value);
      return;
    }

    const handle = window.setTimeout(() => {
      lastUpdateRef.current = performance.now();
      setThrottledValue(value);
    }, minInterval - elapsed);

    return () => window.clearTimeout(handle);
  }, [fps, value]);

  return throttledValue;
}

type StableMarkdownSplit = { stable: string; live: string };

/**
 * Split text into a "stable" prefix (safe to render as markdown) and a "live" suffix.
 * Boundaries are more aggressive: blank lines, closed fences, and sentence punctuation
 * every ~80 chars. This surfaces formatting sooner while keeping markdown rerenders bounded.
 */
function splitStableMarkdown(text: string): StableMarkdownSplit {
  if (!text) return { stable: '', live: '' };

  const MIN_CHARS_BETWEEN_BOUNDARIES = 80;
  const MAX_LIVE_CHARS = 320;

  let inFence = false;
  let lastBoundary = 0;
  let cursor = 0;

  const maybeMarkBoundary = (pos: number) => {
    if (pos - lastBoundary >= MIN_CHARS_BETWEEN_BOUNDARIES) {
      lastBoundary = pos;
    }
  };

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const endsWithNewline = i < lines.length - 1;
    const lineLen = line.length + (endsWithNewline ? 1 : 0);
    const trimmedStart = line.trimStart();
    const isFence = trimmedStart.startsWith('```') || trimmedStart.startsWith('~~~');

    if (isFence) {
      inFence = !inFence;
      if (!inFence) {
        // Closing fence: mark everything through this line as stable.
        maybeMarkBoundary(cursor + lineLen);
      }
    } else if (!inFence) {
      const isBlankLine = line.trim().length === 0 && endsWithNewline;
      if (isBlankLine) {
        maybeMarkBoundary(cursor + lineLen);
      }

      // Prefer sentence punctuation as soft boundaries to drip markdown sooner.
      const punctuationRegex = /[.!?]/g;
      let match: RegExpExecArray | null;
      while ((match = punctuationRegex.exec(line)) !== null) {
        const boundaryPos = cursor + match.index + 1;
        maybeMarkBoundary(boundaryPos);
      }

      // If the live tail is getting long, force a boundary at line end.
      if (cursor + lineLen - lastBoundary >= MAX_LIVE_CHARS) {
        maybeMarkBoundary(cursor + lineLen);
      }
    }

    cursor += lineLen;
  }

  // If no boundary was found, keep everything live to avoid thrashing markdown renders.
  if (lastBoundary <= 0) return { stable: '', live: text };
  if (lastBoundary >= text.length) return { stable: text, live: '' };

  return {
    stable: text.slice(0, lastBoundary),
    live: text.slice(lastBoundary),
  };
}

type MessageItemProps = {
  message: BasicUIMessage;
  status: ChatStatus;
  isLastAssistant: boolean;
  isRegenerating: boolean;
  isCopied: boolean;
  canDelete: boolean;
  isEditing: boolean;
  onRegenerate: (message: BasicUIMessage) => void;
  onCopy: (message: BasicUIMessage) => void;
  onDelete?: (messageId: string) => void;
  onPreviewImages: (payload: { images: Array<{ src: string; alt: string }>; startIndex: number }) => void;
  onStartEdit?: (messageId: string) => void;
  onCancelEdit?: () => void;
  onConfirmEdit?: (messageId: string, newText: string) => void;
};

const MessageItem = React.memo(
  function MessageItem({
    message,
    status,
    isLastAssistant,
    isRegenerating,
    isCopied,
    canDelete,
    isEditing,
    onRegenerate,
    onCopy,
    onDelete,
    onPreviewImages,
    onStartEdit,
    onCancelEdit,
    onConfirmEdit,
  }: MessageItemProps) {
    const [editText, setEditText] = useState(() => {
      // Initialize with the message's text content
      const parts = Array.isArray(message.parts) ? message.parts : [];
      return parts.map((p) => p.text || '').join('\n\n');
    });
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea when entering edit mode
    useEffect(() => {
      if (isEditing && editTextareaRef.current) {
        editTextareaRef.current.focus();
        // Move cursor to end
        const len = editTextareaRef.current.value.length;
        editTextareaRef.current.setSelectionRange(len, len);
      }
    }, [isEditing]);

    // Reset edit text when message changes or editing starts
    useEffect(() => {
      if (isEditing) {
        const parts = Array.isArray(message.parts) ? message.parts : [];
        setEditText(parts.map((p) => p.text || '').join('\n\n'));
      }
    }, [isEditing, message.parts]);

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (editText.trim() && onConfirmEdit) {
          onConfirmEdit(message.id, editText.trim());
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancelEdit?.();
      }
    };

    const isStreamingActive = status === 'streaming' && isLastAssistant;
    const sources = useMemo(() => {
      const allText = message.parts.map((p) => p.text || '').join(' ');
      const extractedSources = message.role === 'assistant' ? extractSources(allText) : [];

      const partSources = message.parts
        .filter((part) => part.type === 'source-url' || part.type === 'source')
        .map((part) => ({
          title: part.title || '',
          url: part.url || '',
        }))
        .filter((s) => s.url);

      const toolSources = message.parts.flatMap((part) => extractSourcesFromToolPart(part));

      const annotationSources =
        message.annotations?.find((annotation) => annotation.type === 'sources')?.value ?? [];

      const sourcesMap = new Map<string, { title: string; url: string }>();
      extractedSources.forEach((s) => sourcesMap.set(s.url, s));
      partSources.forEach((s) => sourcesMap.set(s.url, s));
      toolSources.forEach((s) => sourcesMap.set(s.url, s));
      annotationSources.forEach((source) => {
        if (!source) return;
        sourcesMap.set(source.url, { title: source.title, url: source.url });
      });

      return Array.from(sourcesMap.values());
    }, [message.annotations, message.parts, message.role]);

    // Render edit mode for user messages
    if (isEditing && message.role === 'user') {
      // Auto-size textarea effect
      const autoSizeTextarea = () => {
        if (editTextareaRef.current) {
          editTextareaRef.current.style.height = 'auto';
          editTextareaRef.current.style.height = `${Math.min(editTextareaRef.current.scrollHeight, 400)}px`;
        }
      };

      return (
        <div className="group/message flex w-full justify-end py-0">
          <div className="flex flex-col gap-2 w-full max-w-[600px]">
            <textarea
              ref={(el) => {
                (editTextareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 400)}px`;
                }
              }}
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                // Auto-resize on content change
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 400)}px`;
              }}
              onKeyDown={handleEditKeyDown}
              className="w-full min-h-[60px] max-h-[400px] p-4 text-[15px] md:text-base rounded-2xl rounded-br-sm border-2 border-primary/30 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 overflow-y-auto shadow-sm"
              placeholder="Edit your message..."
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                className="text-muted-foreground"
              >
                <XIcon className="size-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => editText.trim() && onConfirmEdit?.(message.id, editText.trim())}
                disabled={!editText.trim()}
              >
                <SendIcon className="size-4 mr-1" />
                Edit & Re-send
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="group/message">
        <Message from={message.role}>
          <MessageContent>
            {(() => {
              const renderedImages = new Set<string>();
              // Collect all unique images from file parts, deduping by prefix
              const allImages: Array<{ src: string; alt: string; partIndex: number }> = [];
              const imagePrefixes = new Set<string>();
              const PREFIX_LENGTH = 500; // Compare first 500 chars to detect near-duplicates

              message.parts.forEach((part: BasicUIPart, i: number) => {
                if (part.type === 'file') {
                  const imageSrc = getImageSrcFromPart(part);
                  if (imageSrc && !renderedImages.has(imageSrc)) {
                    // Check if we already have an image with the same prefix
                    const prefix = imageSrc.slice(0, PREFIX_LENGTH);
                    if (imagePrefixes.has(prefix)) {
                      // Skip this image - it's a near-duplicate
                      return;
                    }
                    imagePrefixes.add(prefix);
                    renderedImages.add(imageSrc);
                    allImages.push({
                      src: imageSrc,
                      alt: part.title || part.filename || 'Generated image',
                      partIndex: i,
                    });
                  }
                }
              });

              // Reset for tracking during render
              renderedImages.clear();

              // Render grouped parts
              const elements: React.ReactNode[] = [];
              let imagesRendered = false;

              // Group parts for ChainOfThought rendering
              const partGroups = groupMessageParts(message.parts);

              partGroups.forEach((group, groupIndex) => {
                if (group.type === 'thinking') {
                  // Render all thinking steps (reasoning + tools) in a single ChainOfThought
                  const thinkingGroup = group;
                  const lastStepIndex = thinkingGroup.steps[thinkingGroup.steps.length - 1]?.index ?? 0;
                  const isThinkingStreaming = isStreamingActive && lastStepIndex === message.parts.length - 1;

                  elements.push(
                    <ChainOfThought
                      key={`${message.id}-thinking-${groupIndex}`}
                      className="w-full"
                      isStreaming={isThinkingStreaming}
                    >
                      <ChainOfThoughtHeader />
                      <ChainOfThoughtContent>
                        {thinkingGroup.steps.map((step, stepIndex) => {
                          const isLastStep = stepIndex === thinkingGroup.steps.length - 1;
                          const stepStatus = isThinkingStreaming && isLastStep ? 'active' : 'complete';

                          if (step.type === 'reasoning') {
                            // Reasoning step - skip icon/label for first one since header shows "Thinking..."
                            if (step.part.text === '[REDACTED]') return null;

                            // Check if this is the first reasoning step in the group
                            const isFirstReasoning = thinkingGroup.steps.findIndex(s => s.type === 'reasoning') === stepIndex;

                            if (isFirstReasoning) {
                              // First reasoning: show with brain icon
                              return (
                                <ChainOfThoughtStep
                                  key={`step-${step.index}`}
                                  icon={BrainIcon}
                                  label="Thinking..."
                                  status={stepStatus}
                                >
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {step.part.text}
                                  </div>
                                </ChainOfThoughtStep>
                              );
                            }

                            // Subsequent reasoning steps: show with icon and label
                            return (
                              <ChainOfThoughtStep
                                key={`step-${step.index}`}
                                icon={BrainIcon}
                                label="Analyzing..."
                                status={stepStatus}
                              >
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-3">
                                  {step.part.text?.slice(0, 200)}
                                  {(step.part.text?.length ?? 0) > 200 ? '...' : ''}
                                </div>
                              </ChainOfThoughtStep>
                            );
                          } else {
                            // Tool step
                            const part = step.part;
                            const toolInvocation = part.toolInvocation;
                            const toolName = toolInvocation?.toolName ||
                              (typeof part.type === 'string' && part.type.startsWith('tool-')
                                ? part.type.replace(/^tool-/, '')
                                : 'tool');
                            const toolState = part.state ||
                              (toolInvocation?.result || part.output ? 'output-available' : 'input-available');
                            const isToolComplete = toolState === 'output-available';
                            const toolInput = toolInvocation?.args ?? part.input ?? part.args;
                            const toolOutput = toolInvocation?.result ?? part.output;

                            // Get display info
                            const displayInfo = getToolDisplayInfo(
                              toolName,
                              toolState as ToolUIPart['state'],
                              toolInput,
                              toolOutput
                            );

                            // Extract search results for web-search tool
                            const isWebSearch = isSearchToolName(toolName);
                            const searchResults = isWebSearch && toolOutput && typeof toolOutput === 'object'
                              ? extractSourcesFromToolOutput(toolOutput)
                              : [];

                            return (
                              <ChainOfThoughtStep
                                key={`step-${step.index}`}
                                icon={isWebSearch ? SearchIcon : FileTextIcon}
                                label={displayInfo.displayName}
                                description={displayInfo.preview || undefined}
                                status={isToolComplete ? 'complete' : 'active'}
                              >
                                {searchResults.length > 0 && (
                                  <ChainOfThoughtSearchResults className="mt-2">
                                    {searchResults.slice(0, 5).map((result, resultIdx) => (
                                      <ChainOfThoughtSearchResult
                                        key={result.url || resultIdx}
                                        asChild
                                      >
                                        <a
                                          href={result.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:bg-accent transition-colors"
                                        >
                                          {result.title || new URL(result.url).hostname}
                                        </a>
                                      </ChainOfThoughtSearchResult>
                                    ))}
                                    {searchResults.length > 5 && (
                                      <ChainOfThoughtSearchResult>
                                        +{searchResults.length - 5} more
                                      </ChainOfThoughtSearchResult>
                                    )}
                                  </ChainOfThoughtSearchResults>
                                )}
                              </ChainOfThoughtStep>
                            );
                          }
                        })}
                      </ChainOfThoughtContent>
                    </ChainOfThought>
                  );
                } else {
                  // Content group - render individual content parts
                  const part = group.part;
                  const i = group.index;

                  switch (part.type) {
                    case 'text':
                      if (!part.text) return;
                      if (isStreamingActive) {
                        const { stable, live } = splitStableMarkdown(part.text);
                        elements.push(
                          <div key={`${message.id}-${i}`} className="flex flex-col gap-2 text-[15px] md:text-base leading-relaxed">
                            {stable ? (
                              <Response sources={sources}>
                                {stable}
                              </Response>
                            ) : null}
                            {live ? (
                              <pre className="whitespace-pre-wrap break-words text-[15px] md:text-base leading-relaxed">
                                {live}
                              </pre>
                            ) : null}
                          </div>
                        );
                      } else {
                        elements.push(
                          <Response key={`${message.id}-${i}`} sources={sources}>
                            {part.text}
                          </Response>
                        );
                      }
                      break;
                    case 'file': {
                      // Render image grid once when we encounter the first file part
                      if (!imagesRendered && allImages.length > 0) {
                        imagesRendered = true;
                        const imageData = allImages.map((img) => ({ src: img.src, alt: img.alt }));

                        // Determine grid layout based on image count
                        const gridClass = allImages.length === 1
                          ? 'grid-cols-1'
                          : allImages.length === 2
                            ? 'grid-cols-2'
                            : allImages.length === 3
                              ? 'grid-cols-2 md:grid-cols-3'
                              : 'grid-cols-2';

                        elements.push(
                          <div
                            key={`${message.id}-images`}
                            className={`grid gap-2 ${gridClass}`}
                          >
                            {allImages.map((img, imgIndex) => (
                              <div
                                key={`${message.id}-img-${imgIndex}`}
                                className="group relative overflow-hidden rounded-lg border bg-background"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPreviewImages({
                                      images: imageData,
                                      startIndex: imgIndex,
                                    })
                                  }
                                  className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={img.src}
                                    alt={img.alt}
                                    className={cn(
                                      'w-full object-cover transition-transform duration-150 group-hover:scale-[1.02]',
                                      allImages.length === 1 ? 'max-h-[512px] object-contain' : 'aspect-square'
                                    )}
                                    loading="lazy"
                                  />
                                </button>
                                <a
                                  href={img.src}
                                  download
                                  className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full border bg-background/80 p-1.5 text-foreground shadow-sm opacity-0 transition-opacity duration-150 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
                                  aria-label="Download image"
                                >
                                  <DownloadIcon className="size-4" />
                                </a>
                                {allImages.length > 1 && (
                                  <div className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground">
                                    {imgIndex + 1}/{allImages.length}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      break;
                    }
                    default:
                      // Skip other content types (step-start, etc.)
                      break;
                  }
                }
              });

              return elements;
            })()}

            {sources.length > 0 && !isStreamingActive && (
              <Sources className="mt-2 border-t pt-2">
                <SourcesTrigger sources={sources} />
                <SourcesContent>
                  {sources.map((source, idx) => (
                    <Source key={source.url || source.title || idx} href={source.url} title={source.title} />
                  ))}
                </SourcesContent>
              </Sources>
            )}
          </MessageContent>
        </Message>
        <Actions
          className={`mt-1 opacity-100 md:opacity-0 md:group-hover/message:opacity-100 transition-opacity duration-150 ${message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
        >
          {message.role === 'assistant' && isLastAssistant && (
            <Action
              onClick={() => onRegenerate(message)}
              tooltip={isRegenerating ? 'Regenerating…' : 'Retry response'}
              label="Retry response"
              disabled={status === 'submitted' || status === 'streaming'}
            >
              <RefreshCcwIcon
                className={cn(
                  'size-4',
                  isRegenerating && (status === 'submitted' || status === 'streaming') && 'animate-spin'
                )}
              />
            </Action>
          )}
          {message.role === 'user' && canDelete && (
            <Action
              onClick={() => onStartEdit?.(message.id)}
              tooltip="Edit message"
              label="Edit message"
              disabled={status === 'submitted' || status === 'streaming'}
            >
              <PencilIcon className="size-4" />
            </Action>
          )}
          <Action
            onClick={() => onCopy(message)}
            tooltip={isCopied ? 'Copied' : 'Copy message'}
            label={isCopied ? 'Copied' : 'Copy message'}
          >
            {isCopied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </Action>
          {canDelete && (
            <Action onClick={() => onDelete?.(message.id)} label="Delete message">
              <Trash2Icon className="size-4" />
            </Action>
          )}
        </Actions>
      </div>
    );
  },
  (prev, next) =>
    prev.message === next.message &&
    prev.status === next.status &&
    prev.isLastAssistant === next.isLastAssistant &&
    prev.isRegenerating === next.isRegenerating &&
    prev.isCopied === next.isCopied &&
    prev.canDelete === next.canDelete &&
    prev.isEditing === next.isEditing
);

const Chat = React.memo(function Chat({
  className,
  systemPrompt,
  model,
  modelOptions,
  getChatContext,
  isAuthenticated = false,
  agentTag,
  initialConversationId,
  initialMessages,
  showModelSelectorInPrompt = false,
}: ChatProps) {
  const [text, setText] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isSignInPending, startSignInTransition] = useTransition();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const conversationIdRef = useRef<string | null>(initialConversationId || null);
  const hasGeneratedTitleRef = useRef<boolean>(false);
  const shouldGenerateTitleRef = useRef<boolean>(!initialConversationId);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set());
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const regenerationSnapshotRef = useRef<{ message: UIMessage; index: number } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastAssistantMessageRef = useRef<UIMessage | null>(null);
  const [previewImages, setPreviewImages] = useState<{ images: Array<{ src: string; alt: string }>; currentIndex: number } | null>(null);
  const [supportsReasoning, setSupportsReasoning] = useState<boolean>(false);
  const [reasoningOn, setReasoningOn] = useLocalStorage<boolean>('chat_reasoning_on', false);
  const [webSearchOn, setWebSearchOn] = useLocalStorage<boolean>('chat_web_search_on', false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [contextUsage, setContextUsage] = useState<UsageSnapshot | null>(null);
  const [contextModelId, setContextModelId] = useState<string | undefined>(model);
  const [contextMaxTokens, setContextMaxTokens] = useState<number | undefined>(undefined);
  const reasoningSupportCacheRef = useRef<Map<string, boolean>>(new Map());
  const guessMaxTokens = useCallback((modelId?: string) => {
    const id = (modelId || '').toLowerCase();
    if (id.includes('claude-3.5') || id.includes('claude-3-sonnet')) return 200_000;
    if (id.includes('gpt-4.1') || id.includes('gpt-4o')) return 128_000;
    if (id.includes('gpt-3.5')) return 16_000;
    return 128_000;
  }, []);
  const modelChoices = useMemo(() => {
    const seen = new Set<string>();
    const items: string[] = [];
    const add = (val?: string | null) => {
      if (!val) return;
      const clean = String(val).trim();
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      items.push(clean);
    };
    add(model);
    if (Array.isArray(modelOptions)) {
      modelOptions.forEach((m) => add(m));
    }
    return items;
  }, [model, modelOptions]);
  const [currentModel, setCurrentModel] = useState<string | undefined>(() => modelChoices[0]);
  useEffect(() => {
    setCurrentModel((prev) => {
      if (prev && modelChoices.includes(prev)) return prev;
      return modelChoices[0] ?? prev ?? undefined;
    });
  }, [modelChoices]);

  // Listen for model changes emitted from AgentInfoSidebar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as AgentModelChangeEvent).detail;
      if (!detail?.modelId) return;
      const targetTag = detail.agentTag;
      if (targetTag && agentTag && targetTag !== agentTag) return;
      if (targetTag && !agentTag) return;
      setCurrentModel(detail.modelId);
      setContextModelId(detail.modelId);
      setContextMaxTokens(guessMaxTokens(detail.modelId));
    };
    window.addEventListener(AGENT_MODEL_CHANGE_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(AGENT_MODEL_CHANGE_EVENT, handler as EventListener);
    };
  }, [agentTag, guessMaxTokens]);

  const normalizeUsage = useCallback((usage?: Partial<UsageSnapshot> | null): UsageSnapshot => {
    const toInt = (value: unknown) => {
      const num = Number(value);
      return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
    };
    const normalized: UsageSnapshot = {
      inputTokens: toInt(usage?.inputTokens),
      outputTokens: toInt(usage?.outputTokens),
      cachedInputTokens: toInt(usage?.cachedInputTokens),
      reasoningTokens: toInt(usage?.reasoningTokens),
      totalTokens: 0,
    };
    const explicitTotal = toInt(usage?.totalTokens);
    const sum = normalized.inputTokens + normalized.outputTokens + normalized.reasoningTokens;
    normalized.totalTokens = explicitTotal > 0 ? explicitTotal : sum;
    return normalized;
  }, []);

  const handleInlineModelChange = useCallback((modelId: string) => {
    setCurrentModel(modelId);
    setContextModelId(modelId);
    setContextMaxTokens(guessMaxTokens(modelId));
    dispatchAgentModelChange(agentTag, modelId);
  }, [agentTag, guessMaxTokens]);

  const renderContextControl = useCallback(() => {
    const hasUsage = Boolean(contextUsage) && Boolean(conversationIdRef.current);
    if (!hasUsage || !contextUsage) return null;
    const modelIdForContext = contextModelId ?? currentModel ?? model;
    const tooltipText = `Prompt: ${contextUsage.inputTokens.toLocaleString()} • Response: ${contextUsage.outputTokens.toLocaleString()}`;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="shrink-0">
            <Context
              usage={contextUsage}
              maxTokens={contextMaxTokens ?? 0}
              modelId={modelIdForContext}
              usedTokens={contextUsage.totalTokens}
            >
              <ContextTrigger className="h-10" />
              <ContextContent>
                <ContextContentHeader />
                <ContextContentBody>
                  <ContextInputUsage />
                  <ContextOutputUsage />
                  <ContextReasoningUsage />
                  <ContextCacheUsage />
                </ContextContentBody>
                <ContextContentFooter />
              </ContextContent>
            </Context>
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{tooltipText}</TooltipContent>
      </Tooltip>
    );
  }, [contextMaxTokens, contextModelId, contextUsage, currentModel, model]);

  const refreshUsage = useCallback(async (cid: string) => {
    try {
      const res = await fetch(`/api/conversations/${cid}/usage`);
      if (!res.ok) return;
      const data = await res.json();
      const normalized = normalizeUsage(data?.usage ?? null);
      setContextUsage(normalized);
      const incomingModel = (data?.modelId as string | undefined) || contextModelId || currentModel || model;
      setContextModelId(incomingModel);
      setContextMaxTokens(guessMaxTokens(incomingModel));
    } catch {
      // noop
    }
  }, [contextModelId, currentModel, guessMaxTokens, model, normalizeUsage]);

  const { messages, status, sendMessage, regenerate, stop, setMessages } = useChat({
    messages: Array.isArray(initialMessages) ? (initialMessages as unknown as UIMessage[]) : [],
    onFinish: async ({ message }) => {
      try {
        const cid = conversationIdRef.current;
        if (!cid || message.role !== 'assistant') return;

        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 onFinish called:', { messageId: message.id, partsLength: message.parts?.length });
        }

        // Save the message (whether completed or aborted)
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ conversationId: cid, message }),
        });

        // Revalidate conversations to update lastMessageAt timestamp
        try { revalidateConversations(); } catch { /* ignore */ }

        // Fire-and-forget: Generate AI-powered title after first message
        if (!hasGeneratedTitleRef.current && shouldGenerateTitleRef.current) {
          hasGeneratedTitleRef.current = true;
          shouldGenerateTitleRef.current = false;
          generateConversationTitleAsync(cid);
        }

        // Refresh usage snapshot for the context widget
        void refreshUsage(cid);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Failed to save message in onFinish:', error);
        }
      }
    },
  });
  // pathname and searchParams moved above to be available in callbacks

  useEffect(() => {
    if (isAuthenticated) {
      setIsDialogOpen(false);
    }
  }, [isAuthenticated]);

  // Restore draft message if one exists (e.g. from before a sign-in redirect)
  useEffect(() => {
    const key = `chat_draft_${agentTag || 'global'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setText(saved);
      localStorage.removeItem(key);
    }
  }, [agentTag]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    const cid = conversationIdRef.current;
    if (cid) {
      void refreshUsage(cid);
    } else {
      setContextUsage(null);
      setContextMaxTokens(undefined);
    }
  }, [conversationId, refreshUsage]);

  useEffect(() => {
    const effectiveModel = contextModelId ?? currentModel ?? model;
    if (!contextModelId && effectiveModel) {
      setContextModelId(effectiveModel);
      setContextMaxTokens((prev) => prev ?? guessMaxTokens(effectiveModel));
    }
  }, [contextModelId, currentModel, guessMaxTokens, model]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const last = messages.at(-1) as BasicUIMessage | undefined;
    if (!last) return;
    type PartWithType = { type?: string };
    const reasoningParts = Array.isArray(last.parts)
      ? (last.parts as PartWithType[]).filter((part) => part?.type === 'reasoning')
      : [];
    if (reasoningParts.length > 0) {
      console.log('🧠 Reasoning parts detected:', {
        messageId: last.id,
        partsCount: reasoningParts.length,
      });
    }
  }, [messages]);

  // Detect reasoning capability for the current model
  useEffect(() => {
    let cancelled = false;
    async function detect() {
      const effectiveModel = (currentModel ?? model)?.trim();
      if (!effectiveModel) {
        if (!cancelled) { setSupportsReasoning(false); }
        return;
      }

      const cached = reasoningSupportCacheRef.current.get(effectiveModel);
      if (cached !== undefined) {
        if (!cancelled) {
          setSupportsReasoning(cached);
        }
        return;
      }

      try {
        const url = new URL('/api/gateway/models', window.location.origin);
        url.searchParams.set('q', effectiveModel);
        url.searchParams.set('ttlMs', '60000');
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        const items: Array<{ id: string; supported_parameters?: string[] }> = json?.data ?? [];
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 Model search results:', {
            query: effectiveModel,
            count: items.length,
            sampleIds: items.slice(0, 3).map((m) => m.id),
          });
        }
        let supports = false;
        // Prefer exact id match; fall back to any match that supports reasoning
        const exact = items.find((m) => m.id === effectiveModel);
        if (exact) {
          supports = Array.isArray(exact.supported_parameters) && exact.supported_parameters.includes('reasoning');
        } else {
          supports = items.some((m) => Array.isArray(m.supported_parameters) && m.supported_parameters.includes('reasoning'));
        }
        if (!cancelled) {
          reasoningSupportCacheRef.current.set(effectiveModel, supports);
          setSupportsReasoning(supports);
          // if (!supports) setReasoningOn(false); // Don't disable user preference
          if (process.env.NODE_ENV === 'development') {
            console.log('🔎 Reasoning support check:', { model: effectiveModel, supports });
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Reasoning support check failed, assuming unsupported:', err);
        }
        if (!cancelled) {
          reasoningSupportCacheRef.current.set(effectiveModel, false);
          setSupportsReasoning(false);
        }
      }
    }
    detect();
    return () => { cancelled = true; };
  }, [currentModel, model]);

  // Track the last assistant message for saving on abort
  useEffect(() => {
    const lastAssistantMessage = messages.findLast((m) => m.role === 'assistant');
    if (lastAssistantMessage) {
      lastAssistantMessageRef.current = lastAssistantMessage;
    }
  }, [messages]);

  useEffect(() => {
    if (status === 'error' && regeneratingMessageId && regenerationSnapshotRef.current) {
      const snapshot = regenerationSnapshotRef.current;
      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === snapshot.message.id);
        if (alreadyExists) return prev;
        const next = [...prev];
        const insertionIndex = Math.min(snapshot.index, next.length);
        next.splice(insertionIndex, 0, snapshot.message as UIMessage);
        return next;
      });
      setHiddenMessageIds((prev) => {
        const next = new Set(prev);
        next.delete(regeneratingMessageId);
        return next;
      });
      regenerationSnapshotRef.current = null;
      setRegeneratingMessageId(null);
    } else if (status === 'ready') {
      regenerationSnapshotRef.current = null;
      setRegeneratingMessageId(null);
    }
  }, [regeneratingMessageId, setMessages, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) { window.clearTimeout(copyTimeoutRef.current); copyTimeoutRef.current = null; }
    };
  }, []);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    conversationIdRef.current = null;
    hasGeneratedTitleRef.current = false;
    shouldGenerateTitleRef.current = true;
    lastAssistantMessageRef.current = null;
    setDeletedMessageIds(new Set());
    setHiddenMessageIds(new Set());
    setRegeneratingMessageId(null);
    regenerationSnapshotRef.current = null;
    setCopiedMessageId(null);
    setEditingMessageId(null);
    setContextUsage(null);
    setContextModelId(model);
    setContextMaxTokens(undefined);
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setText('');
    setMessages([]);
    if (process.env.NODE_ENV === 'development') {
      console.log('🆕 Starting a new chat session');
    }
  }, [model, setMessages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleNewChatEvent = (event: Event) => {
      const detail = (event as AgentNewChatEvent).detail;
      const targetTag = detail?.agentTag;
      if (targetTag && agentTag && targetTag !== agentTag) return;
      if (targetTag && !agentTag) return;
      startNewChat();
    };
    window.addEventListener(AGENT_NEW_CHAT_EVENT, handleNewChatEvent as EventListener);
    return () => {
      window.removeEventListener(AGENT_NEW_CHAT_EVENT, handleNewChatEvent as EventListener);
    };
  }, [agentTag, startNewChat]);

  // Listen for Cmd+K (Mac) or Ctrl+K (Windows/Linux) to start a new chat
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (!modifierKey || e.key !== 'k') return;

      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditable =
        (target?.isContentEditable ?? false) ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        Boolean(target?.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));

      if (isEditable || isDialogOpen) return;

      e.preventDefault();
      startNewChat();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDialogOpen, startNewChat]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const trimmed = message.text.trim();
    const hasRawFiles = Array.isArray(message.files) && message.files.length > 0;
    if (!trimmed && !hasRawFiles) return;

    if (!isAuthenticated) {
      setIsDialogOpen(true);
      return;
    }

    let fileParts: FileUIPart[] = [];
    if (hasRawFiles) {
      fileParts = await convertFilesToUIParts(message.files!);
      if (process.env.NODE_ENV === 'development') {
        console.log('📎 File attachments prepared:', {
          count: fileParts.length,
          filenames: message.files?.map((file) => file.name),
        });
      }
    }

    if (!trimmed && fileParts.length === 0) {
      // All files failed to serialize; abort submission.
      return;
    }

    const shouldIncludeSystemPrompt = !conversationId && !messages.some((m) => m.role === 'assistant');

    // If there's no conversation yet, generate a client id and update URL immediately.
    let effectiveConversationId = conversationId;
    if (!effectiveConversationId && agentTag) {
      try {
        const newId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `temp-${Date.now()}`;
        setConversationId(newId);
        conversationIdRef.current = newId;
        effectiveConversationId = newId;

        // Optimistically add to sidebar without blocking
        try {
          const agentId = agentTag.startsWith('@') ? agentTag.slice(1) : agentTag;
          const conversationTitle = trimmed.slice(0, 60);
          // fire-and-forget
          void addConversationOptimistically({
            id: newId,
            agentId,
            agentTag,
            dateIso: new Date().toISOString(),
            title: conversationTitle,
            agentName: agentId, // Will be updated on next revalidation
            agentAvatar: null,
          });
        } catch { /* ignore */ }

        // Update URL to include conversation id for a smoother UX
        if (pathname) {
          const parts = pathname.split('/').filter(Boolean);
          const agentIndex = parts.indexOf('agent');
          if (agentIndex >= 0 && parts.length > agentIndex + 1) {
            const slug = parts[agentIndex + 1];
            const qs = searchParams?.toString();
            const newUrl = qs ? `/agent/${slug}/${newId}?${qs}` : `/agent/${slug}/${newId}`;
            if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
              window.history.replaceState(null, '', newUrl);
            }
          }
        }
      } catch {
        // ignore URL update issues
      }
    }

    const ctx = getChatContext ? getChatContext() || undefined : undefined;
    const resolvedModel = ctx?.model ?? currentModel ?? model;
    if (effectiveConversationId) {
      conversationIdRef.current = effectiveConversationId;
    }

    // Optional debug: summarize history size (avoid heavy JSON stringify in prod)
    if (process.env.NODE_ENV === 'development') {
      const fromServer = (Array.isArray(initialMessages) ? (initialMessages as BasicUIMessage[]) : []) as BasicUIMessage[];
      const live = (messages as unknown as BasicUIMessage[]) || [];
      const byId = new Map<string, BasicUIMessage>();
      for (const m of fromServer) byId.set(m.id, m);
      for (const m of live) byId.set(m.id, m);
      const fullHistory = Array.from(byId.values()).filter(msg => !deletedMessageIds.has(msg.id) && !hiddenMessageIds.has(msg.id));
      console.log('📝 History summary:', {
        conversationId: effectiveConversationId,
        messageCount: fullHistory.length,
        fromDatabase: fromServer.length,
        fromLiveSession: live.length,
        deleted: deletedMessageIds.size,
      });
    }

    // TODO: Add file support to backend
    // Only include system (combined system + knowledge) on the very first turn (no conversation id yet)
    const includeSystem = shouldIncludeSystemPrompt;
    const systemForThisSend = includeSystem ? (ctx?.systemPrompt ?? systemPrompt) : undefined;

    if (process.env.NODE_ENV === 'development') {
      console.log('➡️ Sending message:', {
        modelUsed: resolvedModel,
        supportsReasoning,
        reasoningEnabled: supportsReasoning ? reasoningOn : false,
        includeSystem,
        conversationId: effectiveConversationId,
      });
    }

    const sendPayload =
      trimmed && fileParts.length > 0
        ? { text: trimmed, files: fileParts }
        : trimmed
          ? { text: trimmed }
          : { files: fileParts };

    sendMessage(
      sendPayload,
      {
        body: {
          systemPrompt: systemForThisSend,
          model: resolvedModel,
          conversationId: effectiveConversationId,
          agentTag,
          reasoningEnabled: supportsReasoning ? reasoningOn : false,
          webSearchEnabled: webSearchOn,
        },
      }
    );
    setText('');
  };

  const handleStop = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🛑 Stop button clicked');
    }

    // First, stop the stream
    stop();

    // Then save whatever message content we have so far
    const lastMessage = lastAssistantMessageRef.current;
    const cid = conversationIdRef.current;

    if (process.env.NODE_ENV === 'development') {
      console.log('🛑 Attempting to save partial message:', {
        hasMessage: !!lastMessage,
        hasConversationId: !!cid,
        messageId: lastMessage?.id,
        partsCount: lastMessage?.parts?.length
      });
    }

    if (lastMessage && cid) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🛑 Saving message:', { id: lastMessage.id, partsCount: lastMessage.parts?.length });
        }

        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ conversationId: cid, message: lastMessage }),
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Successfully saved partial message to database');
        }

        // Revalidate conversations to update lastMessageAt timestamp
        try { revalidateConversations(); } catch { /* ignore */ }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Failed to save partial message:', error);
        }
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Cannot save: missing message or conversation ID');
      }
    }
  }, [stop]);

  const handleToggleWebSearch = useCallback(() => {
    setWebSearchOn((prev) => !prev);
  }, [setWebSearchOn]);

  const handleToggleReasoning = useCallback(() => {
    const next = !reasoningOn;
    if (process.env.NODE_ENV === 'development') {
      console.log('🧠 Toggle reasoning:', { next, supportsReasoning });
    }
    setReasoningOn(next);
  }, [reasoningOn, supportsReasoning, setReasoningOn]);

  const handlePreviewImages = useCallback((payload: { images: Array<{ src: string; alt: string }>; startIndex: number }) => {
    setPreviewImages({ images: payload.images, currentIndex: payload.startIndex });
  }, []);

  const handlePreviewPrev = useCallback(() => {
    setPreviewImages((prev) => {
      if (!prev || prev.images.length <= 1) return prev;
      const newIndex = prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1;
      return { ...prev, currentIndex: newIndex };
    });
  }, []);

  const handlePreviewNext = useCallback(() => {
    setPreviewImages((prev) => {
      if (!prev || prev.images.length <= 1) return prev;
      const newIndex = prev.currentIndex === prev.images.length - 1 ? 0 : prev.currentIndex + 1;
      return { ...prev, currentIndex: newIndex };
    });
  }, []);

  const handleSignIn = () => {
    // Save draft before redirecting
    if (text.trim()) {
      localStorage.setItem(`chat_draft_${agentTag || 'global'}`, text);
    }

    startSignInTransition(async () => {
      const redirectUrl = typeof window !== 'undefined' ? window.location.href : pathname ?? '/';
      await authClient.signIn.social({ provider: 'google', callbackURL: redirectUrl });
    });
  };

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    // Optimistically remove from UI
    setDeletedMessageIds((prev) => new Set(prev).add(messageId));

    try {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      if (!res.ok) {
        // Rollback on error
        setDeletedMessageIds((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }
    } catch {
      // Rollback on error
      setDeletedMessageIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  }, []);

  const getMessageOriginalText = useCallback((message: BasicUIMessage): string => {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    return parts.map((p) => p.text || '').join('\n\n');
  }, []);

  const handleCopyMessage = useCallback(async (message: BasicUIMessage) => {
    try {
      const textToCopy = getMessageOriginalText(message);
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMessageId(message.id);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedMessageId(null);
        copyTimeoutRef.current = null;
      }, 1500);
    } catch {
      // ignore
    }
  }, [getMessageOriginalText]);

  const handleStartEdit = useCallback((messageId: string) => {
    if (status === 'streaming' || status === 'submitted') return;
    setEditingMessageId(messageId);
  }, [status]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleConfirmEdit = useCallback(async (messageId: string, newText: string) => {
    if (!isAuthenticated) {
      setIsDialogOpen(true);
      return;
    }

    if (status === 'streaming' || status === 'submitted') {
      return;
    }

    const cid = conversationIdRef.current;
    if (!cid) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Cannot edit message: no conversation ID');
      }
      return;
    }

    // Cancel edit mode immediately for better UX
    setEditingMessageId(null);

    // Get all current messages to find which ones to delete
    const serverMessages = (Array.isArray(initialMessages) ? initialMessages : []) as BasicUIMessage[];
    const allCurrentMessages = [...serverMessages, ...(messages as BasicUIMessage[] || [])];
    const uniqueMessages = Array.from(new Map(allCurrentMessages.map(m => [m.id, m])).values());

    // Find the index of the message being edited
    const editedMessageIndex = uniqueMessages.findIndex(m => m.id === messageId);

    // Collect IDs of messages to hide: the edited message AND all messages after it
    // We hide the edited message because sendMessage will create a new user message
    const messageIdsToHide = new Set<string>();
    if (editedMessageIndex !== -1) {
      // Include the edited message itself (sendMessage will create a new one)
      messageIdsToHide.add(messageId);
      // Include all messages after the edited one
      for (let i = editedMessageIndex + 1; i < uniqueMessages.length; i++) {
        messageIdsToHide.add(uniqueMessages[i].id);
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✏️ Optimistic edit:', {
        editedMessageId: messageId,
        messagesToHide: Array.from(messageIdsToHide),
      });
    }

    // OPTIMISTIC UPDATE: Immediately hide the edited message and all messages after it
    setDeletedMessageIds((prev) => {
      const next = new Set(prev);
      messageIdsToHide.forEach(id => next.add(id));
      return next;
    });

    try {
      // Call API to update message and delete subsequent messages
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messageId, newText }),
      });

      if (!res.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to edit message:', await res.text());
        }
        // Rollback optimistic update on error
        setDeletedMessageIds((prev) => {
          const next = new Set(prev);
          messageIdsToHide.forEach(id => next.delete(id));
          return next;
        });
        return;
      }

      // Re-send the edited message to the model
      const ctx = getChatContext ? getChatContext() || undefined : undefined;
      const resolvedModel = ctx?.model ?? currentModel ?? model;

      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Re-sending edited message:', {
          messageId,
          newText: newText.slice(0, 50) + (newText.length > 50 ? '...' : ''),
          model: resolvedModel,
        });
      }

      // Send the edited message as a new turn
      sendMessage(
        { text: newText },
        {
          body: {
            systemPrompt: ctx?.systemPrompt ?? systemPrompt,
            model: resolvedModel,
            conversationId: cid,
            agentTag,
            reasoningEnabled: supportsReasoning ? reasoningOn : false,
            webSearchEnabled: webSearchOn,
          },
        }
      );

      // Revalidate conversations
      try { revalidateConversations(); } catch { /* ignore */ }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to edit message:', error);
      }
      // Rollback optimistic update on error
      setDeletedMessageIds((prev) => {
        const next = new Set(prev);
        messageIdsToHide.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [agentTag, currentModel, getChatContext, initialMessages, isAuthenticated, messages, model, reasoningOn, sendMessage, status, supportsReasoning, systemPrompt, webSearchOn]);

  const handleRegenerateMessage = useCallback(async (message: BasicUIMessage) => {
    if (!isAuthenticated) {
      setIsDialogOpen(true);
      return;
    }

    if (status === 'streaming' || status === 'submitted') {
      return;
    }

    const messageIndex = messages.findIndex((m) => m.id === message.id);
    if (messageIndex === -1) {
      return;
    }

    const snapshot: UIMessage =
      typeof structuredClone === 'function'
        ? structuredClone(message as UIMessage)
        : JSON.parse(JSON.stringify(message));

    regenerationSnapshotRef.current = { message: snapshot, index: messageIndex };
    setRegeneratingMessageId(message.id);
    setHiddenMessageIds((prev) => {
      const next = new Set(prev);
      next.add(message.id);
      return next;
    });

    const ctx = getChatContext ? getChatContext() || undefined : undefined;
    const resolvedModel = ctx?.model ?? currentModel ?? model;
    const cid = conversationIdRef.current;

    try {
      await regenerate({
        messageId: message.id,
        body: {
          systemPrompt: ctx?.systemPrompt ?? systemPrompt,
          model: resolvedModel,
          conversationId: cid ?? undefined,
          agentTag,
          reasoningEnabled: supportsReasoning ? reasoningOn : false,
          webSearchEnabled: webSearchOn,
        },
      });
    } catch {
      setHiddenMessageIds((prev) => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
      regenerationSnapshotRef.current = null;
      setRegeneratingMessageId(null);
    }
  }, [agentTag, currentModel, getChatContext, isAuthenticated, messages, model, reasoningOn, regenerate, status, supportsReasoning, systemPrompt, webSearchOn]);

  const initialMessagesMemo = useMemo<BasicUIMessage[]>(() => {
    return (Array.isArray(initialMessages) ? (initialMessages as BasicUIMessage[]) : []) as BasicUIMessage[];
  }, [initialMessages]);
  const baseMessages = useMemo(() => {
    const normalizedInitialConversationId = initialConversationId ?? null;
    const normalizedConversationId = conversationId ?? null;
    const shouldUseServerMessages = normalizedConversationId === normalizedInitialConversationId;
    return shouldUseServerMessages ? initialMessagesMemo : [];
  }, [conversationId, initialConversationId, initialMessagesMemo]);
  const liveMessages = useMemo(
    () => ((messages as unknown as BasicUIMessage[]) || []).filter(Boolean),
    [messages]
  );
  const mergedMessages = useMemo<BasicUIMessage[]>(() => {
    const result: BasicUIMessage[] = [];
    const seen = new Set<string>();
    const pushList = (list: BasicUIMessage[]) => {
      for (const msg of list) {
        if (seen.has(msg.id)) {
          const existingIndex = result.findIndex((m) => m.id === msg.id);
          if (existingIndex !== -1) {
            result[existingIndex] = msg;
          }
          continue;
        }
        seen.add(msg.id);
        result.push(msg);
      }
    };
    pushList(baseMessages);
    pushList(liveMessages);
    return result.filter(
      (msg) => !deletedMessageIds.has(msg.id) && !hiddenMessageIds.has(msg.id)
    );
  }, [baseMessages, liveMessages, deletedMessageIds, hiddenMessageIds]);
  const throttledMessages = useThrottledValue(mergedMessages, 20);
  const hasMessages = throttledMessages.length > 0;
  const lastAssistantMessageId = useMemo(
    () => throttledMessages.findLast((m) => m.role === 'assistant')?.id ?? null,
    [throttledMessages]
  );
  const pendingAssistantMessage = useMemo<BasicUIMessage>(
    () => ({
      id: '__pending_assistant__',
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
    }),
    []
  );
  const conversationItems = useMemo(
    () => (status === 'submitted' ? [...throttledMessages, pendingAssistantMessage] : throttledMessages),
    [pendingAssistantMessage, status, throttledMessages]
  );
  const computeConversationKey = useCallback((_index: number, item: BasicUIMessage) => item.id, []);
  const renderConversationItem = useCallback(
    (message: BasicUIMessage) =>
      message.id === '__pending_assistant__' ? (
        <div className="px-2 md:px-4 ">
          <Message from="assistant">
            <MessageContent>
              <MessageLoading />
            </MessageContent>
          </Message>
        </div>
      ) : (
        <div className="px-2 md:px-4 pb-8">
          <MessageItem
            message={message}
            status={status}
            isLastAssistant={message.id === lastAssistantMessageId}
            isRegenerating={regeneratingMessageId === message.id}
            isCopied={copiedMessageId === message.id}
            canDelete={isAuthenticated}
            isEditing={editingMessageId === message.id}
            onRegenerate={handleRegenerateMessage}
            onCopy={handleCopyMessage}
            onDelete={isAuthenticated ? handleDeleteMessage : undefined}
            onPreviewImages={handlePreviewImages}
            onStartEdit={isAuthenticated ? handleStartEdit : undefined}
            onCancelEdit={handleCancelEdit}
            onConfirmEdit={handleConfirmEdit}
          />
        </div>
      ),
    [
      copiedMessageId,
      editingMessageId,
      handleCancelEdit,
      handleConfirmEdit,
      handleCopyMessage,
      handleDeleteMessage,
      handlePreviewImages,
      handleRegenerateMessage,
      handleStartEdit,
      isAuthenticated,
      lastAssistantMessageId,
      regeneratingMessageId,
      status,
    ]
  );
  return (
    <div className={`flex w-full max-w-3xl flex-col h-full ${className || ''}`}>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to continue</DialogTitle>
            <DialogDescription>
              You need to sign in with Google before you can send messages to this agent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleSignIn}
              disabled={isSignInPending}
            >
              <Image
                src="https://www.gstatic.com/images/branding/product/2x/googleg_64dp.png"
                alt="Google"
                width={18}
                height={18}
              />
              {isSignInPending ? 'Redirecting…' : 'Sign in with Google'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!previewImages} onOpenChange={(open) => { if (!open) setPreviewImages(null); }}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Image preview</span>
              {previewImages && previewImages.images.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {previewImages.currentIndex + 1} / {previewImages.images.length}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewImages && (
            <div className="relative">
              {/* Navigation arrows */}
              {previewImages.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePreviewPrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center rounded-full border bg-background/90 p-2 text-foreground shadow-sm hover:bg-background transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeftIcon className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePreviewNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center rounded-full border bg-background/90 p-2 text-foreground shadow-sm hover:bg-background transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRightIcon className="size-5" />
                  </button>
                </>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImages.images[previewImages.currentIndex]?.src}
                alt={previewImages.images[previewImages.currentIndex]?.alt}
                className="mx-auto max-h-[70vh] w-full object-contain rounded-lg bg-muted"
              />
              <a
                href={previewImages.images[previewImages.currentIndex]?.src}
                download
                className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full border bg-background/90 p-2 text-foreground shadow-sm hover:bg-background"
                aria-label="Download full image"
              >
                <DownloadIcon className="size-4" />
              </a>
              {/* Thumbnail strip for multiple images */}
              {previewImages.images.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {previewImages.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewImages((prev) => prev ? { ...prev, currentIndex: idx } : null)}
                      className={cn(
                        'relative w-16 h-16 rounded-md overflow-hidden border-2 transition-all',
                        idx === previewImages.currentIndex
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {hasMessages ? (
        <>
          {/* Scrollable conversation area */}
          <div className="flex-1 overflow-hidden pb-30 md:pb-0">
            <Conversation
              className="h-full"
              items={conversationItems}
              overscan={{ top: 200, bottom: 400 }}
              virtuosoProps={{
                computeItemKey: computeConversationKey,
              }}
              renderItem={renderConversationItem}
            >
              <ConversationScrollButton />
            </Conversation>
          </div>

          {/* Fixed input bar at bottom - fixed on mobile, relative on desktop */}
          <div className="fixed md:relative bottom-0 left-0 right-0 md:flex-shrink-0 border-t md:border-t-0 bg-background py-2 md:pb-4 md:pt-0 z-10">
            <PromptInputForm
              onSubmit={handleSubmit}
              onChangeText={setText}
              text={text}
              status={status}
              onStop={handleStop}
              textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
              webSearchOn={webSearchOn}
              onToggleWebSearch={handleToggleWebSearch}
              renderContextControl={renderContextControl}
              supportsReasoning={supportsReasoning}
              reasoningOn={reasoningOn}
              onToggleReasoning={handleToggleReasoning}
              showModelSelectorInPrompt={showModelSelectorInPrompt}
              modelChoices={modelChoices}
              currentModel={currentModel}
              onModelChange={handleInlineModelChange}
              className="w-full max-w-3xl mx-auto"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full md:px-0">
          <PromptInputForm
            onSubmit={handleSubmit}
            onChangeText={setText}
            text={text}
            status={status}
            onStop={handleStop}
            textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
            webSearchOn={webSearchOn}
            onToggleWebSearch={handleToggleWebSearch}
            renderContextControl={renderContextControl}
            supportsReasoning={supportsReasoning}
            reasoningOn={reasoningOn}
            onToggleReasoning={handleToggleReasoning}
            showModelSelectorInPrompt={showModelSelectorInPrompt}
            modelChoices={modelChoices}
            currentModel={currentModel}
            onModelChange={handleInlineModelChange}
            className="w-full max-w-2xl"
          />
        </div>
      )}
    </div>
  );
});

export default Chat;
