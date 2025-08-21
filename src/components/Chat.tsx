'use client';

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
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

interface ChatProps {
  className?: string;
}

export default function Chat({ className }: ChatProps) {
  const [text, setText] = useState<string>('');
  const { messages, status, sendMessage } = useChat();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    sendMessage({ text: text });
    setText('');
  };

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
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

      <PromptInput onSubmit={handleSubmit} className="mt-4">
        <PromptInputTextarea
          onChange={(e) => setText(e.target.value)}
          value={text}
          placeholder="Type your message..."
        />
        <PromptInputToolbar>
          <PromptInputSubmit disabled={!text.trim()} status={status} />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}