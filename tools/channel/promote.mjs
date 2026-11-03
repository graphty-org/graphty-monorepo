#!/usr/bin/env node
// Production promotion (and nightly rollback) for promote.yml (design/ci/channels-pipeline/channels.md,
// section 8). The workflow stays thin: every decision is here, and every refusal has a test
// (tools/channel/promote.test.mjs).
//
//   gather  --nightly <newest|commit> --channel <production|nightly> [--config-only] --out <dir>
//           reads everything a promotion depends on (the nightly's release assets, the results store's
//           record of them, what the channel serves now, the publish hold, npm) into <dir>/facts.json
//   check   <facts.json>     prints the plan (JSON) or the refusals, exit 1 on any refusal
//   trust   <plan.json>      npm trusted publishing lets this job set the dist-tag of every package the plan moves
//           (re-sets each tag to its current version: moves nothing, so a dry run runs it too)
//   move    <plan.json>      npm dist-tag add for every move (idempotent: a re-run moves the rest)
//   record  <plan.json> --config <graphty/sites/<site>.json> --config-ref <commit> --approver <login> --out <dir>
//           writes deployed.json and channel.json for the site repository
//   wait    <plan.json> --config <graphty/sites/<site>.json>
//           returns once the site serves the plan's build stamp and site.json (the step's
//           timeout-minutes is the hang guard)
//   releases <plan.json>     production only: clears the prerelease mark on the moved packages' GitHub
//           releases, marks the newest "Latest" and appends "Changes since <previous latest>"
//
// gather and releases need GH_TOKEN; gather reads RESULTS_URL and the job's OIDC token for the store.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const REPO = "graphty-org/graphty-monorepo";
export const TARGETS = {
    production: { distTag: "latest", siteRepo: "graphty-org/graphty-site", url: "https://graphty.app" },
    nightly: { distTag: "next", siteRepo: "graphty-org/graphty-nightly", url: "https://nightly.graphty.app" },
};
const SITE_TAG = /^site-[0-9a-f]{40}$/;
const HOLD_TITLE = "Release held: publish failed";

/**
 * The npm package of an nx project: a project named after its package (remote-logger's is
 * "@graphty/remote-logger") is that package, the rest are "@graphty/<project>". The release tag is
 * `<project>@<version>` either way.
 * @param project - an nx project name, as channel.json's `versions` keys it
 * @returns the package name
 */
const UNSCOPED = new Set(["babylonjs-map"]);
export const packageOf = (project) =>
    project.startsWith("@") || UNSCOPED.has(project) ? project : `@graphty/${project}`;

/**
 * Refusals about whether the assets can be trusted: the tag's shape, and the hashes the nightly job wrote
 * to the store.
 * @param facts - see decide
 * @returns refusals
 */
function trustRefusals(facts) {
    const { target, tag, hashes, store } = facts;
    const refusals = [];
    if (!TARGETS[target]) refusals.push(`unknown channel ${JSON.stringify(target)}`);
    if (!SITE_TAG.test(tag ?? "")) refusals.push(`${JSON.stringify(tag)} is not a site-<commit> tag`);
    if (!store) return [...refusals, `the results store has no record of ${tag}, so its assets cannot be trusted`];
    if (hashes.site !== store.siteSha256)
        refusals.push(`site.tar.zst of ${tag} has sha256 ${hashes.site}, the store recorded ${store.siteSha256}`);
    if (hashes.channel !== store.channelSha256)
        refusals.push(`channel.json of ${tag} has sha256 ${hashes.channel}, the store recorded ${store.channelSha256}`);
    return refusals;
}

/**
 * Refusals about the nightly itself: its verdict, its record, the publish hold and a rollback's format.
 * @param facts - see decide
 * @returns refusals
 */
