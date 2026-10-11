import { LIMITS } from '@tsudou/shared/limits';
import type { AnswerStatus, AnswerView, Candidate, Choice, EventView } from '@tsudou/shared/types';
import * as z from 'zod';
import { type AppErrorCode, STATUS_BY_CODE } from './errors';

/**
 * Define the shape of HTTP inputs and outputs with Zod. app.ts uses the request schemas for actual validation,
 * and openapi.ts uses all the schemas to generate the OpenAPI document.
 *
 * Only the JSON shape is checked here; validate.ts rejects the values themselves (length, range, date format, etc.)
 * with Japanese messages. Length limits are counted after trimming surrounding whitespace,
 * so they are not checked with Zod's .max() and are written only as documentation metadata (maxLength, etc.).
 *
 * Metadata is written with Zod's standard .meta() rather than zod-to-openapi's .openapi().
 * zod-to-openapi can also read .meta(), so it only needs to be loaded when generating the document (openapi.ts)
 * and stays out of the Worker bundle. Schemas with an id are extracted into components/schemas.
 * zod is imported with `import * as z` (`import { z }` pulls unused locales into the bundle).
 */
// ---------------------------------------------------------------- Common

export const AnswerStatusSchema = z.enum(['YES', 'NO', 'MAYBE']).meta({
  id: 'AnswerStatus',
  description: 'YES: attending / NO: not attending / MAYBE: undecided',
});

const startAt = z.string().meta({ format: 'date-time', description: 'Start date/time (ISO 8601)' });

export const CandidateSchema = z
  .object({
    id: z.string().meta({ description: 'Candidate ID' }),
    startAt,
  })
  .meta({ id: 'Candidate' });

export const CandidateInputSchema = z
  .object({
    id: z
      .string()
      .nullish()
      .meta({ description: 'Existing candidate ID; a new ID is generated when omitted' }),
    startAt,
  })
  .meta({ id: 'CandidateInput' });

export const ChoiceSchema = z
  .object({
    candidateId: z.string(),
    status: AnswerStatusSchema,
  })
  .meta({ id: 'Choice' });

const title = z.string().meta({ maxLength: LIMITS.titleMax, description: 'Event title' });
const fee = z
  .number()
  .nullable()
  .meta({ minimum: 0, maximum: LIMITS.feeMax, description: 'Fee in yen, as an integer' });
const memo = z.string().nullable().meta({ maxLength: LIMITS.memoMax });
const candidates = z
  .array(CandidateInputSchema)
  .meta({ minItems: 1, maxItems: LIMITS.candidatesMax });
const name = z.string().meta({ maxLength: LIMITS.nameMax, description: 'Respondent name' });
const message = z.string().nullable().meta({ maxLength: LIMITS.messageMax });
const choices = z
  .array(ChoiceSchema)
  .meta({ description: 'Exactly one choice per candidate, with no missing or extra entries' });

// ------------------------------------------------------------- Requests

export const CreateEventBodySchema = z
  .object({ title, fee: fee.optional(), memo: memo.optional(), candidates })
  .meta({ id: 'CreateEventBody' });

/** Omitted fields are not changed. fee and memo are reset to unset with null. */
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

// ------------------------------------------------------------ Responses

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
    candidates: z
      .array(CandidateSchema)
      .meta({ description: 'Sorted by start date/time in ascending order' }),
    closed: z.boolean(),
    createdAt: z.string().meta({ format: 'date-time' }),
    expiresAt: z.number().int().meta({ description: 'Automatic deletion time (epoch seconds)' }),
    answers: z
      .array(AnswerViewSchema)
      .meta({ description: 'Sorted by creation time in ascending order' }),
  })
  .meta({ id: 'EventView' });

export const CreateEventResultSchema = z
  .object({
    eventId: z.string(),
    manageToken: z
      .string()
      .meta({ description: 'Management token; returned in plaintext only once' }),
  })
  .meta({ id: 'CreateEventResult' });

export const SubmitAnswerResultSchema = z
  .object({
    answer: AnswerViewSchema,
    editToken: z
      .string()
      .meta({ description: 'Response edit key; returned in plaintext only once' }),
  })
  .meta({ id: 'SubmitAnswerResult' });

const ERROR_CODES = Object.keys(STATUS_BY_CODE) as [AppErrorCode, ...AppErrorCode[]];

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.enum(ERROR_CODES),
      message: z.string().meta({ description: 'Message suitable for direct display in the UI' }),
    }),
  })
  .meta({ id: 'ErrorResponse' });

// ------------------------------------------- Consistency with shared/types.ts

/** true only when the two types are equal. A mismatch between the schemas and the shared types becomes a type error. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const _typesMatch: [
  Equals<z.infer<typeof AnswerStatusSchema>, AnswerStatus>,
  Equals<z.infer<typeof CandidateSchema>, Candidate>,
  Equals<z.infer<typeof ChoiceSchema>, Choice>,
  Equals<z.infer<typeof AnswerViewSchema>, AnswerView>,
  Equals<z.infer<typeof EventViewSchema>, EventView>,
] = [true, true, true, true, true];
