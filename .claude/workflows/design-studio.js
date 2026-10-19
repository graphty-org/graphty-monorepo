export const meta = {
    name: "design-studio",
    description:
        "Graphty design studio: preflight, review and freeze the criteria, freeze and serve a build, pilot and dry-run every task, then rounds of simulated user sessions, expert walkthroughs, screenshot audits, critique and local fixes until the bars hold; then report and get the branch ready to land on master",
    whenToUse:
        "Launching or continuing a design studio study tier (or a later round of one) once its criteria, tasks, answer key and roster are written. See .claude/skills/design-studio/SKILL.md for how to prepare a tier and which args to pass.",
    phases: [
        {
            title: "Preflight",
            detail: "check the study materials, tool, worktree and round folders mechanically; stop before anything costly if one fails",
        },
        {
            title: "Prepare",
            detail: "wait for a clean branch, review and freeze the criteria, freeze and serve the build, pilot every task, dry run: triage against the binding decisions, fix shared parts, re-walk each fix, land each pass, until the exit test passes",
        },
        {
            title: "Round",
            detail: "plan, sessions, grading, skeptics, expert walkthroughs, screenshot audit, critique, red team, decisions, fixes, new frozen build and dry run",
        },
        {
            title: "Report",
            detail: "summary report, then the branch is made ready to land on master through golden-local",
        },
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
// Never above 4: in tier 2 round 1 more than four sessions ran at once (load about 158) and clicks timed out.
const SLOTS = Math.min(A.browserSlots || 4, 4);
const DRY_RUN_PASSES = A.dryRunPasses || 4;
const MAX_DECISIONS = A.maxDecisions || 15;
const USERS = A.users || "returning"; // 'returning' or 'first-time': how participants are framed
const FOCUS = A.focus || `the ${NAME} study described in ${T}/criteria.md`;
const SERVER = A.serverName || `design-studio-tier${TIER}`;
const BUILDS = A.buildsDir || ROOT + "/.study-builds";
const READING = (A.reading || [`${SD}/report.md`]).join(", ");
const LAND = A.land !== false;
// Land every fix pass on master (golden-local): tier 3's 526 fix commits stayed on the studio branch,
// so no CI, SonarQube or screenshot review ever saw them and no consumer got them.
const LAND_EACH_PASS = A.landEachPass !== false;
// The tier's binding decisions: every triage reads and cites it. Tier 3 flip-flopped three behaviors
// across triages (a disabled "+" as a Tab stop, Escape in the inspector, an unfinished card's count).
const DECIDED = `${T}/decided.md`;
// Cosmetic defects wait here, fixed in batches with tests, outside the freeze loop.
const BACKLOG = `${T}/backlog.md`;
// Fix groups the targeted re-walk rejected (reverted), for the next triage.
const REJECTED = `${T}/rejected-fixes.md`;

const RULES = `
RULES FOR EVERY AGENT:
- Plain ASCII only (-- not em dashes, straight quotes). American spelling. Write for a stranger: no internal IDs or process narration in documents.
- Work only in the studio worktree ${ST} (branch ${BRANCH}). Never run git stash (not even git stash list), checkout, switch, reset, restore or rebase anywhere: a subagent's permission prompt is never answered and the run hangs. Never touch the main checkout ${ROOT} except reading; never force-push. If a command hangs for a minute, stop it and move on.
- Commits: plain signed git commit that runs the real pre-commit and commit-msg hooks but not the interactive prepare-commit-msg: t=${ST}/tmp/<your task>/hooks; rm -rf "$t"; mkdir -p "$t"; cp -r ${ST}/.husky/. "$t"; rm -f "$t/prepare-commit-msg"; git -c core.hooksPath="$t/_" commit ... (never mktemp into /tmp: the newest /tmp/tmp.* is often another process's file) (husky's .husky/_/h runs the script one folder ABOVE its own, so copying only .husky/_ silently skips every hook); never --no-verify, HUSKY=0 or core.hooksPath=/dev/null; conventional message; no Co-Authored-By, Claude-Session or "Generated with" lines; stage only your own files (other agents commit in the same worktree).
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
                    // the shared component a repeated defect is fixed in, once
                    shared: { type: "string" },
                    // the task routes and controls the change touches, for the targeted re-walk
                    routes: { type: "array", items: { type: "string" } },
                },
                required: ["id", "title", "package", "what", "acceptance"],
            },
        },
        insights: { type: "string" },
        counts: {
            type: "object",
            properties: {
                fix_now: { type: "number" },
                blocking: { type: "number" },
                regressions: { type: "number" },
                repeats: { type: "number" },
                instances: { type: "number" },
                reversals: { type: "number" },
                cosmetic: { type: "number" },
            },
        },
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
                    followup: { type: "string" },
                },
                required: ["id", "task", "persona"],
            },
        },
        dist: { type: "string" },
    },
    required: ["sessions", "dist"],
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
        detours: { type: "array", items: { type: "string" } },
        keyboard: { type: "boolean" },
        mismatches: { type: "array", items: { type: "string" } },
        defects: { type: "array", items: { type: "string" } },
        skipped: { type: "array", items: { type: "string" } },
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
// for a browser (sessions that waited 17-50 minutes for a slot were voided). EVERY agent that may
// drive a browser takes a slot here: participants, graders (they reproduce with real.mjs), experts,
// pilots, engineers checking a fix, build freezes (--prove) and the tool dry run. Never nest slot().
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
    return slot(() =>
        agent(
            `${RULES}\nFreeze a study build "${tag}". FIRST, a build no commit reproduces is invalid (tier 3 pass 2's fixes were committed only after pass 3 piloted them): if git -C ${ST} status shows any uncommitted source change outside tmp/, it is a finished fix pass's work -- commit it (stage only those files) before building, and freeze HEAD. In ${ST}: rebuild graphty-element, compact-mantine (if it builds) and graphty (Sentry variables unset). Copy graphty/dist to ${BUILDS}/tier${TIER}-${tag}-<short sha>/ (never overwrite an existing frozen dir). Serve it for the owner through servherd (load the tools with ToolSearch "select:mcp__servherd__servherd_start,mcp__servherd__servherd_info"): name "${SERVER}", protocol https, cwd ${ST}/graphty, command "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} npx vite preview --host 0.0.0.0 --port {{port}} --strictPort --outDir <the frozen dir>", description naming the tier and round. Starting the same name again replaces the previous round's server. Confirm <url>/?next answers 200. Update the first line of ${T}/criteria.md to "The study runs on build <sha> served from <dir>" (record the previous build in the change log). Run REAL_DIST=<dir> node ${SD}/tool/real.mjs --prove and fix the tool only if needed. Commit criteria.md. Return sha, dir, url (with ?next), ok.`,
            { label: `freeze build ${tag}`, phase: phaseName, schema: BUILD },
        ),
    );
}

