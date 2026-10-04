import { execFileSync } from "node:child_process";

import type { Plugin } from "vite";

/**
 * Which build a page is, so a study transcript and a bug report can name it: the commit and the
 * latest graphty release tag (`graphty@<version>`), not package.json's version, which the
 * deployed artifacts predate.
 */
export interface BuildStamp {
    readonly commit: string;
    readonly release: string;
}

/** Runs git and returns its trimmed output, or null when git fails (no repository, no tag). */
type Git = (args: readonly string[]) => string | null;

const git: Git = (args) => {
    try {
        const options = { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] } as const;
        const out = execFileSync("git", args, options).trim(); // NOSONAR(S4036): build-time script runs the developer's or CI's own git
        return out === "" ? null : out;
    } catch {
        return null;
    }
};

/**
 * Reads the stamp from git: the short commit (CI's GITHUB_SHA when git has none) and the latest
 * reachable graphty release tag.
 * @param run - runs git; the real git by default.
 * @param env - the environment; process.env by default.
 * @returns the stamp, with "unknown" and "unreleased" where git cannot say.
 */
export function readBuildStamp(run: Git = git, env: NodeJS.ProcessEnv = process.env): BuildStamp {
    const commit = run(["rev-parse", "--short=12", "HEAD"]) ?? env.GITHUB_SHA?.slice(0, 12) ?? "unknown";
    const release = run(["describe", "--tags", "--match", "graphty@*", "--abbrev=0", "HEAD"]) ?? "unreleased";
    return { commit, release };
}

/**
 * Writes `<meta name="graphty-build" content="<commit> <release>">` into the page's head.
 * graphty/project.json makes the build depend on the commit, so a cached build never carries
 * another commit's stamp.
 * @param stamp - the stamp; read from git by default.
 * @returns the Vite plugin.
 */
export function buildStampPlugin(stamp: BuildStamp = readBuildStamp()): Plugin {
    return {
        name: "graphty-build-stamp",
        transformIndexHtml: () => [
            {
                tag: "meta",
                attrs: { name: "graphty-build", content: `${stamp.commit} ${stamp.release}` },
                injectTo: "head",
            },
        ],
    };
}
