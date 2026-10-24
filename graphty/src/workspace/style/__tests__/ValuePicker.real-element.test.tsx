/**
 * The value picker on the REAL graphty-element, driven by real input (tier3 design, decision 1.5):
 * "=" in Size opens it with the search focused; typing narrows it; what other lines read comes first,
 * under Used elsewhere (In use is only what this line reads); what Size
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

/**
 * Renders the workspace on the Everything row and loads the nodes.
 * @param nodes - the node records.
 * @returns the session.
 */
async function openEverything(nodes: readonly Record<string, unknown>[]): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Picker", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
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
    const tab = await screen.findByTestId("style-tab", {});
    if (tab.querySelector('.ws-row[data-line="node.size"]') === null) {
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
    }
    await userEvent.click(await screen.findByRole("spinbutton", { name: /^Node size/ }));
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
        .map((o) => (o.getAttribute("aria-label") ?? o.textContent ?? "").split(", ")[0]);
}

describe("the value picker on the real element", () => {
    it("'=' in Size opens it searching; Used elsewhere first; the fold counts the refusals; arrows and Enter bind", async () => {
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
        // Another line already reads score: it is listed under Used elsewhere, not In use, which
        // is only what this line reads.
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
        assert.equal(groups[0], "Used elsewhere", "Used elsewhere is the first group");
        assert.notInclude(groups, "In use", "Size reads nothing yet");
        assert.include(
            within(within(picker).getByRole("group", { name: "Used elsewhere" }))
                .getAllByRole("option")
                .map((o) => (o.getAttribute("aria-label") ?? o.textContent ?? "").split(", ")[0]),
            "score",
        );
        // The fact on the row's line is part of its name.
        within(picker).getByRole("option", { name: "age, 20 to 40" });

        const refused = refusedForSize(session);
        assert.isAbove(refused, 0, "the fixture has columns size cannot take");
        // The fold sits in a group named "Does not fit", and while folded its name says why the
        // rows do not fit and that it shows why.
        const misfits = within(picker).getByRole("group", { name: "Does not fit" });
        const fold = within(misfits).getByRole("option", {
            name: new RegExp(`^${String(refused)} attributes?, hidden, .*holds groups, not amounts.*, Show why$`),
        });
        assert.isNull(within(picker).queryByRole("option", { name: /^dept(,|$)/ }), "dept is folded");
        await userEvent.click(fold);
        const dept = await within(picker).findByRole("option", { name: /^dept(,|$)/ });
        // The fold says its state in its name: a list option carries no aria-expanded.
        within(picker).getByRole("option", { name: new RegExp(`^${String(refused)} attributes?, shown, Hide them$`) });
        assert.equal(dept.getAttribute("aria-disabled"), "true");
        // Its reason is in its name, and nothing it is not is "selected".
        assert.match(dept.getAttribute("aria-label") ?? "", /^dept, /);
        assert.notEqual(dept.getAttribute("aria-selected"), "true");

        await userEvent.click(search);
        await userEvent.keyboard("ag");
        await waitFor(() => {
            assert.deepEqual(optionNames(picker), ["age"], "typing narrows to the matches");
        });
        await userEvent.keyboard("{Backspace}{Backspace}");
        const active = (): string | null => search.getAttribute("aria-activedescendant");
        const ageId = (): string => within(picker).getByRole("option", { name: /^age(,|$)/ }).id;
        for (let i = 0; i < 10 && active() !== ageId(); i++) {
            await userEvent.keyboard("{ArrowDown}");
        }
        assert.equal(active(), ageId(), "arrows reach age");
        assert.notEqual(
            within(picker)
                .getByRole("option", { name: /^age(,|$)/ })
                .getAttribute("aria-selected"),
            "true",
            "the row the arrows are on is active, not selected",
        );
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

    it("on Les Miserables after Degree: the element's list, its facts, Used elsewhere first, Escape back to the button", async () => {
        await page.viewport(1440, 900);
        const session = await openEverything([]);
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.runs.start("degree");
        await session.styles.settled();
        assert.strictEqual(session.data.statistics().directedness, "undirected");

        const tab = await screen.findByTestId("style-tab", {});
        // Size is a row once Shape's "+" adds it; its vary glyph opens the picker.
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const button = await screen.findByRole("button", { name: "Node size by attribute" });
        await userEvent.click(button);
        const picker = await findValuePicker();
        assert.equal(picker.getAttribute("aria-label"), "Node size by attribute", "named by its pop-out's title");
        const dialog = picker.closest("[role=dialog]");
        assert.equal(
            document.getElementById(dialog?.getAttribute("aria-labelledby") ?? "")?.textContent,
            "Node size by attribute",
            "the dialog's name is its title",
        );

        const inUse = within(picker).getByRole("group", { name: "Used elsewhere" });
        const degree = within(inUse).getAllByRole("option")[0];
        // Read by the run's own layer, by its algorithm's name, with its range in the name.
        assert.match(degree.getAttribute("aria-label") ?? "", /^Degree, \d+ to \d+$/);
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
        await within(picker).findByRole("option", {
            name: new RegExp(`^${String(refusedForSize(session))} attributes?, (hidden|shown), `),
        });
        assert.isAtLeast(within(picker).getAllByRole("option").length, 150, "the columns that fit are listed");
        for (const [name, spy] of reads) {
            assert.equal(spy.mock.calls.length, 0, `data.${name} read no values`);
        }
    });
});
