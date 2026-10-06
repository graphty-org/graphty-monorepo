import { assert, describe, it } from "vitest";

import { tabFor } from "../../state/store";
import { firesWhileTyping, formatKey, isSingleKey, isTypingTarget, matchesKey, parseKey } from "../keys";

/**
 * A key press with nothing held.
 * @param key - the key.
 * @param held - the modifiers held.
 * @returns the press.
 */
function press(key: string, held: Partial<Record<"ctrlKey" | "metaKey" | "shiftKey" | "altKey", boolean>> = {}) {
    return { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...held };
}

describe("workspace keys", () => {
    it("splits a key string", () => {
        assert.deepEqual(parseKey("Shift+Mod+S"), { mod: true, shift: true, alt: false, key: "s" });
        assert.deepEqual(parseKey("?"), { mod: false, shift: false, alt: false, key: "?" });
        assert.equal(parseKey("Mod+,").key, ",");
    });

    it("matches Mod as Ctrl off a Mac, and a letter's Shift exactly", () => {
        assert.isTrue(matchesKey(press("z", { ctrlKey: true }), "Mod+Z"));
        assert.isFalse(matchesKey(press("Z", { ctrlKey: true, shiftKey: true }), "Mod+Z"));
        assert.isTrue(matchesKey(press("Z", { ctrlKey: true, shiftKey: true }), "Shift+Mod+Z"));
        assert.isTrue(matchesKey(press("A", { shiftKey: true }), "Shift+A"));
        assert.isFalse(matchesKey(press("a"), "Shift+A"));
        assert.isFalse(matchesKey(press("g", { ctrlKey: true }), "G"));
    });

    it("matches punctuation whatever Shift it took to type", () => {
        assert.isTrue(matchesKey(press("?", { shiftKey: true }), "?"));
        assert.isTrue(matchesKey(press("/"), "/"));
    });

    it("matches a named key", () => {
        assert.isTrue(matchesKey(press("F2"), "F2"));
        assert.isTrue(matchesKey(press("Escape"), "Escape"));
        assert.isFalse(matchesKey(press("Escape", { shiftKey: true }), "Escape"));
    });

    it("calls a character with no Mod or Alt a single-key shortcut (WCAG 2.1.4)", () => {
        assert.isTrue(isSingleKey("G"));
        assert.isTrue(isSingleKey("Shift+A"));
        assert.isTrue(isSingleKey("?"));
        assert.isFalse(isSingleKey("Escape"));
        assert.isFalse(isSingleKey("F2"));
        assert.isFalse(isSingleKey("Mod+S"));
    });

    it("lets only Mod keys through while typing, and never a field's own editing keys", () => {
        assert.isTrue(firesWhileTyping("Mod+S"));
        assert.isFalse(firesWhileTyping("Mod+Z"));
        assert.isFalse(firesWhileTyping("Mod+A"));
        assert.isFalse(firesWhileTyping("G"));
        assert.isFalse(firesWhileTyping("Escape"));
    });

    it("knows a field from a button", () => {
        assert.isTrue(isTypingTarget(document.createElement("input")));
        assert.isTrue(isTypingTarget(document.createElement("textarea")));
        assert.isFalse(isTypingTarget(document.createElement("button")));
        assert.isFalse(isTypingTarget(null));
    });

    it("shows Mod as the platform's key", () => {
        assert.match(formatKey("Shift+Mod+Z"), /^Shift\+(Ctrl|Cmd)\+Z$/);
        assert.equal(formatKey("?"), "?");
    });
});

describe("inspector tab memory", () => {
    const node = { kind: "node", tabs: ["style", "values"] as const, alwaysOpenOn: "values" as const };
    const measure = { kind: "measure-row", tabs: ["style", "values"] as const };

    it("opens a kind on its remembered tab, else its first", () => {
        assert.equal(tabFor(measure, {}), "style");
        assert.equal(tabFor(measure, { "measure-row": "values" }), "values");
    });

    it("always opens a single node on Values", () => {
        assert.equal(tabFor(node, { node: "style" }), "values");
    });

    it("gives a kind with one body no tab", () => {
        assert.isNull(tabFor({ kind: "selection-row", tabs: [] }, {}));
        assert.isNull(tabFor(undefined, {}));
    });
});
