import type {
  ChatTransport,
  UIMessage,
  UIMessageChunk,
  PrepareSendMessagesRequest,
  PrepareReconnectToStreamRequest,
} from 'ai';
import { parseJsonEventStream, uiMessageChunkSchema } from 'ai';

type IteratorToStreamOptions = {
  signal?: AbortSignal;
};

function iteratorToStream<T>(iterator: AsyncIterator<T>, options?: IteratorToStreamOptions): ReadableStream<T> {
  return new ReadableStream<T>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      if (typeof iterator.return === 'function') {
        await iterator.return();
      }
    },
  }, options?.signal ? { signal: options.signal } : undefined);
}

async function* streamToIterator<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

type WorkflowChatTransportOptions<UI_MESSAGE extends UIMessage> = {
  api?: string;
  fetch?: typeof fetch;
  onChatSendMessage?: (response: Response, options: { chatId: string }) => void | Promise<void>;
  onChatEnd?: (options: { chatId: string; chunkIndex: number }) => void | Promise<void>;
  maxConsecutiveErrors?: number;
  prepareSendMessagesRequest?: PrepareSendMessagesRequest<UI_MESSAGE>;
  prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest<UI_MESSAGE>;
};

export class WorkflowChatTransport<UI_MESSAGE extends UIMessage = UIMessage> implements ChatTransport<UI_MESSAGE> {
  private api: string;
  private fetcher: typeof fetch;
  private onChatSendMessage?: WorkflowChatTransportOptions<UI_MESSAGE>['onChatSendMessage'];
  private onChatEnd?: WorkflowChatTransportOptions<UI_MESSAGE>['onChatEnd'];
  private maxConsecutiveErrors: number;
  private prepareSendMessagesRequest?: PrepareSendMessagesRequest<UI_MESSAGE>;
  private prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest<UI_MESSAGE>;

  constructor(options: WorkflowChatTransportOptions<UI_MESSAGE> = {}) {
    this.api = options.api ?? '/api/chat';
    this.fetcher = options.fetch ?? fetch.bind(globalThis);
    this.onChatSendMessage = options.onChatSendMessage;
    this.onChatEnd = options.onChatEnd;
    this.maxConsecutiveErrors = options.maxConsecutiveErrors ?? 3;
    this.prepareSendMessagesRequest = options.prepareSendMessagesRequest;
    this.prepareReconnectToStreamRequest = options.prepareReconnectToStreamRequest;
  }

  async sendMessages(options: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]): Promise<ReadableStream<UIMessageChunk>> {
    return iteratorToStream(this.sendMessagesIterator(options), {
      signal: options.abortSignal,
    });
  }

  private async *sendMessagesIterator(options: Parameters<ChatTransport<UI_MESSAGE>['sendMessages']>[0]): AsyncGenerator<UIMessageChunk> {
    const { chatId, messages, abortSignal, trigger, messageId, metadata, body, headers } = options;
    let gotFinish = false;
    let chunkIndex = 0;

    const requestConfig = this.prepareSendMessagesRequest
      ? await this.prepareSendMessagesRequest({
        id: chatId,
        messages,
        requestMetadata: metadata,
        body,
        credentials: undefined,
        headers,
        api: this.api,
        trigger,
        messageId,
      })
      : undefined;

    const url = requestConfig?.api ?? this.api;
    const resolvedHeaders = requestConfig?.headers ?? headers;
    const resolvedCredentials = requestConfig?.credentials;
    const resolvedBody = requestConfig?.body ?? { messages, ...(body ?? {}) };

    const res = await this.fetcher(url, {
      method: 'POST',
      body: JSON.stringify(resolvedBody),
      headers: resolvedHeaders,
      credentials: resolvedCredentials,
      signal: abortSignal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Failed to fetch chat: ${res.status} ${await res.text()}`);
    }

    const workflowRunId = res.headers.get('x-workflow-run-id');
    if (!workflowRunId) {
      throw new Error('Workflow run ID not found in "x-workflow-run-id" response header');
    }

    await this.onChatSendMessage?.(res, { chatId });

    try {
      const chunkStream = parseJsonEventStream({
        stream: res.body,
        schema: uiMessageChunkSchema,
      });
      for await (const chunk of streamToIterator(chunkStream)) {
        if (!chunk.success) {
          throw chunk.error;
        }
        chunkIndex++;
        yield chunk.value;
        if (chunk.value.type === 'finish') {
          gotFinish = true;
        }
      }
    } catch (error) {
      console.error('Error in chat POST stream', error);
    }

    if (gotFinish) {
      await this.onFinish(gotFinish, { chatId, chunkIndex });
    } else {
      yield* this.reconnectToStreamIterator(options, workflowRunId, chunkIndex);
    }
  }

  async reconnectToStream(options: Parameters<ChatTransport<UI_MESSAGE>['reconnectToStream']>[0]): Promise<ReadableStream<UIMessageChunk> | null> {
    const it = this.reconnectToStreamIterator(options);
    return iteratorToStream(it);
  }

  private async *reconnectToStreamIterator(
    options: Parameters<ChatTransport<UI_MESSAGE>['reconnectToStream']>[0],
    workflowRunId?: string,
    initialChunkIndex = 0,
  ): AsyncGenerator<UIMessageChunk> {
    let chunkIndex = initialChunkIndex;
    const defaultApi = `${this.api}/${encodeURIComponent(workflowRunId ?? options.chatId)}/stream`;

    const requestConfig = this.prepareReconnectToStreamRequest
      ? await this.prepareReconnectToStreamRequest({
        id: options.chatId,
        requestMetadata: options.metadata,
        body: options.body,
        credentials: undefined,
        headers: options.headers,
        api: defaultApi,
      })
      : undefined;

    const baseUrl = requestConfig?.api ?? defaultApi;
    const resolvedHeaders = requestConfig?.headers ?? options.headers;
    const resolvedCredentials = requestConfig?.credentials;
    let gotFinish = false;
    let consecutiveErrors = 0;

    while (!gotFinish) {
      const url = `${baseUrl}?startIndex=${chunkIndex}`;
      const res = await this.fetcher(url, {
        headers: resolvedHeaders,
        credentials: resolvedCredentials,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Failed to fetch chat: ${res.status} ${await res.text()}`);
      }
      try {
        const chunkStream = parseJsonEventStream({
          stream: res.body,
          schema: uiMessageChunkSchema,
        });
        for await (const chunk of streamToIterator(chunkStream)) {
          if (!chunk.success) {
            throw chunk.error;
          }
          chunkIndex++;
          yield chunk.value;
          if (chunk.value.type === 'finish') {
            gotFinish = true;
          }
        }
        consecutiveErrors = 0;
      } catch (error) {
        console.error('Error in chat GET reconnectToStream', error);
        consecutiveErrors++;
        if (consecutiveErrors >= this.maxConsecutiveErrors) {
          throw new Error(`Failed to reconnect after ${this.maxConsecutiveErrors} consecutive errors. Last error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    await this.onFinish(gotFinish, { chatId: options.chatId, chunkIndex });
  }

  private async onFinish(gotFinish: boolean, { chatId, chunkIndex }: { chatId: string; chunkIndex: number }) {
    if (gotFinish) {
      await this.onChatEnd?.({ chatId, chunkIndex });
    } else {
      throw new Error('No finish chunk received');
    }
  }
}
