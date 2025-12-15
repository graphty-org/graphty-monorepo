import {describe, expect, it} from "vitest";

import {
    mantineJsonGridDarkTheme,
    mantineJsonGridLightTheme,
    mantineJsonGridTheme,
} from "../mantineTheme";

const requiredProperties = [
    "bgColor",
    "borderColor",
    "cellBorderColor",
    "keyColor",
    "indexColor",
    "numberColor",
    "booleanColor",
    "stringColor",
    "objectColor",
    "tableHeaderBgColor",
    "tableIconColor",
    "selectHighlightBgColor",
    "searchHighlightBgColor",
] as const;

describe("mantineJsonGridDarkTheme", () => {
    it("uses Mantine CSS variables for all color properties", () => {
        expect(mantineJsonGridDarkTheme.bgColor).toContain("--mantine-color");
    });

    it("defines all required theme properties", () => {
        requiredProperties.forEach((prop) => {
            expect(mantineJsonGridDarkTheme[prop]).toBeDefined();
        });
    });

    it("uses CSS variable format for all properties", () => {
        const values = Object.values(mantineJsonGridDarkTheme);
        values.forEach((value) => {
            expect(value).toMatch(/var\(--mantine-color-/);
        });
    });

    it("uses dark palette colors", () => {
        expect(mantineJsonGridDarkTheme.bgColor).toContain("dark");
    });
});

describe("mantineJsonGridLightTheme", () => {
    it("uses Mantine CSS variables for all color properties", () => {
        expect(mantineJsonGridLightTheme.bgColor).toContain("--mantine-color");
    });

    it("defines all required theme properties", () => {
        requiredProperties.forEach((prop) => {
            expect(mantineJsonGridLightTheme[prop]).toBeDefined();
        });
    });

    it("uses CSS variable format for all properties", () => {
        const values = Object.values(mantineJsonGridLightTheme);
        values.forEach((value) => {
            expect(value).toMatch(/var\(--mantine-color-/);
        });
    });

    it("uses light palette colors for background", () => {
        expect(mantineJsonGridLightTheme.bgColor).toContain("gray-0");
    });
});

describe("mantineJsonGridTheme (deprecated)", () => {
    it("is an alias for the dark theme", () => {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- testing deprecated export
        expect(mantineJsonGridTheme).toBe(mantineJsonGridDarkTheme);
    });
});
