import { PanelField, Popout } from "@graphty/compact-mantine";
import { type CodedFact, type GraphSession, GraphtyError, type PartAnswer } from "@graphty/graphty-element/session";
import { Button, Group, Loader, Stack, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { modelName, useModelStates } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { FactChip, ModelChip } from "./ModelChip";
import { AddressForm, FileInput } from "./ModelsPopover";
import { countChip, middleCut, PART_CODES, roleWord } from "./modelWords";

/** The pop-over's width: room for a part's name and its address. */
const WIDTH = 280;

/**
 * The model's main file name, as graphty-element's record of what the layer names gives it (a
 * waiting model's record carries it too), else the app's name for it.
 * @param session - the element's session.
 * @param modelRef - what the layer names.
 * @returns the file name, "police.glb".
 */
function mainFile(session: GraphSession, modelRef: string): string {
    const path = session.assets.find(modelRef)?.path;
    return path === undefined ? modelName(session, modelRef) : (path.split("/").pop() ?? path);
}

/**
 * Whether files are held over a drop target, and the handlers that tell: the target is drawn as
 * the compact-mantine file drop zone draws itself while files are held over it.
 * @returns the flag and the handlers to spread on the target.
 */
function useDropOver(): {
    readonly over: boolean;
    readonly handlers: Pick<React.HTMLAttributes<HTMLElement>, "onDragOver" | "onDragLeave" | "onDrop">;
} {
    const [over, setOver] = useState(false);
    return {
        over,
        handlers: {
            onDragOver: (event) => {
                event.preventDefault();
                setOver(true);
            },
            onDragLeave: (event) => {
                if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
                    setOver(false);
                }
            },
            onDrop: () => {
                setOver(false);
            },
        },
    };
}

/**
 * Says a part row that appears while the pop-over is open (design 13.9): a supplied file that names
 * another part, such as a .gltf's .bin, adds its row.
 * @param parts - what the model waits for now.
 * @param opened - whether the pop-over is open.
 */
function useNewParts(parts: readonly CodedFact[], opened: boolean): void {
    const { store } = useWorkspace();
    const seen = useRef<ReadonlySet<string> | null>(null);
    useEffect(() => {
        const names = new Set(parts.map((p) => String(p.params.name ?? "")));
        const before = seen.current;
        seen.current = opened ? names : null;
        if (before === null || !opened) {
            return;
        }
        const added = [...names].filter((name) => name !== "" && !before.has(name));
        if (added.length > 0) {
            store.set({ announcement: added.map((name) => `${name.split("/").pop() ?? name} needed`).join(", ") });
        }
    }, [parts, opened, store]);
}

/** Props for PartsPopover. */
interface PartsPopoverProps {
    /** Whether it is open. */
    readonly opened: boolean;
    /** The row it opens beside. */
    readonly anchor: React.RefObject<HTMLElement | null>;
    /** What the layer's `node.model` names, which `assets.supply` takes. */
    readonly modelRef: string;
    /** What the model is waiting for: its `E_MODEL_MISSING_FILE`, `E_MODEL_PART_AMBIGUOUS` and `E_MODEL_AMBIGUOUS`, in order. */
    readonly parts: readonly CodedFact[];
    /** Closed by the reader, by Escape or its close button. */
    readonly onClose: () => void;
}

/**
 * The files of a drop. Must be called during the drop: the browser empties the transfer after.
 * @param event - the drop.
 * @returns the files.
 */
function dropped(event: React.DragEvent): File[] {
    event.preventDefault();
    return [...event.dataTransfer.files];
}

/**
 * What a call to `supply` that threw is, as a chip's fact.
 * @param error - what it threw.
 * @returns the fact.
 */
function thrown(error: unknown): CodedFact {
    return error instanceof GraphtyError
        ? { code: error.code, params: error.details as CodedFact["params"] }
        : { code: "E_MODEL_PARSE", params: {} };
}

/**
 * The glyph for a part's role.
 * @param props - Component props
 * @param props.role - `params.role`.
 * @returns the glyph.
 */
function RoleGlyph({ role }: Readonly<{ role: unknown }>): React.JSX.Element {
    if (role === "texture") {
        return <GLYPHS.picture size={14} aria-hidden />;
    }
    if (role === "materials") {
        return <GLYPHS.file size={14} aria-hidden />;
    }
    return <GLYPHS.model size={14} aria-hidden />;
}

