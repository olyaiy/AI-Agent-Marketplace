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
import { cn } from '@/lib/utils';
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
import { Trash2Icon } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  addConversationOptimistically, 
  revalidateConversations,
  generateConversationTitleAsync,
} from '@/lib/conversations-cache';

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
  knowledgeText,
}: ChatProps) {
  const [text, setText] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isSignInPending, startSignInTransition] = useTransition();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const conversationIdRef = useRef<string | null>(initialConversationId || null);
  const hasGeneratedTitleRef = useRef<boolean>(false);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [isMultiLine, setIsMultiLine] = useState<boolean>(false);
  const isMultiLineRef = useRef<boolean>(false);
  useEffect(() => { isMultiLineRef.current = isMultiLine; }, [isMultiLine]);
  const observerRef = useRef<ResizeObserver | null>(null);
  const enterTimeoutRef = useRef<number | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);
  const minHoldUntilRef = useRef<number>(0);
  const lineHeightRef = useRef<number>(0);
  const paddingTopRef = useRef<number>(0);
  const paddingBottomRef = useRef<number>(0);
  const { messages, status, sendMessage } = useChat({
    messages: Array.isArray(initialMessages) ? (initialMessages as unknown as UIMessage[]) : [],
    onFinish: async ({ message }) => {
      try {
        const cid = conversationIdRef.current;
        if (!cid || message.role !== 'assistant') return;
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ conversationId: cid, message }),
        });
        
        // Revalidate conversations to update lastMessageAt timestamp
        revalidateConversations();
        
        // Fire-and-forget: Generate AI-powered title after first message
        if (!hasGeneratedTitleRef.current && !initialConversationId) {
          hasGeneratedTitleRef.current = true;
          generateConversationTitleAsync(cid);
        }
      } catch {
        // ignore
      }
    },
  });
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isAuthenticated) {
      setIsDialogOpen(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Multi-line detection using line count, debounced enter/exit and min-hold
  const ENTER_DEBOUNCE_MS = 100;
  const EXIT_DEBOUNCE_MS = 250;
  const MIN_HOLD_MS = 400;

  const textareaCallbackRef = React.useCallback((node: HTMLTextAreaElement | null) => {
    // Cleanup previous observer and any pending timer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (enterTimeoutRef.current) { window.clearTimeout(enterTimeoutRef.current); enterTimeoutRef.current = null; }
    if (exitTimeoutRef.current) { window.clearTimeout(exitTimeoutRef.current); exitTimeoutRef.current = null; }

    if (!node) return;

    // Capture static style metrics for line count calculation
    const style = window.getComputedStyle(node);
    const lineHeightRaw = parseFloat(style.lineHeight);
    const fontSize = parseFloat(style.fontSize) || 16;
    const lineHeight = Number.isNaN(lineHeightRaw) ? Math.round(fontSize * 1.2) : lineHeightRaw;
    lineHeightRef.current = lineHeight > 0 ? lineHeight : Math.max(1, Math.round(fontSize * 1.2));
    paddingTopRef.current = parseFloat(style.paddingTop) || 0;
    paddingBottomRef.current = parseFloat(style.paddingBottom) || 0;

    const handleResize = () => {
      const height = node.clientHeight;
      const contentHeight = Math.max(0, height - paddingTopRef.current - paddingBottomRef.current);
      const lines = contentHeight / (lineHeightRef.current || 1);

      if (!isMultiLineRef.current) {
        // Not multiline yet: debounce entering when lines >= 2
        if (lines >= 2) {
          if (!enterTimeoutRef.current) {
            enterTimeoutRef.current = window.setTimeout(() => {
              enterTimeoutRef.current = null;
              // Re-evaluate at fire time
              const h = node.clientHeight;
              const ch = Math.max(0, h - paddingTopRef.current - paddingBottomRef.current);
              const l = ch / (lineHeightRef.current || 1);
              if (l >= 2) {
                setIsMultiLine(true);
                isMultiLineRef.current = true;
                minHoldUntilRef.current = Date.now() + MIN_HOLD_MS;
                if (exitTimeoutRef.current) { window.clearTimeout(exitTimeoutRef.current); exitTimeoutRef.current = null; }
              }
            }, ENTER_DEBOUNCE_MS);
          }
        } else {
          if (enterTimeoutRef.current) { window.clearTimeout(enterTimeoutRef.current); enterTimeoutRef.current = null; }
        }
      } else {
        // Already multiline: honor min-hold, then debounce exit when lines <= 1
        if (Date.now() < minHoldUntilRef.current) {
          if (exitTimeoutRef.current) { window.clearTimeout(exitTimeoutRef.current); exitTimeoutRef.current = null; }
          return;
        }
        if (lines <= 1) {
          if (!exitTimeoutRef.current) {
            exitTimeoutRef.current = window.setTimeout(() => {
              exitTimeoutRef.current = null;
              const h = node.clientHeight;
              const ch = Math.max(0, h - paddingTopRef.current - paddingBottomRef.current);
              const l = ch / (lineHeightRef.current || 1);
              if (l <= 1) {
                setIsMultiLine(false);
                isMultiLineRef.current = false;
              }
            }, EXIT_DEBOUNCE_MS);
          }
        } else {
          if (exitTimeoutRef.current) { window.clearTimeout(exitTimeoutRef.current); exitTimeoutRef.current = null; }
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(node);
    observerRef.current = resizeObserver;

    // Trigger once to initialize state correctly for existing content
    handleResize();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      if (enterTimeoutRef.current) { window.clearTimeout(enterTimeoutRef.current); enterTimeoutRef.current = null; }
      if (exitTimeoutRef.current) { window.clearTimeout(exitTimeoutRef.current); exitTimeoutRef.current = null; }
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

    // Ensure conversation exists before sending first message if agentTag is known
    let effectiveConversationId = conversationId;
    let createdThisCall = false;
    if (!effectiveConversationId && agentTag) {
      try {
        // Generate temporary ID for optimistic update
        const tempId = `temp-${Date.now()}`;
        const agentId = agentTag.startsWith('@') ? agentTag.slice(1) : agentTag;
        const conversationTitle = trimmed.slice(0, 60);
        
        // Optimistically add conversation to sidebar
        await addConversationOptimistically({
          id: tempId,
          agentId,
          dateIso: new Date().toISOString(),
          title: conversationTitle,
        });

        // Create actual conversation
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ agentTag, model, title: conversationTitle, knowledgeText: knowledgeText || undefined }),
        });
        
        if (res.ok) {
          const data = (await res.json()) as { id: string; agentTag: string; title: string | null };
          setConversationId(data.id);
          effectiveConversationId = data.id;
          conversationIdRef.current = data.id;
          createdThisCall = true;

          // Revalidate to replace temp with real conversation
          await revalidateConversations();

          // Replace URL to /agent/[agent-id]/[conversation-id]
          if (pathname) {
            const parts = pathname.split('/').filter(Boolean);
            const agentIndex = parts.indexOf('agent');
            if (agentIndex >= 0 && parts.length > agentIndex + 1) {
              const slug = parts[agentIndex + 1];
              const qs = searchParams?.toString();
              const newUrl = qs ? `/agent/${slug}/${data.id}?${qs}` : `/agent/${slug}/${data.id}`;
              if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
                window.history.replaceState(null, '', newUrl);
              } else if (typeof window !== 'undefined' && window.location) {
                window.location.replace(newUrl);
              }
            }
          }
        } else {
          // Rollback optimistic update on error
          await revalidateConversations();
        }
      } catch {
        // Rollback optimistic update on error
        await revalidateConversations();
        // Continue anyway; server will still create on-demand
      }
    }

    const ctx = getChatContext ? getChatContext() || undefined : undefined;
    if (effectiveConversationId) {
      conversationIdRef.current = effectiveConversationId;
    }
    
    // Log the entire conversation history before sending (including initialMessages from DB)
    const fromServer = (Array.isArray(initialMessages) ? (initialMessages as BasicUIMessage[]) : []) as BasicUIMessage[];
    const live = (messages as unknown as BasicUIMessage[]) || [];
    const byId = new Map<string, BasicUIMessage>();
    for (const m of fromServer) byId.set(m.id, m);
    for (const m of live) byId.set(m.id, m);
    const fullHistory = Array.from(byId.values()).filter(msg => !deletedMessageIds.has(msg.id));
    
    console.log('📝 Full Conversation History:', {
      conversationId: effectiveConversationId,
      messageCount: fullHistory.length,
      messages: fullHistory,
      breakdown: {
        fromDatabase: fromServer.length,
        fromLiveSession: live.length,
        deleted: deletedMessageIds.size,
      }
    });
    
    // TODO: Add file support to backend
    // For now, just send the text message
    // Include system only for the first send immediately after creating the conversation
    const systemForThisSend = createdThisCall ? (ctx?.systemPrompt ?? systemPrompt) : undefined;

    sendMessage(
      { text: trimmed },
      {
        body: {
          systemPrompt: systemForThisSend,
          model: ctx?.model ?? model,
          conversationId: effectiveConversationId,
          agentTag,
        },
      }
    );
  };

  const handleSignIn = () => {
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
                                  isStreaming={status === 'streaming'}
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
                  {isAuthenticated && (
                    <Actions 
                      className={`mt-1 opacity-100 md:opacity-0 md:group-hover/message:opacity-100 transition-opacity duration-150 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <Action
                        onClick={() => handleDeleteMessage(message.id)}
                        label="Delete message"
                      >
                        <Trash2Icon className="size-4" />
                      </Action>
                    </Actions>
                  )}
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
                <div
                  className={cn(
                    'grid items-end gap-2 p-2 grid-cols-[auto_1fr_auto] w-full transition-all duration-200 ease-in-out',
                    isMultiLine ? 'grid-rows-[auto_auto]' : 'grid-rows-1'
                  )}
                >
                  <div className={cn(
                    'transition-all duration-200 ease-in-out',
                    isMultiLine ? 'row-start-2 col-start-1' : 'row-start-1 col-start-1'
                  )}>
                    <PromptInputActionMenu>
                      <PromptInputActionMenuTrigger />
                      <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments />
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu>
                  </div>
                  <PromptInputTextarea
                    ref={textareaCallbackRef}
                    autoFocus
                    onChange={(e) => setText(e.target.value)}
                    value={text}
                    placeholder="Type your message..."
                    className={cn(
                      'min-h-[40px] py-2 text-sm md:text-base transition-all duration-200 ease-in-out',
                      isMultiLine
                        ? 'row-start-1 col-start-1 col-end-4'
                        : 'row-start-1 col-start-2 col-end-3'
                    )}
                  />
                  <div className={cn(
                    'transition-all duration-200 ease-in-out',
                    isMultiLine ? 'row-start-2 col-start-3' : 'row-start-1 col-start-3'
                  )}>
                    <PromptInputSubmit 
                      disabled={!text.trim()} 
                      status={status}
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
              <div
                className={cn(
                  'grid items-end gap-2 p-2 grid-cols-[auto_1fr_auto] w-full transition-all duration-200 ease-in-out',
                  isMultiLine ? 'grid-rows-[auto_auto]' : 'grid-rows-1'
                )}
              >
                <div className={cn(
                  'transition-all duration-200 ease-in-out',
                  isMultiLine ? 'row-start-2 col-start-1' : 'row-start-1 col-start-1'
                )}>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                </div>
                <PromptInputTextarea
                  ref={textareaCallbackRef}
                  autoFocus
                  onChange={(e) => setText(e.target.value)}
                  value={text}
                  placeholder="Type your message..."
                  className={cn(
                    'min-h-[40px] py-2 text-sm md:text-base transition-all duration-200 ease-in-out',
                    isMultiLine
                      ? 'row-start-1 col-start-1 col-end-4'
                      : 'row-start-1 col-start-2 col-end-3'
                  )}
                />
                <div className={cn(
                  'transition-all duration-200 ease-in-out',
                  isMultiLine ? 'row-start-2 col-start-3' : 'row-start-1 col-start-3'
                )}>
                  <PromptInputSubmit 
                    disabled={!text.trim()} 
                    status={status}
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