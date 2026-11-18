/**
 * @file The graph keys, as facts: which key deselects, undoes and redoes.
 *
 * `attachKeymap` (in `@graphty/graphty-element/session`) answers these keys on a root the host
 * chooses, and a host that lists its shortcuts (a shortcuts dialog, a menu showing a key) reads
 * the same table rather than keeping its own copy. The camera keys are a separate table,
 * `CANVAS_KEY_DESCRIPTORS`. Nothing here reaches Babylon.js or the DOM.
 */

/** What a graph key does. */
export type KeymapAction = "deselect" | "undo" | "redo";

/** One thing a graph key does. */
export interface KeymapDescriptor {
    /** What it does. */
    readonly action: KeymapAction;
    /** The default name to show for it, such as "Undo". An application may replace it by action. */
    readonly plainName: string;
    /**
     * The chords, spelled `Shift+Mod+Z`: modifiers joined by `+` before the key, where `Mod` is
     * Control on Windows and Linux and Command on macOS, and the key is `KeyboardEvent.key`
     * (a letter upper case).
     */
    readonly keys: readonly string[];
}

/** Every graph key `attachKeymap` answers. */
export const KEYMAP_DESCRIPTORS: readonly KeymapDescriptor[] = Object.freeze(
    (
        [
            ["deselect", "Clear selection", ["Escape"]],
            ["undo", "Undo", ["Mod+Z"]],
            ["redo", "Redo", ["Shift+Mod+Z", "Mod+Y"]],
        ] as const
    ).map(([action, plainName, keys]) => Object.freeze({ action, plainName, keys: Object.freeze([...keys]) })),
);

/**
 * Whether a key press is one chord, such as `Shift+Mod+Z`: the same key with exactly those
 * modifiers held.
 * @param event - The key press.
 * @param chord - The chord, spelled as {@link KeymapDescriptor.keys} spells it.
 * @returns true when it is.
 */
function matchesChord(
    event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "metaKey" | "shiftKey">,
    chord: string,
): boolean {
    const parts = chord.split("+");
    const key = parts.pop() ?? "";
    return (
        event.key.toLowerCase() === key.toLowerCase() &&
        !event.altKey &&
        (event.ctrlKey || event.metaKey) === parts.includes("Mod") &&
        event.shiftKey === parts.includes("Shift")
    );
}

/**
 * What a key press does, or null when it is none of the graph keys.
 * @param event - The key press: its key and modifiers.
 * @returns The action, or null.
 */
export function keymapAction(
    event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "metaKey" | "shiftKey">,
): KeymapAction | null {
    return KEYMAP_DESCRIPTORS.find((entry) => entry.keys.some((chord) => matchesChord(event, chord)))?.action ?? null;
}
