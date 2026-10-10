import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The names in a directory, or none when it does not exist.
 * @param {string} dir the directory
 * @returns {string[]} its entries
 */
const entries = (dir) => {
    try {
        return readdirSync(dir);
    } catch {
        return [];
    }
};

/**
 * Fails the run if a test created anything in the developer's real ~/.githerd (issue #1783).
 * test/temp-home.setup.mjs points HOME at a temporary directory in every test file; this global
 * setup runs in vitest's main process, where HOME is still the real one.
 * @returns {() => void} the teardown that compares the directory with its state before the run
 */
export default function setup() {
    const dir = join(homedir(), ".githerd");
    const before = new Set(entries(dir));
    return () => {
        const added = entries(dir).filter((e) => !before.has(e));
        if (added.length > 0) {
            throw new Error(
                `the tests created ${added.length} entries in the real ${dir} (each test must use a temporary HOME): ${added.slice(0, 5).join(", ")}`,
            );
        }
    };
}
