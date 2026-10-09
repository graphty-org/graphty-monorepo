/**
 * A stat whose value is a long phrase keeps its name readable and its value inside the row, at
 * the inspector's 240px width. Real layout in Chromium, so the widths are real.
 */
import { Tooltip } from "@mantine/core";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { DataRow } from "../../../src/components/rows";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const VALUE = "Undirected, from the file: directed 0";

describe("a stat with a long value", () => {
    it("keeps the name readable and the value inside the row", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <DataRow stat name="Direction" value={VALUE} />
            </div>,
        );
        const row = screen.getByTestId("data-row").getBoundingClientRect();
        const name = screen.getByTestId("data-row-name");
        const value = screen.getByTestId("data-row-value").getBoundingClientRect();
        // "Direction" is drawn whole: a name cut to an ellipsis or to nothing is not readable.
        expect(name.getBoundingClientRect().width).toBeGreaterThan(0);
        expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
        expect(value.right).toBeLessThanOrEqual(row.right);
        expect(screen.getByRole("group", { name: "Direction" }).textContent).toBe(`Direction${VALUE}`);
    });

    it("reads the whole value, wrapped onto more lines, rather than cutting it", async () => {
        await renderThemed(
            <div style={{ width: 216 }}>
                <DataRow stat name="Direction" value={VALUE} />
            </div>,
        );
        const value = screen.getByTestId("data-row-value");
        expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
        expect(value.scrollHeight).toBeLessThanOrEqual(value.clientHeight);
        // Wrapped: the row grew past its one-line 32px.
        expect(screen.getByTestId("data-row").getBoundingClientRect().height).toBeGreaterThan(32);
    });

    it("draws a reading that just misses fitting in full, as the inspector's Overview shows it", async () => {
        // 216 is the row inside the 240px inspector's section padding.
        await renderThemed(
            <div style={{ width: 216 }}>
                <DataRow stat name="Edges per node" value="3 to 6, mean 3.667" />
            </div>,
        );
        const value = screen.getByTestId("data-row-value");
        expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
        const name = screen.getByTestId("data-row-name");
        expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
    });

    it("keeps a one-line stat at 32px", async () => {
        await renderThemed(
            <div style={{ width: 216 }}>
                <DataRow stat name="Nodes" value={12} />
            </div>,
        );
        expect(screen.getByTestId("data-row").getBoundingClientRect().height).toBe(32);
    });

    it("shows the whole value as a tooltip while a list row cuts it short", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <DataRow name="Direction" value={VALUE} />
            </div>,
        );
        await userEvent.hover(screen.getByTestId("data-row-value"));
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe(VALUE);
    });

    it("shows the whole value when the pointer comes straight from outside the row, inside a tooltip group", async () => {
        // An app wraps its shell in one Tooltip.Group, where only one tooltip is open at a time:
        // the name's tooltip, with nothing to show, must not take the turn from the value's.
        await renderThemed(
            <Tooltip.Group>
                <div style={{ width: 240 }}>
                    <div data-testid="outside" style={{ height: 40 }} />
                    <DataRow name="Direction" value={VALUE} />
                </div>
            </Tooltip.Group>,
        );
        await userEvent.hover(screen.getByTestId("outside"));
        await userEvent.hover(screen.getByTestId("data-row-value"));
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe(VALUE);
    });

    it("keeps a short name whole beside a reading that does not fit with it", async () => {
        await renderThemed(
            <div style={{ width: 216 }}>
                <DataRow stat name="Edges per node" value="1 to 36, mean 6.597" />
            </div>,
        );
        const name = screen.getByTestId("data-row-name");
        expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
        const value = screen.getByTestId("data-row-value").getBoundingClientRect();
        expect(value.right).toBeLessThanOrEqual(screen.getByTestId("data-row").getBoundingClientRect().right);
    });

    it("keeps a short number whole beside a long name", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <DataRow stat name="Mrs_Henderson_from_the_house_on_the_corner_of_the_street" value={1284} />
            </div>,
        );
        const value = screen.getByTestId("data-row-value");
        expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
    });
});
