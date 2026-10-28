#!/usr/bin/env node
/**
 * Whether the branch this push merges into (its push base, tools/push-base.mjs) changed the lint
 * configuration since this branch last merged it (issue #2985). The gate lints the pushed commit;
 * CI's Lint job lints the pull request's merge with its base. A rule that landed on the base after
 * the branch's last merge is in CI's lint and not in the gate's, so the gate passed code CI then
 * failed. When the base changed any lint configuration the gate refuses the push and says to merge
 * the base first; a base that changed none lints the same either way, so nothing is merged here.
 *
 *   node tools/lint-base-drift.mjs <base-ref>     (run in the checkout being pushed)
 *
 * Exit 0: no drift. Exit 1: drift (the files and the fix are printed) or git could not tell.
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// What decides a lint result besides the linted file itself: every ESLint config, the repository's
// own rules (tools/eslint-rules, <pkg>/eslint-rules, compact-mantine/eslint), the tsconfig ESLint's
// typed rules read, and the compiler settings every package's type-check (part of its lint) shares.
// ponytail: dependency bumps (an eslint plugin in package.json / pnpm-lock.yaml) are not counted;
// add the lockfile here if a plugin upgrade on master ever slips through the same way.
export const LINT_CONFIG_PATHS = [
    ":(glob)**/eslint.config.*",
    ":(glob)**/eslint-rules/**",
    ":(glob)**/eslint/**",
    ":(glob)**/tsconfig.eslint.json",
    "tsconfig.base.json",
];

/**
 * The lint configuration files `baseRef` changed since its merge base with HEAD.
 * @param cwd The checkout being pushed.
 * @param baseRef The push base, such as origin/master.
 * @param [env] The environment git runs with.
 * @returns The changed paths; empty when the lint configuration matches.
 */
export function lintBaseDrift(cwd, baseRef, env = process.env) {
    const git = (...args) => execFileSync("git", args, { cwd, env, encoding: "utf8" }).trim();
    const mergeBase = git("merge-base", baseRef, "HEAD");
    const out = git("diff", "--name-only", mergeBase, baseRef, "--", ...LINT_CONFIG_PATHS);
    return out ? out.split("\n") : [];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const baseRef = process.argv[2];
    if (!baseRef) {
        console.error("usage: lint-base-drift.mjs <base-ref>");
        process.exit(1);
    }
    let files;
    try {
        files = lintBaseDrift(process.cwd(), baseRef);
    } catch (err) {
        console.error(`Could not compare this branch's lint configuration with ${baseRef}: ${err.message}`);
        process.exit(1);
    }
    if (files.length > 0) {
        console.error(`${baseRef} changed the lint configuration since this branch last merged it:`);
        for (const f of files) console.error(`  ${f}`);
        console.error(
            `CI lints this branch merged with ${baseRef}, so this gate's lint would not match CI's.\n` +
                `Merge ${baseRef} first (git merge ${baseRef}; never rebase), then push again.`,
        );
        process.exit(1);
    }
}
