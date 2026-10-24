/**
 * The Graph place on the REAL graphty-element, from the empty app: task T12's find (typing a name
 * that differs from the id fills the list before Enter; a pick selects the node and opens it in
 * the inspector, by mouse and by keyboard alone). The style tree is `StyleTree.real-element.test.tsx`.
 * Every assertion reads what the element reports or what the page shows, never canvas pixels.
 *
 * The graph goes in through the element's session: loading a file is the Start screen's and the
 * Data page's, and the karate sample has no names to find by.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { addLabelLine, labelRow, writeLine } from "../../style/row";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Numeric ids, as karate's are, with names that differ from them. */
const NAMES = ["Mr Hi", "Officer", "Ada", "Bea", "Cy", "Dot", "Eve", "Flo", "Gus", "Hal"];
const NODES = NAMES.map((name, i) => ({ id: i + 1, name, club: i < 5 ? "Mr Hi" : "Officer" }));
const EDGES = [
    ...[1, 2, 3, 4, 5].map((n) => ({ source: n, target: (n % 5) + 1 })),
    ...[6, 7, 8, 9, 10].map((n) => ({ source: n, target: ((n - 5) % 5) + 6 })),
    { source: 1, target: 2 },
    { source: 2, target: 6 },
];

/**
 * A new, empty project, then the graph added through the element's session.
 * @returns the session and the chrome store.
 */
async function openGraph(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
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
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    return { session, store };
}

