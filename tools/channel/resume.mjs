#!/usr/bin/env node
// Promote after approval (design/ci/channels-pipeline.md section 5, "Approval gates nightly"): a held candidate H
// whose full run ended green-images waits for the owner's screenshot review. His Finish opens an accept-only pull
// request: the accept commit A, parented on H alone with the subject "<prefix>: approve visual baselines at <sha12>",
// and on it the commit holding his signed approval of A's visual-baselines/ tree (visual-review-approvals/). Its head
// P, the approval, is what promotes: the screenshot gate needs that signature in the head's tree. Once the pull
// request merges into master, release.yml promotes P to nightly (its resume): ci.yml's release-due job dispatches
// `mode: promote-nightly` with the candidate H and the approval P (input `accept`), and every `mode: full` slot
// catches up on a due one first, so a slot that replaced a pending promote-nightly run loses nothing.
//
//   node tools/channel/resume.mjs check     release.yml's pick job (mode full or promote-nightly)
//       env MODE, CANDIDATE and ACCEPT (promote-nightly), PUBLISH_HOLD (the open publish hold's number, or empty),
//           RESULTS_URL and the job's OIDC token, GH_TOKEN, GITHUB_REPOSITORY; git: the run's master checkout, with
//           origin/channel/nightly fetched when it exists
//       writes resume (true | false), and when true sha (P), tested (H), held, source_run (the run that judged H
//           green-images: its visual-final-* captures and its kept builds) and why to GITHUB_OUTPUT
//   node tools/channel/resume.mjs record    the unhold job (approved) or the resume job (rejected)
//       env STATE (approved | rejected), TESTED, ACCEPT, WHY, RUN_URL, RESULTS_URL and the job's OIDC token,
//           GH_TOKEN, GITHUB_REPOSITORY; a rejection is also commented on the hold issue
//
// A promotion happens exactly once, and an older candidate never after a newer one: the resume refuses an approval
// already in channel/nightly (done), one whose history lacks channel/nightly (older than nightly; the land job's
// ancestry check refuses it too), one for a head that is not the held one, one for a head whose latest verdict is
// not green-images (red, or recorded approved by an earlier resume), and one that is not H plus accept-only commits.
import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { diffCommits } from "../release-diff.mjs";
import { call, config } from "../results/client.mjs";

/** The accept commit's subject (visual-review/trusted/lib/accept.mjs masterSubject), whatever the prefix. */
export const ACCEPT_SUBJECT = /^.+: approve visual baselines at ([0-9a-f]{12})$/;

const short = (sha) => String(sha ?? "").slice(0, 12);

/**
 * The accept commits among some commits: those whose subject approves a candidate and whose only parent is it.
 * @param commits `[{ sha, parents: [sha], subject }]`
 * @returns `[{ accept, candidate }]`, in the order given
 */
export function acceptsIn(commits) {
    const out = [];
    for (const c of commits) {
        const m = ACCEPT_SUBJECT.exec(c.subject ?? "");
        if (m && c.parents.length === 1 && c.parents[0].startsWith(m[1])) {
            out.push({ accept: c.sha, candidate: c.parents[0] });
        }
    }
    return out;
}

/**
 * Whether an approval promotes its candidate now.
 * @param o the facts
 * @param o.candidate H, the commit the full run tested
 * @param o.accept P, the approval: the accept pull request's head
 * @param [o.acceptOnly] whether P is H plus accept-only commits: no merge, nothing outside visual-baselines/ and
 *   visual-review-approvals/
 * @param o.hold the store's held candidate ({ head, issue }) or null
 * @param o.latest H's latest verdict in the store ({ state, runId }) or null
 * @param [o.onMaster] whether master holds P (its pull request merged)
 * @param [o.promoted] whether channel/nightly holds P already
 * @param [o.older] whether P's history lacks channel/nightly
 * @returns `{ run, why, comment }`: comment is the hold issue to tell why it did not run, when it should be told
 */
