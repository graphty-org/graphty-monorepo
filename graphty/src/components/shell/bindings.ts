/**
 * The one keybinding table.
 *
 * Spec section 5.6 is the single owner of every binding (build spec 04 section 10):
 * Settings > Keyboard shortcuts, the Help dialog (`?`), tooltip chips and command
 * palette rows all render THIS table, and every binding the shell claims is fired by
 * the one dispatcher in `useShellKeyBindings`. A new binding is added here, never to
 * a panel.
 *
 * The table lives in its own module so those four render sites can import it without
 * importing the dispatcher (spec 04 section 10.3: a binding appears in exactly four
 * places and nowhere else).
 */

/* -------------------------------------------------------------------------- */
/* Chord vocabulary                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A chord, written the way the table prints it: zero or more modifier tokens joined
 * by "+", then the key. "Mod" means Cmd or Ctrl, which 5.6 makes interchangeable;
 * "Ctrl" means Ctrl specifically (the Windows and Linux redo).
 *
 * Public with {@link parseChord}, {@link canonicalChord} and {@link formatChord}, which all
 * take a chord written this way.
 * @public
 */
export type KeyChord = string;

/**
 * A chord taken apart.
 *
 * {@link parseChord}'s return, so a caller can name what it gets back.
 * @public
 */
export interface ParsedChord {
    /** Cmd or Ctrl, interchangeable. */
    readonly mod: boolean;
    /** Ctrl specifically, for the one Windows and Linux binding that names it. */
    readonly ctrl: boolean;
    /** Shift. */
    readonly shift: boolean;
    /** Alt or Option. */
    readonly alt: boolean;
    /** The key itself, as `KeyboardEvent.key` would report it unmodified. */
    readonly key: string;
}

const MODIFIER_PATTERN = /^(Mod|Cmd|Meta|Ctrl|Control|Shift|Alt|Option)\+/;

/**
 * The character a US layout produces when a key is pressed with Shift held. Used for
 * both directions of the match: a chord that declares Shift over a punctuation key
 * ("Shift+,") sees the twin in `event.key`, and a chord written as the twin itself
 * ("?", "+") ignores the Shift flag because the character already encodes it.
 */
const SHIFTED_TWINS: Readonly<Record<string, string>> = {
    "`": "~",
    "1": "!",
    "2": "@",
    "3": "#",
    "4": "$",
    "5": "%",
    "6": "^",
    "7": "&",
    "8": "*",
    "9": "(",
    "0": ")",
    "-": "_",
    "=": "+",
    ",": "<",
    ".": ">",
    "/": "?",
    ";": ":",
    "'": '"',
    "[": "{",
    "]": "}",
    "\\": "|",
};

const SHIFT_PRODUCED_CHARACTERS = new Set<string>(Object.values(SHIFTED_TWINS));

/**
 * The name a key is PRINTED under, where that differs from `KeyboardEvent.key`. The
 * table stores the DOM spelling because that is what `matchesChord` compares against;
 * the artboards are the authority on what a chip reads. ShortcutsOverlay.dc.html and
 * SettingsShortcuts.dc.html print Up, Down, Left, Right, Esc and Space -- never
 * "ArrowUp", never "Escape", and never a single space character, which draws as an
 * empty chip.
 */
const KEY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    " ": "Space",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    Escape: "Esc",
};

/**
 * The four arrows, in the order 5.6's Navigation row writes them.
 */
