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
        it("renders with sm size (default via defaultProps): Figma's 24 close with a 10 X", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <CloseButton aria-label="close default" />
                </MantineProvider>,
            );
            expect(screen.getByRole("button", { name: "close default" })).toBeInTheDocument();
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
            expect(cssVar(container.querySelector(".mantine-CloseButton-root"), "--cb-icon-size")).toBe("10px");
            expect(container.querySelector(".cm-close-glyph")).toBeInTheDocument();
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
            expect(values).toEqual(["20px", "24px", "32px", "36px", "44px"]);
        });

        it("gives ActionIcon a different box at every size token", () => {
            const values = varAcrossSizes(
                (size) => <ActionIcon size={size} aria-label="icon" />,
                ".mantine-ActionIcon-root",
                "--ai-size",
            );
            expect(values).toEqual(["18px", "24px", "32px", "36px", "44px"]);
        });

        it("gives CloseButton a different box at every size token", () => {
            const values = varAcrossSizes(
                (size) => <CloseButton size={size} aria-label="close" />,
                ".mantine-CloseButton-root",
                "--cb-size",
            );
            expect(values).toEqual(["16px", "24px", "32px", "36px", "44px"]);
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
        it("renders variant='filled' filled in its color at the compact size", () => {
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
            expect(cssVar(root, "--ai-color")).toBe("var(--mantine-color-white)");
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

        it("draws variant='light' as Figma's highlighted look, with no accent border (breaking change 8)", () => {
            /* Older releases gave `light` a 1px accent border for a 3:1 state boundary. Figma's
               "highlighted" look replaces it: the selected ground and a brand glyph, and --ai-bd
               is `none` so the 24px box carries no border at all. The AA option does not add
               the border back. */
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon variant="light" aria-label="light" />
                </MantineProvider>,
            );
            const root = container.querySelector(".mantine-ActionIcon-root");
            expect(root).toHaveAttribute("data-variant", "light");
            expect(cssVar(root, "--ai-bd")).toBe("none");
            expect(cssVar(root, "--ai-bg")).toBe("var(--cm-bg-selected)");
            expect(cssVar(root, "--ai-hover")).toBe("var(--cm-bg-selected-hover)");
            expect(cssVar(root, "--ai-color")).toBe("var(--cm-icon-brand)");
            expect(cssVar(root, "--ai-size")).toBe("24px");
        });

        it("leaves a colored light icon to Mantine's derivation, with no accent border", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon variant="light" color="red" aria-label="light red" />
                </MantineProvider>,
            );
            const root = container.querySelector(".mantine-ActionIcon-root");
            expect(cssVar(root, "--ai-bd")).not.toContain("--ai-color");
            expect(cssVar(root, "--ai-color")).toBe("var(--mantine-color-red-light-color)");
        });

        it("never draws an accent-colored border on any variant", () => {
            for (const variant of ["subtle", "filled", "outline", "transparent", "default", "light"]) {
                const { container } = render(
                    <MantineProvider theme={compactTheme}>
                        <ActionIcon variant={variant} aria-label={`icon ${variant}`} />
                    </MantineProvider>,
                );
                const root = container.querySelector(".mantine-ActionIcon-root");
                expect(cssVar(root, "--ai-bd"), variant).not.toContain("--ai-color");
            }
        });

        it("draws the ghost in Figma's icon ink when no color is given", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <ActionIcon aria-label="ghost" />
                </MantineProvider>,
            );
            const root = container.querySelector(".mantine-ActionIcon-root");
            expect(root).toHaveClass("cm-action-icon");
            expect(cssVar(root, "--ai-bg")).toBe("transparent");
            expect(cssVar(root, "--ai-hover")).toBe("var(--cm-bg-transparent-hover)");
            expect(cssVar(root, "--cm-ai-pressed")).toBe("var(--cm-bg-transparent-pressed)");
            expect(cssVar(root, "--ai-color")).toBe("var(--cm-icon)");
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

    describe("Button variants", () => {
        function root(ui: ReactElement): Element | null {
            const { container } = render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
            return container.querySelector(".mantine-Button-root");
        }

        it("draws the default (filled) button on the brand tokens", () => {
            const el = root(<Button>Primary</Button>);
            expect(el).toHaveClass("cm-button");
            expect(cssVar(el, "--button-bg")).toBe("var(--cm-bg-brand)");
            expect(cssVar(el, "--button-hover")).toBe("var(--cm-bg-brand-hover)");
            expect(cssVar(el, "--cm-btn-pressed")).toBe("var(--cm-bg-brand-pressed)");
            expect(cssVar(el, "--button-color")).toBe("var(--cm-text-onbrand)");
        });

        it("draws color='red' filled and variant='danger' as the same danger button", () => {
            for (const el of [root(<Button color="red">Delete</Button>), root(<Button variant="danger">Delete</Button>)]) {
                expect(cssVar(el, "--button-bg")).toBe("var(--cm-bg-danger)");
                expect(cssVar(el, "--cm-btn-pressed")).toBe("var(--cm-bg-danger-pressed)");
            }
        });

        it.each([
            ["default", "transparent", "var(--cm-border-translucent)"],
            ["outline", "transparent", "var(--cm-border-translucent)"],
            ["subtle", "transparent", "transparent"],
            ["danger-outline", "transparent", "var(--cm-border-danger)"],
            ["inverse", "var(--cm-bg-inverse)", "transparent"],
            ["success", "var(--cm-bg-success)", "transparent"],
            ["light", "var(--cm-bg-selected)", "transparent"],
        ])("variant %s: ground %s, edge %s", (variant, bg, edge) => {
            const el = root(<Button variant={variant}>Label</Button>);
            expect(el).toHaveAttribute("data-variant", variant);
            expect(cssVar(el, "--button-bg")).toBe(bg);
            expect(cssVar(el, "--cm-btn-outline")).toBe(edge);
        });

        it("leaves a non-primary filled color and gradient to Mantine", () => {
            expect(cssVar(root(<Button color="grape">Grape</Button>), "--button-bg")).toBe("var(--mantine-color-grape-filled)");
            expect(cssVar(root(<Button variant="gradient">G</Button>), "--cm-btn-pressed")).toBe("");
        });
    });
});
