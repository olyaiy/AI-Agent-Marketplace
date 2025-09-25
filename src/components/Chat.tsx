'use client';

import * as React from 'react';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { useState } from 'react';
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

interface ChatProps {
  className?: string;
  systemPrompt?: string;
  model?: string;
  avatarUrl?: string; // optional avatar URL like /avatar/filename.png
  getChatContext?: () => { systemPrompt?: string; model?: string } | null;
}

const Chat = React.memo(function Chat({ className, systemPrompt, model, getChatContext }: ChatProps) {
  const [text, setText] = useState<string>('');
  const { messages, status, sendMessage } = useChat();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;
    const ctx = getChatContext ? getChatContext() || undefined : undefined;
    sendMessage({ text: text }, { body: { systemPrompt: ctx?.systemPrompt ?? systemPrompt, model: ctx?.model ?? model } });
    setText('');
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={`flex max-w-3xl flex-col h-full ${className || ''}`}>
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