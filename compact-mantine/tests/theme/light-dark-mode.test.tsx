/**
 * Light and dark are Mantine's own color scheme; one theme object serves both
 * (design/figma-spec.md 2 and 3.1). The tokens are `light-dark()` values that resolve from the
 * `color-scheme` Mantine sets on :root, so what has to hold here is that Mantine keeps setting it,
 * and that the dark-scoped surfaces exist. The resolved colors are measured in Chromium by
 * tests/theme/css-tokens.browser.test.tsx.
 */
import { Button, MantineProvider, useMantineColorScheme } from "@mantine/core";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";
import { compactGlobalCss } from "../../src/theme/global-styles";

function SchemeToggle() {
    const { setColorScheme } = useMantineColorScheme();
    return <Button onClick={() => setColorScheme("dark")}>dark</Button>;
}

describe("light / dark", () => {
    it.each(["light", "dark"] as const)("forceColorScheme=%s marks :root, which the tokens resolve from", (scheme) => {
        render(
            <MantineProvider theme={compactTheme} forceColorScheme={scheme}>
                <Button>x</Button>
            </MantineProvider>,
        );
        expect(document.documentElement.getAttribute("data-mantine-color-scheme")).toBe(scheme);
    });

    it("switching the scheme at runtime needs no second theme object", () => {
        render(
            <MantineProvider theme={compactTheme} defaultColorScheme="light">
                <SchemeToggle />
            </MantineProvider>,
        );
        expect(document.documentElement.getAttribute("data-mantine-color-scheme")).toBe("light");
        act(() => screen.getByRole("button").click());
        expect(document.documentElement.getAttribute("data-mantine-color-scheme")).toBe("dark");
    });

    it("ships the dark-scoped surfaces menus, tooltips and toasts render in", () => {
        const css = compactGlobalCss();
        expect(css).toContain(".cm-dark-surface { color-scheme: dark; }");
        expect(css).toContain(".cm-menu-surface > * { color-scheme: dark; }");
    });
});
