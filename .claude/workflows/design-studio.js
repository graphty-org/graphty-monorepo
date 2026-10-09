export const meta = {
    name: "design-studio",
    description:
        "Graphty design studio: preflight, review and freeze the criteria, freeze and serve a build, pilot and dry-run every task, then rounds of simulated user sessions, expert walkthroughs, screenshot audits, critique and local fixes until the bars hold; then report and land on master",
    whenToUse:
        "Launching or continuing a design studio study tier (or a later round of one) once its criteria, tasks, answer key and roster are written. See .claude/skills/design-studio/SKILL.md for how to prepare a tier and which args to pass.",
    phases: [
        {
            title: "Preflight",
            detail: "check the study materials, tool, worktree and round folders mechanically; stop before anything costly if one fails",
        },
        {
            title: "Prepare",
            detail: "wait for a clean branch, review and freeze the criteria, freeze and serve the build, pilot every task, dry run: fix what the pilots trip over",
        },
        {
            title: "Round",
            detail: "plan, sessions, grading, skeptics, expert walkthroughs, screenshot audit, critique, red team, decisions, fixes, new frozen build and dry run",
        },
        { title: "Report", detail: "summary report and landing on master with the fewest pull requests" },
    ],
};

// ---------------- Parameters (all optional; see the design-studio skill) ----------------
const A = args || {};
const ROOT = A.root || "/home/apowers/Projects/graphty-monorepo";
const ST = A.worktree || ROOT + "/.worktrees/design-studio-tier1";
const BRANCH = A.branch || "design/studio-tier1";
const SD = A.studioDir || ST + "/design/ui/studio";
const TIER = A.tier || 2;
const T = A.studyDir || `${SD}/tier${TIER}`;
const NAME = `tier ${TIER}`;
const SAFETY_ROUNDS = A.safetyRounds || 6;
const START_ROUND = A.startRound || 1;
const SKIP_PREPARE = !!A.skipPrepare;
const MAX_SESSIONS = A.maxSessions || 56;
const SLOTS = A.browserSlots || 4;
const DRY_RUN_PASSES = A.dryRunPasses || 4;
const MAX_DECISIONS = A.maxDecisions || 15;
const USERS = A.users || "returning"; // 'returning' or 'first-time': how participants are framed
const FOCUS = A.focus || `the ${NAME} study described in ${T}/criteria.md`;
const SERVER = A.serverName || `design-studio-tier${TIER}`;
const BUILDS = A.buildsDir || ROOT + "/.study-builds";
const READING = (A.reading || [`${SD}/report.md`]).join(", ");
const LAND = A.land !== false;
const PR_BRANCH_NOTE = A.prNumber ? ` (pull request #${A.prNumber})` : "";

const RULES = `
RULES FOR EVERY AGENT:
- Plain ASCII only (-- not em dashes, straight quotes). American spelling. Write for a stranger: no internal IDs or process narration in documents.
- Work only in the studio worktree ${ST} (branch ${BRANCH}). Never run git stash (not even git stash list), checkout, switch, reset, restore or rebase anywhere: a subagent's permission prompt is never answered and the run hangs. Never touch the main checkout ${ROOT} except reading; never force-push. If a command hangs for a minute, stop it and move on.
- Commits: plain signed git commit that runs the real pre-commit and commit-msg hooks but not the interactive prepare-commit-msg: t=$(mktemp -d); cp -r ${ST}/.husky/. "$t"; rm -f "$t/prepare-commit-msg"; git -c core.hooksPath="$t/_" commit ... (husky's .husky/_/h runs the script one folder ABOVE its own, so copying only .husky/_ silently skips every hook); never --no-verify, HUSKY=0 or core.hooksPath=/dev/null; conventional message; no Co-Authored-By, Claude-Session or "Generated with" lines; stage only your own files (other agents commit in the same worktree).
- Studies run ONLY on the frozen build named on the first line of ${T}/criteria.md (real.mjs serves it with REAL_DIST=<that dir>; see ${SD}/tool/README.md). Never change a frozen build. Browsers only through ${SD}/tool/with-browser.sh (${SLOTS} machine-wide); one browser per agent; always --end a session you started.
- Architecture (${ROOT}/CLAUDE.md "Architectural Principles"): graphty-element owns all graph functionality and returns neutral facts ({ code, params }), never English; the app owns all words, grouping and order; shared UI is fixed in compact-mantine, never with a bespoke control. Never work around an element defect in the app. Node and edge appearance only through style layers. graphty-element offers choices with neutral defaults; consumers make them.
- API changes: additive changes (a new export, method, property, event, error code, attribute, entry point, or a new optional parameter whose default keeps today's behavior) are the team's call -- choose the name and shape, record the reasoning in ${SD}/owner-decisions.md under "decided by the team" and keep going. Only a BREAKING change (removing or renaming anything public, changing what an existing API does or returns, changing a default) goes on ${SD}/owner-decisions.md under "for the owner"; when unsure, treat it as breaking; never block the study on it.
- Generality: a change must serve every user and every domain, not the one persona, dataset or task wording that exposed the problem. No concept the product's model does not have, no domain special case (e.g. currency words because one fixture holds dollars).
- Never mention a review, a device or owner feedback in commits or files. Never dismiss a failure as flaky or as timing: name the mechanism.
`;
const TEAM = {
    director: "Design Director",
    user: "User Advocate",
    researcher: "UX Researcher",
    ia: "Information Architect",
    content: "Content Designer",
    interaction: "Interaction Designer",
    figma: "Figma Product Designer",
    visual: "Visual Designer",
    a11y: "Accessibility Specialist",
    redteam: "Red Team Critic",
    engineer: "Design Engineer",
    ...A.team,
};
for (const r of A.teamRemove || []) if (!["director", "researcher", "redteam", "engineer"].includes(r)) delete TEAM[r];
const ROLES = Object.keys(TEAM);
const asRole = (r) =>
    `You are the graphty design studio's ${TEAM[r]}. YOUR MEMORY: read your notes ${SD}/notes/${r}.md FIRST (create it in the studio's notes format if it does not exist yet: "Top of mind", priorities and values, design criteria, dated decisions with reasons, tried: worked / did not work, thinking, sources) and work from them. Before you return, UPDATE them with new decisions (reasons, evidence), what you tried and whether it worked, and new insights; refresh "Top of mind" (at most 15 bullets, most important first); summarize the file when it passes about 25 KB. Date every entry (YYYY-MM-DD).`;

