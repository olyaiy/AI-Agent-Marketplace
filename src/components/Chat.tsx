'use client';

import * as React from 'react';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useChat } from '@ai-sdk/react';
import type { FileUIPart, UIMessage } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import { MessageLoading } from '@/components/ui/message-loading';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Actions, Action } from '@/components/ai-elements/actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { RefreshCcwIcon, Trash2Icon, CopyIcon, CheckIcon, Brain as BrainIcon, GlobeIcon, Download as DownloadIcon } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  addConversationOptimistically,
  revalidateConversations,
  generateConversationTitleAsync,
} from '@/lib/conversations-cache';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AGENT_MODEL_CHANGE_EVENT, AGENT_NEW_CHAT_EVENT, AgentModelChangeEvent, AgentNewChatEvent } from '@/lib/agent-events';
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
}

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
  const parts: FileUIPart[] = [];
  for (const file of files) {
    try {
      const url = await fileToDataUrl(file);
      parts.push({
        type: 'file',
        mediaType: file.type || 'application/octet-stream',
        filename: file.name,
        url,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to convert file to UI part', { fileName: file.name, error });
      }
    }
  }
  return parts;
}

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
  const copyTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastAssistantMessageRef = useRef<UIMessage | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [supportsReasoning, setSupportsReasoning] = useState<boolean>(false);
  const [reasoningOn, setReasoningOn] = useLocalStorage<boolean>('chat_reasoning_on', false);
  const [webSearchOn, setWebSearchOn] = useLocalStorage<boolean>('chat_web_search_on', false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
    };
    window.addEventListener(AGENT_MODEL_CHANGE_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(AGENT_MODEL_CHANGE_EVENT, handler as EventListener);
    };
  }, [agentTag]);

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
      try {
        const effectiveModel = (currentModel ?? model)?.trim();
        if (!effectiveModel) {
          if (!cancelled) { setSupportsReasoning(false); }
          return;
        }
        const url = new URL('/api/openrouter/models', window.location.origin);
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
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setText('');
    setMessages([]);
    if (process.env.NODE_ENV === 'development') {
      console.log('🆕 Starting a new chat session');
    }
  }, [setMessages]);

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
            dateIso: new Date().toISOString(),
            title: conversationTitle,
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

  const handleStop = async () => {
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
  };

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

  const handleDeleteMessage = async (messageId: string) => {
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
  };

  function getMessageOriginalText(message: BasicUIMessage): string {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    return parts.map((p) => p.text || '').join('\n\n');
  }

  const handleCopyMessage = async (message: BasicUIMessage) => {
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
  };

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

  interface BasicUIPart {
    type: string;
    text?: string;
    title?: string;
    url?: string;
    data?: string;
    mediaType?: string;
    filename?: string;
    sourceId?: string;
    file?: {
      base64?: string;
      mediaType?: string;
      url?: string;
    };
  }
  interface BasicUISource { title: string; url: string }
  interface BasicUIAnnotation { type: string; value?: BasicUISource[] }
  interface BasicUIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    parts: BasicUIPart[];
    annotations?: BasicUIAnnotation[];
  }
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
  const allMessages = useMemo<BasicUIMessage[]>(() => {
    const normalizedInitialConversationId = initialConversationId ?? null;
    const normalizedConversationId = conversationId ?? null;
    const shouldUseServerMessages = normalizedConversationId === normalizedInitialConversationId;
    const fromServer = shouldUseServerMessages
      ? ((Array.isArray(initialMessages) ? (initialMessages as BasicUIMessage[]) : []) as BasicUIMessage[])
      : [];
    const live = (messages as unknown as BasicUIMessage[]) || [];
    const liveFiltered = live.filter(msg => !deletedMessageIds.has(msg.id) && !hiddenMessageIds.has(msg.id));
    if (fromServer.length === 0) return liveFiltered;
    const byId = new Map<string, BasicUIMessage>();
    for (const m of fromServer) byId.set(m.id, m);
    for (const m of live) byId.set(m.id, m);
    // Filter out deleted messages
    return Array.from(byId.values()).filter(msg => !deletedMessageIds.has(msg.id) && !hiddenMessageIds.has(msg.id));
  }, [initialMessages, messages, deletedMessageIds, hiddenMessageIds, conversationId, initialConversationId]);
  const hasMessages = allMessages.length > 0;
  const displayedMessages = useMemo(() => allMessages, [allMessages]);
  const lastAssistantMessageId = useMemo(
    () => displayedMessages.findLast((m) => m.role === 'assistant')?.id ?? null,
    [displayedMessages]
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
      <Dialog open={!!previewImage} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Image preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <img
                src={previewImage.src}
                alt={previewImage.alt}
                className="mx-auto max-h-[70vh] w-full object-contain rounded-lg bg-muted"
              />
              <a
                href={previewImage.src}
                download
                className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full border bg-background/90 p-2 text-foreground shadow-sm hover:bg-background"
                aria-label="Download full image"
              >
                <DownloadIcon className="size-4" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {hasMessages ? (
        <>
          {/* Scrollable conversation area */}
          <div className="flex-1 overflow-hidden pb-20 md:pb-0">
            <Conversation className="h-full overflow-y-scroll md:overflow-y-visible">
              <ConversationContent className="">
                {displayedMessages.map((message: BasicUIMessage) => {
                  // Calculate sources for this message
                  // Calculate sources for this message
                  const allText = message.parts.map(p => p.text || '').join(' ');
                  const extractedSources = message.role === 'assistant' ? extractSources(allText) : [];

                  // Extract sources from message parts (e.g. from OpenRouter/Anthropic)
                  const partSources = message.parts
                    .filter((part) => part.type === 'source-url' || part.type === 'source')
                    .map((part) => ({
                      title: part.title || '',
                      url: part.url || '',
                    }))
                    .filter(s => s.url);

                  // Combine extracted sources with annotation sources
                  const annotationSources = message.annotations?.find((annotation) => annotation.type === 'sources')?.value ?? [];

                  // Deduplicate sources by URL
                  const sourcesMap = new Map<string, { title: string; url: string }>();
                  extractedSources.forEach(s => sourcesMap.set(s.url, s));
                  partSources.forEach(s => sourcesMap.set(s.url, s));
                  annotationSources.forEach((source) => {
                    if (!source) return;
                    // Prioritize annotation sources as they contain the full page title
                    sourcesMap.set(source.url, { title: source.title, url: source.url });
                  });

                  const sources = Array.from(sourcesMap.values());

                  return (
                    <div key={message.id} className="group/message">
                      <Message from={message.role}>
                        <MessageContent>
                          {(() => {
                            const renderedImages = new Set<string>();
                            return message.parts.map((part: BasicUIPart, i: number) => {
                              switch (part.type) {
                                case 'text':
                                  return (
                                    <Response key={`${message.id}-${i}`} sources={sources}>{part.text}</Response>
                                  );
                                case 'reasoning':
                                  if (part.text === '[REDACTED]') return null;
                                  return (
                                    <Reasoning
                                      key={`${message.id}-${i}`}
                                      className="w-full"
                                      isStreaming={
                                        status === 'streaming' &&
                                        i === message.parts.length - 1 &&
                                        message.id === displayedMessages.at(-1)?.id
                                      }
                                    >
                                      <ReasoningTrigger />
                                      <ReasoningContent>{part.text}</ReasoningContent>
                                    </Reasoning>
                                  );
                                case 'file': {
                                  const imageSrc = getImageSrcFromPart(part);
                                  if (!imageSrc || renderedImages.has(imageSrc)) return null;
                                  renderedImages.add(imageSrc);
                                  return (
                                    <div key={`${message.id}-${i}`} className="group relative overflow-hidden rounded-lg border bg-background">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImage({ src: imageSrc, alt: part.title || part.filename || 'Generated image' })}
                                        className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
                                      >
                                        <img
                                          src={imageSrc}
                                          alt={part.title || part.filename || 'Generated image'}
                                          className="h-auto w-full max-h-[512px] object-contain transition-transform duration-150 group-hover:scale-[1.01]"
                                          loading="lazy"
                                        />
                                      </button>
                                      <a
                                        href={imageSrc}
                                        download
                                        className="absolute right-2 top-2 inline-flex items-center justify-center rounded-full border bg-background/80 p-1.5 text-foreground shadow-sm opacity-0 transition-opacity duration-150 hover:bg-background focus-visible:opacity-100 group-hover:opacity-100"
                                        aria-label="Download image"
                                      >
                                        <DownloadIcon className="size-4" />
                                      </a>
                                    </div>
                                  );
                                }
                                default:
                                  return null;
                              }
                            });
                          })()}

                          {/* New Sources UI */}
                          {sources.length > 0 && (
                            <Sources className="mt-2 border-t pt-2">
                              <SourcesTrigger sources={sources} />
                              <SourcesContent>
                                {sources.map((source, idx) => (
                                  <Source
                                    key={idx}
                                    href={source.url}
                                    title={source.title}
                                  />
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
                        {message.role === 'assistant' && message.id === lastAssistantMessageId && (
                          <Action
                            onClick={() => handleRegenerateMessage(message)}
                            tooltip={regeneratingMessageId === message.id ? 'Regenerating…' : 'Retry response'}
                            label="Retry response"
                            disabled={status === 'submitted' || status === 'streaming'}
                          >
                            <RefreshCcwIcon className={cn('size-4', regeneratingMessageId === message.id && (status === 'submitted' || status === 'streaming') && 'animate-spin')} />
                          </Action>
                        )}
                        <Action
                          onClick={() => handleCopyMessage(message)}
                          tooltip={copiedMessageId === message.id ? 'Copied' : 'Copy message'}
                          label={copiedMessageId === message.id ? 'Copied' : 'Copy message'}
                        >
                          {copiedMessageId === message.id ? (
                            <CheckIcon className="size-4" />
                          ) : (
                            <CopyIcon className="size-4" />
                          )}
                        </Action>
                        {isAuthenticated && (
                          <Action
                            onClick={() => handleDeleteMessage(message.id)}
                            label="Delete message"
                          >
                            <Trash2Icon className="size-4" />
                          </Action>
                        )}
                      </Actions>
                    </div>
                  );
                })}
                {status === 'submitted' && (
                  <Message from="assistant">
                    <MessageContent>
                      <MessageLoading />
                    </MessageContent>
                  </Message>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>

          {/* Fixed input bar at bottom - fixed on mobile, relative on desktop */}
          <div className="fixed md:relative bottom-0 left-0 right-0 md:flex-shrink-0 border-t md:border-t-0 bg-background py-2 md:pb-4 md:pt-0 z-10">
            <PromptInput
              onSubmit={handleSubmit}
              className="w-full max-w-3xl mx-auto"
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
                    onChange={(e) => setText(e.target.value)}
                    value={text}
                    placeholder="Type your message..."
                    className="min-h-[40px] py-2 text-sm md:text-base row-start-1 col-start-1 col-end-4"
                  />
                  <div className="row-start-2 col-start-1">
                    <div className="flex items-center gap-1">
                      <PromptInputActionMenu>
                        <PromptInputActionMenuTrigger />
                        <PromptInputActionMenuContent>
                          <PromptInputActionAddAttachments />
                        </PromptInputActionMenuContent>
                      </PromptInputActionMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'shrink-0 rounded-lg p-2 hover:bg-accent text-muted-foreground transition-colors',
                              webSearchOn && 'text-blue-600'
                            )}
                            onClick={() => setWebSearchOn(!webSearchOn)}
                            aria-pressed={webSearchOn}
                            aria-label={webSearchOn ? 'Turn web search off' : 'Turn web search on'}
                          >
                            <GlobeIcon className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>Web Search: {webSearchOn ? 'On' : 'Off'}</TooltipContent>
                      </Tooltip>
                      {supportsReasoning && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                'shrink-0 rounded-lg p-2 hover:bg-accent text-muted-foreground transition-colors',
                                reasoningOn && 'text-purple-600'
                              )}
                              onClick={() => {
                                const next = !reasoningOn;
                                if (process.env.NODE_ENV === 'development') {
                                  console.log('🧠 Toggle reasoning:', { next, supportsReasoning });
                                }
                                setReasoningOn(next);
                              }}
                              aria-pressed={reasoningOn}
                              aria-label={reasoningOn ? 'Turn reasoning off' : 'Turn reasoning on'}
                            >
                              <BrainIcon className="size-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>{reasoningOn ? 'Reasoning: On' : 'Reasoning: Off'}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div className="row-start-2 col-start-3">
                    <PromptInputSubmit
                      disabled={status !== 'streaming' && !text.trim()}
                      status={status}
                      onStop={handleStop}
                      className="shrink-0"
                    />
                  </div>
                </div>
              </PromptInputBody>
            </PromptInput>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full md:px-0">
          <PromptInput
            onSubmit={handleSubmit}
            className="w-full max-w-2xl"
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
                  onChange={(e) => setText(e.target.value)}
                  value={text}
                  placeholder="Type your message..."
                  className="min-h-[40px] py-2 text-sm md:text-base row-start-1 col-start-1 col-end-4"
                />
                <div className="row-start-2 col-start-1">
                  <div className="flex items-center gap-1">
                    <PromptInputActionMenu>
                      <PromptInputActionMenuTrigger />
                      <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments />
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'shrink-0 rounded-lg p-2 hover:bg-accent text-muted-foreground transition-colors',
                            webSearchOn && 'text-blue-600'
                          )}
                          onClick={() => setWebSearchOn(!webSearchOn)}
                          aria-pressed={webSearchOn}
                          aria-label={webSearchOn ? 'Turn web search off' : 'Turn web search on'}
                        >
                          <GlobeIcon className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6}>Web Search: {webSearchOn ? 'On' : 'Off'}</TooltipContent>
                    </Tooltip>
                    {supportsReasoning && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'shrink-0 rounded-lg p-2 hover:bg-accent text-muted-foreground transition-colors',
                              reasoningOn && 'text-purple-600'
                            )}
                            onClick={() => {
                              const next = !reasoningOn;
                              if (process.env.NODE_ENV === 'development') {
                                console.log('🧠 Toggle reasoning:', { next, supportsReasoning });
                              }
                              setReasoningOn(next);
                            }}
                            aria-pressed={reasoningOn}
                            aria-label={reasoningOn ? 'Turn reasoning off' : 'Turn reasoning on'}
                          >
                            <BrainIcon className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent sideOffset={6}>{reasoningOn ? 'Reasoning: On' : 'Reasoning: Off'}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                <div className="row-start-2 col-start-3">
                  <PromptInputSubmit
                    disabled={status !== 'streaming' && !text.trim()}
                    status={status}
                    onStop={handleStop}
                    className="shrink-0"
                  />
                </div>
              </div>
            </PromptInputBody>
          </PromptInput>
        </div>
      )}
    </div>
  );
});

export default Chat;
