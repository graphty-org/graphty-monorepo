import { ModalFooter } from "@graphty/compact-mantine";
import { parseShaderText, type ShaderKind, type ShaderParams } from "@graphty/graphty-element/catalog";
import type { GraphSession, ShaderAddResult } from "@graphty/graphty-element/session";
import { Button, Modal, NativeSelect, Stack, Text, Textarea, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import {
    failureWords,
    PASTE_WAIT_WORDS,
    pasteProblemsWord,
    pasteProblemWords,
    SHADER_HOME_WORDS,
    SHADER_KIND_WORDS,
    shaderPlaceWords,
} from "./words";

/** How long typing pauses before the text is checked. */
const CHECK_PAUSE_MS = 300;

/** Every kind of shader, in the Kind select's order, as the panel's sections hold them. */
const KINDS: readonly ShaderKind[] = [
    "node-surface",
    "node-sprite",
    "node-effect",
    "edge-surface",
    "edge-effect",
    "boundary",
    "background",
];

/** What the dialog opens with: text to start from, and the shader it duplicates. */
export interface PasteInit {
    /** The text in the code box; absent: the session's unsent draft. */
    readonly text?: string;
    /** The shader this text is a copy of (Duplicate and edit): a pick equal to it still adds a copy. */
    readonly duplicateOf?: string;
}

/** The unsent text of each session's dialog, kept when it is closed without adding. */
const drafts = new WeakMap<GraphSession, string>();

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

/** Props for PasteShaderDialog. */
interface PasteShaderDialogProps {
    readonly session: GraphSession;
    /** The kinds the opening section takes; the first is the Kind select's start. */
    readonly kinds: readonly ShaderKind[];
    /**
     * Writes a shader where the opening section draws it (a layer's row, the background), through
     * the scope given, so the add and the write are one undo step.
     */
    readonly put: (scope: GraphSession, id: string, params: ShaderParams) => Promise<void>;
    readonly init: PasteInit;
    readonly onClose: () => void;
}

/**
 * Paste shader (shader-styles design, section 6.4), titled Edit shader for Duplicate and edit: the
 * code box, a Kind select that starts at the kind the text's header names, else the one the opening
 * section takes, the problems the element finds as rows that put the cursor on their line (a
 * problem with no line is plain text), and Add. While typing pauses the text gets every check Add
 * makes, compiling included; the problems are announced and mark the code box invalid. Add adds it
 * to the project and puts it where the section draws it, as one undo step; a kind the section does
 * not take keeps the dialog open and names the section that does. Text whose body equals a known
 * shader's applies that one with the parameter values it differs by. A failed paste changes
 * nothing. Escape closes the dialog from any control in it and keeps the text as an unsent draft.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.kinds - the kinds the opening section takes
 * @param props.put - writes a shader where the section draws it
 * @param props.init - the text to start from
 * @param props.onClose - closes the dialog
 * @returns The dialog
 */
export function PasteShaderDialog({
    session,
    kinds,
    put,
    init,
    onClose,
}: Readonly<PasteShaderDialogProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const problemsId = useId();
    const [text, setText] = useState(() => init.text ?? drafts.get(session) ?? "");
    // The kind the reader picked, else the one the text's header names, else the section's.
    const [picked, setPicked] = useState<ShaderKind | null>(null);
    const [headerKind, setHeaderKind] = useState<ShaderKind | undefined>(undefined);
    const kind = picked ?? headerKind ?? kinds[0] ?? "node-effect";
    // The check of the text as it is now; null while it is pending.
    const [result, setResult] = useState<ShaderAddResult | null>(null);
    const [adding, setAdding] = useState(false);
    const box = useRef<HTMLTextAreaElement>(null);
    const textNow = useRef(text);
    textNow.current = text;

    useEffect(() => {
        setResult(null);
        if (text.trim() === "") {
            return undefined;
        }
        const timer = setTimeout(() => {
            const read = parseShaderText(text);
            setHeaderKind(read.ok ? read.registration.descriptor.kind : undefined);
            void session.shaders.check(text, { kind, onTaken: "rename" }).then((checked) => {
                if (textNow.current === text) {
                    setResult(checked);
                }
            });
        }, CHECK_PAUSE_MS);
        return () => {
            clearTimeout(timer);
        };
    }, [session, text, kind]);

    const close = (added: boolean): void => {
        if (added) {
            drafts.delete(session);
        } else {
            drafts.set(session, text);
        }
        onClose();
    };

    // A shader of a kind the section does not take: the section that does.
    const home =
        result?.ok === true && !kinds.includes(result.descriptor.kind)
            ? SHADER_HOME_WORDS[result.descriptor.kind]
            : undefined;
    let waitWord: string | undefined;
    if (text.trim() === "") {
        waitWord = PASTE_WAIT_WORDS.empty;
    } else if (result === null || adding) {
        waitWord = PASTE_WAIT_WORDS.checking;
    } else if (!result.ok) {
        waitWord = pasteProblemsWord(result.problems.length);
    } else {
        waitWord = home;
    }
    // What the checks found is said once it is found, as the rows show it.
    const found = result !== null && !result.ok ? pasteProblemsWord(result.problems.length) : home;
    useEffect(() => {
        if (found !== undefined) {
            store.set({ announcement: found });
        }
    }, [store, found, result]);

    const add = async (): Promise<void> => {
        setAdding(true);
        try {
            const checked = await session.shaders.check(text, { kind, onTaken: "rename" });
            if (!checked.ok) {
                setResult(checked);
                return;
            }
            // A kind the section does not take stays here, its home named; nothing is added.
            if (!kinds.includes(checked.descriptor.kind)) {
                setResult(checked);
                return;
            }
            const same = checked.sameAs;
            if (same !== undefined && same.id !== init.duplicateOf) {
                await put(session, same.id, same.params);
                store.set({ announcement: `${checked.descriptor.plainName} added` });
                close(true);
                return;
            }
            const added = await session.shaders.add(text, { kind, onTaken: "rename" });
            if (!added.ok) {
                setResult(added);
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

    const jump = (line: number, column: number): void => {
        const area = box.current;
        if (area === null) {
            return;
        }
        const at = offsetOf(area.value, line, column);
        area.focus();
        area.setSelectionRange(at, at);
    };

    const problems = result !== null && !result.ok ? result.problems : [];
    const invalid = problems.length > 0 || home !== undefined;
    // After every render, as the box is drawn: Mantine writes the attribute itself when it renders.
    useLayoutEffect(() => {
        if (invalid) {
            box.current?.setAttribute("aria-describedby", problemsId);
        } else {
            box.current?.removeAttribute("aria-describedby");
        }
    });
    return (
        <Modal
            opened
            onClose={() => {
                close(false);
            }}
            title={init.duplicateOf === undefined ? "Paste shader" : "Edit shader"}
            size="lg"
        >
            <Stack gap="xs">
                <NativeSelect
                    size="xs"
                    label="Kind"
                    value={kind}
                    data={KINDS.map((each) => ({ value: each, label: SHADER_KIND_WORDS[each] }))}
                    onChange={(event) => {
                        setPicked(KINDS.find((each) => each === event.currentTarget.value) ?? null);
                    }}
                />
                <Textarea
                    ref={box}
                    aria-label="Shader code"
                    data-autofocus
                    autosize
                    minRows={12}
                    maxRows={24}
                    spellCheck={false}
                    styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)", fontSize: 12 } }}
                    value={text}
                    // Mantine's error state: the invalid look and aria-invalid. The problems that
                    // describe it are tied to it below, as Mantine ties only an error text of its own.
                    error={invalid}
                    onChange={(event) => {
                        setText(event.currentTarget.value);
                    }}
                />
                {problems.length > 0 && (
                    <div role="list" aria-label="Problems" className="ws-paste-problems" id={problemsId}>
                        {problems.map((problem, index) => {
                            const place = shaderPlaceWords(problem);
                            const words = pasteProblemWords(problem);
                            const { line, column } = problem.params;
                            return (
                                <div role="listitem" key={`${problem.code}:${String(index)}`}>
                                    {typeof line === "number" ? (
                                        <UnstyledButton
                                            className="ws-paste-problem"
                                            data-code={problem.code}
                                            onClick={() => {
                                                jump(line, typeof column === "number" ? column : 1);
                                            }}
                                        >
                                            {place !== undefined && <b>{place}</b>}
                                            <span>{words}</span>
                                        </UnstyledButton>
                                    ) : (
                                        <Text className="ws-paste-problem" data-code={problem.code}>
                                            {words}
                                        </Text>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {home !== undefined && (
                    <Text className="ws-paste-problem" id={problemsId} data-home>
                        {home}
                    </Text>
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
                        Add
                    </Button>
                </Tooltip>
            </ModalFooter>
        </Modal>
    );
}
