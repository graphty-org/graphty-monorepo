import { DataRow, FileSource, ModalFooter, useFileDrop } from "@graphty/compact-mantine";
import {
    assetFileExtensions,
    detectModelFormat,
    type ModelOrientation,
    type ModelTurnStep,
    type ModelUpAxis,
    turnModelOrientation,
} from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import type {
    AssetRecord,
    AssetSource,
    CodedFact,
    ModelPart,
    ModelSummary,
    PartAnswer,
    ProgressChange,
} from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Button,
    Collapse,
    Group,
    Loader,
    Modal,
    ScrollArea,
    Stack,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
} from "@mantine/core";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { fileStem, type ModelDraw, modelName, useModelDraw } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { FactChip, ModelChip } from "./ModelChip";
import { SettingRows } from "./ModelSettings";
import { chipLine, countChip, middleCut, modelChip, PART_CODES, partChip, roleWord } from "./modelWords";
import { PartRow, RoleGlyph } from "./PartsPopover";
import { useStillOpen } from "./useStillOpen";
import { CUSTOM_MODEL, logUnexpected } from "./words";

/**
 * What the file chooser takes, as graphty-element lists it: a model's own file or a .zip, never
 * its parts, which the Files list asks for once the model is in (Safari greys out a part's
 * extension, such as .mtl, that it has no file type for).
 */
const MODEL_MAIN_EXTENSIONS = assetFileExtensions("model", { parts: false });

/** The model formats graphty-element draws, as graphty-element tells them: for the drop hint. */
const MODEL_FORMATS = MODEL_MAIN_EXTENSIONS.filter(
    (ext) => ext !== ".zip" && detectModelFormat({ filename: `model${ext}` })?.supported === true,
);

/** The preview's side, in CSS pixels: the right column's width. */
const PREVIEW_PX = 240;

/** The settings shown at once, with a layer to write them to: Color, and Animation for a model with clips. */
const SHOWN_CHANNELS: readonly Channel[] = ["node.modelTint", "node.modelAnimation"];

/** More options' settings, with a layer to write them to; Speed and Start only for a model with clips. */
const MORE_CHANNELS: readonly Channel[] = [
    "node.modelSourceUp",
    "node.modelTurn",
    "node.modelFit",
    "node.modelCenter",
    "node.modelAnimationSpeed",
    "node.modelAnimationOffset",
    "node.modelDoubleSided",
    "node.unlit",
];

/** The rotate buttons under the preview, in their order. */
const TURN_STEPS: readonly ModelTurnStep[] = ["left", "right", "forward", "back"];

/** Address refusals: the field says what to do next. */
const ADDRESS_CODES: ReadonlySet<string> = new Set(["E_MODEL_FETCH", "E_MODEL_URL_BLOCKED", "E_MODEL_WEB_PAGE"]);

/** Format refusals: the line says which formats would do. */
const FORMAT_CODES: ReadonlySet<string> = new Set(["E_MODEL_FORMAT_UNKNOWN", "E_MODEL_FORMAT_UNSUPPORTED"]);

/** The warnings the closed Details line shows as chips, in this order. */
const DETAIL_CHIP_CODES: readonly string[] = [
    "W_MODEL_UP_GUESSED",
    "W_MODEL_HAS_ANIMATIONS",
    "W_MODEL_EXTENSION_IGNORED",
    "W_MODEL_BUDGET",
    "W_MODEL_HEAVY",
    "W_MODEL_POINTS_APPROXIMATED",
];

/** The settings a draft holds until Add. */
export type ModelDraft = Readonly<Partial<Record<Channel, ChannelValue>>>;

/** The model the dialog holds: waiting for parts or accepted. */
interface Held {
    /** The address it was loaded from, which a layer names in place of its id. */
    readonly url?: string;
    readonly record: AssetRecord;
}

/** A picture that arrived where a model was expected. */
interface Arrived {
    readonly id: string;
    readonly name: string;
}

/** A load under way: what is read, and how far graphty-element says it has come. */
interface Loading {
    /** The file's name or the address, as the source line shows it. */
    readonly name: string;
    /** An address, rather than files. */
    readonly byAddress: boolean;
    /** Stops it. */
    readonly controller: AbortController;
    /** graphty-element's stage, or undefined before its first change. */
    readonly stage?: string;
    readonly completed: number;
    readonly total: number | null;
}

/** Props for CustomModelDialog. */
export interface CustomModelDialogProps {
    /** Whether a layer takes the model: Color, Animation, More options, rotation and Use as picture are offered. */
    readonly forLayer: boolean;
    /**
     * The target layer's own values (`node.color` and the `node.model*` settings), so the preview
     * draws the model as that layer would, under the dialog's draft. Default: none.
     */
    readonly baseStyle?: ModelDraft;
    /** Add model: what `node.model` names, and the draft settings. The dialog has already renamed it. */
    readonly onAdd: (ref: string, settings: ModelDraft) => void;
    /** Use as picture, with a layer: the picture's asset id for `node.texture`. */
    readonly onPicture?: (ref: string) => void;
    /** Closed without adding, after what the dialog loaded and nothing uses was let go. */
    readonly onClose: () => void;
}

/**
 * Whether a file is a model or a .zip of one, by graphty-element's reading of its name: such a
 * file is a new source, never a part of the model waiting.
 * @param file - the file.
 * @returns true for a model or a .zip.
 */
function isModelFile(file: File): boolean {
    return detectModelFormat({ filename: file.name }) !== undefined;
}

/**
 * Whether a load stopped because the reader cancelled it.
 * @param error - what it threw.
 * @returns true for an abort.
 */
