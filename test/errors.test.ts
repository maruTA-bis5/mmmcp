import { describe, expect, it } from 'vitest';

import {
    AuthenticationError,
    RateLimitError,
    toolErrorResult,
    toToolError,
    ValidationError,
} from '../src/utils/errors.js';

describe('tool errors', () => {
    it('preserves authentication error details', () => {
        expect(toToolError(new AuthenticationError(401, 'Unauthorized'))).toEqual({
            code: 'AUTHENTICATION_ERROR',
            message: 'Unauthorized',
            details: undefined,
        });
    });

    it('includes a retry delay only when provided', () => {
        expect(toToolError(new RateLimitError('Slow down', 30))).toMatchObject({
            code: 'RATE_LIMITED',
            retryAfter: 30,
        });
        expect(toToolError(new RateLimitError('Slow down'))).not.toHaveProperty('retryAfter');
    });

    it('produces MCP error content', () => {
        const result = toolErrorResult(new ValidationError('Invalid ID'));

        expect(result.isError).toBe(true);
        expect(JSON.parse(result.content[0]?.text ?? '')).toEqual({
            code: 'VALIDATION_ERROR',
            message: 'Invalid ID',
            details: undefined,
        });
    });
});
