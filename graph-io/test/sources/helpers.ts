/**
 * Shared helpers of the network source tests: a records source over one recorded endpoint, and
 * catching the ImportError a load rejects with.
 */

import { expect } from "vitest";

import { ImportReportBuilder } from "../../src/common/report.js";
import { ImportError } from "../../src/index.js";
import { type CreatedContext, createSourceContext } from "../../src/sources/context.js";
import { type LoadFromSourceOptions, type SourceDescriptor, type SourceRuntime } from "../../src/sources/types.js";

/** The secret every leak test looks for. */
export const SENTINEL = "SENTINEL-6f1c2e-do-not-leak";

/**
 * The ImportError a promise rejects with.
 * @param promise - the call
 * @returns the error
 */
export async function rejection(promise: Promise<unknown>): Promise<ImportError> {
    const err: unknown = await promise.then(
        () => null,
        (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ImportError);
    return err as ImportError;
}

/**
 * A bare context for testing ctx.fetch on its own.
 * @param options - the load options
 * @param extra - endpoint, descriptor and runtime
 * @returns the context
 */
export function bareContext(
    options: LoadFromSourceOptions,
    extra: { endpoint?: string; descriptor?: SourceDescriptor; runtime?: SourceRuntime; id?: string } = {},
): CreatedContext {
    return createSourceContext({
        id: extra.id ?? "test",
        descriptor: extra.descriptor,
        options,
        report: new ImportReportBuilder("source:test", 100),
        endpoint: extra.endpoint === undefined ? null : new URL(extra.endpoint),
        cursor: null,
        unit: "items",
        counts: () => ({ nodes: 0, edges: 0 }),
        runtime: extra.runtime,
    });
}
