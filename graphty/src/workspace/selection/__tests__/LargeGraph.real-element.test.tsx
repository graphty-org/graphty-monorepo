/**
 * Every picker of the selection editor on a generated graph of 50,000 nodes (graph-samples' LFR
 * benchmark, about 5,000 communities), on the REAL graphty-element, driven by real clicks and keys
 * (design/ui/selection-groups/spec.md, section 4.3): no list grows with the graph. The reference
 * picker lists no node before typing and at most 8 after; "While ... has nodes" takes one
 * reference shown as one token; the category checklist draws at most 8 rows, "Check N" ticks a
 * search's matches and the row summarizes them; the value picker lists columns and algorithms,
 * never values.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The generated graph's size. */
const NODES = 50_000;

/**
 * The workspace on a generated graph of 50,000 nodes whose `community` column is a category.
 * @returns The session.
 */
async function openGenerated(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.generate("lfr", {
        n: NODES,
        minDegree: 2,
        maxDegree: 8,
        degreeExponent: 2.5,
        minCommunity: 5,
        maxCommunity: 15,
        communityExponent: 1.5,
        mixing: 0.1,
        seed: 1,
    });
    await session.data.setType({ kind: "node", name: "community" }, "category");
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/**
 * A layer on a selection, selected in the style tree: its outline is drawn.
 * @param session - The session.
 * @param name - Its name.
 * @param rule - Its selection.
 * @param set - What it paints.
 * @returns The layer.
 */
async function openLayer(
    session: GraphSession,
    name: string,
    rule: UnionLeaf,
    set: Layer["set"] = { "node.color": "#d55e00" },
): Promise<Layer> {
    const layer = await session.styles.add({
        name,
        target: "node",
        selector: { match: "rule", where: rule },
        set,
    });
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-editor"));
    });
    return layer;
}

/**
 * One step from All nodes.
 * @param id - the step's id.
 * @param stepRule - its rule.
 * @returns the selection.
 */
const oneStep = (id: string, stepRule: UnionLeaf["branches"][number]["steps"][number]["rule"]): UnionLeaf => ({
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [{ start: "all", steps: [{ id, op: "keep", rule: stepRule }] }],
});

/**
 * Selects a step's row by a click, so its pane is drawn.
 * @param id - the step's id.
 */
