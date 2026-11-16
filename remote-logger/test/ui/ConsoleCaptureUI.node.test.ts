// @vitest-environment node
/**
 * ConsoleCaptureUI outside a browser (server-side rendering, Node scripts): there is no
 * document or window, so it must still capture console output and treat every UI action
 * as a harmless no-op instead of throwing.
 */
import { afterEach, describe, expect, test } from "vitest";

import { ConsoleCaptureUI } from "../../src/ui/index.js";

describe("ConsoleCaptureUI without a DOM", () => {
    const originalLog = console.log;
    let ui: ConsoleCaptureUI | null = null;

    afterEach(() => {
        ui?.destroy();
        ui = null;
        console.log = originalLog;
    });

    test("runs in an environment with no document or window", () => {
        expect(typeof document).toBe("undefined");
        expect(typeof window).toBe("undefined");
    });

    test("captures console output and formats it", () => {
        ui = new ConsoleCaptureUI();
        console.log("node message", { n: 1 });
        expect(ui.getLogs()).toContain("[LOG] node message");
        expect(ui.getLogs()).toContain('"n": 1');
    });

    test("copy, download and clear do not throw without a DOM", async () => {
        ui = new ConsoleCaptureUI();
        console.log("kept until cleared");

        await expect(ui.copyLogs()).resolves.toBeUndefined();
        expect(() => ui?.downloadLogs()).not.toThrow();
        expect(ui.getLogs()).toContain("kept until cleared");

        ui.clearLogs();
        expect(ui.getLogs()).not.toContain("kept until cleared");
    });

    test("destroy stops capturing and hands console calls back to the original", () => {
        const seen: unknown[] = [];
        console.log = (...args: unknown[]) => {
            seen.push(args[0]);
        };
        const captured = new ConsoleCaptureUI();
        console.log("during");
        captured.destroy();
        console.log("after");
        expect(seen).toEqual(["during", "after"]);
        expect(captured.getLogs()).toContain("during");
        expect(captured.getLogs()).not.toContain("after");
    });
});
