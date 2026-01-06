import { MantineProvider, useComputedColorScheme } from "@mantine/core";
import { renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

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

    it("returns computed color scheme", () => {
        const { result } = renderHook(() => useActualColorScheme(), { wrapper });
        expect(result.current).toBe("dark");
    });

    it("calls useComputedColorScheme with dark as default", () => {
        renderHook(() => useActualColorScheme(), { wrapper });
        expect(useComputedColorScheme).toHaveBeenCalledWith("dark");
    });

    it("returns light when system preference is light", () => {
        vi.mocked(useComputedColorScheme).mockReturnValue("light");
        const { result } = renderHook(() => useActualColorScheme(), { wrapper });
        expect(result.current).toBe("light");
    });
});
