/**
 * The one way graph-format's tests assert a thrown GraphFormatError: by code with expectError,
 * or by reading what was thrown with thrownCode (null when nothing throws) and thrownError.
 * Anything thrown that is not a GraphFormatError is rethrown, so a wrong error type fails loudly.
 */

import { expect } from "vitest";

import { GraphFormatError, type GraphFormatErrorCode } from "../../src/errors.js";

/** Run fn and return the GraphFormatError it throws, asserting its code. */
export function expectError(fn: () => unknown, code: string): GraphFormatError {
    let caught: unknown = null;
    try {
        fn();
    } catch (err) {
        caught = err;
    }
    expect(caught).toBeInstanceOf(GraphFormatError);
    const error = caught as GraphFormatError;
    expect(error.code).toBe(code);
    return error;
}

/** Run fn and return the code of the GraphFormatError it throws, or null when it throws nothing. */
export function thrownCode(fn: () => unknown): GraphFormatErrorCode | null {
    try {
        fn();
    } catch (err) {
        if (err instanceof GraphFormatError) {
            return err.code;
        }
        throw err;
    }
    return null;
}

/** Run fn and return the GraphFormatError it throws; fails when it throws nothing. */
export function thrownError(fn: () => unknown): GraphFormatError {
    try {
        fn();
    } catch (err) {
        if (err instanceof GraphFormatError) {
            return err;
        }
        throw err;
    }
    throw new Error("expected a GraphFormatError");
}
