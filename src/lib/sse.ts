export type StreamUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  outputText: string;
};

function emptyUsage(): StreamUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    outputText: ""
  };
}

function parseSseLines(buffer: string) {
  const events: string[] = [];
  let cursor = 0;

  while (true) {
    const next = buffer.indexOf("\n\n", cursor);
    if (next === -1) {
      break;
    }

    events.push(buffer.slice(cursor, next));
    cursor = next + 2;
  }

  return {
    events,
    remainder: buffer.slice(cursor)
  };
}

function encodeSseData(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function trackOpenAIStream(
  source: ReadableStream<Uint8Array>,
  onComplete?: (usage: StreamUsage) => Promise<void> | void
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = source.getReader();
  let usage = emptyUsage();
  let remainder = "";

  const trackedStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (onComplete) {
          await onComplete(usage);
        }
        controller.close();
        return;
      }

      const chunkText = decoder.decode(value, { stream: true });
      remainder += chunkText;

      const parsed = parseSseLines(remainder);
      remainder = parsed.remainder;

      for (const event of parsed.events) {
        controller.enqueue(encoder.encode(`${event}\n\n`));

        const dataLine = event
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (!dataLine) {
          continue;
        }

        const payload = dataLine.slice(5).trim();
        if (!payload || payload === "[DONE]") {
          continue;
        }

        try {
          const json = JSON.parse(payload);

          const eventUsage = json?.usage ?? json?.response?.usage;

          if (eventUsage) {
            usage.promptTokens = eventUsage.prompt_tokens ?? eventUsage.input_tokens ?? usage.promptTokens;
            usage.completionTokens = eventUsage.completion_tokens ?? eventUsage.output_tokens ?? usage.completionTokens;
            usage.totalTokens =
              eventUsage.total_tokens ?? usage.promptTokens + usage.completionTokens;
          }

          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string") {
            usage.outputText += delta;
          }

          const outputTextDelta = json?.delta;
          if (typeof outputTextDelta === "string") {
            usage.outputText += outputTextDelta;
          }

          if (json?.type === "response.output_text.delta" && typeof json?.delta === "string") {
            usage.outputText += json.delta;
          }
        } catch {
          continue;
        }
      }
    },
    async cancel(reason) {
      await reader.cancel(reason);
    }
  });

  return {
    stream: trackedStream,
    getUsage: () => usage
  };
}

export function convertAnthropicStreamToOpenAI(
  source: ReadableStream<Uint8Array>,
  modelAlias: string,
  requestId: string,
  mode: "chat" | "responses",
  onComplete?: (usage: StreamUsage) => Promise<void> | void
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = source.getReader();
  let remainder = "";
  let usage = emptyUsage();
  let responseId = mode === "chat" ? `chatcmpl_${requestId}` : `resp_${requestId}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (mode === "chat") {
        const initial = {
          id: responseId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: modelAlias,
          choices: [
            {
              index: 0,
              delta: { role: "assistant" },
              finish_reason: null
            }
          ]
        };
        controller.enqueue(encoder.encode(encodeSseData(initial)));
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        remainder += decoder.decode(value, { stream: true });
        const parsed = parseSseLines(remainder);
        remainder = parsed.remainder;

        for (const rawEvent of parsed.events) {
          const lines = rawEvent.split("\n");
          const eventName = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
          const dataRaw = lines.find((line) => line.startsWith("data:"))?.replace("data:", "").trim();

          if (!dataRaw || dataRaw === "[DONE]") {
            continue;
          }

          let data: any;
          try {
            data = JSON.parse(dataRaw);
          } catch {
            continue;
          }

          if (data?.id) {
            responseId = data.id;
          }

          if (eventName === "message_delta" || eventName === "message_start") {
            const inTokens = data?.usage?.input_tokens ?? 0;
            const outTokens = data?.usage?.output_tokens ?? 0;
            usage.promptTokens = Math.max(usage.promptTokens, inTokens);
            usage.completionTokens = Math.max(usage.completionTokens, outTokens);
            usage.totalTokens = usage.promptTokens + usage.completionTokens;
          }

          if (eventName === "content_block_delta") {
            const text = data?.delta?.text;
            if (typeof text === "string" && text.length > 0) {
              usage.outputText += text;

              if (mode === "chat") {
                const chunk = {
                  id: responseId,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model: modelAlias,
                  choices: [
                    {
                      index: 0,
                      delta: { content: text },
                      finish_reason: null
                    }
                  ]
                };

                controller.enqueue(encoder.encode(encodeSseData(chunk)));
              } else {
                controller.enqueue(
                  encoder.encode(
                    encodeSseData({
                      type: "response.output_text.delta",
                      output_index: 0,
                      delta: text
                    })
                  )
                );
              }
            }
          }

          if (eventName === "message_stop") {
            if (mode === "chat") {
              const finalChunk = {
                id: responseId,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: modelAlias,
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: "stop"
                  }
                ],
                usage: {
                  prompt_tokens: usage.promptTokens,
                  completion_tokens: usage.completionTokens,
                  total_tokens: usage.totalTokens
                }
              };

              controller.enqueue(encoder.encode(encodeSseData(finalChunk)));
            } else {
              controller.enqueue(
                encoder.encode(
                  encodeSseData({
                    type: "response.completed",
                    response: {
                      id: responseId,
                      object: "response",
                      created_at: Math.floor(Date.now() / 1000),
                      model: modelAlias,
                      output_text: usage.outputText,
                      output: [
                        {
                          type: "message",
                          role: "assistant",
                          content: [
                            {
                              type: "output_text",
                              text: usage.outputText,
                              annotations: []
                            }
                          ]
                        }
                      ],
                      usage: {
                        input_tokens: usage.promptTokens,
                        output_tokens: usage.completionTokens,
                        total_tokens: usage.totalTokens
                      }
                    }
                  })
                )
              );
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        }
      }

      if (onComplete) {
        await onComplete(usage);
      }

      controller.close();
    },
    async cancel(reason) {
      await reader.cancel(reason);
    }
  });

  return {
    stream,
    getUsage: () => usage
  };
}

