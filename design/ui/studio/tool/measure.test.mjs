// node --test design/ui/studio/tool/measure.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { LAUNCH, openWork, workUnread } from "./measure.mjs";

test("the open work keeps a step's whole rule and names a run by its algorithm", () => {
    const rule = { kind: "range", attribute: "data.weight", min: 5, nodes: "endpoints", edges: "keep" };
    globalThis.document = {
        querySelector: () => ({
            session: {
                runs: { list: () => [{ id: "pagerank", algorithm: "pagerank", label: "Influence" }] },
                catalog: { algorithms: () => [{ key: "pagerank", plainName: "Influence", technicalName: "PageRank" }] },
                styles: { list: () => [] },
                notes: { list: () => [] },
                visibility: { steps: [{ id: "step-1", on: false, rule }] },
                data: { sources: () => [] },
            },
        }),
    };
    const work = openWork();
    delete globalThis.document;
    assert.deepEqual(work.steps, [`step-1 off ${JSON.stringify(rule)}`]);
    assert.deepEqual(work.runs, ["pagerank PageRank (label Influence)"]);
});

test("a work list that read nothing is named, and an app with no graph at the start is not", () => {
    const list = { runs: [], layers: ["everything Everything"], notes: [], steps: [], sources: ["sources"] };
    const none = { runs: [], layers: [], notes: [], steps: [], sources: [] };
    assert.equal(workUnread(list, list, true), null);
    assert.equal(workUnread(null, list, false), null);
    assert.equal(workUnread(null, null, false), null);
    assert.match(workUnread(null, list, true), /holds nothing/);
    assert.match(workUnread(none, list, true), /holds nothing/);
    assert.equal(workUnread({ error: "no page" }, list, false), "no page");
    assert.equal(workUnread(list, { error: "page closed" }, true), "page closed");
});

test("every browser the tools launch draws scrollbars, and reports quote names at one length", () => {
    assert.deepEqual(LAUNCH.ignoreDefaultArgs, ["--hide-scrollbars"]);
    for (const f of ["real.mjs", "bars.mjs"]) {
        const src = readFileSync(new URL(f, import.meta.url), "utf8");
        assert.equal(src.match(/chromium\.launch\(\)/g), null, `${f} launches without LAUNCH`);
    }
    const real = readFileSync(new URL("real.mjs", import.meta.url), "utf8");
    assert.equal(real.match(/slice\(0, (40|50)\)/g), null, "real.mjs cuts a name at its own length");
});
