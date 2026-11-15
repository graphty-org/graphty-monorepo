/**
 * Properties a page assigns to `<graphty-element>` before the tag is defined (issue #3313).
 *
 * A page that creates the tag before the element's module has loaded can assign properties to it
 * already: they land on the plain HTMLElement as own properties. Once the tag is defined, every
 * one of them must reach the element's setter, in time for the element's start (autosave reads its
 * options in the task after connecting), so a consumer never has to wait for the definition.
 *
 * Each test defines a fresh subclass under its own tag, because `graphty-element` itself is
 * already defined by the time a test runs.
 */
import { afterEach, assert, describe, it, vi } from "vitest";

import type { AutosaveAvailable } from "../../src/autosave/types";
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
 * Creates an undefined element under a fresh tag, assigns `props` to it, adds it to the page and
 * then defines the tag.
 * @param props - Own properties to assign before the definition.
 * @returns The upgraded element.
 */
async function upgradeAfter(props: Record<string, unknown>): Promise<Graphty> {
    tagCount += 1;
    const tag = `graphty-props-before-define-${tagCount}`;
    const el = document.createElement(tag);
    el.style.display = "block";
    el.style.width = "300px";
    el.style.height = "200px";
    Object.assign(el, props);
    document.body.appendChild(el);
    mounted.push(el);

    customElements.define(tag, class extends Graphty {});
    const upgraded = el as Graphty;
    await upgraded.updateComplete;
    return upgraded;
}

describe("object properties assigned before the tag is defined", () => {
    it("every one reaches the element", async () => {
        const layoutConfig = { seed: 42 };
        const layoutBehavior = { rendering: { onDemand: true } };
        const xr = { enabled: true, ui: { enabled: false } };
        const autosaveOptions = { restore: "manual" as const, persist: false };
        const selectionStyle = { color: "#ff0000" };
        const fitInsets = { top: 10, right: 20, bottom: 30, left: 40 };
        const el = await upgradeAfter({
            layout: "ngraph",
            layoutConfig,
            layoutBehavior,
            xr,
            autosaveOptions,
            selectionStyle,
            fitInsets,
        });

        assert.strictEqual(el.layout, "ngraph");
        assert.strictEqual(el.layoutConfig?.seed, 42, "layoutConfig");
        assert.deepEqual(el.layoutBehavior?.rendering, layoutBehavior.rendering, "layoutBehavior");
        assert.strictEqual(el.xr?.enabled, true, "xr");
        assert.strictEqual(el.autosaveOptions.restore, "manual", "autosaveOptions");
        assert.isNotNull(el.selectionStyle, "selectionStyle");
        assert.strictEqual(el.fitInsets.left, 40, "fitInsets");
        for (const name of Object.keys(el)) {
            assert.notInclude(
                ["layoutConfig", "layoutBehavior", "xr", "autosaveOptions", "selectionStyle", "fitInsets"],
                name,
                "no own property is left shadowing the element's accessor",
            );
        }
    });

    it("rows assigned before the definition load", async () => {
        const el = await upgradeAfter({
            layout: "fixed",
            nodeData: [{ id: "a" }, { id: "b" }],
            edgeData: [{ source: "a", target: "b" }],
        });

        await vi.waitFor(() => {
            assert.strictEqual(el.session.data.snapshot().nodeCount, 2);
            assert.strictEqual(el.session.data.snapshot().edgeCount, 1);
        });
    });
});

describe("autosave set up before the tag is defined", () => {
    /**
     * Leaves a dirty autosave entry under `key`, as a page that was closed with unsaved work.
     * @param key - The autosave key.
     */
    async function leaveWork(key: string): Promise<void> {
        const first = document.createElement("graphty-element");
        first.setAttribute("autosave", key);
        first.layout = "fixed";
        first.style.display = "block";
        first.style.width = "300px";
        first.style.height = "200px";
        document.body.appendChild(first);
        await first.autosaver.ready;
        await first.session.data.addNodes([{ id: "old-1" }, { id: "old-2" }, { id: "old-3" }]);
        await first.autosaver.flush();
        first.remove();
    }

    it("restore: manual set before the definition keeps the page's own load", async () => {
        const key = `test.props-before-define.${crypto.randomUUID()}`;
        await leaveWork(key);

        const el = await upgradeAfter({
            layout: "fixed",
            autosave: key,
            autosaveOptions: { restore: "manual" },
        });
        const restored = await el.autosaver.ready;
        assert.isNull(restored, "nothing is reopened when the page asked for manual restore");
        assert.strictEqual(el.session.data.snapshot().nodeCount, 0);
    });

    it("a load asked for while the restore is pending is not overwritten by the restore", async () => {
        const key = `test.props-before-define.${crypto.randomUUID()}`;
        await leaveWork(key);

        const el = document.createElement("graphty-element");
        el.setAttribute("autosave", key);
        el.layout = "fixed";
        el.style.display = "block";
        el.style.width = "300px";
        el.style.height = "200px";
        document.body.appendChild(el);
        mounted.push(el);
        const offered: AutosaveAvailable[] = [];
        el.addEventListener("graphty-autosave-available", (event) => offered.push(event.detail));
        // The page asks for a graph of its own before the element has read its autosave entries.
        const json = JSON.stringify({ nodes: [{ id: "new-1" }, { id: "new-2" }], edges: [] });
        const load = el.session.data.import({ config: { file: new File([json], "newer.json") } });
        const restored = await el.autosaver.ready;
        await load;

        assert.isNull(restored, "the restore does not open over the newer load");
        assert.strictEqual(el.session.data.snapshot().nodeCount, 2, "the newer load is what the graph holds");
        assert.deepEqual(
            offered.map((each) => each.reason),
            ["page-data-changed"],
            "the kept work is offered instead",
        );
        const entries = await el.autosaver.list();
        assert.isTrue(
            entries.some((entry) => entry.id === offered[0].entry.id && entry.nodes === 3),
            "the kept work is still there to restore",
        );
    });
});
