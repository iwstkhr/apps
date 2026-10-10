import { fileURLToPath } from 'node:url';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  type ResponseConfig,
} from '@asteasolutions/zod-to-openapi';
import { stringify } from 'yaml';
import * as z from 'zod';
import pkg from '../package.json';
import { API_PREFIX, EDIT_TOKEN, MANAGE_TOKEN } from './app';
import { type AppErrorCode, STATUS_BY_CODE } from './errors';
import {
  AnswerBodySchema,
  AnswerViewSchema,
  CreateEventBodySchema,
  CreateEventResultSchema,
  ErrorResponseSchema,
  EventViewSchema,
  SubmitAnswerResultSchema,
  UpdateEventBodySchema,
} from './schemas';

/**
 * app.ts のルートを OpenAPI のドキュメントにする。Worker からは読み込まない
 * (生成は scripts/openapi.ts、生成物が最新かどうかは openapi.test.ts が確かめる)。
 */
export function generateOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  const eventParams = z.object({ eventId: z.string() });
  const answerParams = z.object({ answerId: z.string() });
  const manageTokenHeader = z.object({
    [MANAGE_TOKEN]: z
      .string()
      .meta({ description: 'Management token returned when the event was created' }),
  });
  const editTokenHeader = z.object({
    [EDIT_TOKEN]: z
      .string()
      .meta({ description: 'Response edit key returned when the response was created' }),
  });

  const json = <T extends z.ZodType>(description: string, schema: T): ResponseConfig => ({
    description,
    content: { 'application/json': { schema } },
  });
  const body = <T extends z.ZodType>(schema: T) => ({
    required: true,
    content: { 'application/json': { schema } },
  });

  /** エラーはステータスごとにまとめ、起こりうるコードを説明に並べる。 */
  const errors = (...codes: AppErrorCode[]): Record<string, ResponseConfig> => {
    const byStatus = new Map<number, AppErrorCode[]>();
    for (const code of [...codes, 'RATE_LIMITED', 'INTERNAL'] as const) {
      const status = STATUS_BY_CODE[code];
      byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
    }
    return Object.fromEntries(
      [...byStatus].map(([status, group]) => [
        status,
        json(group.join(' / '), ErrorResponseSchema),
      ]),
    );
  };

  registry.registerPath({
    method: 'get',
    path: `${API_PREFIX}/healthz`,
    summary: 'Health check',
    tags: ['system'],
    responses: {
      200: json('Operational', z.object({ ok: z.literal(true) })),
    },
  });

  registry.registerPath({
    method: 'post',
    path: `${API_PREFIX}/events`,
    summary: 'Create event',
    tags: ['events'],
    request: { body: body(CreateEventBodySchema) },
    responses: {
      201: json('Created', CreateEventResultSchema),
      ...errors('VALIDATION'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: `${API_PREFIX}/events/{eventId}`,
    summary: 'Get event (including responses)',
    tags: ['events'],
    request: { params: eventParams },
    responses: {
      200: json('Event', EventViewSchema),
      ...errors('NOT_FOUND'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: `${API_PREFIX}/events/{eventId}`,
    summary: 'Update event or close responses',
    tags: ['events'],
    request: { params: eventParams, headers: manageTokenHeader, body: body(UpdateEventBodySchema) },
    responses: {
      200: json('Updated event', EventViewSchema),
      ...errors('VALIDATION', 'FORBIDDEN', 'NOT_FOUND'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: `${API_PREFIX}/events/{eventId}`,
    summary: 'Delete event (also deletes responses)',
    tags: ['events'],
    request: { params: eventParams, headers: manageTokenHeader },
    responses: {
      204: { description: 'Deleted' },
      ...errors('FORBIDDEN', 'NOT_FOUND'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: `${API_PREFIX}/events/{eventId}/answers`,
    summary: 'Create response',
    tags: ['answers'],
    request: { params: eventParams, body: body(AnswerBodySchema) },
    responses: {
      201: json('Created', SubmitAnswerResultSchema),
      ...errors('VALIDATION', 'NOT_FOUND', 'CLOSED', 'DUPLICATE_NAME'),
    },
  });

  registry.registerPath({
    method: 'put',
    path: `${API_PREFIX}/answers/{answerId}`,
    summary: 'Update response',
    tags: ['answers'],
    request: { params: answerParams, headers: editTokenHeader, body: body(AnswerBodySchema) },
    responses: {
      200: json('Updated response', AnswerViewSchema),
      ...errors('VALIDATION', 'FORBIDDEN', 'NOT_FOUND', 'CLOSED', 'DUPLICATE_NAME'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: `${API_PREFIX}/answers/{answerId}`,
    summary: 'Delete response',
    description: 'Requires either the response edit key (owner) or management token (host)',
    tags: ['answers'],
    request: {
      params: answerParams,
      headers: editTokenHeader.partial().extend(manageTokenHeader.partial().shape),
    },
    responses: {
      204: { description: 'Deleted' },
      ...errors('FORBIDDEN', 'NOT_FOUND'),
    },
  });

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Tsudou API',
      version: pkg.version,
      description:
        'API for an event scheduling service without sign-in. It is under /api on the UI origin and has no authentication. ' +
        'Character limits are applied after trimming whitespace.',
    },
  });
}

/** 生成物の置き場所。リポジトリのルートの docs/ に、仕様書と並べて置く。 */
export const OPENAPI_PATH = fileURLToPath(new URL('../../docs/openapi.yaml', import.meta.url));

export function renderOpenApiYaml(): string {
  return `# Generated file; do not edit directly. Update backend/src/openapi.ts or backend/src/schemas.ts and run pnpm run openapi.\n${stringify(generateOpenApiDocument())}`;
}
