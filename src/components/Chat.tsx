'use client';

import * as React from 'react';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { useEffect, useMemo, useState, useTransition } from 'react';
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
import { usePathname, useSearchParams } from 'next/navigation';

interface ChatProps {
  className?: string;
  systemPrompt?: string;
  model?: string;
  avatarUrl?: string; // optional avatar URL like /avatar/filename.png
  getChatContext?: () => { systemPrompt?: string; model?: string } | null;
  isAuthenticated?: boolean;
  agentTag?: string;
  initialConversationId?: string;
}

const Chat = React.memo(function Chat({
  className,
  systemPrompt,
  model,
  getChatContext,
  isAuthenticated = false,
  agentTag,
  initialConversationId,
}: ChatProps) {
  const [text, setText] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isSignInPending, startSignInTransition] = useTransition();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const { messages, status, sendMessage } = useChat({
    onFinish: async ({ message }) => {
      try {
        if (!conversationId || message.role !== 'assistant') return;
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ conversationId, message }),
        });
      } catch {
        // ignore
      }
    },
  });
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchString = useMemo(() => searchParams?.toString() ?? '', [searchParams]);

  const draftKey = useMemo(() => {
    if (!pathname) return null;
    return searchString ? `chat-draft:${pathname}?${searchString}` : `chat-draft:${pathname}`;
  }, [pathname, searchString]);

  useEffect(() => {
    if (!draftKey || typeof window === 'undefined') return;
    const storedDraft = window.sessionStorage.getItem(draftKey);
    if (storedDraft && !text) {
      setText(storedDraft);
    }
  }, [draftKey, text]);

  useEffect(() => {
    if (!draftKey || typeof window === 'undefined') return;
    if (text) {
      window.sessionStorage.setItem(draftKey, text);
    } else {
      window.sessionStorage.removeItem(draftKey);
    }
  }, [draftKey, text]);

  useEffect(() => {
    if (isAuthenticated) {
      setIsDialogOpen(false);
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!isAuthenticated) {
      setIsDialogOpen(true);
      return;
    }

    // Ensure conversation exists before sending first message if agentTag is known
    if (!conversationId && agentTag) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ agentTag, systemPrompt, model }),
        });
        if (res.ok) {
          const data = (await res.json()) as { id: string };
          setConversationId(data.id);
        }
      } catch {
        // ignore and continue; server will still create on-demand
      }
    }

    const ctx = getChatContext ? getChatContext() || undefined : undefined;
    sendMessage(
      { text: trimmed },
      {
        body: {
          systemPrompt: ctx?.systemPrompt ?? systemPrompt,
          model: ctx?.model ?? model,
          conversationId: conversationId,
          agentTag,
        },
      }
    );
    setText('');
    if (draftKey && typeof window !== 'undefined') {
      window.sessionStorage.removeItem(draftKey);
    }
  };

  const handleSignIn = () => {
    startSignInTransition(async () => {
      const redirectUrl = typeof window !== 'undefined' ? window.location.href : pathname ?? '/';
      await authClient.signIn.social({ provider: 'google', callbackURL: redirectUrl });
    });
  };

  const hasMessages = messages.length > 0;

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
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return (
                            <Response key={`${message.id}-${i}`}>
                              {part.text}
                            </Response>
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