const EXPERTS =
    A.experts ||
    [
        [
            "figma",
            `an expert walkthrough of every ${NAME} screen and state as a Figma product designer: controls, gestures, popovers, menus, consistency with Figma where Figma solved it (and graphty's own model where graphty differs)`,
        ],
        [
            "visual",
            `an expert walkthrough of every ${NAME} screen as a visual designer: hierarchy, spacing, alignment, typography, color, density, polish`,
        ],
        [
            "a11y",
            `an expert walkthrough of every ${NAME} screen for accessibility: names, roles, focus order and visibility, contrast, announcements (WCAG 2.2 AA)`,
        ],
        [
            "engineer",
            `a screenshot audit: capture every ${NAME} screen and state at 1200x900 and at a narrow 900x700 window, and check every one for truncated or cut-off text, overflow, overlap, inconsistent spacing, wrong or mismatched components (e.g. a bare Mantine control where compact-mantine has one), and patterns that differ between screens`,
        ],
    ].filter(([role]) => TEAM[role]);

// ---------------- Schemas ----------------
const UNITS = {
    type: "object",
    properties: {
        units: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    package: { type: "string" },
                    files: { type: "array", items: { type: "string" } },
                    what: { type: "string" },
                    acceptance: { type: "string" },
                    tasks: { type: "array", items: { type: "string" } },
                },
                required: ["id", "title", "package", "what", "acceptance"],
            },
        },
        insights: { type: "string" },
    },
    required: ["units"],
};
const DONE = {
    type: "object",
    properties: {
        id: { type: "string" },
        done: { type: "boolean" },
        commit: { type: "string" },
        summary: { type: "string" },
        problems: { type: "string" },
    },
    required: ["id", "done", "summary"],
};
const GRADE = {
    type: "object",
    properties: {
        session: { type: "string" },
        task: { type: "string" },
        persona: { type: "string" },
        grade: { type: "string", enum: ["S", "SD", "F", "G", "VOID"] },
        model: { type: "string" },
        false_done: { type: "boolean" },
        truth_on_screen: { type: "boolean" },
        wrong_turns: { type: "number" },
        steps: { type: "number" },
        problems: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    what: { type: "string" },
                    severity: { type: "number" },
                    kind: { type: "string", enum: ["build-defect", "behavior", "wording", "opinion", "accessibility"] },
                    evidence: { type: "string" },
                },
                required: ["what", "severity"],
            },
        },
    },
    required: ["session", "task", "grade", "false_done", "problems"],
};
const PLAN = {
    type: "object",
    properties: {
        sessions: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    task: { type: "string" },
                    persona: { type: "string" },
                    dataset: { type: "string" },
                    start: { type: "string" },
                },
                required: ["id", "task", "persona"],
            },
        },
    },
    required: ["sessions"],
};
const VERDICT = {
    type: "object",
    properties: {
        bars_met: { type: "boolean" },
        progressed: { type: "boolean" },
        needs_owner: { type: "string" },
        summary: { type: "string" },
    },
    required: ["bars_met", "progressed", "summary"],
};
const BUILD = {
    type: "object",
    properties: { sha: { type: "string" }, dir: { type: "string" }, url: { type: "string" }, ok: { type: "boolean" } },
    required: ["ok"],
};
const PILOT = {
    type: "object",
    properties: {
        task: { type: "string" },
        reached: { type: "boolean" },
        mismatches: { type: "array", items: { type: "string" } },
        defects: { type: "array", items: { type: "string" } },
    },
    required: ["task", "reached"],
};
const CHECK = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        problems: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
    },
    required: ["ok", "problems"],
};

