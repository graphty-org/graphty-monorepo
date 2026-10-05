/**
 * Release truth (design sections 4.3 and 4.7). A release is judged by npm against master's tags and
 * version commits, never by a release run's conclusion: a run that "failed" may have published
 * everything, and a run that "succeeded" may have skipped. Every function here is pure over text
 * and plain data the daemon read elsewhere: `git ls-remote --tags` output, npm registry answers,
 * release job logs, check-run annotations and the reference worktree's `nx release --dry-run`.
 * Times are epoch milliseconds.
 */

/**
 * @typedef {{project: string, dir: string, name: string}} Package one publishable workspace
 *   package: its nx project name (the tag prefix), its directory (the dry-run's manifest path)
 *   and its npm name
 * @typedef {{project: string, version: string, sha: string}} Tag a release tag
 * @typedef {Record<string, string[] | null>} Registry npm name to its published versions, null
 *   when npm answered 404
 * @typedef {{key: string, sha: string, reason: string,
 *   missing: {name: string, version: string}[], unlanded: boolean}} ReleaseIncident
 * @typedef {{name: string, version: string}} Propagating
 */

/**
 * Release tags from `git ls-remote --tags origin`. A tag is `{projectName}@{version}` (nx.json's
 * `releaseTagPattern`); nx writes annotated tags, so the peeled `^{}` line names the version commit.
 * @param {string} text the command's output
 * @returns {Tag[]} one per tag, with the commit it points at
 */
export function parseTags(text) {
    /** @type {Map<string, string>} */
    const shas = new Map();
    for (const line of text.split("\n")) {
        const m = /^([0-9a-f]{40})\s+refs\/tags\/(.+?)(\^\{\})?$/.exec(line.trim());
        if (m && (m[3] || !shas.has(m[2]))) shas.set(m[2], m[1]);
    }
    /** @type {Tag[]} */
    const tags = [];
    for (const [name, sha] of shas) {
        const at = name.lastIndexOf("@");
        if (at > 0) tags.push({ project: name.slice(0, at), version: name.slice(at + 1), sha });
    }
    return tags;
}

/**
 * Orders two semver strings. Pre-releases sort below their release; build metadata is ignored.
 * @param {string} a a version
 * @param {string} b a version
 * @returns {number} negative, zero or positive
 */
export function compareVersions(a, b) {
    const [ca, pa = ""] = a.split("+")[0].split(/-(.*)/s);
    const [cb, pb = ""] = b.split("+")[0].split(/-(.*)/s);
    const na = ca.split(".").map(Number);
    const nb = cb.split(".").map(Number);
    for (let i = 0; i < 3; i++) if (na[i] !== nb[i]) return (na[i] || 0) - (nb[i] || 0);
    if (pa === pb) return 0;
    if (!pa || !pb) return pa ? -1 : 1;
    return pa.localeCompare(pb, "en", { numeric: true });
}

/**
 * The versions npm refused with 409 "previously staged" in a release job's log: npm accepted them
 * moments earlier and is still propagating them, so they are not failures yet [INC2 12].
 * @param {string} log the job log
 * @returns {Set<string>} `name@version` for each
 */
export function stagedVersions(log) {
    const re =
        /409 Conflict - PUT https:\/\/registry\.npmjs\.org\/(\S+) - Cannot publish over previously staged version "([^"]+)"/g;
    return new Set([...log.matchAll(re)].map((m) => `${decodeURIComponent(m[1])}@${m[2]}`));
}

/**
 * Release truth: master's newest tag per package against npm and against master's history. A tag
 * whose version npm does not serve, or whose version commit master does not contain, is a release
 * half-state and one incident per version commit [INC1 2].
 *
 * Nothing is judged while a release job runs (it tags, publishes and lands in that order, so every
 * half-state is normal mid-job). A version npm answered 409 for is waited on, never paged, until
 * npm serves it: the registry lookup that shows it ends the wait, never elapsed time.
 * @param {{packages: Package[], tags: Tag[], registry: Registry, onMaster: (sha: string) => boolean,
 *   releaseRunning: boolean, staged?: Set<string>}} input `onMaster` says whether a commit is on
 *   master's history; `staged` comes from the newest release run's log
 * @returns {{incidents: ReleaseIncident[], propagating: Propagating[]}} incidents to open, and
 *   versions to look up again once a minute
 */
