/**
 * Input limits. The single definition referenced by both the server (backend/src/validate.ts)
 * and the frontend (frontend/src/lib/form-validators.ts).
 *
 * This is also bundled for the browser, so Node-only APIs cannot be used
 * (shared/tsconfig.json loads neither DOM nor Node types, so they cause type errors).
 */
export const LIMITS = {
  titleMax: 100,
  memoMax: 2000,
  nameMax: 40,
  messageMax: 500,
  feeMax: 1_000_000,
  candidatesMax: 30,
} as const;

/**
 * Retention period for events and responses (from creation).
 * Records past this period are deleted automatically by the Cron Trigger.
 */
export const RETENTION_MONTHS = 3;
