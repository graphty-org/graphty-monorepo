import { describe, expect, it } from "vitest";

import { canonicalChord, DISPATCHER_KEY_BINDINGS, ESCAPE_LADDER, findShellKeyBinding, formatChord, formatChords, keyChipFor, matchesChord, NEVER_BOUND_CHORDS, parseChord, SHELL_KEY_BINDINGS,type ShellKeyBinding } from "../bindings";
import { ACTIVITY_ORDER } from "../constants";

function keyEvent(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    return new KeyboardEvent("keydown", { key, ...init });
}

describe("shell key bindings", () => {
    describe("the table", () => {
        it("gives every action a unique id", () => {
            const ids = SHELL_KEY_BINDINGS.map((binding) => binding.id);

            expect(new Set(ids).size).toBe(ids.length);
        });

        it("gives every row at least one chord", () => {
            for (const binding of SHELL_KEY_BINDINGS) {
                expect(binding.chords.length).toBeGreaterThan(0);
            }
        });

        it("never lets two dispatcher rows claim the same chord", () => {
            const seen = new Map<string, ShellKeyBinding>();

            for (const binding of DISPATCHER_KEY_BINDINGS) {
                for (const chord of binding.chords) {
                    const canonical = canonicalChord(chord);
                    const owner = seen.get(canonical);

                    expect(owner, `${canonical} is claimed by both ${owner?.id ?? ""} and ${binding.id}`).toBe(
                        undefined,
                    );
                    seen.set(canonical, binding);
                }
            }
        });

        it("binds nothing on the never-bound list", () => {
            const forbidden = new Set(NEVER_BOUND_CHORDS.map(canonicalChord));

            for (const binding of SHELL_KEY_BINDINGS) {
                for (const chord of binding.chords) {
                    expect(forbidden.has(canonicalChord(chord))).toBe(false);
                }
            }
        });

        it("gives no rail activity a hotkey", () => {
            const ids = new Set<string>(SHELL_KEY_BINDINGS.map((binding) => binding.id));

            for (const activity of ACTIVITY_ORDER) {
                expect(ids.has(activity)).toBe(false);
            }
        });

        it("marks only the shell's own dispatcher rows as dispatcher-owned", () => {
            expect(DISPATCHER_KEY_BINDINGS.length).toBeLessThan(SHELL_KEY_BINDINGS.length);

            for (const binding of DISPATCHER_KEY_BINDINGS) {
                expect(binding.owner).toBe("dispatcher");
            }
        });

        it("finds a row by id", () => {
            expect(findShellKeyBinding("commandPalette")?.chords).toEqual(["Mod+K"]);
            expect(findShellKeyBinding("escape")?.scope).toBe("global");
        });
    });

    describe("chord parsing", () => {
        it("takes the modifiers off the front and leaves the key", () => {
            expect(parseChord("Mod+K")).toEqual({ mod: true, ctrl: false, shift: false, alt: false, key: "K" });
            expect(parseChord("Shift+Mod+Z")).toEqual({ mod: true, ctrl: false, shift: true, alt: false, key: "Z" });
            expect(parseChord("Ctrl+Y")).toEqual({ mod: false, ctrl: true, shift: false, alt: false, key: "Y" });
        });

        it("reads a bare plus as a key, not as a separator", () => {
            expect(parseChord("+").key).toBe("+");
        });

        it("normalises two spellings of one chord to the same string", () => {
            expect(canonicalChord("Shift+Mod+Z")).toBe(canonicalChord("Mod+Shift+z"));
        });
    });

    describe("modifier normalisation", () => {
        it("prints Mod as Cmd on Apple and Ctrl elsewhere", () => {
            expect(formatChord("Mod+K", true)).toBe("Cmd+K");
            expect(formatChord("Mod+K", false)).toBe("Ctrl+K");
            expect(formatChord("Shift+Mod+Z", true)).toBe("Shift+Cmd+Z");
        });

        it("treats Cmd and Ctrl as interchangeable when matching", () => {
            expect(matchesChord("Mod+K", keyEvent("k", { metaKey: true }))).toBe(true);
            expect(matchesChord("Mod+K", keyEvent("k", { ctrlKey: true }))).toBe(true);
        });

        it("does not fire an unmodified chord while Cmd or Ctrl is held", () => {
            expect(matchesChord("D", keyEvent("d"))).toBe(true);
            expect(matchesChord("D", keyEvent("d", { metaKey: true }))).toBe(false);
            expect(matchesChord("D", keyEvent("d", { ctrlKey: true }))).toBe(false);
        });

        it("keeps Ctrl+Y to Ctrl, not Cmd", () => {
            expect(matchesChord("Ctrl+Y", keyEvent("y", { ctrlKey: true }))).toBe(true);
            expect(matchesChord("Ctrl+Y", keyEvent("y", { metaKey: true }))).toBe(false);
        });

        it("never fires while Alt is held, since 5.6 binds no Alt chord", () => {
            expect(matchesChord("F", keyEvent("f", { altKey: true }))).toBe(false);
        });

        it("separates a letter chord from its Shift twin", () => {
            expect(matchesChord("T", keyEvent("t"))).toBe(true);
            expect(matchesChord("T", keyEvent("T", { shiftKey: true }))).toBe(false);
            expect(matchesChord("Shift+T", keyEvent("T", { shiftKey: true }))).toBe(true);
            expect(matchesChord("Shift+T", keyEvent("t"))).toBe(false);
        });

        it("matches a shift-produced character by the character itself", () => {
            expect(matchesChord("?", keyEvent("?", { shiftKey: true }))).toBe(true);
            expect(matchesChord("+", keyEvent("+", { shiftKey: true }))).toBe(true);
            expect(matchesChord("=", keyEvent("="))).toBe(true);
        });

        it("matches a declared-Shift punctuation chord through its shifted twin", () => {
            expect(matchesChord("Shift+0", keyEvent(")", { shiftKey: true }))).toBe(true);
            expect(matchesChord("Shift+,", keyEvent("<", { shiftKey: true }))).toBe(true);
            expect(matchesChord("Shift+.", keyEvent(">", { shiftKey: true }))).toBe(true);
            expect(matchesChord("Shift+`", keyEvent("~", { shiftKey: true }))).toBe(true);
        });

        it("separates the unshifted punctuation chord from its shifted twin", () => {
            expect(matchesChord(",", keyEvent(","))).toBe(true);
            expect(matchesChord(",", keyEvent("<", { shiftKey: true }))).toBe(false);
            expect(matchesChord("0", keyEvent("0"))).toBe(true);
            expect(matchesChord("0", keyEvent(")", { shiftKey: true }))).toBe(false);
        });
    });

    describe("printed spelling", () => {
        it("prints a key under the name the artboards draw, not the DOM name", () => {
            expect(formatChord("ArrowUp", false)).toBe("Up");
            expect(formatChord("Shift+ArrowUp", false)).toBe("Shift+Up");
            expect(formatChord("Escape", false)).toBe("Esc");
            expect(formatChord(" ", false)).toBe("Space");
        });

        it("leaves a key with no printed name alone", () => {
            expect(formatChord("F", false)).toBe("F");
            expect(formatChord("Home", false)).toBe("Home");
        });

        it("collapses a complete arrow set to the one word 5.6 and the artboards print", () => {
            const panOrOrbit = findShellKeyBinding("panOrOrbit");

            expect(panOrOrbit).toBeDefined();
            expect(formatChords(panOrOrbit?.chords ?? [], false)).toBe("Arrows or Shift+Arrows");
        });

        it("leaves a partial arrow set spelled out, because it is not the set", () => {
            expect(formatChords(["ArrowUp", "ArrowDown"], false)).toBe("Up or Down");
            expect(formatChords(["ArrowLeft", "ArrowRight"], false)).toBe("Left or Right");
        });

        it("joins alternate chords of one action with the separator both boards use", () => {
            expect(formatChords(["Shift+Mod+Z", "Ctrl+Y"], false)).toBe("Shift+Ctrl+Z or Ctrl+Y");
        });

        it("prints a visible chip for the space bar, which drew as nothing", () => {
            const playPause = findShellKeyBinding("timelinePlayPause");

            expect(playPause?.chords).toContain(" ");
            expect(formatChords(playPause?.chords ?? [], false)).toContain("Space");
        });
    });

    describe("key chips", () => {
        it("prints the first chord of a shipped action", () => {
            expect(keyChipFor("commandPalette", true)).toBe("Cmd+K");
            expect(keyChipFor("toggleInspector", false)).toBe("D");
        });

        it("owns the AI composer's send chip, so no surface invents one", () => {
            const send = findShellKeyBinding("assistantSend");

            expect(send?.chords).toEqual(["Mod+Enter"]);
            expect(send?.owner).toBe("widget");
            expect(keyChipFor("assistantSend", true)).toBe("Cmd+Enter");
            expect(keyChipFor("assistantSend", false)).toBe("Ctrl+Enter");
        });

        it("prints no chip for an action that has not shipped", () => {
            expect(findShellKeyBinding("removeSelected")?.shipped).toBe(false);
            expect(keyChipFor("removeSelected", true)).toBeNull();
        });
    });

    describe("the Escape ladder", () => {
        it("lists the five acting rungs in order", () => {
            expect(ESCAPE_LADDER).toEqual([
                "cancelDragOrMarquee",
                "closeTopmostTransient",
                "closeNarrowOverlay",
                "pauseTimelinePlayback",
                "clearSelection",
            ]);
        });
    });
});
