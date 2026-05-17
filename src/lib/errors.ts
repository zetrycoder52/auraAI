export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export function toOpenAIError(error: unknown, requestId?: string) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: {
        error: {
          message: error.message,
          type: error.code,
          param: null,
          code: error.code,
          request_id: error.requestId ?? requestId ?? null
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        message: "Internal server error",
        type: "internal_server_error",
        param: null,
        code: "internal_server_error",
        request_id: requestId ?? null
      }
    }
  };
}