/** Props for PartRow. */
interface PartRowProps {
    /** The part the model is waiting for. */
    readonly part: CodedFact;
    /** The first row takes focus when the pop-over opens. */
    readonly first: boolean;
    /** Hands the answer to graphty-element; resolves with the problems about this part. */
    readonly supply: (answer: PartAnswer) => Promise<readonly CodedFact[]>;
    /** Says that Escape took back typed text. */
    readonly onDiscard: () => void;
}

/** What a part row's controls need. */
interface PartControlsProps {
    readonly part: CodedFact;
    /** The part's name as the model names it (its path in the set), or "Model" for a set of several models. */
    readonly name: string;
    /** What the reader calls it: the name's last part, file name alone. */
    readonly label: string;
    readonly first: boolean;
    readonly url: string;
    readonly setUrl: (url: string) => void;
    readonly answer: (given: PartAnswer) => void;
    readonly onDiscard: () => void;
}

/**
 * Which file a part, or the model, is, when several could be: a select of the candidates.
 * @param props - Component props
 * @param props.part - the part
 * @param props.name - its name, as the model names it
 * @param props.label - the name the reader reads and hears
 * @param props.first - takes focus on open
 * @param props.answer - hands the choice over
 * @returns The controls
 */
function WhichFile({ part, name, label, first, answer }: Readonly<PartControlsProps>): React.JSX.Element {
    const main = part.code === "E_MODEL_AMBIGUOUS";
    const candidates = (part.params.candidates ?? []) as readonly string[];
    const more = typeof part.params.more === "number" ? part.params.more : 0;
    return (
        <Group gap={4} wrap="nowrap">
            <PanelField
                label={main ? "Which file is the model" : `Which file is ${label}`}
                kind="select"
                width="fill"
                value={null}
                placeholder="Choose"
                data={candidates.map((c) => ({ value: c, label: c }))}
                data-autofocus={first ? true : undefined}
                onChange={(next) => {
                    answer(main ? { main: String(next) } : { name, use: String(next) });
                }}
            />
            {more > 0 ? <Text size="xs">{`+${String(more)} more`}</Text> : null}
        </Group>
    );
}

/**
 * The ways to hand a missing part over: its address, Choose, and Load without it when it may be
 * left out.
 * @param props - Component props
 * @param props.part - the part
 * @param props.name - its name, as the model names it
 * @param props.label - the name the reader reads and hears
 * @param props.first - takes focus on open
 * @param props.url - the typed address
 * @param props.setUrl - the typing
 * @param props.answer - hands the part over
 * @param props.onDiscard - says Escape took the typing back
 * @returns The controls
 */
function SupplyPart({
    part,
    name,
    label,
    first,
    url,
    setUrl,
    answer,
    onDiscard,
}: Readonly<PartControlsProps>): React.JSX.Element {
    const chooser = useRef<HTMLInputElement | null>(null);
    return (
        <>
            <AddressForm
                name={`${label} address`}
                submitName={`Load ${label} from address`}
                value={url}
                busy={false}
                autofocus={first}
                onChange={setUrl}
                onDiscard={onDiscard}
                onSubmit={() => {
                    if (url.trim() !== "") {
                        answer({ name, url: url.trim() });
                    }
                }}
            />
            <Group gap={4}>
                <Tooltip label={`Choose ${label}`}>
                    <Button
                        size="compact-xs"
                        variant="default"
                        leftSection={<GLYPHS.upload size={12} aria-hidden />}
                        aria-label={`Choose ${label}`}
                        onClick={() => chooser.current?.click()}
                    >
                        Choose
                    </Button>
                </Tooltip>
                <FileInput
                    chooser={chooser}
                    onFiles={([file]) => {
                        answer({ name, file });
                    }}
                />
                {part.params.optional === true ? (
                    <Tooltip label={`Load without ${label}`}>
                        <Button
                            size="compact-xs"
                            variant="default"
                            aria-label={`Load without ${label}`}
                            onClick={() => {
                                answer({ name, skip: true });
                            }}
                        >
                            Load without it
                        </Button>
                    </Tooltip>
                ) : null}
            </Group>
        </>
    );
}

/**
 * What the element said about a part just handed over, with Retry for an address not reached and
 * Use file address for a web page that names its file.
 * @param props - Component props
 * @param props.errors - the problems about this part
 * @param props.onRetry - hands the last answer over again, when there is one
 * @param props.onUseAddress - fills in the file's own address
 * @returns The chips, or nothing
 */
