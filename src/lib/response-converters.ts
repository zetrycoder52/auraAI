export function chatCompletionToResponseObject(chatCompletion: any) {
  const text = chatCompletion?.choices?.[0]?.message?.content ?? "";
  const usage = chatCompletion?.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  return {
    id: `resp_${chatCompletion?.id ?? crypto.randomUUID()}`,
    object: "response",
    created_at: chatCompletion?.created ?? Math.floor(Date.now() / 1000),
    model: chatCompletion?.model,
    output_text: text,
    output: [
      {
        type: "message",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text,
            annotations: []
          }
        ]
      }
    ],
    usage: {
      input_tokens: usage.prompt_tokens ?? usage.input_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0
    }
  };
}

export function responseObjectToChatCompletion(responseObject: any, modelAlias: string) {
  const text = responseObject?.output_text ?? responseObject?.output?.[0]?.content?.[0]?.text ?? "";
  const usage = responseObject?.usage ?? { input_tokens: 0, output_tokens: 0, total_tokens: 0 };

  return {
    id: `chatcmpl_${responseObject?.id ?? crypto.randomUUID()}`,
    object: "chat.completion",
    created: responseObject?.created_at ?? Math.floor(Date.now() / 1000),
    model: modelAlias,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: usage.input_tokens ?? usage.prompt_tokens ?? 0,
      completion_tokens: usage.output_tokens ?? usage.completion_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0
    }
  };
}

