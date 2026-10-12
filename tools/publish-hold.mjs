#!/usr/bin/env node
// A publish hold ("Release held: publish failed on <sha>", release.yml) that npm itself will end.
//
// npm can accept an upload ("Published to https://registry.npmjs.org/") and still not list the version for over
// an hour (#2202: compact-mantine@0.9.20 took 13 to 96 minutes), longer than the publish job's registry check
// waits. Such a hold needs nobody: the version is on its way. A version npm refused, or never got, still needs a
// person, so only these two cases are told apart:
//
//   classify  (the publish job's report step) prints the marker the hold's body or comment carries:
//             "<!-- publish-hold: awaiting-registry a@1 b@2 -->" when npm accepted every version not yet listed,
//             "<!-- publish-hold: rejected -->" otherwise (a refused upload, a skipped package, no check at all)
//   settle    (release.yml's pick job, on every train attempt and every master push whose build passed) reads the
//             newest marker the workflow wrote on the hold; when it says awaiting-registry and npm now lists every
//             version it names, closes the hold and announces the release on the Release status issue. npm sends
//             no event when it lists a version, so those runs are the clock; nothing else waits on a timer.
//
// Usage: node tools/publish-hold.mjs classify --log <publish.log> --absent <file, one name@version a line>
//        node tools/publish-hold.mjs settle --issue <number> --run <URL>
// settle needs GITHUB_TOKEN (issues: write) and GITHUB_REPOSITORY; RELEASE_NOTIFY is optional.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { announce, push, statusComment } from "./release-status.mjs";

const MARKER = /<!-- publish-hold: (awaiting-registry|rejected)((?: \S+)*) -->/g;
// Answers that mean npm has the version: it accepted the upload now, or an earlier attempt's upload is still
// propagating (E409, npm/cli#9889) or already published.
const ACCEPTED =
    /Published to https:\/\/registry\.npmjs\.org\/|previously staged version|cannot publish over the previously published version/i;
const COLOR = new RegExp(`${String.fromCodePoint(27)}\\[[0-9;]*m`, "g");
// The only author whose markers count: anyone can comment on an issue of a public repository.
export const BOT = "github-actions[bot]";

/**
 * The versions npm accepted, read from `nx release publish`'s output. nx prints each package's tarball details
 * (name:, version:) and then npm's answer.
 * @param log - the output, colors and all
 * @returns name@version strings
 */
export function acceptedSpecs(log) {
    const accepted = new Set();
    let name = "";
    let version = "";
    for (const line of log.replaceAll(COLOR, "").split("\n")) {
        if (/nx run \S+:nx-release-publish/.test(line)) {
            name = version = "";
        }
        name = /^\s*(?:npm notice\s+)?name:\s+(\S+)\s*$/.exec(line)?.[1] ?? name;
        version = /^\s*(?:npm notice\s+)?version:\s+(\S+)\s*$/.exec(line)?.[1] ?? version;
        if (name && version && ACCEPTED.test(line)) {
            accepted.add(`${name}@${version}`);
        }
    }
    return accepted;
}

/**
 * The marker for a failed publish.
 * @param absent - the versions the registry check could not find (empty: the check never ran or found them all)
 * @param log - the publish output ("" when there is none)
 * @returns the marker line
 */
export function classify(absent, log) {
    const accepted = acceptedSpecs(log);
    return absent.length > 0 && absent.every((s) => accepted.has(s))
        ? `<!-- publish-hold: awaiting-registry ${absent.join(" ")} -->`
        : "<!-- publish-hold: rejected -->";
}

/**
 * What the hold is waiting for, from the newest marker the workflow wrote on it.
 * @param posts - the issue body, then its comments, oldest first, each { body, user: { login } }
 * @returns awaiting: the versions npm accepted and must still list (empty: a person must act)
 */
export function verdict(posts) {
    let awaiting = [];
    for (const p of posts) {
        if (p.user?.login !== BOT) {
            continue;
        }
        for (const [, state, specs] of (p.body ?? "").matchAll(MARKER)) {
            awaiting = state === "awaiting-registry" ? specs.trim().split(" ") : [];
        }
    }
    return { awaiting };
}

/**
 * Close the hold when npm lists everything it is waiting for.
 * @param opts - the hold
 * @param opts.request - (method, path, body) => parsed JSON
 * @param opts.repo - owner/name
 * @param opts.issue - the hold's number
 * @param opts.run - this run's URL
 * @param opts.listed - (name@version) => whether npm lists it
 * @returns closed, awaiting, and missing: what npm still does not list
 */
export async function settle({ request, repo, issue, run, listed }) {
    const hold = await request("GET", `/repos/${repo}/issues/${issue}`);
    const comments = await request("GET", `/repos/${repo}/issues/${issue}/comments?per_page=100`);
    const { awaiting } = verdict([hold, ...comments]);
    const missing = awaiting.filter((s) => !listed(s));
    if (awaiting.length === 0 || missing.length > 0) {
        return { closed: false, awaiting, missing };
    }
    await request("POST", `/repos/${repo}/issues/${issue}/comments`, {
        body: `npm now lists every version this hold was waiting for (${awaiting.join(", ")}); npm had accepted each upload, it was only slow to list it. Nothing was missing. Closed by ${run}.`,
    });
    await request("PATCH", `/repos/${repo}/issues/${issue}`, { state: "closed", state_reason: "completed" });
    return { closed: true, awaiting, missing };
}

/**
 * Does npm list this version? The same question the publish job's registry check asks.
 * @param spec - name@version
 * @returns true when `npm view` answers that version
 */
export function npmLists(spec) {
    try {
        return execFileSync("npm", ["view", spec, "version"], { encoding: "utf8" }).trim() === spec.split("@").pop();
    } catch {
        return false;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: Object.fromEntries(["log", "absent", "issue", "run"].map((k) => [k, { type: "string" }])),
    });
    const read = (f) => (f && existsSync(f) ? readFileSync(f, "utf8") : "");
    if (positionals[0] === "classify") {
        console.log(classify(read(values.absent).split(/\s+/).filter(Boolean), read(values.log)));
        process.exit(0);
    }
    if (positionals[0] !== "settle") {
        console.error("usage: publish-hold.mjs classify --log F --absent F | settle --issue N --run URL");
        process.exit(2);
    }
    const request = async (method, path, data) => {
        const res = await fetch(`https://api.github.com${path}`, {
            method,
            headers: {
                authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                accept: "application/vnd.github+json",
                "content-type": "application/json",
            },
            body: data && JSON.stringify(data),
        });
        if (!res.ok) {
            throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
        }
        return res.json();
    };
    const repo = process.env.GITHUB_REPOSITORY;
    const r = await settle({ request, repo, issue: values.issue, run: values.run, listed: npmLists });
    if (!r.closed) {
        console.log(
            r.awaiting.length === 0
                ? `#${values.issue} holds a publish npm did not accept; a person must act (see the issue)`
                : `#${values.issue}: npm accepted, but does not list yet: ${r.missing.join(" ")}`,
        );
        process.exit(0);
    }
    console.log(`#${values.issue} closed: npm lists ${r.awaiting.join(" ")}`);
    const f = { run: values.run, tags: r.awaiting.join(",") };
    await announce({ request, repo, body: statusComment("published", f, process.env.RELEASE_NOTIFY ?? "") });
    await push("published", f);
}
