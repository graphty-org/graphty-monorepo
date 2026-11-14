// Browser profiles of real.mjs sessions and warm browsers. Each profile's name ends in the pid of the
// process that owns it, so one left behind by a process that was killed (SIGKILL, a crash, a failed
// close) is found by its dead pid and removed by the next browser that starts.
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const alive = (pid) => existsSync(`/proc/${pid}`);

// the profile folder of a browser owned by this process: <name>-<pid>
export const profileOf = (root, name, pid = process.pid) => join(root, `${name}-${pid}`);

/**
 * Removes every profile under <root> whose owning process is gone.
 * @param root - the folder holding the profiles
 * @returns the names of the profiles removed
 */
export function sweepProfiles(root) {
    if (!existsSync(root)) return [];
    const gone = readdirSync(root).filter((f) => {
        const pid = f.match(/-(\d+)$/)?.[1];
        // a folder not named by a pid is not one of ours
        return pid && !alive(pid);
    });
    for (const f of gone) rmSync(join(root, f), { recursive: true, force: true });
    return gone;
}
