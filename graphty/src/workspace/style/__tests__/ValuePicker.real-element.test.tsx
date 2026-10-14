/**
 * The value picker on the REAL graphty-element, driven by real input (tier3 design, decision 1.5):
 * "=" in Size opens it with the search focused; typing narrows it; In use comes first; what Size
 * cannot take folds into one row whose count is the columns `styles.proposeEncoding` refuses;
 * arrows and Enter pick and write the binding; on 200 columns it opens without reading any
 * column's values.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { findValuePicker, queryValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Renders the workspace on the Everything row and loads the nodes.
 * @param nodes - the node records.
 * @returns the session.
 */
async function openEverything(nodes: readonly Record<string, unknown>[]): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Picker", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(nodes);
    await session.styles.settled();
    return session;
}

/**
 * How many node columns graphty-element refuses for node size.
 * @param session - the session.
 * @returns the count.
 */
function refusedForSize(session: GraphSession): number {
    return session.data
        .attributes()
        .filter((a) => a.kind === "node" && a.origin !== "result")
        .filter((a) => {
            const proposal = session.styles.proposeEncoding({
                column: { kind: "node", name: a.name },
                channel: "node.size",
            });
            return !proposal.ok;
        }).length;
}

/**
 * Types "=" in the Size field and waits for the picker.
 * @returns the picker.
 */
async function openBySize(): Promise<HTMLElement> {
    const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
    if (tab.querySelector('.ws-row[data-line="node.size"]') === null) {
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
    }
    await userEvent.click(await screen.findByRole("combobox", { name: /^Node size/ }));
    await userEvent.keyboard("=");
    return findValuePicker();
}

/**
 * The names of the options the picker lists now.
 * @param picker - the picker.
 * @returns the names, top first.
 */
function optionNames(picker: HTMLElement): string[] {
    return within(picker)
        .queryAllByRole("option")
        .map((o) => o.getAttribute("aria-label") ?? o.textContent ?? "");
}

describe("the value picker on the real element", () => {
    it("'=' in Size opens it searching; In use first; the fold counts the refusals; arrows and Enter bind", async () => {
        await page.viewport(1440, 900);
        const session = await openEverything(
            ["Valjean", "Javert", "Fantine", "Cosette", "Marius"].map((name, i) => ({
                id: `n${String(i)}`,
                name,
                dept: i % 2 === 0 ? "police" : "students",
                age: 20 + i * 5,
                score: i,
            })),
        );
        // A layer that already reads score puts it under In use.
        await session.styles.encode({ column: { kind: "node", name: "score" }, channel: "node.color" });
        await session.styles.settled();

        const picker = await openBySize();
        const search = within(picker).getByRole("combobox");
        await waitFor(() => {
            assert.equal(document.activeElement, search, "the search is focused on open");
        });
        const groups = within(picker)
            .getAllByRole("group")
            .map((g) => g.getAttribute("aria-label"))
            .filter((name) => name !== null);
        assert.equal(groups[0], "In use", "In use is the first group");
        assert.include(
            within(within(picker).getByRole("group", { name: "In use" }))
                .getAllByRole("option")
                .map((o) => o.getAttribute("aria-label") ?? o.textContent),
            "score",
        );
        const age = within(picker).getByRole("option", { name: "age" });
        assert.equal(document.getElementById(age.getAttribute("aria-describedby") ?? "")?.textContent, "20 to 40");

        const refused = refusedForSize(session);
        assert.isAbove(refused, 0, "the fixture has columns size cannot take");
        const fold = within(picker).getByRole("option", { name: `${String(refused)} that do not fit size` });
        assert.isNull(within(picker).queryByRole("option", { name: "dept" }), "dept is folded");
        await userEvent.click(fold);
        const dept = await within(picker).findByRole("option", { name: "dept" });
        assert.equal(dept.getAttribute("aria-disabled"), "true");
        assert.equal(
            document.getElementById(dept.getAttribute("aria-describedby") ?? "")?.textContent,
            "Holds groups, not amounts",
        );

        await userEvent.click(search);
        await userEvent.keyboard("ag");
        await waitFor(() => {
            assert.deepEqual(optionNames(picker), ["age"], "typing narrows to the matches");
        });
        await userEvent.keyboard("{Backspace}{Backspace}");
        for (let i = 0; i < 10 && within(picker).getByRole("option", { name: "age" }).ariaSelected !== "true"; i++) {
            await userEvent.keyboard("{ArrowDown}");
        }
        assert.equal(within(picker).getByRole("option", { name: "age" }).ariaSelected, "true", "arrows reach age");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            const bound = session.styles
                .list()
                .map((l) => l.encode?.["node.size"])
                .find((b) => b !== undefined && "by" in b);
            assert.equal(bound !== undefined && "by" in bound ? bound.by : undefined, "data.age");
        });
        assert.isNull(queryValuePicker(), "picking closes it");
    });

    it("on Les Miserables after Degree: the element's list, its facts, In use first, Escape back to the button", async () => {
        await page.viewport(1440, 900);
        const session = await openEverything([]);
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.runs.start("degree");
        await session.styles.settled();
        assert.strictEqual(session.data.statistics().directedness, "undirected");

        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        // Size is a row once Shape's "+" adds it; its vary glyph opens the picker.
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const button = await screen.findByRole("button", { name: "Node size by attribute" }, { timeout: TIMEOUT_MS });
        await userEvent.click(button);
        const picker = await findValuePicker();
        assert.equal(picker.getAttribute("aria-label"), "Size by attribute", "named by its pop-out's title");
        const dialog = picker.closest("[role=dialog]");
        assert.equal(
            document.getElementById(dialog?.getAttribute("aria-labelledby") ?? "")?.textContent,
            "Size by attribute",
            "the dialog's name is its title",
        );

        const inUse = within(picker).getByRole("group", { name: "In use" });
        const degree = within(inUse).getAllByRole("option")[0];
        assert.equal(degree.getAttribute("aria-label"), "Degree", "Degree's value is in use, by its algorithm's name");
        assert.match(
            document.getElementById(degree.getAttribute("aria-describedby") ?? "")?.textContent ?? "",
            /^\d+ to \d+$/,
            "a run's value shows its range",
        );
        assert.isFalse(
            optionNames(picker).some((name) => /\b(in|out) ?degree|incoming|outgoing/i.test(name)),
            `no incoming or outgoing connections on an undirected graph: ${optionNames(picker).join(", ")}`,
        );

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(queryValuePicker(), "Escape closes it");
            assert.equal(document.activeElement, button, "and gives focus back to the button that opened it");
        });
    });

    it("on 200 columns it opens without reading any column's values", async () => {
        await page.viewport(1440, 900);
        const nodes = Array.from({ length: 20 }, (_, n) => {
            const record: Record<string, unknown> = { id: `n${String(n)}` };
            for (let c = 0; c < 200; c++) {
                record[`c${String(c)}`] = c % 4 === 0 ? `g${String((n + c) % 3)}` : n * c;
            }
            return record;
        });
        const session = await openEverything(nodes);
        session.data.attributes();
        const reads = (["nodes", "edges", "nodePage", "edgePage", "node", "histogram"] as const).map(
            (name) => [name, vi.spyOn(session.data, name)] as const,
        );

        const picker = await openBySize();
        await within(picker).findByRole("option", { name: `${String(refusedForSize(session))} that do not fit size` });
        assert.isAtLeast(within(picker).getAllByRole("option").length, 150, "the columns that fit are listed");
        for (const [name, spy] of reads) {
            assert.equal(spy.mock.calls.length, 0, `data.${name} read no values`);
        }
    });
});
