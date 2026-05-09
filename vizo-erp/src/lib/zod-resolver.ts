import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * Wrapped resolver that handles the input/output type mismatch between
 * zod v4 (z.coerce.*) and react-hook-form 7.75+. Use everywhere instead
 * of zodResolver directly.
 */
export function vizoResolver<T extends Record<string, unknown>>(
  schema: ZodType<T> | ZodType<unknown>
): Resolver<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return zodResolver(schema as any) as unknown as Resolver<T>;
}