async function selectStep(id: string): Promise<void> {
    const row = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-row="${id}"]`);
        assert.isNotNull(found);
        return found;
    });
    await userEvent.click(row?.querySelector(".sel-value") ?? document.body);
    await waitFor(() => {
        assert.isNotNull(document.querySelector(`[data-step-pane="${id}"]`));
    });
}

/**
 * The open reference list's options, and its group headings.
 * @returns their words.
 */
function listed(): { options: string[]; headings: string[] } {
    const list = document.querySelector<HTMLElement>('[role=listbox][aria-label="References"]');
    return {
        options: [...(list?.querySelectorAll<HTMLElement>("[role=option]") ?? [])].map(
            (each) => each.textContent ?? "",
        ),
        headings: [...(list?.querySelectorAll<HTMLElement>(".cm-listbox-group-label") ?? [])].map(
            (each) => each.textContent ?? "",
        ),
    };
}

/** What the first frame after an input drew. */
interface FirstFrame {
    /** The workspace header says "Drawing". */
    readonly drawing: boolean;
    /** The workspace header's count, or null with no workspace open. */
    readonly count: string | null;
    /** graphty-element draws the workspace's branches view. */
    readonly showing: boolean;
    /** Milliseconds from the input to that frame, for the failure message. */
    readonly after: number;
}

/**
 * Does an input and reads what the first animation frame after it drew: the frame the browser
 * paints once the input's own task is done.
 * @param session - The session.
 * @param input - The input, by real pointer or keys.
 * @returns What that frame drew.
 */
async function firstFrameAfter(session: GraphSession, input: () => Promise<void>): Promise<FirstFrame> {
    let at = -1;
    const arm = (): void => {
        if (at < 0) {
            at = performance.now();
        }
    };
    window.addEventListener("pointerdown", arm, { capture: true });
    window.addEventListener("keydown", arm, { capture: true });
    const seen = new Promise<FirstFrame>((resolve) => {
        const look = (now: number): void => {
            if (at < 0) {
                requestAnimationFrame(look);
                return;
            }
            const head = document.querySelector(".sel-ws-head");
            resolve({
                drawing: head?.querySelector("[data-drawing]") !== null && head !== null,
                count: head?.querySelector(".sel-count")?.textContent ?? null,
                showing: session.styles.showingBranches,
                after: now - at,
            });
        };
        requestAnimationFrame(look);
    });
    await input();
    const frame = await seen;
    window.removeEventListener("pointerdown", arm, { capture: true });
    window.removeEventListener("keydown", arm, { capture: true });
    return frame;
}

/** What the frames from an input to the workspace's closing drew. */
interface Closing {
    /** Frames drawn with the workspace open but no "Drawing" in its header. */
    readonly quiet: number;
    /** Frames drawn with the workspace open. */
    readonly open: number;
    /** The canvas held its finished picture in the frame the workspace was gone from. */
    readonly paintedAtClose: boolean;
}

/**
 * Does an input that closes the workspace and reads every animation frame until it is gone: whether
 * each frame with it open said "Drawing", and whether graphty-element had painted the result by the
 * frame it closed (a wait started then ends before the next frame).
 * @param input - The input, by real pointer or keys.
 * @returns What those frames drew.
 */
async function framesUntilClosed(input: () => Promise<void>): Promise<Closing> {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the element is drawn");
    }
    let quiet = 0;
    let open = 0;
    // Counted from the frame the input lands in (its click or key), not from when the driver was
    // asked to send it: the frames before the input arrives are not the editor's to fill.
    let armed = false;
    const arm = (): void => {
        armed = true;
    };
    window.addEventListener("click", arm, { capture: true });
    window.addEventListener("keydown", arm, { capture: true });
    const closed = new Promise<boolean>((resolve) => {
        const look = (): void => {
            if (!armed) {
                requestAnimationFrame(look);
                return;
            }
            if (document.querySelector(".sel-ws") === null) {
                let painted = false;
                void element.waitForPainted().then(() => {
                    painted = true;
                });
                requestAnimationFrame(() => {
                    resolve(painted);
                });
                return;
            }
            open++;
            if (document.querySelector(".sel-ws-head [data-drawing]") === null) {
                quiet++;
            }
            requestAnimationFrame(look);
        };
        requestAnimationFrame(look);
    });
    await input();
    const paintedAtClose = await closed;
    window.removeEventListener("click", arm, { capture: true });
    window.removeEventListener("keydown", arm, { capture: true });
    return { quiet, open, paintedAtClose };
}

describe("the selection editor on 50,000 nodes", () => {
    it("the reference picker lists no node before typing, and at most 8 after", async () => {
        const session = await openGenerated();
        await openLayer(session, "Near", oneStep("near", { kind: "hops", max: 2 }));
        await selectStep("near");
        await userEvent.click(await screen.findByRole("button", { name: "Reference" }));
        await waitFor(() => {
            assert.include(listed().headings, "Nodes 50,000");
        });
        assert.isTrue(
            listed().options.every(
                (each) =>
                    ["Pick on canvas", "Hovered or selected", "So far"].includes(each) || each.startsWith("Selected"),
            ),
            listed().options.join(", "),
        );
        await userEvent.keyboard("12");
        await waitFor(() => {
            const nodes = listed().headings.find((each) => each.startsWith("Nodes"));
            assert.match(nodes ?? "", /^Nodes 8 of [\d,]+$/);
        });
        assert.isAtMost(listed().options.length, 4 + 8);
        // A graph with no label column is searched in every column (spec 4.3), so the node whose id
        // is exactly what was typed comes first.
        const live = ["Pick on canvas", "Hovered or selected", "So far"];
        const nodes = listed().options.filter((each) => !live.includes(each) && !each.startsWith("Selected"));
        assert.strictEqual(nodes[0], "12", nodes.join(", "));
        await userEvent.keyboard("{Escape}");
    });

    it("While has nodes takes one reference, shown as one token", async () => {
        const session = await openGenerated();
        await openLayer(session, "While", oneStep("while", { kind: "nonempty" }));
        await selectStep("while");
        await userEvent.click(await screen.findByRole("button", { name: "Reference" }));
        await userEvent.click(await screen.findByRole("option", { name: "Selected (0)" }));
        await waitFor(() => {
            assert.match(
                document.querySelector('[data-row="while"]')?.getAttribute("aria-label") ?? "",
                /^While Selected \(0\) has nodes, /,
            );
        });
        assert.isNotNull(screen.queryByRole("button", { name: "Reference: Selected (0)" }));
    });

    it("the category checklist draws at most 8 rows; Check N ticks a search's matches and the row summarizes them", async () => {
        const session = await openGenerated();
        const layer = await openLayer(
            session,
            "Communities",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
        );
        await selectStep("com");
        const values = await screen.findByRole("group", { name: "community values" });
        assert.isAtMost(within(values).getAllByRole("checkbox").length, 9, "8 values and (no value) at most");
        const search = screen.getByRole("textbox", { name: "Search community" });
        assert.match(search.getAttribute("placeholder") ?? "", /^Search [\d,]+$/);
        await userEvent.type(search, "1");
        const check = await screen.findByRole("button", { name: /^Check [\d,]+$/ });
        const matches = Number((check.textContent ?? "").replace(/\D/g, ""));
        assert.isAbove(matches, 8);
        assert.isAtMost(within(values).getAllByRole("checkbox").length, 8);
        await userEvent.click(check);
        await waitFor(() => {
            const steps = session.styles.get(layer.id)?.selector;
            const rule = steps?.match === "rule" && steps.where.kind === "union" ? steps.where : undefined;
            const step = rule?.branches[0]?.steps[0]?.rule as { values?: unknown[] } | undefined;
            assert.lengthOf(step?.values ?? [], matches);
        });
        await userEvent.clear(search);
        await waitFor(() => {
            assert.isNotNull(screen.queryByText(`${(matches - 6).toLocaleString("en-US")} more checked`));
        });
        assert.isAtMost(within(values).getAllByRole("checkbox").length, 9);
        // A list of more than nine values is said as its count (spec 3.1), else two names and "N more".
        assert.match(
            document.querySelector('.sel-ws-outline [data-row="com"]')?.getAttribute("aria-label") ?? "",
            matches > 9
                ? new RegExp(`${matches.toLocaleString("en-US")} values`)
                : new RegExp(`and ${(matches - 2).toLocaleString("en-US")} more`),
        );
    });

    it("a 5,000-value checklist never re-sorts under the pointer; the order changes only on a search (check 43)", async () => {
        const session = await openGenerated();
        await openLayer(
            session,
            "Still",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
        );
        await selectStep("com");
        const values = await screen.findByRole("group", { name: "community values" });
        const boxes = (): HTMLElement[] => within(values).getAllByRole("checkbox");
        const order = (): string[] =>
            boxes().map((box) => box.getAttribute("aria-label") ?? box.closest("label")?.textContent ?? "");
        const tops = (): number[] => boxes().map((box) => Math.round(box.getBoundingClientRect().top));
        const before = order();
        const beforeTops = tops();
        await userEvent.hover(boxes()[2]);
        for (const at of [2, 3, 4]) {
            await userEvent.click(boxes()[at]);
        }
        await waitFor(() => {
            assert.lengthOf(
                boxes().filter((box) => (box as HTMLInputElement).checked),
                3,
            );
        });
        assert.deepEqual(order(), before, "every row stayed where it was");
        assert.deepEqual(tops(), beforeTops);
        const search = screen.getByRole("textbox", { name: "Search community" });
        await userEvent.type(search, "1");
        await userEvent.clear(search);
        await waitFor(() => {
            assert.notDeepEqual(order(), before, "a search sets the order again: the checked first");
        });
        assert.isTrue(
            boxes()
                .slice(0, 3)
                .every((box) => (box as HTMLInputElement).checked),
        );
    });

    it("the Links picker lists the edge columns, never values (fix 1 on 50,000 nodes)", async () => {
        const session = await openGenerated();
        await openLayer(session, "Linked", oneStep("deg", { kind: "range", attribute: "graphty.degree", min: 3 }));
        await selectStep("deg");
        const pane = document.querySelector<HTMLElement>('[data-step-pane="deg"]');
        if (pane === null) {
            throw new Error("the pane is drawn");
        }
        await userEvent.click(within(pane).getByRole("button", { name: /^Advanced/ }));
        const links = await within(pane).findByRole("radiogroup", { name: "Edges" });
        await userEvent.click(within(links).getByText("Edges where ..."));
        await userEvent.click(await within(pane).findByRole("button", { name: "Edge value: none" }));
        await screen.findByRole("combobox", { name: "Find edge attributes" });
        // The generated graph's edges carry no column: the list is the edge columns, here none,
        // and never a value of the 99,000 edges.
        assert.isBelow(screen.queryAllByRole("option").length, 50);
        await userEvent.keyboard("{Escape}");
        assert.isUndefined(
            (session.styles.list().find((layer) => layer.name === "Linked")?.selector as { where?: UnionLeaf }).where
                ?.branches[0]?.steps[0]?.links,
            "nothing picked, no links written",
        );
    });

    it("the value picker lists columns and algorithms, never values", async () => {
        const session = await openGenerated();
        await openLayer(session, "Values", oneStep("deg", { kind: "range", attribute: "graphty.degree", min: 3 }));
        await selectStep("deg");
        await userEvent.click(await screen.findByRole("button", { name: /^Value: / }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        const options = await screen.findAllByRole("option");
        assert.isBelow(options.length, 200);
        await userEvent.keyboard("{Escape}");
    });
    it("an edit says Drawing in the frame of its input, before the work starts (opening, a tick, Done)", async () => {
        const session = await openGenerated();
        // A drawing that settles (the force layout on 50,000 nodes runs for minutes), so "Drawing"
        // ends once the element has painted, as on a study's graph.
        await session.layout.set("random");
        await openLayer(
            session,
            "Busy",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
        );
        const row = document.querySelector<HTMLElement>('.sel-rest [data-row="com"] .sel-value');
        if (row === null) {
            throw new Error("the step's row is drawn");
        }
        const opened = await firstFrameAfter(session, () => userEvent.click(row));
        assert.isTrue(opened.drawing, `opening: Drawing in the first frame (${String(opened.after)} ms)`);
        assert.isFalse(opened.showing, "opening: the preview is drawn after that frame");
        await waitFor(() => {
            assert.isTrue(session.styles.showingBranches);
        });
        const values = await screen.findByRole("group", { name: "community values" });
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
        });
        const before = document.querySelector(".sel-ws-head .sel-count")?.textContent ?? null;
        const box = within(values).getAllByRole("checkbox")[0];
        // The rule is handed to graphty-element (which reads it with `scope.watchSteps`, the work
        // that blocks the page on a large graph) only once the box has finished filling: a
        // transition still running then stays frozen at its start, an empty box, until the work ends.
        const filling: boolean[] = [];
        const watch = session.scope.watchSteps.bind(session.scope);
        session.scope.watchSteps = (...args) => {
            filling.push(box.parentElement?.getAnimations({ subtree: true }).length !== 0);
            return watch(...args);
        };
        const ticked = await firstFrameAfter(session, () => userEvent.click(box));
        assert.isTrue(ticked.drawing, `a tick: Drawing in the first frame (${String(ticked.after)} ms)`);
        assert.strictEqual(ticked.count, before, "a tick: the count is read after that frame");
        await waitFor(() => {
            assert.notStrictEqual(document.querySelector(".sel-ws-head .sel-count")?.textContent ?? null, before);
            assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
        });
        assert.isNotEmpty(filling, "a tick: the rule was handed on");
        assert.notInclude(filling, true, "a tick: the box had finished filling when the work started");
        const ws = document.querySelector<HTMLElement>(".sel-ws");
        if (ws === null) {
            throw new Error("the workspace is open");
        }
        const done = await firstFrameAfter(session, () =>
            userEvent.click(within(ws).getByRole("button", { name: "Done" })),
        );
        assert.isTrue(done.drawing, `Done: Drawing in the first frame (${String(done.after)} ms)`);
        assert.isTrue(done.showing, "Done: the preview ends after that frame");
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
            assert.isFalse(session.styles.showingBranches);
        });
    });

    it("Done and Cancel keep the workspace open, saying Drawing, until the result is painted", async () => {
        const session = await openGenerated();
        await session.layout.set("random");
        await openLayer(
            session,
            "Closing",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
        );
        const tickAndClose = async (button: "Done" | "Cancel"): Promise<Closing> => {
            const row = document.querySelector<HTMLElement>('.sel-rest [data-row="com"] .sel-value');
            if (row === null) {
                throw new Error("the step's row is drawn");
            }
            await userEvent.click(row);
            const values = await screen.findByRole("group", { name: "community values" });
            await waitFor(() => {
                assert.isTrue(session.styles.showingBranches);
                assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
            });
            const count = document.querySelector(".sel-ws-head .sel-count")?.textContent ?? null;
            await userEvent.click(within(values).getAllByRole("checkbox")[0]);
            await waitFor(() => {
                assert.notStrictEqual(document.querySelector(".sel-ws-head .sel-count")?.textContent ?? null, count);
                assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
            });
            const ws = document.querySelector<HTMLElement>(".sel-ws");
            if (ws === null) {
                throw new Error("the workspace is open");
            }
            return framesUntilClosed(() => userEvent.click(within(ws).getByRole("button", { name: button })));
        };
        const done = await tickAndClose("Done");
        assert.strictEqual(done.quiet, 0, `Done: ${String(done.quiet)} of ${String(done.open)} frames without Drawing`);
        assert.isTrue(done.paintedAtClose, "Done: the result was painted when the workspace closed");
        assert.isFalse(session.styles.showingBranches);
        const cancel = await tickAndClose("Cancel");
        assert.strictEqual(
            cancel.quiet,
            0,
            `Cancel: ${String(cancel.quiet)} of ${String(cancel.open)} frames without Drawing`,
        );
        assert.isTrue(cancel.paintedAtClose, "Cancel: the result was painted when the workspace closed");
        assert.isFalse(session.styles.showingBranches);
    });

    it("a control the reader moves to while Done waits for the paint keeps focus and every key typed there", async () => {
        const session = await openGenerated();
        await session.layout.set("random");
        const layer = await openLayer(
            session,
            "Moved on",
            oneStep("com", { kind: "categories", attribute: "data.community", values: [] }),
            { "node.size": 2 },
        );
        const row = document.querySelector<HTMLElement>('.sel-rest [data-row="com"] .sel-value');
        if (row === null) {
            throw new Error("the step's row is drawn");
        }
        await userEvent.click(row);
        const values = await screen.findByRole("group", { name: "community values" });
        await userEvent.click(within(values).getAllByRole("checkbox")[0]);
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws-head [data-drawing]"));
        });
        // The close waits on graphty-element's paint; it is held until the reader has moved on, so
        // the move always lands while the workspace still says "Drawing".
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("the element is drawn");
        }
        let release = (): void => undefined;
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });
        const painted = element.waitForPainted.bind(element);
        element.waitForPainted = async () => {
            await held;
            return painted();
        };
        const ws = document.querySelector<HTMLElement>(".sel-ws");
        if (ws === null) {
            throw new Error("the workspace is open");
        }
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".sel-ws-head [data-drawing]"));
        });
        await userEvent.click(screen.getByRole("button", { name: "Add to node fill" }));
        const line = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(
                '[data-testid="style-tab"] .ws-row[data-line="node.color"]',
            );
            assert.isNotNull(found);
            assert.isTrue(found?.contains(document.activeElement), "focus is in the new Color line");
            return found;
        });
        release();
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
        });
        assert.isTrue(line?.contains(document.activeElement), "the closed workspace left focus in the Color line");
        await userEvent.keyboard("E4572E{Enter}");
        await waitFor(() => {
            const now = session.styles.list().find((one: Layer) => one.id === layer.id);
            const color = now?.set?.["node.color"];
            assert.strictEqual(typeof color === "string" ? color.toUpperCase() : color, "#E4572E");
        });
        assert.isNull(document.querySelector(".sel-ws"), "no key reopened the workspace");
    });

    it("opening Which nodes right after adding a layer walks no style agreement before its first frame", async () => {
        const session = await openGenerated();
        await session.layout.set("random");
        // Every answer graphty-element gives; one it has not given before is a walk over 50,000 nodes.
        const given = new Set<unknown>();
        let walks = 0;
        const read = session.styles.agreement.bind(session.styles);
        session.styles.agreement = (...args) => {
            const answer = read(...args);
            if (!given.has(answer)) {
                given.add(answer);
                walks++;
            }
            return answer;
        };
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
        await screen.findByRole("textbox", { name: "Layer name" });
        const tab = await screen.findByTestId("style-tab");
        const edit = await within(tab).findByRole("button", { name: /^Edit Which nodes/ });
        await session.styles.settled();
        // The walks done from the press to the first frame drawn after it.
        let pressed = -1;
        let framed = -1;
        const press = (): void => {
            pressed = walks;
            requestAnimationFrame(() => {
                framed = walks;
            });
        };
        window.addEventListener("pointerdown", press, { capture: true, once: true });
        const opened = await firstFrameAfter(session, () => userEvent.click(edit));
        assert.isTrue(opened.drawing, `Drawing in the first frame (${String(opened.after)} ms)`);
        assert.isAtLeast(pressed, 0, "the press was seen");
        assert.strictEqual(framed - pressed, 0, "the press re-read the stack's agreement it already had");
    });
});
