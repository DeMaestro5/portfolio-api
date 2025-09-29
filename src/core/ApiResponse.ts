import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Helper code for the API consumer to understand the error and handle is accordingly
enum StatusCode {
  SUCCESS = '10000',
  FAILURE = '10001',
  RETRY = '10002',
}

enum ResponseStatus {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500,
  TOO_MANY_REQUESTS = 429,
}

interface ApiMetadata {
  timestamp: string;
  cached?: boolean;
  requestId: string;
  duration?: string;
  rateLimit?: {
    remaining: number;
    reset: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

abstract class ApiResponse {
  constructor(
    protected statusCode: StatusCode,
    protected status: ResponseStatus,
    protected message: string,
    protected metadata?: ApiMetadata,
  ) {
    if (!this.metadata) {
      this.metadata = {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
      };
    }
  }

  protected prepare<T extends ApiResponse>(
    res: Response,
    response: T,
    headers: { [key: string]: string },
  ): Response {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Request-Id': this.metadata?.requestId || uuidv4(),
    };

    const allHeaders = { ...defaultHeaders, ...headers };

    for (const [key, value] of Object.entries(allHeaders))
      res.append(key, value);

    return res.status(this.status).json(ApiResponse.sanitize(response));
  }

  public send(
    res: Response,
    headers: { [key: string]: string } = {},
  ): Response {
    return this.prepare<ApiResponse>(res, this, headers);
  }

  private static sanitize<T extends ApiResponse>(response: T): T {
    const clone: T = {} as T;
    Object.assign(clone, response);
    // @ts-ignore
    delete clone.status;
    for (const i in clone) if (typeof clone[i] === 'undefined') delete clone[i];
    return clone;
  }
  protected setCacheMetadata(cached: boolean, ttl?: number): void {
    if (this.metadata) {
      this.metadata.cached = cached;
      if (ttl && !cached) {
        this.metadata.rateLimit = {
          remaining: 0,
          reset: new Date(Date.now() + ttl * 1000).toISOString(),
        };
      }
    }
  }

  protected setTiming(startTime: number): void {
    if (this.metadata) {
      this.metadata.duration = `${Date.now() - startTime}ms`;
    }
  }
}

export class NotFoundResponse extends ApiResponse {
  constructor(message = 'Not Found', metadata?: ApiMetadata) {
    super(StatusCode.FAILURE, ResponseStatus.NOT_FOUND, message, metadata);
  }

  send(res: Response, headers: { [key: string]: string } = {}): Response {
    return super.prepare<NotFoundResponse>(res, this, headers);
  }
}

export class ForbiddenResponse extends ApiResponse {
  constructor(message = 'Forbidden', metadata?: ApiMetadata) {
    super(StatusCode.FAILURE, ResponseStatus.FORBIDDEN, message, metadata);
  }
}

export class BadRequestResponse extends ApiResponse {
  constructor(message = 'Bad Parameters', metadata?: ApiMetadata) {
    super(StatusCode.FAILURE, ResponseStatus.BAD_REQUEST, message, metadata);
  }
}

export class InternalErrorResponse extends ApiResponse {
  constructor(message = 'Internal Error', metadata?: ApiMetadata) {
    super(StatusCode.FAILURE, ResponseStatus.INTERNAL_ERROR, message, metadata);
  }
}
export class TooManyRequestsResponse extends ApiResponse {
  constructor(
    message = 'Too Many Requests',
    retryAfter?: string,
    metadata?: ApiMetadata,
  ) {
    super(
      StatusCode.RETRY,
      ResponseStatus.TOO_MANY_REQUESTS,
      message,
      metadata,
    );
  }

  send(res: Response, headers: { [key: string]: string } = {}): Response {
    const retryHeaders = {
      'Retry-After': '3600', // 1 hour default
      ...headers,
    };
    return super.prepare<TooManyRequestsResponse>(res, this, retryHeaders);
  }
}

export class SuccessMsgResponse extends ApiResponse {
  constructor(message: string, metadata?: ApiMetadata) {
    super(StatusCode.SUCCESS, ResponseStatus.SUCCESS, message, metadata);
  }
}

export class FailureMsgResponse extends ApiResponse {
  constructor(message: string, metadata?: ApiMetadata) {
    super(StatusCode.FAILURE, ResponseStatus.SUCCESS, message, metadata);
  }
}

export class SuccessResponse<T> extends ApiResponse {
  constructor(
    message: string,
    private data: T,
    private pagination?: Pagination,
    metadata?: ApiMetadata,
  ) {
    super(StatusCode.SUCCESS, ResponseStatus.SUCCESS, message, metadata);
  }

