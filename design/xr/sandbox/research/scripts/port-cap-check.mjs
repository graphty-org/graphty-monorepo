// Shows that remote-log-server refuses any requested port above 9099, without starting a server.
const { findAvailablePort } =
    await import("/home/apowers/Projects/graphty-monorepo/.worktrees/feat-xr-technique-sandbox/remote-logger/dist/server/dual-server.js");
try {
    console.log("9500 ->", await findAvailablePort(9500, "127.0.0.1", true));
} catch (e) {
    console.log("9500 -> ERROR:", e.message);
}
