import { z } from 'zod';

import type { DownloadedFile } from '../mattermost/types.js';
import { toolErrorResult } from '../utils/errors.js';

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export interface ToolServer {
  registerTool<Input extends z.ZodRawShape>(
    name: string,
    definition: {
      description: string;
      inputSchema: Input;
    },
    handler: (input: z.infer<z.ZodObject<Input>>) => Promise<ToolResult>,
  ): unknown;
}

export const idSchema = z.string().min(1).describe('Mattermost resource ID');

export const paginationSchema = {
  page: z.number().int().min(0).optional().describe('Zero-based page number'),
  per_page: z.number().int().min(1).max(200).optional().describe('Results per page'),
};

export async function execute(operation: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return textResult(await operation());
  } catch (error) {
    return toolErrorResult(error);
  }
}

export function textResult(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
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
      (byte) => byte < 0x09 || (byte > 0x0d && byte < 0x20) || byte === 0x7f,
    ).length;
    return controlCharacters <= sample.length * 0.01;
  } catch {
    return false;
  }
}
