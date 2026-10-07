/**
 * The Layout popover and the inspector's Layout group on the REAL graphty-element: the list of
 * every layout, a form that runs nothing until Apply, and Shape, which draws Force flat in the
 * 3D view through the element's published `dim`.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** K5: five nodes, every pair joined, the smallest graph no layout can draw without crossings. */
const IDS = ["a", "b", "c", "d", "e"];
const K5 = IDS.flatMap((src, i) => IDS.slice(i + 1).map((dst) => ({ src, dst })));

/**
 * The workspace on K5, its element up and the Layout tool enabled.
 * @returns the element's session.
 */
async function openK5(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "K5", id: 1 } })} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(IDS.map((id) => ({ id })));
    await session.data.addEdges(K5);
    const tool = screen.getByRole("button", { name: "Layout" });
    await waitFor(() => {
        assert.isFalse(tool.hasAttribute("aria-disabled"));
    });
    return session;
}

/**
 * The largest |z| over every placed node.
 * @param session - the element's session.
 * @returns the largest |z|.
 */
function deepest(session: GraphSession): number {
    const out = { x: 0, y: 0, z: 0 };
    let most = 0;
    for (let i = 0; i < session.data.statistics().nodeCount; i++) {
        session.positions.read(i, out);
        most = Math.max(most, Math.abs(out.z));
    }
    return most;
}

describe("the Layout popover", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it(
        "offers Rings by group once a community run has finished, grouped by that run",
        async () => {
            const session = await openK5();
            await userEvent.click(screen.getByRole("button", { name: "Layout" }));
            let popover = await screen.findByRole("dialog", { name: "Layout" });
            const before = within(popover).getByRole("option", { name: /^Rings by group/ });
            assert.strictEqual(before.getAttribute("aria-disabled"), "true", "no column groups K5 yet");
            assert.include(before.textContent, "run Louvain in Analyze first", "names what to run, in app words");
            await userEvent.keyboard("{Escape}");

            const run = await session.runs.start("louvain", {}, { style: false });
            await userEvent.click(screen.getByRole("button", { name: "Layout" }));
            popover = await screen.findByRole("dialog", { name: "Layout" });
            await waitFor(() => {
                const rings = within(popover).getByRole("option", { name: /^Rings by group/ });
                assert.notStrictEqual(rings.getAttribute("aria-disabled"), "true", rings.textContent);
            });
            // K5 is one group: Two columns names the grouping by the run's name, not its field path.
            const columns = within(popover).getByRole("option", { name: /^Two columns/ });
            assert.include(columns.textContent, "Needs exactly two groups; Louvain has 1");
            assert.notInclude(columns.textContent, "results.");
            await userEvent.click(within(popover).getByRole("option", { name: /^Rings by group/ }));
            await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
            await waitFor(() => {
                assert.strictEqual(session.layout.id, "shell");
            });
            assert.deepInclude(session.layout.options, { groupBy: `results.${run.runId}.group` });
        },
        TIMEOUT_MS,
    );

    it(
        "lists every layout, opens a form that runs nothing until Apply, and draws Force flat with Shape 2D",
        async () => {
            const session = await openK5();
            assert.strictEqual(session.layout.id, "force", "the app starts on the force layout by id");

            await userEvent.click(screen.getByRole("button", { name: "Layout" }));
            let popover = await screen.findByRole("dialog", { name: "Layout" });
            const rows = within(popover).getAllByRole("option");
            assert.strictEqual(rows.length, session.catalog.layouts().length, "every catalog layout is listed");
            assert.isFalse(
                rows.some((row) => /flat/i.test(row.textContent)),
                "no separate flat force",
            );
            const force = within(popover).getByRole("option", { name: /^Force/ });
            assert.strictEqual(force.getAttribute("aria-selected"), "true", "the current layout is checked");
            const rings = within(popover).getByRole("option", { name: /^Rings around a node/ });
            assert.strictEqual(rings.getAttribute("aria-disabled"), "true");
            assert.include(rings.textContent, "Select a node first");
            const planar = within(popover).getByRole("option", { name: /^No crossings/ });
            assert.strictEqual(planar.getAttribute("aria-disabled"), "true", "K5 cannot be drawn without crossings");
            assert.include(planar.textContent, "cannot be drawn without crossings");
            for (const elementWords of ["G is not planar", '"planar"', "results.", "dim:", "`"]) {
                assert.notInclude(planar.textContent, elementWords);
            }

            // Grid: nothing runs until Apply.
            await userEvent.click(within(popover).getByRole("option", { name: /^Grid/ }));
            assert.strictEqual(session.layout.id, "force", "picking a layout runs nothing");
            await userEvent.click(within(popover).getByRole("button", { name: "Back to layouts" }));

            // Force: Shape reads what is drawn, and nothing differs yet.
            await userEvent.click(within(popover).getByRole("option", { name: /^Force/ }));
            const shape = within(popover).getByRole("radiogroup", { name: "Shape" });
            assert.isTrue(within(shape).getByRole<HTMLInputElement>("radio", { name: "3D" }).checked);
            const applied = within(popover).getByRole("button", { name: "Applied" });
            assert.isTrue(applied.hasAttribute("disabled"));

            await userEvent.click(within(shape).getByText("2D"));
            await userEvent.click(within(popover).getByRole("button", { name: "Apply" }));
            await waitFor(() => {
                assert.strictEqual(session.layout.arrangedDimension, "2d");
            });
            await waitFor(() => {
                assert.isBelow(deepest(session), 1e-6, "every node lies flat");
            });
            assert.strictEqual(session.layout.dimension, "3d", "the view stays 3D");

            // Reopened, Shape reads 2D.
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog", { name: "Layout" }));
            });
            await userEvent.click(screen.getByRole("button", { name: "Layout" }));
            popover = await screen.findByRole("dialog", { name: "Layout" });
            await userEvent.click(within(popover).getByRole("option", { name: /^Force/ }));
            assert.isTrue(
                within(within(popover).getByRole("radiogroup", { name: "Shape" })).getByRole<HTMLInputElement>(
                    "radio",
                    { name: "2D" },
                ).checked,
            );

            // Reshuffle applies a new seed at once.
            const before = session.layout.options.seed;
            await userEvent.click(within(popover).getByRole("button", { name: /Advanced/ }));
            await userEvent.click(within(popover).getByRole("button", { name: "Reshuffle" }));
            await waitFor(() => {
                assert.notStrictEqual(session.layout.options.seed, before);
            });
        },
        TIMEOUT_MS,
    );

    it(
        "reads a project saved with the old flat force as Shape 2D",
        async () => {
            const session = await openK5();
            await session.layout.set("force-2d");
            assert.strictEqual(session.layout.arrangedDimension, "2d");

            await userEvent.click(screen.getByRole("button", { name: "Layout" }));
            const popover = await screen.findByRole("dialog", { name: "Layout" });
            await userEvent.click(within(popover).getByRole("option", { name: /^Force/ }));
            const shape = within(popover).getByRole("radiogroup", { name: "Shape" });
            assert.isTrue(within(shape).getByRole<HTMLInputElement>("radio", { name: "2D" }).checked);
        },
        TIMEOUT_MS,
    );
});