describe("the Graph place on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("finds a node by a name that differs from its id while typing, and a pick selects and inspects it (T12)", async () => {
        const { session, store } = await openGraph();

        const box = screen.getByRole("combobox", { name: "Find" });
        await userEvent.type(box, "offic");
        // The list fills while typing, before any Enter, and nothing is selected yet.
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const hit = within(list).getByRole("option", { name: /name: Officer/ });
        assert.isNotNull(hit);
        assert.equal(session.selection.size, 0);
        assert.equal(document.activeElement, box, "focus stays in the box");

        await userEvent.click(hit);
        await waitFor(() => {
            assert.isTrue(session.selection.has(2));
        });
        assert.isNull(store.get().inspected, "the inspector shows what is selected");
        assert.isNull(screen.queryByRole("listbox", { name: "Find results" }));
    });

    it("finds and picks with the keyboard alone: / focuses, the first match is marked, Enter picks it (T12)", async () => {
        const { session, store } = await openGraph();

        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("/");
        const box = screen.getByRole("combobox", { name: "Find" });
        await waitFor(() => {
            assert.equal(document.activeElement, box);
        });
        await userEvent.keyboard("Eve");
        await screen.findByRole("listbox", { name: "Find results" });
        const active = box.getAttribute("aria-activedescendant");
        assert.isNotNull(active);
        assert.match(document.getElementById(active ?? "")?.textContent ?? "", /Eve/);
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isTrue(session.selection.has(7));
        });
        assert.isNull(store.get().inspected, "the inspector shows what is selected");
    });

    it("gives a way on from a typed condition: an example after No match, and the rule under the box runs on Enter", async () => {
        const { session } = await openGraph();
        await session.data.addEdges([
            { source: 3, target: 7, minutes: 12 },
            { source: 4, target: 8, minutes: 10 },
            { source: 5, target: 9, minutes: 4 },
        ]);
        const box = screen.getByRole("combobox", { name: "Find" });
        const linksOfTenOrMore = async (): Promise<void> => {
            await waitFor(() => {
                assert.equal(session.selection.edges.length, 2);
            });
            assert.equal(session.selection.nodes.length, 0);
        };

        // Plain text that reads as no rule: No match, then an example rule over the open data.
        await userEvent.type(box, "chapters 10");
        assert.isNotNull(await screen.findByText('No match for "chapters 10"'));
        // The example is a node rule in the plain form the box reads: no backticks, no "=", and
        // never over the ids (numbers here, as karate's are), which teach nothing about the data.
        const example = await screen.findByText(/^\w+ == '[^']+'$/);
        assert.match(
            example.parentElement?.textContent ?? "",
            /\. To select by a value, type a rule such as \w+ == '[^']+'$/,
        );
        assert.isNull(screen.queryByRole("option"));

        // A rule with a bare number reads as typed: Enter runs it.
        await userEvent.clear(box);
        await userEvent.type(box, "=minutes >= 10");
        assert.isNotNull(await screen.findByText("Rule: press Enter to select matches"));
        assert.equal(session.selection.size, 0);
        await userEvent.keyboard("{Enter}");
        await linksOfTenOrMore();
        assert.equal((box as HTMLInputElement).value, "=minutes >= 10");

        // A condition typed without "=": the text as a rule is what Enter picks.
        session.selection.clear();
        await userEvent.clear(box);
        await userEvent.type(box, "minutes >= 10");
        // The line under the box, and the status line that speaks it.
        assert.isNotEmpty(await screen.findAllByText("Select by a value:"));
        const offered = await screen.findByRole("option", { name: /^minutes >= 10/ });
        assert.equal(box.getAttribute("aria-activedescendant"), offered.id);
        await userEvent.keyboard("{Enter}");
        await linksOfTenOrMore();
    });

    it("keeps the example under the box while the session changes, rather than taking it down to ask again", async () => {
        const { session } = await openGraph();
        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "chapters 10");
        const example = await screen.findByText(/^\w+ == '[^']+'$/);

        // Any session change asks the element again; the element's own late history step after a
        // load is one, and took the line down between a test finding it and reading it.
        await act(async () => {
            await session.selection.apply({ nodes: [1] });
        });

        assert.isTrue(example.isConnected, "the example line stayed up");
    });

    it("a click on a drawn name selects that node and opens it in the inspector", async () => {
        const { session } = await openGraph();
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        if (element === null) {
            return;
        }
        // Names on, as the Style tab's Label line or a column's Add label line draws them, in a
        // look and size that pick the node a name names (a reader's choice from the label settings).
        await addLabelLine(session, labelRow(session, null), { kind: "node", name: "name" });
        const row = labelRow(session, null);
        const look = { look: "card", onTop: true, pickable: true } as const;
        await writeLine(session, row.row, "node", "node.labelStyle", { value: look }, row.fresh, {
            "node.labelSize": 72,
        });
        await element.waitForStableFrame();
        // A point on Officer's name: off the sphere's drawn disc, in rings around it at every
        // angle -- the name is placed clear of the node's edges, so it can sit diagonally from the
        // sphere rather than straight above, beside or below it -- the first one that answers
        // Officer. Off the disc, only the name can.
        const nameAt = (): { x: number; y: number } | undefined => {
            const at = element.nodeScreenPosition(2);
            if (at?.visible !== true) {
                return undefined;
            }
            for (let off = Math.ceil(at.radius) + 2; off < at.radius + 120; off += 3) {
                const count = Math.ceil((2 * Math.PI * off) / 3);
                for (let i = 0; i < count; i++) {
                    const angle = (2 * Math.PI * i) / count;
                    const point = { x: at.x + Math.cos(angle) * off, y: at.y + Math.sin(angle) * off };
                    const hit = element.elementAt(point);
                    if (hit?.kind === "node" && hit.id === 2) {
                        return point;
                    }
                }
            }
            return undefined;
        };
        let point: { x: number; y: number } | undefined;
        await waitFor(
            () => {
                point = nameAt();
                assert.isDefined(point, "a point above Officer's sphere answers Officer");
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.click(element, { position: point });
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], [2]);
        });
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        const values = await inspector.findByRole("tab", { name: "Values" });
        assert.equal(values.getAttribute("aria-selected"), "true");
    });

    it("glides the camera to center a pick, on screen or off", async () => {
        const { session } = await openGraph();
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        if (element === null) {
            return;
        }
        await waitFor(
            () => {
                assert.isTrue(element.nodeScreenPosition(7)?.visible === true);
            },
            { timeout: TIMEOUT_MS },
        );
        await element.waitForStableFrame();
        const centered = (id: number): void => {
            const { target } = element.getCameraState();
            const node = element.getNode(id)?.getPosition();
            assert.isDefined(target);
            assert.isDefined(node);
            if (target === undefined || node === undefined) {
                return;
            }
            assert.closeTo(target.x, node.x, 0.01, `the camera turns about node ${String(id)}`);
            assert.closeTo(target.y, node.y, 0.01, `the camera turns about node ${String(id)}`);
            assert.closeTo(target.z, node.z, 0.01, `the camera turns about node ${String(id)}`);
        };
        const pick = async (name: string, id: number): Promise<void> => {
            const box = screen.getByRole("combobox", { name: "Find" });
            await userEvent.type(box, name);
            const list = await screen.findByRole("listbox", { name: "Find results" });
            await userEvent.click(within(list).getAllByRole("option", { name: new RegExp(name) })[0]);
            await waitFor(() => {
                assert.isTrue(session.selection.has(id));
            });
            // A stable frame is one the camera has finished gliding to the pick in.
            await element.waitForStableFrame();
        };

        // A pick already on screen is centered too (camera.pivotOnSelection, issue #2293).
        await pick("Eve", 7);
        centered(7);
        assert.isTrue(element.nodeScreenPosition(7)?.visible);

        // Turned away from the graph, a pick brings the node back into view, centered.
        const away = element.getCameraState();
        await element.setCameraState({ ...away, target: { x: 500, y: 500, z: 500 } });
        await waitFor(() => {
            assert.isFalse(element.nodeScreenPosition(4)?.visible);
        });
        await pick("Bea", 4);
        centered(4);
        assert.isTrue(element.nodeScreenPosition(4)?.visible);
    });

    it("says when nothing matches, and offers the value rows", async () => {
        await openGraph();
        const box = screen.getByRole("combobox", { name: "Find" });

        await userEvent.type(box, "zzz");
        assert.isNotNull(await screen.findByText('No match for "zzz"'));

        await userEvent.clear(box);
        await userEvent.type(box, "Mr Hi");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        const values = within(list).getByRole("group", { name: "Values" });
        assert.isNotNull(within(values).getByRole("option", { name: "Select where club is Mr Hi (5)" }));
    });

    it("offers 'or more' beside a typed number, and picking it selects every tie at or above it", async () => {
        const { session } = await openGraph();
        await session.data.clear();
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        // Read from the file itself, not through the element: ties of 10 or more shared chapters.
        const wanted = [...lesMiserables.matchAll(/shared_chapters ([\d.]+)/g)].filter(
            (m) => Number(m[1]) >= 10,
        ).length;

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "10");
        const values = within(await screen.findByRole("listbox", { name: "Find results" })).getByRole("group", {
            name: "Values",
        });
        const exact = within(values).getByRole("option", { name: /^Select where .+ is 10 \(\d+\)$/ });
        assert.notInclude(exact.textContent, "Select where", "the words on the row drop the verb");
        await userEvent.click(within(values).getByRole("option", { name: /^Select where .+ is 10 or more \(\d+\)$/ }));

        await waitFor(() => {
            assert.equal(session.selection.edges.length, wanted);
        });
        assert.isAbove(wanted, 0);
        assert.equal(session.selection.nodes.length, 0);
    });

    it("offers 'or more' for a typed number no link takes, and picking it selects every link at or above it", async () => {
        const { session } = await openGraph();
        await session.data.clear();
        // The studio's bus-stops.csv: no link takes exactly 10 minutes.
        const links = [
            "Depot,Market,4|Market,Library,6|Library,Harbor,5|Depot,School,9|School,Harbor,12|Market,Park,3",
            "Park,Clinic,4|Clinic,Harbor,3|Library,Clinic,7|School,Stadium,5|Stadium,Harbor,6|Park,Museum,5",
            "Museum,Clinic,2|Depot,Station,15|Station,Harbor,14|Station,Stadium,4|Museum,Library,4",
        ]
            .join("|")
            .split("|")
            .map((line) => line.split(","));
        await session.data.addNodes([...new Set(links.flatMap(([from, to]) => [from, to]))].map((id) => ({ id })));
        await session.data.addEdges(
            links.map(([from, to, minutes]) => ({ source: from, target: to, minutes: Number(minutes) })),
        );
        const wanted = links.filter(([, , minutes]) => Number(minutes) >= 10).length;

        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "10");
        const values = within(await screen.findByRole("listbox", { name: "Find results" })).getByRole("group", {
            name: "Values",
        });
        await userEvent.click(
            within(values).getByRole("option", { name: `Select where minutes is 10 or more (${String(wanted)})` }),
        );

        await waitFor(() => {
            assert.equal(session.selection.edges.length, wanted);
        });
        assert.equal(wanted, 3);
        assert.equal(session.selection.nodes.length, 0);
    });
});
