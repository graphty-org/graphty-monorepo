// Runs .claude/workflows/design-studio.js against a stub agent(), so its control flow is checked with
// no model and no browser: the worktree lock, where notes may be written, and the bounded discussion.
//
//   node --test tools/design-studio-workflow.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../.claude/workflows/design-studio.js"), "utf8").replace(
    "export const meta",
    "const meta",
);
const AsyncFunction = (async () => {}).constructor;

const reply = (label, schema, overrides) => {
    for (const [pattern, value] of overrides) if (pattern.test(label)) return value;
    if (/verdict/.test(label)) return { bars_met: false, progressed: true, summary: "x" };
    if (/proposes/.test(label)) return "A proposal.\nASK engineer: does the element report this?";
    if (!schema) return "text";
    const out = {};
    for (const key of schema.required || []) {
        const type = schema.properties[key].type;
        out[key] =
            type === "boolean" ? true : type === "array" ? [] : type === "number" ? 0 : type === "object" ? {} : "x";
    }
    return out;
};

async function run(args, overrides = []) {
    const calls = [];
    const logs = [];
    const agent = async (prompt, opts = {}) => {
        const label = opts.label || "";
        calls.push({ prompt, label });
        return reply(label, opts.schema, overrides);
    };
    const parallel = async (thunks) => Promise.all(thunks.map((t) => t()));
    const pipeline = async (items, ...stages) =>
        Promise.all(
            items.map(async (item, i) => {
                let value = item;
                for (const stage of stages) value = await stage(value, item, i);
                return value;
            }),
        );
    const go = new AsyncFunction("args", "agent", "parallel", "pipeline", "log", "phase", source);
    const result = await go(
        args,
        agent,
        parallel,
        pipeline,
        (m) => logs.push(m),
        () => {},
    );
    return { calls, logs, result, labels: calls.map((c) => c.label) };
}

const round = { tier: 9, startRound: 1, skipPrepare: true, safetyRounds: 2, land: false, landEachPass: false };
const units = [
    [
        /director decides/,
        {
            units: [
                { id: "u1", title: "a", package: "graphty", what: "w", acceptance: "x", files: ["a"] },
                { id: "u2", title: "b", package: "graphty", what: "w", acceptance: "x", files: ["b"] },
            ],
        },
    ],
    [/: u[12] /, { id: "u", done: true, commit: "abc", summary: "s", lessons: "learned" }],
];

test("a held worktree refuses the run before any work", async () => {
    const held = [[/take the worktree lock/, { ok: false, problems: ["tier 5 from round 1"] }]];
    const { labels, logs } = await run(round, held);
    assert.deepEqual(labels, ["preflight", "take the worktree lock"]);
    assert.match(logs.join("\n"), /another run holds/);
});

test("a run releases the lock as its last step", async () => {
    const { labels } = await run(round);
    assert.equal(labels.at(-1), "release the worktree lock");
});

test("parallel engineers do not write notes; one agent writes their lessons after the fixes", async () => {
    const { calls, labels } = await run(round, units);
    const fixes = calls.filter((c) => /: u[12] |: re-walk u/.test(c.label));
    assert.ok(fixes.length >= 2);
    for (const c of fixes) assert.match(c.prompt, /do NOT edit that file/);
    const notes = labels.findIndex((l) => /engineer notes/.test(l));
    assert.ok(notes > labels.findLastIndex((l) => /: u[12] |: re-walk u/.test(l)));
    assert.match(calls[notes].prompt, /u: learned/);
});

test("discussion is off by default", async () => {
    const { labels } = await run(round, units);
    assert.ok(!labels.some((l) => /replies|answers|conflict|without the discussion/.test(l)));
});

test("discussion runs between the red team and the decision, and the decision sees it", async () => {
    const conflict = [
        [
            /find conflicts/,
            {
                conflicts: [
                    { a: "ia", b: "content", question: "q" },
                    { a: "ia", b: "ia", question: "self" },
                ],
            },
        ],
    ];
    const { calls, labels } = await run({ ...round, discuss: true }, [...units, ...conflict]);
    const at = (re) => labels.findIndex((l) => re.test(l));
    assert.ok(at(/proposes/) < at(/Design Engineer answers/));
    assert.ok(at(/Design Engineer answers/) < at(/red team/));
    assert.ok(at(/red team/) < at(/replies/));
    assert.ok(at(/replies/) < at(/find conflicts/));
    assert.equal(labels.filter((l) => /on a conflict/.test(l)).length, 2);
    assert.ok(at(/on a conflict/) < at(/director decides/));
    assert.match(calls[at(/director decides/)].prompt, /DISCUSSION/);
    const shadow = calls[at(/without the discussion/)];
    assert.doesNotMatch(shadow.prompt, /DISCUSSION/);
    assert.match(shadow.prompt, /do NOT edit that file/);
});
