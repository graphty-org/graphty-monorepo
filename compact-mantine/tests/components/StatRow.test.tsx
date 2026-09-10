import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { compactTheme, StatRow } from "../../src";
import { PANEL_INK } from "../../src/constants/panel";
import { LabelsProvider } from "../../src/i18n";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderStat(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render inside the compact theme with one locale in force.
 * @param locale - The BCP 47 language tag to format numbers for
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderInLocale(locale: string, ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <LabelsProvider locale={locale}>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </LabelsProvider>,
    );
}

describe("StatRow", () => {
    describe("anatomy", () => {
        it("draws the label and the reading", () => {
            renderStat(<StatRow label="Nodes" value="100" />);

            expect(screen.getByTestId("stat-row-label")).toHaveTextContent("Nodes");
            expect(screen.getByTestId("stat-row-value")).toHaveTextContent("100");
        });

        it("draws the label in the secondary ink and the reading in the primary one", () => {
            renderStat(<StatRow label="Nodes" value="100" />);

            expect(screen.getByTestId("stat-row-label").getAttribute("style")).toContain(PANEL_INK.CHROME);
            expect(screen.getByTestId("stat-row-value").getAttribute("style")).toContain(PANEL_INK.VALUE);
        });

        it("keeps the reading at the trailing edge without a physical alignment", () => {
            renderStat(<StatRow label="Nodes" value="100" />);

            const row = screen.getByTestId("stat-row");
            expect(row).toHaveStyle({ justifyContent: "space-between" });
            // A physical margin or text-align here would put the reading on the
            // wrong side of a right-to-left panel.
            const style = row.getAttribute("style") ?? "";
            expect(style).not.toContain("margin-left");
            expect(style).not.toContain("margin-right");
            expect(style).not.toContain("text-align");
        });

        it("shortens a long label rather than wrapping it, and keeps the whole string reachable", () => {
            const label = "Average weighted betweenness centrality";
            renderStat(<StatRow label={label} value="0.4271" />);

            const name = screen.getByTestId("stat-row-label");
            expect(name).toHaveStyle({ textOverflow: "ellipsis", whiteSpace: "nowrap" });
            expect(name).toHaveAttribute("title", label);
            // Ellipsising is a drawing, not a truncation: the whole string is
            // still the element's text and still its accessible name.
            expect(name).toHaveTextContent(label);
        });

        it("keeps a string value exactly as it was given", () => {
            renderStat(<StatRow label="Status" value="Active" />);

            expect(screen.getByTestId("stat-row-value")).toHaveTextContent("Active");
        });

        it("draws a zero", () => {
            renderStat(<StatRow label="Isolated" value={0} />);

            expect(screen.getByTestId("stat-row-value")).toHaveTextContent("0");
        });
    });

    describe("numbers", () => {
        // The previous revision drew numbers with String(), which produces
        // "1000000" in every language on earth. These assertions replace an
        // earlier one that asserted that unformatted output.
        it("groups a large number for the reader's locale", () => {
            renderInLocale("en-US", <StatRow label="Total" value={1000000} />);

            expect(screen.getByTestId("stat-row-value")).toHaveTextContent("1,000,000");
        });

        it("uses the locale's own separators", () => {
            renderInLocale("de-DE", <StatRow label="Gesamt" value={1000000} />);

            expect(screen.getByTestId("stat-row-value")).toHaveTextContent("1.000.000");
        });

        it("uses the locale's own decimal separator", () => {
            renderInLocale("de-DE", <StatRow label="Dichte" value={0.125} />);

            expect(screen.getByTestId("stat-row-value")).toHaveTextContent("0,125");
        });

        it("keeps every digit rather than rounding to Intl's default three places", () => {
            renderInLocale("en-US", <StatRow label="Density" value={0.0123456789} />);

            expect(screen.getByTestId("stat-row-value")).toHaveTextContent("0.0123456789");
        });

        it("leaves a pre-formatted string alone, whatever the locale", () => {
            renderInLocale("de-DE", <StatRow label="Density" value="0.012" />);

            expect(screen.getByTestId("stat-row-value")).toHaveTextContent("0.012");
        });
    });

    describe("accessibility", () => {
        it("announces the label and the reading as one named pair", () => {
            renderStat(<StatRow label="Nodes" value={100} />);

            // WCAG 1.3.1: without the group the label and the reading are two
            // unrelated runs of text and their relationship is not
            // programmatically determinable.
            const group = screen.getByRole("group", { name: "Nodes" });
            expect(within(group).getByTestId("stat-row-value")).toHaveTextContent("100");
        });

        it("takes the group's name from the visible label rather than restating it", () => {
            renderStat(<StatRow label="Nodes" value={100} />);

            const row = screen.getByTestId("stat-row");
            expect(row).not.toHaveAttribute("aria-label");
            expect(row.getAttribute("aria-labelledby")).toBe(screen.getByTestId("stat-row-label").id);
        });

        it("keeps two rows' names apart", () => {
            renderStat(
                <>
                    <StatRow label="Nodes" value={100} />
                    <StatRow label="Edges" value={200} />
                </>,
            );

            expect(screen.getByRole("group", { name: "Nodes" })).toBeInTheDocument();
            expect(screen.getByRole("group", { name: "Edges" })).toBeInTheDocument();
        });
    });
});