function nightlyRefusals(facts) {
    const { target, tag, nightly, store, current, ancestry, publishHoldOpen } = facts;
    const refusals = [];
    const verdict = store?.verdict;
    // green-clean with an owner-signed baselines tree records approved:<tree> (release.yml's screenshot gate)
    const approvedTree = /^approved:[0-9a-f]{40}$/.test(nightly.screenshots ?? "");
    const clean = verdict === "green-clean" && (nightly.screenshots === "unchanged" || approvedTree);
    const approved = verdict === "approved" && approvedTree;
    if (!clean && !approved)
        refusals.push(
            `${tag} was not a clean or approved nightly (verdict ${verdict ?? "none"}, screenshots ${nightly.screenshots ?? "none"})`,
        );
    if (nightly.channel !== "nightly" || `site-${nightly.commit}` !== tag)
        refusals.push(
            `channel.json of ${tag} is not that commit's nightly record (${nightly.channel} ${nightly.commit})`,
        );
    if (publishHoldOpen) refusals.push(`a "${HOLD_TITLE}" issue is open; promote once it is cleared`);
    if (ancestry === "diverged") refusals.push(`${nightly.commit} and ${current.commit} are not on one line of master`);
    if (ancestry === "older" && nightly.autosaveFormat !== current.autosaveFormat)
        refusals.push(
            `rolling ${target} back from ${current.commit} to ${nightly.commit} crosses an autosave or project format change (${current.autosaveFormat} to ${nightly.autosaveFormat}); fix forward instead`,
        );
    return refusals;
}

/**
 * The dist-tag moves, and a refusal for each version npm does not have.
 * @param versions - channel.json's versions, project to version
 * @param npm - package to { versions, distTags }, or null when it could not be read
 * @param distTag - latest or next
 * @returns the refusals and the moves
 */
function tagMoves(versions, npm, distTag) {
    const refusals = [];
    const moves = [];
    for (const [project, version] of Object.entries(versions ?? {})) {
        const name = packageOf(project);
        const info = npm[name];
        if (!info) refusals.push(`npm has no ${name}, or its dist-tags could not be read`);
        else if (!info.versions.includes(version)) refusals.push(`${name}@${version} is not on npm`);
        else if (info.distTags[distTag] !== version)
            moves.push({ project, package: name, version, from: info.distTags[distTag] ?? null });
    }
    return { refusals, moves };
}

/**
 * Decides a promotion from the facts gather collected. Pure: every refusal case is a test.
 * @param facts - { target, configOnly, tag, nightly, hashes: { site, channel }, store, current,
 *   ancestry: "same" | "newer" | "older" | "diverged" | null, publishHoldOpen, npm: { <package>: { versions, distTags } | null } }
 * @returns the refusals (strings, empty when it may go) and the plan
 */
export function decide(facts) {
    const { target, configOnly, tag, nightly, store, current, ancestry, npm } = facts;
    const distTag = TARGETS[target]?.distTag;
    // config_only redeploys what the channel serves: it moves no tag, so only the assets' trust matters
    const tags = configOnly ? { refusals: [], moves: [] } : tagMoves(nightly.versions, npm, distTag);
    const refusals = [...trustRefusals(facts), ...(configOnly ? [] : nightlyRefusals(facts)), ...tags.refusals];
    const record = configOnly ? current : nightly;
    return {
        refusals,
        plan: {
            target,
            distTag,
            configOnly: Boolean(configOnly),
            tag,
            commit: record?.commit,
            versionCommit: record?.versionCommit,
            siteSha256: store?.siteSha256,
            rollback: ancestry === "older",
            moves: tags.moves,
            nightly: record,
        },
    };
}

/**
 * The moved packages npm's trusted publishing refuses this job for.
 * @param moves - the plan's moves
 * @param check - a move to the HTTP status of the check (an error status when npm has no trusted publisher
 *   naming this workflow and environment, or one without "Allow npm dist-tag")
 * @returns "<package> (<status>)" for each package refused
 */
export async function untrusted(moves, check) {
    const refused = [];
    for (const m of moves) {
        const status = await check(m);
        if (status < 200 || status > 299) refused.push(`${m.package} (${status})`);
    }
    return refused;
}

