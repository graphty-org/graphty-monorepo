import { ActionIcon, Button, CloseButton, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Integration tests for button components with default compact styling.
 * These tests render the actual Mantine components with the compact theme
 * to exercise the vars callback functions.
 *
 * Two blocks are regression cover for the product owner's 2026-09-13 report:
 * "size scale" for item 1 ("sizes aren't varying anymore"), and "ActionIcon
 * variants" for item 2 ("filled icons aren't filled anymore"). Mantine writes a
 * resolved vars object onto the root element as inline custom properties, so
 * reading them back off the DOM measures what the browser would paint.
 */

/** Read one resolved CSS custom property off a rendered element. */
function cssVar(element: Element | null, name: string): string {
    return (element as HTMLElement | null)?.style.getPropertyValue(name).trim() ?? "";
}

describe("Button Components Integration", () => {
    describe("Button", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Button>Default Button</Button>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Default Button" })).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Button size="lg">Large Button</Button>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "Large Button" })).toBeInTheDocument();
        });
    });

    describe("ActionIcon", () => {
        it("renders with default size (sm)", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon aria-label="action">
                        X
                    </ActionIcon>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "action" })).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon size="lg" aria-label="action large">
                        X
                    </ActionIcon>
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "action large" })).toBeInTheDocument();
        });
    });

    describe("CloseButton", () => {
        it("renders with xs size (default via defaultProps)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <CloseButton aria-label="close default" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "close default" })).toBeInTheDocument();
            // CloseButton has defaultProps size="xs" in our theme
            expect(container.querySelector("[data-size='xs']")).toBeInTheDocument();
        });

        it("renders with explicit size override", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <CloseButton size="lg" aria-label="close large" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "close large" })).toBeInTheDocument();
            expect(container.querySelector("[data-size='lg']")).toBeInTheDocument();
        });
    });

    describe("size scale", () => {
        const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

        /** Render one button at every size token and collect a sizing variable. */
        function varAcrossSizes(
            renderAtSize: (size: string) => ReactElement,
            rootSelector: string,
            varName: string,
        ): string[] {
            return SIZES.map((size) => {
                const { container } = render(
                    <MantineProvider theme={compactTheme}>{renderAtSize(size)}</MantineProvider>,
                );
                return cssVar(container.querySelector(rootSelector), varName);
            });
        }

        it("gives Button a different height at every size token", () => {
            const values = varAcrossSizes(
                (size) => <Button size={size}>Press</Button>,
                ".mantine-Button-root",
                "--button-height",
            );
            expect(values).toEqual(["20px", "24px", "30px", "36px", "44px"]);
        });

        it("gives ActionIcon a different box at every size token", () => {
            const values = varAcrossSizes(
                (size) => <ActionIcon size={size} aria-label="icon" />,
                ".mantine-ActionIcon-root",
                "--ai-size",
            );
            expect(values).toEqual(["18px", "24px", "30px", "36px", "44px"]);
        });

        it("gives CloseButton a different box at every size token", () => {
            const values = varAcrossSizes(
                (size) => <CloseButton size={size} aria-label="close" />,
                ".mantine-CloseButton-root",
                "--cb-size",
            );
            expect(values).toEqual(["16px", "20px", "24px", "30px", "36px"]);
        });

        it("renders the legacy size name 'compact' exactly like the sm default", () => {
            // graphty still passes size="compact" at several hundred call sites.
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon size="compact" aria-label="legacy" />
                    <Button size="compact">Legacy</Button>
                </MantineProvider>,
            );
            expect(cssVar(container.querySelector(".mantine-ActionIcon-root"), "--ai-size")).toBe("24px");
            expect(cssVar(container.querySelector(".mantine-Button-root"), "--button-height")).toBe("24px");
        });
    });

    describe("ActionIcon variants", () => {
        it("renders variant='filled' filled in its colour at the compact size", () => {
            // Item 2, 2026-09-13: the compact theme names only --ai-size, so
            // Mantine's own resolver still derives the ground and the ink from
            // color + variant. A filled icon must get a real background.
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon variant="filled" color="blue" aria-label="filled" />
                </MantineProvider>,
            );
            const root = container.querySelector(".mantine-ActionIcon-root");
            expect(root).toHaveAttribute("data-variant", "filled");
            expect(cssVar(root, "--ai-bg")).toBe("var(--mantine-color-blue-filled)");
            // White on the light scheme's blue-8, black on the dark scheme's
            // blue-5; see src/theme/contrast.ts.
            expect(cssVar(root, "--ai-color")).toBe(
                "light-dark(var(--mantine-color-white), var(--mantine-color-black))",
            );
            // ... and the compact sizing survives alongside it.
            expect(cssVar(root, "--ai-size")).toBe("24px");
        });

        it("keeps variant='filled' filled at every size token", () => {
            for (const size of ["xs", "compact", "sm", "md", "lg", "xl"]) {
                const { container } = render(
                    <MantineProvider theme={compactTheme}>
                        <ActionIcon size={size} variant="filled" color="red" aria-label={`filled ${size}`} />
                    </MantineProvider>,
                );
                const root = container.querySelector(".mantine-ActionIcon-root");
                expect(cssVar(root, "--ai-bg"), size).toBe("var(--mantine-color-red-filled)");
            }
        });

        it("gives variant='light' the 1px accent border WCAG 1.4.11 asks of a state boundary", () => {
            /* 2026-09-13, item 4: `light` is the ACTIVE state of every dense toggle, and
               its tinted ground measures 1.21:1 against the panel it sits on (dark) and
               1.12:1 (light) where 1.4.11 asks 3:1. graphty's shell had drawn that
               boundary itself, on two header rows, as an inset box-shadow; the product
               owner ruled the bespoke control out, so the shared component draws it and
               every caller inherits it. The border is Mantine's own --ai-bd, which is
               `1px solid transparent` in every variant, so the 24px box does not move. */
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon variant="light" aria-label="light" />
                </MantineProvider>,
            );
            const root = container.querySelector(".mantine-ActionIcon-root");
            expect(root).toHaveAttribute("data-variant", "light");
            expect(cssVar(root, "--ai-bd")).toBe("1px solid var(--ai-color)");
            expect(cssVar(root, "--ai-bg")).toBe("var(--mantine-color-blue-light)");
            expect(cssVar(root, "--ai-size")).toBe("24px");
        });

        it("draws that border in the variant's own ink, so a coloured light icon keeps its colour", () => {
            // --ai-color is what Mantine resolved for this color + variant, so the
            // boundary and the glyph inside it are one accent rather than two.
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon variant="light" color="red" aria-label="light red" />
                </MantineProvider>,
            );
            const root = container.querySelector(".mantine-ActionIcon-root");
            expect(cssVar(root, "--ai-bd")).toBe("1px solid var(--ai-color)");
            expect(cssVar(root, "--ai-color")).toBe("var(--mantine-color-red-light-color)");
        });

        it("leaves every other variant's border exactly as Mantine resolved it", () => {
            // A resting control must have a border BOX and no border COLOUR, or the
            // boundary stops meaning "active"; and an accent border on `filled` or a
            // second one on `outline` would be a new treatment rather than a fix.
            for (const variant of ["subtle", "filled", "outline", "transparent", "default"]) {
                const { container } = render(
                    <MantineProvider theme={compactTheme}>
                        <ActionIcon variant={variant} aria-label={`icon ${variant}`} />
                    </MantineProvider>,
                );
                const root = container.querySelector(".mantine-ActionIcon-root");
                expect(cssVar(root, "--ai-bd"), variant).not.toContain("--ai-color");
            }
        });

        it("still treats an omitted variant as subtle, the compact chrome's resting state", () => {
            // The theme's defaultProps variant="subtle" changes what an omitted
            // variant means (stock Mantine reads it as filled). A call site that
            // wants a filled icon must say so.
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon color="blue" aria-label="default" />
                </MantineProvider>,
            );
            const root = container.querySelector(".mantine-ActionIcon-root");
            expect(root).toHaveAttribute("data-variant", "subtle");
            expect(cssVar(root, "--ai-bg")).toBe("transparent");
        });
    });
});