function isAbort(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

/**
 * A refusal as a sentence a reader can act on: the chip's words, then what to do next.
 * @param fact - the refusal.
 * @returns the sentence.
 */
function refusalLine(fact: CodedFact): string {
    if (ADDRESS_CODES.has(fact.code)) {
        return `${chipLine(fact)} -- ${CUSTOM_MODEL.checkAddress}`;
    }
    return FORMAT_CODES.has(fact.code) ? `${chipLine(fact)} -- ${CUSTOM_MODEL.reads(MODEL_FORMATS)}` : chipLine(fact);
}

/**
 * The axis a "detected" up settles to, from graphty-element's summary.
 * @param summary - the model's summary, if any.
 * @returns the axis.
 */
function detectedUp(summary: ModelSummary | undefined): ModelUpAxis {
    const axis = summary?.upAxis;
    return axis === undefined || axis === "unknown" ? "y" : axis;
}

/**
 * A disclosure line, as the selection pane's Advanced: a chevron, its word, and what it carries.
 * @param props - Component props
 * @param props.word - its word
 * @param props.open - whether its rows show
 * @param props.onToggle - opens or closes it
 * @param props.children - drawn at its end (a chip or a note)
 * @returns The line
 */
function Disclosure({
    word,
    open,
    onToggle,
    children,
}: Readonly<{ word: string; open: boolean; onToggle: () => void; children?: React.ReactNode }>): React.JSX.Element {
    return (
        <Group gap={6} wrap="wrap">
            <UnstyledButton className="ws-disclosure" aria-expanded={open} onClick={onToggle}>
                <GLYPHS.expand size={12} aria-hidden style={{ transform: open ? undefined : "rotate(-90deg)" }} />
                <Text size="sm" span>
                    {word}
                </Text>
            </UnstyledButton>
            {children}
        </Group>
    );
}

/**
 * One file of the model that needs nothing from the reader: its role glyph, its name (the full path
 * in the tooltip), its role word, and its state chip unless it was found.
 * @param props - Component props
 * @param props.part - the part
 * @returns The line
 */
function PartLine({ part }: Readonly<{ part: ModelPart }>): React.JSX.Element {
    const chip = partChip(part);
    return (
        <Group gap={4} wrap="nowrap" data-part={part.name}>
            <RoleGlyph role={part.role} />
            <Text size="xs" fw={600} title={part.name} className="ws-part-name">
                {middleCut(part.name, 32)}
            </Text>
            <Text size="xs" c="var(--cm-text-secondary)">
                {roleWord(part.role)}
            </Text>
            {chip === undefined ? null : <ModelChip chip={chip} tone="warning" />}
        </Group>
    );
}

/**
 * The preview: a spinner while loading, the model drawn by graphty-element once it is accepted or,
 * while it waits for parts, with them stood in for; the cube and the "N missing" chip while it waits
 * for a part it cannot be drawn without, or the cube and the chip saying why graphty-element could
 * not draw it.
 * @param props - Component props
 * @param props.held - the model, if any
 * @param props.name - its name
 * @param props.draw - its picture, or why it could not be drawn
 * @param props.busy - a source is loading
 * @returns The preview box
 */
function Preview({
    held,
    name,
    draw,
    busy,
}: Readonly<{ held: Held | null; name: string; draw: ModelDraw; busy: boolean }>): React.JSX.Element {
    const accepted = held?.record.state === "accepted";
    const missing = countChip(held?.record.problems.filter((p) => PART_CODES.has(p.code)) ?? []);
    let content: React.ReactNode;
    if (draw.url !== undefined && !busy) {
        content = <img src={draw.url} alt={CUSTOM_MODEL.preview(name)} width={PREVIEW_PX} height={PREVIEW_PX} />;
    } else if (draw.failure !== undefined && !busy) {
        content = (
            <Stack gap={4} align="center">
                <GLYPHS.model size={32} aria-hidden />
                <ModelChip chip={modelChip(draw.failure)} />
            </Stack>
        );
    } else if (held === null) {
        // Blank until a model is loaded.
        content = null;
    } else if (busy || accepted) {
        content = <Loader size="sm" aria-label={CUSTOM_MODEL.loading(busy ? "model" : name)} />;
    } else {
        content = (
            <Stack gap={4} align="center">
                <GLYPHS.model size={32} aria-hidden />
                {missing === undefined ? null : <ModelChip chip={missing} />}
            </Stack>
        );
    }
    return (
        <div className="ws-model-preview" data-testid="model-preview">
            {content}
        </div>
    );
}

/**
 * Says why a file was refused, as a sentence, and what would do instead.
 * @param props - Component props
 * @param props.problem - the refusal
 * @returns The line
 */
function Refusal({ problem }: Readonly<{ problem: CodedFact }>): React.JSX.Element {
    return (
        <Text size="xs" c="var(--cm-text-danger)" data-testid="model-refusal">
            {refusalLine(problem)}
        </Text>
    );
}

/**
 * Retry for an address not reached, and Use file address for a web page that names its file.
 * @param props - Component props
 * @param props.problem - the refusal
 * @param props.onRetry - loads the address again
 * @param props.onUseAddress - fills in the file's own address
 * @returns The buttons, or nothing
 */
function AddressActions({
    problem,
    onRetry,
    onUseAddress,
}: Readonly<{
    problem: CodedFact;
    onRetry: () => void;
    onUseAddress: (url: string) => void;
}>): React.JSX.Element | null {
    const suggested = problem.code === "E_MODEL_WEB_PAGE" ? problem.params.suggested : undefined;
    if (problem.code !== "E_MODEL_FETCH" && typeof suggested !== "string") {
        return null;
    }
    return (
        <Group gap={4}>
            {problem.code === "E_MODEL_FETCH" ? (
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
 * The source line: what was loaded, its name cut in the middle, and the x that takes it out.
 * @param props - Component props
 * @param props.name - the file's name or the address
 * @param props.byAddress - an address, drawn with the address glyph
 * @param props.action - the button at its end
 * @returns The line
 */
function SourceLine({
    name,
    byAddress,
    action,
}: Readonly<{ name: string; byAddress: boolean; action: React.ReactNode }>): React.JSX.Element {
    const Glyph = byAddress ? GLYPHS.webAddress : GLYPHS.file;
    return (
        <Group gap={4} wrap="nowrap" data-testid="model-source">
            <Glyph size={14} aria-hidden />
            <Text size="xs" flex={1} miw={0} title={name} className="ws-part-name">
                {middleCut(name, 40)}
            </Text>
            {action}
        </Group>
    );
}

/**
 * How far a load has come, as graphty-element reports it, for the file loader's bar: its stage and
 * the bytes, and the fraction done when the size is known (null when it is not).
 * @param loading - the load
 * @returns the bar's fraction and its status line
 */
function loadStatus(loading: Loading): { progress: number | null; status: { label: string; detail?: string } } {
    const first = loading.byAddress ? "downloading" : "reading";
    const label =
        loading.stage === undefined
            ? CUSTOM_MODEL.stages[first]
            : (CUSTOM_MODEL.stages[loading.stage] ?? CUSTOM_MODEL.preparing);
    const { completed, total } = loading;
    const known = total !== null && total > 0;
    return {
        progress: known ? Math.min(1, completed / total) : null,
        status: completed > 0 ? { label, detail: CUSTOM_MODEL.bytes(completed, total) } : { label },
    };
}

/**
 * The four rotate buttons under the preview: each writes the next quarter turn, as
 * graphty-element's `turnModelOrientation` gives it, to Up and Turn.
 * @param props - Component props
 * @param props.values - the draft over the layer's own values
 * @param props.detected - the axis a "detected" up settles to
 * @param props.write - writes a setting
 * @returns The buttons
 */
function RotateButtons({
    values,
    detected,
    write,
}: Readonly<{
    values: ModelDraft;
    detected: ModelUpAxis;
    write: (channel: Channel, value: ChannelValue) => void;
}>): React.JSX.Element {
    const up = (values["node.modelSourceUp"] ?? "detected") as ModelOrientation["up"];
    const turn = typeof values["node.modelTurn"] === "number" ? values["node.modelTurn"] : 0;
    return (
        // NOSONAR(S6819): an ARIA group naming four buttons; a fieldset would draw its own border and legend
        <Group gap={4} justify="center" role="group" aria-label={CUSTOM_MODEL.rotate}>
            {TURN_STEPS.map((step) => {
                const word = CUSTOM_MODEL.turns[step];
                const Glyph = { left: GLYPHS.turnLeft, right: GLYPHS.turnRight, forward: GLYPHS.tip, back: GLYPHS.tip }[
                    step
                ];
                return (
                    <Tooltip key={step} label={word}>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={word}
                            onClick={() => {
                                const next = turnModelOrientation({ up, turn }, step, detected);
                                write("node.modelSourceUp", next.up);
                                write("node.modelTurn", next.turn);
                            }}
                        >
                            <Glyph
                                size={14}
                                aria-hidden
                                style={step === "back" ? { transform: "scaleY(-1)" } : undefined}
                            />
                        </ActionIcon>
                    </Tooltip>
                );
            })}
        </Group>
    );
}

/**
 * How many of a model's parts are in each state that needs nothing from the reader.
 * @param parts - the parts.
 * @returns the counts.
 */
function quietCounts(parts: readonly ModelPart[]): { substituted: number; skipped: number; unused: number } {
    return {
        substituted: parts.filter((p) => p.state === "substituted" && partChip(p) !== undefined).length,
        skipped: parts.filter((p) => p.state === "skipped").length,
        unused: parts.filter((p) => p.state === "unused").length,
    };
}

/**
 * The name a held model goes by: its address, or else its id.
 * @param held - the model.
 * @returns the name.
 */
function heldRef(held: Held): string {
    return held.url ?? held.record.id;
}

/**
 * Whether files arriving now are parts for the model waiting, rather than a new source: the model
 * was refused for want of parts and none of the files is a model.
 * @param held - the model held, if any.
 * @param files - the files.
 * @returns true for parts.
 */
function partsFor(held: Held | null, files: readonly File[]): held is Held {
    return held?.record.state === "rejected" && files.length > 0 && !files.some(isModelFile);
}

/**
 * A load's next state after graphty-element reports progress, for the load it belongs to.
 * @param controller - the load's controller.
 * @param change - the progress.
 * @returns the update for the load state.
 */
function progressed(controller: AbortController, change: ProgressChange): (now: Loading | null) => Loading | null {
    return (now) =>
        now?.controller === controller
            ? { ...now, stage: change.asset?.stage, completed: change.completed, total: change.total ?? null }
            : now;
}

/**
 * A picture that arrived where a model was expected.
 * @param record - the picture's record.
 * @param files - the files it came from.
 * @returns the picture.
 */
function arrivedPicture(record: AssetRecord, files: readonly File[]): Arrived {
    return { id: record.id, name: fileStem(record.path ?? files[0]?.name ?? "") || "picture" };
}

/**
 * The part a supply answers, by name, when it names one.
 * @param answer - the answer.
 * @returns the part's name, or undefined.
 */
function answeredName(answer: PartAnswer): string | undefined {
    return "name" in answer ? answer.name : undefined;
}

/**
 * Why Add cannot work yet, or null when it can.
 * @param loading - the load under way, if any.
 * @param accepted - the accepted model, if any.
 * @param waitingFor - the parts the model waits for.
 * @param failure - why graphty-element could not draw it, if it could not.
 * @returns the reason, or null.
 */
function blockedReason(
    loading: Loading | null,
    accepted: Held | null,
    waitingFor: readonly CodedFact[],
    failure: CodedFact | undefined,
): string | null {
    if (loading !== null) {
        return CUSTOM_MODEL.loading(loading.name);
    }
    if (accepted === null) {
        const firstMissing = waitingFor[0]?.params.name;
        return typeof firstMissing === "string"
            ? CUSTOM_MODEL.missing(firstMissing.split("/").pop() ?? firstMissing)
            : CUSTOM_MODEL.addFirst;
    }
    return failure === undefined ? null : refusalLine(failure);
}

/**
 * The closed Details line's chips: one per word, so a model over the budget and heavy for its
 * nodes is "Heavy" once.
 * @param problems - the accepted model's problems.
 * @returns the chips.
 */
function detailChipsOf(problems: readonly CodedFact[]): ReturnType<typeof modelChip>[] {
    return [
        ...new Map(
            DETAIL_CHIP_CODES.flatMap((code) => problems.filter((p) => p.code === code))
                .map(modelChip)
                .map((chip) => [chip.word, chip]),
        ).values(),
    ];
}

/**
 * The x beside the held file: a tooltip and a close button.
 * @param props - Component props
 * @param props.heldFile - the held file's name or address
 * @param props.onClear - takes it out
 * @returns The button
 */
function ClearButton({ heldFile, onClear }: Readonly<{ heldFile: string; onClear: () => void }>): React.JSX.Element {
    return (
        <Tooltip label={CUSTOM_MODEL.remove(heldFile)}>
            <ActionIcon variant="subtle" size="sm" aria-label={CUSTOM_MODEL.remove(heldFile)} onClick={onClear}>
                <GLYPHS.close size={14} aria-hidden />
            </ActionIcon>
        </Tooltip>
    );
}

/**
 * Says a picture arrived where a model was expected, with Use as picture when a layer takes it.
 * @param props - Component props
 * @param props.picture - the picture
 * @param props.onPicture - Use as picture, or undefined when not offered
 * @returns The line
 */
function PictureNote({
    picture,
    onPicture,
}: Readonly<{ picture: Arrived; onPicture: ((ref: string) => void) | undefined }>): React.JSX.Element {
    return (
        <Group gap={4} wrap="nowrap">
            <Text size="xs" c="var(--cm-text-warning)">
                {CUSTOM_MODEL.notModel(picture.name, MODEL_FORMATS)}
            </Text>
            {onPicture === undefined ? null : (
                <Button
                    size="compact-xs"
                    variant="default"
                    aria-label={`Use ${picture.name} as picture`}
                    onClick={() => {
                        onPicture(picture.id);
                    }}
                >
                    Use as picture
                </Button>
            )}
        </Group>
    );
}

/**
 * The model's Name field; Enter in it adds the model when nothing blocks Add.
 * @param props - Component props
 * @param props.inputRef - the field, for focus
 * @param props.name - the name
 * @param props.onName - takes a new name
 * @param props.blocked - why Add cannot work, or null
 * @param props.onAdd - adds the model
 * @returns The row
 */
function NameField({
    inputRef,
    name,
    onName,
    blocked,
    onAdd,
}: Readonly<{
    inputRef: React.RefObject<HTMLInputElement | null>;
    name: string;
    onName: (name: string) => void;
    blocked: string | null;
    onAdd: () => void;
}>): React.JSX.Element {
    return (
        <div className="ws-row">
            <div className="ws-field" data-named="">
                <span className="ws-field-label">
                    <span className="ws-field-name" aria-hidden>
                        {CUSTOM_MODEL.name}
                    </span>
                </span>
                <div className="ws-field-control">
                    <TextInput
                        ref={inputRef}
                        size="xs"
                        aria-label={CUSTOM_MODEL.name}
                        value={name}
                        onChange={(event) => {
                            onName(event.currentTarget.value);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && blocked === null) {
                                event.preventDefault();
                                onAdd();
                            }
                        }}
                    />
                </div>
                <span className="ws-slot" />
            </div>
        </div>
    );
}

/**
 * Why graphty-element could not draw the model, with Retry when its decoder failed to load.
 * @param props - Component props
 * @param props.failure - why
 * @param props.retry - draws it again
 * @returns The line
 */
function DrawFailure({ failure, retry }: Readonly<{ failure: CodedFact; retry: () => void }>): React.JSX.Element {
    return (
        <Group gap={4} wrap="nowrap">
            <Refusal problem={failure} />
            {failure.code === "E_MODEL_DECODER_UNAVAILABLE" && failure.params.reason === "load" ? (
                <Button size="compact-xs" variant="default" onClick={retry}>
                    Retry
                </Button>
            ) : null}
        </Group>
    );
}

/** What the settings rows of a draft take. */
interface DraftSettings {
    readonly draft: ModelDraft;
    readonly problems: readonly CodedFact[];
    readonly write: (channel: Channel, value: ChannelValue) => void;
    readonly unset: (channel: Channel) => void;
    readonly clips: ModelSummary["animations"];
}

/**
 * More options: a disclosure line and the settings it opens.
 * @param props - Component props
 * @param props.settings - the draft and how to write it
 * @param props.open - whether its rows show
 * @param props.onToggle - opens or closes it
 * @returns The section
 */
function MoreOptions({
    settings,
    open,
    onToggle,
}: Readonly<{ settings: DraftSettings; open: boolean; onToggle: () => void }>): React.JSX.Element {
    return (
        <>
            <Disclosure word={CUSTOM_MODEL.moreOptions} open={open} onToggle={onToggle} />
            <Collapse in={open} transitionDuration={0}>
                <div data-testid="model-more">
                    <SettingRows
                        channels={MORE_CHANNELS}
                        values={settings.draft}
                        problems={settings.problems}
                        write={settings.write}
                        remove={settings.unset}
                        clips={settings.clips}
                    />
                </div>
            </Collapse>
        </>
    );
}

/**
 * Files: a disclosure line with what needs nothing from the reader, and each file of the model,
 * asking for the parts it waits for. One self-contained file says nothing the preview and Name do
 * not: no Files line.
 * @param props - Component props
 * @param props.record - the model, or null when none is shown
 * @param props.waitingFor - the parts it waits for
 * @param props.open - whether its rows show
 * @param props.onToggle - opens or closes it
 * @param props.supply - answers a part
 * @param props.say - announces a sentence
 * @returns The section
 */
function FilesSection({
    record,
    waitingFor,
    open,
    onToggle,
    supply,
    say,
}: Readonly<{
    record: AssetRecord | null;
    waitingFor: readonly CodedFact[];
    open: boolean;
    onToggle: () => void;
    supply: (answer: PartAnswer) => Promise<readonly CodedFact[]>;
    say: (announcement: string) => void;
}>): React.JSX.Element | null {
    const parts = record?.parts ?? [];
    if (record === null || (parts.length <= 1 && waitingFor.length === 0)) {
        return null;
    }
    const unused = parts.filter((p) => p.state === "unused").map((p) => p.name);
    const unusedFiles = new Set(unused.map((n) => n.split("/").pop()));
    const facts = new Map(waitingFor.map((fact) => [String(fact.params.name ?? ""), fact]));
    const filesNote = CUSTOM_MODEL.filesNote(quietCounts(parts));
    const discard = (): void => {
        say("Address discarded");
    };
    return (
        <>
            <Disclosure word={CUSTOM_MODEL.files} open={open} onToggle={onToggle}>
                {open || filesNote === "" ? null : (
                    <Text size="sm" c="dimmed" span>
                        {filesNote}
                    </Text>
                )}
            </Disclosure>
            <Collapse in={open} transitionDuration={0}>
                <Stack gap={6} className="ws-model-files" data-testid="model-files">
                    {parts.map((part) => {
                        const fact = facts.get(part.name);
                        return fact === undefined ? (
                            <PartLine key={part.name} part={part} />
                        ) : (
                            <PartRow
                                key={part.name}
                                part={fact}
                                first={false}
                                supply={supply}
                                unused={part.state === "missing" ? unused : []}
                                onDiscard={discard}
                            />
                        );
                    })}
                    {waitingFor
                        .filter((fact) => fact.code === "E_MODEL_AMBIGUOUS")
                        .map((fact) => (
                            <PartRow key="main" part={fact} first={false} supply={supply} onDiscard={discard} />
                        ))}
                    {record.problems
                        .filter(
                            (p) =>
                                p.code === "W_MODEL_PART_UNUSED" &&
                                !unusedFiles.has(String(p.params.fileName).split("/").pop()),
                        )
                        .map((fact) => (
                            <FactChip key={String(fact.params.fileName)} fact={fact} />
                        ))}
                </Stack>
            </Collapse>
        </>
    );
}

/**
 * Details: a disclosure line with the model's warning chips, and graphty-element's facts about it.
 * @param props - Component props
 * @param props.summary - graphty-element's summary of the model, if any
 * @param props.record - the accepted model, or null when none is shown
 * @param props.open - whether its rows show
 * @param props.onToggle - opens or closes it
 * @returns The section
 */
function DetailsSection({
    summary,
    record,
    open,
    onToggle,
}: Readonly<{
    summary: ModelSummary | undefined;
    record: AssetRecord | null;
    open: boolean;
    onToggle: () => void;
}>): React.JSX.Element | null {
    if (summary === undefined || record === null) {
        return null;
    }
    const ignored = record.problems
        .filter((p) => p.code === "W_MODEL_EXTENSION_IGNORED")
        .map((p) => String(p.params.extension));
    return (
        <>
            <Disclosure word={CUSTOM_MODEL.details} open={open} onToggle={onToggle}>
                {detailChipsOf(record.problems).map((chip) => (
                    <ModelChip key={chip.word} chip={chip} tone="warning" />
                ))}
            </Disclosure>
            <Collapse in={open} transitionDuration={0}>
                <div data-testid="model-details" className="ws-model-details">
                    {CUSTOM_MODEL.detailRows(summary, record.byteLength, ignored).map((row) => (
                        <DataRow key={row.name} stat name={row.name} value={row.value} description={row.tip} />
                    ))}
                </div>
            </Collapse>
        </>
    );
}

/**
 * The parts a held model waits for before Add can work.
 * @param held - the model held, if any.
 * @returns the parts' refusals.
 */
function waitingParts(held: Held | null): readonly CodedFact[] {
    return held?.record.problems.filter((p) => PART_CODES.has(p.code)) ?? [];
}

/**
 * A refusal the address field says, or null when the refusal is not about the address.
 * @param problem - the refusal, if any.
 * @returns the address refusal, or null.
 */
function addressProblemOf(problem: CodedFact | null): CodedFact | null {
    return problem !== null && ADDRESS_CODES.has(problem.code) ? problem : null;
}

/**
 * The file loader: a model's address, its own file, its folder or a .zip, with the load's progress.
 * @param props - Component props
 * @param props.loading - the load under way, if any
 * @param props.empty - nothing is held or loading: the loader takes focus
 * @param props.address - the address field's value
 * @param props.addressProblem - why the address was refused, if it was
 * @param props.onCancelLoad - stops the load
 * @param props.onLoad - loads a source
 * @param props.onAddress - takes an address typed in
 * @param props.say - announces a sentence
 * @returns The loader
 */
function ModelFileSource({
    loading,
    empty,
    address,
    addressProblem,
    onCancelLoad,
    onLoad,
    onAddress,
    say,
}: Readonly<{
    loading: Loading | null;
    empty: boolean;
    address: string;
    addressProblem: CodedFact | null;
    onCancelLoad: () => void;
    onLoad: (source: AssetSource, files: readonly File[], shown: string) => void;
    onAddress: (url: string) => void;
    say: (announcement: string) => void;
}>): React.JSX.Element {
    const shownLoad = loading === null ? undefined : loadStatus(loading);
    return (
        <FileSource
            variant="row"
            autoFocus={empty}
            disabled={loading !== null}
            progress={shownLoad?.progress}
            status={shownLoad?.status}
            onCancel={loading === null ? undefined : onCancelLoad}
            cancelLabel={CUSTOM_MODEL.cancelLoad}
            folder
            url
            accept={MODEL_MAIN_EXTENSIONS.join(",")}
            label={CUSTOM_MODEL.chooseFile}
            folderLabel={CUSTOM_MODEL.chooseFolder}
            placeholder={CUSTOM_MODEL.address}
            defaultValue={address}
            error={addressProblem === null ? undefined : refusalLine(addressProblem)}
            onDiscard={() => {
                say("Address discarded");
            }}
            onFiles={(files, paths) => {
                onLoad(paths === undefined ? files : { files: paths }, files, files[0]?.name ?? "");
            }}
            onUrl={(url) => {
                onAddress(url);
                onLoad(url, [], url);
            }}
        />
    );
}

/**
 * The source half of the left column: the held file with its x, or the file loader; why a source
 * was refused, with Retry or Use file address; and a picture that arrived in place of a model.
 * @param props - Component props
 * @param props.held - the model held, if any
 * @param props.busy - a source is loading
 * @param props.heldFile - the held file's name or address
 * @param props.onClear - takes the held file out
 * @param props.fileSource - the file loader
 * @param props.problem - why the last source was refused, if it was
 * @param props.onRetry - loads the address again
 * @param props.onUseAddress - fills in the file's own address
 * @param props.picture - a picture that arrived, if one did
 * @param props.onPicture - Use as picture, or undefined when not offered
 * @returns The lines
 */
function SourcePart({
    held,
    busy,
    heldFile,
    onClear,
    fileSource,
    problem,
    onRetry,
    onUseAddress,
    picture,
    onPicture,
}: Readonly<{
    held: Held | null;
    busy: boolean;
    heldFile: string;
    onClear: () => void;
    fileSource: React.ReactNode;
    problem: CodedFact | null;
    onRetry: () => void;
    onUseAddress: (url: string) => void;
    picture: Arrived | null;
    onPicture: ((ref: string) => void) | undefined;
}>): React.JSX.Element {
    const shownHeld = busy ? null : held;
    const shownProblem = busy ? null : problem;
    const addressProblem = addressProblemOf(shownProblem);
    const fileProblem = addressProblem === null ? shownProblem : null;
    return (
        <>
            {shownHeld === null ? (
                fileSource
            ) : (
                <SourceLine
                    name={heldFile}
                    byAddress={shownHeld.url !== undefined}
                    action={<ClearButton heldFile={heldFile} onClear={onClear} />}
                />
            )}
            {addressProblem === null ? null : (
                <AddressActions problem={addressProblem} onRetry={onRetry} onUseAddress={onUseAddress} />
            )}
            {fileProblem === null ? null : <Refusal problem={fileProblem} />}
            {picture === null ? null : <PictureNote picture={picture} onPicture={onPicture} />}
        </>
    );
}

/**
 * The model half of the left column, once a model is held and nothing loads: Name and, with a
 * layer, Color and Animation; why it could not be drawn; More options; and Files.
 * @param props - Component props
 * @param props.held - the model held, if any
 * @param props.layerModel - the accepted model, when a layer takes it
 * @param props.nameRow - the Name field
 * @param props.settings - the draft and how to write it
 * @param props.draw - the model's picture, or why it could not be drawn
 * @param props.moreOpen - whether More options' rows show
 * @param props.onToggleMore - opens or closes More options
 * @param props.files - Files, or null when it is not shown
 * @returns The lines
 */
function ModelPart({
    held,
    layerModel,
    nameRow,
    settings,
    draw,
    moreOpen,
    onToggleMore,
    files,
}: Readonly<{
    held: Held | null;
    layerModel: Held | null;
    nameRow: React.ReactNode;
    settings: DraftSettings;
    draw: ModelDraw;
    moreOpen: boolean;
    onToggleMore: () => void;
    files: React.ReactNode;
}>): React.JSX.Element | null {
    if (held === null) {
        return null;
    }
    return (
        <>
            <Stack gap={4} className="ws-model-settings">
                {nameRow}
                {layerModel === null ? null : (
                    <SettingRows
                        channels={SHOWN_CHANNELS}
                        values={settings.draft}
                        problems={layerModel.record.problems}
                        write={settings.write}
                        remove={settings.unset}
                        clips={settings.clips}
                    />
                )}
            </Stack>
            {draw.failure === undefined ? null : <DrawFailure failure={draw.failure} retry={draw.retry} />}
            {layerModel === null ? null : <MoreOptions settings={settings} open={moreOpen} onToggle={onToggleMore} />}
            {files}
        </>
    );
}

/**
 * The right column: the preview, the model's variant line, the rotate buttons with a layer, and
 * Details.
 * @param props - Component props
 * @param props.held - the model held, if any
 * @param props.name - its name
 * @param props.draw - its picture, or why it could not be drawn
 * @param props.busy - a source is loading
 * @param props.summary - graphty-element's summary of the accepted model, if any
 * @param props.layerModel - the accepted model, when a layer takes it
 * @param props.values - the draft over the layer's own values
 * @param props.write - writes a setting
 * @param props.details - Details, or null when it is not shown
 * @returns The column
 */
function ModelSide({
    held,
    name,
    draw,
    busy,
    summary,
    layerModel,
    values,
    write,
    details,
}: Readonly<{
    held: Held | null;
    name: string;
    draw: ModelDraw;
    busy: boolean;
    summary: ModelSummary | undefined;
    layerModel: Held | null;
    values: ModelDraft;
    write: (channel: Channel, value: ChannelValue) => void;
    details: React.ReactNode;
}>): React.JSX.Element {
    return (
        <Stack gap={8} className="ws-model-side">
            <Preview held={held} name={name} draw={draw} busy={busy} />
            {summary === undefined || busy ? null : (
                <Text size="xs" c="dimmed" ta="center" data-testid="model-variant">
                    {CUSTOM_MODEL.variantLine(summary)}
                </Text>
            )}
            {layerModel === null ? null : (
                <RotateButtons values={values} detected={detectedUp(summary)} write={write} />
            )}
            {details}
        </Stack>
    );
}

/**
 * The dialog's footer: Cancel, and Add, which stays focusable when blocked with its reason as its
 * tooltip.
 * @param props - Component props
 * @param props.blocked - why Add cannot work, or null
 * @param props.addWord - Add's word
 * @param props.onCancel - Cancel
 * @param props.onAdd - Add
 * @returns The footer
 */
function DialogFooter({
    blocked,
    addWord,
    onCancel,
    onAdd,
}: Readonly<{ blocked: string | null; addWord: string; onCancel: () => void; onAdd: () => void }>): React.JSX.Element {
    const isBlocked = blocked !== null || undefined;
    return (
        <ModalFooter className="ws-model-footer">
            <Button variant="default" onClick={onCancel}>
                {CUSTOM_MODEL.cancel}
            </Button>
            <Tooltip label={blocked ?? addWord} disabled={blocked === null}>
                <Button
                    // A blocked Add stays focusable, with its reason as its tooltip.
                    aria-disabled={isBlocked}
                    data-disabled={isBlocked}
                    onClick={onAdd}
                >
                    {addWord}
                </Button>
            </Tooltip>
        </ModalFooter>
    );
}

/**
 * The Load custom model dialog (node-models design 14): one file loader for a model's address, its
 * own file (its parts are asked for after, in Files), its folder, a .zip or a drop of any files
 * anywhere on the dialog; while it loads, graphty-element's
 * progress with Cancel load; once loaded, two columns: the name and the settings on the left (Color,
 * Animation for a model with clips, More options, and Files when a part needs an answer), and the
 * model drawn by graphty-element on the right with its rotate buttons and its Details table.
 * Settings are a draft until Add. One model per dialog: files that are not a model, arriving while
 * it waits, go to it; a model, a folder holding one or a .zip replaces it, and the x beside its
 * name takes it out. Cancel lets go of what it loaded that no layer uses. Mounted only while open.
 * @param props - Component props
 * @param props.forLayer - whether a layer takes the model
 * @param props.baseStyle - the target layer's own values
 * @param props.onAdd - Add model
 * @param props.onPicture - Use as picture
 * @param props.onClose - closed without adding
 * @returns The dialog
 */
export function CustomModelDialog({
    forLayer,
    baseStyle,
    onAdd,
    onPicture,
    onClose,
}: Readonly<CustomModelDialogProps>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState<Loading | null>(null);
    const [problem, setProblem] = useState<CodedFact | null>(null);
    const [tried, setTried] = useState<string | null>(null);
    const [picture, setPicture] = useState<Arrived | null>(null);
    const [held, setHeld] = useState<Held | null>(null);
    const [name, setName] = useState("");
    const [draft, setDraft] = useState<ModelDraft>({});
    const [filesOpen, setFilesOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    // What this dialog added, by what names it: let go on Cancel when no layer uses it.
    const added = useRef(new Set<string>());
    const nameField = useRef<HTMLInputElement | null>(null);
    // The Modal mounts its body after this renders: the drop target is the element itself.
    const [body, setBody] = useState<HTMLDivElement | null>(null);
    const start = useStillOpen(true);
    const busy = loading !== null;
    const waitingFor = waitingParts(held);
    // Focus goes where the reader acts next: Name once a model is in, its first part while it waits.
    const heldKey = held === null ? "" : `${held.record.id} ${held.record.state}`;
    const waits = waitingFor.length > 0;
    const values: ModelDraft = { ...baseStyle, ...draft };
    const accepted = held?.record.state === "accepted" ? held : null;
    // A model waiting for parts is drawn with them stood in for, while Files still asks for them.
    const drawn = useModelDraw(accepted === null ? held?.record.id : heldRef(accepted), PREVIEW_PX, values, true);
    // Only an accepted model's failure is said: a waiting one keeps the cube and its "N missing".
    const draw: ModelDraw = accepted === null ? { ...drawn, failure: undefined } : drawn;
    useEffect(() => {
        // The name and the parts are drawn once the load is over, so focus waits for that too.
        if (heldKey === "" || busy) {
            return;
        }
        if (waits) {
            body?.querySelector<HTMLElement>(".ws-part-row input, .ws-part-row button")?.focus();
        } else {
            nameField.current?.focus();
        }
    }, [heldKey, waits, body, busy]);
    // A model that is in but cannot be drawn is said, as an intake refusal is.
    const failureLine = draw.failure === undefined ? null : refusalLine(draw.failure);
    useEffect(() => {
        if (failureLine !== null) {
            store.set({ announcement: failureLine });
        }
    }, [failureLine, store]);
    const target = useMemo(() => ({ current: body }), [body]);
    const loadRef = useRef<(source: AssetSource, files: readonly File[], shown: string) => void>(() => undefined);
    // Files or a folder dropped anywhere on the dialog: the same as choosing them.
    const { over } = useFileDrop(
        target,
        (files, paths) => {
            loadRef.current(paths === undefined ? files : { files: paths }, files, files[0]?.name ?? "");
        },
        { folders: true },
    );
    if (session === null) {
        return null;
    }
    const say = (announcement: string): void => {
        store.set({ announcement });
    };
    const letGo = (ref: string): void => {
        if (added.current.has(ref) && session.assets.usedBy(ref).length === 0) {
            session.assets.remove(ref);
        }
    };
    const cancel = (): void => {
        loading?.controller.abort();
        for (const ref of added.current) {
            letGo(ref);
        }
        onClose();
    };
    // A model that waited takes a new id once its parts are in: still the dialog's to let go.
    const moved = (before: AssetRecord, after: AssetRecord): void => {
        if (added.current.has(before.id)) {
            added.current.add(after.id);
        }
    };
    const hold = (next: Held): void => {
        setHeld(next);
        setName(next.record.plainName ?? modelName(session, heldRef(next)));
        // Files opens by itself only when a part needs an answer before Add can work.
        setFilesOpen(next.record.problems.some((p) => PART_CODES.has(p.code)));
    };
    // Waiting for parts: files that are not a model go to it, matched by graphty-element.
    const offer = async (waiting: Held, files: readonly File[], live: () => boolean): Promise<void> => {
        const { rest } = await session.assets.offer([...files]);
        if (!live()) {
            return;
        }
        const after = session.assets.find(heldRef(waiting)) ?? waiting.record;
        moved(waiting.record, after);
        setHeld({ ...waiting, record: after });
        const left = new Set(rest.map((f) => f.name));
        say(files.map((f) => `${f.name} ${left.has(f.name) ? "not needed" : "added"}`).join(", "));
    };
    const settle = async (
        source: AssetSource,
        files: readonly File[],
        controller: AbortController,
        live: () => boolean,
    ): Promise<void> => {
        if (partsFor(held, files)) {
            await offer(held, files, live);
            return;
        }
        const before = new Set(session.assets.list().map((r) => r.id));
        const onProgress = (change: ProgressChange): void => {
            if (change.phase === "progress" && live()) {
                setLoading(progressed(controller, change));
            }
        };
        const record = await session.assets.add(source, { signal: controller.signal, onProgress });
        const url = typeof source === "string" ? source : undefined;
        const ref = url ?? record.id;
        if (!before.has(record.id)) {
            added.current.add(ref);
        }
        if (!live()) {
            letGo(ref);
            return;
        }
        if (record.state === "accepted" && record.kind === "image") {
            setPicture(arrivedPicture(record, files));
            say(CUSTOM_MODEL.notModel(fileStem(record.path ?? "") || "picture", MODEL_FORMATS));
            return;
        }
        const heldNow = session.assets.waiting().some((w) => w.id === record.id);
        if (record.state !== "accepted" && !heldNow) {
            const fact = record.problems[0] ?? { code: "E_MODEL_PARSE", params: {} };
            setProblem(fact);
            say(refusalLine(fact));
            return;
        }
        if (held !== null && heldRef(held) !== ref) {
            letGo(heldRef(held));
        }
        hold({ ...(url === undefined ? {} : { url }), record });
        say(CUSTOM_MODEL.loaded(record.plainName ?? modelName(session, ref)));
    };
    const load = (source: AssetSource, files: readonly File[], shown: string): void => {
        // A new source (a drop, Retry, the address field) replaces the one still loading.
        loading?.controller.abort();
        const controller = new AbortController();
        const byAddress = typeof source === "string";
        setLoading({ name: shown, byAddress, controller, completed: 0, total: null });
        setProblem(null);
        setPicture(null);
        setTried(byAddress ? source : null);
        say(CUSTOM_MODEL.loading(shown));
        const stillOpen = start();
        const live = (): boolean => stillOpen() && !controller.signal.aborted;
        settle(source, files, controller, live)
            .catch((error: unknown) => {
                if (isAbort(error) || controller.signal.aborted) {
                    return;
                }
                logUnexpected("assets.add", error, []);
                if (live()) {
                    setProblem({ code: "E_MODEL_PARSE", params: { message: String(error) } });
                }
            })
            .finally(() => {
                if (stillOpen()) {
                    setLoading((now) => (now?.controller === controller ? null : now));
                }
            });
    };
    loadRef.current = load;
    const cancelLoad = (): void => {
        if (loading !== null) {
            loading.controller.abort();
            setLoading(null);
            say(CUSTOM_MODEL.cancelled(loading.name));
        }
    };
    const supply = async (answer: PartAnswer): Promise<readonly CodedFact[]> => {
        if (held === null) {
            return [];
        }
        const named = answeredName(answer);
        const after = await session.assets.supply(held.record.id, answer);
        moved(held.record, after);
        setHeld((now) => (now === null ? now : { ...now, record: after }));
        if ("main" in answer) {
            // A set of several models had no name until the reader said which file is the model.
            setName(after.plainName ?? modelName(session, after.id));
        }
        const still = after.problems.some((p) => PART_CODES.has(p.code) && p.params.name === named);
        if (named !== undefined && !still && !("skip" in answer)) {
            say(`${named.split("/").pop() ?? named} added`);
        }
        return after.problems.filter((p) => p.params.part !== undefined && p.params.part === named);
    };

    const ref = accepted === null ? undefined : heldRef(accepted);
    const blocked = blockedReason(loading, accepted, waitingFor, draw.failure);
    const addWord = forLayer ? CUSTOM_MODEL.add : CUSTOM_MODEL.addToProject;
    const add = (): void => {
        // Every way to Add (click, Enter or Space on the button, Enter in Name) stops here when blocked.
        if (blocked !== null || ref === undefined || accepted === null) {
            return;
        }
        const wanted = name.trim();
        const usual = fileStem(accepted.record.path ?? ref) || "Model";
        if (wanted !== (accepted.record.plainName ?? usual)) {
            session.assets.rename(accepted.record.id, wanted === usual ? "" : wanted);
        }
        onAdd(ref, draft);
    };
    const summary = accepted === null ? undefined : session.assets.inspect(accepted.record.id);
    const write = (channel: Channel, value: ChannelValue): void => {
        setDraft((now) => ({ ...now, [channel]: value }));
    };
    const settings: DraftSettings = {
        draft,
        problems: accepted?.record.problems ?? [],
        write,
        unset: (channel) => {
            setDraft((now) => Object.fromEntries(Object.entries(now).filter(([c]) => c !== channel)));
        },
        clips: summary?.animations ?? [],
    };
    const empty = held === null && !busy;
    const heldFile = held === null ? "" : (held.url ?? held.record.path ?? name);
    // What shows once the load is over: a held model, and an accepted one a layer takes.
    const shownHeld = busy ? null : held;
    const shownAccepted = busy ? null : accepted;
    const layerModel = forLayer ? shownAccepted : null;
    // The x beside the file: back to the empty dialog, after letting go of what nothing uses.
    const clear = (): void => {
        loading?.controller.abort();
        for (const each of added.current) {
            letGo(each);
        }
        setLoading(null);
        setHeld(null);
        setName("");
        setDraft({});
        setProblem(null);
        setTried(null);
        setPicture(null);
        setAddress("");
        setFilesOpen(false);
        setMoreOpen(false);
        setDetailsOpen(false);
        say(CUSTOM_MODEL.removed(heldFile));
    };
    const files = (
        <FilesSection
            record={shownHeld?.record ?? null}
            waitingFor={waitingFor}
            open={filesOpen}
            onToggle={() => {
                setFilesOpen(!filesOpen);
            }}
            supply={supply}
            say={say}
        />
    );
    const details = (
        <DetailsSection
            summary={summary}
            record={shownAccepted?.record ?? null}
            open={detailsOpen}
            onToggle={() => {
                setDetailsOpen(!detailsOpen);
            }}
        />
    );

    return (
        <Modal
            opened
            onClose={cancel}
            title={CUSTOM_MODEL.title}
            size="lg"
            // A loaded model is not lost to a stray click beside the dialog.
            closeOnClickOutside={empty}
        >
            <div
                ref={setBody}
                className="ws-dialog-columns ws-model-body"
                data-testid="custom-model"
                data-over={over || undefined}
            >
                <ScrollArea className="ws-model-main" type="hover" scrollbars="y" offsetScrollbars="y">
                    <Stack gap="sm" className="ws-model-left">
                        <SourcePart
                            held={held}
                            busy={busy}
                            heldFile={heldFile}
                            onClear={clear}
                            fileSource={
                                <ModelFileSource
                                    loading={loading}
                                    empty={empty}
                                    address={address}
                                    addressProblem={addressProblemOf(problem)}
                                    onCancelLoad={cancelLoad}
                                    onLoad={load}
                                    onAddress={setAddress}
                                    say={say}
                                />
                            }
                            problem={problem}
                            onRetry={() => {
                                if (tried !== null) {
                                    load(tried, [], tried);
                                }
                            }}
                            onUseAddress={(suggested) => {
                                setAddress(suggested);
                                setProblem(null);
                            }}
                            picture={picture}
                            onPicture={forLayer ? onPicture : undefined}
                        />
                        <ModelPart
                            held={shownHeld}
                            layerModel={layerModel}
                            nameRow={
                                <NameField
                                    inputRef={nameField}
                                    name={name}
                                    onName={setName}
                                    blocked={blocked}
                                    onAdd={add}
                                />
                            }
                            settings={settings}
                            draw={draw}
                            moreOpen={moreOpen}
                            onToggleMore={() => {
                                setMoreOpen(!moreOpen);
                            }}
                            files={files}
                        />
                    </Stack>
                </ScrollArea>
                <ModelSide
                    held={held}
                    name={name}
                    draw={draw}
                    busy={busy}
                    summary={summary}
                    layerModel={layerModel}
                    values={values}
                    write={write}
                    details={details}
                />
                <DialogFooter blocked={blocked} addWord={addWord} onCancel={cancel} onAdd={add} />
            </div>
        </Modal>
    );
}