function PartErrors({
    errors,
    onRetry,
    onUseAddress,
}: Readonly<{
    errors: readonly CodedFact[];
    onRetry: (() => void) | undefined;
    onUseAddress: (url: string) => void;
}>): React.JSX.Element | null {
    if (errors.length === 0) {
        return null;
    }
    const suggested = errors.find((e) => e.code === "E_MODEL_WEB_PAGE")?.params.suggested;
    return (
        <Group gap={4}>
            {errors.map((fact) => (
                <FactChip key={fact.code} fact={fact} />
            ))}
            {errors.some((e) => e.code === "E_MODEL_FETCH") && onRetry !== undefined ? (
                <Button size="compact-xs" variant="default" onClick={onRetry}>
                    Retry
                </Button>
            ) : null}
            {typeof suggested === "string" ? (
                <Button
                    size="compact-xs"
                    variant="default"
                    onClick={() => {
                        onUseAddress(suggested);
                    }}
                >
                    Use file address
                </Button>
            ) : null}
        </Group>
    );
}

/**
 * One part a model is waiting for, as a Figma property row: its name, its kind, and the ways to
 * hand it over (an address, a file, a drop on the row, or drawing without it when it may be left
 * out). An ambiguous part offers the files it could be; a set of several models offers which one.
 * @param props - Component props
 * @param props.part - the part
 * @param props.first - takes focus on open
 * @param props.supply - hands an answer over
 * @param props.onDiscard - says typed text was taken back
 * @returns The row
 */
function PartRow({ part, first, supply, onDiscard }: Readonly<PartRowProps>): React.JSX.Element {
    const [url, setUrl] = useState("");
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<readonly CodedFact[]>([]);
    const [last, setLast] = useState<PartAnswer | null>(null);
    const drop = useDropOver();
    const main = part.code === "E_MODEL_AMBIGUOUS";
    const name = main ? "Model" : String(part.params.name);
    // The full path is the tooltip; every name the reader hears or reads is the file's own.
    const label = name.split("/").pop() ?? name;
    const answer = (given: PartAnswer): void => {
        setBusy(true);
        setErrors([]);
        setLast(given);
        supply(given)
            .then(setErrors)
            .catch((error: unknown) => {
                setErrors([thrown(error)]);
            })
            .finally(() => {
                setBusy(false);
            });
    };
    const controls: PartControlsProps = { part, name, label, first, url, setUrl, answer, onDiscard };

    return (
        <div // NOSONAR(S6819): an ARIA group naming one part's controls; a fieldset would draw its own border and legend
            className="ws-part-row"
            role="group"
            aria-label={label}
            aria-busy={busy || undefined}
            data-over={drop.over || undefined}
            onDragOver={(event) => {
                // Held over this row, the row is the target, not the pop-over around it.
                event.stopPropagation();
                drop.handlers.onDragOver?.(event);
            }}
            onDragLeave={drop.handlers.onDragLeave}
            onDrop={(event) => {
                // A drop on the row is this part; the pop-over's own drop matches by name.
                event.stopPropagation();
                drop.handlers.onDrop?.(event);
                const [file] = dropped(event);
                if (file !== undefined && !main) {
                    answer({ name, file });
                }
            }}
        >
            <Group gap={4} wrap="nowrap">
                <RoleGlyph role={main ? "geometry" : part.params.role} />
                <Text size="xs" fw={600} title={name} className="ws-part-name">
                    {middleCut(label)}
                </Text>
                <Text size="xs" c="var(--cm-text-secondary)">
                    {main ? "Model" : roleWord(part.params.role)}
                </Text>
                {busy ? <Loader size={12} aria-label={`Loading ${label}`} /> : null}
            </Group>
            {main || part.code === "E_MODEL_PART_AMBIGUOUS" ? (
                <WhichFile {...controls} />
            ) : (
                <SupplyPart {...controls} />
            )}
            <PartErrors
                errors={errors}
                onRetry={
                    last === null
                        ? undefined
                        : () => {
                              answer(last);
                          }
                }
                onUseAddress={(suggested) => {
                    setUrl(suggested);
                    setErrors([]);
                }}
            />
        </div>
    );
}

