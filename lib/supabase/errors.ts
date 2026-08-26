import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Postgrest/RPC errors are plain objects ({ message, details, hint, code }),
 * not Error instances. Throwing them directly produces an unreadable
 * "Uncaught Error: {code: ..., message: ...}" in the browser/dev overlay
 * because nothing has a real `.message` string. This wraps them in an actual
 * Error so the real Postgres code and message are always visible.
 */
export class SupabaseQueryError extends Error {
  code: string;
  details: string | null;
  hint: string | null;

  constructor(error: PostgrestError) {
    super(error.code ? `[${error.code}] ${error.message}` : error.message);
    this.name = "SupabaseQueryError";
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
  }
}

export function throwIfError(error: PostgrestError | null): asserts error is null {
  if (error) {
    console.error("[supabase]", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    throw new SupabaseQueryError(error);
  }
}
