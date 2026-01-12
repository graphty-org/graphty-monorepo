import { MantineProvider, useComputedColorScheme } from "@mantine/core";
import { renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { compactTheme, useActualColorScheme } from "../../src";

// Mock the useComputedColorScheme hook
vi.mock("@mantine/core", async () => {
    const actual = await vi.importActual("@mantine/core");
    return {
        ...actual,
        useComputedColorScheme: vi.fn(() => "dark"),
    };
});

describe("useActualColorScheme", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MantineProvider theme={compactTheme}>{children}</MantineProvider>
    );

    beforeEach(() => {
        vi.mocked(useComputedColorScheme).mockReturnValue("dark");
    });

    it("returns computed color scheme", () => {
        const { result } = renderHook(() => useActualColorScheme(), { wrapper });
        expect(result.current).toBe("dark");
    });

    it("calls useComputedColorScheme with dark as default fallback", () => {
        renderHook(() => useActualColorScheme(), { wrapper });
        expect(useComputedColorScheme).toHaveBeenCalledWith("dark");
    });

    it("returns light when system preference is light", () => {
        vi.mocked(useComputedColorScheme).mockReturnValue("light");
        const { result } = renderHook(() => useActualColorScheme(), { wrapper });
        expect(result.current).toBe("light");
    });

    describe("configurable fallback (Issue #2)", () => {
        it("uses provided fallback when called with 'light'", () => {
            renderHook(() => useActualColorScheme("light"), { wrapper });
            expect(useComputedColorScheme).toHaveBeenCalledWith("light");
        });

        it("uses provided fallback when called with 'dark'", () => {
            renderHook(() => useActualColorScheme("dark"), { wrapper });
            expect(useComputedColorScheme).toHaveBeenCalledWith("dark");
        });

        it("defaults to 'dark' fallback when no argument provided", () => {
            renderHook(() => useActualColorScheme(), { wrapper });
            expect(useComputedColorScheme).toHaveBeenCalledWith("dark");
        });

        it("returns the resolved color scheme from useComputedColorScheme", () => {
            vi.mocked(useComputedColorScheme).mockReturnValue("light");
            const { result } = renderHook(() => useActualColorScheme("light"), { wrapper });
            expect(result.current).toBe("light");
        });
    });
});