// The dry run walks more than the answer key's route. In tier 2 round 1 it walked only the success
// paths, and participants who took the commonest detours met build defects there (edge color under
// an open run's layer written to Everything, the selection halo tinting a node's own color, focus
// falling to the page after Add or Delete step, Enter not committing a step edit). So each pilot
// walks the success path, the task's commonest detours, and the success path again by keyboard.
// prevRound: the previous round's folder, whose wrong turns name the detours (none before round 1).
// sameAs: the previous pass's pilot tag; later passes walk the same detours, so passes compare.
// A pass is complete only when every task and route was walked: tier 3 pilots skipped tasks when no
// browser slot was free, and a skipped route reads as a clean one.
async function pilotAll(tag, phaseName, prevRound, sameAs) {
    const pastTurns = prevRound
        ? "the wrong turns participants took on this task in " +
          prevRound +
          " (insights.md, scores.md, the session transcripts) and "
        : "";
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
    const idList = ids?.ids || [];
    const detours = (id) =>
        sameAs
            ? `walk exactly the detours ${T}/rounds/${sameAs}/pilot/${id}/report.md walked (the detour set is held fixed across passes so their counts compare; walk a new one only where that report has none)`
            : `${pastTurns}what a person would try first if they did not know the success path (another panel, the search box, a right-click, a menu, the toolbar, styling from where they are, opening a file from the start screen)`;
    const pilot = (id, k) =>
        slot(() =>
            agent(
                `${RULES}\nPilot ${NAME} task ${id} on the frozen build (first line of ${T}/criteria.md): read ${SD}/tool/README.md, the task in ${T}/tasks.md, its success path in ${T}/answers.md and the binding decisions in ${DECIDED}; walk it with real.mjs (REAL_DIST set; sessions under ${T}/rounds/${tag}/pilot/${id}/), always from the task's real start, exactly as a participant can (clicks, typing, keys; never by URL), looking at every screenshot, and checking the data stays the task's own data the whole way. Walk it THREE ways, each its own session: (1) the success path by pointer; (2) the task's two or three commonest DETOURS, each walked as far as a participant would take it -- ${detours(id)}; (3) the success path again by KEYBOARD only (Tab, Shift+Tab, Enter, Space, Escape, arrows), recording each focused control's screen-reader name and every place focus falls to the page body. In every field you open, press Enter, Tab and Escape and check each does what a person expects (where ${DECIDED} settles a behavior, check against it and do not report the decided behavior as a defect). A dry run that passes on the answer key's route is necessary but not sufficient. Walk EVERY route: no free browser slot is a reason to wait for with-browser.sh, never to skip; list anything you did not walk in "skipped". Do not change code. Always --end. Write ${T}/rounds/${tag}/pilot/${id}/report.md (every route walked, what happened, screenshot paths). Return reached, the detours walked, keyboard (true if the keyboard walk reached the end), skipped, every mismatch between the answer key and the screen (from the success path), and every defect on ANY of the three walks (anything a participant could trip over, including focus lost, a missing or duplicate name, a key that does nothing), each with its route and screenshot path.${k ? " (An earlier attempt left routes unwalked: walk all of them now.)" : ""}`,
                { label: `${tag} pilot: ${id}${k ? " again" : ""}`, phase: phaseName, schema: PILOT },
            ),
        );
    const res = await parallel(idList.map((id) => () => pilot(id, 0)));
    const incomplete = (i) => !res[i] || (res[i].skipped || []).length > 0;
    for (let k = 1; k <= 2; k++) {
        const redo = idList.map((id, i) => i).filter(incomplete);
        if (!redo.length) break;
        const again = await parallel(redo.map((i) => () => pilot(idList[i], k)));
        redo.forEach((i, j) => {
            if (again[j]) res[i] = again[j];
        });
    }
    // An unwalked route is a defect of the pass, so the pass can never read as clean.
    idList.forEach((id, i) => {
        if (!incomplete(i)) return;
        const left = res[i] ? res[i].skipped.join("; ") : "every route";
        log(`${tag}: pass incomplete: ${id} not walked: ${left}`);
        res[i] = {
            ...(res[i] || { task: id, reached: false }),
            defects: [...((res[i] || {}).defects || []), `PASS INCOMPLETE: not walked: ${left}`],
        };
    });
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
// with disjoint files run in parallel and each group's units run in order. After each group, a
// targeted re-walk of only the routes its diff touches rejects (reverts) a group that regresses:
// in tier 3, 28% to 41% of each pass's fix list were regressions of the previous pass's fixes, found
// only by the next full pass.
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
                        await slot(() =>
                            agent(
                                `${RULES}\n${asRole("engineer")}\nIMPLEMENT in ${ST}:\n${JSON.stringify(u, null, 2)}\nRead the code first; change the package that owns the problem. If the unit names a shared component ("shared"), fix it there (compact-mantine or the shared app part) with a test in that component, never with a patch on one screen, and check every screen that uses it. Follow the binding decisions in ${DECIDED}. Add a test that fails without the change; rebuild what you changed and check the acceptance on a fresh local build with real.mjs (REAL_DIST pointing at ${ST}/graphty/dist, session under ${SD}/tmp/${tag}-${u.id}/), looking at every screenshot. If the change would need a BREAKING public API change, record it for the owner in ${SD}/owner-decisions.md and implement the non-breaking part only (or nothing), saying so. Run the affected lint and nearest tests. Commit. Return done, commit, summary and any problem.`,
                                {
                                    label: `${tag}: ${u.id} ${u.title || ""}`.slice(0, 80),
                                    phase: phaseName,
                                    schema: DONE,
                                },
                            ),
                        ),
                    );
                const fixed = r.filter((d) => d && d.done && d.commit);
                if (!fixed.length) return r;
                const ids = g.items.map((u) => u.id).join(", ");
                const chk = await slot(() =>
                    agent(
                        `${RULES}\n${asRole("engineer")}\nTARGETED RE-WALK of fix group ${ids} before any freeze. Commits: ${fixed.map((d) => d.commit).join(" ")}. Read each commit's diff (git show), rebuild ${ST}/graphty/dist if it is older than these commits, then walk with real.mjs (REAL_DIST=${ST}/graphty/dist, sessions under ${SD}/tmp/${tag}-recheck-${g.items[0].id}/) ONLY the routes these diffs touch: the units' routes ${JSON.stringify(g.items.map((u) => u.routes || u.tasks || []))} and every screen that renders a changed component, pressing Enter, Escape, Tab and Shift+Tab on every changed control and checking each against ${DECIDED}. Look at every screenshot; always --end. Change nothing. Return ok (true only if nothing these diffs touch got worse and each unit's acceptance holds) and every regression with its route and screenshot path.`,
                        { label: `${tag}: re-walk ${ids}`.slice(0, 80), phase: phaseName, schema: CHECK },
                    ),
                );
                if (chk && !chk.ok) {
                    log(
                        `${tag}: fix group ${ids} rejected by its re-walk: ${(chk.problems || []).join("; ").slice(0, 400)}`,
                    );
                    await agent(
                        `${RULES}\nThe targeted re-walk rejected fix group ${ids}. In ${ST}, git revert --no-edit these commits, newest first, each as a signed commit through the hooks copy: ${fixed
                            .map((d) => d.commit)
                            .reverse()
                            .join(
                                " ",
                            )}. Then append to ${REJECTED} the group, its units and these regressions, so the next triage refixes it in the shared part: ${JSON.stringify(chk.problems || [])}. Commit that file. Return the revert commits.`,
                        { label: `${tag}: revert ${ids}`.slice(0, 80), phase: phaseName, effort: "low" },
                    );
                    fixed.forEach((d) => {
                        d.done = false;
                        d.problems = "rejected by the targeted re-walk";
                    });
                }
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

