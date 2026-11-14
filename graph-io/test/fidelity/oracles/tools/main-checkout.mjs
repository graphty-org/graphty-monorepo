// The main checkout, where the oracle tools are installed under tmp/: a worktree's own tmp/ is usually empty.
// Found from git's common directory, so it is right from the main checkout and from any worktree.
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { isolatedGitEnv } from "../../../../../tools/isolated-git-env.mjs";

export const mainCheckout = dirname(
    execFileSync(
        "git",
        ["-C", dirname(fileURLToPath(import.meta.url)), "rev-parse", "--path-format=absolute", "--git-common-dir"],
        { encoding: "utf8", env: isolatedGitEnv() },
    ).trim(),
);
