import {
    history,
    historyKeymap,
    indentWithTab,
    redo,
    standardKeymap,
    toggleTabFocusMode,
    undo,
} from "@codemirror/commands";
import {
    bracketMatching,
    HighlightStyle,
    indentOnInput,
    StreamLanguage,
    syntaxHighlighting,
} from "@codemirror/language";
import { shader } from "@codemirror/legacy-modes/mode/clike";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import { EditorState, type Extension, Prec, type Text } from "@codemirror/state";
import { type Command, drawSelection, EditorView, keymap, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

/** A problem at a place in the box. */
export interface ShaderCodeMark {
    /** 1-based line of the box's text. */
    readonly line: number;
    /** 1-based column. */
    readonly column: number;
    /** The words shown on hover. */
    readonly message: string;
}

/** What the dialog asks of the editor. */
export interface ShaderCodeEditorHandle {
    /** Whether the editor holds focus. */
    hasFocus: () => boolean;
    /** Focuses the editor with its caret at a 1-based line and column. */
    focusAt: (line: number, column: number) => void;
    /** Replaces the selection with text, as the reader's own edit, and focuses the editor. */
    insert: (text: string) => void;
    /** Switches what Tab does between indenting and moving focus. */
    toggleTabMode: () => void;
}

/** The props the editor's extensions read when they run, long after the render that made them. */
interface LiveProps {
    readonly label: string;
    readonly autoFocus: boolean;
    readonly describedBy: string | undefined;
    readonly onChange: (text: string) => void;
    readonly onFocus: () => void;
    readonly onTabMode: (moves: boolean) => void;
}

/** Props for ShaderCodeEditor. */
interface ShaderCodeEditorProps extends LiveProps {
    readonly value: string;
    readonly marks: readonly ShaderCodeMark[];
    /** The offset to take focus at, when the plain box this replaces held focus. */
    readonly takeFocusAt: number | undefined;
    readonly ref: React.Ref<ShaderCodeEditorHandle>;
}

const LINE_HEIGHT = 1.55;

const shaderLanguage = StreamLanguage.define(shader);

/** Colors from Mantine's variables, which follow light and dark. */
const shaderColors = HighlightStyle.define([
    { tag: tags.keyword, color: "var(--mantine-color-violet-text)" },
    { tag: tags.typeName, color: "var(--mantine-color-blue-text)" },
    { tag: tags.standard(tags.variableName), color: "var(--mantine-color-teal-text)" },
    { tag: tags.atom, color: "var(--mantine-color-orange-text)" },
    { tag: tags.number, color: "var(--mantine-color-orange-text)" },
    { tag: tags.comment, color: "var(--mantine-color-dimmed)" },
    { tag: tags.meta, color: "var(--mantine-color-grape-text)" },
]);

const editorTheme = EditorView.theme({
    "&": {
        color: "var(--mantine-color-text)",
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-sm)",
        fontSize: "12px",
    },
    "&.cm-focused": { outline: "none", borderColor: "var(--mantine-primary-color-filled)" },
    "&:has(.cm-content[aria-invalid])": { borderColor: "var(--mantine-color-error)" },
    ".cm-scroller": {
        fontFamily: "var(--mantine-font-family-monospace)",
        lineHeight: String(LINE_HEIGHT),
        minHeight: `${String(12 * LINE_HEIGHT)}em`,
        maxHeight: `${String(24 * LINE_HEIGHT)}em`,
        overflow: "auto",
    },
    ".cm-content": { caretColor: "var(--mantine-color-text)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--mantine-color-text)" },
    ".cm-gutters": { backgroundColor: "transparent", color: "var(--mantine-color-dimmed)", border: "none" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: "var(--mantine-primary-color-light)",
    },
    "&.cm-focused .cm-matchingBracket": { backgroundColor: "var(--mantine-primary-color-light)" },
});

/**
 * A command that claims its key whatever it did, so Undo with nothing left to undo stays in the
 * box and never reaches the project's history behind the dialog.
 * @param command - the command.
 * @returns the command, reporting that it handled the key.
 */
function claimKey(command: Command): Command {
    return (view) => {
        command(view);
        return true;
    };
}

/**
 * The offset of a 1-based line and column, held inside the text.
 * @param doc - the text.
 * @param line - the line.
 * @param column - the column.
 * @returns the offset.
 */
function offsetAt(doc: Text, line: number, column: number): number {
    const found = doc.line(Math.min(Math.max(line, 1), doc.lines));
    return Math.min(found.from + Math.max(column - 1, 0), found.to);
}

/**
 * The editor's extensions, the same for every text it is given.
 * @param live - the current props.
 * @param toggleTab - the command that switches what Tab does.
 * @returns the extensions.
 */