// ---------------- Helpers ----------------
// At most SLOTS browser-driving agents alive at once, so no session's clock runs while it waits
// for a browser (sessions that waited 17-50 minutes for a slot were voided).
let alive = 0;
const waiting = [];
async function slot(fn) {
    // A finishing agent hands its slot straight to the next waiter, so a waiter never re-checks.
    if (alive < SLOTS) alive++;
    else await new Promise((r) => waiting.push(r));
    try {
        return await fn();
    } finally {
        const next = waiting.shift();
        if (next) next();
        else alive--;
    }
}

let build = null;

async function freezeBuild(tag, phaseName) {
    return agent(
        `${RULES}\nFreeze a study build "${tag}". In ${ST}: rebuild graphty-element, compact-mantine (if it builds) and graphty (Sentry variables unset). Copy graphty/dist to ${BUILDS}/tier${TIER}-${tag}-<short sha>/ (never overwrite an existing frozen dir). Serve it for the owner through servherd (load the tools with ToolSearch "select:mcp__servherd__servherd_start,mcp__servherd__servherd_info"): name "${SERVER}", protocol https, cwd ${ST}/graphty, command "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} npx vite preview --host 0.0.0.0 --port {{port}} --strictPort --outDir <the frozen dir>", description naming the tier and round. Starting the same name again replaces the previous round's server. Confirm <url>/?next answers 200. Update the first line of ${T}/criteria.md to "The study runs on build <sha> served from <dir>" (record the previous build in the change log). Run REAL_DIST=<dir> node ${SD}/tool/real.mjs --prove and fix the tool only if needed. Commit criteria.md. Return sha, dir, url (with ?next), ok.`,
        { label: `freeze build ${tag}`, phase: phaseName, schema: BUILD },
    );
}

async function pilotAll(tag, phaseName) {
    const ids = await agent(
        `Read ${T}/tasks.md and return every ${NAME} task id with its dataset variants as separate ids (e.g. T17A, T17B).`,
        {
            label: `${tag}: list tasks`,
            phase: phaseName,
            schema: {
                type: "object",
                properties: { ids: { type: "array", items: { type: "string" } } },
                required: ["ids"],
            },
            effort: "low",
        },
    );
    const res = (
        await parallel(
            (ids?.ids || []).map(
                (id) => () =>
                    slot(() =>
                        agent(
                            `${RULES}\nPilot ${NAME} task ${id} on the frozen build (first line of ${T}/criteria.md): read ${SD}/tool/README.md, the task in ${T}/tasks.md and its success path in ${T}/answers.md; walk it with real.mjs (REAL_DIST set; session ${T}/rounds/${tag}/pilot/${id}/), clicking from the task's real start to its end exactly as a participant can (clicks, typing, keys; never by URL), looking at every screenshot, and checking the data stays the task's own data the whole way. Do not change code. Always --end. Return reached, every mismatch between the answer key and the screen, and every defect (anything a participant could trip over), each with its screenshot path.`,
                            { label: `${tag} pilot: ${id}`, phase: phaseName, schema: PILOT },
                        ),
                    ),
            ),
        )
    ).filter(Boolean);
    const fixKey = res.filter((p) => (p.mismatches || []).length);
    if (fixKey.length)
        await agent(
            `${RULES}\n${asRole("researcher")}\nMake ${T}/answers.md (and tasks.md where a prompt is wrong) match the screens exactly for these pilot findings, without changing any bar; log each change in criteria.md's change log; commit:\n${JSON.stringify(fixKey, null, 2)}`,
            { label: `${tag}: fix answer key`, phase: phaseName },
        );
    const unreached = res.filter((p) => !p.reached).map((p) => p.task);
    if (unreached.length) log(`${tag}: pilots could not reach the end of ${unreached.join(", ")}`);
    return res;
}

// Implement units: graph packages first, then compact-mantine, then the app; within a layer, groups
// with disjoint files run in parallel and each group's units run in order.
async function implement(units, tag, phaseName) {
    const order = [
        (u) => /element|layout|algorithms|graph-io|graph-format|graph-samples/.test(u.package),
        (u) => /compact-mantine/.test(u.package),
        () => true,
    ];
    const seen = new Set();
    const out = [];
    for (const test of order) {
        const layer = units.filter((u) => !seen.has(u.id) && test(u));
        layer.forEach((u) => seen.add(u.id));
        const groups = [];
        for (const u of layer) {
            const fs = new Set(u.files || []);
            const g = groups.find((g) => ![...fs].some((x) => g.files.has(x)) && g.items.length < 5);
            if (g && fs.size) {
                g.items.push(u);
                fs.forEach((x) => g.files.add(x));
            } else groups.push({ files: fs, items: [u] });
        }
        const done = await parallel(
            groups.map((g) => async () => {
                const r = [];
                for (const u of g.items)
                    r.push(
                        await agent(
                            `${RULES}\n${asRole("engineer")}\nIMPLEMENT in ${ST}:\n${JSON.stringify(u, null, 2)}\nRead the code first; change the package that owns the problem; add a test that fails without the change; rebuild what you changed and check the acceptance on a fresh local build with real.mjs (REAL_DIST pointing at ${ST}/graphty/dist, session under ${SD}/tmp/${tag}-${u.id}/), looking at every screenshot. If the change would need a BREAKING public API change, record it for the owner in ${SD}/owner-decisions.md and implement the non-breaking part only (or nothing), saying so. Run the affected lint and nearest tests. Commit. Return done, commit, summary and any problem.`,
                            { label: `${tag}: ${u.id} ${u.title || ""}`.slice(0, 80), phase: phaseName, schema: DONE },
                        ),
                    );
                return r;
            }),
        );
        out.push(...done.flat().filter(Boolean));
    }
    const failed = out.filter((d) => !d.done);
    if (failed.length)
        log(`${tag}: ${failed.length} of ${units.length} fixes not done: ${failed.map((d) => d.id).join(", ")}`);
    return out;
}

