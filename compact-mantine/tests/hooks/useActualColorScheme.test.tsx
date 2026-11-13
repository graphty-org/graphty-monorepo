import { MantineProvider } from "@mantine/core";
import { renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, useActualColorScheme } from "../../src";

/**
 * Render the hook under a real MantineProvider and keep every value it returned, first render
 * included: the fallback shows only on the first render, before the OS preference is read.
 * @param fallback - passed to the hook; left out to use its default
 * @param force - the provider's forced scheme; left out for "auto"
 * @returns every value the hook returned, in order
 */
function renders(fallback?: "light" | "dark", force?: "light" | "dark"): string[] {
    const seen: string[] = [];
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MantineProvider theme={compactTheme} defaultColorScheme="auto" forceColorScheme={force}>
            {children}
        </MantineProvider>
    );
    renderHook(
        () => {
            const scheme = fallback === undefined ? useActualColorScheme() : useActualColorScheme(fallback);
            seen.push(scheme);
            return scheme;
        },
        { wrapper },
    );
    return seen;
}

/**
 * Make the OS report a light or dark preference (tests/setup.ts reports dark).
 * @param scheme - the preference the OS reports
 */
function osPrefers(scheme: "light" | "dark"): void {
    const real = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
        ...real(query),
        matches: query === "(prefers-color-scheme: dark)" ? scheme === "dark" : false,
    }));
}

describe("useActualColorScheme", () => {
    it("returns the forced scheme", () => {
        expect(renders(undefined, "light").at(-1)).toBe("light");
        expect(renders(undefined, "dark").at(-1)).toBe("dark");
    });

    it.each(["light", "dark"] as const)("resolves auto to the OS preference %s", (scheme) => {
        osPrefers(scheme);
        expect(renders().at(-1)).toBe(scheme);
    });

    describe("configurable fallback (Issue #2)", () => {
        it("defaults to 'dark' before the OS preference is known", () => {
            osPrefers("light");
            expect(renders()).toEqual(["dark", "light"]);
        });

        it("uses the provided fallback before the OS preference is known", () => {
            osPrefers("dark");
            expect(renders("light")).toEqual(["light", "dark"]);
        });
    });
});
