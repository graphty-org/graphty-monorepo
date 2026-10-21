import { ModalFooter } from "@graphty/compact-mantine";
import type { ShaderKind } from "@graphty/graphty-element/catalog";
import type { GraphSession, ShaderAddResult } from "@graphty/graphty-element/session";
import { Button, Modal, NativeSelect, Stack, Textarea, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import type { RowContext } from "./PropertyRow";
import { openSettingsNext, ownLayer, pickShader, type ShaderSlot } from "./shaderSlots";
import {
    failureWords,
    PASTE_WAIT_WORDS,
    pasteProblemsWord,
    pasteProblemWords,
    SHADER_KIND_WORDS,
    shaderPlaceWords,
} from "./words";

/** How long typing pauses before the text is checked. */
const CHECK_PAUSE_MS = 300;

/** The kinds a style layer draws, in the Kind select's order. */
const LAYER_KINDS: readonly ShaderKind[] = [
    "node-surface",
    "node-sprite",
    "node-effect",
    "edge-surface",
    "edge-effect",
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
    readonly ctx: RowContext;
    readonly slot: ShaderSlot;
    readonly init: PasteInit;
    readonly onClose: () => void;
}

/**
 * Paste shader (shader-styles design, section 6.4): the code box, a Kind select that starts at the
 * kind the opening section takes (the text's header overrides it), the problems the element finds
 * as rows that put the cursor on their line, and Add. The text is checked while typing pauses
 * (the static checks); Add compiles and test-draws it, adds it to the project and puts it on the
 * row's layer, as one undo step. Text whose body equals a known shader's applies that one with
 * the parameter values it differs by. A failed paste changes nothing. Escape closes the dialog
 * from any control in it and keeps the text as an unsent draft.
 * @param props - Component props
 * @param props.ctx - the row the shader goes on
 * @param props.slot - the section's shader slot
 * @param props.init - the text to start from
 * @param props.onClose - closes the dialog
 * @returns The dialog
 */
export function PasteShaderDialog({ ctx, slot, init, onClose }: Readonly<PasteShaderDialogProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const { session } = ctx;
    const [text, setText] = useState(() => init.text ?? drafts.get(session) ?? "");
    const [kind, setKind] = useState<ShaderKind>(slot.kinds[0] ?? "node-effect");
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
            void session.shaders.check(text, { kind }).then((checked) => {
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

    let waitWord: string | undefined;
    if (text.trim() === "") {
        waitWord = PASTE_WAIT_WORDS.empty;
    } else if (result === null || adding) {
        waitWord = PASTE_WAIT_WORDS.checking;
    } else if (!result.ok) {
        waitWord = pasteProblemsWord(result.problems.length);
    }

    const add = async (): Promise<void> => {
        setAdding(true);
        try {
            const checked = await session.shaders.check(text, { kind });
            if (!checked.ok) {
                setResult(checked);
                return;
            }
            const known = (id: string): ShaderKind | undefined =>
                session.catalog.shaders().find((each) => each.id === id)?.kind;
            const fits = (id: string, found = known(id)): boolean => found !== undefined && slot.kinds.includes(found);
            const same = checked.sameAs;
            if (same !== undefined && same.id !== init.duplicateOf && fits(same.id)) {
                await pickShader(ctx, slot, same.id, undefined, same.params);
                store.set({ announcement: `${checked.descriptor.plainName} added` });
                close(true);
                return;
            }
            const onLayer = slot.kinds.includes(checked.descriptor.kind);
            const own = onLayer ? ownLayer(ctx) : undefined;
            const added = await session.shaders.add(text, {
                kind,
                onTaken: "rename",
                ...(own === undefined ? {} : { apply: { layer: own.id } }),
            });
            if (!added.ok) {
                setResult(added);
                return;
            }
            const { id } = added.descriptor;
            if (onLayer) {
                openSettingsNext(`${slot.channel}:${id}`);
            }
            if (onLayer && own === undefined) {
                // A row with no layer of its own yet: the layer is written as part of the add's step.
                const { history } = session;
                const step = history.steps[history.position - 1]?.id;
                await session.transaction(
                    `Add the shader ${id}`,
                    // The row's writes reach only the parts a transaction scope has (styles,
                    // catalog, transaction), never its history.
                    (tx) => pickShader({ ...ctx, session: tx as GraphSession }, slot, id),
                    step === undefined ? undefined : { after: step },
                );
            }
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
    return (
        <Modal
            opened
            onClose={() => {
                close(false);
            }}
            title="Paste shader"
            size="lg"
        >
            <Stack gap="xs">
                <NativeSelect
                    size="xs"
                    label="Kind"
                    value={kind}
                    data={LAYER_KINDS.map((each) => ({ value: each, label: SHADER_KIND_WORDS[each] }))}
                    onChange={(event) => {
                        setKind(event.currentTarget.value as ShaderKind);
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
                    onChange={(event) => {
                        setText(event.currentTarget.value);
                    }}
                />
                {problems.length > 0 && (
                    <div role="list" aria-label="Problems" className="ws-paste-problems">
                        {problems.map((problem, index) => {
                            const place = shaderPlaceWords(problem);
                            const words = pasteProblemWords(problem);
                            const { line, column } = problem.params;
                            return (
                                <div role="listitem" key={`${problem.code}:${String(index)}`}>
                                    <UnstyledButton
                                        className="ws-paste-problem"
                                        data-code={problem.code}
                                        disabled={typeof line !== "number"}
                                        onClick={() => {
                                            if (typeof line === "number") {
                                                jump(line, typeof column === "number" ? column : 1);
                                            }
                                        }}
                                    >
                                        {place !== undefined && <b>{place}</b>}
                                        <span>{words}</span>
                                    </UnstyledButton>
                                </div>
                            );
                        })}
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
                        Add
                    </Button>
                </Tooltip>
            </ModalFooter>
        </Modal>
    );
}