// The dry run: participants' time goes to learning what users need, never to rediscovering
// implementation flaws. Pilot every task, fix every implementation or polish defect a participant
// would trip over, freeze again and re-pilot, until the pilots come back clean.
async function dryRun(tag, phaseName, pilots) {
    for (let d = 1; d <= DRY_RUN_PASSES; d++) {
        const defects = pilots.flatMap((p) => (p.defects || []).map((x) => `${(p.task || "").slice(0, 12)}: ${x}`));
        if (!defects.length) {
            log(`${tag}: dry run clean`);
            return;
        }
        const triage = await agent(
            `${RULES}\n${asRole("director")}\nDRY RUN before the ${tag} sessions. Piloting every ${NAME} task on the frozen build found the ${defects.length} defects below. The study's sessions must be spent learning what users need, not tripping over implementation flaws. Triage each: (a) an implementation or polish defect a participant could hit -- truncated or clipped text, misalignment, a control that does nothing or gives no feedback, a button enabled when it should not be, focus left behind, typing landing in the wrong field, a wrong or inconsistent component, inconsistent lists, raw internal text on screen, broken values, a missing unit -- FIX IT NOW; (b) an open design question the study exists to answer (where something should live, what users expect, naming a concept users have not seen) -- leave it for the sessions.${A.dryRunExtra ? " " + A.dryRunExtra : ""} Write the triage to ${T}/dry-run-${tag}-${d}.md (every defect, its class, the reason). Return the (a) fixes as units (group related defects into one coherent unit, package that owns it, files, acceptance naming the pilot screenshot), and "insights": two sentences for the owner on what the dry run found.\n\nDEFECTS:\n${defects.join("\n")}`,
            { label: `${tag}: dry run triage ${d}`, phase: phaseName, schema: UNITS, effort: "high" },
        );
        if (triage?.insights) log(`${tag} dry run ${d}: ${triage.insights}`);
        const units = triage?.units || [];
        if (!units.length) {
            log(`${tag}: dry run left only open design questions`);
            return;
        }
        await implement(units, `${tag}-dry${d}`, phaseName);
        build = await freezeBuild(`${tag}d${d}`, phaseName);
        log(`${tag}: dry-run build ${d}: ${build?.url || "not served"} (commit ${build?.sha || "?"})`);
        pilots = await pilotAll(`${tag}d${d}`, phaseName);
    }
    log(
        `${tag}: dry run still finding defects after ${DRY_RUN_PASSES} passes; the sessions go ahead and the leftovers are in ${T}/dry-run-${tag}-*.md`,
    );
}

const commitDocs = (msg, label, phaseName) =>
    agent(
        `${RULES}\nCommit the studio documents (${SD.replace(ST + "/", "")}/ except tmp/) as one signed commit "${msg}". Stage only that directory.`,
        { label, phase: phaseName, effort: "low" },
    );

// ---------------- Preflight ----------------
phase("Preflight");
const pre = await agent(
    `${RULES}\nPREFLIGHT for the ${NAME} design studio run (rounds ${START_ROUND} to at most ${SAFETY_ROUNDS}${SKIP_PREPARE ? ", preparation skipped" : ""}). Check mechanically and change nothing:
1. ${ST} exists, is a git worktree on branch ${BRANCH}, and has no merge in progress.
2. ${T}/criteria.md, ${T}/tasks.md, ${T}/answers.md and ${T}/roster.md exist and are non-empty; criteria.md has bars that decide "done", a stop rule and a change log; every task in tasks.md has a success definition in answers.md; every persona in roster.md points to persona files that exist; every session start (setup file or saved project) the roster or tasks name exists.
3. ${SD}/tool/real.mjs, ${SD}/tool/README.md and ${SD}/tool/with-browser.sh exist; ${SD}/notes/ exists.
4. ${SKIP_PREPARE ? `The first line of ${T}/criteria.md names a frozen build directory that exists, and criteria.md says it is frozen.` : `No frozen-criteria line blocks a review (if criteria.md already says "Frozen", say so: the review will only check it).`}
5. ${T}/rounds/round-${START_ROUND}/sessions/ does not exist or is empty, so no earlier session's raw data is overwritten.
6. The machine has at most ${SLOTS} studio browsers alive (pgrep -fc chrom; list what holds them).
Return ok (all pass), every problem, and a two-line summary.`,
    { label: "preflight", phase: "Preflight", schema: CHECK, effort: "low" },
);
if (!pre || !pre.ok) {
    log(`preflight failed: ${(pre?.problems || ["no answer"]).join("; ")}`);
    return { preflight: pre };
}
if (A.preflightOnly) return { preflight: pre };