/**
 * The Parts pop-over (node-models design 13.9), opened by the Shape field's "N missing" chip: one
 * row per part the model waits for, in graphty-element's order. Files dropped anywhere outside a
 * row go to the element with no name, which matches each by its path, then its base name. A row
 * leaves when its part is in; the chip closes the pop-over when the last one has.
 * @param props - Component props
 * @param props.opened - whether it is open
 * @param props.anchor - the row it opens beside
 * @param props.modelRef - what the layer names
 * @param props.parts - what the model waits for
 * @param props.onClose - closed by the reader
 * @returns The pop-over
 */
function PartsPopover({
    opened,
    anchor,
    modelRef,
    parts,
    onClose,
}: Readonly<PartsPopoverProps>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [unused, setUnused] = useState<readonly CodedFact[]>([]);
    const drop = useDropOver();
    useNewParts(parts, opened);
    if (session === null) {
        return null;
    }
    const title = mainFile(session, modelRef);
    // Each part by its name, so a part that arrives is announced by the name the reader saw.
    const supply = async (answer: PartAnswer): Promise<readonly CodedFact[]> => {
        const named = "name" in answer && answer.name !== undefined ? answer.name : undefined;
        const after = await session.assets.supply(modelRef, answer);
        const still = after.problems.some((p) => p.code === "E_MODEL_MISSING_FILE" && p.params.name === named);
        if (named !== undefined && !still && !("skip" in answer)) {
            store.set({ announcement: `${named.split("/").pop() ?? named} added` });
        }
        return after.problems.filter((p) => p.params.part !== undefined && p.params.part === named);
    };
    const dropAnywhere = (files: readonly File[]): void => {
        setUnused([]);
        void (async () => {
            const notes: CodedFact[] = [];
            for (const file of files) {
                const after = await session.assets.supply(modelRef, { file }).catch(() => undefined);
                notes.push(
                    ...(after?.problems ?? []).filter(
                        (p) => p.code === "W_MODEL_PART_UNUSED" && p.params.fileName === file.name,
                    ),
                );
            }
            setUnused(notes);
        })();
    };

    return (
        <Popout
            opened={opened}
            onOpenChange={(next) => {
                if (!next) {
                    onClose();
                }
            }}
        >
            <Popout.Panel
                width={WIDTH}
                placement="left"
                alignment="start"
                anchorY={anchor}
                header={{ variant: "title", title }}
            >
                <Popout.Content>
                    <Stack
                        gap={8}
                        className="ws-parts"
                        data-testid="parts-popover"
                        data-over={drop.over || undefined}
                        {...drop.handlers}
                        onDrop={(event) => {
                            drop.handlers.onDrop?.(event);
                            dropAnywhere(dropped(event));
                        }}
                    >
                        {parts.map((part, index) => (
                            <PartRow
                                key={`${part.code}:${String(part.params.name ?? "main")}`}
                                part={part}
                                first={index === 0}
                                supply={supply}
                                onDiscard={() => {
                                    store.set({ announcement: "Address discarded" });
                                }}
                            />
                        ))}
                        <Text size="xs" c="var(--cm-text-secondary)">
                            Drop files here
                        </Text>
                        {unused.length === 0 ? null : (
                            <Group gap={4}>
                                {unused.map((fact) => (
                                    <FactChip key={String(fact.params.fileName)} fact={fact} />
                                ))}
                            </Group>
                        )}
                    </Stack>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * The parts chip's accessible name (design 13.9): "police: 1 file missing", or the models a zip
 * holds, "set: 3 models".
 * @param model - the model's name.
 * @param parts - what it waits for.
 * @returns the name.
 */
function partsName(model: string, parts: readonly CodedFact[]): string {
    const chip = countChip(parts);
    if (parts.length === 1 && parts[0].code === "E_MODEL_AMBIGUOUS") {
        return `${model}: ${chip?.word ?? ""}`;
    }
    return `${model}: ${String(parts.length)} ${parts.length === 1 ? "file" : "files"} missing`;
}

/**
 * The warnings the Shape field shows; the rest belong to Model settings. A substituted part is
 * worth knowing, not worth a chip on a model that draws as it should.
 */
const FIELD_WARNINGS = new Set(["W_MODEL_PART_UNUSED"]);

/** Props for ModelProblems. */
interface ModelProblemsProps {
    /** What the layer's `node.model` names. */
    readonly modelRef: string;
    /** The row the Parts pop-over opens beside. */
    readonly anchor: React.RefObject<HTMLElement | null>;
    /** Called once the Parts pop-over closed, to put focus back on the Shape field. */
    readonly onDone: () => void;
    /** Moves a picture the layer names as its model to `node.texture` (design 13.5). */
    readonly onUseAsPicture?: () => void;
    /** The reader just picked this model while it waits for parts: the Parts pop-over opens. */
    readonly openParts?: boolean;
    /** Called once the Parts pop-over opened for `openParts`, or the model needs none. */
    readonly onPartsOpened?: () => void;
}

/**
 * What the Shape field says about the model it names (design 13.9, 13.6), read from
 * graphty-element's model states: "N missing" while the model waits for parts, opening the Parts
 * pop-over; "Without N" for parts it is drawn without; a chip for any other refusal, with Use as
 * picture when the model named is a picture.
 * @param props - Component props
 * @param props.modelRef - what the layer names
 * @param props.anchor - the row the pop-over opens beside
 * @param props.onDone - focus back on the Shape field
 * @param props.onUseAsPicture - moves a picture named as the model to `node.texture`
 * @param props.openParts - opens the Parts pop-over once the model waits
 * @param props.onPartsOpened - called once that is done
 * @returns The chips, or nothing
 */
export function ModelProblems({
    modelRef,
    anchor,
    onDone,
    onUseAsPicture,
    openParts = false,
    onPartsOpened,
}: Readonly<ModelProblemsProps>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const states = useModelStates(session);
    const [open, setOpen] = useState(false);
    const chipRef = useRef<HTMLButtonElement>(null);
    const change = states.find((s) => s.ref === modelRef);
    const problems = change?.problems ?? [];
    const parts = change?.state === "rejected" ? problems.filter((p) => PART_CODES.has(p.code)) : [];
    const name = session === null ? "Model" : modelName(session, modelRef);
    const waiting = parts.length > 0;
    const settled = change !== undefined && change.state !== "pending";
    useEffect(() => {
        // Picked while it waits: the Parts pop-over takes the Models pop-over's place.
        if (openParts && settled) {
            if (waiting) {
                setOpen(true);
            }
            onPartsOpened?.();
        }
    }, [openParts, settled, waiting, onPartsOpened]);
    useEffect(() => {
        // The last part arrived: the pop-over goes, and focus goes back to the field.
        if (open && !waiting) {
            setOpen(false);
            store.set({ announcement: `${name} drawn` });
            onDone();
        }
    }, [open, waiting, name, store, onDone]);
    if (session === null || change === undefined) {
        return null;
    }
    const partsChip = countChip(parts);
    const skipped = countChip(problems.filter((p) => p.code === "W_MODEL_PART_SKIPPED"));
    const refusal = waiting ? undefined : problems.find((p) => p.code.startsWith("E_"));
    const notes = problems.filter((p) => FIELD_WARNINGS.has(p.code));
    if (partsChip === undefined && skipped === undefined && refusal === undefined && notes.length === 0) {
        return null;
    }
    return (
        <Group gap={4} className="ws-model-chips">
            {partsChip === undefined ? null : (
                <ModelChip
                    ref={chipRef}
                    chip={partsChip}
                    name={partsName(name, parts)}
                    expanded={open}
                    onClick={() => {
                        setOpen(true);
                    }}
                />
            )}
            {skipped === undefined ? null : <ModelChip chip={skipped} tone="warning" />}
            {refusal === undefined ? null : <FactChip fact={refusal} />}
            {refusal?.params.assetKind === "image" && onUseAsPicture !== undefined ? (
                <Tooltip label={`Use ${name} as picture`}>
                    <Button
                        size="compact-xs"
                        variant="default"
                        aria-label={`Use ${name} as picture`}
                        onClick={onUseAsPicture}
                    >
                        Use as picture
                    </Button>
                </Tooltip>
            ) : null}
            {notes.map((fact) => (
                <FactChip key={`${fact.code}:${JSON.stringify(fact.params)}`} fact={fact} />
            ))}
            {waiting ? (
                <PartsPopover
                    opened={open}
                    anchor={anchor}
                    modelRef={modelRef}
                    parts={parts}
                    onClose={() => {
                        setOpen(false);
                        chipRef.current?.focus();
                    }}
                />
            ) : null}
        </Group>
    );
}
