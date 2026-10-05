import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
    compareVersions,
    expiredArtifacts,
    PENDING_MS,
    PROPAGATION_MS,
    parseDryRun,
    parseTags,
    releasePending,
    releaseTruth,
    stagedVersions,
} from "../lib/release.mjs";

const fixture = (name) => readFileSync(new URL(`fixtures/release/${name}`, import.meta.url), "utf8");

const T0 = Date.parse("2026-10-03T12:00:00Z");
const MIN = 60_000;
const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const SHA_OLD = "0".repeat(40);

const PACKAGES = [
    { project: "graph-format", dir: "graph-format", name: "@graphty/graph-format" },
    { project: "@graphty/remote-logger", dir: "remote-logger", name: "@graphty/remote-logger" },
];

// `git ls-remote --tags origin`: annotated tags, each with its peeled commit line.
const LS_REMOTE = [
    `${"1".repeat(40)}\trefs/tags/graph-format@1.2.9`,
    `${SHA_OLD}\trefs/tags/graph-format@1.2.9^{}`,
    `${"2".repeat(40)}\trefs/tags/graph-format@1.3.0`,
    `${SHA_A}\trefs/tags/graph-format@1.3.0^{}`,
    `${"3".repeat(40)}\trefs/tags/@graphty/remote-logger@2.0.1`,
    `${SHA_A}\trefs/tags/@graphty/remote-logger@2.0.1^{}`,
    `${SHA_B}\trefs/tags/v-not-a-release`,
].join("\n");

const TAGS = parseTags(LS_REMOTE);
const PUBLISHED = { "@graphty/graph-format": ["1.2.9", "1.3.0"], "@graphty/remote-logger": ["2.0.0", "2.0.1"] };
const ON_MASTER = (sha) => sha !== SHA_B;

/**
 * Release truth over the fixture tags with some overrides.
 * @param {object} o overrides of the input
 * @returns {ReturnType<typeof releaseTruth>} the verdict
 */
const truth = (o) =>
    releaseTruth({
        packages: PACKAGES,
        tags: TAGS,
        registry: PUBLISHED,
        onMaster: ON_MASTER,
        releaseRunning: false,
        now: T0,
        ...o,
    });

describe("parseTags", () => {
    it("reads project, version and the peeled version commit, scoped names included", () => {
        expect(TAGS).toEqual([
            { project: "graph-format", version: "1.2.9", sha: SHA_OLD },
            { project: "graph-format", version: "1.3.0", sha: SHA_A },
            { project: "@graphty/remote-logger", version: "2.0.1", sha: SHA_A },
        ]);
    });

    it("keeps a lightweight tag's own sha", () => {
        expect(parseTags(`${SHA_B}\trefs/tags/layout@1.0.0\n`)).toEqual([
            { project: "layout", version: "1.0.0", sha: SHA_B },
        ]);
    });
});

describe("compareVersions", () => {
    it("orders numerically, pre-releases below their release, build metadata ignored", () => {
        expect(compareVersions("1.10.0", "1.9.9")).toBeGreaterThan(0);
        expect(compareVersions("2.0.0-beta.2", "2.0.0")).toBeLessThan(0);
        expect(compareVersions("2.0.0", "2.0.0-beta.2")).toBeGreaterThan(0);
        expect(compareVersions("2.0.0-beta.10", "2.0.0-beta.2")).toBeGreaterThan(0);
        expect(compareVersions("1.0.0+abc", "1.0.0")).toBe(0);
    });
});

describe("releaseTruth", () => {
    it("is quiet when npm serves every newest tag and master holds the version commit", () => {
        expect(truth({})).toEqual({ incidents: [], propagating: [] });
    });

    it("tag without a version: tagged and landed, npm does not have it", () => {
        const { incidents } = truth({ registry: { ...PUBLISHED, "@graphty/graph-format": ["1.2.9"] } });
        expect(incidents).toEqual([
            {
                key: `release:${SHA_A}`,
                sha: SHA_A,
                reason: "tagged but not on npm: @graphty/graph-format@1.3.0",
                missing: [{ name: "@graphty/graph-format", version: "1.3.0" }],
                unlanded: false,
            },
        ]);
    });

    it("version commit tagged but never landed on master, nothing published: one incident for the commit", () => {
        const { incidents } = truth({
            onMaster: () => false,
            registry: { "@graphty/graph-format": ["1.2.9"], "@graphty/remote-logger": ["2.0.0"] },
        });
        expect(incidents).toHaveLength(1);
        expect(incidents[0].unlanded).toBe(true);
        expect(incidents[0].missing.map((m) => m.version)).toEqual(["1.3.0", "2.0.1"]);
        expect(incidents[0].reason).toBe(
            "version commit aaaaaaaa is tagged but not on master; tagged but not on npm: @graphty/graph-format@1.3.0, @graphty/remote-logger@2.0.1",
        );
    });

    it("version without its commit: published, but master lacks the version commit", () => {
        const { incidents } = truth({ onMaster: () => false });
        expect(incidents).toEqual([
            {
                key: `release:${SHA_A}`,
                sha: SHA_A,
                reason: "version commit aaaaaaaa is tagged but not on master",
                missing: [],
                unlanded: true,
            },
        ]);
    });

    it("a first publish npm refused: the package is not on npm at all", () => {
        const { incidents } = truth({ registry: { ...PUBLISHED, "@graphty/remote-logger": null } });
        expect(incidents[0].reason).toBe(
            "tagged but not on npm: @graphty/remote-logger@2.0.1 (package not on npm at all)",
        );
    });

    it("judges nothing while the release job runs", () => {
        expect(truth({ registry: {}, onMaster: () => false, releaseRunning: true })).toEqual({
            incidents: [],
            propagating: [],
        });
    });

    it("ignores packages with no tag", () => {
        expect(truth({ tags: [] })).toEqual({ incidents: [], propagating: [] });
    });

    describe("a 409 from npm (accepted, still propagating)", () => {
        const staged = stagedVersions(fixture("publish-409.txt"));
        const registry = { ...PUBLISHED, "@graphty/graph-format": ["1.2.9"] };
        const tags = [
            { project: "graph-format", version: "0.2.0", sha: SHA_A },
            { project: "@graphty/remote-logger", version: "2.0.1", sha: SHA_A },
        ];
        const ended = T0 - 3 * MIN;

        it("reads the staged version from the recorded log", () => {
            expect(staged).toEqual(new Set(["@graphty/graph-format@0.2.0"]));
        });

        it("waits, never pages, inside the propagation window", () => {
            expect(truth({ tags, registry, staged, releaseEndedAt: ended })).toEqual({
                incidents: [],
                propagating: [{ name: "@graphty/graph-format", version: "0.2.0", until: ended + PROPAGATION_MS }],
            });
        });

        it("is a release incident once the window has passed", () => {
            const { incidents, propagating } = truth({
                tags,
                registry,
                staged,
                releaseEndedAt: ended,
                now: ended + PROPAGATION_MS,
            });
            expect(propagating).toEqual([]);
            expect(incidents.map((i) => i.reason)).toEqual(["tagged but not on npm: @graphty/graph-format@0.2.0"]);
        });

        it("a 403 over an already published version is no 409, and npm serves it: no incident", () => {
            expect(stagedVersions(fixture("publish-403.txt")).size).toBe(0);
            const tags403 = [{ project: "graph-format", version: "0.7.0", sha: SHA_A }];
            expect(truth({ tags: tags403, registry: { "@graphty/graph-format": ["0.7.0"] } }).incidents).toEqual([]);
        });
    });
});

