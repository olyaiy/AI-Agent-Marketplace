'use client';

import * as React from 'react';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import { Loader } from '@/components/ai-elements/loader';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { authClient } from '@/lib/auth-client';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

interface ChatProps {
  className?: string;
  systemPrompt?: string;
  model?: string;
  avatarUrl?: string; // optional avatar URL like /avatar/filename.png
  getChatContext?: () => { systemPrompt?: string; model?: string } | null;
  isAuthenticated?: boolean;
  agentTag?: string;
  initialConversationId?: string;
  initialMessages?: unknown[];
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
  const router = useRouter();
  const [text, setText] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isSignInPending, startSignInTransition] = useTransition();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const conversationIdRef = useRef<string | null>(initialConversationId || null);
  const { messages, status, sendMessage } = useChat({
    onFinish: async ({ message }) => {
      try {
        const cid = conversationIdRef.current;
        if (!cid || message.role !== 'assistant') return;
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ conversationId: cid, message }),
        });
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!isAuthenticated) {
      setIsDialogOpen(true);
      return;
    }

    // Ensure conversation exists before sending first message if agentTag is known
    let effectiveConversationId = conversationId;
    if (!effectiveConversationId && agentTag) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ agentTag, model }),
        });
        if (res.ok) {
          const data = (await res.json()) as { id: string };
          setConversationId(data.id);
          effectiveConversationId = data.id;
          conversationIdRef.current = data.id;
          // refresh RSC so server side sidebar updates immediately
          try { router.refresh(); } catch {}
          // replace URL to /agent/[agent-id]/[conversation-id]
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
        }
      } catch {
        // ignore and continue; server will still create on-demand
      }
    }

    const ctx = getChatContext ? getChatContext() || undefined : undefined;
    if (effectiveConversationId) {
      conversationIdRef.current = effectiveConversationId;
    }
    sendMessage(
      { text: trimmed },
      {
        body: {
          systemPrompt: ctx?.systemPrompt ?? systemPrompt,
          model: ctx?.model ?? model,
          conversationId: effectiveConversationId,
          agentTag,
        },
      }
    );
    setText('');
  };

  const handleSignIn = () => {
    startSignInTransition(async () => {
      const redirectUrl = typeof window !== 'undefined' ? window.location.href : pathname ?? '/';
      await authClient.signIn.social({ provider: 'google', callbackURL: redirectUrl });
    });
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
    return Array.from(byId.values());
  }, [initialMessages, messages]);
  const hasMessages = allMessages.length > 0;
  const displayedMessages = useMemo(() => allMessages.slice(-5), [allMessages]);

  return (
    <div className={`flex max-w-3xl flex-col h-full ${className || ''}`}>
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
          <Conversation>
            <ConversationContent>
              {displayedMessages.map((message: BasicUIMessage) => (
                <Message from={message.role} key={message.id}>
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
              ))}
              {status === 'submitted' && (
                <Message from="assistant">
                  <MessageContent>
                    <Loader size={20} />
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

      <div className="flex flex-col  items-center justify-center  py-4 ">
          <PromptInput onSubmit={handleSubmit} className="mt-0 max-w-3xl ">
            <div className="flex items-center gap-2 p-2">
              <PromptInputTextarea
                autoFocus
                onChange={(e) => setText(e.target.value)}
                value={text}
                placeholder="Type your message..."
                className="flex-1 min-h-[40px] py-2"
              />
              <PromptInputSubmit 
                disabled={!text.trim()} 
                status={status}
                className="shrink-0"
              />
            </div>
          </PromptInput>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full ">
          <PromptInput onSubmit={handleSubmit} className="w-full max-w-2xl">
            <div className="flex items-center gap-2 p-2">
              <PromptInputTextarea
                autoFocus
                onChange={(e) => setText(e.target.value)}
                value={text}
                placeholder="Type your message..."
                className="flex-1 min-h-[40px] py-2"
              />
              <PromptInputSubmit 
                disabled={!text.trim()} 
                status={status}
                className="shrink-0"
              />
            </div>
          </PromptInput>
        </div>
      )}
    </div>
  );
});

export default Chat;