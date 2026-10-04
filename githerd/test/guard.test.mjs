import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { countBrowserTrees, launchesBrowser } from "../bin/githerd-guard.mjs";
import { splitCommands } from "../lib/shellwords.mjs";

const GUARD = fileURLToPath(new URL("../bin/githerd-guard.mjs", import.meta.url));
const REPO = "graphty-org/graphty-monorepo";
/** The issue with an open owner item in every test job. */
const OWNER_ITEM = 77;

let base;
/** The ordinary test job, with room for browsers. */
let job;

/**
 * Makes a job directory and its worktree.
 * @param {string} name a directory name
 * @param {object} [overrides] fields of guard.json to change
 * @returns {{jobDir: string, root: string}} the paths
 */
function makeJob(name, overrides = {}) {
    const jobDir = join(base, name, "job");
    const root = join(base, name, "work");
    mkdirSync(jobDir, { recursive: true });
    mkdirSync(join(root, ".git"), { recursive: true });
    const config = { root, repo: REPO, ownerItems: [OWNER_ITEM], browsers: 100000, ...overrides };
    writeFileSync(join(jobDir, "guard.json"), JSON.stringify(config));
    return { jobDir, root };
}

/**
 * Runs the guard on one hook input.
 * @param {{jobDir: string, root: string} | null} target the job, or null for no job directory argument
 * @param {string | object} input the hook input, or raw stdin text
 * @returns {{status: number | null, stderr: string}} the result
 */
function guard(target, input) {
    const stdin =
        typeof input === "string"
            ? input
            : JSON.stringify({ cwd: target?.root, session_id: "s1", hook_event_name: "PreToolUse", ...input });
    const args = target ? [GUARD, target.jobDir] : [GUARD];
    const r = spawnSync(process.execPath, args, {
        input: stdin,
        env: { PATH: process.env.PATH, HOME: process.env.HOME },
        encoding: "utf8",
        timeout: 20000,
    });
    return { status: r.status, stderr: r.stderr };
}

/**
 * Runs the guard on one Bash command.
 * @param {{jobDir: string, root: string}} target the job
 * @param {string} command a Bash command
 * @returns {{status: number | null, stderr: string}} the result
 */
const bash = (target, command) => guard(target, { tool_name: "Bash", tool_input: { command } });

/**
 * Reads a JSON-lines file of a job.
 * @param {{jobDir: string}} target the job
 * @param {string} name the file
 * @returns {any[]} the lines
 */
function lines(target, name) {
    try {
        return readFileSync(join(target.jobDir, name), "utf8")
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((l) => JSON.parse(l));
    } catch {
        return [];
    }
}

beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), "githerd-guard-"));
    job = makeJob("plain");
    writeFileSync(join(job.root, "msg-attributed.txt"), "fix: x\n\nCo-Authored-By: Someone <a@b.c>\n");
    writeFileSync(join(job.root, "msg-clean.txt"), "fix: x\n");
});

afterAll(() => {
    rmSync(base, { recursive: true, force: true });
});

const SIGNED_ATTRIBUTION = `git commit -S -m "$(cat <<'EOF'
fix: x

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"`;

const API = `repos/${REPO}`;

/**
 * Bash commands refused, each with text its refusal must contain: the allowed alternative where
 * design 10.1 names one.
 * @type {[string, RegExp][]}
 */
