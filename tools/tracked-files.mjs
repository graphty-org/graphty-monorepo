// The files git tracks in this checkout, so a repository-wide test checks what CI checks out and never
// an untracked or ignored scratch file (tmp/, .worktrees/) that only exists on one machine (#5712).
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * The tracked files whose repository-relative path matches a pattern.
 * @param pattern - tested against each path, with forward slashes, relative to the repository root
 * @param root - the checkout to list (this one by default)
 * @returns the matching paths, in git's order
 */
export function trackedFiles(pattern, root = ROOT) {
    return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 })
        .split("\0")
        .filter((f) => f && pattern.test(f));
}