// Land a finished fix pass on master through golden-local. Agents may not push, so the workflow
// prepares the branch, logs "ready to land", and waits until the launching session's land.mjs run
// has put the commit on origin/golden.
async function landPass(label, phaseName, always) {
    if (!LAND_EACH_PASS && !always) return;
    const r = await agent(
        `${RULES}\nPrepare ${BRANCH} to land after ${label}. In ${ST}: (1) commit any finished work still uncommitted outside tmp/ (stage only those files); (2) git fetch origin; git merge origin/master (merge, never rebase); resolve conflicts keeping both sides; pnpm install --frozen-lockfile if the lockfile changed; (3) build, regenerate the graphty-element API reports (npm run api:report in graphty-element) and commit them if they changed, lint graphty-element, compact-mantine and graphty, and fix what this branch breaks; commit. Never push and never run tools/land.mjs. Return the head sha, ok (the tree is clean outside tmp/ and lint passes), and breaking: every commit since origin/master marked breaking (a "!" or a BREAKING CHANGE footer) and every breaking change in the API report diff.`,
        {
            label: `${label}: prepare to land`,
            phase: phaseName,
            schema: {
                type: "object",
                properties: {
                    sha: { type: "string" },
                    ok: { type: "boolean" },
                    breaking: { type: "array", items: { type: "string" } },
                },
                required: ["ok"],
            },
        },
    );
    if (!r?.sha || !r.ok) {
        log(`${label}: could not prepare ${BRANCH} to land (${r?.sha || "no head"}); the studio goes on unlanded`);
        return;
    }
    // A breaking commit lands only with the owner's go (CLAUDE.md, "Landing changes (golden-local)").
    const owner = (r.breaking || []).length
        ? ` It holds BREAKING changes, which land only with the owner's go: ${r.breaking.join("; ")}.`
        : "";
    log(
        `ready to land: ${BRANCH} at ${r.sha} (${label}). Run node ${ROOT}/tools/land.mjs land ${BRANCH} in the background; the studio waits until origin/golden holds that commit.${owner}`,
    );
    await agent(
        `Wait, changing nothing, until commit ${r.sha} is on origin/golden. Start this as ONE background command (run_in_background; never a foreground wait) and end your turn until its exit notice: until git -C ${ST} fetch -q origin golden && git -C ${ST} merge-base --is-ancestor ${r.sha} origin/golden; do sleep 300; done. Then return "landed ${r.sha}".`,
        { label: `${label}: wait for landing`, phase: phaseName, effort: "low" },
    );
    log(`${label}: ${BRANCH} at ${r.sha} landed on golden`);
}

