/**
 * The Style tab's sections on the REAL graphty-element, driven by real input (the owner's style
 * panel design, 2026-10-13): a section lists only what the layer sets; "+" ("Add to <section>")
 * adds a property waiting for a value, writing nothing, with focus in it, and the minus removes
 * it, in every section; nothing a layer does not set looks like a value; Everything holds the
 * base look and its eye hides the graph; a covered row says who covers it; several rows read the
 * value the rows that set a property agree on, and say who does not set it; every eye in the tree
 * shows at rest; Everything can be neither deleted nor moved.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { findValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { SECTIONS } from "../words";
import { showKind } from "./kindTab";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** The scene: the session, the chrome store, and the Degree run's row name when it ran. */
interface Scene {
    readonly session: GraphSession;
    readonly store: WorkspaceStore;
    readonly degree?: string;
}

/**
 * Les Miserables with the starting rows holding the base look, and a "Key people" layer that sets
 * only a color on Valjean and Javert; Degree too when asked.
 * @param options - what to add.
 * @param options.degree - whether to run Degree, which colors every node.
 * @returns the scene.
 */
async function openScene({ degree = false }: { degree?: boolean } = {}): Promise<Scene> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
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
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: ["Valjean", "Javert"].map(idOf) },
        set: { "node.color": "#E8590C" },
    });
    let degreeRow: string | undefined;
    if (degree) {
        const { runId } = await session.runs.start("degree");
        await session.styles.settled();
        degreeRow = session.runs
            .bindings(runId)
            .map((id) => session.styles.get(id)?.name)
            .find((name) => name !== undefined);
    }
    await session.styles.settled();
    return { session, store, degree: degreeRow };
}

/**
 * Escapes a name for a regular expression.
 * @param name - the name.
 * @returns the pattern text.
 */
function escape(name: string): string {
    return name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Opens a tree row's Style tab by a click on the row, and on the Style tab when it opened on Values.
 * @param name - the row's visible name.
 * @returns the Style tab.
 */
async function openStyle(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${escape(name)}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return screen.findByTestId("style-tab");
}

/**
 * One section of the open Style tab.
 * @param kind - nodes or edges.
 * @param id - the section's id.
 * @returns the section.
 */
function section(kind: "node" | "edge", id: string): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>(`[data-section="${kind}-${id}"]`);
    if (found === null) {
        throw new Error(`no ${kind} ${id} section`);
    }
    return found;
}

/**
 * Whether a section is drawn as not written: its dimmed title and "+" only.
 * @param box - the section.
 * @returns true when empty.
 */
function isEmpty(box: HTMLElement): boolean {
    return box.querySelector('[data-empty="true"]') !== null && box.querySelector(".ws-row") === null;
}

/**
 * The words the app last gave its status line.
 * @param store - the chrome store.
 * @returns what the status line says.
 */
function said(store: WorkspaceStore): string {
    return store.get().announcement;
}

/**
 * What one layer writes for a channel.
 * @param session - the session.
 * @param name - the layer's name.
 * @param channel - the channel.
 * @returns the value, or undefined.
 */
function written(session: GraphSession, name: string, channel: Channel): unknown {
    return session.styles.list().find((layer) => layer.name === name && layer.set?.[channel] !== undefined)?.set?.[
        channel
    ];
}

/**
 * The names of the nodes the renderer draws now, read from each node's render state.
 * @param session - the element's session.
 * @returns the names, sorted.
 */
function drawn(session: GraphSession): string[] {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        throw new Error("no element");
    }
    return session.data
        .nodes()
        .filter((node) => element.getNode(node.id)?.getRenderState() === "visible")
        .map((node) => String(node.name))
        .sort();
}

