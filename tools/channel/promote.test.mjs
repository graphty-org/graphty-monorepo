// Tests of production promotion's decisions (promote.mjs): one test per refusal promote.yml makes, the
// moves it plans, config_only, channel: nightly, and production's site configuration.
// Run: node tools/channel/promote.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { decide, packageOf, records, stampCommit, untrusted, withChangesSince } from "./promote.mjs";

const C = "c".repeat(40);
const P = "p".repeat(40);
const SITE = "1".repeat(64);
const CHAN = "2".repeat(64);

const nightly = {
    channel: "nightly",
    commit: C,
    versionCommit: "v".repeat(40),
    versions: { "graphty-element": "3.10.0", "@graphty/remote-logger": "2.0.9" },
    screenshots: "unchanged",
    autosaveFormat: 1,
    siteSha256: SITE,
};
const production = { ...nightly, channel: "production", commit: P, versions: { "graphty-element": "3.9.0" } };

const facts = (over = {}) => ({
    target: "production",
    configOnly: false,
    tag: `site-${C}`,
    nightly,
    hashes: { site: SITE, channel: CHAN },
    store: { siteSha256: SITE, channelSha256: CHAN, verdict: "green-clean" },
    current: production,
    ancestry: "newer",
    publishHoldOpen: false,
    npm: {
        "@graphty/graphty-element": { versions: ["3.9.0", "3.10.0"], distTags: { latest: "3.9.0", next: "3.10.0" } },
        "@graphty/remote-logger": { versions: ["2.0.9"], distTags: { latest: "2.0.9", next: "2.0.9" } },
    },
    ...over,
});

const refusedFor = (f, pattern) => {
    const { refusals } = decide(f);
    assert.ok(
        refusals.some((r) => pattern.test(r)),
        `expected a refusal matching ${pattern}, got ${JSON.stringify(refusals)}`,
    );
};

describe("promote.mjs decide: a promotion that may go", () => {
    it("plans one dist-tag move per package whose latest differs, and nothing else", () => {
        const { refusals, plan } = decide(facts());
        assert.deepEqual(refusals, []);
        assert.equal(plan.distTag, "latest");
        assert.equal(plan.commit, C);
        assert.equal(plan.rollback, false);
        assert.deepEqual(plan.moves, [
            { project: "graphty-element", package: "@graphty/graphty-element", version: "3.10.0", from: "3.9.0" },
        ]);
    });

    it("accepts a green-images nightly the owner approved", () => {
        const approved = { ...nightly, screenshots: `approved:${"a".repeat(40)}` };
        const { refusals } = decide(facts({ nightly: approved, store: { ...facts().store, verdict: "approved" } }));
        assert.deepEqual(refusals, []);
    });

    it("accepts a green-clean nightly that carries an owner-approved baselines tree", () => {
        const approved = { ...nightly, screenshots: `approved:${"b".repeat(40)}` };
        assert.deepEqual(decide(facts({ nightly: approved })).refusals, []);
    });

    it("promotes the first time, with nothing served yet", () => {
        assert.deepEqual(decide(facts({ current: null, ancestry: null })).refusals, []);
    });

    it("is idempotent: a re-run after every tag moved plans no move", () => {
        const npm = facts().npm;
        npm["@graphty/graphty-element"].distTags.latest = "3.10.0";
        const { refusals, plan } = decide(facts({ npm }));
        assert.deepEqual(refusals, []);
        assert.deepEqual(plan.moves, []);
    });

    it("rolls back across no format change, and says it is a rollback", () => {
        const { refusals, plan } = decide(facts({ ancestry: "older" }));
        assert.deepEqual(refusals, []);
        assert.equal(plan.rollback, true);
    });
});