// The dry run: participants' time goes to learning what users need, never to rediscovering
// implementation flaws. Pilot every task, fix what blocks or confuses a participant, re-walk what
// each fix touched, land, freeze again and re-pilot. Tier 3's four passes went 344, 217, 151 and 129
// "fix now" rows, and half or more of each list were fix failures (regressions, repeats, more
// instances of one shared part), so each pass is judged by an exit test, not by "no defects left".
// Returns { stop } when the studio must not go on to sessions.
async function dryRun(tag, phaseName, pilots, prevRound) {
    let pilotTag = tag;
    for (let d = 1; d <= DRY_RUN_PASSES; d++) {
        const defects = pilots.flatMap((p) => (p.defects || []).map((x) => `${(p.task || "").slice(0, 12)}: ${x}`));
        if (!defects.length) {
            log(`${tag}: dry run clean`);
            return {};
        }
        const triage = await agent(
            `${RULES}\n${asRole("director")}\nDRY RUN pass ${d} before the ${tag} sessions. Piloting every ${NAME} task on the frozen build (success path, commonest detours, and by keyboard) found the ${defects.length} defects below. The study's sessions must be spent learning what users need, not tripping over implementation flaws.
FIRST read ${DECIDED}, the tier's BINDING DECISIONS (each a behavior -- what Enter, Escape or Tab does on a control, whether a disabled control is a Tab stop, what a count shows mid-edit -- with its date, reason and evidence; create it with a one-line header if missing), every earlier triage ${T}/dry-run-*.md, ${REJECTED} if it exists, and git log of the previous pass's fix commits.
Classify every defect into exactly one class:
(n) DECIDED -- it asks for something other than a decided behavior: no change, cite the entry. A decision is reversed only by a NEW entry in decided.md naming the entry it reverses, the new evidence and the reason; count it under reversals.
(a) FIX NOW -- BLOCKING (the participant cannot finish the task) or CONFUSING (the participant would go wrong or doubt the result) on a task's path: a control that does nothing or gives no feedback, a button enabled when it should not be, focus left behind or falling to the page, a key (Enter, Escape, Tab) that does nothing where a person expects it to, a missing or duplicate screen-reader name, typing landing in the wrong field, broken values, raw internal text on screen, a missing unit, a defect met on a detour, a pass left incomplete.
(c) COSMETIC -- does not block or confuse (spacing, alignment, a clipped label whose meaning still reads, an inconsistent but working component): append it to ${BACKLOG}; it is fixed later in batches with tests, never in this loop.
(b) DESIGN QUESTION the study exists to answer (where something should live, what users expect, naming a concept users have not seen): leave it for the sessions.
For every (a) defect record its origin: new; regression (caused by the previous pass's fixes); repeat (an earlier triage already sent the same problem to fix); instance (another screen showing a defect of a shared part already seen on another screen or in another pass). Every behavior this triage settles goes into decided.md as an entry, and the units cite it.${A.dryRunExtra ? " " + A.dryRunExtra : ""}
Group the (a) defects into units, one coherent fix each, with the package that owns it, files, acceptance naming the pilot screenshot, and "routes": the task routes and controls the change touches, for the targeted re-walk. A defect seen on two screens or in two passes (regression, repeat or instance) is ONE unit fixed once in the shared component (compact-mantine or the shared app part), named in "shared", with a test there -- never one patch per screen.
Write the triage to ${T}/dry-run-${tag}-${d}.md (every defect, its class, its origin, the decided.md entry it cites, the reason). Return the units; counts { fix_now, blocking, regressions, repeats, instances } over the (a) defects, plus reversals (new decided.md entries that reverse one) and cosmetic (rows sent to the backlog); and "insights": two sentences for the owner on what the dry run found.\n\nDEFECTS:\n${defects.join("\n")}`,
            { label: `${tag}: dry run triage ${d}`, phase: phaseName, schema: UNITS, effort: "high" },
        );
        if (triage?.insights) log(`${tag} dry run ${d}: ${triage.insights}`);
        // The pilot reports, the triage, the decisions and the backlog are evidence: commit them now.
        await commitDocs(
            `docs(workspace): ${NAME} ${tag} dry run ${d} triage and pilot reports`,
            `${tag}: commit triage ${d}`,
            phaseName,
        );
        const units = triage?.units || [];
        const c = triage?.counts || {};
        const fixNow = c.fix_now ?? units.length;
        const regressions = c.regressions || 0;
        log(
            `${tag} dry run ${d}: ${fixNow} fix now (${c.blocking || 0} blocking), ${regressions} regressions, ${c.repeats || 0} repeats, ${c.instances || 0} more instances of a shared part, ${c.reversals || 0} reversed decisions, ${c.cosmetic || 0} to the backlog`,
        );
        if (!units.length) {
            log(`${tag}: dry run left only open design questions, decided behaviors and cosmetic backlog`);
            return {};
        }
        // Exit test: nothing blocks, few fixes break earlier fixes, and the decisions held.
        const converged = !c.blocking && !c.reversals && regressions < 0.1 * fixNow;
        // Still about 40% regressions: more full passes only churn; fix the shared parts first.
        const churning = d > 1 && regressions >= 0.4 * fixNow;
        const todo = churning ? units.filter((u) => u.shared) : units;
        await implement(todo, `${tag}-dry${d}`, phaseName);
        await landPass(`${tag} dry run ${d}`, phaseName);
        build = await freezeBuild(`${tag}d${d}`, phaseName);
        log(`${tag}: dry-run build ${d}: ${build?.url || "not served"} (commit ${build?.sha || "?"})`);
        if (churning) {
            const stop = `dry run ${d} of ${tag} was still ${Math.round((100 * regressions) / fixNow)}% regressions of earlier fixes; ${todo.length} shared-part fixes went in, and the shared parts need fixing before another full pass`;
            log(`${tag}: ${stop}`);
            return { stop };
        }
        if (converged) {
            log(
                `${tag}: dry run ${d} passed the exit test (no blocking row, regressions under 10%, no reversed decision); the sessions go ahead`,
            );
            return {};
        }
        pilots = await pilotAll(`${tag}d${d}`, phaseName, prevRound, pilotTag);
        pilotTag = `${tag}d${d}`;
    }
    log(
        `${tag}: dry run still finding defects after ${DRY_RUN_PASSES} passes; the sessions go ahead and the leftovers are in ${T}/dry-run-${tag}-*.md`,
    );
    return {};
}

