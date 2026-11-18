/**
 * @file The timeline graduated: it is no experiment, so `session.time` works with no features
 * named, and an old link or call that still names `timeline` is accepted and changes nothing.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { FEATURES, GRADUATED_FEATURES } from "../../src/features/registry";
import { featuresFromUrl } from "../../src/features/resolve";

const CSV = "source,target,sent\nA,B,2026-01-01\nB,C,2026-01-02\nC,D,2026-01-03\n";

describe("the graduated timeline", () => {
    it("is listed as graduated, not as an experiment", () => {
        assert.include(GRADUATED_FEATURES, "timeline");
        assert.notInclude(
            FEATURES.map(({ id }) => id as string),
            "timeline",
        );
    });

    it("accepts ?features=timeline silently, switching nothing on", () => {
        const session = createGraphSession({ features: featuresFromUrl("https://x.test/?features=timeline") });
        try {
            assert.deepEqual(session.features.enabled, []);
            assert.deepEqual(session.features.unknown, []);
        } finally {
            session.dispose();
        }
    });

    it("designates a time field and windows it with no features named", async () => {
        const session = createGraphSession({ features: [] });
        try {
            await session.data.import({ type: "csv", config: { data: CSV } });
            await session.time.setField({ edges: { start: "sent" } });
            assert.isNotNull(session.time.field);
            assert.isNotNull(session.time.extent());
        } finally {
            session.dispose();
        }
    });
});