describe("promote.mjs decide: refusals", () => {
    it("refuses a nightly that was not clean or approved", () => {
        refusedFor(facts({ store: { ...facts().store, verdict: "green-images" } }), /not a clean or approved nightly/);
        refusedFor(facts({ store: { ...facts().store, verdict: "red" } }), /verdict red/);
        // green-clean with a screenshots field that is neither "unchanged" nor approved:<tree> is not clean
        refusedFor(facts({ nightly: { ...nightly, screenshots: "approved:x" } }), /not a clean or approved nightly/);
        // approved without a signed baselines tree is not approved
        refusedFor(facts({ store: { ...facts().store, verdict: "approved" } }), /screenshots unchanged/);
    });

    it("refuses a site tarball whose hash differs from the store's (a replaced asset)", () => {
        refusedFor(
            facts({ hashes: { site: "9".repeat(64), channel: CHAN } }),
            /site\.tar\.zst .* has sha256 9{64}, the store recorded 1{64}/,
        );
    });

    it("refuses a channel.json whose hash differs from the store's", () => {
        refusedFor(facts({ hashes: { site: SITE, channel: "8".repeat(64) } }), /channel\.json .* has sha256 8{64}/);
    });

    it("refuses when the store has no record of the nightly", () => {
        refusedFor(facts({ store: null }), /results store has no record/);
    });

    it("refuses a channel.json that is not the tag's nightly record", () => {
        refusedFor(facts({ nightly: { ...nightly, commit: P } }), /not that commit's nightly record/);
        refusedFor(facts({ nightly: { ...nightly, channel: "production" } }), /not that commit's nightly record/);
    });

    it("refuses while a publish hold is open", () => {
        refusedFor(facts({ publishHoldOpen: true }), /"Release held: publish failed" issue is open/);
    });

    it("refuses a version missing on npm", () => {
        const npm = facts().npm;
        npm["@graphty/graphty-element"].versions = ["3.9.0"];
        refusedFor(facts({ npm }), /@graphty\/graphty-element@3\.10\.0 is not on npm/);
    });

    it("refuses a package whose dist-tags could not be read", () => {
        refusedFor(
            facts({ npm: { ...facts().npm, "@graphty/remote-logger": null } }),
            /npm has no @graphty\/remote-logger/,
        );
    });

    it("refuses a rollback across an autosave or project format change", () => {
        const older = { ...nightly, autosaveFormat: 1 };
        refusedFor(
            facts({ nightly: older, current: { ...production, autosaveFormat: 2 }, ancestry: "older" }),
            /crosses an autosave or project format change \(2 to 1\); fix forward/,
        );
    });

    it("lets a forward promotion change the format", () => {
        const { refusals } = decide(facts({ current: { ...production, autosaveFormat: 0 } }));
        assert.deepEqual(refusals, []);
    });

    it("refuses histories that diverged, a bad tag and an unknown channel", () => {
        refusedFor(facts({ ancestry: "diverged" }), /not on one line of master/);
        refusedFor(facts({ tag: "graphty-element@3.10.0" }), /is not a site-<commit> tag/);
        refusedFor(facts({ target: "canary" }), /unknown channel "canary"/);
    });
});

describe("promote.mjs decide: config_only and channel: nightly", () => {
    it("config_only redeploys what production serves, moves no tag, and still checks the hash", () => {
        const served = { ...production, commit: C };
        const f = facts({
            configOnly: true,
            nightly: served,
            current: served,
            ancestry: null,
            npm: {},
            publishHoldOpen: true,
        });
        const { refusals, plan } = decide(f);
        assert.deepEqual(refusals, []);
        assert.deepEqual(plan.moves, []);
        assert.equal(plan.configOnly, true);
        assert.equal(plan.commit, C);
        refusedFor({ ...f, hashes: { site: "9".repeat(64), channel: CHAN } }, /has sha256 9{64}/);
    });

    it("channel: nightly moves next, not latest", () => {
        const npm = facts().npm;
        npm["@graphty/graphty-element"].distTags.next = "3.11.0";
        npm["@graphty/graphty-element"].versions.push("3.11.0");
        const current = { ...nightly, commit: P, versions: { "graphty-element": "3.11.0" } };
        const { refusals, plan } = decide(facts({ target: "nightly", current, ancestry: "older", npm }));
        assert.deepEqual(refusals, []);
        assert.equal(plan.distTag, "next");
        assert.equal(plan.rollback, true);
        assert.deepEqual(plan.moves, [
            { project: "graphty-element", package: "@graphty/graphty-element", version: "3.10.0", from: "3.11.0" },
        ]);
    });
});

describe("promote.mjs helpers", () => {
    it("maps nx projects to npm packages", () => {
        assert.equal(packageOf("graphty-element"), "@graphty/graphty-element");
        assert.equal(packageOf("@graphty/remote-logger"), "@graphty/remote-logger");
        assert.equal(packageOf("babylonjs-map"), "babylonjs-map");
    });

    it("finds the packages npm's trusted publishing refuses this workflow for", async () => {
        const moves = [{ package: "@graphty/a" }, { package: "@graphty/b" }, { package: "c" }];
        const status = { "@graphty/a": 201, "@graphty/b": 404, c: 401 };
        assert.deepEqual(await untrusted(moves, async (m) => status[m.package]), ["@graphty/b (404)", "c (401)"]);
    });

    it("writes deployed.json in the shape deploy.yml checks, and the served channel.json", async () => {
        const { parseDeployed } = await import("./site-deploy.mjs");
        const { plan } = decide(facts());
        const options = { configBlob: "b".repeat(40), configRef: "e".repeat(40), approver: "owner", time: "t" };
        const { deployed, channel } = records(plan, options);
        assert.deepEqual(parseDeployed(JSON.stringify(deployed)), deployed);
        assert.equal(deployed.site, "production");
        assert.equal(deployed.sha256, SITE);
        assert.equal(channel.channel, "production");
        assert.equal(channel.promotedBy, "owner");
        assert.equal(channel.siteConfigBlob, "b".repeat(40));
        // config_only keeps who promoted it and when
        const served = { ...production, commit: C, promotedBy: "earlier", promotedAt: "then" };
        const kept = records(
            decide(facts({ configOnly: true, nightly: served, current: served, ancestry: null })).plan,
            options,
        );
        assert.equal(kept.channel.promotedBy, "earlier");
    });

    it("reads the build stamp", () => {
        assert.equal(stampCommit(`<meta name="graphty-build" content="commit=${C} release=x">`), C);
        assert.equal(stampCommit("<html></html>"), null);
    });

    it("appends the changes since the previous latest once", () => {
        const move = { project: "graphty-element", from: "3.9.0", version: "3.10.0" };
        const once = withChangesSince("notes", move);
        assert.match(
            once,
            /## Changes since 3\.9\.0\n\nhttps:\/\/github.com\/graphty-org\/graphty-monorepo\/compare\/graphty-element@3\.9\.0\.\.\.graphty-element@3\.10\.0/,
        );
        assert.equal(withChangesSince(once, move), once);
        assert.equal(withChangesSince("notes", { ...move, from: null }), "notes");
    });

    it("production's site configuration names production and graphty.app's datasets", () => {
        const site = JSON.parse(readFileSync(new URL("../../graphty/sites/production.json", import.meta.url), "utf8"));
        const nightlySite = JSON.parse(
            readFileSync(new URL("../../graphty/sites/nightly.json", import.meta.url), "utf8"),
        );
        assert.equal(site.site, "production");
        assert.equal(site.datasets, "https://graphty.app/data/graph-samples/v1/");
        assert.deepEqual(Object.keys(site).sort(), Object.keys(nightlySite).sort());
    });
});
