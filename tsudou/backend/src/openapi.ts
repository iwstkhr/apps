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
import type { AppErrorCode } from './errors';
import { STATUS_BY_CODE } from './http';
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
    [MANAGE_TOKEN]: z.string().meta({ description: 'イベント作成時に返した管理トークン' }),
  });
  const editTokenHeader = z.object({
    [EDIT_TOKEN]: z.string().meta({ description: '回答作成時に返した回答編集キー' }),
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
    summary: 'ヘルスチェック',
    tags: ['system'],
    responses: {
      200: json('稼働中', z.object({ ok: z.literal(true) })),
    },
  });

  registry.registerPath({
    method: 'post',
    path: `${API_PREFIX}/events`,
    summary: 'イベント作成',
    tags: ['events'],
    request: { body: body(CreateEventBodySchema) },
    responses: {
      201: json('作成した', CreateEventResultSchema),
      ...errors('VALIDATION'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: `${API_PREFIX}/events/{eventId}`,
    summary: 'イベント取得 (回答を含む)',
    tags: ['events'],
    request: { params: eventParams },
    responses: {
      200: json('イベント', EventViewSchema),
      ...errors('NOT_FOUND'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: `${API_PREFIX}/events/{eventId}`,
    summary: 'イベント更新・締切',
    tags: ['events'],
    request: { params: eventParams, headers: manageTokenHeader, body: body(UpdateEventBodySchema) },
    responses: {
      200: json('更新後のイベント', EventViewSchema),
      ...errors('VALIDATION', 'FORBIDDEN', 'NOT_FOUND'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: `${API_PREFIX}/events/{eventId}`,
    summary: 'イベント削除 (回答も消える)',
    tags: ['events'],
    request: { params: eventParams, headers: manageTokenHeader },
    responses: {
      204: { description: '削除した' },
      ...errors('FORBIDDEN', 'NOT_FOUND'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: `${API_PREFIX}/events/{eventId}/answers`,
    summary: '回答の作成',
    tags: ['answers'],
    request: { params: eventParams, body: body(AnswerBodySchema) },
    responses: {
      201: json('作成した', SubmitAnswerResultSchema),
      ...errors('VALIDATION', 'NOT_FOUND', 'CLOSED', 'DUPLICATE_NAME'),
    },
  });

  registry.registerPath({
    method: 'put',
    path: `${API_PREFIX}/answers/{answerId}`,
    summary: '回答の更新',
    tags: ['answers'],
    request: { params: answerParams, headers: editTokenHeader, body: body(AnswerBodySchema) },
    responses: {
      200: json('更新後の回答', AnswerViewSchema),
      ...errors('VALIDATION', 'FORBIDDEN', 'NOT_FOUND', 'CLOSED', 'DUPLICATE_NAME'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: `${API_PREFIX}/answers/{answerId}`,
    summary: '回答の削除',
    description: '回答編集キー (本人) または管理トークン (主催者) のどちらかが必要',
    tags: ['answers'],
    request: {
      params: answerParams,
      headers: editTokenHeader.partial().extend(manageTokenHeader.partial().shape),
    },
    responses: {
      204: { description: '削除した' },
      ...errors('FORBIDDEN', 'NOT_FOUND'),
    },
  });

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Tsudou API',
      version: pkg.version,
      description:
        'ログイン不要の日程調整サービスの API。画面と同じオリジンの /api 以下にあり、認証はない。' +
        '文字数の上限は前後の空白を除いてから数える。',
    },
  });
}

/** 生成物の置き場所。リポジトリのルートの docs/ に、仕様書と並べて置く。 */
export const OPENAPI_PATH = fileURLToPath(new URL('../../docs/openapi.yaml', import.meta.url));

export function renderOpenApiYaml(): string {
  return `# 生成物なので直接編集しない。backend/src/openapi.ts を直して pnpm run openapi で作り直す\n${stringify(generateOpenApiDocument())}`;
}