describe("the Style tab's sections", () => {
    it("lists only what a layer sets, and draws nothing it does not set as a value", async () => {
        await openScene();
        let tab = await openStyle("Key people");
        const fill = section("node", "fill");
        assert.isNotNull(fill.querySelector('.ws-row[data-line="node.color"]'), "Fill lists Color");
        for (const spec of SECTIONS.node.filter((each) => each.id !== "fill")) {
            assert.isTrue(isEmpty(section("node", spec.id)), `${spec.title} is its dimmed title and "+"`);
            within(section("node", spec.id)).getByRole("button", { name: `Add to node ${spec.title.toLowerCase()}` });
        }
        assert.isNull(tab.querySelector('[data-group="edge"]'), "a layer on nodes has no Edges group");
        const placeholders = [...tab.querySelectorAll<HTMLInputElement>("input")].filter(
            (input) => input.placeholder !== "",
        );
        assert.deepEqual(
            placeholders.map((input) => input.placeholder),
            [],
            "no empty control shows a value",
        );
        // The color's opacity box shows the full opacity it draws at while the layer sets none.
        assert.isNull(
            tab.querySelector(
                '[data-beneath], [data-is-default="true"]:not([data-testid="compact-color-input-opacity"])',
            ),
            "no line from beneath",
        );

        tab = await openStyle("Hovered");
        assert.isNull(tab.querySelector(".ws-row"), "Hovered sets nothing");
        for (const spec of SECTIONS.node) {
            assert.isTrue(isEmpty(section("node", spec.id)), `Hovered: ${spec.title} is dimmed`);
        }

        await openStyle("Selected");
        const effects = section("node", "effects");
        assert.isNotNull(effects.querySelector('.ws-row[data-line="node.haloColor"]'), "a Halo row");
        assert.isNotNull(effects.querySelector('.ws-row[data-line="node.glow"]'), "a Glow row");
        assert.isTrue(isEmpty(section("node", "shape")), "Selected writes no shape");
    });

    it.each(
        (["node", "edge"] as const).flatMap((kind) =>
            SECTIONS[kind]
                // Les Miserables is undirected, so Arrowheads add nothing there (tested on its own).
                .filter((spec) => spec.id !== "text" && !(kind === "edge" && spec.id === "ends"))
                .map((spec) => [kind, spec.id, spec.title] as const),
        ),
    )("adds and removes a property in %s %s, with focus and an announcement each way", async (kind, id, title) => {
        const { session, store } = await openScene();
        await session.styles.addRow({ name: "Both", target: "both", selector: { match: "everything" } });
        await session.styles.settled();
        await openStyle("Both");
        await showKind(kind);
        const where = `${kind} ${title}`;
        await userEvent.click(
            within(section(kind, id)).getByRole("button", { name: `Add to ${kind} ${title.toLowerCase()}` }),
        );
        // A "+" with one thing to add adds it at once; with more, it opens a menu.
        const items = await waitFor(() => {
            const found = screen.queryAllByRole("menuitem");
            assert.isTrue(found.length > 0 || section(kind, id).querySelector(".ws-row") !== null, where);
            return found;
        });
        const first = items[0]?.textContent ?? "its one property";
        if (items.length > 0) {
            await userEvent.click(items[0]);
        }
        const row = await waitFor(() => {
            const found = section(kind, id).querySelector<HTMLElement>(".ws-row");
            assert.isNotNull(found, `${where}: ${first} added`);
            return found;
        });
        const channel = row.dataset.line as Channel;
        // Hide is itself a value, written at once; every other property waits for one.
        const picked = channel.endsWith(".visible");
        assert.strictEqual(written(session, "Both", channel) !== undefined, picked, `${where}: written only if picked`);
        await waitFor(() => {
            assert.isTrue(row.contains(document.activeElement), `${where}: focus in the new row`);
            assert.match(said(store), picked ? / added$/ : / added: pick a value$/, where);
        });
        await userEvent.click(within(row).getByRole("button", { name: /^Remove / }));
        await waitFor(() => {
            assert.isTrue(isEmpty(section(kind, id)), `${where}: removed`);
            assert.equal(
                document.activeElement?.getAttribute("aria-label"),
                `Add to ${kind} ${title.toLowerCase()}`,
                `${where}: focus on "+"`,
            );
            assert.match(said(store), / removed$/, where);
        });
        assert.isUndefined(written(session, "Both", channel), `${where}: the layer no longer writes it`);
    });

    it("keeps a layer whose last property is removed, its sections all dimmed", async () => {
        const { session } = await openScene();
        await openStyle("Key people");
        const color = section("node", "fill").querySelector<HTMLElement>('.ws-row[data-line="node.color"]');
        assert.isNotNull(color);
        await userEvent.click(within(color).getByRole("button", { name: "Remove node color" }));
        await waitFor(() => {
            assert.isTrue(isEmpty(section("node", "fill")), "Fill is its dimmed title and '+'");
        });
        const layer = session.styles.list().find((each) => each.name === "Key people");
        assert.isDefined(layer, "the layer is kept");
        assert.isUndefined(layer?.set);
        within(screen.getByRole("tree", { name: "Style layers" })).getByRole("treeitem", { name: /^Key people, / });
    });

    it("hands focus to the restored row, or the section's '+', on every Undo, and announces each", async () => {
        const { session, store } = await openScene();
        await openStyle("Key people");
        await userEvent.click(within(section("node", "shape")).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const row = await waitFor(() => {
            const found = section("node", "shape").querySelector<HTMLElement>('.ws-row[data-line="node.size"]');
            assert.isNotNull(found);
            assert.isTrue(found?.contains(document.activeElement), "focus in the new row");
            return found;
        });
        assert.isNotNull(row);
        // The new line's starting value is selected, so typing replaces it rather than appending.
        const field = document.activeElement as HTMLInputElement;
        assert.strictEqual(field.selectionStart, 0, "the value is selected from its start");
        assert.strictEqual(field.selectionEnd, field.value.length, "to its end");
        await userEvent.keyboard("3{Enter}");
        const set = await waitFor(() => {
            const found = section("node", "shape").querySelector<HTMLElement>('.ws-row[data-line="node.size"]');
            assert.strictEqual(written(session, "Key people", "node.size"), 3);
            return found;
        });
        (document.activeElement as HTMLElement | null)?.blur();
        if (set === null) {
            throw new Error("no size line");
        }
        await userEvent.click(within(set).getByRole("button", { name: "Remove node size" }));
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add to node shape");
        });
        const spoken = store.get().announced;
        await userEvent.keyboard("{Control>}z{/Control}");
        const back = await waitFor(() => {
            const found = section("node", "shape").querySelector<HTMLElement>('.ws-row[data-line="node.size"]');
            assert.isNotNull(found, "Undo brings the row back");
            assert.isTrue(
                found?.querySelector(".ws-field-control")?.contains(document.activeElement),
                "focus in the restored row's field",
            );
            return found;
        });
        assert.match(store.get().announcement, /^Undid /, "the Undo is announced");
        assert.isAbove(store.get().announced, spoken);
        within(back).getByRole("button", { name: "Remove node size" }).focus();
        const again = store.get().announced;
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.isTrue(isEmpty(section("node", "shape")), "Undo takes the add back");
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add to node shape", "focus on its '+'");
        });
        assert.isAbove(store.get().announced, again, "this Undo is announced too");
    });

    it("says arrowheads are not available on an undirected graph, with '+' disabled and a set one removable", async () => {
        const { session } = await openScene();
        await openStyle("Everything");
        await showKind("edge");
        const note = within(section("edge", "ends")).getByTestId("edge-ends-note");
        assert.equal(note.textContent, "Not available: undirected graph");
        const plus = within(section("edge", "ends")).getByRole("button", { name: "Add to edge arrowheads" });
        assert.equal(plus.getAttribute("aria-disabled"), "true");
        assert.equal(plus.getAttribute("aria-description"), "Not available: undirected graph");
        assert.strictEqual(plus.getAttribute("tabindex"), "-1", "a disabled '+' is no Tab stop");
        // An arrowhead a layer already sets stays, and can be removed.
        const everything = session.styles
            .list()
            .find((layer) => layer.name === "Everything" && layer.target === "edge");
        if (everything === undefined) {
            throw new Error("no Everything edge layer");
        }
        await session.styles.update(everything.id, { set: { ...everything.set, "edge.arrowHead": "normal" } });
        const line = await waitFor(() => {
            const found = section("edge", "ends").querySelector<HTMLElement>('[data-line="edge.arrowHead"]');
            assert.isNotNull(found);
            return found;
        });
        if (line === null) {
            throw new Error("no arrowhead line");
        }
        await userEvent.hover(line);
        await userEvent.click(within(line).getByRole("button", { name: "Remove edge target end" }));
        await waitFor(() => {
            assert.isUndefined(written(session, "Everything", "edge.arrowHead"));
        });
    });

    it("starts an added pattern count at 10 marks, not the floor of 2 that reads as no line", async () => {
        const { session } = await openScene();
        await openStyle("Everything");
        await showKind("edge");
        await userEvent.click(within(section("edge", "line")).getByRole("button", { name: "Add to edge line" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Pattern count" }));
        await waitFor(() => {
            const box = section("edge", "line").querySelector<HTMLInputElement>(
                '[data-line="edge.patternCount"] input',
            );
            assert.strictEqual(box?.value, "10");
        });
        assert.isUndefined(written(session, "Everything", "edge.patternCount"), "nothing written before a value");
    });

    it("an end label on an undirected graph's edges says why it is not drawn", async () => {
        const { session } = await openScene();
        await openStyle("Everything");
        await showKind("edge");
        await userEvent.click(within(section("edge", "text")).getByRole("button", { name: "Add to edge text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Label at target end" }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "Fixed text" }));
        await within(section("edge", "text")).findByRole("textbox", { name: /text$/ });
        await userEvent.keyboard("End{Enter}");
        // Les Miserables draws no arrowheads, so the element draws the end text on no edge.
        await waitFor(() => {
            assert.include(
                section("edge", "text").textContent,
                "Not drawn on 254 edges: it shows beside a target arrowhead, and they have none.",
            );
        });
        assert.equal(written(session, "Everything", "edge.arrowHeadText"), "End");
    });

    it("names a grouping's field after its method, and a bound row says once who covers it", async () => {
        const { session } = await openScene();
        const { runId } = await session.runs.start("louvain");
        await session.styles.encode({ run: runId, channel: "node.color", name: "Groups" });
        await session.styles.add({
            name: "Cover",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#123456" },
        });
        await session.styles.settled();
        await openStyle("Groups");
        const pill = await waitFor(() => {
            const found = section("node", "fill").querySelector<HTMLElement>(".cm-var-name");
            assert.equal(found?.textContent, "Louvain", "named after the method, as the tree names runs");
            return found;
        });
        assert.isNotNull(pill);
        const color = section("node", "fill").querySelector<HTMLElement>('.ws-row[data-line="node.color"]');
        assert.match(color?.querySelector("[data-covered-caption]")?.textContent ?? "", /^Covered by Cover on /);
        assert.notInclude(color?.textContent ?? "", "Painted over", "one caption, not two");
    });

    it("inside a binding, shows the palette and each group's color it paints now, though the layer set none", async () => {
        const { session } = await openScene();
        const { runId } = await session.runs.start("louvain");
        await session.styles.encode({ run: runId, channel: "node.color", name: "Groups" });
        await session.styles.settled();
        const layer = session.styles.list().find((each) => each.name === "Groups");
        const binding = layer?.encode?.["node.color"];
        assert.isFalse(typeof binding === "object" && "palette" in binding, "the layer sets no palette");
        await openStyle("Groups");
        await userEvent.click(
            await waitFor(() => within(section("node", "fill")).getByRole("button", { name: /^Node color: / })),
        );
        const dialog = await screen.findByRole("dialog");
        const palette = within(dialog).getByLabelText(/^Palette/);
        // The palette the element filled in, drawn as the unset field's placeholder (no option is
        // checked as if it were set) and marked as not set.
        assert.equal((palette as HTMLInputElement).value, "", "no palette is set here");
        assert.notEqual((palette as HTMLInputElement).placeholder, "", "the palette in use is shown");
        within(dialog).getByRole("combobox", { name: /^Palette, not set, / });
        const chips = within(dialog).getAllByTestId("compact-color-input-chip");
        assert.isAbove(chips.length, 0);
        for (const chip of chips) {
            // Each chip names the color it paints in words, never "not set" beside it or a raw hex.
            const name = chip.getAttribute("aria-label") ?? "";
            assert.match(name, / color, [a-z ]+$/, "each chip names the color it paints");
            assert.notMatch(name, /not set|#[0-9A-F]{6}/i);
        }
    });

    it("shows an added property at the one value beneath, or the element's start over values that vary, writing nothing", async () => {
        const { session, degree } = await openScene({ degree: true });
        assert.isDefined(degree);
        // Shape over Everything's one shape: the same shape, so nothing changes on the canvas.
        await openStyle("Key people");
        await userEvent.click(within(section("node", "shape")).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const beneath = String(written(session, "Everything", "node.shape"));
        await waitFor(() => {
            const line = section("node", "shape").querySelector<HTMLElement>('[data-line="node.shape"]');
            assert.isNotNull(line);
            within(line).getByRole("combobox", { name: new RegExp(`, default ${beneath}$`, "i") });
        });
        assert.isUndefined(written(session, "Key people", "node.shape"), "nothing written before a pick");

        // Color over Degree's ramp: one plain color, never Degree's mapping.
        await session.styles.add({
            name: "Over degree",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        await session.styles.settled();
        await openStyle("Over degree");
        await userEvent.click(within(section("node", "fill")).getByRole("button", { name: "Add to node fill" }));
        await waitFor(() => {
            assert.isNotNull(section("node", "fill").querySelector('[data-line="node.color"]'));
        });
        const layer = session.styles.list().find((each) => each.name === "Over degree");
        assert.isUndefined(layer?.set?.["node.color"], "no color written before a pick");
        assert.isUndefined(layer?.encode?.["node.color"], "no mapping copied");
    });

    it("holds the base look in Everything, and its eye hides what no other shown layer paints", async () => {
        const { session } = await openScene();
        const tab = await openStyle("Everything");
        assert.isNotNull(section("node", "fill").querySelector('.ws-row[data-line="node.color"]'));
        await showKind("edge");
        assert.isNotNull(section("edge", "line").querySelector('.ws-row[data-line="edge.color"]'));
        assert.isNotNull(tab);
        await session.styles.settled();
        const all = session.data.nodes().length;
        await waitFor(() => {
            assert.lengthOf(drawn(session), all, "the graph is drawn");
        });

        const tree = screen.getByRole("tree", { name: "Style layers" });
        const everything = within(tree).getByRole("treeitem", { name: /^Everything, / });
        await userEvent.click(within(everything).getByRole("button", { name: "Hide Everything" }));
        await within(everything).findByRole("button", { name: "Show Everything" });
        await session.styles.settled();
        await waitFor(() => {
            assert.deepEqual(drawn(session), ["Javert", "Valjean"], "only Key people's two nodes stay drawn");
        });

        await userEvent.click(within(everything).getByRole("button", { name: "Show Everything" }));
        await session.styles.settled();
        await waitFor(() => {
            assert.lengthOf(drawn(session), all, "shown again");
        });
    });

    it("says who covers a set row, and on how many of its elements", async () => {
        const { degree } = await openScene({ degree: true });
        await openStyle("Everything");
        const caption = await waitFor(() => {
            const found = section("node", "fill").querySelector<HTMLElement>("[data-covered-caption]");
            assert.isNotNull(found);
            return found;
        });
        const words = caption?.textContent ?? "";
        assert.match(words, /^Covered by .+ on 77 of 77$/, words);
        assert.include(words, degree ?? "Degree");
        assert.isNull(
            section("node", "shape").querySelector("[data-covered-caption]"),
            "a row nothing above writes has no caption",
        );
    });

    it("names at most three covering layers and counts the rest", async () => {
        const { session } = await openScene();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        await openStyle("Everything");
        const words = await waitFor(() => {
            const text = section("node", "fill").querySelector("[data-covered-caption]")?.textContent ?? "";
            assert.match(text, /^Covered by /);
            return text;
        });
        // Louvain's six group layers cover it: three by name, then a count, never all six.
        assert.match(words, /^Covered by [^,]+, [^,]+, [^,]+ and 3 more on 77 of 77$/, words);
    });

    it("reads the value the setting rows give a property only some selected rows set, and who sets it", async () => {
        const { session } = await openScene();
        const valjean = String(session.data.nodes().find((n) => n.name === "Valjean")?.id);
        await session.styles.add({
            name: "Big",
            target: "node",
            selector: { match: "ids", nodes: [valjean] },
            set: { "node.size": 3 },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        const user = userEvent.setup();
        await user.click(within(tree).getByRole("treeitem", { name: /^Key people, / }));
        await user.keyboard("{Control>}");
        await user.click(within(tree).getByRole("treeitem", { name: /^Big, / }));
        await user.keyboard("{/Control}");
        await waitFor(() => {
            const color = section("node", "fill").querySelector<HTMLElement>('.ws-row[data-line="node.color"]');
            assert.equal(color?.querySelector("[data-breakdown]")?.textContent, "1 layer sets color; not set: Big");
            const size = section("node", "shape").querySelector<HTMLElement>('.ws-row[data-line="node.size"]');
            assert.equal(
                size?.querySelector("[data-breakdown]")?.textContent,
                "1 layer sets size; not set: Key people",
            );
            assert.equal(
                size?.querySelector<HTMLInputElement>("input")?.value,
                "3",
                "the one setting row's value, as a write reaches only the rows that set it",
            );
        });
    });

    it("shows every eye at rest, names a hidden row's eye 'Show', and keeps Everything in place", async () => {
        const { session } = await openScene();
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.unhover(tree);
        const eyes = within(tree).getAllByRole("button", { name: /^(Hide|Show) / });
        assert.isAbove(eyes.length, 3);
        for (const eye of eyes) {
            assert.equal(getComputedStyle(eye).opacity, "1", `${eye.getAttribute("aria-label") ?? ""} shows at rest`);
        }
        const key = within(tree).getByRole("treeitem", { name: /^Key people, / });
        await userEvent.click(within(key).getByRole("button", { name: "Hide Key people" }));
        await within(key).findByRole("button", { name: "Show Key people" });

        await userEvent.click(within(tree).getByRole("treeitem", { name: /^Everything, / }));
        await userEvent.keyboard("{Delete}");
        await session.styles.settled();
        assert.isDefined(
            session.styles.tree().find((row) => row.name === "Everything"),
            "Delete leaves Everything in place",
        );
    });
});
