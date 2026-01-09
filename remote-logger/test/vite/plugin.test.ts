import { describe, expect, test, vi } from "vitest";

import { remoteLoggerPlugin } from "../../src/vite/plugin.js";

// Mock process.cwd to control the working directory
vi.spyOn(process, "cwd");

describe("remoteLoggerPlugin", () => {
    test("returns a Vite plugin with correct name", () => {
        const plugin = remoteLoggerPlugin();

        expect(plugin.name).toBe("remote-logger");
    });

    test("injects __REMOTE_LOG_PROJECT_MARKER__ based on cwd worktree path", () => {
        vi.mocked(process.cwd).mockReturnValue("/home/user/project/.worktrees/remote-logging");

        const plugin = remoteLoggerPlugin();
        const configFn = plugin.config as () => { define: Record<string, string> };
        const config = configFn();

        expect(config.define.__REMOTE_LOG_PROJECT_MARKER__).toBe(JSON.stringify("remote-logging"));
    });

    test("injects __REMOTE_LOG_WORKTREE_PATH__ with full cwd path", () => {
        vi.mocked(process.cwd).mockReturnValue("/home/user/project/.worktrees/remote-logging");

        const plugin = remoteLoggerPlugin();
        const configFn = plugin.config as () => { define: Record<string, string> };
        const config = configFn();

        expect(config.define.__REMOTE_LOG_WORKTREE_PATH__).toBe(
            JSON.stringify("/home/user/project/.worktrees/remote-logging"),
        );
    });

    test("extracts marker from regular project path (uses basename)", () => {
        vi.mocked(process.cwd).mockReturnValue("/home/user/my-project");

        const plugin = remoteLoggerPlugin();
        const configFn = plugin.config as () => { define: Record<string, string> };
        const config = configFn();

        expect(config.define.__REMOTE_LOG_PROJECT_MARKER__).toBe(JSON.stringify("my-project"));
        expect(config.define.__REMOTE_LOG_WORKTREE_PATH__).toBe(JSON.stringify("/home/user/my-project"));
    });

    test("handles Windows paths", () => {
        vi.mocked(process.cwd).mockReturnValue("C:\\Users\\dev\\.worktrees\\feature-xyz");

        const plugin = remoteLoggerPlugin();
        const configFn = plugin.config as () => { define: Record<string, string> };
        const config = configFn();

        expect(config.define.__REMOTE_LOG_PROJECT_MARKER__).toBe(JSON.stringify("feature-xyz"));
        expect(config.define.__REMOTE_LOG_WORKTREE_PATH__).toBe(JSON.stringify("C:\\Users\\dev\\.worktrees\\feature-xyz"));
    });

    test("config function returns object with define property", () => {
        vi.mocked(process.cwd).mockReturnValue("/home/user/project");

        const plugin = remoteLoggerPlugin();

        expect(typeof plugin.config).toBe("function");

        const configFn = plugin.config as () => { define: Record<string, string> };
        const config = configFn();

        expect(config).toHaveProperty("define");
        expect(typeof config.define).toBe("object");
    });
});
