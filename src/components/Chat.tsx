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
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
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
import { Trash2Icon, CopyIcon, CheckIcon, Brain as BrainIcon } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  addConversationOptimistically,
  revalidateConversations,
  generateConversationTitleAsync,
} from '@/lib/conversations-cache';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChatProps {
  className?: string;
  systemPrompt?: string;
  model?: string;
  avatarUrl?: string; // optional avatar URL like /avatars/filename.png
  getChatContext?: () => { systemPrompt?: string; model?: string } | null;
  isAuthenticated?: boolean;
  agentTag?: string;
  initialConversationId?: string;
  initialMessages?: unknown[];
  // Optional knowledge text to persist as a system message at conversation creation time
  knowledgeText?: string;
}

const Chat = React.memo(function Chat({
  className,
  systemPrompt,
  model,
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
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastAssistantMessageRef = useRef<UIMessage | null>(null);
  const [supportsReasoning, setSupportsReasoning] = useState<boolean>(false);
  const [reasoningOn, setReasoningOn] = useState<boolean>(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { messages, status, sendMessage, stop } = useChat({
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
        if (!hasGeneratedTitleRef.current && !initialConversationId) {
          hasGeneratedTitleRef.current = true;
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
        const effectiveModel = model?.trim();
        if (!effectiveModel) {
          if (!cancelled) { setSupportsReasoning(false); setReasoningOn(false); }
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
          if (!supports) setReasoningOn(false);
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
          setReasoningOn(false);
        }
      }
    }
    detect();
    return () => { cancelled = true; };
  }, [model]);

  // Track the last assistant message for saving on abort
  useEffect(() => {
    const lastAssistantMessage = messages.findLast((m) => m.role === 'assistant');
    if (lastAssistantMessage) {
      lastAssistantMessageRef.current = lastAssistantMessage;
    }
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) { window.clearTimeout(copyTimeoutRef.current); copyTimeoutRef.current = null; }
    };
  }, []);

  const handleSubmit = async (message: PromptInputMessage) => {
    const trimmed = message.text.trim();
    if (!trimmed && (!message.files || message.files.length === 0)) return;

    if (!isAuthenticated) {
      setIsDialogOpen(true);
      return;
    }

    // Log file attachments (UI only for now)
    if (message.files && message.files.length > 0) {
      console.log('📎 File attachments:', message.files);
    }

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
      const fullHistory = Array.from(byId.values()).filter(msg => !deletedMessageIds.has(msg.id));
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
    const includeSystem = !initialConversationId && !messages.some((m) => m.role === 'assistant');
    const systemForThisSend = includeSystem ? (ctx?.systemPrompt ?? systemPrompt) : undefined;

    if (process.env.NODE_ENV === 'development') {
      console.log('➡️ Sending message:', {
        modelUsed: ctx?.model ?? model,
        supportsReasoning,
        reasoningEnabled: supportsReasoning ? reasoningOn : false,
        includeSystem,
        conversationId: effectiveConversationId,
      });
    }

    sendMessage(
      { text: trimmed },
      {
        body: {
          systemPrompt: systemForThisSend,
          model: ctx?.model ?? model,
          conversationId: effectiveConversationId,
          agentTag,
          reasoningEnabled: supportsReasoning ? reasoningOn : false,
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
    return parts.map((p) => p.text).join('\n\n');
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

  interface BasicUIPart { type: string; text: string }
  interface BasicUIMessage { id: string; role: 'user' | 'assistant' | 'system'; parts: BasicUIPart[] }
  const allMessages = useMemo<BasicUIMessage[]>(() => {
    const fromServer = (Array.isArray(initialMessages) ? (initialMessages as BasicUIMessage[]) : []) as BasicUIMessage[];
    const live = (messages as unknown as BasicUIMessage[]) || [];
    if (fromServer.length === 0) return live;
    const byId = new Map<string, BasicUIMessage>();
    for (const m of fromServer) byId.set(m.id, m);
    for (const m of live) byId.set(m.id, m);
    // Filter out deleted messages
    return Array.from(byId.values()).filter(msg => !deletedMessageIds.has(msg.id));
  }, [initialMessages, messages, deletedMessageIds]);
  const hasMessages = allMessages.length > 0;
  const displayedMessages = useMemo(() => allMessages, [allMessages]);

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
      {hasMessages ? (
        <>
          {/* Scrollable conversation area */}
          <div className="flex-1 overflow-hidden pb-20 md:pb-0">
            <Conversation className="h-full overflow-y-scroll md:overflow-y-visible">
              <ConversationContent className="">
                {displayedMessages.map((message: BasicUIMessage) => (
                  <div key={message.id} className="group/message">
                    <Message from={message.role}>
                      <MessageContent>
                        {message.parts.map((part: BasicUIPart, i: number) => {
                          switch (part.type) {
                            case 'text':
                              return (
                                <Response key={`${message.id}-${i}`}>{part.text}</Response>
                              );
                            case 'reasoning':
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
                            default:
                              return null;
                          }
                        })}
                      </MessageContent>
                    </Message>
                  <Actions 
                    className={`mt-1 opacity-100 md:opacity-0 md:group-hover/message:opacity-100 transition-opacity duration-150 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
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
                ))}
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
