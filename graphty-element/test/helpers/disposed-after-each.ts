/**
 * Disposes what a test made once the test ends, so a file's sessions do not outlive their test.
 */

import { afterEach } from "vitest";

/**
 * Registers an afterEach that disposes everything handed to the returned function during the test.
 * @returns A function that records a session (or anything with `dispose()`) and returns it.
 */
export function disposedAfterEach(): <T extends { dispose(): void }>(owned: T) => T {
    const made: { dispose(): void }[] = [];
    afterEach(() => {
        for (const owned of made.splice(0)) {
            owned.dispose();
        }
    });
    return (owned) => {
        made.push(owned);
        return owned;
    };
}
