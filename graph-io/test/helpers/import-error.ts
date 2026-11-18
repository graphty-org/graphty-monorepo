/**
 * The one way the format tests check a failed import: the call is awaited once, its rejection must
 * be an ImportError with code "E_IMPORT" whose report names the format, and, when a code is given,
 * the report must hold an issue with that code.
 */

import { expect } from "vitest";

import { ImportError } from "../../src/types.js";

/** What a failed import must show. */
export interface ExpectedImportError {
    /** The format the report must name. */
    readonly format: string;
    /** An issue code the report must hold. */
    readonly code?: string;
}

/**
 * Await an import that must fail and return its ImportError.
 * @param run - the import, called once
 * @param expected - the report's format and, optionally, an issue code it must hold
 * @returns the error
 */
export async function expectImportError(
    run: () => Promise<unknown>,
    expected: ExpectedImportError,
): Promise<ImportError> {
    let caught: unknown = undefined;
    let resolved = false;
    try {
        await run();
        resolved = true;
    } catch (err) {
        caught = err;
    }
    expect(resolved, "the import resolved; an ImportError was expected").toBe(false);
    expect(caught).toBeInstanceOf(ImportError);
    const error = caught as ImportError;
    expect(error.code).toBe("E_IMPORT");
    expect(error.report.format).toBe(expected.format);
    if (expected.code !== undefined) {
        expect(error.report.issues.map((i) => i.code)).toContain(expected.code);
    }
    return error;
}
