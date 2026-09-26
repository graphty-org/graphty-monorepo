/**
 * What happens to rich props that reach the element before it is defined.
 *
 * React 19 sets a custom-element prop as a PROPERTY only when `name in element` is true at commit
 * time; otherwise it calls `setAttribute(name, String(value))`. When the element module is loaded
 * lazily, React renders before `customElements.define` runs, so `nodeData={[...]}` becomes the
 * attribute `nodedata="[object Object]"`, which the element never reads. The graph comes up empty
 * with no error. The element cannot recover the value, but it can say what happened.
 *
 * A value assigned as a property before the upgrade is a different path: Lit restores it after
 * the upgrade, and that must stay true.
 *
 * Each test defines a fresh subclass under its own tag, because `graphty-element` itself is
 * already defined by the time a test runs.
 */
import { afterEach, assert, test, vi } from "vitest";

import { Graphty } from "../../src/graphty-element";

const mounted: HTMLElement[] = [];
let tagCount = 0;

afterEach(() => {
    for (const el of mounted.splice(0)) {
        el.remove();
    }
    vi.restoreAllMocks();
});

/**
 * Creates an undefined element under a fresh tag, lets `prepare` touch it, then defines the tag.
 * @param prepare - Runs on the element while it is still un-upgraded.
 * @returns The upgraded element.
 */
async function upgradeAfter(prepare: (el: HTMLElement) => void): Promise<Graphty> {
    tagCount += 1;
    const tag = `graphty-upgrade-timing-${tagCount}`;
    const el = document.createElement(tag);
    el.style.width = "400px";
    el.style.height = "300px";
    prepare(el);
    document.body.appendChild(el);
    mounted.push(el);

    customElements.define(tag, class extends Graphty {});
    const upgraded = el as Graphty;
    await upgraded.updateComplete;
    return upgraded;
}

test("an object React wrote as an attribute is reported once, by property name", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const el = await upgradeAfter((node) => {
        node.setAttribute("nodedata", "[object Object]");
    });
    // Reconnecting must not report it again.
    el.remove();
    document.body.appendChild(el);
    await el.updateComplete;

    const reports = error.mock.calls.filter((args) => String(args[0]).includes("[object Object]"));
    assert.strictEqual(reports.length, 1, "exactly one console error");
    assert.include(String(reports[0][0]), "nodeData");
});

test("nodeData assigned as a property before the upgrade still loads", async () => {
    const el = await upgradeAfter((node) => {
        (node as unknown as { nodeData: unknown }).nodeData = [{ id: "a" }, { id: "b" }];
    });

    await vi.waitFor(
        () => {
            assert.strictEqual(el.session.status.counts.nodes, 2);
        },
        { timeout: 5000 },
    );
});