/**
 * The two files a promotion pushes to the site repository: deployed.json (what deploy.yml checks and
 * deploys) and channel.json (what the channel serves, read by the next promotion's rollback check).
 * @param plan - the checked plan
 * @param options - what the records name
 * @param options.configBlob - the blob id of graphty/sites/<site>.json used
 * @param options.configRef - the commit that file is read from
 * @param options.approver - who approved the promotion
 * @param options.time - when, ISO 8601
 * @returns the two records, deployed and channel
 */
export function records(plan, { configBlob, configRef, approver, time }) {
    const deployed = { site: plan.target, tag: plan.tag, sha256: plan.siteSha256, configRef, time, approver };
    const channel = { ...plan.nightly, channel: plan.target, siteConfigBlob: configBlob, siteSha256: plan.siteSha256 };
    if (!plan.configOnly) Object.assign(channel, { promotedAt: time, promotedBy: approver });
    return { deployed, channel };
}

/**
 * The commit a page's build stamp names.
 * @param html - a page, `<meta name="graphty-build" content="commit=<sha> release=<tag>">` in it
 * @returns the commit, or null
 */
export const stampCommit = (html) => /name="graphty-build" content="commit=([0-9a-f]{40})/.exec(html)?.[1] ?? null;

/**
 * A GitHub release body with the changes since the previous `latest`, added once.
 * @param body - the release's body
 * @param move - one plan move
 * @returns the new body
 */
export function withChangesSince(body, move) {
    if (!move.from || body.includes(`Changes since ${move.from}`)) return body;
    const url = `https://github.com/${REPO}/compare/${move.project}@${move.from}...${move.project}@${move.version}`;
    return `${body}\n\n## Changes since ${move.from}\n\n${url}\n`;
}

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", ...opts });
const gh = (...args) => run("gh", args);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

async function sha256File(path) {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest("hex");
}

/**
 * What a site repository serves now.
 * @param siteRepo - owner/name
 * @returns its channel.json, or null before its first promotion
 */
function servedRecord(siteRepo) {
    try {
        return JSON.parse(
            gh("api", `repos/${siteRepo}/contents/channel.json`, "-H", "Accept: application/vnd.github.raw"),
        );
    } catch (err) {
        if (/404|Not Found/.test(`${err.stderr ?? err.message}`)) return null;
        throw err;
    }
}

function newestNightly(wanted) {
    const tags = JSON.parse(gh("release", "list", "--repo", REPO, "--limit", "200", "--json", "tagName,createdAt"))
        .filter((r) => SITE_TAG.test(r.tagName))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((r) => r.tagName);
    const tag = wanted === "newest" ? tags[0] : tags.find((t) => t.startsWith(`site-${wanted}`));
    if (!tag || !/^(newest|[0-9a-f]{7,40})$/.test(wanted))
        throw new Error(`no nightly matches ${JSON.stringify(wanted)}`);
    return tag;
}

/**
 * The results store's record of a nightly (GET /v1/site): the sha256 of its site.tar.zst and channel.json, and
 * its verdict. Null when the store has none, which decide refuses ("cannot be trusted"); the store's reason goes
 * to stderr, so a store that does not serve the route yet is told apart from a nightly it never recorded.
 * @param sha - the nightly's tested commit
 * @param [deps] - what tests inject
 * @param [deps.env] - RESULTS_URL and the Actions OIDC request variables
 * @param [deps.fetch] - the fetch to use
 * @returns the record (siteSha256, channelSha256, verdict, ...), or null
 */
