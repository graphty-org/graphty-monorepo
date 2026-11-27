/**
 * The canvas inside `<graphty-element>` takes keyboard focus, so a keyboard or screen-reader user
 * meets it on every walk through the page. It must have a name, show where focus is, and never
 * take focus on its own.
 *
 * - Its accessible name is the host's standard `aria-label`, so the page names the drawing in its
 *   own words: `<graphty-element aria-label="Network drawing">`.
 * - The browser's own focus ring is drawn inside the canvas, so a page that clips the box the
 *   element fills (an `overflow: hidden` panel, the usual app layout) does not cut it off.
 * - It carries no `autofocus`, so mounting the element leaves the page's focus where it was.
 * - Focusing the host focuses the canvas (`delegatesFocus`), so a page that hands focus to the
 *   drawing, or a dialog that returns focus to it, needs no reach into the shadow root.
 * - A named canvas is an image; its description and the selection's announcement are worded by
 *   the page from the element's facts, and an opt-in off-screen list of nodes walks by keyboard.
 */
import "../../src/graphty-element";

import axe from "axe-core";
import { afterEach, assert, test } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const el of mounted.splice(0)) {
        el.remove();
    }
});

/**
 * Mounts an element, with the given host attributes, inside a parent that clips its overflow.
 * @param attributes - Attributes to set on the host before it is connected.
 * @returns The host and its canvas.
 */
async function mount(attributes: Record<string, string> = {}): Promise<{ host: Graphty; canvas: HTMLCanvasElement }> {
    const parent = document.createElement("div");
    parent.setAttribute("style", "width: 400px; height: 300px; overflow: hidden;");
    document.body.appendChild(parent);
    mounted.push(parent);

    const host = document.createElement("graphty-element");
    for (const [name, value] of Object.entries(attributes)) {
        host.setAttribute(name, value);
    }

    parent.appendChild(host);
    await host.updateComplete;
    const canvas = host.shadowRoot?.querySelector("canvas");
    assert.exists(canvas, "the element renders a canvas");
    return { host, canvas };
}

test("the canvas is named by the host's aria-label, and follows it", async () => {
    const { host, canvas } = await mount({ "aria-label": "Network drawing" });
    assert.strictEqual(canvas.getAttribute("aria-label"), "Network drawing");

    host.setAttribute("aria-label", "Florentine families");
    assert.strictEqual(canvas.getAttribute("aria-label"), "Florentine families");

    host.removeAttribute("aria-label");
    assert.isNull(canvas.getAttribute("aria-label"));
});

test("mounting the element leaves focus where it was", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    mounted.push(input);
    input.focus();

    const { canvas } = await mount();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    assert.isFalse(canvas.hasAttribute("autofocus"), "the canvas carries autofocus");
    assert.strictEqual(document.activeElement, input, "mounting the element moved focus");
});

test("keyboard focus on the canvas draws the browser's ring inside the canvas", async () => {
    const before = document.createElement("button");
    before.textContent = "before";
    document.body.prepend(before);
    mounted.push(before);
    const { host, canvas } = await mount();

    before.focus();
    await userEvent.tab();

    assert.strictEqual(host.shadowRoot?.activeElement, canvas, "Tab did not reach the canvas");
    assert.isTrue(canvas.matches(":focus-visible"));
    const style = getComputedStyle(canvas);
    assert.notStrictEqual(style.outlineStyle, "none", "no focus ring");
    assert.isBelow(
        parseFloat(style.outlineOffset),
        0,
        "the ring is drawn outside the canvas, where a clipping parent hides it",
    );
});

test("focusing the host focuses the canvas, so a page can hand focus to the drawing", async () => {
    const { host, canvas } = await mount({ "aria-label": "Network drawing" });

    host.focus();

    assert.strictEqual(host.shadowRoot?.activeElement, canvas, "host.focus() did not reach the canvas");
    assert.strictEqual(document.activeElement, host);
});

test("focus handed to the drawing as the element is connected survives its first render", async () => {
    const host = document.createElement("graphty-element");
    host.setAttribute("aria-label", "Network drawing");
    const parent = document.createElement("div");
    parent.setAttribute("style", "width: 400px; height: 300px;");
    document.body.appendChild(parent);
    mounted.push(parent);
    parent.appendChild(host);

    // Before the element's first update, as a page does on the render that mounts it.
    host.focus();
    await host.updateComplete;

    const canvas = host.shadowRoot?.querySelector("canvas");
    assert.exists(canvas);
    assert.strictEqual(host.shadowRoot?.activeElement, canvas, "the first render dropped focus to the page");
});