function editorExtensions(live: React.RefObject<LiveProps>, toggleTab: Command): Extension {
    return [
        lineNumbers(),
        history(),
        drawSelection(),
        bracketMatching(),
        indentOnInput(),
        shaderLanguage,
        syntaxHighlighting(shaderColors),
        lintGutter(),
        editorTheme,
        Prec.high(
            keymap.of([
                { key: "Mod-z", run: claimKey(undo) },
                { key: "Mod-y", run: claimKey(redo) },
                { key: "Mod-Shift-z", run: claimKey(redo) },
                indentWithTab,
                { key: "Ctrl-m", mac: "Shift-Alt-m", run: toggleTab },
            ]),
        ),
        keymap.of([...standardKeymap, ...historyKeymap]),
        EditorView.contentAttributes.of(() => {
            const { label, autoFocus, describedBy } = live.current;
            return {
                // Mantine's focus trap does not count contenteditable as something that can take focus.
                tabindex: "0",
                "aria-label": label,
                ...(autoFocus ? { "data-autofocus": "true" } : {}),
                ...(describedBy === undefined ? {} : { "aria-invalid": "true", "aria-describedby": describedBy }),
            };
        }),
        EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const text = update.state.doc.toString();
                // Committed before this returns: a later key press must find the dialog holding this
                // text, or the value coming back would look like a load and replace the newer typing.
                flushSync(() => {
                    live.current.onChange(text);
                });
            }
            if (update.focusChanged && update.view.hasFocus) {
                live.current.onFocus();
            }
        }),
    ];
}

/**
 * The shader code box: CodeMirror, used directly and loaded on its own the first time the dialog
 * opens. The reader's edits stay in the editor's history; any other text that arrives as `value`
 * starts a fresh state, so Undo never crosses into text that was loaded over the reader's own.
 * @param props - Component props
 * @param props.value - the box's text
 * @param props.marks - the problems to mark
 * @param props.label - the accessible name
 * @param props.autoFocus - whether the dialog's focus trap should start here
 * @param props.describedBy - the id of what describes the problems, while there are any
 * @param props.takeFocusAt - the offset to take focus at, when the plain box held focus
 * @param props.onChange - the reader changed the text
 * @param props.onFocus - the editor took focus
 * @param props.onTabMode - what Tab does changed
 * @param props.ref - what the dialog asks of the editor
 * @returns The editor
 */
export function ShaderCodeEditor({
    value,
    marks,
    takeFocusAt,
    ref,
    ...liveProps
}: Readonly<ShaderCodeEditorProps>): React.JSX.Element {
    const host = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);
    const live = useRef<LiveProps>(liveProps);
    live.current = liveProps;
    const start = useRef({ value, takeFocusAt });
    const tabMoves = useRef(false);
    const toggleTab = useCallback<Command>((target) => {
        toggleTabFocusMode(target);
        tabMoves.current = !tabMoves.current;
        live.current.onTabMode(tabMoves.current);
        return true;
    }, []);
    const [extensions] = useState(() => editorExtensions(live, toggleTab));

    useEffect(() => {
        if (host.current === null) {
            return undefined;
        }
        const created = new EditorView({
            parent: host.current,
            state: EditorState.create({ doc: start.current.value, extensions }),
        });
        const at = start.current.takeFocusAt;
        if (at !== undefined) {
            created.dispatch({ selection: { anchor: Math.min(at, created.state.doc.length) } });
            created.focus();
        }
        setView(created);
        return () => {
            created.destroy();
        };
    }, [extensions]);

    // Before the dialog's own layout effects, which may place the caret in the text set here.
    useLayoutEffect(() => {
        if (view === null) {
            return;
        }
        // ponytail: text equal to what is shown keeps its undo history; a load id if that ever matters.
        if (value !== view.state.doc.toString()) {
            view.setState(EditorState.create({ doc: value, extensions }));
        }
        const { doc } = view.state;
        const diagnostics = marks.map((mark) => {
            const from = offsetAt(doc, mark.line, mark.column);
            return { from, to: doc.lineAt(from).to, severity: "error" as const, message: mark.message };
        });
        // Also refreshes the content attributes, which read the problems' description.
        view.dispatch(setDiagnostics(view.state, diagnostics));
    }, [view, value, marks, liveProps.describedBy, extensions]);

    useImperativeHandle(
        ref,
        () => ({
            hasFocus: () => view?.hasFocus === true,
            focusAt: (line, column) => {
                if (view !== null) {
                    view.dispatch({
                        selection: { anchor: offsetAt(view.state.doc, line, column) },
                        scrollIntoView: true,
                    });
                    view.focus();
                }
            },
            insert: (text) => {
                if (view !== null) {
                    view.dispatch(view.state.replaceSelection(text));
                    view.focus();
                }
            },
            toggleTabMode: () => {
                if (view !== null) {
                    toggleTab(view);
                }
            },
        }),
        [view, toggleTab],
    );

    return <div ref={host} style={{ flex: 1, minWidth: 0 }} data-editor={view === null ? undefined : "ready"} />;
}