export function releaseTruth({ packages, tags, registry, onMaster, releaseRunning, staged = new Set() }) {
    /** @type {Map<string, ReleaseIncident>} */
    const bySha = new Map();
    /** @type {Propagating[]} */
    const propagating = [];
    if (releaseRunning) return { incidents: [], propagating };
    for (const pkg of packages) {
        const newest = tags
            .filter((t) => t.project === pkg.project)
            .sort((a, b) => compareVersions(b.version, a.version))[0];
        if (!newest) continue;
        const published = registry[pkg.name]?.includes(newest.version) ?? false;
        const landed = onMaster(newest.sha);
        if (published && landed) continue;
        if (!published && landed && staged.has(`${pkg.name}@${newest.version}`)) {
            propagating.push({ name: pkg.name, version: newest.version });
            continue;
        }
        const incident = bySha.get(newest.sha) ?? {
            key: `release:${newest.sha}`,
            sha: newest.sha,
            reason: "",
            missing: [],
            unlanded: !landed,
        };
        if (!published) incident.missing.push({ name: pkg.name, version: newest.version });
        bySha.set(newest.sha, incident);
    }
    const incidents = [...bySha.values()];
    for (const i of incidents) i.reason = halfStateReason(i, registry);
    return { incidents, propagating };
}

/**
 * One line saying which half-state a release is in.
 * @param {ReleaseIncident} i the incident
 * @param {Registry} registry npm's answers
 * @returns {string} the reason
 */
function halfStateReason(i, registry) {
    const parts = [];
    if (i.unlanded) parts.push(`version commit ${i.sha.slice(0, 8)} is tagged but not on master`);
    if (i.missing.length) {
        const list = i.missing.map(
            (m) => `${m.name}@${m.version}${registry[m.name] === null ? " (package not on npm at all)" : ""}`,
        );
        parts.push(`tagged but not on npm: ${list.join(", ")}`);
    }
    return parts.join("; ");
}

/**
 * The reference worktree's `nx release --dry-run` answer, run after `node tools/release-hold.mjs
 * apply` [S31]. nx prints one "New version <v> written to manifest: <dir>/package.json" line per
 * bumped project (some twice, with emoji and color around them), or "No files would be changed".
 * @param {string} text the dry-run's output
 * @returns {{dir: string, version: string}[] | null} the bumps (empty: nothing would publish), or
 *   null when the output says neither, which is a platform fault, not an answer
 */
export function parseDryRun(text) {
    /** @type {Map<string, string>} */
    const bumps = new Map();
    for (const m of text.matchAll(/New version (\S+) written to manifest: (\S+)\/package\.json/g))
        bumps.set(m[2], m[1]);
    if (bumps.size === 0 && !text.includes("No files would be changed")) return null;
    return [...bumps].map(([dir, version]) => ({ dir, version }));
}

/**
 * Release pending (design 4.3): the green commit's dry-run says what would publish. A bump npm
 * already serves is released; one it does not is waiting, until npm serves it. Waiting is never
 * an incident by itself: a release that does not happen shows as a failed or stalled release
 * train (master.mjs `releaseState`). Bumps of private projects (absent from `packages`) never
 * publish.
 * @param {{bumps: {dir: string, version: string}[], packages: Package[], registry: Registry}} input
 *   the green commit's dry-run bumps, the packages and npm's answers
 * @returns {{name: string, version: string}[]} the versions not on npm yet
 */
export function releasePending({ bumps, packages, registry }) {
    const byDir = new Map(packages.map((p) => [p.dir, p]));
    return bumps
        .map((b) => ({ pkg: byDir.get(b.dir), version: b.version }))
        .filter((b) => b.pkg && !registry[b.pkg.name]?.includes(b.version))
        .map((b) => ({ name: /** @type {Package} */ (b.pkg).name, version: b.version }));
}

/**
 * Reads a release run's gate notices from its check-run annotations [PF 9.5]. The gate skips with
 * `::notice::` and the run still succeeds [R7]; one skip needs the daemon: a green commit whose CI
 * run's artifacts expired (they are kept one day [R6]) is never released until CI runs on it
 * again, which recreates them and triggers the release on completion.
 * @param {{annotation_level: string, message: string}[]} annotations the gate job's annotations
 * @returns {{sha: string, ciRunId: number} | null} the CI run to re-run, or null
 */
export function expiredArtifacts(annotations) {
    for (const a of annotations) {
        const m = /^([0-9a-f]{40}) is green but CI run (\d+) no longer holds its builds/.exec(a.message);
        if (a.annotation_level === "notice" && m) return { sha: m[1], ciRunId: Number(m[2]) };
    }
    return null;
}