test("a pointer press focuses the canvas without the keyboard ring, even after a key press", async () => {
    const before = document.createElement("input");
    document.body.prepend(before);
    mounted.push(before);
    const { host, canvas } = await mount({ "aria-label": "Network drawing" });
    // The handlers that focus the canvas on a press are attached once the scene is up.
    await host.waitForStableFrame();

    // A key press last: Chrome's script focus then counts as keyboard focus.
    before.focus();
    await userEvent.keyboard("a");
    await userEvent.click(canvas, { position: { x: 200, y: 150 } });
    assert.strictEqual(host.shadowRoot?.activeElement, canvas, "the press did not focus the canvas");
    assert.strictEqual(getComputedStyle(canvas).outlineStyle, "none", "a pointer press drew the keyboard ring");

    // A key pressed in the drawing brings the ring back: the reader is on the keyboard now.
    await userEvent.keyboard("{Shift}");
    assert.notStrictEqual(getComputedStyle(canvas).outlineStyle, "none", "a key press left the ring hidden");
});

/**
 * Resolves on the session's next event of a kind; called before the write that causes it.
 * @param host - The element.
 * @param event - The event to wait for.
 * @returns A promise of that event.
 */
function next(host: Graphty, event: "project:derived" | "selection:changed"): Promise<void> {
    return new Promise((resolve) => {
        const stop = host.session.on(event, () => {
            stop();
            resolve();
        });
    });
}

/**
 * Adds a three-node path, a - b - c, and waits until the session has derived it.
 * @param host - The element.
 */
async function addPath(host: Graphty): Promise<void> {
    const derived = next(host, "project:derived");
    await host.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await host.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);
    await derived;
}

/**
 * The canvas's accessible description: the text of the element its aria-describedby names.
 * @param host - The element.
 * @param canvas - Its canvas.
 * @returns The description, or null when it has none.
 */
function descriptionOf(host: Graphty, canvas: HTMLCanvasElement): string | null {
    const id = canvas.getAttribute("aria-describedby");
    return id === null ? null : (host.shadowRoot?.getElementById(id)?.textContent ?? null);
}

test("a named canvas is an image, described in the page's words from data and styling", async () => {
    const { host, canvas } = await mount({ "aria-label": "Network drawing" });
    assert.strictEqual(canvas.getAttribute("role"), "img");
    assert.isNull(descriptionOf(host, canvas), "a description with no words from the page");

    host.accessibleDescription = ({ nodes, edges, legend }) => `${nodes}/${edges}/${legend.length}`;
    const empty = descriptionOf(host, canvas);
    assert.strictEqual(empty?.split("/").slice(0, 2).join("/"), "0/0");

    await addPath(host);
    const loaded = descriptionOf(host, canvas);
    assert.strictEqual(loaded?.split("/").slice(0, 2).join("/"), "3/2", "the description did not follow the data");

    const derived = next(host, "project:derived");
    await host.session.styles.encode({ column: { kind: "node", name: "id" }, channel: "node.color", name: "Ids" });
    await derived;
    assert.notStrictEqual(descriptionOf(host, canvas), loaded, "the description did not follow the styling");

    host.removeAttribute("aria-label");
    assert.isNull(canvas.getAttribute("role"), "an unnamed canvas is an unnamed image");
});

test("a selection change is announced in a live region, worded by the page when it asks", async () => {
    const { host } = await mount({ "aria-label": "Network drawing" });
    await addPath(host);
    const live = host.shadowRoot?.querySelector("[role=status]");
    assert.exists(live);

    let changed = next(host, "selection:changed");
    await host.session.selection.apply({ ids: ["a", "c"] });
    await changed;
    assert.strictEqual(live.textContent, "a, c", "the default announcement is the selected names");

    host.accessibleAnnouncement = ({ code, params }) =>
        `${code}:${params.nodes.map((n) => n.name).join()}:${params.neighbors.map((n) => n.name).join()}`;
    changed = next(host, "selection:changed");
    await host.session.selection.apply({ ids: ["b"] });
    await changed;
    assert.strictEqual(live.textContent, "selection:b:a,c");
    assert.deepStrictEqual(
        host.accessibleFacts().selection.neighbors.map((n) => n.name),
        ["a", "c"],
    );
});

test("the default announcement of one selected node looks up no neighbors", async () => {
    const { host } = await mount({ "aria-label": "Network drawing" });
    await addPath(host);
    const live = host.shadowRoot?.querySelector("[role=status]");
    assert.exists(live);
    const { data } = host.session;
    const neighbors = data.neighbors.bind(data);
    let lookups = 0;
    data.neighbors = (...args: Parameters<typeof neighbors>): ReturnType<typeof neighbors> => {
        lookups++;
        return neighbors(...args);
    };

    let changed = next(host, "selection:changed");
    await host.session.selection.apply({ ids: ["b"] });
    await changed;
    assert.strictEqual(live.textContent, "b");
    assert.strictEqual(lookups, 0, "the default announcement says only the names");

    host.accessibleAnnouncement = ({ params }) => params.neighbors.map((n) => n.name).join();
    changed = next(host, "selection:changed");
    await host.session.selection.apply({ ids: ["a"] });
    await changed;
    assert.strictEqual(live.textContent, "b");
    assert.strictEqual(lookups, 1, "a page's announcement gets the neighbors");
});