// ---------------- Prepare ----------------
if (!SKIP_PREPARE) {
    phase("Prepare");
    await agent(
        `${RULES}\nBefore the ${NAME} study touches ${ST}, make sure the branch is in a clean state: another agent may be merging origin/master into it. Re-check every 2 minutes until git -C ${ST} rev-parse -q --verify MERGE_HEAD fails and git -C ${ST} status shows no conflicts and no uncommitted tracked changes outside ${SD}/tmp. Then report the head sha and whether the branch has an open pull request (gh pr list --head ${BRANCH} --state open; one call). Change nothing.`,
        { label: "wait for a clean branch", phase: "Prepare", effort: "low" },
    );
    const reviews = (
        await parallel(
            ["researcher", "user", "redteam"].map(
                (r) => () =>
                    agent(
                        `${RULES}\n${asRole(r)}\nReview the ${NAME} success criteria ${T}/criteria.md once, before any session, with ${READING} and the tasks, answer key and roster in ${T}/ in mind. The study: ${FOCUS}. Are the bars measurable, right for these ${USERS} users and their work, and complete (including the per-round expert walkthroughs and screenshot audit: what bar do they feed)? Do the tasks avoid naming the controls they need, and does any task's wording echo the words of a fix it re-tests? Do the tasks cover at least two domains' data where a wording is at stake? Give at most 8 concrete changes, each with the reason. Return markdown.`,
                        { label: `criteria review: ${TEAM[r]}`, phase: "Prepare" },
                    ).then((t) => t && `### ${TEAM[r]}\n${t}`),
            ),
        )
    ).filter(Boolean);
    await agent(
        `${RULES}\n${asRole("director")}\nApply the criteria reviews to ${T}/criteria.md: change a bar only with a reason in the change log; make sure the expert walkthroughs and the screenshot audit are scored (e.g. confirmed severity 3-4 findings count against the open-problems bar). Make sure the roster gives each ${USERS === "returning" ? "returning persona a start (a saved project or setup reflecting their earlier sessions; empty only where the task is about starting fresh)" : "persona the start its task names"}, and that the round plan says at most ${SLOTS} participants alive at once, no step cap, one-or-two-sentence step notes, at most ${MAX_SESSIONS} sessions a round, and retry-on-API-error from a clean folder with the model recorded. Then FREEZE: add "Frozen on <date> for the ${NAME} rounds" near the top (keep the build line first). Commit. Return the bars as a short list.\n\nREVIEWS:\n${reviews.join("\n\n")}`,
        { label: "criteria: revise and freeze", phase: "Prepare", effort: "high" },
    );
    build = await freezeBuild(`r${START_ROUND}`, "Prepare");
    log(`${NAME} build for round ${START_ROUND}: ${build?.url || "not served"} (commit ${build?.sha || "?"})`);
    await dryRun(`r${START_ROUND}`, "Prepare", await pilotAll(`r${START_ROUND}`, "Prepare"));
}

