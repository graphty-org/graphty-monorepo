import {
    ModalFooter,
    PanelField,
    PanelLabelsProvider,
    SegmentedControl,
    usePopoutManager,
} from "@graphty/compact-mantine";
import {
    formatShaderDraft,
    minSizeApplies,
    SHADER_MIN_SIZE_RANGE,
    SHADER_REACH_RANGE,
    shaderIdForName,
    shaderParamClock,
    type ShaderParams,
    type ShaderPlace,
    shaderPlaceUsesReach,
    type ShaderProblem,
    shaderTemplate,
    type ShaderTextDraft,
    splitShaderText,
} from "@graphty/graphty-element/catalog";
import { type GraphSession, GraphtyError, type ShaderAddResult } from "@graphty/graphty-element/session";
import { Anchor, Button, Group, Modal, Stack, Text, Textarea, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { ariaKey, formatKey, isMac } from "../keys/keys";
import { useWorkspace } from "../state/WorkspaceContext";
import type { ShaderCodeEditor, ShaderCodeEditorHandle, ShaderCodeMark } from "./ShaderCodeEditor";
import { PlaceDiagram } from "./ShaderGallery";
import { shaderAddedNotice } from "./shaderNotice";
import { GEAR_FIELDS, NumberTextField, ShaderParamRows } from "./ShaderParamRows";
import { pickedShader } from "./shaderSlots";
import {
    DIALOG_PLACES,
    dialogPlaceWords,
    EDITOR_WORDS,
    failureWords,
    FIRST_PLACE,
    GALLERY_WORDS,
    PASTE_GUIDE_WORDS,
    PASTE_WAIT_WORDS,
    pasteProblemsWord,
    pasteProblemWords,
    shaderPlaceWords,
    type ShaderTab,
    targetOfPlace,
} from "./words";

/** The switch's choices, in its order. */
const TAB_CHOICES: { value: ShaderTab; label: string }[] = [
    { value: "node", label: EDITOR_WORDS.targets.node },
    { value: "edge", label: EDITOR_WORDS.targets.edge },
    { value: "background", label: EDITOR_WORDS.targets.background },
];

/** The published guide to writing a shader, which the dialog links to. */
const SHADER_GUIDE_URL = "https://graphty.app/docs/graphty-element/guide/shaders";

/** How long typing pauses before the text is checked. */
const CHECK_PAUSE_MS = 300;

/** The key that switches what Tab does in the code box, as the editor binds it. */
const TAB_TOGGLE_KEY = isMac() ? "Shift+Alt+M" : "Ctrl+M";

/** The Modal's close button, which the tooltip showing its key points at. */
const CLOSE_BUTTON_ID = "ws-shader-editor-close";

/** The code editor's chunk once it has loaded; a failed load stays null, so a later opening retries. */
let loadedEditor: typeof ShaderCodeEditor | null = null;

/**
 * The code editor, loaded the first time the dialog opens. Until it arrives, or if it never does,
 * the dialog's plain box stands in, and everything works without highlighting.
 * @param box - the plain box, whose caret the editor takes over.
 * @returns the editor, null until loaded, and the offset to take focus at if the box held it.
 */
function useCodeEditor(box: React.RefObject<HTMLTextAreaElement | null>): {
    Editor: typeof ShaderCodeEditor | null;
    takeFocusAt: number | undefined;
} {
    const [loaded, setLoaded] = useState<{ Editor: typeof ShaderCodeEditor; takeFocusAt?: number } | null>(() =>
        loadedEditor === null ? null : { Editor: loadedEditor },
    );
    useEffect(() => {
        if (loaded !== null) {
            return undefined;
        }
        let current = true;
        import("./ShaderCodeEditor").then(
            (module) => {
                loadedEditor = module.ShaderCodeEditor;
                if (current) {
                    const area = box.current;
                    setLoaded({
                        Editor: module.ShaderCodeEditor,
                        ...(area !== null && document.activeElement === area
                            ? { takeFocusAt: area.selectionStart }
                            : {}),
                    });
                }
            },
            () => {
                // The plain box stays, and the next opening tries again.
            },
        );
        return () => {
            current = false;
        };
    }, [loaded, box]);
    return { Editor: loaded?.Editor ?? null, takeFocusAt: loaded?.takeFocusAt };
}

/**
 * The working template for a place on a tab, from the element.
 * @param tab - the tab.
 * @param place - the place, none for the background.
 * @returns the template's text.
 */
function templateOf(tab: ShaderTab, place: ShaderPlace | undefined): string {
    const target = targetOfPlace(tab, place);
    return shaderTemplate(target === "background" ? { target } : { target, place });
}

/** What a shader draws on: each keeps its own draft. */
type Target = ReturnType<typeof targetOfPlace>;

/**
 * The tab a target's draft is on: a group outline's is the Node tab's, at the group place.
 * @param target - the target.
 * @returns the tab.
 */
function tabOfTarget(target: Target): ShaderTab {
    return target === "group" ? "node" : target;
}

/** What the dialog opens with: text to start from, the place, and the shader it duplicates. */
export interface PasteInit {
    /** The text it loads; absent: the session's unsent draft, else the place's template. */
    readonly text?: string;
    /** The place it starts at (Duplicate and edit: the row's); absent: the tab's first place. */
    readonly place?: ShaderPlace;
    /** The shader this text is a copy of (Duplicate and edit): a pick equal to it still adds a copy. */
    readonly duplicateOf?: string;
}

/** What the reader is editing: the header as written, the body, and the place shown. */
interface EditorState {
    readonly form: ShaderTextDraft;
    readonly body: string;
    /** The whole text while Full text is on; else null. */
    readonly full: string | null;
    readonly place: ShaderPlace | undefined;
    /** Whether the reader changed the form other than a parameter's default value: the text is a new shader. */
    readonly edited: boolean;
    /** The header the text was loaded with, which tells a changed parameter default. */
    readonly loaded: { readonly body: string; readonly draft: ShaderTextDraft };
}

/** The session's unsent work: one draft per target, and the target last used. */
interface DraftBook {
    readonly drafts: Map<Target, EditorState>;
    last: Target | undefined;
    /** The Node tab's target (node or group) when the reader last left that tab. */
    onNode: Target | undefined;
}

const books = new WeakMap<GraphSession, DraftBook>();

/**
 * The session's drafts, kept when the dialog closes without adding.
 * @param session - the session.
 * @returns its drafts.
 */
function bookOf(session: GraphSession): DraftBook {
    let book = books.get(session);
    if (book === undefined) {
        book = { drafts: new Map(), last: undefined, onNode: undefined };
        books.set(session, book);
    }
    return book;
}

/**
 * A place's starter, as the form holds it.
 * @param tab - the tab.
 * @param place - the place.
 * @returns the state.
 */
function starterState(tab: ShaderTab, place: ShaderPlace | undefined): EditorState {
    const { draft, body } = splitShaderText(templateOf(tab, place));
    const form = draft ?? {};
    return { form, body, full: null, place, edited: false, loaded: { body, draft: form } };
}

/**
 * A state as text that just arrived from outside the form: what a changed default is measured from.
 * @param state - the state.
 * @returns the state.
 */
function loadedAs(state: EditorState): EditorState {
    return { ...state, edited: false, loaded: { body: state.body, draft: state.form } };
}

/**
 * Where a session's dialog opens: the place given, else the target last used if it is on this tab.
 * @param book - the session's drafts.
 * @param tab - the tab.
 * @param init - what it opens with.
 * @returns the state.
 */
function openingState(book: DraftBook, tab: ShaderTab, init: PasteInit): EditorState {
    const place = init.place ?? (book.last === "group" && tab === "node" ? "group" : FIRST_PLACE[tab]);
    const starter = starterState(tab, place);
    if (init.text !== undefined) {
        return loadedAs(stateFromText(init.text, tab, starter));
    }
    return book.drafts.get(targetOfPlace(tab, place)) ?? starter;
}

/**
 * The header with its parameters' default values left out, to tell a change of a default from any
 * other change to the form.
 * @param form - the header.
 * @returns its text.
 */
function headerShape(form: ShaderTextDraft): string {
    return JSON.stringify({ ...form, params: form.params?.map((row) => ({ ...row, default: undefined })) });
}

/**
 * Text arriving from outside the form: a header fills the form and the box takes the body, a
 * header that is not a JSON object stays whole in Full text, and text with no header is body.
 * @param text - the text.
 * @param tab - the tab.
 * @param current - the state it replaces.
 * @returns the state.
 */
function stateFromText(text: string, tab: ShaderTab, current: EditorState): EditorState {
    const parts = splitShaderText(text);
    if (!parts.headed) {
        return { ...current, full: null, body: text };
    }
    if (parts.draft === undefined) {
        return { ...current, full: text };
    }
    const named = DIALOG_PLACES[tab].find((each) => each === parts.draft?.place);
    return { ...current, form: parts.draft, body: parts.body, full: null, place: named ?? current.place };
}

/**
 * A header moved from one starter to another: a key still as the old starter wrote it takes the
 * new starter's value, and a key the reader changed stays.
 * @param form - the header.
 * @param from - the old starter's header.
 * @param to - the new starter's header.
 * @returns the header.
 */
function swapStarter(form: ShaderTextDraft, from: ShaderTextDraft, to: ShaderTextDraft): ShaderTextDraft {
    const entries = [...new Set([...Object.keys(form), ...Object.keys(to)])].map((key) => [
        key,
        JSON.stringify(form[key]) === JSON.stringify(from[key]) ? to[key] : form[key],
    ]);
    return Object.fromEntries(entries.filter(([, value]) => value !== undefined)) as ShaderTextDraft;
}

/**
 * The state after choosing a place. An untouched starter becomes the new place's starter; edited
 * code stays, and takes the new starter's Reach when it has none.
 * @param state - the state.
 * @param tab - the tab.
 * @param next - the place.
 * @returns the state.
 */
function movedToPlace(state: EditorState, tab: ShaderTab, next: ShaderPlace): EditorState {
    const starterText = templateOf(tab, state.place);
    const nextText = templateOf(tab, next);
    if (state.full !== null) {
        const untouched = state.full.trim() === "" || state.full === starterText;
        return { ...state, place: next, full: untouched ? nextText : state.full };
    }
    const from = splitShaderText(starterText);
    const to = splitShaderText(nextText);
    // The Minimum size field leaves with a place that cannot use it, and the key would be refused.
    const form = minSizeApplies([next]) ? state.form : { ...state.form, minSize: undefined };
    if (state.body.trim() === "" || state.body === from.body) {
        return { ...state, place: next, body: to.body, form: swapStarter(form, from.draft ?? {}, to.draft ?? {}) };
    }
    const reach = to.draft?.reach;
    const takesReach = shaderPlaceUsesReach(next) && form.reach === undefined && reach !== undefined;
    return { ...state, place: next, form: { ...form, place: next, ...(takesReach ? { reach } : {}) } };
}

/**
 * The header with a new Name: the hidden id follows it while it is still the one the old name or
 * the starter gave, and any other id stays.
 * @param form - the header.
 * @param name - the new name.
 * @param starterId - the current starter's id.
 * @returns the header.
 */
function withName(form: ShaderTextDraft, name: string, starterId: unknown): ShaderTextDraft {
    const previous = typeof form.name === "string" ? form.name : "";
    const follows = form.id === shaderIdForName(previous) || form.id === starterId;
    return { ...form, name: name === "" ? undefined : name, ...(follows ? { id: shaderIdForName(name) } : {}) };
}

/** Where a problem shows, besides the list. */
type ProblemSite =
    | { readonly kind: "line"; readonly line: number; readonly column: number }
    | { readonly kind: "before"; readonly line: number; readonly column: number }
    | { readonly kind: "field"; readonly field: string }
    | { readonly kind: "param"; readonly index: number; readonly field: string }
    | { readonly kind: "full" }
    | { readonly kind: "target"; readonly found: Target }
    | { readonly kind: "plain" };

/** Every target a draft can be for. */
const TARGETS: readonly Target[] = ["node", "edge", "group", "background"];

/** The header keys the form has a field for, besides Place. */
const FORM_KEYS: ReadonlySet<string> = new Set(["name", "reach", "minSize"]);

/** The parameter fields the form shows. */
const ROW_FIELDS: ReadonlySet<string> = new Set(["name", "type", "default", ...GEAR_FIELDS]);

/**
 * The row a problem's `param` names: `#<index>` for one with no name, else the last of that name.
 * @param param - the name.
 * @param form - the header.
 * @returns the row's index, -1 for none.
 */
function rowOfProblem(param: unknown, form: ShaderTextDraft): number {
    if (typeof param !== "string") {
        return -1;
    }
    return param.startsWith("#")
        ? Number(param.slice(1))
        : (form.params ?? []).map((row) => row.name).lastIndexOf(param);
}

/**
 * Where a parameter's problem belongs.
 * @param problem - the problem.
 * @param form - the header.
 * @returns the site.
 */
function paramSite(problem: ShaderProblem, form: ShaderTextDraft): ProblemSite {
    const index = rowOfProblem(problem.params.param, form);
    const field = problem.code === "shader.reserved" ? "name" : String(problem.params.field);
    const row = form.params?.[index];
    // A default bound to a clock is edited in the gear's Starts fields, not in the row's cell.
    const bound = field === "default" && row !== undefined && shaderParamClock(row) !== undefined;
    return index >= 0 && ROW_FIELDS.has(field)
        ? { kind: "param", index, field: bound ? "clock" : field }
        : { kind: "full" };
}

/**
 * Where a header key's problem belongs.
 * @param key - the key.
 * @param inFull - whether Full text is on.
 * @returns the site.
 */
function keySite(key: unknown, inFull: boolean): ProblemSite {
    if (key === "place" || (!inFull && FORM_KEYS.has(String(key)))) {
        return { kind: "field", field: String(key) };
    }
    return inFull ? { kind: "plain" } : { kind: "full" };
}

/**
 * Where a problem belongs: a line of the box, a field of the form, or the list alone.
 * @param problem - the problem.
 * @param form - the header.
 * @param bodyLine - the line of the composed text the body starts on.
 * @param inFull - whether Full text is on.
 * @returns the site.
 */
function siteOf(problem: ShaderProblem, form: ShaderTextDraft, bodyLine: number, inFull: boolean): ProblemSite {
    const { line, column, key } = problem.params;
    if (typeof line === "number") {
        const at = typeof column === "number" ? column : 1;
        if (inFull || line >= bodyLine) {
            return { kind: "line", line: inFull ? line : line - bodyLine + 1, column: at };
        }
        return { kind: "before", line, column: at };
    }
    if (problem.code === "shader.place-unsupported") {
        return { kind: "field", field: "place" };
    }
    if (problem.code === "shader.target-mismatch") {
        const found = TARGETS.find((each) => each === problem.params.found);
        return found === undefined ? { kind: "plain" } : { kind: "target", found };
    }
    if (problem.code === "shader.header-key") {
        return keySite(key, inFull);
    }
    if (!inFull && (problem.code === "shader.param-invalid" || problem.code === "shader.reserved")) {
        return paramSite(problem, form);
    }
    return { kind: "plain" };
}

/**
 * The character offset of a 1-based line and column in text.
 * @param text - the text.
 * @param line - the line.
 * @param column - the column.
 * @returns the offset.
 */
function offsetOf(text: string, line: number, column: number): number {
    let at = 0;
    for (let n = 1; n < line; n++) {
        const next = text.indexOf("\n", at);
        if (next < 0) {
            return text.length;
        }
        at = next + 1;
    }
    return Math.min(at + Math.max(column - 1, 0), text.length);
}

/** Props for ShaderEditorDialog. */
interface ShaderEditorDialogProps {
    readonly session: GraphSession;
    /** The list it opens for: a tab's Shaders, or the Background; absent from the menu. */
    readonly tab?: ShaderTab;
    /**
     * Writes a shader where the opening list draws it (a layer's row at the shader's own place,
     * the background), through the scope given, so the add and the write are one undo step. Used
     * only while the switch is on that list's tab; absent from the menu.
     */
    readonly put?: (scope: GraphSession, id: string, params: ShaderParams) => Promise<void>;
    readonly init: PasteInit;
    readonly onClose: () => void;
}

/**
 * The shader editor (New shader, or Edit shader for Duplicate and edit). Place comes first, with
 * the words and diagrams of the tiles' place badges; Name, Reach, Minimum size and the parameter
 * rows edit the header, and the code box holds only the body. The form and the body compose the
 * shader text every check, the preview and Add use, so nothing can differ from a paste. Full text
 * shows that whole text in the same box. Problems stay in a list and mark what they are about: a
 * line of the box, a field, a parameter row. Add adds it to the project and puts it where the list
 * draws it, as one undo step; text whose body equals a known shader's applies that one with the
 * parameter values it differs by. With no list to write to (the menu, or the switch moved off the
 * opening list's tab) it adds to the project only, as Add to project, and posts a notice. The switch
 * swaps per-target drafts; each survives closing. Escape closes the dialog and keeps
 * the work as an unsent draft.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.tab - the list it opens for, absent from the menu
 * @param props.put - writes a shader where the list draws it, absent from the menu
 * @param props.init - the text and place to start from
 * @param props.onClose - closes the dialog
 * @returns The dialog
 */
export function ShaderEditorDialog({
    session,
    tab: listTab,
    put,
    init,
    onClose,
}: Readonly<ShaderEditorDialogProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const problemsId = useId();
    const book = bookOf(session);
    const [tab, setTab] = useState<ShaderTab>(() => listTab ?? tabOfTarget(book.last ?? "node"));
    const places = DIALOG_PLACES[tab];
    const [state, setState] = useState<EditorState>(() => openingState(book, tab, init));
    // The state as last drawn, for closing from a listener registered by an earlier render.
    const stateNow = useRef(state);
    stateNow.current = state;
    const { form, body, full, place, edited } = state;
    // The check of the text as it is now; null while it is pending.
    const [result, setResult] = useState<ShaderAddResult | null>(null);
    const [adding, setAdding] = useState(false);
    // The last picture the element drew of text that passed: kept while the text does not.
    const [drawn, setDrawn] = useState<Blob | undefined>(undefined);
    // The element hands the same picture back for the same text, so a re-check makes no new address.
    const picture = useMemo(() => (drawn === undefined ? undefined : URL.createObjectURL(drawn)), [drawn]);
    // Whether the reader has clicked or typed in the box since its text was last loaded, so its
    // cursor means something; focus alone (autofocus) leaves the caret before the code.
    const [hasCursor, setHasCursor] = useState(false);
    const box = useRef<HTMLTextAreaElement>(null);
    const editor = useRef<ShaderCodeEditorHandle>(null);
    const { Editor, takeFocusAt } = useCodeEditor(box);
    const [tabMoves, setTabMoves] = useState(false);
    const { hasOpenPopouts } = usePopoutManager();
    const fields = useRef<HTMLDivElement>(null);
    // What to do with the box once the value just set has been drawn: place the caret.
    const afterDraw = useRef<(() => void) | null>(null);
    const text = full ?? formatShaderDraft(form, body);
    const bodyLine = useMemo(() => splitShaderText(text).bodyLine, [text]);
    const boxValue = full ?? body;
    const target = targetOfPlace(tab, place);
    const onList = put !== undefined && tab === listTab;
    // With no list to write the values to, a changed default is kept only by joining as new.
    const defaultsChanged =
        !onList && JSON.stringify(form.params ?? []) !== JSON.stringify(state.loaded.draft.params ?? []);
    // A known copy stays the element's decision until the reader makes this text something else.
    const asNew = init.duplicateOf !== undefined || edited || defaultsChanged;
    const options = {
        target,
        ...(place === undefined || place === "group" ? {} : { place }),
        ...(asNew ? { asNew } : {}),
        onTaken: "rename",
    } as const;

    useEffect(() => {
        setResult(null);
        if (boxValue.trim() === "") {
            return undefined;
        }
        // A check finished after the text, target, place or asNew moved on describes nothing shown.
        let current = true;
        const timer = setTimeout(() => {
            session.shaders
                .check(text, { ...options, picture: true })
                .then((checked) => {
                    if (!current) {
                        return;
                    }
                    setResult(checked);
                    if (checked.ok && checked.picture !== undefined) {
                        setDrawn(checked.picture);
                    }
                    // A place the text's own header names is where it draws: the field shows it.
                    const named = checked.ok ? checked.descriptor.place : undefined;
                    if (named !== undefined && named !== place && places.includes(named)) {
                        setState((now) => ({ ...now, place: named }));
                    }
                })
                .catch((error: unknown) => {
                    // A graph disposed during the check (the project closed) has nothing left to report to.
                    if (!(error instanceof GraphtyError && error.code === "E_DISPOSED")) {
                        throw error;
                    }
                });
        }, CHECK_PAUSE_MS);
        return () => {
            current = false;
            clearTimeout(timer);
        };
        // The options are the target and place, which the dependencies name; places follows tab.
        // boxValue follows text, which is named.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, text, target, place, asNew]);

    useEffect(
        () => () => {
            if (picture !== undefined) {
                URL.revokeObjectURL(picture);
            }
        },
        [picture],
    );

    useLayoutEffect(() => {
        const act = afterDraw.current;
        if (act !== null) {
            afterDraw.current = null;
            act();
        }
    });

    /** A whole text just replaced what the box held, and its caret went back to the start. */
    const textReplaced = (): void => {
        setHasCursor(false);
    };

    // The editor replacing the plain box starts its caret at 0, unless it took the box's caret over.
    useEffect(() => {
        if (Editor !== null && takeFocusAt === undefined) {
            setHasCursor(false);
        }
    }, [Editor, takeFocusAt]);

    /**
     * A click or a key in the code box, which places its caret where the reader means.
     * @param event - the event.
     */
    const touchBox = (event: React.PointerEvent | React.KeyboardEvent): void => {
        const inPreview = event.target instanceof Element && event.target.closest(".ws-paste-preview") !== null;
        if (!inPreview && !("key" in event && event.key === "Tab")) {
            setHasCursor(true);
        }
    };

    /**
     * Loads text from outside the form.
     * @param loaded - the text.
     */
    const load = (loaded: string): void => {
        setState((now) => loadedAs(stateFromText(loaded, tab, now)));
        textReplaced();
    };

    const setForm = (next: ShaderTextDraft): void => {
        setState((now) => ({
            ...now,
            form: next,
            edited: now.edited || headerShape(now.form) !== headerShape(next),
        }));
    };

    /**
     * Shows another draft, saving this one under its target first.
     * @param nextTab - the tab it is on.
     * @param next - the draft.
     */
    const showDraft = (nextTab: ShaderTab, next: EditorState): void => {
        book.drafts.set(target, state);
        if (tab === "node" && nextTab !== "node") {
            book.onNode = target;
        }
        book.last = targetOfPlace(nextTab, next.place);
        setTab(nextTab);
        setState(next);
        setDrawn(undefined);
        textReplaced();
    };

    const choosePlace = (next: ShaderPlace): void => {
        const nextTarget = targetOfPlace(tab, next);
        if (nextTarget === target) {
            setState((now) => ({
                ...movedToPlace(now, tab, next),
                edited: now.edited || next !== now.place,
            }));
            return;
        }
        // A group outline's place is its own target, under the same draft rule as the switch.
        const other = book.drafts.get(nextTarget) ?? starterState(tab, next);
        showDraft(tab, other.place === next ? other : movedToPlace(other, tab, next));
    };

    const switchTab = (next: ShaderTab): void => {
        if (next !== tab) {
            // The Node tab comes back at the target the reader left it on, a group outline included.
            const nextTarget = next === "node" ? (book.onNode ?? "node") : next;
            const firstPlace = nextTarget === "group" ? "group" : FIRST_PLACE[next];
            showDraft(next, book.drafts.get(nextTarget) ?? starterState(next, firstPlace));
        }
    };

    /**
     * Moves the text the element says is written for another target into that target's draft.
     * @param found - the target it is written for.
     */
    const moveToTarget = (found: Target): void => {
        const nextTab = tabOfTarget(found);
        const start = starterState(nextTab, found === "group" ? "group" : FIRST_PLACE[nextTab]);
        // The moved text replaces that target's draft.
        showDraft(nextTab, loadedAs(stateFromText(text, nextTab, start)));
        book.drafts.delete(target);
    };

    const typeInBox = (value: string): void => {
        if (full !== null) {
            setState((now) => ({ ...now, full: value, edited: true }));
        } else if (splitShaderText(value).headed) {
            load(value);
        } else {
            setState((now) => ({ ...now, body: value }));
        }
    };

    const caretAt = (line: number, column: number) => (): void => {
        if (editor.current !== null) {
            editor.current.focusAt(line, column);
            return;
        }
        const area = box.current;
        if (area !== null) {
            const at = offsetOf(area.value, line, column);
            area.focus();
            area.setSelectionRange(at, at);
        }
    };

    const toggleFull = (): void => {
        if (full === null) {
            setState((now) => ({ ...now, full: text }));
        } else {
            // Leaving Full text is not new text arriving: what the form was loaded from stands. A
            // text whose header the reader deleted has the placeholder header, not the old form.
            const parts = splitShaderText(full);
            setState((now) =>
                parts.headed
                    ? stateFromText(full, tab, now)
                    : { ...now, form: parts.draft ?? {}, body: parts.body, full: null },
            );
            textReplaced();
        }
    };

    const insertName = (name: string): void => {
        if (editor.current !== null) {
            editor.current.insert(name);
            return;
        }
        const area = box.current;
        if (area === null) {
            return;
        }
        const { selectionStart: start, selectionEnd: end } = area;
        setState((now) => ({ ...now, body: now.body.slice(0, start) + name + now.body.slice(end) }));
        afterDraw.current = () => {
            area.focus();
            area.setSelectionRange(start + name.length, start + name.length);
        };
    };

    const copyCode = (): void => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                store.set({ announcement: EDITOR_WORDS.copied });
            })
            .catch(() => {
                store.set({ notice: { message: EDITOR_WORDS.copyFailed, error: true } });
            });
    };

    const focusSelector = (selector: string): void => {
        const found = fields.current?.querySelector<HTMLElement>(selector);
        const control = found?.matches("input, button") === true ? found : found?.querySelector("input, button");
        (control as HTMLElement | null | undefined)?.focus();
    };

    const close = (added: boolean): void => {
        book.last = target;
        if (added) {
            book.drafts.delete(target);
        } else {
            book.drafts.set(target, stateNow.current);
        }
        onClose();
    };

    // Temporary: Mantine's Modal hears Escape first, on window in the capture phase, before a Popout
    // it contains, so Escape in a popout would close the whole dialog. Until the shared components
    // fix that defect (issue #6488), the Modal's own handling is off and this listener closes the
    // dialog unless a popout is open or the target opted out as Mantine's own check does.
    useEffect(() => {
        const onEscape = (event: KeyboardEvent): void => {
            const optedOut =
                event.target instanceof HTMLElement && event.target.dataset.mantineStopPropagation === "true";
            if (event.key === "Escape" && !event.isComposing && !optedOut && !hasOpenPopouts()) {
                // A parameter's Name commits when it loses focus: blur first, so the saved draft has it.
                flushSync(() => {
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                });
                close(false);
            }
        };
        globalThis.addEventListener("keydown", onEscape, { capture: true });
        return () => {
            globalThis.removeEventListener("keydown", onEscape, { capture: true });
        };
    });

    let waitWord: string | undefined;
    if (boxValue.trim() === "") {
        waitWord = PASTE_WAIT_WORDS.empty;
    } else if (result === null || adding) {
        waitWord = PASTE_WAIT_WORDS.checking;
    } else if (!result.ok) {
        waitWord = pasteProblemsWord(result.problems.length);
    }
    // What the checks found is said once it is found, as the rows show it.
    const found = result !== null && !result.ok ? pasteProblemsWord(result.problems.length) : undefined;
    useEffect(() => {
        if (found !== undefined) {
            store.set({ announcement: found });
        }
    }, [store, found, result]);

    const add = async (): Promise<void> => {
        setAdding(true);
        try {
            const checked = await session.shaders.check(text, options);
            if (!checked.ok) {
                setResult(checked);
                return;
            }
            const same = checked.sameAs;
            if (same !== undefined) {
                if (put !== undefined && onList) {
                    // At its own place: the text's header names it, or the field gave it to text that names none.
                    // A catalog shader is written through fromCatalog, so the save carries its text.
                    await put(session, await pickedShader(session, same.id), same.params);
                    store.set({ announcement: `${checked.descriptor.plainName} added` });
                } else {
                    // No list to write to, and the text is a shader already known: nothing joins.
                    const known = session.shaders.describe(same.id) ?? checked.descriptor;
                    store.set({ notice: shaderAddedNotice(store, session, known) });
                }
                close(true);
                return;
            }
            const added = await session.shaders.add(text, options);
            if (!added.ok) {
                setResult(added);
                return;
            }
            if (put === undefined || !onList) {
                // No list to write to: it joins the project and no layer changes.
                store.set({ notice: shaderAddedNotice(store, session, added.descriptor) });
                close(true);
                return;
            }
            const { id } = added.descriptor;
            // The write joins the add's step, so one Undo takes both back.
            const { history } = session;
            const step = history.steps[history.position - 1]?.id;
            await session.transaction(
                `Add the shader ${id}`,
                // The writes reach only the parts a transaction scope has, never its history.
                (tx) => put(tx as GraphSession, id, {}),
                step === undefined ? undefined : { after: step },
            );
            store.set({ announcement: `${added.descriptor.plainName} added` });
            close(true);
        } catch (error) {
            store.set({ notice: { message: failureWords("The shader", "added", error), error: true } });
        } finally {
            setAdding(false);
        }
    };

    const problems = result !== null && !result.ok ? result.problems : [];
    const invalid = problems.length > 0;
    const inFull = full !== null;
    const marks = useMemo<readonly ShaderCodeMark[]>(() => {
        const listed = result !== null && !result.ok ? result.problems : [];
        return listed.flatMap((problem) => {
            // A problem with a line never reads the header.
            const site = siteOf(problem, {}, bodyLine, inFull);
            return site.kind === "line"
                ? [{ line: site.line, column: site.column, message: pasteProblemWords(problem) }]
                : [];
        });
    }, [result, bodyLine, inFull]);
    const sited = problems.map((problem) => ({ problem, site: siteOf(problem, form, bodyLine, full !== null) }));
    const markedFields = new Set(sited.flatMap(({ site }) => (site.kind === "field" ? [site.field] : [])));
    const paramMarks = sited.flatMap(({ site }) => (site.kind === "param" ? [site] : []));
    // After every render, as the box is drawn: Mantine writes the attribute itself when it renders.
    useLayoutEffect(() => {
        if (invalid) {
            box.current?.setAttribute("aria-describedby", problemsId);
        } else {
            box.current?.removeAttribute("aria-describedby");
        }
    });

    const goToSite = (site: ProblemSite): void => {
        if (site.kind === "line") {
            caretAt(site.line, site.column)();
        } else if (site.kind === "before") {
            afterDraw.current = caretAt(site.line, site.column);
            setState((now) => ({ ...now, full: text }));
        } else if (site.kind === "full") {
            setState((now) => ({ ...now, full: text }));
        } else if (site.kind === "target") {
            moveToTarget(site.found);
        } else if (site.kind === "field") {
            focusSelector(`[data-field="${site.field}"]`);
        } else if (site.kind === "param") {
            const where = GEAR_FIELDS.has(site.field) ? "gear" : site.field;
            focusSelector(`[data-param="${String(site.index)}"][data-field="${where}"]`);
        }
    };

    const fieldMark = (field: string): { "data-field": string; "data-invalid"?: string } => ({
        "data-field": field,
        ...(markedFields.has(field) ? { "data-invalid": "" } : {}),
    });
    const usesReach = place !== undefined && shaderPlaceUsesReach(place);
    const usesMinSize = place !== undefined && minSizeApplies([place]);
    const starterId = splitShaderText(templateOf(tab, place)).draft?.id;
    return (
        <Modal
            opened
            onClose={() => {
                close(false);
            }}
            title={init.duplicateOf === undefined ? EDITOR_WORDS.newTitle : EDITOR_WORDS.editTitle}
            size="xl"
            closeOnEscape={false}
            closeButtonProps={{ id: CLOSE_BUTTON_ID, "aria-label": EDITOR_WORDS.close }}
        >
            <Tooltip label={EDITOR_WORDS.closeTip} target={`#${CLOSE_BUTTON_ID}`} />
            <Stack gap="xs" ref={fields} className="ws-shader-form">
                <PanelLabelsProvider showLabels>
                    {init.duplicateOf === undefined && (
                        <Group gap="xs">
                            <SegmentedControl
                                label={EDITOR_WORDS.drawsOn}
                                size="xs"
                                value={tab}
                                data={TAB_CHOICES}
                                onChange={(picked) => {
                                    switchTab(picked as ShaderTab);
                                }}
                            />
                        </Group>
                    )}
                    <div className="ws-shader-fields">
                        {places.length > 0 && (
                            <div {...fieldMark("place")}>
                                <PanelField
                                    label={GALLERY_WORDS.place}
                                    kind="select"
                                    width="fill"
                                    data-autofocus
                                    aria-invalid={markedFields.has("place") ? true : undefined}
                                    value={place ?? null}
                                    data={places.map((each) => ({ value: each, label: dialogPlaceWords(each, tab) }))}
                                    glyph={<PlaceDiagram place={place} tab={tab} />}
                                    optionGlyphs={Object.fromEntries(
                                        places.map((each) => [
                                            each,
                                            <PlaceDiagram key={each} place={each} tab={tab} />,
                                        ]),
                                    )}
                                    onChange={(picked) => {
                                        const next = places.find((each) => each === picked);
                                        if (next !== undefined) {
                                            choosePlace(next);
                                        }
                                    }}
                                />
                            </div>
                        )}
                        {full === null && (
                            <>
                                <div {...fieldMark("name")}>
                                    <PanelField
                                        label={EDITOR_WORDS.name}
                                        width="fill"
                                        aria-invalid={markedFields.has("name") ? true : undefined}
                                        value={typeof form.name === "string" ? form.name : ""}
                                        onChange={(next) => {
                                            setForm(withName(form, String(next), starterId));
                                        }}
                                    />
                                </div>
                                {usesReach && (
                                    <div {...fieldMark("reach")}>
                                        <PanelField
                                            label={EDITOR_WORDS.reach}
                                            kind="number"
                                            width="fill"
                                            aria-invalid={markedFields.has("reach") ? true : undefined}
                                            min={SHADER_REACH_RANGE.min}
                                            max={SHADER_REACH_RANGE.max}
                                            value={typeof form.reach === "number" ? form.reach : SHADER_REACH_RANGE.min}
                                            onChange={(next) => {
                                                setForm({ ...form, reach: Number(next) });
                                            }}
                                        />
                                    </div>
                                )}
                                {usesMinSize && (
                                    <div {...fieldMark("minSize")}>
                                        <NumberTextField
                                            label={EDITOR_WORDS.minSize}
                                            value={form.minSize}
                                            invalid={markedFields.has("minSize")}
                                            range={SHADER_MIN_SIZE_RANGE}
                                            onChange={(next) => {
                                                setForm({ ...form, minSize: next });
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </PanelLabelsProvider>
                <Group
                    className="ws-shader-code"
                    align="flex-start"
                    gap="xs"
                    wrap="nowrap"
                    onPointerDown={touchBox}
                    onKeyDown={touchBox}
                >
                    {Editor === null ? (
                        <Textarea
                            ref={box}
                            style={{ flex: 1 }}
                            aria-label={EDITOR_WORDS.code}
                            data-autofocus={places.length === 0 ? true : undefined}
                            autosize
                            minRows={12}
                            maxRows={24}
                            spellCheck={false}
                            styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: 12 } }}
                            value={boxValue}
                            // Mantine's error state: the invalid look and aria-invalid. The problems that
                            // describe it are tied to it below, as Mantine ties only an error text of its own.
                            error={invalid}
                            onChange={(event) => {
                                typeInBox(event.currentTarget.value);
                            }}
                        />
                    ) : (
                        <Editor
                            ref={editor}
                            value={boxValue}
                            marks={marks}
                            label={EDITOR_WORDS.code}
                            autoFocus={places.length === 0}
                            describedBy={invalid ? problemsId : undefined}
                            takeFocusAt={takeFocusAt}
                            onChange={typeInBox}
                            onTabMode={setTabMoves}
                        />
                    )}
                    {/* What the element draws of the text, framed by what it draws on; nothing reaches the graph until Add. */}
                    {picture === undefined ? (
                        <span className="ws-gallery-picture ws-paste-preview" aria-hidden />
                    ) : (
                        <img className="ws-gallery-picture ws-paste-preview" src={picture} alt={EDITOR_WORDS.preview} />
                    )}
                </Group>
                <Group gap="xs" justify="space-between">
                    <Group gap={4}>
                        <Button
                            size="xs"
                            variant="subtle"
                            disabled={Editor === null}
                            aria-keyshortcuts={ariaKey(TAB_TOGGLE_KEY)}
                            onClick={() => {
                                editor.current?.toggleTabMode();
                            }}
                        >
                            {Editor === null || tabMoves ? EDITOR_WORDS.tabNextField : EDITOR_WORDS.tabIndent}
                            {"  "}
                            {formatKey(TAB_TOGGLE_KEY)}
                        </Button>
                        <Button size="xs" variant="subtle" aria-pressed={full !== null} onClick={toggleFull}>
                            {EDITOR_WORDS.fullText}
                        </Button>
                        <Button size="xs" variant="subtle" onClick={copyCode}>
                            {EDITOR_WORDS.copyCode}
                        </Button>
                    </Group>
                    <Anchor href={SHADER_GUIDE_URL} target="_blank" rel="noopener noreferrer" size="xs">
                        {PASTE_GUIDE_WORDS}
                    </Anchor>
                </Group>
                {full === null && (
                    <ShaderParamRows
                        draft={form}
                        tab={tab}
                        marks={paramMarks}
                        canInsert={hasCursor}
                        onChange={setForm}
                        onInsert={insertName}
                    />
                )}
                {problems.length > 0 && (
                    <div // NOSONAR(S6819): a list of block buttons and lines styled as one column; a ul would bring its own margin and bullets
                        role="list"
                        aria-label={EDITOR_WORDS.problems}
                        className="ws-paste-problems"
                        id={problemsId}
                    >
                        {sited.map(({ problem, site }, index) => (
                            <div // NOSONAR(S6819): an item of the ARIA list above, which is a div for the same reason
                                role="listitem"
                                key={`${problem.code}:${String(index)}`}
                            >
                                <ProblemRow
                                    problem={problem}
                                    site={site}
                                    onGo={() => {
                                        goToSite(site);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </Stack>
            <ModalFooter>
                <Tooltip label={waitWord} disabled={waitWord === undefined}>
                    <Button
                        size="xs"
                        data-disabled={waitWord === undefined ? undefined : true}
                        aria-disabled={waitWord === undefined ? undefined : true}
                        onClick={() => {
                            if (waitWord === undefined) {
                                void add();
                            }
                        }}
                    >
                        {onList ? EDITOR_WORDS.add : EDITOR_WORDS.addToProject}
                    </Button>
                </Tooltip>
            </ModalFooter>
        </Modal>
    );
}

/**
 * One row of the problem list: a button that goes where the problem belongs, or plain words.
 * A problem only Full text can reach keeps its words as text, with a Full text button beside it.
 * @param props - Component props
 * @param props.problem - the problem
 * @param props.site - where it belongs
 * @param props.onGo - goes there
 * @returns The row
 */
function ProblemRow({
    problem,
    site,
    onGo,
}: Readonly<{ problem: ShaderProblem; site: ProblemSite; onGo: () => void }>): React.JSX.Element {
    const words = pasteProblemWords(problem);
    if (site.kind === "plain") {
        return (
            <Text className="ws-paste-problem" data-code={problem.code}>
                {words}
            </Text>
        );
    }
    if (site.kind === "full") {
        return (
            <Group gap={4} wrap="nowrap">
                <Text className="ws-paste-problem" data-code={problem.code}>
                    {words}
                </Text>
                <Button size="compact-xs" variant="subtle" onClick={onGo}>
                    {EDITOR_WORDS.fullText}
                </Button>
            </Group>
        );
    }
    const where =
        site.kind === "line"
            ? shaderPlaceWords({ ...problem, params: { ...problem.params, line: site.line } })
            : shaderPlaceWords(problem);
    return (
        <UnstyledButton className="ws-paste-problem" data-code={problem.code} onClick={onGo}>
            {where !== undefined && <b>{where}</b>}
            <span>{words}</span>
        </UnstyledButton>
    );
}