test("the node list is off by default; on, the keyboard walks it and selects a node", async () => {
    const { host, canvas } = await mount({ "aria-label": "Network drawing" });
    await addPath(host);
    assert.isNull(host.shadowRoot?.querySelector("[role=listbox]"), "the list is there by default");

    host.accessibleNodeList = true;
    const list = host.shadowRoot?.querySelector("[role=listbox]");
    assert.exists(list);
    assert.strictEqual(list.getAttribute("aria-label"), "Network drawing");
    assert.deepStrictEqual(
        [...list.querySelectorAll("[role=option]")].map((o) => o.textContent),
        ["a", "b", "c"],
    );

    canvas.focus();
    await userEvent.tab();
    assert.strictEqual(host.shadowRoot?.activeElement, list, "Tab from the canvas did not reach the list");

    await userEvent.keyboard("{ArrowDown}");
    const active = list.getAttribute("aria-activedescendant");
    assert.strictEqual(host.shadowRoot?.getElementById(active ?? "")?.textContent, "b");

    const changed = next(host, "selection:changed");
    await userEvent.keyboard("{Enter}");
    await changed;
    assert.deepStrictEqual([...host.session.selection.nodes], ["b"]);
    assert.strictEqual(host.shadowRoot?.getElementById(active ?? "")?.getAttribute("aria-selected"), "true");
    assert.strictEqual(host.shadowRoot?.querySelector("[role=status]")?.textContent, "b");

    assert.strictEqual(getComputedStyle(list).width, "1px", "the list is drawn");
    const pageStyle = document.createElement("style");
    pageStyle.textContent = "graphty-element::part(node-list) { width: 200px; }";
    document.head.appendChild(pageStyle);
    mounted.push(pageStyle);
    assert.strictEqual(getComputedStyle(list).width, "200px", "the page cannot show the list");

    host.accessibleNodeList = false;
    assert.isNull(host.shadowRoot?.querySelector("[role=listbox]"));
});

test("the node list writes only the rows that change: none for a move, one per changed selection", async () => {
    const { host } = await mount({ "aria-label": "Network drawing", "accessible-node-list": "" });
    await addPath(host);
    const list = host.shadowRoot?.querySelector("[role=listbox]");
    assert.exists(list);
    // Every write to the list's rows since the last read, as "type:attribute:row text"; the list's
    // own label and cursor attributes are one write each, whatever the graph's size.
    const seen: MutationRecord[] = [];
    const writes = new MutationObserver((records) => seen.push(...records));
    writes.observe(list, { subtree: true, childList: true, attributes: true, characterData: true });
    const written = (): string[] =>
        [...seen.splice(0), ...writes.takeRecords()]
            .filter((r) => r.type === "childList" || r.target !== list)
            .map((r) => `${r.type}:${r.attributeName ?? ""}:${(r.target as Element).textContent}`);
    const rows = (): string[] =>
        [...list.querySelectorAll("[role=option]")].map((o) => `${o.textContent}=${o.getAttribute("aria-selected")}`);

    let derived = next(host, "project:derived");
    await host.session.positions.set([{ id: "b", x: 5, y: 7, z: 0 }]);
    await derived;
    assert.deepStrictEqual(written(), [], "moving a node rewrote the list");

    let changed = next(host, "selection:changed");
    await host.session.selection.apply({ ids: ["b"] });
    await changed;
    assert.deepStrictEqual(written(), ["attributes:aria-selected:b"]);

    changed = next(host, "selection:changed");
    await host.session.selection.apply({ ids: ["c"] });
    await changed;
    assert.sameMembers(written(), ["attributes:aria-selected:b", "attributes:aria-selected:c"]);

    derived = next(host, "project:derived");
    await host.addNodes([{ id: "d" }]);
    await derived;
    assert.deepStrictEqual(rows(), ["a=false", "b=false", "c=true", "d=false"]);
    assert.lengthOf(
        written().filter((w) => !w.startsWith("childList") && !w.endsWith(":d")),
        0,
        "adding a node rewrote the rows already there",
    );
    writes.disconnect();
});

test("axe finds no violations on a loaded, described graph with its node list", async () => {
    const { host } = await mount({ "aria-label": "Network drawing", "accessible-node-list": "" });
    host.accessibleDescription = ({ nodes, edges }) => `${nodes} nodes, ${edges} edges`;
    await addPath(host);

    const { violations } = await axe.run(host);
    assert.deepStrictEqual(
        violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`),
        [],
    );
});