const REFUSED = [
    // every git push spelling: githerd_push
    ...[
        "git push",
        "git push origin HEAD",
        "git push --force-with-lease origin githerd/x-1",
        "/usr/bin/git push",
        '"git" push',
        "g\\it pu\\sh",
        "git -C /tmp push",
        "git -c user.name=x push",
        "git --no-pager push",
        "FOO=1 git push",
        "env GIT_TRACE=1 git push",
        "env -i PATH=/usr/bin git push",
        "command git push",
        "exec git push",
        "nice -n 5 git push",
        "time git push",
        "timeout 30 git push",
        "echo hi; git push",
        "true && git push",
        "false || git push",
        "echo hi | git push",
        "echo hi\ngit push",
        "echo $(git push)",
        "echo `git push`",
        'echo "$(git push)"',
        "(git push)",
        "{ git push; }",
        "if true; then git push; fi",
        "bash -c 'git push'",
        'sh -lc "git push origin"',
        "eval git push",
        "env -S 'git push'",
        "echo origin | xargs git push",
        "find . -maxdepth 0 -exec git push \\;",
        "npx -c 'git push'",
        // plumbing and porcelain that push without `git push`
        "git send-pack git@github.com:graphty-org/graphty-monorepo.git HEAD:refs/heads/x",
        "git http-push https://github.com/graphty-org/graphty-monorepo.git x",
        "git receive-pack /tmp/x.git",
        "git subtree push --prefix=a origin x",
        "git subtree --prefix=a push origin x",
        "git subtree -P a push origin x",
    ].map((c) => /** @type {[string, RegExp]} */ ([c, /githerd_push/])),
    // spellings that hide a subcommand or skip the hooks
    ["git -c alias.p=push p", /aliases/],
    ["git -c credential.helper=store fetch", /credential/],
    ["git credential fill", /credential/],
    ["git commit --no-verify -m 'fix: x'", /hooks always run/],
    ["git commit -n -m 'fix: x'", /hooks always run/],
    ["git commit -anm 'fix: x'", /hooks always run/],
    ["git merge --no-verify origin/master", /hooks always run/],
    ["git -c core.hooksPath=/dev/null commit -m 'fix: x'", /hooks always run/],
    ["HUSKY=0 git commit -m 'fix: x'", /HUSKY/],
    // history-rewriting and change-discarding git
    ["git stash", /commit the work in progress/],
    ["git stash push -m x", /commit the work in progress/],
    ["git reset --hard HEAD~1", /git revert|git switch -c/],
    ["git reset HEAD file", /git revert|git switch -c/],
    ["git clean -fdx", /rm/],
    ["git rebase master", /git merge origin\/master/],
    ["git checkout -- file.ts", /git switch/],
    ["git checkout master", /git switch/],
    ["git checkout HEAD~1 -- a.ts", /git switch/],
    ["git checkout -b x -- a.ts", /git switch/],
    ["git restore file.ts", /new commit/],
    ["git restore --staged --worktree a.ts", /new commit/],
    ["git switch --discard-changes main", /commit the changes first/],
    ["git switch -f main", /commit the changes first/],
    // remotes and shared config
    ["git remote add fork https://github.com/x/y", /githerd_push/],
    ["git remote set-url origin x", /githerd_push/],
    ["git remote remove origin", /githerd_push/],
    ["git config remote.origin.url x", /git -c/],
    ["git config user.name x", /git -c/],
    ["git config --global commit.gpgsign false", /git -c/],
    // unsigned commits and attribution
    ['git commit --no-gpg-sign -m "fix: x"', /signed/],
    ['git -c commit.gpgsign=false commit -m "fix: x"', /signed/],
    ['GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=commit.gpgsign GIT_CONFIG_VALUE_0=false git commit -m "fix: x"', /GIT_/],
    ['git commit -S -m "fix: x" -m "Co-Authored-By: Claude <noreply@anthropic.com>"', /message/],
    ['git commit -S -m "fix: x" -m "Claude-Session: abc"', /message/],
    [SIGNED_ATTRIBUTION, /message/],
    ["git commit -S -F - <<EOF\nfix: x\n\nco-authored-by: a <b@c>\nEOF", /message/],
    ["git commit -S -F msg-attributed.txt", /message/],
    ["git commit -S --file=msg-attributed.txt", /message/],
    ["git commit -S -F missing-message.txt", /guard error/],
    // git writes outside the job's worktree
    ["git -C /tmp commit -m 'fix: x'", /stay in the job's worktree/],
    ["cd /tmp && git commit -m 'fix: x'", /stay in the job's worktree/],
    ["cd .. && git add -A", /stay in the job's worktree/],
    ["cd && git add -A", /stay in the job's worktree/],
    ["cd ~/x; git add -A", /stay in the job's worktree/],
    ["env -C /tmp git commit -m 'fix: x'", /stay in the job's worktree/],
    ["git -C ../main merge x", /stay in the job's worktree/],
    ["cd $HOME/x && git commit -m 'fix: x'", /cd to a plain path/],
    ["cd - && git add -A", /cd to a plain path/],
    ["git --git-dir=/tmp/x/.git commit -m 'fix: x'", /--git-dir/],
    ["git --work-tree /tmp/x add -A", /--git-dir/],
    ["GIT_DIR=/tmp/x git commit -m 'fix: x'", /GIT_/],
    // merging, statuses, updates and retargets: the daemon's
    ["gh pr merge 12", /Mergify/],
    ["gh pr merge 12 --auto --merge", /Mergify/],
    ["gh pr merge --disable-auto 12", /Mergify/],
    ["gh pr update-branch 12", /daemon updates/],
    ["gh pr edit 12 --base other", /retargets/],
    [`gh api -X PATCH ${API}/pulls/12 -f base=other`, /retargets/],
    [`gh api -X POST ${API}/statuses/abc -f state=success`, /statuses/],
    ["gh api repos/{owner}/{repo}/statuses/abc -f state=success", /statuses/],
    [`gh api -X PUT ${API}/pulls/12/merge`, /Mergify/],
    [`gh api -X POST ${API}/merges -f base=x -f head=y`, /Mergify/],
    [`gh api -X PUT ${API}/pulls/12/update-branch`, /daemon updates/],
    [`gh api -X POST ${API}/git/refs -f ref=refs/heads/x -f sha=abc`, /githerd_push/],
    [`gh api -X DELETE ${API}/git/refs/heads/x`, /githerd_push/],
    [`gh api -X PUT ${API}/contents/a.txt -f message=x -f content=eA==`, /githerd_push/],
    [`gh api -X PUT ${API}/branches/master/protection --input p.json`, /owner's/],
    ["gh api graphql -f query='mutation { enablePullRequestAutoMerge(input: {}) { clientMutationId } }'", /mutation/],
    ["gh api graphql -f query='mutation { addComment(input: {}) { clientMutationId } }'", /mutation/],
    // re-runs and dispatches: githerd_rerun
    ["gh run rerun 123", /githerd_rerun/],
    ["gh run rerun 123 --job 456", /githerd_rerun/],
    ["gh workflow run ci.yml", /githerd_rerun/],
    [`gh api -X POST ${API}/actions/runs/1/rerun`, /githerd_rerun/],
    [`gh api -X POST ${API}/actions/jobs/1/rerun`, /githerd_rerun/],
    [`gh api ${API}/actions/workflows/gpu.yml/dispatches -f ref=master`, /githerd_rerun/],
    // closes and reopens
    ["gh issue close 12", /grace period/],
    ["gh issue reopen 12", /githerd_ask_owner/],
    ["gh pr close 12", /not-needed/],
    ["gh pr reopen 12", /githerd_ask_owner/],
    [`gh api -X PATCH ${API}/issues/12 -f state=closed`, /closes and reopens/],
    // the owner's and githerd's labels
    ["gh issue edit 12 --add-label needs-decision", /belongs to the owner/],
    ["gh pr edit 12 --remove-label hold", /belongs to the owner/],
    ["gh issue edit 12 --add-label bug,githerd:parked", /belongs to the owner/],
    ["gh issue edit 12 --add-label=intermittent", /belongs to the owner/],
    ["gh issue create --title x --body y --label intermittent", /belongs to the owner/],
    ["gh label delete hold --yes", /belongs to the owner/],
    [`gh api -X POST ${API}/issues/12/labels -f 'labels[]=hold'`, /belongs to the owner/],
    [`gh api -X DELETE ${API}/issues/12/labels/needs-decision`, /belongs to the owner/],
    // comments on an item with an open owner item
    [`gh issue comment ${OWNER_ITEM} --body x`, /githerd_ask_owner/],
    [`gh pr comment ${OWNER_ITEM} -b x`, /githerd_ask_owner/],
    [`gh pr review ${OWNER_ITEM} --comment -b x`, /githerd_ask_owner/],
    [`gh issue comment https://github.com/${REPO}/issues/${OWNER_ITEM} -b x`, /githerd_ask_owner/],
    [`gh api -X POST ${API}/issues/${OWNER_ITEM}/comments -f body=x`, /githerd_ask_owner/],
    ["gh pr comment -b x", /name the issue or pull request number/],
    [`gh api -X PATCH ${API}/issues/comments/5 -f body=x`, /--edit-last/],
    // writes outside the organization
    ["gh issue comment 5 -R cytoscape/cytoscape.js -b x", /only to graphty-org/],
    ["gh issue comment https://github.com/cytoscape/cytoscape.js/issues/5 -b x", /only to graphty-org/],
    ["gh issue create -R apowers313/scratch -t x -b y", /only to graphty-org/],
    ["gh repo create scratch --private", /only to graphty-org/],
    ["gh repo fork cytoscape/cytoscape.js", /only to graphty-org/],
    ["gh api -X POST repos/cytoscape/cytoscape.js/issues/5/comments -f body=x", /only to graphty-org/],
    ["curl -X POST https://api.github.com/repos/cytoscape/cytoscape.js/issues/5/comments", /use gh/],
    ["wget https://api.github.com/user", /use gh/],
    // the review tool's accept and finish
    ["node visual-review/trusted/cli.mjs accept", /only the owner/],
    ["node visual-review/trusted/cli.mjs finish --pr 12", /only the owner/],
    ["pnpm exec visual-review accept", /only the owner/],
    ["npx visual-review finish", /only the owner/],
    // the comment-reading forms of gh: githerd_read
    ["gh pr view 12 --comments", /githerd_read/],
    ["gh issue view 12 --comments", /githerd_read/],
    ["gh pr view 12 --json title,comments", /githerd_read/],
    ["gh pr view 12 --json reviews", /githerd_read/],
    ["gh pr view 12 --json=latestReviews", /githerd_read/],
    [`gh api ${API}/issues/12/comments`, /githerd_read/],
    ["gh api repos/{owner}/{repo}/pulls/12/reviews", /githerd_read/],
    [`gh api /${API}/issues/12/timeline`, /githerd_read/],
    [
        'gh api graphql -f query=\'{ repository(owner: "a", name: "b") { issue(number: 1) { comments(first: 9) { nodes { body } } } } }\'',
        /githerd_read/,
    ],
    // publishing
    ["npm publish", /release\.yml/],
    ["pnpm publish --access public", /release\.yml/],
    ["pnpm -r publish", /release\.yml/],
    ["nx release", /release\.yml/],
    ["pnpm exec nx release --dry-run", /release\.yml/],
    // the githerd CLI's owner commands, however it is reached, and the daemon reached directly
    ["githerd answer ask-pr-7 yes", /githerd answer is the owner's/],
    ["githerd order 12 13 first", /githerd order is the owner's/],
    ["githerd policy freeze-merges release week", /githerd policy is the owner's/],
    ["githerd ack incident-ci", /githerd ack is the owner's/],
    ["githerd veto issue:12", /githerd veto is the owner's/],
    ["githerd mode paused", /githerd mode is the owner's/],
    ["node githerd/bin/githerd.mjs answer ask-pr-7 yes", /githerd answer is the owner's/],
    ["pnpm exec githerd policy end policy-1", /githerd policy is the owner's/],
    ["githerd workers --stop", /githerd workers is the owner's/],
    ["githerd pause", /githerd pause is the owner's/],
    ["githerd release issue-7", /githerd release is the owner's/],
    // workers never start or change githerd (design 9.4)
    ["node githerd/bin/githerd.mjs restart", /githerd restart: workers never start or change githerd/],
    ["githerd install", /githerd install: workers never start or change githerd/],
    ["githerd ensure", /githerd ensure: workers never/],
    ["githerd dev", /githerd dev: workers never/],
    ["node ../githerd/bin/githerd.mjs selftest", /githerd selftest: workers never/],
    ["curl -X POST http://127.0.0.1:9123/owner -d x", /talk to githerd only through its tools/],
    ["curl localhost:9123/owner", /talk to githerd only through its tools/],
    ["wget -qO- http://localhost/owner", /talk to githerd only through its tools/],
];

/** Bash commands allowed: the alternatives the refusals name, and ordinary work. */
const ALLOWED = [
    "githerd status",
    "githerd doctor",
    "node githerd/bin/githerd.mjs why pr-7",
    'git commit -S -m "fix: x"',
    "git commit -S -m \"$(cat <<'EOF'\nfix(githerd): x\n\nBody text.\nEOF\n)\"",
    "git commit -S -F msg-clean.txt",
    "git commit -am 'fix: x'",
    "git -c commit.gpgsign=true commit -m 'fix: x'",
    "cd sub && git commit -S -m 'fix: x'",
    "cd /tmp && cd - >/dev/null; ls",
    "git merge origin/master",
    "git merge --no-edit abc123",
    "git revert --no-edit abc123",
    "git checkout -b feat/x",
    "git checkout -b feat/x origin/master",
    "git switch feat/x",
    "git switch -c feat/x",
    "git restore --staged a.ts",
    "git status --short",
    "git diff HEAD~1 -- src/a.ts",
    "git log --oneline -5",
    "git -C /tmp log --oneline",
    "cd /tmp && git status",
    "git -C ../main branch -a",
    "git add -A",
    "git fetch origin",
    "git remote -v",
    "git remote get-url origin",
    "git subtree split --prefix=a -b x",
    "git config user.name",
    "git config --get user.email",
    "git worktree list",
    "gh pr create --title 'fix: x' --body y",
    "gh pr edit 12 --title 'fix: y' --add-label bug",
    "gh issue comment 12 --body x",
    "gh pr comment 12 -b x",
    "gh issue create -t x -b y --label bug",
    "gh issue create -R graphty-org/graphty-monorepo -t x -b y",
    "gh pr view 12",
    "gh pr view 12 --json title,state,reviewDecision",
    "gh pr checks 12",
    "gh run view 123 --log-failed",
    "gh run list -w ci.yml",
    `gh api ${API}/pulls/12`,
    `gh api ${API}/commits/abc/statuses`,
    "gh api repos/cytoscape/cytoscape.js/issues/5",
    "gh issue view 5 -R cytoscape/cytoscape.js",
    "gh api graphql -f query='{ viewer { login } }'",
    "node visual-review/trusted/cli.mjs update 12",
    "node visual-review/trusted/cli.mjs capture --project p --out tmp/x",
    "pnpm exec nx run x:test",
    "pnpm exec nx run-many -t build",
    "pnpm install --frozen-lockfile",
    "npm test",
    "pnpm run build",
    "npm run test:run -- --project=browser",
    "curl https://registry.npmjs.org/vitest",
    "ls -la && cat README.md | grep push",
    "echo 'git push' > notes.txt",
    "grep -rn 'git push' lib/",
    "echo done # git push",
    "cat <<EOF > notes.txt\ngit push\nnpm publish\nEOF",
    "find . -name '*.ts' -exec grep -l push {} +",
    "timeout 30 git commit -S -m 'fix: y'",
];

describe("guard: started through the installed copy", () => {
    it("still refuses when its directory is reached through a symlink, as current/ is", () => {
        const link = join(base, "current");
        symlinkSync(dirname(dirname(GUARD)), link);
        const r = spawnSync(process.execPath, [join(link, "bin", "githerd-guard.mjs"), job.jobDir], {
            input: JSON.stringify({
                cwd: job.root,
                hook_event_name: "PreToolUse",
                tool_name: "Bash",
                tool_input: { command: "gh pr merge 5" },
            }),
            env: { PATH: process.env.PATH, HOME: process.env.HOME },
            encoding: "utf8",
            timeout: 20000,
        });
        expect(r.status, r.stderr).toBe(2);
        expect(r.stderr).toMatch(/Mergify merges/);
    });
});

describe("guard: Bash refusals of design 10.1", () => {
    it.each(REFUSED)("refuses %j and names what to do", (command, says) => {
        const r = bash(job, command);
        expect(r.status, r.stderr).toBe(2);
        expect(r.stderr).toMatch(says);
    });

    it.each(ALLOWED)("allows %j", (command) => {
        const r = bash(job, command);
        expect(r.stderr).toBe("");
        expect(r.status).toBe(0);
    });
});

describe("guard: the write log", () => {
    it("logs every allowed gh write with its verb and item, and no reads", () => {
        const logged = makeJob("writes");
        const r = bash(
            logged,
            `gh pr view 3 && gh issue comment 12 --body x && gh api -X POST ${API}/issues/13/labels -f 'labels[]=bug' && gh pr create -t 'fix: x' -b y`,
        );
        expect(r.status, r.stderr).toBe(0);
        expect(lines(logged, "writes.jsonl")).toMatchObject([
            { verb: "issue comment", item: 12, repo: REPO },
            { verb: `api POST /${API}/issues/13/labels`, item: 13, repo: REPO },
            { verb: "pr create", item: null, repo: REPO },
        ]);
        expect(lines(logged, "writes.jsonl")[0].at).toMatch(/^\d{4}-/);
    });

    it("logs nothing when any part of the command line is refused", () => {
        const logged = makeJob("writes-refused");
        expect(bash(logged, "gh issue comment 12 --body x && gh pr merge 12").status).toBe(2);
        expect(lines(logged, "writes.jsonl")).toEqual([]);
    });
});

describe("guard: Edit and Write", () => {
    const DENIED = [
        "visual-baselines/graphty-element/a.png",
        "githerd/lib/daemon.mjs",
        ".claude/settings.json",
        ".github/workflows/ci.yml",
        ".husky/pre-push",
        "tools/prepush.sh",
        ".git/config",
        "./.claude/../.claude/rules.md",
    ];

    it.each(DENIED.flatMap((f) => ["Edit", "Write", "MultiEdit"].map((t) => [t, f])))(
        "refuses %s to %s",
        (tool, file) => {
            const r = guard(job, { tool_name: tool, tool_input: { file_path: join(job.root, file), content: "x" } });
            expect(r.status, r.stderr).toBe(2);
            expect(r.stderr).toMatch(/githerd_ask_owner/);
        },
    );

    it("resolves a relative path against the session's directory", () => {
        expect(guard(job, { tool_name: "Write", tool_input: { file_path: "tools/prepush.sh" } }).status).toBe(2);
    });

    it.each(["/tmp/x.txt", "../other/a.ts", `${process.env.HOME}/.githerd/graphty-monorepo/state.json`])(
        "refuses a path outside the worktree: %s",
        (file) => {
            for (const tool of ["Edit", "Write"]) {
                const r = guard(job, { tool_name: tool, tool_input: { file_path: file, content: "x" } });
                expect(r.status).toBe(2);
                expect(r.stderr).toMatch(/inside the job's worktree.*tmp\//);
            }
        },
    );

    it("allows other paths in the worktree, its tmp/ included", () => {
        const files = ["src/a.ts", "tmp/githerd/x.txt", ".github/ISSUE_TEMPLATE/x.md", "tools/other.sh", "CLAUDE.md"];
        for (const file of files) {
            const r = guard(job, { tool_name: "Edit", tool_input: { file_path: join(job.root, file) } });
            expect(r.status, file).toBe(0);
        }
        const nb = guard(job, { tool_name: "NotebookEdit", tool_input: { notebook_path: join(job.root, "a.ipynb") } });
        expect(nb.status).toBe(0);
    });

    it("allows tools it does not guard", () => {
        expect(guard(job, { tool_name: "Read", tool_input: { file_path: "/etc/hosts" } }).status).toBe(0);
    });
});

describe("guard: the Agent cap", () => {
    /**
     * Sends one non-PreToolUse event.
     * @param {{jobDir: string, root: string}} target the job
     * @param {object} input the event
     * @returns {number | null} the exit status
     */
    const event = (target, input) => guard(target, { session_id: "s1", ...input }).status;
    const launch = (target, session = "s1") =>
        guard(target, { tool_name: "Agent", session_id: session, tool_input: { description: "d", prompt: "p" } });

    it("refuses a third concurrent subagent, counted by id", () => {
        const agents = makeJob("agents");
        expect(launch(agents).status).toBe(0);
        expect(event(agents, { hook_event_name: "SubagentStart", agent_id: "a1", agent_type: "general-purpose" })).toBe(
            0,
        );
        expect(
            event(agents, {
                hook_event_name: "PostToolUse",
                tool_name: "Agent",
                tool_response: { isAsync: true, status: "async_launched", agentId: "a1" },
            }),
        ).toBe(0);
        expect(launch(agents).status).toBe(0);
        expect(
            event(agents, {
                hook_event_name: "PostToolUse",
                tool_name: "Agent",
                tool_response: { isAsync: true, status: "async_launched", agentId: "a2" },
            }),
        ).toBe(0);
        const third = launch(agents);
        expect(third.status).toBe(2);
        expect(third.stderr).toMatch(/at most 2 subagents.*do this part yourself/);
        // a hidden agent stops without a start: nothing changes
        expect(event(agents, { hook_event_name: "SubagentStop", agent_id: "hidden", agent_type: "" })).toBe(0);
        expect(launch(agents).status).toBe(2);
        expect(event(agents, { hook_event_name: "SubagentStop", agent_id: "a1" })).toBe(0);
        expect(launch(agents).status).toBe(0);
        // a new session starts from zero
        expect(event(agents, { hook_event_name: "SubagentStart", agent_id: "a3" })).toBe(0);
        expect(launch(agents).status).toBe(2);
        expect(launch(agents, "s2").status).toBe(0);
    });

    it("never counts a foreground agent, or an agent again after it stopped", () => {
        const fg = makeJob("agents-foreground", { subagents: 1 });
        // A foreground Agent call: start, stop, then its PostToolUse with the id.
        event(fg, { hook_event_name: "SubagentStart", agent_id: "f1" });
        event(fg, { hook_event_name: "SubagentStop", agent_id: "f1" });
        event(fg, { hook_event_name: "PostToolUse", tool_name: "Agent", tool_response: { agentId: "f1" } });
        expect(launch(fg).status).toBe(0);
        // A background agent that stopped before its PostToolUse arrived.
        event(fg, { hook_event_name: "SubagentStart", agent_id: "b1" });
        event(fg, { hook_event_name: "SubagentStop", agent_id: "b1" });
        event(fg, {
            hook_event_name: "PostToolUse",
            tool_name: "Agent",
            tool_response: { isAsync: true, agentId: "b1" },
        });
        expect(launch(fg).status).toBe(0);
    });

    it("loses no count when starts and stops run at once", async () => {
        const many = makeJob("agents-race", { subagents: 1 });
        const { spawn } = await import("node:child_process");
        const send = (/** @type {object} */ input) =>
            new Promise((done) => {
                const child = spawn(process.execPath, [GUARD, many.jobDir], { stdio: ["pipe", "ignore", "ignore"] });
                child.on("close", done);
                child.stdin.end(JSON.stringify({ session_id: "s1", ...input }));
            });
        for (let i = 0; i < 10; i++) await send({ hook_event_name: "SubagentStart", agent_id: `r${i}` });
        await Promise.all(
            Array.from({ length: 10 }, (_, i) => send({ hook_event_name: "SubagentStop", agent_id: `r${i}` })),
        );
        expect(launch(many).status).toBe(0);
    });

    it("takes the cap from guard.json", () => {
        const one = makeJob("agents-one", { subagents: 1 });
        event(one, { hook_event_name: "SubagentStart", agent_id: "a1" });
        expect(launch(one).stderr).toMatch(/at most 1 subagents/);
    });

    it("never blocks a tracking event, even without a job directory or with garbage", () => {
        expect(guard(null, { hook_event_name: "SubagentStop", agent_id: "a1" }).status).toBe(0);
        expect(guard(job, { hook_event_name: "SubagentStart" }).status).toBe(0);
        const lost = { jobDir: join(base, "nowhere", "job"), root: job.root };
        expect(guard(lost, { hook_event_name: "SubagentStart", agent_id: "a1" }).status).toBe(0);
    });
});

describe("guard: the browser cap", () => {
    it.each([
        "npx playwright test",
        "pnpm exec playwright test e2e/",
        "npm run test:run -- --project=browser",
        "npx vitest run --project storybook",
        "npx vitest --browser.headless",
        "pnpm run test:browser",
        "npm run test:storybook",
        "test-storybook --url http://x",
        "chromium --headless about:blank",
    ])("refuses %j at the machine cap", (command) => {
        const full = makeJob("browsers-full", { browsers: 0 });
        const r = bash(full, command);
        expect(r.status, r.stderr).toBe(2);
        expect(r.stderr).toMatch(/Chromium trees.*githerd_expect/);
    });

    it("allows commands that start no browser at the cap", () => {
        const full = makeJob("browsers-full-2", { browsers: 0 });
        for (const command of ["npm test -- --project=default", "npx playwright install chromium", "pnpm run build"]) {
            expect(bash(full, command).status, command).toBe(0);
        }
    });

    it("recognizes launches", () => {
        expect(launchesBrowser("playwright", ["test"])).toBe(true);
        expect(launchesBrowser("playwright", ["install"])).toBe(false);
        expect(launchesBrowser("vitest", ["--project=xr"])).toBe(true);
        expect(launchesBrowser("vitest", ["--project", "default"])).toBe(false);
        expect(launchesBrowser("node", ["a.mjs"])).toBe(false);
    });

    it("counts Chromium trees from /proc: a Chromium process whose parent is not one", () => {
        const proc = join(base, "proc");
        const stat = (pid, comm, ppid) => {
            mkdirSync(join(proc, String(pid)), { recursive: true });
            writeFileSync(join(proc, String(pid), "stat"), `${pid} (${comm}) S ${ppid} 1 1 0`);
        };
        stat(1, "bash", 0);
        stat(10, "chrome", 1);
        stat(11, "chrome", 10);
        stat(12, "headless_shell", 1);
        stat(13, "node", 1);
        stat(14, "chrome", 13);
        stat(15, "tmux: server (x)", 1);
        mkdirSync(join(proc, "16"));
        mkdirSync(join(proc, "self"));
        expect(countBrowserTrees(proc)).toBe(3);
        expect(countBrowserTrees()).toBeGreaterThanOrEqual(0);
    });
});

describe("guard: failures refuse", () => {
    it("refuses malformed JSON input", () => {
        const r = guard(job, "{not json");
        expect(r.status).toBe(2);
        expect(r.stderr).toMatch(/guard error/);
    });

    it("refuses input with no tool or no command", () => {
        expect(guard(job, { tool_input: { command: "ls" } }).status).toBe(2);
        expect(guard(job, { tool_name: "Bash", tool_input: {} }).status).toBe(2);
        expect(guard(job, { tool_name: "Write", tool_input: {} }).status).toBe(2);
    });

    it("refuses an unterminated quote or substitution", () => {
        expect(bash(job, "echo 'abc").status).toBe(2);
        expect(bash(job, "echo $(ls").status).toBe(2);
    });

    it("refuses without a job directory, or with a missing or malformed guard.json", () => {
        expect(guard(null, { tool_name: "Bash", tool_input: { command: "ls" } }).stderr).toMatch(/job directory/);
        expect(bash({ jobDir: join(base, "missing"), root: job.root }, "ls").status).toBe(2);
        for (const bad of [
            { root: "relative", repo: REPO, ownerItems: [] },
            { root: "/x", repo: "x", ownerItems: [] },
        ]) {
            const broken = makeJob(`malformed-${bad.repo}`);
            writeFileSync(join(broken.jobDir, "guard.json"), JSON.stringify(bad));
            expect(bash(broken, "ls").stderr).toMatch(/malformed/);
        }
    });

    it("records each refusal with the tool, the input and the reason", () => {
        const recorded = makeJob("record");
        bash(recorded, "git push");
        expect(lines(recorded, "refusals.jsonl")).toMatchObject([
            { tool: "Bash", input: "git push", reason: expect.stringMatching(/githerd_push/) },
        ]);
    });
});

describe("splitCommands", () => {
    const argvs = (text) => splitCommands(text).map((c) => c.argv);

    it("splits on separators and honors quotes and escapes", () => {
        expect(argvs("a 'b c' \"d e\" f\\ g; h && i || j | k\nl")).toEqual([
            ["a", "b c", "d e", "f g"],
            ["h"],
            ["i"],
            ["j"],
            ["k"],
            ["l"],
        ]);
        expect(argvs('echo "a \\" \\$b"')).toEqual([["echo", 'a " $b']]);
        expect(argvs("a \\\n b")).toEqual([["a", "b"]]);
        expect(argvs("a;; b |& c")).toEqual([["a"], ["b"], ["c"]]);
    });

    it("finds commands inside substitutions and keeps their source as the word", () => {
        expect(argvs('echo $(git push) `ls -l` "$(pwd)" <(cat x) >(tee y)')).toEqual([
            ["git", "push"],
            ["ls", "-l"],
            ["pwd"],
            ["cat", "x"],
            ["tee", "y"],
            ["echo", "$(git push)", "`ls -l`", "$(pwd)"],
        ]);
        expect(argvs('echo "`date`"')).toEqual([["date"], ["echo", "`date`"]]);
        expect(argvs("echo `a\\ b`")).toEqual([
            ["a", "b"],
            ["echo", "`a\\ b`"],
        ]);
    });

    it("drops redirection targets and file descriptors", () => {
        expect(argvs("cmd > out 2>&1 < in >> log &> all &>> all2 >| x 3<&0")).toEqual([["cmd"]]);
    });

    it("marks background commands", () => {
        const cmds = splitCommands("a & b; (c; d) & e");
        expect(cmds.map((c) => [c.argv[0], c.background])).toEqual([
            ["a", true],
            ["b", false],
            ["c", true],
            ["d", true],
            ["e", false],
        ]);
    });

    it("collects here-documents and here-strings as input, not commands", () => {
        const cmds = splitCommands("cat <<-'END' | grep x <<< \"hi\"\n\tgit push\n\tEND\nls");
        expect(cmds.map((c) => c.argv)).toEqual([["cat"], ["grep", "x"], ["ls"]]);
        expect(cmds[0].input).toEqual(["\tgit push"]);
        expect(cmds[1].input).toEqual(["hi"]);
        expect(splitCommands('cat <<"E"\\F\nbody\n')[0].input).toEqual(["body"]);
    });

    it("removes assignments, reserved words and wrappers", () => {
        expect(splitCommands("A=1 B=2 git push")[0]).toMatchObject({ argv: ["git", "push"], assign: ["A=1", "B=2"] });
        expect(splitCommands("env -u X -C /tmp C=3 -- git push")[0]).toMatchObject({
            argv: ["git", "push"],
            assign: ["C=3"],
        });
        expect(argvs("env --split-string='git push' x")).toEqual([["git", "push", "x"]]);
        expect(argvs("timeout -s KILL 5 nice -n 3 stdbuf -o L xargs -I {} command exec -a n time -p git push")).toEqual(
            [["git", "push"]],
        );
        expect(argvs("timeout -- 5 ls")).toEqual([["ls"]]);
        expect(argvs("while true; do ls; done")).toEqual([["true"], ["ls"]]);
        expect(argvs("bash -c")).toEqual([]);
        expect(argvs("bash script.sh")).toEqual([["bash", "script.sh"]]);
        expect(argvs("env")).toEqual([]);
        expect(argvs("# only a comment\n")).toEqual([]);
    });

    it("records the directories env -C moves to, through sh -c", () => {
        expect(splitCommands("env -C /a --chdir=b bash -c 'env --chdir c git add -A'")[0]).toMatchObject({
            argv: ["git", "add", "-A"],
            chdir: ["/a", "b", "c"],
        });
        expect(splitCommands("git status")[0].chdir).toEqual([]);
    });

    it("keeps the background flag and assignments through sh -c", () => {
        expect(splitCommands("X=1 bash -c 'git push' &")[0]).toMatchObject({
            argv: ["git", "push"],
            background: true,
            assign: ["X=1"],
        });
    });

    it("throws on input it cannot parse", () => {
        for (const text of ["echo 'a", 'echo "a', "echo `a", "echo $(a", "(a", "a)", "cat << ", "cat <<'E"]) {
            expect(() => splitCommands(text), text).toThrow();
        }
        expect(() => splitCommands("eval ".repeat(12) + "ls")).toThrow(/nested/);
    });
});
