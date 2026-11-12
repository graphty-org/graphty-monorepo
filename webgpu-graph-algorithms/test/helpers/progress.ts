/**
 * Progress lines for long tests. The node shard wrapper (scripts/run-node-shard.js) fails a run that writes nothing
 * for 90 s, so a test that computes for longer prints where it is (issue #2158). Vitest sends a worker's console
 * output from a microtask, so a line logged right before synchronous work would wait until that work ends; this lets
 * the event loop turn once after logging, which sends the line.
 */

/**
 * Logs `line` to stderr and lets the event loop turn once, so the line leaves the worker before the caller goes on.
 * @param line - the progress line
 */
export async function progressLine(line: string): Promise<void> {
    console.warn(line);
    await new Promise((done) => {
        setImmediate(done);
    });
}