export function resumeDecision({
    candidate,
    accept,
    acceptOnly = true,
    hold,
    latest,
    onMaster = true,
    promoted,
    older,
}) {
    const no = (why, tell = true) => ({ run: false, why, comment: tell && hold?.issue ? hold.issue : null });
    const a = short(accept);
    if (promoted) return no(`nightly holds the approval ${a} already: it was promoted`, false);
    if (!acceptOnly)
        return no(
            `the approval ${a} is not ${short(candidate)} plus accept-only commits (a merge, or a change outside the baselines and approvals)`,
        );
    if (!onMaster) return no(`master does not hold the approval ${a}: its pull request has not merged`, false);
    if (hold && hold.head !== candidate)
        return no(
            `nightly is held on ${short(hold.head)}, not on ${short(candidate)}: this approval is for an older head`,
        );
    if (latest?.state !== "green-images")
        return no(`the latest verdict on ${short(candidate)} is ${latest?.state ?? "missing"}, not green-images`);
    if (older) return no(`the approval ${a} lacks channel/nightly: nightly moved past ${short(candidate)} already`);
    return { run: true, why: `the owner approved the screenshots of ${short(candidate)} (accept ${a})`, comment: null };
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const gitOk = (...args) => {
    try {
        git(...args);
        return true;
    } catch {
        return false;
    }
};
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const output = (fields) => {
    const lines = Object.entries(fields).map(([k, v]) => `${k}=${v}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
    console.log(lines.join("\n"));
};
const commentOn = (issue, text) => {
    const file = join(tmpdir(), `resume-${process.pid}.md`);
    writeFileSync(file, text);
    gh("issue", "comment", String(issue), "--body-file", file);
};
const NIGHTLY = "refs/remotes/origin/channel/nightly";

/**
 * The approval of a candidate on master (HEAD, the run's master checkout): the head of the pull request that brought
 * its newest accept commit in, the second parent of the first merge on master's first-parent line that holds it.
 * @param candidate H
 * @returns P, or null
 */
function approvalOnMaster(candidate) {
    const log = git(
        "log",
        "--format=%H %P%x09%s",
        "--fixed-strings",
        `--grep=approve visual baselines at ${short(candidate)}`,
        "HEAD",
    );
    const commits = log
        .split("\n")
        .filter(Boolean)
        .map((line) => {
            const [ids, subject] = line.split("\t");
            const [sha, ...parents] = ids.split(" ");
            return { sha, parents, subject };
        });
    const accept = acceptsIn(commits).find((c) => c.candidate === candidate)?.accept;
    if (!accept) return null;
    const merges = git("log", "--merges", "--first-parent", "--reverse", "--format=%P", `${accept}..HEAD`);
    for (const line of merges.split("\n").filter(Boolean)) {
        const [, second] = line.split(" ");
        if (second && gitOk("merge-base", "--is-ancestor", accept, second)) return second;
    }
    return accept;
}

/**
 * Whether P is H plus accept-only commits.
 * @param candidate H
 * @param approval P
 * @returns the answer
 */
function acceptOnlyFrom(candidate, approval) {
    if (!gitOk("merge-base", "--is-ancestor", candidate, approval)) return false;
    if (git("rev-list", "--merges", `${candidate}..${approval}`) !== "") return false;
    return diffCommits(candidate, approval, { acceptMerges: true }).stray.length === 0;
}

/**
 * The git facts resumeDecision needs about an approval, from the run's master checkout.
 * @param candidate H
 * @param accept P
 * @returns acceptOnly, onMaster, promoted and older
 */
function approvalFacts(candidate, accept) {
    const hasNightly = gitOk("rev-parse", "--verify", "--quiet", NIGHTLY);
    return {
        acceptOnly: gitOk("cat-file", "-e", `${accept}^{commit}`) && acceptOnlyFrom(candidate, accept),
        onMaster: gitOk("merge-base", "--is-ancestor", accept, "HEAD"),
        promoted: hasNightly && gitOk("merge-base", "--is-ancestor", accept, NIGHTLY),
        older: hasNightly && !gitOk("merge-base", "--is-ancestor", NIGHTLY, accept),
    };
}

/**
 * The approval to look at: promote-nightly's inputs, or for a full slot's catch-up the held head's approval on
 * master (only with no publish hold, under which the promotion would wait).
 * @param env the environment
 * @param hold the store's held candidate, or null
 * @returns `{ candidate, accept }`, accept null when nothing is waiting
 */
function approvalToCheck(env, hold) {
    if (env.MODE === "promote-nightly") return { candidate: env.CANDIDATE, accept: env.ACCEPT };
    const candidate = hold?.head;
    return { candidate, accept: candidate && !env.PUBLISH_HOLD ? approvalOnMaster(candidate) : null };
}

async function check(env) {
    const cfg = config(env);
    const r = cfg ? await call(cfg, "GET", "/v1/candidate") : { ok: false, why: "no store configured" };
    if (!r.ok) {
        // promote-nightly needs the store's verdict and run: fail, so re-running the failed jobs asks again; a full
        // slot just tests as it would have
        if (env.MODE === "promote-nightly") throw new Error(`the results store did not answer (${r.why})`);
        output({ resume: "false", why: `no catch-up: the results store did not answer (${r.why})` });
        return;
    }
    const hold = r.data.hold ?? null;
    const { candidate, accept } = approvalToCheck(env, hold);
    if (!accept && env.MODE !== "promote-nightly") {
        output({ resume: "false", why: "no approved candidate is waiting" });
        return;
    }
    if (!/^[0-9a-f]{40}$/.test(candidate ?? "") || !/^[0-9a-f]{40}$/.test(accept ?? ""))
        throw new Error("CANDIDATE and ACCEPT must be full commit ids");
    const latest = (r.data.recent ?? []).find((v) => v.sha === candidate) ?? null;
    const d = resumeDecision({ candidate, accept, hold, latest, ...approvalFacts(candidate, accept) });
    if (!d.run) {
        console.log(`::notice::no promotion: ${d.why}`);
        // a full slot's catch-up never comments: it would repeat on every slot
        if (d.comment && env.MODE === "promote-nightly")
            commentOn(d.comment, `The approval ${accept} did not promote: ${d.why}. ${env.RUN_URL ?? ""}`.trim());
        output({ resume: "false", why: d.why });
        return;
    }
    output({
        resume: "true",
        sha: accept,
        tested: candidate,
        held: hold?.head ?? "",
        source_run: latest.runId,
        why: d.why,
    });
}

async function record(env) {
    if (!["approved", "rejected"].includes(env.STATE)) throw new Error("STATE must be approved or rejected");
    const cfg = config(env);
    const body = { sha: env.TESTED, state: env.STATE, lane: `accept ${short(env.ACCEPT)}` };
    const r = cfg ? await call(cfg, "POST", "/v1/verdicts", body) : { ok: false, why: "no store configured" };
    console.log(
        r.ok
            ? `recorded ${env.STATE} on ${env.TESTED}`
            : `::warning::the results store did not record ${env.STATE} on ${env.TESTED} (${r.why})`,
    );
    if (env.STATE !== "rejected") return;
    const h = cfg ? await call(cfg, "GET", "/v1/candidate") : { ok: false };
    const issue = h.ok ? h.data.hold?.issue : null;
    if (issue)
        commentOn(
            issue,
            `The approval ${env.ACCEPT} of ${env.TESTED} did not promote: ${env.WHY}. ${env.RUN_URL ?? ""}`.trim(),
        );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const cmd = { check, record }[process.argv[2]];
    if (!cmd) {
        console.error("usage: node tools/channel/resume.mjs check | record (see the head of the file)");
        process.exit(2);
    }
    try {
        await cmd(process.env);
    } catch (error) {
        // a full slot's catch-up is a side trip: an error there (a GitHub 5xx, git) leaves the slot to test as it
        // would have, and the next slot asks again; promote-nightly exists to promote, so it fails
        if (process.argv[2] === "check" && process.env.MODE !== "promote-nightly") {
            console.log(`::warning::no catch-up this slot: ${error.message.split("\n")[0]}`);
            output({ resume: "false", why: `no catch-up: ${error.message.split("\n")[0]}` });
        } else {
            console.log(`::error::${error.message}`);
            process.exitCode = 1;
        }
    }
}
