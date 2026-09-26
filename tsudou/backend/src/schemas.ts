import { LIMITS } from '@tsudou/shared/limits';
import type { AnswerStatus, AnswerView, Candidate, Choice, EventView } from '@tsudou/shared/types';
import * as z from 'zod';
import type { AppErrorCode } from './errors';
import { STATUS_BY_CODE } from './http';

/**
 * HTTP の入出力の形を Zod で定義する。リクエストのスキーマは app.ts が実際の検査に使い、
 * すべてのスキーマは openapi.ts が OpenAPI ドキュメントの生成に使う。
 *
 * ここで見るのは JSON の形だけで、値の中身 (長さ・範囲・日時の形式など) は
 * validate.ts が日本語のメッセージで弾く。長さの上限は前後の空白を除いてから数えるため、
 * Zod の .max() では検査せず、ドキュメント用のメタデータ (maxLength など) としてだけ書く。
 *
 * メタデータは zod-to-openapi の .openapi() ではなく Zod 標準の .meta() で書く。
 * zod-to-openapi は .meta() も読めるので、ドキュメントを生成するとき (openapi.ts) だけ読み込めば済み、
 * Worker のバンドルに含めずに済む。id を付けたスキーマは components/schemas に切り出される。
 * zod は `import * as z` で読み込む (`import { z }` だと使わないロケールまでバンドルに入る)。
 */
// ---------------------------------------------------------------- 共通

export const AnswerStatusSchema = z.enum(['YES', 'NO', 'MAYBE']).meta({
  id: 'AnswerStatus',
  description: 'YES: 参加 / NO: 不参加 / MAYBE: 未定',
});

export const CandidateSchema = z
  .object({
    id: z.string().meta({ description: '候補の識別子' }),
    startAt: z.string().meta({ format: 'date-time', description: '開始日時 (ISO 8601)' }),
  })
  .meta({ id: 'Candidate' });

export const CandidateInputSchema = z
  .object({
    id: z.string().nullish().meta({ description: '既存の候補の識別子。無ければ新しく採番する' }),
    startAt: z.string().meta({ format: 'date-time', description: '開始日時 (ISO 8601)' }),
  })
  .meta({ id: 'CandidateInput' });

export const ChoiceSchema = z
  .object({
    candidateId: z.string(),
    status: AnswerStatusSchema,
  })
  .meta({ id: 'Choice' });

const title = z.string().meta({ maxLength: LIMITS.titleMax, description: 'イベント名' });
const fee = z
  .number()
  .nullable()
  .meta({ minimum: 0, maximum: LIMITS.feeMax, description: '参加費 (円)。整数' });
const memo = z.string().nullable().meta({ maxLength: LIMITS.memoMax });
const candidates = z
  .array(CandidateInputSchema)
  .meta({ minItems: 1, maxItems: LIMITS.candidatesMax });
const name = z.string().meta({ maxLength: LIMITS.nameMax, description: '回答者名' });
const message = z.string().nullable().meta({ maxLength: LIMITS.messageMax });
const choices = z.array(ChoiceSchema).meta({ description: 'すべての候補に過不足なく 1 つずつ' });

// ------------------------------------------------------------ リクエスト

export const CreateEventBodySchema = z
  .object({ title, fee: fee.optional(), memo: memo.optional(), candidates })
  .meta({ id: 'CreateEventBody' });

/** 省略した項目は変更しない。fee と memo は null で未設定に戻す。 */
export const UpdateEventBodySchema = z
  .object({
    title: title.nullish(),
    fee: fee.optional(),
    memo: memo.optional(),
    candidates: candidates.nullish(),
    closed: z.boolean().nullish(),
  })
  .meta({ id: 'UpdateEventBody' });

export const AnswerBodySchema = z
  .object({ name, message: message.optional(), choices })
  .meta({ id: 'AnswerBody' });

// ------------------------------------------------------------ レスポンス

export const AnswerViewSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    message: z.string().nullable(),
    choices: z.array(ChoiceSchema),
    createdAt: z.string().meta({ format: 'date-time' }),
    updatedAt: z.string().meta({ format: 'date-time' }),
  })
  .meta({ id: 'AnswerView' });

export const EventViewSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    fee: z.number().int().nullable(),
    memo: z.string().nullable(),
    candidates: z.array(CandidateSchema).meta({ description: '開始日時の昇順' }),
    closed: z.boolean(),
    createdAt: z.string().meta({ format: 'date-time' }),
    expiresAt: z.number().int().meta({ description: '自動削除される時刻 (エポック秒)' }),
    answers: z.array(AnswerViewSchema).meta({ description: '作成日時の昇順' }),
  })
  .meta({ id: 'EventView' });

export const CreateEventResultSchema = z
  .object({
    eventId: z.string(),
    manageToken: z.string().meta({ description: '管理トークン。平文で返すのはこの一度きり' }),
  })
  .meta({ id: 'CreateEventResult' });

export const SubmitAnswerResultSchema = z
  .object({
    answer: AnswerViewSchema,
    editToken: z.string().meta({ description: '回答編集キー。平文で返すのはこの一度きり' }),
  })
  .meta({ id: 'SubmitAnswerResult' });

const ERROR_CODES = Object.keys(STATUS_BY_CODE) as [AppErrorCode, ...AppErrorCode[]];

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.enum(ERROR_CODES),
      message: z.string().meta({ description: '画面にそのまま表示できる説明' }),
    }),
  })
  .meta({ id: 'ErrorResponse' });

// ------------------------------------------------ shared/types.ts との整合

/** 2 つの型が等しいときだけ true になる。スキーマと共有の型がずれたら型エラーにする。 */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const _typesMatch: [
  Equals<z.infer<typeof AnswerStatusSchema>, AnswerStatus>,
  Equals<z.infer<typeof CandidateSchema>, Candidate>,
  Equals<z.infer<typeof ChoiceSchema>, Choice>,
  Equals<z.infer<typeof AnswerViewSchema>, AnswerView>,
  Equals<z.infer<typeof EventViewSchema>, EventView>,
] = [true, true, true, true, true];
