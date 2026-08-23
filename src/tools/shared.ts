import { z } from 'zod';

import type { DownloadedFile } from '../mattermost/types.js';
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

export async function safeFileRepresentation(file: DownloadedFile): Promise<Record<string, unknown>> {
    if (file.truncated && file.bytes.byteLength === 0) {
        return {
            file_name: file.fileName,
            content_type: file.contentType,
            size_bytes: file.contentLength,
            truncated: true,
            message: 'Attachment exceeds the 1 MiB safe read limit; its content is not returned.',
        };
    }

    const declaredText = isTextContentType(file.contentType);
    const looksTextual = declaredText || isLikelyText(file.bytes);

    if (!looksTextual) {
        return {
            file_name: file.fileName,
            content_type: file.contentType,
            size_bytes: file.contentLength ?? file.bytes.byteLength,
            binary: true,
            message: 'Binary attachment content is not returned. Use the file metadata to retrieve it safely.',
        };
    }

    const bytes = file.bytes.slice(0, 1_048_576);
    let content: string;
    try {
        content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        return {
            file_name: file.fileName,
            content_type: file.contentType,
            size_bytes: file.contentLength ?? file.bytes.byteLength,
            binary: true,
            message: 'Attachment is not valid UTF-8 text and is not returned.',
        };
    }

    return {
        file_name: file.fileName,
        content_type: file.contentType,
        size_bytes: file.contentLength ?? file.bytes.byteLength,
        truncated: file.truncated,
        content,
    };
}

function isTextContentType(contentType: string | undefined): boolean {
    if (!contentType) {
        return false;
    }
    const mime = contentType.split(';', 1)[0]?.toLowerCase() ?? '';
    return (
        mime.startsWith('text/') ||
        mime === 'application/json' ||
        mime.endsWith('+json') ||
        mime === 'application/xml' ||
        mime.endsWith('+xml') ||
        mime === 'application/javascript'
    );
}

function isLikelyText(bytes: Uint8Array): boolean {
    const sample = bytes.slice(0, 8_192);
    if (sample.includes(0)) {
        return false;
    }

    try {
        new TextDecoder('utf-8', { fatal: true }).decode(sample);
        const controlCharacters = sample.filter(
            byte => byte < 0x09 || (byte > 0x0d && byte < 0x20) || byte === 0x7f,
        ).length;
        return controlCharacters <= sample.length * 0.01;
    } catch {
        return false;
    }
}