const ARROW_KEYS: readonly string[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/**
 * Takes a chord apart into its modifiers and its key. Modifier tokens may appear in
 * any order; whatever is left after them is the key, which may itself be "+".
 * @param chord - the chord as the table writes it.
 * @returns the chord's modifiers and key.
 */
export function parseChord(chord: KeyChord): ParsedChord {
    let rest = chord;
    let mod = false;
    let ctrl = false;
    let shift = false;
    let alt = false;
    let match = MODIFIER_PATTERN.exec(rest);

    while (match !== null) {
        const token = match[1];

        if (token === "Mod" || token === "Cmd" || token === "Meta") {
            mod = true;
        } else if (token === "Ctrl" || token === "Control") {
            ctrl = true;
        } else if (token === "Shift") {
            shift = true;
        } else {
            alt = true;
        }

        rest = rest.slice(match[0].length);
        match = MODIFIER_PATTERN.exec(rest);
    }

    return { mod, ctrl, shift, alt, key: rest };
}

/**
 * A chord in one canonical spelling, so two writings of the same chord compare equal.
 * @param chord - the chord to normalise.
 * @returns the chord with its modifiers in a fixed order and a single-character key upper-cased.
 */
export function canonicalChord(chord: KeyChord): string {
    const parsed = parseChord(chord);
    const parts: string[] = [];

    if (parsed.mod) {
        parts.push("Mod");
    }

    if (parsed.ctrl) {
        parts.push("Ctrl");
    }

    if (parsed.alt) {
        parts.push("Alt");
    }

    if (parsed.shift) {
        parts.push("Shift");
    }

    parts.push(parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.key);

    return parts.join("+");
}

/**
 * Whether the app is running on an Apple platform, which decides whether "Mod" prints
 * as Cmd or as Ctrl. `navigator.platform` is deprecated, so the user agent is read.
 * @returns true on macOS, iPadOS and iOS.
 */
export function isApplePlatform(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }

    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * The chord as a key chip reads it: "Mod" resolved for the platform, and the key in
 * the spelling the artboards print (`KEY_DISPLAY_NAMES`). This is the only place the
 * Cmd-versus-Ctrl decision is made, so the four sanctioned render sites of 10.3 all
 * print the same string.
 *
 * The modifier prefix is left exactly as the table wrote it rather than rebuilt
 * through `canonicalChord`: canonical order would turn "Shift+Mod+Z" into
 * "Cmd+Shift+Z", where ShortcutsOverlay.dc.html draws "Shift+Cmd+Z".
 * @param chord - the chord as the table writes it.
 * @param apple - whether to print the Apple spelling; defaults to the running platform.
 * @returns the chip text, e.g. "Cmd+K", "Ctrl+K", "Shift+Up" or "Esc".
 */
export function formatChord(chord: KeyChord, apple: boolean = isApplePlatform()): string {
    const { key } = parseChord(chord);
    const display = KEY_DISPLAY_NAMES[key];
    const printed = display === undefined ? chord : chord.slice(0, chord.length - key.length) + display;

    return printed.replace(/\bMod\b/g, apple ? "Cmd" : "Ctrl");
}

/**
 * Whether `remaining` holds the whole four-arrow set under `prefix`, and if so takes
 * those four chords out of it.
 * @param remaining - the chords not yet printed; mutated when the set is found.
 * @param prefix - the modifier prefix the set must carry, "" or "Shift+".
 * @returns true when all four were present and have been removed.
 */
function takeArrowSet(remaining: KeyChord[], prefix: string): boolean {
    const wanted = ARROW_KEYS.map((key) => prefix + key);

    if (!wanted.every((chord) => remaining.includes(chord))) {
        return false;
    }

    for (const chord of wanted) {
        remaining.splice(remaining.indexOf(chord), 1);
    }

    return true;
}

/**
 * Every chord of ONE action as a shortcuts table prints them, which is not the same
 * as every chord joined.
 *
 * A complete set of four arrows collapses to the single word "Arrows", and the shifted
 * set to "Shift+Arrows": spec 5.6's Navigation row writes the binding as "Arrows", and
 * ShortcutsOverlay.dc.html:852,856 and SettingsShortcuts.dc.html draw exactly those two
 * chips. Printing the eight raw chords instead produced a 121-character string that
 * wrapped to seven lines inside a DATA_PITCH row. What does not collapse is joined with
 * " or ", the separator both boards use between alternate chords of one action.
 *
 * The collapsed words come first, so a future row that mixed arrows with other chords
 * would print "Arrows or <rest>" whatever order the table wrote them in. No row mixes
 * today; splice in place if one ever does.
 * @param chords - the row's chords, as the table writes them.
 * @param apple - whether to print the Apple spelling; defaults to the running platform.
 * @returns the cell text, e.g. "Arrows or Shift+Arrows" or "Left or Right".
 */
export function formatChords(chords: readonly KeyChord[], apple: boolean = isApplePlatform()): string {
    const remaining = [...chords];
    const collapsed: string[] = [];

    if (takeArrowSet(remaining, "")) {
        collapsed.push("Arrows");
    }

    if (takeArrowSet(remaining, "Shift+")) {
        collapsed.push("Shift+Arrows");
    }

    return [...collapsed, ...remaining.map((chord) => formatChord(chord, apple))].join(" or ");
}

/**
 * Whether a keyboard event is this chord.
 *
 * Modifier rules: Cmd and Ctrl are interchangeable wherever the chord says "Mod"; a
 * chord with no "Mod" does not fire while Cmd or Ctrl is held; Alt must match exactly
 * (5.6 never binds Alt); Shift must match exactly EXCEPT where the chord's key is
 * itself a shift-produced character, which already carries the Shift.
 * @param chord - the chord as the table writes it.
 * @param event - the keyboard event to test.
 * @returns true when the event is that chord.
 */
export function matchesChord(chord: KeyChord, event: KeyboardEvent): boolean {
    const parsed = parseChord(chord);

    if (parsed.alt !== event.altKey) {
        return false;
    }

    if (parsed.mod) {
        if (!event.ctrlKey && !event.metaKey) {
            return false;
        }
    } else if (parsed.ctrl) {
        if (!event.ctrlKey || event.metaKey) {
            return false;
        }
    } else if (event.ctrlKey || event.metaKey) {
        return false;
    }

    if (parsed.shift) {
        if (!event.shiftKey) {
            return false;
        }
    } else if (event.shiftKey && !SHIFT_PRODUCED_CHARACTERS.has(parsed.key)) {
        return false;
    }

    return keyMatches(parsed, event.key);
}

function keyMatches(parsed: ParsedChord, eventKey: string): boolean {
    if (parsed.key.length === 1 && /[a-z]/i.test(parsed.key)) {
        return eventKey.toLowerCase() === parsed.key.toLowerCase();
    }

    if (eventKey === parsed.key) {
        return true;
    }

    return parsed.shift && SHIFTED_TWINS[parsed.key] === eventKey;
}

/* -------------------------------------------------------------------------- */
/* The table                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every action 5.6 names. The ids the shell dispatcher fires and the ids a focused
 * widget owns are in one union on purpose: Settings and the `?` dialog render the
 * whole table, dispatcher rows and widget rows alike.
 */
export type ShellCommandId =
    | "addNote"
    | "assistantSend"
    | "commandPalette"
    | "contextMenu"
    | "cycleRegions"
    | "cycleRegionsReverse"
    | "egoNetwork"
    | "escape"
    | "expandNeighbors"
    | "findPath"
    | "focusAssistant"
    | "focusConsole"
    | "focusExploreSearch"
    | "insightsActivateCard"
    | "insightsMoveCard"
    | "inspectSelection"
    | "invertSelection"
    | "keyboardShortcuts"
    | "noteCancel"
    | "noteSave"
    | "openFile"
    | "panModifier"
    | "panOrOrbit"
    | "panelMoveFocus"
    | "panelOpenCardParameters"
    | "panelRunCard"
    | "panelTabOrder"
    | "pasteData"
    | "redo"
    | "removeSelected"
    | "resetView"
    | "saveAs"
    | "selectAllVisible"
    | "selectNeighbors"
    | "timeJumpEnd"
    | "timeJumpStart"
    | "timeStepBack"
    | "timeStepForward"
    | "timelinePlayPause"
    | "timelineStep"
    | "toggleDataDrawer"
    | "toggleInspector"
    | "toggleLegend"
    | "toggleMinimap"
    | "toggleNotesLayer"
    | "togglePanel"
    | "toggleTimeSlider"
    | "toggleViewMode"
    | "undo"
    | "viewFront"
    | "viewSide"
    | "viewTop"
    | "zoomIn"
    | "zoomOut"
    | "zoomToFit"
    | "zoomToSelection";

/**
 * Where a binding applies, as 5.6's Scope column names it.
 */
export type KeyBindingScope =
    | "ai-console"
    | "canvas"
    | "drop-zone"
    | "global"
    | "inspector-notes"
    | "insights-strip"
    | "panel"
    | "time-slider";

/**
 * Who fires the binding. "dispatcher" is the shell's single keydown dispatcher;
 * everything else is handled inside a focused widget, a region, or the platform, and
 * the dispatcher must not claim it.
 *
 * Named in {@link ShellKeyBinding.owner}: a consumer filtering the table by owner needs the
 * four values.
 * @public
 */
export type KeyBindingOwner = "dispatcher" | "platform" | "region" | "widget";

/**
 * One row of the 5.6 table.
 */
export interface ShellKeyBinding {
    /** The action's id; unique across the table. */
    readonly id: ShellCommandId;
    /** Every chord that fires it. */
    readonly chords: readonly KeyChord[];
    /** The action, in the table's own words. */
    readonly action: string;
    /** Where it applies. */
    readonly scope: KeyBindingScope;
    /** Who fires it. */
    readonly owner: KeyBindingOwner;
    /**
     * Whether the action has SHIPPED. The `?` dialog renders only shipped rows;
     * Settings > Keyboard shortcuts renders the whole table with Coming tags, and an
     * unshipped row carries no key chip anywhere (10.3).
     */
    readonly shipped: boolean;
    /**
     * Whether the dispatcher calls `preventDefault`. True only where the browser has
     * a default on that chord that 5.6 deliberately intercepts, or where the default
     * (page scroll, back navigation, address bar focus) would break the canvas.
     * Browser shortcuts are otherwise never overridden.
     */
    readonly preventDefault: boolean;
    /** Whether the key is HELD rather than pressed; the handler also sees the keyup. */
    readonly held?: boolean;
    /** Anything the table says about the row that its action text does not. */
    readonly note?: string;
}

/**
 * The 5.6 binding table, in the spec's own order.
 */
export const SHELL_KEY_BINDINGS: readonly ShellKeyBinding[] = [
    {
        id: "zoomIn",
        chords: ["=", "+"],
        action: "Zoom in",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "zoomOut",
        chords: ["-"],
        action: "Zoom out",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "zoomToFit",
        chords: ["0", "Home"],
        action: "Zoom to fit",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "zoomToSelection",
        chords: ["F"],
        action: "Zoom to selection",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "resetView",
        chords: ["Shift+0"],
        action: "Reset view",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "panOrOrbit",
        chords: [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Shift+ArrowUp",
            "Shift+ArrowDown",
            "Shift+ArrowLeft",
            "Shift+ArrowRight",
        ],
        action: "Pan (2D) or orbit (3D); Shift+arrows pan in 3D",
        scope: "canvas",
        owner: "dispatcher",
        shipped: true,
        preventDefault: true,
        note:
            'Settings offers the alternative "Arrows walk the selection to the nearest neighbor" (Coming). ' +
            "SHIPPED, and deliberately unclaimed by the shell: graphty-element's own " +
            "OrbitInputController listens on the canvas and orbits on the arrows, so a handler here " +
            "would be a second receiver for one press. The row stays in the table because the " +
            "capability is real and the chip it prints is true.",
    },
    {
        id: "viewFront",
        chords: ["1"],
        action: "Front view (3D)",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "viewSide",
        chords: ["3"],
        action: "Side view (3D)",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "viewTop",
        chords: ["7"],
        action: "Top view (3D)",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "toggleViewMode",
        chords: ["5"],
        action: "Toggle 2D and 3D",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "panModifier",
        chords: [" "],
        action: "Turns a left-drag into a pan",
        scope: "canvas",
        owner: "dispatcher",
        shipped: false,
        preventDefault: true,
        held: true,
        note: "Held, not pressed: the handler is called on keydown and again on keyup. NOT SHIPPED: Needs a pointer-driven pan, which graphty-element publishes no call for.",
    },
    {
        id: "selectAllVisible",
        chords: ["Mod+A"],
        action: "Select all visible",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        preventDefault: true,
        note: "In the data table this equals Select all visible: the table keeps no selection of its own. NOT SHIPPED: Needs a multi-node selection, which graphty-element publishes no call for.",
    },
    {
        id: "invertSelection",
        chords: ["I"],
        action: "Invert selection",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: Needs a multi-node selection, which graphty-element publishes no call for.",
        preventDefault: false,
    },
    {
        id: "expandNeighbors",
        chords: ["E"],
        action: "Expand neighbors of the selection by one hop",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: Needs neighbour expansion on the canvas, which is new work in graphty-element.",
        preventDefault: false,
    },
    {
        id: "selectNeighbors",
        chords: ["Shift+E"],
        action: "Select neighbors of the selection",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: Needs a multi-node selection, which graphty-element publishes no call for.",
        preventDefault: false,
    },
    {
        id: "egoNetwork",
        chords: ["G"],
        action: "Ego network of the selection",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: The ego-network view is new work.",
        preventDefault: false,
    },
    {
        id: "findPath",
        chords: ["P"],
        action: "Find path between two selected nodes",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: Path finding between two selected nodes is new work.",
        preventDefault: false,
    },
    {
        id: "inspectSelection",
        chords: ["Enter"],
        action: "Inspect the selection",
        scope: "canvas",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: Scoped to canvas focus, which the shell cannot yet tell from focus on a control.",
        preventDefault: false,
    },
    {
        id: "removeSelected",
        chords: ["Delete", "Backspace"],
        action: "Remove selected nodes or edges after a confirmation naming the counts",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        preventDefault: true,
        note: "A Cleaning step: undoable, with a toast carrying Undo.",
    },
    {
        id: "escape",
        chords: ["Escape"],
        action: "The Escape ladder",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
        note: "Escape never closes the desktop activity panel and never leaves XR.",
    },
    {
        id: "commandPalette",
        chords: ["Mod+K"],
        action: "Command palette",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: true,
    },
    {
        id: "focusExploreSearch",
        chords: ["/"],
        action: "Focus Explore search",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: true,
    },
    {
        id: "togglePanel",
        chords: ["Mod+B"],
        action: "Toggle the activity panel",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: true,
    },
    {
        id: "toggleInspector",
        chords: ["D"],
        action: "Toggle inspector",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "toggleMinimap",
        chords: ["M"],
        action: "Toggle minimap",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "toggleLegend",
        chords: ["L"],
        action: "Toggle legend",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "toggleTimeSlider",
        chords: ["T"],
        action: "Toggle the time slider",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        preventDefault: false,
        note: "Only when a Time role is assigned. NOT SHIPPED: No Time role can be assigned yet, which is this row's own precondition.",
    },
    {
        id: "toggleDataDrawer",
        chords: ["Shift+T"],
        action: "Toggle the Data table drawer",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "focusAssistant",
        chords: ["`"],
        action: "Focus the assistant input when a provider is configured, the console otherwise",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "focusConsole",
        chords: ["Shift+`"],
        action: "Focus the console (AI panel), always",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: The AI panel's console section has not shipped.",
        preventDefault: false,
    },
    {
        id: "keyboardShortcuts",
        chords: ["?"],
        action: "Keyboard shortcuts dialog",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "cycleRegions",
        chords: ["F6"],
        action: "Cycle regions: rail, panel, canvas, inspector, status bar, the Insights strip when shown, then docks when open",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: true,
        note: "An open pop-out is cycled immediately after the region that owns it.",
    },
    {
        id: "cycleRegionsReverse",
        chords: ["Shift+F6"],
        action: "Cycle regions, reverse",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: true,
    },
    {
        id: "insightsMoveCard",
        chords: ["ArrowLeft", "ArrowRight"],
        action: "Move between cards",
        scope: "insights-strip",
        owner: "region",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "insightsActivateCard",
        chords: ["Enter", "Delete"],
        action: "Activate a card; dismiss a card",
        scope: "insights-strip",
        owner: "region",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "contextMenu",
        chords: ["Shift+F10"],
        action: "Context menu on the focused element",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: The canvas context menu has not shipped.",
        preventDefault: true,
    },
    {
        id: "addNote",
        chords: ["N"],
        action: "Add a note to the selection",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        preventDefault: false,
        note: "Focuses the inspector input; on iPad opens the inspector overlay; with nothing selected opens the case note. NOT SHIPPED: Notes have not shipped.",
    },
    {
        id: "toggleNotesLayer",
        chords: ["Shift+N"],
        action: "Toggle the notes layer",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: Notes have not shipped.",
        preventDefault: false,
    },
    {
        id: "undo",
        chords: ["Mod+Z"],
        action: "Undo",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: true,
    },
    {
        id: "redo",
        chords: ["Shift+Mod+Z", "Ctrl+Y"],
        action: "Redo",
        scope: "global",
        owner: "dispatcher",
        shipped: true,
        preventDefault: true,
        note: "Ctrl+Y is the Windows and Linux spelling.",
    },
    {
        id: "saveAs",
        chords: ["Mod+S"],
        action: "Open the command palette scoped to Save",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        preventDefault: true,
        note: "Lists one Save as <kind>... row per saveable kind, kinds that cannot apply dimmed and reasoned. The browser default is intercepted deliberately. NOT SHIPPED: The palette has no Save scope yet, and no kind is saveable.",
    },
    {
        id: "openFile",
        chords: ["Mod+O"],
        action: "Open file",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: The file picker is the Data panel's own dialog; the shell cannot open it from here yet.",
        preventDefault: true,
    },
    {
        id: "pasteData",
        chords: ["Mod+V"],
        action: "Paste data",
        scope: "drop-zone",
        owner: "dispatcher",
        shipped: false,
        preventDefault: false,
        note: "Only while the canvas or the drop zone has focus; the paste event itself must still fire. NOT SHIPPED: The paste route is the Data panel's own dialog; the shell cannot open it from here yet.",
    },
    {
        id: "timeStepBack",
        chords: [","],
        action: "Step back (time slider)",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: There is no time slider to step.",
        preventDefault: false,
    },
    {
        id: "timeStepForward",
        chords: ["."],
        action: "Step forward (time slider)",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: There is no time slider to step.",
        preventDefault: false,
    },
    {
        id: "timeJumpStart",
        chords: ["Shift+,"],
        action: "Jump to start (time slider)",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: There is no time slider to jump in.",
        preventDefault: false,
    },
    {
        id: "timeJumpEnd",
        chords: ["Shift+."],
        action: "Jump to end (time slider)",
        scope: "global",
        owner: "dispatcher",
        shipped: false,
        note: "NOT SHIPPED: There is no time slider to jump in.",
        preventDefault: false,
    },
    {
        id: "timelinePlayPause",
        chords: [" "],
        action: "Play or pause",
        scope: "time-slider",
        owner: "widget",
        shipped: true,
        preventDefault: false,
        note: "Only while the slider has focus.",
    },
    {
        id: "timelineStep",
        chords: ["ArrowLeft", "ArrowRight"],
        action: "Step",
        scope: "time-slider",
        owner: "widget",
        shipped: true,
        preventDefault: false,
        note: "Only while the slider has focus.",
    },
    {
        id: "panelMoveFocus",
        chords: ["ArrowUp", "ArrowDown"],
        action: "Move between cards, rows and result rows",
        scope: "panel",
        owner: "widget",
        shipped: true,
        preventDefault: false,
        note: "Enter on a result row or a path step selects and centers the node.",
    },
    {
        id: "panelRunCard",
        chords: ["Enter"],
        action: "Run the focused card with current parameters",
        scope: "panel",
        owner: "widget",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "panelOpenCardParameters",
        chords: ["Mod+Enter"],
        action: "Open the focused card's parameters",
        scope: "panel",
        owner: "widget",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "panelTabOrder",
        chords: ["Tab"],
        action: "Follows tier order",
        scope: "panel",
        owner: "platform",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "noteSave",
        chords: ["Mod+Enter"],
        action: "Save the note",
        scope: "inspector-notes",
        owner: "widget",
        shipped: true,
        preventDefault: false,
    },
    {
        id: "noteCancel",
        chords: ["Escape"],
        action: "Cancel the note",
        scope: "inspector-notes",
        owner: "widget",
        shipped: true,
        preventDefault: false,
        note: "Rung 2 of the Escape ladder, handled by the widget.",
    },
    {
        id: "assistantSend",
        chords: ["Mod+Enter"],
        action: "Send the message",
        scope: "ai-console",
        owner: "widget",
        shipped: true,
        preventDefault: false,
        note:
            "Enter opens a new line; the platform key plus Enter sends, exactly as the " +
            "inspector's note input saves (noteSave). Asked for directly by the product " +
            "owner on 2026-09-12, reversing the AI artboards' `Send (Enter)` tooltip: a " +
            "multi-line composer whose Enter sends cannot be typed into. The chip in the " +
            "Send control's tooltip comes from this row, never from a literal.",
    },
];

/**
 * The rows the shell's single dispatcher fires. Everything else in the table is
 * handled by a focused widget, a region or the platform.
 */
export const DISPATCHER_KEY_BINDINGS: readonly ShellKeyBinding[] = SHELL_KEY_BINDINGS.filter(
    (binding) => binding.owner === "dispatcher",
);

/**
 * Finds a row by id.
 * @param id - the action's id.
 * @returns the row, or undefined when the id is not in the table.
 */
export function findShellKeyBinding(id: ShellCommandId): ShellKeyBinding | undefined {
    return SHELL_KEY_BINDINGS.find((binding) => binding.id === id);
}

/**
 * The chip a control's tooltip, a menu row, a palette row or the shortcuts table
 * prints for an action -- the first chord, with "Mod" resolved for the platform.
 * An unshipped action carries no chip anywhere (10.3), so this returns null for one.
 * @param id - the action's id.
 * @param apple - whether to print the Apple spelling; defaults to the running platform.
 * @returns the chip text, or null when the action has no chord or has not shipped.
 */
export function keyChipFor(id: ShellCommandId, apple: boolean = isApplePlatform()): string | null {
    const binding = findShellKeyBinding(id);

    if (binding === undefined || !binding.shipped || binding.chords.length === 0) {
        return null;
    }

    return formatChord(binding.chords[0], apple);
}

/* -------------------------------------------------------------------------- */
/* The Escape ladder (build spec 04 section 10.1)                              */
/* -------------------------------------------------------------------------- */

/**
 * One rung of the Escape ladder.
 */
export type EscapeRungId =
    | "cancelDragOrMarquee"
    | "clearSelection"
    | "closeNarrowOverlay"
    | "closeTopmostTransient"
    | "pauseTimelinePlayback";

/**
 * The Escape ladder: one rung per press, first match wins. Rung 6 ("nothing") is the
 * absence of a handler, so it is not in the list.
 *
 * Escape never closes the desktop activity panel and never leaves XR.
 */
export const ESCAPE_LADDER: readonly EscapeRungId[] = [
    "cancelDragOrMarquee",
    "closeTopmostTransient",
    "closeNarrowOverlay",
    "pauseTimelinePlayback",
    "clearSelection",
];

/* -------------------------------------------------------------------------- */
/* Never bound (build spec 04 section 10.2)                                    */
/* -------------------------------------------------------------------------- */

/**
 * Chords 5.6 forbids. Rail activities additionally have NO hotkeys -- no digit
 * modifier is collision-free, and the palette is the keyboard path to a panel. The
 * canvas toolbar takes no binding of its own and is never on the Escape ladder.
 */
export const NEVER_BOUND_CHORDS: readonly KeyChord[] = [
    "Mod+T",
    "Mod+W",
    "Mod+N",
    "Mod+Q",
    "Mod+H",
    "Mod+M",
    "Mod+L",
    "Mod+D",
    "Mod+F",
    "Mod+P",
    "Mod+R",
    "Mod++",
    "Mod+-",
    "Mod+0",
    "Mod+1",
    "Mod+2",
    "Mod+3",
    "Mod+4",
    "Mod+5",
    "Mod+6",
    "Mod+7",
    "Mod+8",
    "Mod+9",
    "Mod+,",
    "Mod+Shift+I",
    "Mod+Shift+T",
    "Alt+0",
    "Alt+1",
    "Alt+2",
    "Alt+3",
    "Alt+4",
    "Alt+5",
    "Alt+6",
    "Alt+7",
    "Alt+8",
    "Alt+9",
    "Alt+D",
    "Alt+F",
    "Alt+Home",
];
