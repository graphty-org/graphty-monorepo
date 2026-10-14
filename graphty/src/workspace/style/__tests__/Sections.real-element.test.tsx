/**
 * The Style tab's sections on the REAL graphty-element, driven by real input (the owner's style
 * panel design, 2026-10-13): a section lists only what the layer sets; "+" ("Add to <section>")
 * adds a property with a starting value and focus in it, and the minus removes it, in every
 * section; nothing a layer does not set looks like a value; Everything holds the base look and its
 * eye hides the graph; a covered row says who covers it; several rows read "Set on 1 of 2"; every
 * eye in the tree shows at rest; Everything can be neither deleted nor moved.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { SECTIONS } from "../words";

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
 * How many pixels of the graph's canvas differ from its background: what the reader sees drawn.
 * @returns the count.
 */
async function ink(): Promise<number> {
    const host = document.querySelector("graphty-element");
    const canvas = host?.shadowRoot?.querySelector("canvas") ?? host?.querySelector("canvas") ?? null;
    if (canvas === null) {
        throw new Error("no canvas");
    }
    const base64 = await page.screenshot({ element: canvas, save: false });
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const board = document.createElement("canvas");
    board.width = image.width;
    board.height = image.height;
    const context = board.getContext("2d");
    if (context === null) {
        throw new Error("no 2D context");
    }
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, board.width, board.height);
    // The background is the most common color.
    const seen = new Map<number, number>();
    for (let i = 0; i < data.length; i += 4) {
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const background = [...seen].reduce((most, each) => (each[1] > most[1] ? each : most))[0];
    const [r, g, b] = [(background >> 16) & 255, (background >> 8) & 255, background & 255];
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b) > 48) {
            count++;
        }
    }
    return count;
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
        assert.isNull(tab.querySelector('[data-beneath], [data-is-default="true"]'), "no line from beneath");

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
            SECTIONS[kind].filter((spec) => spec.id !== "text").map((spec) => [kind, spec.id, spec.title] as const),
        ),
    )("adds and removes a property in %s %s, with focus and an announcement each way", async (kind, id, title) => {
        const { session, store } = await openScene();
        await session.styles.addRow({ name: "Both", target: "both", selector: { match: "everything" } });
        await session.styles.settled();
        await openStyle("Both");
        const where = `${kind} ${title}`;
        await userEvent.click(
            within(section(kind, id)).getByRole("button", { name: `Add to ${kind} ${title.toLowerCase()}` }),
        );
        const items = await screen.findAllByRole("menuitem");
        const first = items[0].textContent ?? "";
        await userEvent.click(items[0]);
        const row = await waitFor(() => {
            const found = section(kind, id).querySelector<HTMLElement>(".ws-row");
            assert.isNotNull(found, `${where}: ${first} added`);
            return found;
        });
        const channel = row.dataset.line as Channel;
        assert.isDefined(written(session, "Both", channel), `${where}: the layer writes ${channel}`);
        await waitFor(() => {
            assert.isTrue(row.contains(document.activeElement), `${where}: focus in the new row`);
            assert.match(said(store), / added$/, where);
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
        const { store } = await openScene();
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
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.click(within(row).getByRole("button", { name: "Remove node size" }));
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

    it("starts an added arrowhead at what an undirected graph draws there: none", async () => {
        const { session } = await openScene();
        await openStyle("Everything");
        await userEvent.click(within(section("edge", "ends")).getByRole("button", { name: "Add to edge ends" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Head" }));
        await waitFor(() => {
            assert.equal(written(session, "Everything", "edge.arrowHead"), "none");
        });
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

    it("offers a popover's choices without showing an unset one as the value", async () => {
        const { session } = await openScene();
        const { runId } = await session.runs.start("louvain");
        await session.styles.encode({ run: runId, channel: "node.color", name: "Groups" });
        await session.styles.settled();
        const layer = session.styles.list().find((each) => each.name === "Groups");
        assert.isUndefined(layer?.encode?.["node.color"]?.palette, "the layer sets no palette");
        await openStyle("Groups");
        await userEvent.click(
            await waitFor(() => within(section("node", "fill")).getByRole("button", { name: /^Node color: / })),
        );
        const dialog = await screen.findByRole("dialog");
        const palette = within(dialog).getByLabelText(/^Palette/);
        assert.equal(palette.getAttribute("aria-label"), "Palette, not set");
        assert.equal((palette as HTMLInputElement).value, "", "no palette shown as chosen");
        const chips = within(dialog).getAllByRole("button", { name: / color, not set/ });
        assert.isAbove(chips.length, 0);
        for (const chip of chips) {
            assert.notMatch(chip.getAttribute("aria-label") ?? "", /#[0-9A-F]{6}/i, "no color named as its value");
        }
    });

    it("starts an added property from the one value beneath, and over values that vary from one plain value", async () => {
        const { session, degree } = await openScene({ degree: true });
        assert.isDefined(degree);
        // Shape over Everything's one shape: the same shape, so nothing changes on the canvas.
        await openStyle("Key people");
        await userEvent.click(within(section("node", "shape")).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        await waitFor(() => {
            assert.isDefined(written(session, "Key people", "node.shape"));
        });
        assert.equal(written(session, "Key people", "node.shape"), written(session, "Everything", "node.shape"));

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
        await userEvent.click(await screen.findByRole("menuitem", { name: "Color" }));
        await waitFor(() => {
            assert.isString(written(session, "Over degree", "node.color"), "one plain color");
        });
        const layer = session.styles.list().find((each) => each.name === "Over degree");
        assert.isUndefined(layer?.encode?.["node.color"], "no mapping copied");
    });

    it("holds the base look in Everything, and its eye hides what no other shown layer paints", async () => {
        const { session } = await openScene();
        const tab = await openStyle("Everything");
        assert.isNotNull(section("node", "fill").querySelector('.ws-row[data-line="node.color"]'));
        assert.isNotNull(section("edge", "line").querySelector('.ws-row[data-line="edge.color"]'));
        assert.isNotNull(tab);
        await session.styles.settled();
        const before = await ink();
        assert.isAbove(before, 0, "the graph is drawn");

        const tree = screen.getByRole("tree", { name: "Style layers" });
        const everything = within(tree).getByRole("treeitem", { name: /^Everything, / });
        await userEvent.click(within(everything).getByRole("button", { name: "Hide Everything" }));
        await within(everything).findByRole("button", { name: "Show Everything" });
        await session.styles.settled();
        const after = await waitFor(async () => {
            const drawn = await ink();
            // The legend and the toolbar float over the canvas and stay; the graph goes.
            assert.isBelow(drawn, before / 2, "hiding Everything hides the graph");
            return drawn;
        });
        assert.isAbove(after, 0, "Key people's two nodes stay drawn");

        await userEvent.click(within(everything).getByRole("button", { name: "Show Everything" }));
        await session.styles.settled();
        await waitFor(async () => {
            assert.isAbove(await ink(), before / 2, "shown again");
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

    it("reads 'Set on 1 of 2' for a property only some selected rows set, with no value", async () => {
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
            assert.equal(color?.querySelector(".ws-field-control")?.textContent, "Set on 1 of 2");
            assert.isNull(color?.querySelector("input"), "no value borrowed from either row");
            const size = section("node", "shape").querySelector<HTMLElement>('.ws-row[data-line="node.size"]');
            assert.equal(size?.querySelector(".ws-field-control")?.textContent, "Set on 1 of 2");
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
