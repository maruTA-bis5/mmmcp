import { ClientError } from '@mattermost/client';

export type ToolError = ToolErrorObj | string;
export interface ToolErrorObj {
    code: string;
    message: string;
    details?: unknown;
    retryAfter?: number;
}

export class MattermostApiError extends Error {
    public constructor(
        public readonly statusCode: number,
        message: string,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = 'MattermostApiError';
    }
}

export class AuthenticationError extends MattermostApiError {
    public constructor(statusCode: number, message: string, details?: unknown) {
        super(statusCode, message, details);
        this.name = 'AuthenticationError';
    }
}

export class RateLimitError extends MattermostApiError {
    public constructor(
        message: string,
        public readonly retryAfter?: number,
        details?: unknown,
    ) {
        super(429, message, details);
        this.name = 'RateLimitError';
    }
}

export class ValidationError extends Error {
    public constructor(
        message: string,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class ModeError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = 'ModeError';
    }
}

export function toToolError(error: unknown): ToolError {
    if (error instanceof RateLimitError) {
        return {
            code: 'RATE_LIMITED',
            message: error.message,
            details: error.details,
            ...(error.retryAfter === undefined ? {} : { retryAfter: error.retryAfter }),
        };
    }
    if (error instanceof AuthenticationError) {
        return {
            code: 'AUTHENTICATION_ERROR',
            message: error.message,
            details: error.details,
        };
    }
    if (error instanceof MattermostApiError) {
        return {
            code: 'MATTERMOST_API_ERROR',
            message: error.message,
            details: error.details,
        };
    }
    if (error instanceof ValidationError) {
        return {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details,
        };
    }
    if (error instanceof ModeError) {
        return { code: 'MODE_ERROR', message: error.message };
    }
    if (error instanceof ClientError) {
        const statusCode = error.status_code;
        const details = error.server_error_id === undefined ? undefined : { id: error.server_error_id };
        if (statusCode === 401 || statusCode === 403) {
            return {
                code: 'AUTHENTICATION_ERROR',
                message: error.message,
                details,
            };
        }
        return {
            code: statusCode === 429 ? 'RATE_LIMITED' : 'MATTERMOST_API_ERROR',
            message: error.message,
            details,
        };
    }
    if (error instanceof Error) {
        return error.message;
    }
    return { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' };
}

export function toolErrorResult(error: unknown) {
    const toolError = toToolError(error);
    const text = typeof toolError === 'string' ? toolError : JSON.stringify(toolError);
    return {
        content: [{ type: 'text' as const, text }],
        isError: true,
    };
}