// The study TOOL gets its own dry run before every round's sessions. In tier 2 round 1 the tool
// reached participants more often than the build did: more than four sessions alive at once, a
// matcher that took the first partial match, a synthetic file drop the app ignored, a void session
// never re-run, follow-ups never sent, a participant reading facilitator files -- and the scripts
// that four bars are scored by did not exist, so those bars could not hold whatever happened.
const TOOL_CHECK = (
    RD,
) => `Check mechanically, on the frozen build, before any session (read ${SD}/tool/README.md first):
1. The browser gate: start six sessions at once through ${SD}/tool/with-browser.sh; a one-second poll never shows more than ${SLOTS} studio browsers alive; the gate refuses BROWSER_SLOTS above 4; every session is ended afterwards.
2. The matcher: a click on a name that matches more than one control is refused with the candidate list, never resolved to the first match.
3. File drop: a file dropped on the start screen opens in the app (a real file chooser or setInputFiles, not synthetic events); where the tool cannot deliver it, it prints that the drop was not delivered.
4. The tool walks each task's commonest detours (the dry-run reports under ${T}/rounds/*/pilot/) without a tool error.
5. Participants cannot reach facilitator files: \`node ${SD}/tool/real.mjs --brief ${RD}/sessions/<id>\` for one planned session prints a briefing outside the studio's files (under ${ST}/tmp/studio-sessions/) holding only that participant's persona, history, prompt and start command: no answer key, facilitator notes, follow-up prompt, avoided-words list or criteria; \`--start ${RD}/sessions/<id>\` is refused; and the --prove checks "a participant transcript that opens tasks.md voids the session, by name" and "an end copies the session into the round's folder" pass.
6. Every bar in ${T}/criteria.md that is scored by a script (or a check, count or lister) names a script that EXISTS, FAILS on a planted failure of its own, and runs on the frozen build. A script that reads zero items fails.`;
async function toolDryRun(tag, RD, phaseName) {
    for (let k = 1; k <= 2; k++) {
        const c = await slot(() =>
            agent(
                `${RULES}
TOOL DRY RUN ${k} before the ${NAME} ${tag} sessions. ${TOOL_CHECK(RD)}
Change nothing. Write ${RD}/tool-dry-run-${k}.md. Return ok (all pass), every problem, and a summary.`,
                {
                    label: `${tag}: tool dry run ${k}`,
                    phase: phaseName,
                    schema: CHECK,
                },
            ),
        );
        if (c?.ok) return true;
        log(`${tag}: tool dry run ${k} found: ${(c?.problems || ["no answer"]).join("; ")}`);
        if (k === 2) return false;
        await implement(
            [
                {
                    id: `${tag}-tool`,
                    title: "make the study tool pass its dry run",
                    package: "study tool",
                    files: [`${SD}/tool/`],
                    what: (c?.problems || []).join("\n"),
                    acceptance: TOOL_CHECK(RD),
                },
            ],
            `${tag}-tool`,
            phaseName,
        );
    }
    return false;
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
7. Every bar in ${T}/criteria.md that is scored by a script (or a check, count or lister) names a script that exists (in round 1 of tier 2 the scripts for four bars were never built, so those bars could not be scored).
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
        `${RULES}\nBefore the ${NAME} study touches ${ST}, make sure the branch is in a clean state: another agent may be merging origin/master into it. Re-check every 2 minutes until git -C ${ST} rev-parse -q --verify MERGE_HEAD fails and git -C ${ST} status shows no conflicts and no uncommitted tracked changes outside ${SD}/tmp. Then report the head sha. Change nothing.`,
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
    const prev = START_ROUND > 1 ? `${T}/rounds/round-${START_ROUND - 1}` : "";
    const dr = await dryRun(`r${START_ROUND}`, "Prepare", await pilotAll(`r${START_ROUND}`, "Prepare", prev), prev);
    if (dr.stop) {
        log(`${NAME} stops before round ${START_ROUND}'s sessions: ${dr.stop}`);
        return { preflight: pre, stop: dr.stop };
    }
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
        `${RULES}\n${asRole("researcher")}\nPlan ${NAME} round ${r} per ${T}/criteria.md (frozen) and ${T}/roster.md, on the frozen build at the top of criteria.md.${reweight} Each session names its start (setup or saved project${USERS === "returning" ? " reflecting the returning user's history" : ""}) and, where tasks.md gives the task a follow-up question, that question as "followup" (the workflow asks it after the participant stops; the participant never sees it before). At most ${MAX_SESSIONS} sessions. Session ids r${r}-s01... Write ${RD}/plan.md with one table row per session, \`| <id> | <task> | <A or B>: <dataset> | <persona> | \`<start>\` |\`: real.mjs --brief reads each session's task, half, persona and start from that row. Check it: run node ${SD}/tool/real.mjs --brief ${RD}/sessions/<the first id> and fix the plan or the roster until it prints a briefing.md path. Never write a participant briefing yourself: participants read only what --brief writes. Return the sessions and "dist", the frozen build directory named on the first line of criteria.md.`,
        { label: `${P}: plan`, phase: "Round", schema: PLAN, effort: "high" },
    );
    const sessions = (plan?.sessions || []).slice(0, MAX_SESSIONS);
    if ((plan?.sessions || []).length > MAX_SESSIONS)
        log(`${P}: plan had ${plan.sessions.length} sessions; ran the first ${MAX_SESSIONS}`);
    const DIST = build?.dir || plan?.dist;
    if (!(await toolDryRun(`r${r}`, RD, "Round"))) {
        log(
            `${NAME} stops before round ${r}'s sessions: the study tool or a bar's script failed its dry run twice (see ${RD}/tool-dry-run-*.md)`,
        );
        break;
    }
    log(`${P}: ${sessions.length} sessions on ${build?.url || "the frozen build"}`);
    // A participant's session runs in a folder outside the studio's files (real.mjs --brief prints
    // it); in round 2 a participant whose folder sat in the studio tree read tasks.md (r2-s05).
    const own = (s) => `${ST}/tmp/studio-sessions/${RD.slice(SD.length + 1)}/sessions/${s.id}`;
    // the second --end ends a T17 or T18 session whose first --end handed over the follow-up; --end
    // copies the folder to ${RD}/sessions/<id>/ with leaks.json, what the participant opened
    const endSession = (s) =>
        agent(
            `Run exactly this command and return its output, nothing else: node ${SD}/tool/real.mjs --end ${own(s)}; node ${SD}/tool/real.mjs --end ${own(s)}`,
            { label: `${P}: ${s.id} end`, phase: "Round", effort: "low" },
        );
    const briefSession = (s) =>
        agent(
            `Run exactly this command and return its output, nothing else: rm -rf ${own(s)} && node ${SD}/tool/real.mjs --brief ${RD}/sessions/${s.id}`,
            { label: `${P}: ${s.id} brief`, phase: "Round", effort: "low" },
        );
    // Participants get only their briefing folder and the frozen build directory, never a studio
    // path: in round 1 a participant told to read criteria.md also read the facilitator notes.
    const PRULES = (s) =>
        `RULES: Plain ASCII only. Never run git. Your session folder is ${own(s)}: read nothing outside it. Never open, list or search any other file or folder (no study notes, tasks, answers, personas, the app's source, other sessions, anything else on this machine), and never use a path with "..". Every tool call is checked afterwards, and a session that opened anything else is thrown away. Use the app only through the commands below.`;
    const participate = async (s) => {
        const brief = `${own(s)}/briefing.md`;
        const who =
            USERS === "returning"
                ? `a RETURNING user of this app. Become the person ${brief} describes, including your history with the app`
                : `a FIRST-TIME user: you have never seen this app. Become the person ${brief} describes`;
        const prompt = `${PRULES(s)}\nYOU ARE A STUDY PARTICIPANT, ${who}. Your task and your start command are in that same file.\nUse the app only through the --start command it gives (REAL_DIST=${DIST}, folder ${own(s)}), then --step one action at a time, LOOKING at each new screenshot before deciding the next action (you may point at a spot on the last screenshot with --click-at). Before each step, say in one or two sentences, in character, what you see and what you will try next. Stop when you are done, would give up, or keep repeating without progress (no step limit). Do NOT --end: the facilitator ends the session.\nWrite ${own(s)}/transcript.md as you go (append after every step, so nothing is lost if the session stops): your per-step notes, every command, and at the end in character: did you finish, how easy or difficult it was from 1 (very difficult) to 7 (very easy), what confused you. Return the transcript path.`;
        const attempts = [
            [prompt, { label: `${P}: ${s.id} ${s.task} ${s.persona}`.slice(0, 80), phase: "Round" }],
            [
                prompt + `\n\n(A previous attempt ended early. Your session folder has been cleared; start again.)`,
                { label: `${P}: ${s.id} retry`, phase: "Round" },
            ],
            [
                prompt +
                    `\n\n(Two previous attempts ended early. Your session folder has been cleared; start again, and write "Participant model: sonnet" at the top of the transcript.)`,
                { label: `${P}: ${s.id} sonnet`, phase: "Round", model: "sonnet" },
            ],
        ];
        for (const [p, o] of attempts) {
            const b = await briefSession(s);
            if (!String(b ?? "").includes(brief)) {
                log(`${P}: ${s.id} has no briefing (${String(b ?? "").slice(0, 200)})`);
                return null;
            }
            const t = await agent(p, o);
            // Every follow-up is sent: in round 1 two sessions never got theirs.
            if (t && s.followup)
                await agent(
                    `${PRULES(s)}\nYou are the study participant whose session is ${own(s)}/ (who you are is in ${brief}; read your transcript.md there to remember what you did). The facilitator now asks you: "${s.followup}"\nAnswer in character. You may look at the screen again with node ${SD}/tool/real.mjs --step ${own(s)} (REAL_DIST=${DIST}); do NOT --end. Append the question and your answer to the transcript under "Follow-up". Return the answer.`,
                    { label: `${P}: ${s.id} follow-up`, phase: "Round" },
                );
            await endSession(s); // a stopped agent must never keep its browser
            if (t) return t;
        }
        return null;
    };
    const followupCheck = (s) =>
        s.followup
            ? ' The transcript must hold the answer to the follow-up "' +
              s.followup +
              '"; if it does not, list that as a problem of kind behavior.'
            : "";
    const grade = (t, s) =>
        t
            ? slot(() =>
                  agent(
                      `${RULES}\nGrade ${NAME} session ${s.id} (task ${s.task}, persona ${s.persona}) strictly by ${T}/criteria.md and the task's success definition in ${T}/answers.md, from the LAST screenshot and any saved files in ${RD}/sessions/${s.id}/ (downloads/ included), never from the participant's own rating. Record the participant model (sonnet if the transcript says so). VOID only if the tool or the run failed, or the participant opened a file outside its own folder: ${RD}/sessions/${s.id}/leaks.json (written at --end from the participant's tool calls) lists any leak (name each); if it is missing or found no transcript, run node ${SD}/tool/real.mjs --leaks ${RD}/sessions/${s.id} and decide from its output (say why).${followupCheck(s)} Count steps and wrong turns against the success path; record a false "done" whenever the participant claims done while the screen shows otherwise (truth_on_screen if the screen itself said so). List each problem with severity 0-4, kind and evidence (step and screenshot). A build defect you can reproduce with a scripted real.mjs path (under ${RD}/repro/${s.id}/, through the browser gate) is marked build-defect with the repro. Write ${RD}/sessions/${s.id}/grade.md.`,
                      { label: `${P}: grade ${s.id}`, phase: "Round", schema: GRADE },
                  ),
              )
            : {
                  session: s.id,
                  task: s.task,
                  persona: s.persona,
                  grade: "VOID",
                  false_done: false,
                  problems: [{ what: "all three attempts ended without a transcript", severity: 0 }],
              };
    const both = await parallel([
        () => pipeline(sessions, (s) => slot(() => participate(s)), grade),
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
    const firstGrades = both[0] || [];
    // A void session is re-run once under a new id (r1-s04 -> r1-s04b), from the same briefing: in
    // round 1 a void session was never re-run and its task lost a participant.
    const rerun = sessions
        .filter((s, i) => !firstGrades[i] || firstGrades[i].grade === "VOID")
        .map((s) => ({ ...s, id: `${s.id}b`, brief: s.id }));
    if (rerun.length) log(`${P}: re-running ${rerun.length} void sessions: ${rerun.map((s) => s.id).join(", ")}`);
    const again = rerun.length ? await pipeline(rerun, (s) => slot(() => participate(s)), grade) : [];
    const grades = [...firstGrades, ...(again || [])].filter(Boolean);
    const voids = grades.filter((g) => g.grade === "VOID").length;
    if (voids) log(`${P}: ${voids} void sessions, re-runs included (see their grade.md for why)`);
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
    await landPass(`round ${r} fixes`, "Round");
    build = await freezeBuild(`r${r + 1}`, "Round");
    log(
        `${NAME} build for round ${r + 1}: ${build?.url || "not served"} (commit ${build?.sha || "?"}); pilot screenshots in ${T}/rounds/r${r + 1}/pilot/`,
    );
    const dr = await dryRun(`r${r + 1}`, "Round", await pilotAll(`r${r + 1}`, "Round", RD), RD);
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
    if (dr.stop) {
        log(`${NAME} stops before round ${r + 1}'s sessions: ${dr.stop}`);
        break;
    }
}

// ---------------- Report and landing ----------------
phase("Report");
const report = await agent(
    `${RULES}\n${asRole("director")}\nWrite the ${NAME} report at ${T}/report.md for the owner (a reader who did not watch): what was tested (builds and their commits, tasks, participants, rounds, sessions including void and sonnet ones, expert walkthroughs and audits; what a simulated participant can and cannot tell us); results per round against the frozen bars (a table per round); what was learned, most important first, with evidence; what was changed (by package) and whether the next round confirmed it; what was deferred and why; the decisions waiting on the owner (only BREAKING API changes and one-way doors, from ${SD}/owner-decisions.md); next steps. Under about 20 KB. Update your notes. Return the report's summary and next steps as markdown.`,
    { label: `${NAME} report`, phase: "Report", effort: "high" },
);
await commitDocs(`docs(workspace): the ${NAME} report and studio notes`, "commit report", "Report");
// The studio lands like every other change (golden-local, CLAUDE.md "Landing changes"): the
// workflow prepares the branch and waits; the launching session runs land.mjs.
if (LAND) await landPass(`the ${NAME} report`, "Report", true);
return { rounds, report };