// ---------------- Rounds ----------------
const rounds = [];
for (let r = START_ROUND; r <= SAFETY_ROUNDS; r++) {
    const P = `Round ${r}`;
    const RD = `${T}/rounds/round-${r}`;
    phase("Round");
    const reweight =
        r > 1
            ? " Weight sessions toward tasks that missed their bar in round " +
              (r - 1) +
              ` (${T}/rounds/round-${r - 1}/scores.md) and tasks whose path changed, while covering every task. A task that re-tests a fix must not use any word the fix put on screen.`
            : "";
    const plan = await agent(
        `${RULES}\n${asRole("researcher")}\nPlan ${NAME} round ${r} per ${T}/criteria.md (frozen) and ${T}/roster.md, on the frozen build at the top of criteria.md.${reweight} Each session names its start (setup or saved project${USERS === "returning" ? " reflecting the returning user's history" : ""}). At most ${MAX_SESSIONS} sessions. Session ids r${r}-s01... Write ${RD}/plan.md. Return the sessions.`,
        { label: `${P}: plan`, phase: "Round", schema: PLAN, effort: "high" },
    );
    const sessions = (plan?.sessions || []).slice(0, MAX_SESSIONS);
    if ((plan?.sessions || []).length > MAX_SESSIONS)
        log(`${P}: plan had ${plan.sessions.length} sessions; ran the first ${MAX_SESSIONS}`);
    log(`${P}: ${sessions.length} sessions on ${build?.url || "the frozen build"}`);
    const endSession = (s) =>
        agent(
            `Run exactly this command and return its output, nothing else: node ${SD}/tool/real.mjs --end ${RD}/sessions/${s.id}`,
            { label: `${P}: ${s.id} end`, phase: "Round", effort: "low" },
        );
    const participate = async (s) => {
        const who =
            USERS === "returning"
                ? `a RETURNING user of this app. Become this person: read ONLY your persona (find "${s.persona}" in ${T}/roster.md and the persona files it points to) including your history with the app`
                : `a FIRST-TIME user: you have never seen this app. Become this person: read ONLY your persona (find "${s.persona}" in ${T}/roster.md and the persona file it points to)`;
        const dataset = s.dataset ? " (dataset " + s.dataset + ")" : "";
        const prompt = `${RULES}\nYOU ARE A STUDY PARTICIPANT, ${who}, and your task ${s.task}${dataset} in ${T}/tasks.md (only that section). OFF LIMITS: app source, ${T}/answers.md, other tasks or sessions, the designers' notes and all other studio files.\nUse the app only through ${SD}/tool/real.mjs with REAL_DIST set to the frozen build named on the first line of ${T}/criteria.md (read only that first line): --start ${RD}/sessions/${s.id} ${s.start || "<the task's start>"}, then --step one action at a time, LOOKING at each new screenshot before deciding the next action (you may point at a spot on the last screenshot with --click-at). Before each step, say in one or two sentences, in character, what you see and what you will try next. Stop when you are done, would give up, or keep repeating without progress (no step limit), then --end.\nWrite ${RD}/sessions/${s.id}/transcript.md as you go (append after every step, so nothing is lost if the session stops): your per-step notes, every command, and at the end in character: did you finish, how easy or difficult it was from 1 (very difficult) to 7 (very easy), what confused you. Return the transcript path.`;
        const attempts = [
            [prompt, { label: `${P}: ${s.id} ${s.task} ${s.persona}`.slice(0, 80), phase: "Round" }],
            [
                prompt +
                    `\n\n(A previous attempt ended early. Start a fresh session folder ${RD}/sessions/${s.id}/ -- delete what is there first.)`,
                { label: `${P}: ${s.id} retry`, phase: "Round" },
            ],
            [
                prompt +
                    `\n\n(Two previous attempts ended early. Start a fresh folder ${RD}/sessions/${s.id}/ -- delete what is there first -- and write "Participant model: sonnet" at the top of the transcript.)`,
                { label: `${P}: ${s.id} sonnet`, phase: "Round", model: "sonnet" },
            ],
        ];
        for (const [p, o] of attempts) {
            const t = await agent(p, o);
            await endSession(s); // a stopped agent must never keep its browser
            if (t) return t;
        }
        return null;
    };
    const both = await parallel([
        () =>
            pipeline(
                sessions,
                (s) => slot(() => participate(s)),
                (t, s) =>
                    t
                        ? agent(
                              `${RULES}\nGrade ${NAME} session ${s.id} (task ${s.task}, persona ${s.persona}) strictly by ${T}/criteria.md and the task's success definition in ${T}/answers.md, from the LAST screenshot and any saved files in ${RD}/sessions/${s.id}/ (downloads/ included), never from the participant's own rating. Record the participant model (sonnet if the transcript says so). VOID only if the tool or the run failed (say why). Count steps and wrong turns against the success path; record a false "done" whenever the participant claims done while the screen shows otherwise (truth_on_screen if the screen itself said so). List each problem with severity 0-4, kind and evidence (step and screenshot). A build defect you can reproduce with a scripted real.mjs path (under ${RD}/repro/${s.id}/, through the browser gate) is marked build-defect with the repro. Write ${RD}/sessions/${s.id}/grade.md.`,
                              { label: `${P}: grade ${s.id}`, phase: "Round", schema: GRADE },
                          )
                        : {
                              session: s.id,
                              task: s.task,
                              persona: s.persona,
                              grade: "VOID",
                              false_done: false,
                              problems: [{ what: "all three attempts ended without a transcript", severity: 0 }],
                          },
            ),
        () =>
            parallel(
                EXPERTS.map(
                    ([role, what]) =>
                        () =>
                            slot(() =>
                                agent(
                                    `${RULES}\n${asRole(role)}\nRound ${r}: do ${what}, on the frozen build (REAL_DIST from the first line of ${T}/criteria.md), driving it with real.mjs (sessions under ${RD}/expert/${role}/; always --end), looking at every screenshot. Report each finding with severity 0-4, the screen, the evidence (screenshot path) and the package that owns it. Write ${RD}/expert/${role}.md and return the findings as markdown.`,
                                    { label: `${P}: expert ${TEAM[role]}`, phase: "Round" },
                                ),
                            ),
                ),
            ),
    ]);
    const grades = (both[0] || []).filter(Boolean);
    const voids = grades.filter((g) => g.grade === "VOID").length;
    if (voids) log(`${P}: ${voids} void sessions (see their grade.md for why)`);
    await agent(
        `${RULES}\n${asRole("researcher")}\nScore ${NAME} round ${r}: every bar in ${T}/criteria.md, per task and dataset, from these grades ${JSON.stringify(grades)} and the expert and audit findings in ${RD}/expert/. Count sessions run on sonnet separately. Confirmed problems (two participants, a reproduced defect, or an expert finding the audit or a session also shows), candidate insights with evidence. Write ${RD}/scores.md.`,
        { label: `${P}: score`, phase: "Round", effort: "high" },
    );
    const sk = (
        await parallel(
            [1, 2].map(
                (k) => () =>
                    agent(
                        `${RULES}\nSkeptic ${k}, ${NAME} round ${r}: try to REFUTE each confirmed problem and insight in ${RD}/scores.md from the transcripts, screenshots and expert evidence -- real, or an artifact of the tool, the simulated participant, the task wording or the grader? Default to "not shown" when thin. Return keep / weaken / drop per item with the reason.`,
                        { label: `${P}: skeptic ${k}`, phase: "Round" },
                    ),
            ),
        )
    ).filter(Boolean);
    const insights = await agent(
        `${RULES}\n${asRole("researcher")}\nApply the skeptics' verdicts (two drops = dropped, one = weakened) and write ${RD}/insights.md, most severe first. Return the five most important verified insights in two or three plain sentences each, for the owner, with one screenshot path each.\n\n${sk.join("\n\n---\n\n")}`,
        { label: `${P}: verified insights`, phase: "Round" },
    );
    log(`${NAME} round ${r} insights:\n${(insights || "").slice(0, 1500)}`);
    const previous = r > 1 ? ", and round " + (r - 1) + "'s scores" : "";
    const verdict = await agent(
        `${RULES}\nRead ${T}/criteria.md (bars, when the studio stops) and ${RD}/scores.md and insights.md${previous}. Do all the bars hold? Did this round make progress over the last (more tasks at their bar, fewer severe problems)? Does any problem need a one-way-door decision from the owner (a BREAKING published API change, or a product decision the design does not settle)? Return bars_met, progressed, needs_owner (empty if none) and a short summary with numbers.`,
        { label: `${P}: verdict`, phase: "Round", schema: VERDICT },
    );
    rounds.push({ round: r, sessions: sessions.length, voids, build: build?.sha, verdict });
    log(`${NAME} round ${r}: bars ${verdict?.bars_met ? "MET" : "not met"}; ${(verdict?.summary || "").slice(0, 300)}`);
    let stop = "";
    if (verdict?.bars_met) stop = "bars met";
    else if (r > START_ROUND && verdict && !verdict.progressed) stop = `no progress over round ${r - 1}`;
    else if (verdict?.needs_owner) stop = `needs an owner decision: ${verdict.needs_owner}`;
    else if (r === SAFETY_ROUNDS) stop = `reached the ${SAFETY_ROUNDS}-round safety cap without meeting the bars`;
    if (stop) {
        await parallel(
            ROLES.map(
                (x) => () =>
                    agent(
                        `${RULES}\n${asRole(x)}\n${NAME} round ${r} is closed and the studio stops (${stop}): read ${RD}/insights.md. Update your notes with what this round taught you. Return your new "Top of mind".`,
                        { label: `${P}: notes ${TEAM[x]}`, phase: "Round", effort: "low" },
                    ),
            ),
        );
        await commitDocs(
            `docs(workspace): ${NAME} round ${r} results and studio notes`,
            `${P}: commit documents`,
            "Round",
        );
        log(`${NAME} stops after round ${r}: ${stop}`);
        break;
    }

    const proposals = (
        await parallel(
            ROLES.filter((x) => x !== "director" && x !== "redteam").map(
                (x) => () =>
                    agent(
                        `${RULES}\n${asRole(x)}\n${NAME} studio critique after round ${r}: read ${RD}/insights.md, ${RD}/scores.md and ${RD}/expert/, look at the cited screenshots, and propose the smallest changes that fix the verified problems for every user (not just the persona or dataset that showed it), each with reason, evidence, risk, files; say what NOT to change; challenge anything in the insights you think is wrong. Under 800 words.`,
                        { label: `${P}: ${TEAM[x]} proposes`, phase: "Round" },
                    ).then((t) => t && `### ${TEAM[x]}\n${t}`),
            ),
        )
    ).filter(Boolean);
    const challenge = await agent(
        `${RULES}\n${asRole("redteam")}\nAttack these ${NAME} proposals: clutter, notices instead of fixes, app workarounds of element defects, divergence from Figma without need (or copying Figma where graphty's own model differs), persona- or domain-specific features, fixes that only echo a task's words, fixes that miss the verified problem. Sharper alternatives. Under 700 words.\n\n${proposals.join("\n\n")}`,
        { label: `${P}: red team`, phase: "Round" },
    );
    const decided = await agent(
        `${RULES}\n${asRole("director")}\nDecide the changes for ${NAME} round ${r + 1} from ${RD}/insights.md, the proposals and the red team below; at most ${MAX_DECISIONS}, severity first, each one coherent fix with its package, files, acceptance and the tasks it touches. Before taking a change, check it for generality: it must not add a concept the product's model lacks, serve one domain or persona, or be justified only by a re-test that reuses its own words; give a failing change its general form or drop it with the reason. Reject the rest with reasons. Answer-key or task-wording changes use package "tasks-or-answers" and must not change a bar. Write ${RD}/decisions.md. Also return "insights": two or three sentences for the owner on what this round decided and why.\n\nPROPOSALS:\n${proposals.join("\n\n")}\n\nRED TEAM:\n${challenge || ""}`,
        { label: `${P}: director decides`, phase: "Round", schema: UNITS, effort: "high" },
    );
    if (decided?.insights) log(`${NAME} round ${r} decisions: ${decided.insights}`);
    const words = (decided?.units || []).filter((u) => u.package === "tasks-or-answers");
    if (words.length)
        await agent(
            `${RULES}\n${asRole("researcher")}\nApply to ${T}/tasks.md and answers.md without changing any bar; log in criteria.md; commit:\n${JSON.stringify(words, null, 2)}`,
            { label: `${P}: tasks and answers`, phase: "Round" },
        );
    await implement(
        (decided?.units || []).filter((u) => u.package !== "tasks-or-answers"),
        `t${TIER}r${r}`,
        "Round",
    );
    build = await freezeBuild(`r${r + 1}`, "Round");
    log(
        `${NAME} build for round ${r + 1}: ${build?.url || "not served"} (commit ${build?.sha || "?"}); pilot screenshots in ${T}/rounds/r${r + 1}/pilot/`,
    );
    await dryRun(`r${r + 1}`, "Round", await pilotAll(`r${r + 1}`, "Round"));
    await parallel(
        ROLES.map(
            (x) => () =>
                agent(
                    `${RULES}\n${asRole(x)}\n${NAME} round ${r} is closed: read ${RD}/insights.md and decisions.md. Update your notes: what this round taught you, what was decided and why, what to watch in round ${r + 1}. Return your new "Top of mind".`,
                    { label: `${P}: notes ${TEAM[x]}`, phase: "Round", effort: "low" },
                ),
        ),
    );
    await commitDocs(`docs(workspace): ${NAME} round ${r} results and studio notes`, `${P}: commit documents`, "Round");
}

