import { z } from 'zod';

import { toolErrorResult } from '../utils/errors.js';
import type { ToolOutput } from './tool.js';

export type ToolResult = PlainToolResult | StructuredToolResult<unknown>;
export const PlainToolResultSchema = z.object({
    content: z.array(z.object({ type: z.literal('text'), text: z.string() })).nonempty(),
    isError: z.boolean().exactOptional(),
});
export type PlainToolResult = z.infer<typeof PlainToolResultSchema>;
export type StructuredToolResult<T> = PlainToolResult & {
    structuredContent: T;
};
export const StructuredToolResultSchema = <T extends z.ZodTypeAny>(schema: T) =>
    z.object({
        ...PlainToolResultSchema.shape,
        structuredContent: schema,
    });

export interface ToolServer {
    registerTool<Input, T>(
        name: string,
        definition: {
            description: string;
            inputSchema: z.ZodType<Input>;
            outputSchema?: z.ZodType<T> | undefined;
        },
        handler: (input: z.infer<z.ZodType<Input>>) => Promise<ToolResult>,
    ): unknown;
}

export const idSchema = z.string().min(1).describe('Mattermost resource ID');

export const paginationSchema = {
    page: z.number().int().min(0).optional().describe('Zero-based page number'),
    per_page: z.number().int().min(1).max(200).optional().describe('Results per page'),
};

export async function execute<T>(operation: () => Promise<ToolOutput<T>>): Promise<ToolResult> {
    return Promise.resolve()
        .then(operation)
        .then(o => {
            const structuredParseResult = StructuredToolResultSchema(z.any()).safeParse(o);
            if (structuredParseResult.success) {
                return structuredParseResult.data;
            }
            const parseResult = PlainToolResultSchema.safeParse(o);
            if (parseResult.success) {
                return parseResult.data;
            }
            return textResult(o);
        })
        .catch(toolErrorResult);
}

export function toolStructuredResult<T>(structuredContent: T): StructuredToolResult<T> {
    return {
        content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
        structuredContent,
    };
}

function textResult(value: unknown): PlainToolResult {
    if (value === undefined) {
        return toolErrorResult(new Error('Tool returned undefined instead of a result'));
    }
    const parsed = PlainToolResultSchema.safeParse(value);
    if (parsed.success) {
        return parsed.data;
    }
    return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

export function toolTextResult(text: string): PlainToolResult {
    return { content: [{ type: 'text', text }] };
}
