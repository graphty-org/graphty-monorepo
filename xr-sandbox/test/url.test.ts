import { describe, expect, it } from "vitest";

import { buildSteps } from "../src/core/steps";
import { mixUrl, parseParams, resolvePreset } from "../src/core/url";
import { PRESETS } from "../src/presets";
import { TECHNIQUES } from "../src/techniques";

const known = TECHNIQUES.map((t) => t.id);

describe("url", () => {
    it("adds and removes techniques and overrides settings", () => {
        const p = parseParams(
            "?preset=baseline&on=voice,nope&off=wrist-menu&s.framework.labels=false&graph=dense&n=99999",
        );
        const r = resolvePreset(PRESETS, p, known);
        expect(r.techniques).toEqual(["voice", "node-menus", "hover-tag", "visible-undo"]);
        expect(r.settings["framework.labels"]).toBe("false");
        expect(r.graph).toBe("dense");
        expect(p.n).toBe(2000);
    });

    it("falls back to baseline for an unknown preset", () => {
        expect(resolvePreset(PRESETS, parseParams("?preset=missing"), known).preset.id).toBe("baseline");
    });

    it("writes a URL that reproduces a mix", () => {
        const base = PRESETS.find((p) => p.id === "baseline");
        if (!base) {
            throw new Error("no baseline");
        }
        const url = mixUrl(base, ["hover-tag", "node-menus", "visible-undo", "voice"], { "framework.labels": false });
        const r = resolvePreset(PRESETS, parseParams(url), known);
        expect(r.techniques).toEqual(["voice", "node-menus", "hover-tag", "visible-undo"]);
    });

    it("every preset names only registered techniques", () => {
        for (const p of PRESETS) {
            expect(p.techniques.filter((t) => !known.includes(t))).toEqual([]);
        }
    });
});

describe("steps", () => {
    it("gives the same journey for the same seed", () => {
        const facts = {
            names: ["A", "B", "C", "D", "E", "F", "G", "H"],
            pagerankOrder: [3, 1, 0, 2, 4, 5, 6, 7],
            pagerank: Float64Array.from([0.3, 0.2, 0.1, 0.4, 0.05, 0.04, 0.03, 0.02]),
            resultNames: ["PageRank"],
        };
        expect(buildSteps("journey", 5, facts)).toEqual(buildSteps("journey", 5, facts));
        expect(buildSteps("journey", 5, facts)).toHaveLength(10);
    });

    it("notes a family the keep step leaves visible", () => {
        const facts = {
            names: ["A", "B", "C", "D", "E", "F", "G", "H"],
            pagerankOrder: [3, 1, 0, 2, 4, 5, 6, 7],
            pagerank: Float64Array.from([0.3, 0.2, 0.1, 0.4, 0.05, 0.04, 0.03, 0.02]),
            resultNames: ["PageRank"],
        };
        for (let seed = 0; seed < 200; seed++) {
            const steps = buildSteps("journey", seed, facts);
            const threshold = Number(/at least ([\d.]+)/.exec(steps[6].text)?.[1]);
            const name = /note on the (.+)$/.exec(steps[7].text)?.[1] ?? "";
            expect(facts.pagerank[facts.names.indexOf(name)]).toBeGreaterThanOrEqual(threshold);
        }
    });
});