// ---------------- Report and landing ----------------
phase("Report");
const report = await agent(
    `${RULES}\n${asRole("director")}\nWrite the ${NAME} report at ${T}/report.md for the owner (a reader who did not watch): what was tested (builds and their commits, tasks, participants, rounds, sessions including void and sonnet ones, expert walkthroughs and audits; what a simulated participant can and cannot tell us); results per round against the frozen bars (a table per round); what was learned, most important first, with evidence; what was changed (by package) and whether the next round confirmed it; what was deferred and why; the decisions waiting on the owner (only BREAKING API changes and one-way doors, from ${SD}/owner-decisions.md); next steps. Under about 20 KB. Update your notes. Return the report's summary and next steps as markdown.`,
    { label: `${NAME} report`, phase: "Report", effort: "high" },
);
await commitDocs(`docs(workspace): the ${NAME} report and studio notes`, "commit report", "Report");
let landing = null;
if (LAND)
    landing = await agent(
        `${RULES}\nLand ${BRANCH}${PR_BRANCH_NOTE} on master with the fewest pull requests (fewer screenshot conflicts, less testing, faster release). Use the branch's open pull request (gh pr list --head ${BRANCH} --state open), or open one (ready, not draft) if none exists. GitHub API budget is shared by every session: one call per question, poll no faster than every 5 minutes, read status from ${ROOT}/tmp/pr-status/status.json when it is fresh.
1. git fetch origin; merge origin/master into the branch (merge, never rebase); resolve conflicts keeping both sides; regenerate graphty-element API reports; pnpm install --frozen-lockfile; build; lint and default tests of graphty-element, compact-mantine, graphty; commit.
2. Push via ${ROOT}/tmp/push-queue.sh git push origin HEAD:${BRANCH} (never --no-verify, never force). Never push while the pull request is labeled queued.
3. Update the pull request body (gh api -X PATCH repos/graphty-org/graphty-monorepo/pulls/<n> -F body=@<file>) for a stranger: grouped contents, tests, screenshots expected to change by package, and a decision table of ONLY the BREAKING API changes (additive ones listed as decided by the team, one line each). Labels: if no breaking change is undecided, remove hold and needs-decision and add queue:next so Mergify merges it once CI and the screenshot approvals pass; otherwise keep hold and needs-decision.
4. Watch CI to green; fix failures this branch causes (name the mechanism of each). Then run ${ROOT}/tools/visual-preview.sh <pr> so screenshots can be reviewed early.
Return the pull request URL, labels, CI status, the review page URL (servherd_info "visual-review") per changed project, and the breaking decisions still open.`,
        { label: "land on master", phase: "Report", effort: "high" },
    );
return { rounds, report, landing };
