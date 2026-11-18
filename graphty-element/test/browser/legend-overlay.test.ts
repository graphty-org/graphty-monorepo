/**
 * `<graphty-element legend>` draws a legend over the graph from `session.styles.legend()` (issue
 * #292): off by default, it follows a layer change and hides when no layer binds a value.
 */
import "../../src/graphty-element";

import { afterEach, assert, test } from "vitest";

import type { Graphty } from "../../index.js";

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const el of mounted.splice(0)) {
        el.remove();
    }
});

/**
 * Mounts an element with the given attributes.
 * @param attributes - Attributes set before it is connected.
 * @returns The host.
 */
async function mount(attributes: Record<string, string> = {}): Promise<Graphty> {
    const host = document.createElement("graphty-element");
    host.setAttribute("style", "width: 400px; height: 300px;");
    for (const [name, value] of Object.entries(attributes)) {
        host.setAttribute(name, value);
    }

    document.body.appendChild(host);
    mounted.push(host);
    await host.updateComplete;
    return host;
}

/**
 * Resolves on the session's next `project:derived`; called before the write that causes it.
 * @param host - The element.
 * @returns A promise of that event.
 */
function derived(host: Graphty): Promise<void> {
    return new Promise((resolve) => {
        const stop = host.session.on("project:derived", () => {
            stop();
            resolve();
        });
    });
}

/**
 * The legend part in the shadow root.
 * @param host - The element.
 * @returns It, or null while the legend is off.
 */
function legendOf(host: Graphty): HTMLElement | null {
    return host.shadowRoot?.querySelector<HTMLElement>("[part=legend]") ?? null;
}

test("the legend is off by default", async () => {
    const host = await mount();
    assert.isFalse(host.legend);
    assert.isNull(legendOf(host));
});

test("a layer change updates the legend, and with no bound layer it is hidden", async () => {
    const host = await mount({ legend: "", "legend-position": "bottom-right" });
    let next = derived(host);
    await host.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await next;

    const legend = legendOf(host);
    assert.exists(legend);
    assert.isTrue(legend?.hidden, "no layer binds a value");
    assert.strictEqual(legend?.dataset.position, "bottom-right");
    assert.isNull(legend?.getAttribute("aria-label"), "no name unless the page gives one");
    host.setAttribute("legend-label", "Leyenda");
    await host.updateComplete;
    assert.strictEqual(legend?.getAttribute("aria-label"), "Leyenda");
    host.removeAttribute("legend-label");
    await host.updateComplete;
    assert.isNull(legend?.getAttribute("aria-label"));

    next = derived(host);
    const layer = await host.session.styles.encode({
        column: { kind: "node", name: "id" },
        channel: "node.color",
        name: "Ids",
    });
    await next;
    assert.isFalse(legend?.hidden, "the layer's block is drawn");
    assert.sameMembers(
        [...(legend?.querySelectorAll("li") ?? [])].map((row) => row.textContent),
        ["a", "b", "c"],
    );

    next = derived(host);
    await host.session.styles.remove(layer.id);
    await next;
    assert.isTrue(legend?.hidden, "removing the only bound layer hides the legend");

    host.legend = false;
    assert.isNull(legendOf(host));
});