  static cached<T>(
    message: string,
    data: T,
    pagination?: Pagination,
    requestId?: string,
  ): SuccessResponse<T> {
    const metadata: ApiMetadata = {
      timestamp: new Date().toISOString(),
      cached: true,
      requestId: requestId || uuidv4(),
    };
    return new SuccessResponse(message, data, pagination, metadata);
  }

  static fresh<T>(
    message: string,
    data: T,
    pagination?: Pagination,
    startTime?: number,
    requestId?: string,
  ): SuccessResponse<T> {
    const metadata: ApiMetadata = {
      timestamp: new Date().toISOString(),
      cached: false,
      requestId: requestId || uuidv4(),
    };

    if (startTime) {
      metadata.duration = `${Date.now() - startTime}ms`;
    }
    return new SuccessResponse(message, data, pagination, metadata);
  }

  send(res: Response, headers: { [key: string]: string } = {}): Response {
    return super.prepare<SuccessResponse<T>>(res, this, headers);
  }
}
export class PortfolioSuccessResponse<T> extends SuccessResponse<T> {
  constructor(
    message: string,
    data: T,
    cached: boolean = false,
    rateLimit?: { remaining: number; reset: string },
    requestId?: string,
    startTime?: number,
  ) {
    const metadata: ApiMetadata = {
      timestamp: new Date().toISOString(),
      cached,
      requestId: requestId || uuidv4(),
      rateLimit,
    };

    if (startTime) {
      metadata.duration = `${Date.now() - startTime}ms`;
    }

    super(message, data, undefined, metadata);
  }
}

export class GitHubErrorResponse extends InternalErrorResponse {
  constructor(
    message: string = 'GitHub API Error',
    private apiError?: string,
    private rateLimit?: { remaining: number; reset: string },
    requestId?: string,
  ) {
    const metadata: ApiMetadata = {
      timestamp: new Date().toISOString(),
      cached: false,
      requestId: requestId || uuidv4(),
      rateLimit,
    };
    super(message, metadata);
  }
}

export const ApiResponses = {
  success: <T>(
    data: T,
    message = 'Success',
    cached = false,
    requestId?: string,
    startTime?: number,
  ) => {
    return cached
      ? SuccessResponse.cached(message, data, undefined, requestId)
      : SuccessResponse.fresh(message, data, undefined, startTime, requestId);
  },

  github: {
    success: <T>(
      data: T | string,
      message = 'Github data retrieved successfully',
      cached = false,
      rateLimit?: { remaining: number; reset: string },
      requestId?: string,
      startTime?: number,
    ) => {
      return new PortfolioSuccessResponse(
        message,
        data,
        cached,
        rateLimit,
        requestId,
        startTime,
      );
    },

    error: (
      message = 'Github API Error',
      apiError?: string,
      rateLimit?: { remaining: number; reset: string },
      requestId?: string,
    ) => {
      return new GitHubErrorResponse(message, apiError, rateLimit, requestId);
    },
  },

  badRequest: (message = 'Bad Request', requestId?: string) => {
    const metadata: ApiMetadata = {
      timestamp: new Date().toISOString(),
      requestId: requestId || uuidv4(),
    };
    return new BadRequestResponse(message, metadata);
  },

  notFound: (message = 'Resource not found', requestId?: string) => {
    const metadata: ApiMetadata = {
      timestamp: new Date().toISOString(),
      requestId: requestId || uuidv4(),
    };
    return new NotFoundResponse(message, metadata);
  },
  rateLimit: (
    message = 'Too many requests',
    requiredId?: string,
    retryAfter = '3600',
  ) => {
    const metadata: ApiMetadata = {
      timestamp: new Date().toISOString(),
      requestId: requiredId || uuidv4(),
    };
    return new TooManyRequestsResponse(message, retryAfter, metadata);
  },

  internalError: (message = 'Internal server error', requestId?: string) => {
    const metadata: ApiMetadata = {
      timestamp: new Date().toISOString(),
      requestId: requestId || uuidv4(),
    };
    return new InternalErrorResponse(message, metadata);
  },
};

export type { ApiMetadata, Pagination };
export { StatusCode, ResponseStatus };
