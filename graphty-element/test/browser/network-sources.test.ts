/**
 * @file Network sources on `<graphty-element>`: the design's page (a third party's 15-line source
 * named by `data-source`), `element.loadFromSource`, and the element's credential store answering
 * a load that is given no credential.
 */

import "../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import { credentials, defineSource, type Graphty, registerSource, replayFetch } from "../../index.js";
import peopleRecordings from "../../stories/fixtures/sources/people.json";

/** The recordings answer every fetch of a test; the page's own fetch is put back afterwards. */
const realFetch = globalThis.fetch;
let replay = replayFetch(peopleRecordings);

beforeAll(() => {
    globalThis.fetch = (input, init) => replay(input, init);
});

afterAll(() => {
    globalThis.fetch = realFetch;
});

// The source of the design's page (section 4.5): an absolute URL, no endpoint, no bundler.
registerSource(
    defineSource({
        id: "people-page",
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string; name: string; knows: string[] }[]>(
                `https://people.example.com/api/people?team=${encodeURIComponent(params.team)}`,
            );
            return { nodes: rows, edges: rows.flatMap((r) => r.knows.map((k) => ({ source: r.id, target: k }))) };
        },
    }),
);

// One that needs a credential.
registerSource(
    defineSource({
        id: "people-page-locked",
        descriptor: { plainName: "People", authRequired: "required", params: [] },
        async records(params: { team: string }, ctx) {
            const rows = await ctx.fetchJson<{ id: string }[]>(`/api/people?team=${encodeURIComponent(params.team)}`);
            return { nodes: rows.map((r) => ({ id: r.id })) };
        },
    }),
);

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }

    replay = replayFetch(peopleRecordings);
});

/**
 * An element connected with attributes set the way a page writes them.
 * @param attributes - The attributes.
 * @returns The element, once its first update has run.
 */
async function page(attributes: Record<string, string> = {}): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value);
    }

    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    return element;
}

/**
 * Settle once the element's graph holds `count` nodes, on the history change that put them there.
 * @param element - The element.
 * @param count - The node count to wait for.
 * @returns Settles when it does.
 */
function nodesArrive(element: Graphty, count: number): Promise<void> {
    const { session } = element;
    if (session.data.nodes().length === count) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const off = session.on("history:changed", () => {
            if (session.data.nodes().length === count) {
                off();
                resolve();
            }
        });
    });
}

describe("network sources on the element", () => {
    it("loads the design's page: data-source names a registered source, data-source-config its params", async () => {
        const element = await page({ "data-source": "people-page", "data-source-config": '{"team":"core"}' });
        await nodesArrive(element, 8);
        assert.strictEqual(element.session.data.edges().length, 13);
        assert.strictEqual(element.session.data.source()?.type, "source:people-page");
        assert.strictEqual(replay.calls.length, 1);
        assert.strictEqual(element.session.data.loads()[0].source, "people-page");
    });

    it("names a source explicitly with source:<id>", async () => {
        const element = await page({ "data-source": "source:people-page", "data-source-config": '{"team":"core"}' });
        await nodesArrive(element, 8);
        assert.strictEqual(element.session.data.loads().length, 1);
    });

    it("loads with element.loadFromSource and hands back the load's key", async () => {
        const element = await page();
        const { key } = await element.loadFromSource("people-page", { team: "core" });
        assert.strictEqual(element.session.data.nodes().length, 8);
        assert.strictEqual(element.session.data.loads()[0].key, key);
    });

    it("answers a load given no credential from element.credentials, by source and origin", async () => {
        const element = await page();
        const endpoint = "https://people.example.com";
        await element.credentials.remember({ source: "people-page-locked", endpoint }, credentials.bearer("t-123"));
        await element.loadFromSource("people-page-locked", { team: "core" }, { endpoint });
        assert.isTrue(replay.calls[0].credential, "the remembered credential was sent");
        assert.deepEqual(element.session.data.loads()[0].credential, { kind: "bearer", origin: endpoint });
        await element.credentials.forgetAll();
    });
});
