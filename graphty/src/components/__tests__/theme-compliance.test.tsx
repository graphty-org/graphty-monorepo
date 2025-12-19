import {MantineProvider} from "@mantine/core";
import {describe, expect, it} from "vitest";

import {render} from "../../test/test-utils";
import {theme} from "../../theme";

describe("theme compliance", () => {
    describe("semantic color variables", () => {
        it("should not use hardcoded dark-8 in theme extensions", () => {
            const themeStr = JSON.stringify(theme);
            expect(themeStr).not.toContain("dark-8");
        });

        it("should not use hardcoded dark-7 in theme extensions", () => {
            const themeStr = JSON.stringify(theme);
            expect(themeStr).not.toContain("dark-7");
        });

        it("should not use hardcoded dark-2 in theme extensions", () => {
            const themeStr = JSON.stringify(theme);
            expect(themeStr).not.toContain("dark-2");
        });

        it("should use semantic color variables instead of hardcoded dark colors", () => {
            const themeStr = JSON.stringify(theme);
            // Theme should use semantic variables like --mantine-color-default or --mantine-color-dimmed
            // instead of specific dark-N colors that only work in dark mode
            expect(themeStr).not.toMatch(/--mantine-color-dark-[0-9]/);
        });
    });

    describe("light mode rendering", () => {
        it("should render in light mode without errors", () => {
            const {container} = render(
                <MantineProvider theme={theme} defaultColorScheme="light">
                    <div>Test</div>
                </MantineProvider>,
            );
            expect(container).toBeTruthy();
        });

        it("should render in dark mode without errors", () => {
            const {container} = render(
                <MantineProvider theme={theme} defaultColorScheme="dark">
                    <div>Test</div>
                </MantineProvider>,
            );
            expect(container).toBeTruthy();
        });
    });
});