export async function storeRecord(sha, { env = process.env, fetch: doFetch = fetch } = {}) {
    const { RESULTS_URL, ACTIONS_ID_TOKEN_REQUEST_URL: idUrl, ACTIONS_ID_TOKEN_REQUEST_TOKEN: idToken } = env;
    if (!RESULTS_URL || !idUrl) {
        console.error("no RESULTS_URL or Actions OIDC token, so the results store was not asked");
        return null;
    }
    const oidc = await doFetch(`${idUrl}&audience=graphty-results`, {
        headers: { Authorization: `bearer ${idToken}` },
    });
    const token = (await oidc.json()).value;
    const res = await doFetch(`${RESULTS_URL}/v1/site?sha=${sha}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) {
        const { error } = await res.json().catch(() => ({}));
        console.error(`the results store has no record of site ${sha}: ${error ?? "404"}`);
        return null;
    }
    if (!res.ok) throw new Error(`the results store answered ${res.status} for site ${sha}`);
    return res.json();
}

function npmInfo(name) {
    try {
        const v = JSON.parse(run("npm", ["view", name, "versions", "dist-tags", "--json"]));
        return { versions: [v.versions].flat(), distTags: v["dist-tags"] };
    } catch {
        return null;
    }
}

async function gather({ nightly: wanted, channel: target, "config-only": configOnly, out }) {
    const { siteRepo } = TARGETS[target] ?? {};
    if (!siteRepo) throw new Error(`--channel must be production or nightly, got ${JSON.stringify(target)}`);
    mkdirSync(out, { recursive: true });
    const current = servedRecord(siteRepo);
    if (configOnly && !current) throw new Error(`${siteRepo} serves nothing yet, so there is nothing to redeploy`);
    const tag = configOnly ? `site-${current.commit}` : newestNightly(wanted);
    gh(
        "release",
        "download",
        tag,
        "--repo",
        REPO,
        "--pattern",
        "site.tar.zst",
        "--pattern",
        "channel.json",
        "--dir",
        out,
        "--clobber",
    );
    const nightly = readJson(join(out, "channel.json"));
    const hashes = {
        site: await sha256File(join(out, "site.tar.zst")),
        channel: await sha256File(join(out, "channel.json")),
    };
    const status =
        current && !configOnly
            ? gh("api", `repos/${REPO}/compare/${current.commit}...${nightly.commit}`, "--jq", ".status").trim()
            : null;
    const ancestry = { identical: "same", ahead: "newer", behind: "older", diverged: "diverged" }[status] ?? null;
    const holds = JSON.parse(
        gh(
            "issue",
            "list",
            "--repo",
            REPO,
            "--state",
            "open",
            "--search",
            `"${HOLD_TITLE}" in:title`,
            "--json",
            "title",
        ),
    );
    const npm = {};
    if (!configOnly)
        for (const project of Object.keys(nightly.versions ?? {}))
            npm[packageOf(project)] = npmInfo(packageOf(project));
    const facts = {
        target,
        configOnly: Boolean(configOnly),
        tag,
        nightly,
        hashes,
        store: await storeRecord(tag.slice("site-".length)),
        current,
        ancestry,
        publishHoldOpen: holds.some((i) => i.title.startsWith(HOLD_TITLE)),
        npm,
    };
    writeFileSync(join(out, "facts.json"), `${JSON.stringify(facts, null, 2)}\n`);
    return 0;
}

async function waitFor(plan, configPath) {
    const { url } = TARGETS[plan.target];
    const want = readJson(configPath);
    for (;;) {
        try {
            const [page, site] = await Promise.all([
                fetch(`${url}/?promote=${Date.now()}`).then((r) => r.text()),
                fetch(`${url}/site.json?promote=${Date.now()}`).then((r) => (r.ok ? r.json() : null)),
            ]);
            if (stampCommit(page) === plan.commit && isDeepStrictEqual(site, want)) {
                console.log(`${url} serves ${plan.commit} with ${configPath}`);
                return 0;
            }
        } catch (err) {
            console.log(`not yet: ${err.message}`);
        }
        // ponytail: polls every 20 s for the public stamp; the store's deploy report is the faster signal once it has a read for it
        await new Promise((r) => setTimeout(r, 20_000));
    }
}

function releases(plan) {
    for (const move of plan.moves) {
        const tag = `${move.project}@${move.version}`;
        const body = JSON.parse(gh("release", "view", tag, "--repo", REPO, "--json", "body")).body ?? "";
        gh(
            "release",
            "edit",
            tag,
            "--repo",
            REPO,
            "--prerelease=false",
            "--latest=false",
            "--notes",
            withChangesSince(body, move),
        );
    }
    const newest = plan.moves.at(-1);
    if (newest) gh("release", "edit", `${newest.project}@${newest.version}`, "--repo", REPO, "--latest");
    return 0;
}

async function main(argv) {
    const { values, positionals } = parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
            nightly: { type: "string", default: "newest" },
            channel: { type: "string", default: "production" },
            "config-only": { type: "boolean", default: false },
            out: { type: "string" },
            config: { type: "string" },
            "config-ref": { type: "string" },
            approver: { type: "string" },
        },
    });
    const [command, file] = positionals;
    if (command === "gather") return gather(values);
    const handler = COMMANDS[command];
    if (!handler) {
        console.error("usage: promote.mjs gather|check|trust|move|record|wait|releases (see the header)");
        return 2;
    }
    return handler(readJson(file), values);
}

function check(facts) {
    const { refusals, plan } = decide(facts);
    for (const r of refusals) console.error(`refused: ${r}`);
    if (refusals.length > 0) return 1;
    console.log(JSON.stringify(plan, null, 2));
    return 0;
}

// For each moved package: the token exchange npm dist-tag makes (npm/cli lib/utils/oidc.js), then a PUT of the
// tag's current version, which changes nothing but proves the dist-tag permission (npm dist-tag add skips the
// PUT when the version is unchanged, so it cannot). A package with no tag yet is only exchanged.
async function trust(plan) {
    const { ACTIONS_ID_TOKEN_REQUEST_URL: idUrl, ACTIONS_ID_TOKEN_REQUEST_TOKEN: idToken } = process.env;
    if (!idUrl) throw new Error("no OIDC token: the job needs permissions id-token: write");
    const oidc = await fetch(`${idUrl}&audience=npm:registry.npmjs.org`, {
        headers: { Authorization: `bearer ${idToken}` },
    });
    const jwt = (await oidc.json()).value;
    const registry = "https://registry.npmjs.org/-";
    const check = async ({ package: name, from }) => {
        const escaped = name.replace("/", "%2f");
        const res = await fetch(`${registry}/npm/v1/oidc/token/exchange/package/${escaped}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${jwt}` },
        });
        if (!res.ok || !from) return res.status;
        const put = await fetch(`${registry}/package/${escaped}/dist-tags/${plan.distTag}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${(await res.json()).token}`, "content-type": "application/json" },
            body: JSON.stringify(from),
        });
        return put.status;
    };
    const refused = await untrusted(plan.moves, check);
    if (refused.length > 0)
        console.error(
            `refused: npm has no trusted publisher for promote.yml (environment production, Allow npm dist-tag) on ${refused.join(", ")}`,
        );
    else console.log(`npm trusts this workflow for ${plan.moves.map((m) => m.package).join(", ") || "no package"}`);
    return refused.length > 0 ? 1 : 0;
}

function move(plan) {
    for (const m of plan.moves)
        run("npm", ["dist-tag", "add", `${m.package}@${m.version}`, plan.distTag], { stdio: "inherit" });
    return 0;
}

function record(plan, values) {
    const configBlob = run("git", ["rev-parse", `${values["config-ref"]}:${values.config}`]).trim();
    const time = new Date().toISOString();
    const r = records(plan, { configBlob, configRef: values["config-ref"], approver: values.approver, time });
    mkdirSync(values.out, { recursive: true });
    for (const [name, data] of Object.entries(r))
        writeFileSync(join(values.out, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
    return 0;
}

const COMMANDS = {
    check,
    trust,
    move,
    record,
    wait: (plan, values) => waitFor(plan, values.config),
    releases,
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    process.exitCode = await main(process.argv.slice(2));
}
