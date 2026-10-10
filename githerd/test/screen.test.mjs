import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { readScreen } from "../lib/screen.mjs";

/** Recorded pane captures (platform facts 7.3, 7.1, 10.6, 10.9) and the usage-limit strings. */
const screens = JSON.parse(readFileSync(new URL("fixtures/screens.json", import.meta.url), "utf8"));

/**
 * Reads one fixture with its recorded session name.
 * @param {string} key the fixture
 * @returns {import("../lib/screen.mjs").Screen} the screen
 */
const read = (key) => readScreen(screens[key].text, screens[key].name);

describe("readScreen on recorded captures", () => {
    it.each([
        ["idle", "empty-box"],
        ["after-ctrl-u", "empty-box"],
        ["after-doorbell", "empty-box"],
        ["half-typed", "owner-text"],
        ["doorbell-typed", "owner-text"],
        ["suggestion", "owner-text"],
        ["permission", "permission"],
        ["subagent-permission", "permission"],
        ["plan-approval", "plan"],
        ["picker", "picker"],
        ["usage-limit", "usage-limit"],
    ])("%s reads as %s", (key, kind) => {
        expect(read(key).kind).toBe(kind);
    });

    it("allows typing only into the empty prompt box", () => {
        const typable = Object.keys(screens).filter((key) => read(key).kind === "empty-box");
        expect(typable.sort()).toEqual(["after-ctrl-u", "after-doorbell", "idle"]);
    });

    it("reads the text in the box", () => {
        expect(read("half-typed")).toEqual({ kind: "owner-text", text: "partial owner text" });
        expect(read("doorbell-typed").text).toBe("githerd: reply with exactly the word DOORBELL-OK");
    });

    it("names the exact allow rule of a one-line Bash prompt, and the subagent that raised one", () => {
        expect(read("permission")).toEqual({
            kind: "permission",
            agent: null,
            rule: "Bash(date +%s > perm-probe.txt)",
        });
        expect(read("subagent-permission")).toEqual({
            kind: "permission",
            agent: "general-purpose",
            rule: "Bash(date +%s > sub-perm.txt)",
        });
    });

    it("reads the reset time and extra usage from the usage-limit screen", () => {
        expect(read("usage-limit")).toEqual({
            kind: "usage-limit",
            resets: "3pm (America/Los_Angeles)",
            extraUsage: true,
        });
    });

    it("does not know a box whose rule names another session", () => {
        expect(readScreen(screens.idle.text, "githerd-other").kind).toBe("unknown");
        expect(readScreen("", "githerd-x").kind).toBe("unknown");
    });
});

describe("readScreen on edge cases", () => {
    const rule = "\u2500".repeat(20);

    it("needs the box's bottom rule", () => {
        expect(readScreen(`${rule} githerd-j \u2500\n\u276F\u00A0`, "githerd-j").kind).toBe("unknown");
        expect(readScreen(`${rule} githerd-j \u2500\n\u276F\u00A0\n${rule}`, "githerd-j").kind).toBe("empty-box");
    });

    it("gives no rule for a multi-line command, a command with parentheses, or another tool", () => {
        const dash = "\u254C".repeat(10);
        const dialog = (/** @type {string} */ head, /** @type {string[]} */ body) =>
            [head, " what it does", dash, ...body, dash, " Do you want to proceed?"].join("\n");
        expect(readScreen(dialog(" Bash command", [" a", " b"]), "x").rule).toBeNull();
        expect(readScreen(dialog(" Bash command", [" echo $(date)"]), "x").rule).toBeNull();
        expect(readScreen(dialog(" Edit command", [" f"]), "x").rule).toBeNull();
        expect(readScreen(" Do you want to proceed?", "x")).toEqual({ kind: "permission", agent: null, rule: null });
    });

    it("reads a usage-limit screen without a reset time or extra usage", () => {
        expect(readScreen(" You've hit your limit", "x")).toEqual({
            kind: "usage-limit",
            resets: null,
            extraUsage: false,
        });
    });
});