describe("parseDryRun", () => {
    it("nothing would publish", () => {
        const text = [
            "webgpu-graph-algorithms (no changes were detected using git history and the conventional commits standard)",
            " NX   No files would be changed as a result of running versioning",
            'NOTE: The "dryRun" flag means no changes were made.',
        ].join("\n");
        expect(parseDryRun(text)).toEqual([]);
    });

    it("one bump per project, emoji and repeats included", () => {
        const text = [
            '\u2714 graph-format  Resolved the current version as 1.3.0 from git tag "graph-format@1.3.0"',
            "\u270d\ufe0f graph-format  New version 1.3.1 written to manifest: graph-format/package.json",
            '\u2714 graph-io  Applied semver relative bump "patch", because a dependency was bumped, to get new version 0.3.21',
            "\u270d\ufe0f graph-io  New version 0.3.21 written to manifest: graph-io/package.json",
            "\u270d\ufe0f graph-format  New version 1.3.1 written to manifest: graph-format/package.json",
        ].join("\n");
        expect(parseDryRun(text)).toEqual([
            { dir: "graph-format", version: "1.3.1" },
            { dir: "graph-io", version: "0.3.21" },
        ]);
    });

    it("output that says neither is no answer", () => {
        expect(parseDryRun(" NX   Could not find release group")).toBeNull();
    });
});

describe("releasePending", () => {
    const bumps = [
        { dir: "graph-format", version: "1.3.1" },
        { dir: "graphty", version: "0.9.0" },
    ];
    const pending = (o) =>
        releasePending({ sha: SHA_A, bumps, packages: PACKAGES, registry: PUBLISHED, greenAt: T0, now: T0, ...o });

    it("a quiet day: nothing would publish, no incident", () => {
        expect(pending({ bumps: [], now: T0 + 10 * PENDING_MS })).toEqual({ waiting: [], incident: null });
    });

    it("a bump npm already serves is released", () => {
        expect(pending({ registry: { "@graphty/graph-format": ["1.3.1"] }, now: T0 + PENDING_MS })).toEqual({
            waiting: [],
            incident: null,
        });
    });

    it("waits under two hours, private projects ignored", () => {
        expect(pending({ now: T0 + PENDING_MS - 1 })).toEqual({
            waiting: [{ name: "@graphty/graph-format", version: "1.3.1" }],
            incident: null,
        });
    });

    it("opens a release incident two hours after the lanes went green", () => {
        expect(pending({ now: T0 + PENDING_MS }).incident).toEqual({
            key: `release-pending:${SHA_A}`,
            sha: SHA_A,
            reason: "green 2 h and still not released: @graphty/graph-format@1.3.1",
            missing: [{ name: "@graphty/graph-format", version: "1.3.1" }],
            unlanded: false,
        });
    });
});

describe("expiredArtifacts", () => {
    const deprecation = {
        annotation_level: "warning",
        message:
            "Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4.",
    };

    it("an expired-artifact skip asks for a CI re-run on that commit", () => {
        const notice = {
            annotation_level: "notice",
            message: `${SHA_A} is green but CI run 37105678020 no longer holds its builds; a newer green commit releases`,
        };
        expect(expiredArtifacts([deprecation, notice])).toEqual({ sha: SHA_A, ciRunId: 37105678020 });
    });

    it("the other skips and the warnings need nothing", () => {
        expect(
            expiredArtifacts([
                deprecation,
                { annotation_level: "notice", message: "nothing on master since the last release" },
            ]),
        ).toBeNull();
        expect(
            expiredArtifacts([
                {
                    annotation_level: "notice",
                    message:
                        "no commit since the last release is green on every lane yet; the next lane to finish tries again",
                },
            ]),
        ).toBeNull();
    });
});
