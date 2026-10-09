/**
 * A name cut short by its row gets the whole string as a themed tooltip on hover; a name drawn
 * whole gets none. Real layout in Chromium, so the ellipsis is real.
 */
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { DataRow } from "../../../src/components/rows";
import { Tree } from "../../../src/components/tree";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const LONG = "Mrs_Henderson_from_the_house_on_the_corner_of_the_street";

describe("a name that ellipsizes", () => {
    it("shows the whole name as a tooltip while a DataRow cuts it short", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <DataRow stat name={LONG} value="1 to 36, mean 6.597" />
            </div>,
        );
        await userEvent.hover(screen.getByTestId("data-row-name"));
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe(LONG);
    });

    it("shows no tooltip for a name drawn whole", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <DataRow stat name="Nodes" value="77" />
            </div>,
        );
        await userEvent.hover(screen.getByTestId("data-row-name"));
        // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
        await new Promise((resolve) => setTimeout(resolve, 1500));
        expect(screen.queryByRole("tooltip")).toBeNull();
    });

    it("shows the whole name as a tooltip while a Tree row cuts it short", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <Tree label="Sources" items={[{ id: "a", name: LONG, actions: <span>77 rows, 77 nodes</span> }]} />
            </div>,
        );
        await userEvent.hover(screen.getByText(LONG));
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe(LONG);
    });

    it("keeps the name whole and shortens the count first, and shows both in the cut row's tooltip", async () => {
        // A Sources row at the panel's default width: the name says which file this is; the
        // count yields first, so "v2" (what tells two versions apart) is never cut.
        await renderThemed(
            <div style={{ width: 240 }}>
                <Tree
                    label="Data"
                    defaultExpanded={["sources"]}
                    items={[
                        {
                            id: "sources",
                            name: "Sources",
                            children: [
                                { id: "a", name: "friends-v2.csv", count: "20 nodes, 41 edges" },
                                { id: "b", name: "team-v2.csv", count: "18 nodes, 30 edges" },
                            ],
                        },
                    ]}
                />
            </div>,
        );
        for (const name of ["friends-v2.csv", "team-v2.csv"]) {
            const span = screen.getByText(name);
            expect(span.scrollWidth).toBeLessThanOrEqual(span.clientWidth);
        }
        const [count] = screen.getAllByTestId("tree-count");
        expect(count.scrollWidth).toBeGreaterThan(count.clientWidth);
        // The cut count still shows a stub with its ellipsis, not nothing.
        expect(count.clientWidth).toBeGreaterThan(20);
        await userEvent.hover(screen.getByText("friends-v2.csv"));
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe(
            "friends-v2.csv20 nodes, 41 edges",
        );
    });

    it("cuts the name only after the count is down to its stub", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <Tree
                    label="Sources"
                    items={[{ id: "a", name: "people.csv and messages.csv", count: "12 nodes, 22 edges" }]}
                />
            </div>,
        );
        const count = screen.getByTestId("tree-count");
        const name = screen.getByText("people.csv and messages.csv");
        // The stub is about 2.5em; the name keeps all the rest, so "people.csv" is whole.
        expect(count.clientWidth).toBeLessThan(32);
        expect(name.clientWidth).toBeGreaterThan(110);
    });

    it("gives a long count half the row and shows it whole in the tooltip, hovered on the count", async () => {
        const quiet = "1,284 rows, 1,284 nodes, 9 left out because they name no node";
        await renderThemed(
            <div style={{ width: 240 }}>
                <Tree label="Sources" items={[{ id: "a", name: "Node table", count: quiet }]} />
            </div>,
        );
        const name = screen.getByText("Node table");
        expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
        await userEvent.hover(screen.getByTestId("tree-count"));
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe(`Node table${quiet}`);
    });

    it("shuts the tooltip when the row is pressed, though the pointer stays on it", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <Tree label="Sources" items={[{ id: "a", name: LONG, actions: <span>77 rows, 77 nodes</span> }]} />
            </div>,
        );
        const name = screen.getByText(LONG);
        await userEvent.hover(name);
        await screen.findByRole("tooltip", {}, { timeout: 3000 });
        await userEvent.click(name);
        await expect.poll(() => screen.queryByRole("tooltip"), { timeout: 3000 }).toBeNull();
    });

    it("shows the whole name when the pointer rests on the rest of a Tree row, such as its count", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <Tree
                    label="Filters"
                    items={[
                        {
                            id: "a",
                            name: "shared_chapters is at least 5",
                            actions: (
                                <>
                                    <span>20 to 19 nodes</span>
                                    <input type="checkbox" aria-label="Apply step" />
                                </>
                            ),
                        },
                    ]}
                />
            </div>,
        );
        await userEvent.hover(screen.getByText("20 to 19 nodes"));
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe(
            "shared_chapters is at least 5",
        );
    });

    it("leaves a control in the row to its own tooltip", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <Tree
                    label="Filters"
                    items={[
                        {
                            id: "a",
                            name: "shared_chapters is at least 5",
                            actions: (
                                <>
                                    <span>20 to 19 nodes</span>
                                    <input type="checkbox" aria-label="Apply step" />
                                </>
                            ),
                        },
                    ]}
                />
            </div>,
        );
        await userEvent.hover(screen.getByRole("checkbox", { name: "Apply step" }));
        // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
        await new Promise((resolve) => setTimeout(resolve, 1500));
        expect(screen.queryByRole("tooltip")).toBeNull();
    });

    it("shows the whole name when the pointer rests on a DataRow's value", async () => {
        // A value drawn whole: a value that is itself cut short shows its own tooltip instead.
        await renderThemed(
            <div style={{ width: 240 }}>
                <DataRow stat name={LONG} value="77" />
            </div>,
        );
        await userEvent.hover(screen.getByTestId("data-row-value"));
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe(LONG);
    });
});
