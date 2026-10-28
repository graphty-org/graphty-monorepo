/**
 * @file Which experiments a session switches on, from the ids a consumer passes.
 *
 * The build declares no experiment yet, so the table is replaced here by two rows and one
 * graduated id: what matters is the resolution rule, not today's empty list.
 */

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { featuresFromUrl, resolveFeatures, setDefaultFeatures } from "../../src/features/resolve";
import { createGraphSession } from "../../src/session";

// Hoisted above the imports by vitest, so both modules read this table.

vi.mock("../../src/features/registry", () => ({
    FEATURES: Object.freeze([
        { id: "timeline", plainName: "Timeline", issue: 1, since: "2026-10-24" },
        { id: "location-map", plainName: "Location map", issue: 2, since: "2026-10-24" },
    ]),
    GRADUATED_FEATURES: Object.freeze(["data-management"]),
}));

// These tests are about the page default itself, so each starts from an empty one, also in the On
// configuration, whose setup sets it to ["all"] before every test (test/setup-features-on.ts).
beforeEach(() => {
    setDefaultFeatures([]);
});

describe("resolveFeatures", () => {
    afterEach(() => {
        setDefaultFeatures([]);
    });

    it("switches on declared ids in table order, trimmed and lowercased", () => {
        const resolved = resolveFeatures([" Location-Map ", "timeline", "timeline"]);
        assert.deepEqual(resolved.enabled, ["timeline", "location-map"]);
        assert.deepEqual(resolved.unknown, []);
        assert.isTrue(Object.isFrozen(resolved) && Object.isFrozen(resolved.enabled));
    });

    it("lists unknown ids without throwing and accepts graduated ones silently", () => {
        const resolved = resolveFeatures(["timeline", "warp-drive", "data-management", ""]);
        assert.deepEqual(resolved.enabled, ["timeline"]);
        assert.deepEqual(resolved.unknown, ["warp-drive"]);
    });

    it("skips entries that are not strings instead of throwing", () => {
        const fromUntypedCaller = ["timeline", 7, null] as unknown as string[];
        assert.deepEqual(resolveFeatures(fromUntypedCaller), { enabled: ["timeline"], unknown: [] });
    });

    it("turns on every declared experiment for all", () => {
        assert.deepEqual(resolveFeatures(["all"]).enabled, ["timeline", "location-map"]);
    });

    it("takes the page default only when nothing is requested", () => {
        setDefaultFeatures(["location-map"]);
        assert.deepEqual(resolveFeatures().enabled, ["location-map"]);
        assert.deepEqual(resolveFeatures([]).enabled, []);
    });
});

describe("featuresFromUrl", () => {
    it("reads comma-separated ids, unknown ones included", () => {
        const ids = featuresFromUrl("https://graphty.app/?features=Timeline,%20nope,,timeline");
        assert.deepEqual(ids, ["timeline", "nope"]);
    });

    it("reads another parameter and returns nothing for a URL that does not parse", () => {
        assert.deepEqual(featuresFromUrl(new URL("https://x.test/?exp=timeline"), "exp"), ["timeline"]);
        assert.deepEqual(featuresFromUrl("not a url"), []);
    });
});

describe("createGraphSession({ features })", () => {
    afterEach(() => {
        setDefaultFeatures([]);
    });

    it("settles the session's features once, at creation's first read", () => {
        const session = createGraphSession({ features: ["timeline", "unheard-of"] });
        try {
            assert.deepEqual(session.features.enabled, ["timeline"]);
            assert.deepEqual(session.features.unknown, ["unheard-of"]);
            assert.strictEqual(session.features, session.features);
        } finally {
            session.dispose();
        }
    });

    it("keeps what it settled at creation when the page default or the caller's array changes", () => {
        const asked = ["timeline"];
        const named = createGraphSession({ features: asked });
        const unnamed = createGraphSession();
        try {
            asked.push("location-map");
            setDefaultFeatures(["all"]);
            assert.deepEqual(named.features.enabled, ["timeline"]);
            assert.deepEqual(unnamed.features.enabled, []);
        } finally {
            named.dispose();
            unnamed.dispose();
        }
    });

    it("uses the page default for a session that names none", () => {
        setDefaultFeatures(["all"]);
        const session = createGraphSession();
        try {
            assert.deepEqual(session.features.enabled, ["timeline", "location-map"]);
        } finally {
            session.dispose();
        }
    });
});
