/**
 * The workspace's keys: how a command's key string ("Shift+Mod+Z", "?", "G") is read, shown and
 * matched against a key press.
 *
 * Rules (tier1-design.md sections 2.3 and 2.12):
 * - graphty-element owns W A S D Q E, the arrows, = and - on a focused canvas, so no app key uses
 *   them unmodified, and no app key uses an arrow without Mod or Alt (Shift+Arrow walks nodes).
 * - A character key with no Mod and no Alt is a single-key shortcut, which the reader can switch
 *   off (WCAG 2.1.4).
 * - While the reader types in a field, only Mod keys fire, and never the field's own editing keys
 *   (Mod+Z, Mod+A, copy, cut, paste).
 */

/** A key string split into its parts. */
interface KeyCombo {
    readonly mod: boolean;
    readonly shift: boolean;
    readonly alt: boolean;
    /** The key itself, lowercase for a letter: "z", "?", "/", "enter", "f2". */
    readonly key: string;
}

/** Keys the element owns on a focused canvas when pressed with no modifier. */
const ELEMENT_KEYS = new Set(["w", "a", "s", "d", "q", "e", "=", "-"]);
const ARROWS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright"]);

/**
 * Splits a key string.
 * @param combo - such as "Shift+Mod+S", "?" or "Escape".
 * @returns its parts.
 */
export function parseKey(combo: string): KeyCombo {
    const parts = combo.split("+");
    const key = parts.pop()?.toLowerCase() ?? "";
    const mods = new Set(parts.map((part) => part.toLowerCase()));
    return { mod: mods.has("mod"), shift: mods.has("shift"), alt: mods.has("alt"), key };
}

/**
 * Whether a key string is a single-key shortcut: one character, no Mod, no Alt.
 * @param combo - the key string.
 * @returns true for "G", "?", "Shift+A"; false for "Escape", "F2", "Mod+S".
 */
export function isSingleKey(combo: string): boolean {
    const { mod, alt, key } = parseKey(combo);
    return !mod && !alt && key.length === 1;
}

/** A field's own editing keys, which stay the field's while the reader types. */
const FIELD_KEYS = new Set(["z", "y", "a", "c", "v", "x"]);

/**
 * Whether a key string may fire while the reader types in a field.
 * @param combo - the key string.
 * @returns true for "Mod+S"; false for "G", "Escape", "Mod+Z".
 */
export function firesWhileTyping(combo: string): boolean {
    const { mod, key } = parseKey(combo);
    return mod && !FIELD_KEYS.has(key);
}

/**
 * Throws when a key belongs to graphty-element on a focused canvas.
 * @param combo - the key string.
 * @param commandId - the command that asked for it, for the message.
 */
export function assertAppKey(combo: string, commandId: string): void {
    const { mod, shift, alt, key } = parseKey(combo);
    const elementOwned = (!mod && !alt && !shift && ELEMENT_KEYS.has(key)) || (!mod && !alt && ARROWS.has(key));
    if (elementOwned) {
        throw new Error(`Key "${combo}" of "${commandId}" belongs to graphty-element on a focused canvas`);
    }
}

/**
 * Whether this platform's Mod is Cmd.
 * @returns true on a Mac, iPhone or iPad.
 */
function isMac(): boolean {
    return /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/**
 * The key string as the reader reads it: "Mod" becomes "Ctrl" or "Cmd".
 * @param combo - the key string.
 * @returns such as "Shift+Ctrl+Z".
 */
export function formatKey(combo: string): string {
    const mod = isMac() ? "Cmd" : "Ctrl";
    return combo
        .split("+")
        .map((part) => (part === "Mod" ? mod : part))
        .join("+");
}

/** The parts of a key press `matchesKey` reads. */
type KeyPress = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">;

/**
 * Whether a key press is this key string. A punctuation key such as "?" matches whatever Shift
 * it took to type it; a letter's Shift must match.
 * @param event - the key press.
 * @param combo - the key string.
 * @returns true when they match.
 */
export function matchesKey(event: KeyPress, combo: string): boolean {
    const want = parseKey(combo);
    const mac = isMac();
    const mod = mac ? event.metaKey : event.ctrlKey;
    const otherMod = mac ? event.ctrlKey : event.metaKey;
    const key = event.key.toLowerCase();
    const letterOrNamed = /^[a-z0-9]$/.test(want.key) || want.key.length > 1;
    if (key !== want.key || mod !== want.mod || otherMod || event.altKey !== want.alt) {
        return false;
    }
    return letterOrNamed ? event.shiftKey === want.shift : true;
}

/**
 * Whether a key press lands in something the reader types into.
 * @param target - the event's target.
 * @returns true for an input, textarea, select or editable element.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
