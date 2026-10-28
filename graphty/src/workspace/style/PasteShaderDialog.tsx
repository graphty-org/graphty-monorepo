import { ModalFooter, PanelField } from "@graphty/compact-mantine";
import { type ShaderParams, type ShaderPlace, shaderTemplate } from "@graphty/graphty-element/catalog";
import type { GraphSession, ShaderAddResult } from "@graphty/graphty-element/session";
import { Anchor, Button, Group, Modal, Stack, Text, Textarea, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { PlaceDiagram } from "./ShaderGallery";
import {
    DIALOG_PLACES,
    dialogPlaceWords,
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

/** The published guide to writing a shader, which the dialog links to. */
const SHADER_GUIDE_URL = "https://graphty.app/docs/graphty-element/guide/shaders";

/** How long typing pauses before the text is checked. */
const CHECK_PAUSE_MS = 300;

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

/** What the dialog opens with: text to start from, the place, and the shader it duplicates. */
export interface PasteInit {
    /** The text in the code box; absent: the session's unsent draft, else the place's template. */
    readonly text?: string;
    /** The place it starts at (Duplicate and edit: the row's); absent: the tab's first place. */
    readonly place?: ShaderPlace;
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
    /** The list it opens for: a tab's Shaders, or the Background. */
    readonly tab: ShaderTab;
    /**
     * Writes a shader where the opening list draws it (a layer's row at the shader's own place,
     * the background), through the scope given, so the add and the write are one undo step.
     */
    readonly put: (scope: GraphSession, id: string, params: ShaderParams) => Promise<void>;
    readonly init: PasteInit;
    readonly onClose: () => void;
}

/**
 * The code dialog (decisions-v2, section 2.2), New shader, or Edit shader for Duplicate and edit:
 * its first field is the place, with the same words and diagrams as the tiles' place badges, preset
 * to the tab's first place (the row's, for Duplicate and edit), and the code box starts with that place's
 * template, which follows the field until the reader types or pastes over it. Under it the
 * problems the element finds, as rows that put the cursor on their line (a problem with no line is
 * plain text), and Add. While typing pauses the text gets every check Add makes, compiling
 * included; the problems are announced and mark the code box invalid. Add adds it to the project
 * and puts it where the list draws it, as one undo step. Text whose body equals a known shader's
 * applies that one with the parameter values it differs by. A failed paste changes nothing.
 * Escape closes the dialog from any control in it and keeps the text as an unsent draft.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.tab - the list it opens for
 * @param props.put - writes a shader where the list draws it
 * @param props.init - the text and place to start from
 * @param props.onClose - closes the dialog
 * @returns The dialog
 */
export function PasteShaderDialog({
    session,
    tab,
    put,
    init,
    onClose,
}: Readonly<PasteShaderDialogProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const problemsId = useId();
    const places = DIALOG_PLACES[tab];
    const [place, setPlace] = useState<ShaderPlace | undefined>(() => init.place ?? FIRST_PLACE[tab]);
    const [text, setText] = useState(() => init.text ?? drafts.get(session) ?? templateOf(tab, place));
    const target = targetOfPlace(tab, place);
    // The check of the text as it is now; null while it is pending.
    const [result, setResult] = useState<ShaderAddResult | null>(null);
    const [adding, setAdding] = useState(false);
    // The last picture the element drew of text that passed: kept while the text does not.
    const [drawn, setDrawn] = useState<Blob | undefined>(undefined);
    // The element hands the same picture back for the same text, so a re-check makes no new address.
    const picture = useMemo(() => (drawn === undefined ? undefined : URL.createObjectURL(drawn)), [drawn]);
    const box = useRef<HTMLTextAreaElement>(null);
    const textNow = useRef(text);
    textNow.current = text;
    const options = {
        target,
        ...(place === undefined || place === "group" ? {} : { place }),
        onTaken: "rename",
    } as const;

    useEffect(() => {
        setResult(null);
        if (text.trim() === "") {
            return undefined;
        }
        const timer = setTimeout(() => {
            void session.shaders.check(text, { ...options, picture: true }).then((checked) => {
                if (textNow.current !== text) {
                    return;
                }
                setResult(checked);
                if (checked.ok && checked.picture !== undefined) {
                    setDrawn(checked.picture);
                }
                // A place the text's own header names is where it draws: the field shows it.
                const named = checked.ok ? checked.descriptor.place : undefined;
                if (named !== undefined && named !== place && places.includes(named)) {
                    setPlace(named);
                }
            });
        }, CHECK_PAUSE_MS);
        return () => {
            clearTimeout(timer);
        };
        // The options are the target and place, which the dependencies name; places follows tab.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, text, target, place]);

    useEffect(
        () => () => {
            if (picture !== undefined) {
                URL.revokeObjectURL(picture);
            }
        },
        [picture],
    );

    const pickPlace = (next: ShaderPlace): void => {
        // The template follows the field until the reader writes over it.
        if (text.trim() === "" || text === templateOf(tab, place)) {
            setText(templateOf(tab, next));
        }
        setPlace(next);
    };

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
            if (same !== undefined && same.id !== init.duplicateOf) {
                // At its own place: the text's header names it, or the field gave it to text that names none.
                await put(session, same.id, same.params);
                store.set({ announcement: `${checked.descriptor.plainName} added` });
                close(true);
                return;
            }
            const added = await session.shaders.add(text, options);
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
    const invalid = problems.length > 0;
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
            title={init.duplicateOf === undefined ? "New shader" : "Edit shader"}
            size="lg"
        >
            <Stack gap="xs">
                {places.length > 0 && (
                    <PanelField
                        label={GALLERY_WORDS.place}
                        kind="select"
                        width="fill"
                        data-autofocus
                        value={place ?? null}
                        data={places.map((each) => ({ value: each, label: dialogPlaceWords(each, tab) }))}
                        glyph={<PlaceDiagram place={place} tab={tab} />}
                        optionGlyphs={Object.fromEntries(
                            places.map((each) => [each, <PlaceDiagram key={each} place={each} tab={tab} />]),
                        )}
                        onChange={(picked) => {
                            const next = places.find((each) => each === picked);
                            if (next !== undefined) {
                                pickPlace(next);
                            }
                        }}
                    />
                )}
                <Group align="flex-start" gap="xs" wrap="nowrap">
                    <Textarea
                        ref={box}
                        style={{ flex: 1 }}
                        aria-label="Shader code"
                        data-autofocus={places.length === 0 ? true : undefined}
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
                    {/* What the element draws of the text, framed by what it draws on; nothing reaches the graph until Add. */}
                    {picture === undefined ? (
                        <span className="ws-gallery-picture ws-paste-preview" aria-hidden />
                    ) : (
                        <img className="ws-gallery-picture ws-paste-preview" src={picture} alt="Preview" />
                    )}
                </Group>
                <Anchor href={SHADER_GUIDE_URL} target="_blank" rel="noopener noreferrer" size="xs">
                    {PASTE_GUIDE_WORDS}
                </Anchor>
                {problems.length > 0 && (
                    <div // NOSONAR(S6819): a list of block buttons and lines styled as one column; a ul would bring its own margin and bullets
                        role="list"
                        aria-label="Problems"
                        className="ws-paste-problems"
                        id={problemsId}
                    >
                        {problems.map((problem, index) => {
                            const place = shaderPlaceWords(problem);
                            const words = pasteProblemWords(problem);
                            const { line, column } = problem.params;
                            return (
                                <div // NOSONAR(S6819): an item of the ARIA list above, which is a div for the same reason
                                    role="listitem"
                                    key={`${problem.code}:${String(index)}`}
                                >
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
