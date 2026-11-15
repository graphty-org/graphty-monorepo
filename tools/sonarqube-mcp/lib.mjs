import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The main checkout, also when this runs from a worktree: the shared server's URL file lives there only.
 * @returns its absolute path
 */
export function mainCheckout() {
    const here = dirname(fileURLToPath(import.meta.url));
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
        cwd: here,
        encoding: "utf8",
    }).trim();
    return dirname(common);
}

/**
 * Every message in a text/event-stream body: the data lines of each event, joined.
 * @param text the response body
 * @returns one string per event that carries data
 */
export function sseMessages(text) {
    return text
        .split(/\r?\n\r?\n/)
        .map((event) =>
            event
                .split(/\r?\n/)
                .filter((l) => l.startsWith("data:"))
                .map((l) => l.slice(5).replace(/^ /, ""))
                .join("\n"),
        )
        .filter((data) => data.length > 0);
}
