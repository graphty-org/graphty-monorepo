import { DataRow, FileSource, ModalFooter, UiGlyph, useFileDrop } from "@graphty/compact-mantine";
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
    Checkbox,
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
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

import { fileStem, type ModelLive, modelName, useModelPreview } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { FactChip, ModelChip } from "./ModelChip";
import { SettingRows } from "./ModelSettings";
import { chipLine, countChip, middleCut, modelChip, PART_CODES, partChip, roleWord } from "./modelWords";
import { PartRow, RoleGlyph } from "./PartsPopover";
import { PictureField, PicturePopover } from "./PicturePopover";
import { useStillOpen } from "./useStillOpen";
import { CUSTOM_MODEL, logUnexpected, PICTURE_WORD } from "./words";

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
    "node.wireframe",
];

/** The rotate buttons under the preview, in their order. */
const TURN_STEPS: readonly ModelTurnStep[] = ["left", "right", "forward", "back"];

/** Address refusals: the field says what to do next. */
const ADDRESS_CODES: ReadonlySet<string> = new Set(["E_MODEL_FETCH", "E_MODEL_URL_BLOCKED", "E_MODEL_WEB_PAGE"]);

/** Format refusals: the line says which formats would do. */
const FORMAT_CODES: ReadonlySet<string> = new Set(["E_MODEL_FORMAT_UNKNOWN", "E_MODEL_FORMAT_UNSUPPORTED"]);

/** The warnings the Details line shows as chips, in this order. */
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

/** One model the dialog holds: a folder, a .zip or a drop may hold several, each with its own name. */
interface Member {
    readonly held: Held;
    /** What Name says for it. */
    readonly name: string;
    /** Whether Add takes it (Load this model). */
    readonly load: boolean;
    /** Why graphty-element could not draw it, once the preview has shown it; Add is blocked while it is taken. */
    readonly failure?: CodedFact;
}

/** A model of a set refused outright: never held, said by its file. */
interface Refused {
    readonly name: string;
    readonly problem: CodedFact;
}

/**
 * What a layer names for a held model: its address, else its id.
 * @param held - the model.
 * @returns the reference.
 */
function refOf(held: Held): string {
    return held.url ?? held.record.id;
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
    /**
     * Add model: what `node.model` names, the draft settings, and every model added (`ref` among
     * them; several when the reader took more than one model of a set). The dialog has already
     * renamed them.
     */
    readonly onAdd: (ref: string, settings: ModelDraft, refs: readonly string[]) => void;
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
 * What stands over the preview: graphty-element draws the model live in it (`modelPreview`) once it
 * is accepted or, while it waits for parts, with them stood in for; the reader turns it by dragging
 * or with the arrow keys, and its clip plays. Over it: a spinner while it loads or draws, the cube
 * and the "N missing" chip while it waits for a part it cannot be drawn without, or the cube and the
 * chip saying why graphty-element could not draw it.
 * @param held - the model, if any
 * @param name - its name
 * @param draw - whether graphty-element drew it, or why it could not
 * @param busy - a source is loading
 * @returns what stands over the box, or null once the model is drawn
 */
function previewOver(held: Held | null, name: string, draw: ModelLive, busy: boolean): React.ReactNode {
    const accepted = held?.record.state === "accepted";
    const missing = countChip(held?.record.problems.filter((p) => PART_CODES.has(p.code)) ?? []);
    if (draw.drawn && !busy) {
        return null;
    }
    if (draw.failure !== undefined && !busy) {
        return (
            <Stack gap={4} align="center">
                <GLYPHS.model size={32} aria-hidden />
                <ModelChip chip={modelChip(draw.failure)} />
            </Stack>
        );
    }
    if (held === null) {
        // Before a model is loaded the box says the dialog takes a dropped file, as a drop area does.
        return (
            <Stack gap={6} align="center" className="ws-model-drop-hint">
                <UiGlyph name="fileUpload" size={24} />
                <Text size="xs" ta="center">
                    {CUSTOM_MODEL.dropHere}
                </Text>
            </Stack>
        );
    }
    if (draw.unavailable && !busy) {
        // The preview could not draw here (no WebGL context for it); the model itself may be fine.
        return <GLYPHS.model size={32} aria-hidden />;
    }
    if (busy || accepted || missing === undefined) {
        return <Loader size="sm" aria-label={CUSTOM_MODEL.loading(busy ? "model" : name)} />;
    }
    return (
        <Stack gap={4} align="center">
            <GLYPHS.model size={32} aria-hidden />
            <ModelChip chip={missing} />
        </Stack>
    );
}

/**
 * The preview box: graphty-element's live drawing, what stands in over it, the model's name for
 * one of several, and Reset view in its top-right corner once the model is drawn.
 * @param props - Component props
 * @param props.held - the model, if any
 * @param props.name - its name
 * @param props.label - its name drawn on the box, for one model of several
 * @param props.skipped - one model of several that Add leaves out: drawn faded, its name struck through
 * @param props.draw - whether graphty-element drew it, or why it could not
 * @param props.busy - a source is loading
 * @param props.onHost - takes the element graphty-element draws in
 * @returns The preview box
 */
function Preview({
    held,
    name,
    label,
    skipped,
    draw,
    busy,
    onHost,
}: Readonly<{
    held: Held | null;
    name: string;
    label?: string;
    skipped?: boolean;
    draw: ModelLive;
    busy: boolean;
    onHost: (host: HTMLDivElement | null) => void;
}>): React.JSX.Element {
    const showReset = held !== null && !busy && draw.drawn;
    const over = previewOver(held, name, draw, busy);
    return (
        <div
            className="ws-model-preview"
            data-testid="model-preview"
            data-empty={held === null || undefined}
            data-skipped={skipped === true || undefined}
        >
            {held === null || busy ? null : (
                <div ref={onHost} className="ws-model-live" aria-busy={draw.drawing || undefined} />
            )}
            {over === null ? null : <div className="ws-model-preview-over">{over}</div>}
            {label === undefined ? null : (
                <Text size="xs" fw={600} className="ws-model-label" data-testid="model-label" title={label}>
                    {label}
                </Text>
            )}
            {showReset ? (
                // Over the live canvas, in the box's top-right corner.
                <Tooltip label={CUSTOM_MODEL.resetView}>
                    <ActionIcon
                        className="ws-model-reset"
                        variant="subtle"
                        size="sm"
                        aria-label={CUSTOM_MODEL.resetView}
                        onClick={draw.resetView}
                    >
                        <GLYPHS.resetView size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            ) : null}
        </div>
    );
}

/**
 * More options' Picture row: `node.texture`, the picture every material of the model takes in place
 * of its own, chosen in the Picture pop-over and written with the model.
 * @param props - Component props
 * @param props.value - what the draft's `node.texture` names, or undefined
 * @param props.write - sets it
 * @param props.remove - takes it back
 * @param props.open - whether the Picture pop-over is open
 * @param props.setOpen - opens or closes it
 * @returns The row
 */
function PictureRow({
    value,
    write,
    remove,
    open,
    setOpen,
}: Readonly<{
    value: string | undefined;
    write: (ref: string) => void;
    remove: () => void;
    open: boolean;
    setOpen: (open: boolean) => void;
}>): React.JSX.Element {
    // A row that goes (the model cleared) takes its open pop-over with it, and Escape back.
    useEffect(
        () => () => {
            setOpen(false);
        },
        [setOpen],
    );
    const box = useRef<HTMLDivElement>(null);
    const removeName = `Remove model ${PICTURE_WORD.toLowerCase()}`;
    return (
        <div className="ws-row" data-line="node.texture" ref={box}>
            <div className="ws-field" data-named="">
                <span className="ws-field-label">
                    <span className="ws-field-name" title={PICTURE_WORD} aria-hidden>
                        {PICTURE_WORD}
                    </span>
                </span>
                <div className="ws-field-control">
                    <PictureField
                        label={`Model ${PICTURE_WORD.toLowerCase()}`}
                        pictureRef={value}
                        expanded={open}
                        onOpen={() => {
                            setOpen(true);
                        }}
                    />
                </div>
                <span className="ws-slot">
                    {value === undefined ? null : (
                        <Tooltip label={removeName}>
                            <ActionIcon variant="subtle" size="sm" aria-label={removeName} onClick={remove}>
                                <GLYPHS.remove size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    )}
                </span>
            </div>
            <PicturePopover
                opened={open}
                anchor={box}
                current={value}
                onPick={(ref) => {
                    setOpen(false);
                    write(ref);
                }}
                // A model chosen here is not this model's picture: the pop-over just closes.
                onModel={() => {
                    setOpen(false);
                }}
                onClose={() => {
                    setOpen(false);
                }}
            />
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
 * Under a set's preview: Previous model, "2 of 5", Next model (the Left and Right arrow keys on
 * either step too, wrapping round), and Load this model for the model shown.
 * @param props - Component props
 * @param props.at - the model shown, from 0
 * @param props.count - how many the set holds
 * @param props.load - whether Add takes the model shown
 * @param props.onStep - shows the model before (-1) or after (1)
 * @param props.onLoad - checks or unchecks the model shown
 * @returns The row
 */
function ModelSteps({
    at,
    count,
    load,
    onStep,
    onLoad,
}: Readonly<{
    at: number;
    count: number;
    load: boolean;
    onStep: (by: -1 | 1) => void;
    onLoad: (load: boolean) => void;
}>): React.JSX.Element {
    const keys = (event: React.KeyboardEvent): void => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            onStep(event.key === "ArrowLeft" ? -1 : 1);
        }
    };
    return (
        <Group gap={4} justify="space-between" wrap="nowrap" className="ws-model-steps">
            <Group gap={2} wrap="nowrap">
                <Tooltip label={CUSTOM_MODEL.previousModel}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={CUSTOM_MODEL.previousModel}
                        onClick={() => {
                            onStep(-1);
                        }}
                        onKeyDown={keys}
                    >
                        <GLYPHS.back size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
                <Text size="xs" data-testid="model-position" aria-live="polite">
                    {CUSTOM_MODEL.position(at + 1, count)}
                </Text>
                <Tooltip label={CUSTOM_MODEL.nextModel}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={CUSTOM_MODEL.nextModel}
                        onClick={() => {
                            onStep(1);
                        }}
                        onKeyDown={keys}
                    >
                        <GLYPHS.next size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Group>
            <Checkbox
                size="xs"
                label={CUSTOM_MODEL.loadThis}
                checked={load}
                onChange={(event) => {
                    onLoad(event.currentTarget.checked);
                }}
            />
        </Group>
    );
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
 * Why Add cannot take the models chosen yet, or null when it can.
 * @param loadingName - what is loading, if anything
 * @param members - every model the dialog holds
 * @param current - the model shown
 * @param failure - why graphty-element could not draw the model shown, if it could not
 * @returns Add's tooltip while blocked, or null
 */
function addBlock(
    loadingName: string | undefined,
    members: readonly Member[],
    current: Member | undefined,
    failure: CodedFact | undefined,
): string | null {
    const many = members.length > 1;
    const taking = many ? members.filter((m) => m.load) : members;
    if (loadingName !== undefined) {
        return CUSTOM_MODEL.loading(loadingName);
    }
    if (many && taking.length === 0) {
        return CUSTOM_MODEL.noneChosen;
    }
    const notReady = taking.find((m) => m.held.record.state !== "accepted");
    if (members.length === 0 || notReady !== undefined) {
        const firstMissing = notReady?.held.record.problems.find((p) => PART_CODES.has(p.code))?.params.name;
        return typeof firstMissing === "string"
            ? CUSTOM_MODEL.missing(firstMissing.split("/").pop() ?? firstMissing)
            : CUSTOM_MODEL.addFirst;
    }
    // Every model taken that graphty-element could not draw blocks Add, not only the one shown.
    for (const member of taking) {
        const why = member === current ? failure : member.failure;
        if (why !== undefined) {
            return member === current ? refusalLine(why) : CUSTOM_MODEL.ofSet(member.name, refusalLine(why));
        }
    }
    return null;
}

/**
 * The Load custom model dialog (node-models design 14): one file loader for a model's address, its
 * own file (its parts are asked for after, in Files), its folder, a .zip or a drop of any files
 * anywhere on the dialog; while it loads, graphty-element's
 * progress with Cancel load; once loaded, two columns: the settings on the left (Color, Animation
 * for a model with clips, More options, Files for a set of files, and the Details table), and the
 * model drawn by graphty-element on the right with its name and its rotate buttons under it.
 * Settings are a draft until Add. A folder, a .zip or a drop of several models holds each, stepped
 * through under the box, each with its own name and Load this model; files that are not a model,
 * arriving while one waits, go to it; a new model replaces what is held, and the x beside the file
 * takes it out. Cancel lets go of what it loaded that no layer uses. Mounted only while open.
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
    // The models of a set refused outright, said under the file loader.
    const [refused, setRefused] = useState<readonly Refused[]>([]);
    // Every model loaded, and which one the preview shows; one for a model's own file.
    const [members, setMembers] = useState<readonly Member[]>([]);
    const [index, setIndex] = useState(0);
    const current = members.at(index);
    const held = current?.held ?? null;
    const name = current?.name ?? "";
    const many = members.length > 1;
    // Changes the model shown (the one loaded when there is one), as the reader or a load says.
    const change = (edit: (member: Member) => Member): void => {
        setMembers((now) => now.map((member, at) => (at === index ? edit(member) : member)));
    };
    // The settings (Color, Animation, More options, rotation, Picture) are one draft shared by every
    // model of a set: Add writes them with the model the layer takes. Name and Load this model are
    // each model's own.
    const [draft, setDraft] = useState<ModelDraft>({});
    const [moreOpen, setMoreOpen] = useState(false);
    const [pictureOpen, setPictureOpen] = useState(false);
    // What this dialog added, by what names it: let go on Cancel when no layer uses it.
    const added = useRef(new Set<string>());
    const nameField = useRef<HTMLInputElement | null>(null);
    // The Modal mounts its body after this renders: the drop target is the element itself.
    const [body, setBody] = useState<HTMLDivElement | null>(null);
    const start = useStillOpen(true);
    const uid = useId();
    const busy = loading !== null;
    const waitingFor = held?.record.problems.filter((p) => PART_CODES.has(p.code)) ?? [];
    // Focus goes where the reader acts next: Name once a model is in, its first part while it waits.
    // Stepping through a set's models changes none of this, so focus stays on the arrows.
    const heldKey = members.map((m) => `${m.held.record.id} ${m.held.record.state}`).join(",");
    const waits = waitingFor.length > 0;
    const values: ModelDraft = { ...baseStyle, ...draft };
    // graphty-element draws the model live in this element of the preview box.
    const [previewHost, setPreviewHost] = useState<HTMLDivElement | null>(null);
    // A model waiting for parts is drawn with them stood in for, while Files still asks for them.
    const drawn = useModelPreview(
        held?.record.state === "accepted" ? (held.url ?? held.record.id) : held?.record.id,
        previewHost,
        values,
        CUSTOM_MODEL.preview(name),
        true,
    );
    // Only an accepted model's failure is said: a waiting one keeps the cube and its "N missing".
    const draw: ModelLive = held?.record.state === "accepted" ? drawn : { ...drawn, failure: undefined };
    const focusedFor = useRef("");
    useEffect(() => {
        // The name and the parts are drawn once the load is over, so focus waits for that too.
        if (heldKey === "" || busy || focusedFor.current === heldKey) {
            return;
        }
        focusedFor.current = heldKey;
        if (waits) {
            body?.querySelector<HTMLElement>(".ws-part-row input, .ws-part-row button")?.focus();
        } else {
            nameField.current?.focus();
        }
    }, [heldKey, waits, body, busy]);
    // Each model of a set remembers whether it could be drawn, so Add stays blocked by one that
    // could not after the reader steps away from it.
    const heldId = held?.record.id;
    const { failure } = draw;
    useEffect(() => {
        if (heldId === undefined) {
            return;
        }
        setMembers((now) =>
            now.some((m) => m.held.record.id === heldId && m.failure !== failure)
                ? now.map((m) => (m.held.record.id === heldId ? { ...m, failure } : m))
                : now,
        );
    }, [heldId, failure]);
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
    const memberOf = (next: Held): Member => ({
        held: next,
        name: next.record.plainName ?? modelName(session, refOf(next)),
        load: true,
    });
    // What the dialog holds now, after letting go of what it held before and no longer does.
    const holdAll = (next: readonly Held[]): void => {
        const keep = new Set(next.map(refOf));
        for (const member of members) {
            if (!keep.has(refOf(member.held))) {
                letGo(refOf(member.held));
            }
        }
        setMembers(next.map(memberOf));
        setIndex(0);
    };
    // Waiting for parts: files that are not a model go to it, matched by graphty-element.
    const offer = async (waiting: Held, files: readonly File[], live: () => boolean): Promise<void> => {
        const { rest } = await session.assets.offer([...files]);
        if (!live()) {
            return;
        }
        const after = session.assets.find(waiting.url ?? waiting.record.id) ?? waiting.record;
        moved(waiting.record, after);
        change((member) => ({ ...member, held: { ...waiting, record: after } }));
        const left = new Set(rest.map((f) => f.name));
        say(files.map((f) => `${f.name} ${left.has(f.name) ? "not needed" : "added"}`).join(", "));
    };
    const settle = async (
        source: AssetSource,
        files: readonly File[],
        controller: AbortController,
        live: () => boolean,
    ): Promise<void> => {
        if (held?.record.state === "rejected" && files.length > 0 && !files.some(isModelFile)) {
            await offer(held, files, live);
            return;
        }
        const before = new Set(session.assets.list().map((r) => r.id));
        const onProgress = (change: ProgressChange): void => {
            if (change.phase === "progress" && live()) {
                setLoading((now) =>
                    now?.controller === controller
                        ? {
                              ...now,
                              stage: change.asset?.stage,
                              completed: change.completed,
                              total: change.total ?? null,
                          }
                        : now,
                );
            }
        };
        // A folder, a .zip or a drop may hold several models: graphty-element adds each as its own.
        const records = await session.assets.addEach(source, { signal: controller.signal, onProgress });
        const url = typeof source === "string" ? source : undefined;
        const refs = records.map((r) => url ?? r.id);
        for (const [at, r] of records.entries()) {
            if (!before.has(r.id)) {
                added.current.add(refs[at]);
            }
        }
        if (!live()) {
            refs.forEach(letGo);
            return;
        }
        const [record] = records;
        if (records.length === 1 && record.state === "accepted" && record.kind === "image") {
            setPicture({ id: record.id, name: fileStem(record.path ?? files[0]?.name ?? "") || "picture" });
            say(CUSTOM_MODEL.notModel(fileStem(record.path ?? "") || "picture", MODEL_FORMATS));
            return;
        }
        const waitingIds = new Set(session.assets.waiting().map((w) => w.id));
        // A model refused outright is not held; one waiting for a part is, and Files asks for it.
        const kept = records.filter((r) => r.state === "accepted" || waitingIds.has(r.id));
        if (kept.length === 0) {
            const fact = record.problems[0] ?? { code: "E_MODEL_PARSE", params: {} };
            refs.forEach(letGo);
            setProblem(fact);
            say(refusalLine(fact));
            return;
        }
        // The models of the set refused outright are let go, and said by their files.
        const out = records
            .filter((each) => !kept.includes(each))
            .map((r) => {
                letGo(r.id);
                return { name: r.path ?? r.id, problem: r.problems[0] ?? { code: "E_MODEL_PARSE", params: {} } };
            });
        setRefused(out);
        holdAll(kept.map((r) => ({ ...(url === undefined ? {} : { url }), record: r })));
        say(
            [
                kept.length > 1
                    ? CUSTOM_MODEL.loadedMany(kept.length)
                    : CUSTOM_MODEL.loaded(kept[0].plainName ?? modelName(session, url ?? kept[0].id)),
                ...out.map((r) => CUSTOM_MODEL.ofSet(r.name, refusalLine(r.problem))),
            ].join(". "),
        );
    };
    const load = (source: AssetSource, files: readonly File[], shown: string): void => {
        // A new source (a drop, Retry, the address field) replaces the one still loading.
        loading?.controller.abort();
        const controller = new AbortController();
        const byAddress = typeof source === "string";
        setLoading({ name: shown, byAddress, controller, completed: 0, total: null });
        setProblem(null);
        setPicture(null);
        setRefused([]);
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
        const named = "name" in answer && answer.name !== undefined ? answer.name : undefined;
        const after = await session.assets.supply(held.record.id, answer);
        moved(held.record, after);
        change((member) => ({
            ...member,
            held: { ...member.held, record: after },
            // A set of several models had no name until the reader said which file is the model.
            ...("main" in answer ? { name: after.plainName ?? modelName(session, after.id) } : {}),
        }));
        const still = after.problems.some((p) => PART_CODES.has(p.code) && p.params.name === named);
        if (named !== undefined && !still && !("skip" in answer)) {
            say(`${named.split("/").pop() ?? named} added`);
        }
        return after.problems.filter((p) => p.params.part !== undefined && p.params.part === named);
    };

    const accepted = held?.record.state === "accepted" ? held : null;
    // Of a set, Add takes the models checked; of one model, that model.
    const taking = many ? members.filter((m) => m.load) : members;
    const blocked = addBlock(loading?.name, members, current, draw.failure);
    let addWord: string = forLayer ? CUSTOM_MODEL.add : CUSTOM_MODEL.addToProject;
    if (taking.length > 1) {
        addWord = CUSTOM_MODEL.addMany(taking.length);
    }
    const add = (): void => {
        // Every way to Add (click, Enter or Space on the button, Enter in Name) stops here when blocked.
        if (blocked !== null || taking.length === 0) {
            return;
        }
        for (const member of taking) {
            const { record } = member.held;
            const wanted = member.name.trim();
            const usual = fileStem(record.path ?? refOf(member.held)) || "Model";
            if (wanted !== (record.plainName ?? usual)) {
                session.assets.rename(record.id, wanted === usual ? "" : wanted);
            }
        }
        // A model of the set left unchecked is let go, as Cancel would.
        for (const member of members.filter((m) => !taking.includes(m))) {
            letGo(refOf(member.held));
        }
        // A layer takes the model shown when it is checked, else the first checked.
        const shown = current !== undefined && taking.includes(current) ? current : taking[0];
        onAdd(
            refOf(shown.held),
            draft,
            taking.map((m) => refOf(m.held)),
        );
    };
    const parts = held?.record.parts ?? [];
    const unusedParts = parts.filter((p) => p.state === "unused");
    const unused = unusedParts.map((p) => p.name);
    const unusedFiles = new Set(unused.map((n) => n.split("/").pop()));
    const facts = new Map(waitingFor.map((fact) => [String(fact.params.name ?? ""), fact]));
    // One self-contained file says nothing the preview and Name do not: no Files line.
    const showFiles = held !== null && (parts.length > 1 || waits);
    // The parts that need an answer come first, so the list's scroll never hides them.
    const listed = [...parts.filter((p) => facts.has(p.name)), ...parts.filter((p) => !facts.has(p.name))];
    const summary = accepted === null ? undefined : session.assets.inspect(accepted.record.id);
    const clips = summary?.animations ?? [];
    // One chip per word: a model over the budget and heavy for its nodes is "Heavy" once.
    const detailChips = [
        ...new Map(
            DETAIL_CHIP_CODES.flatMap((code) => accepted?.record.problems.filter((p) => p.code === code) ?? [])
                .map((p) =>
                    // Opened from the menu the dialog has no Animation control: say where the clip is chosen.
                    !forLayer && p.code === "W_MODEL_HAS_ANIMATIONS"
                        ? { ...modelChip(p), tip: CUSTOM_MODEL.animatedInLayer }
                        : modelChip(p),
                )
                .map((chip) => [chip.word, chip]),
        ).values(),
    ];
    const ignored = (accepted?.record.problems ?? [])
        .filter((p) => p.code === "W_MODEL_EXTENSION_IGNORED")
        .map((p) => String(p.params.extension));
    const write = (channel: Channel, value: ChannelValue): void => {
        setDraft((now) => ({ ...now, [channel]: value }));
    };
    const unset = (channel: Channel): void => {
        setDraft((now) => Object.fromEntries(Object.entries(now).filter(([c]) => c !== channel)));
    };
    const addressProblem = problem !== null && ADDRESS_CODES.has(problem.code) ? problem : null;
    const fileProblem = problem !== null && addressProblem === null ? problem : null;
    const empty = held === null && !busy;
    const shownLoad = loading === null ? undefined : loadStatus(loading);
    let heldFile = held === null ? "" : (held.url ?? held.record.path ?? name);
    if (many) {
        heldFile = CUSTOM_MODEL.models(members.length);
    }
    // The x beside the file: back to the empty dialog, after letting go of what nothing uses.
    const clear = (): void => {
        loading?.controller.abort();
        for (const each of added.current) {
            letGo(each);
        }
        setLoading(null);
        setMembers([]);
        setIndex(0);
        setDraft({});
        setProblem(null);
        setTried(null);
        setPicture(null);
        setRefused([]);
        setAddress("");
        setMoreOpen(false);
        say(CUSTOM_MODEL.removed(heldFile));
    };

    const fileSource = (
        <FileSource
            variant="row"
            autoFocus={empty}
            disabled={busy}
            progress={shownLoad?.progress}
            status={shownLoad?.status}
            onCancel={busy ? cancelLoad : undefined}
            cancelLabel={CUSTOM_MODEL.cancelLoad}
            folder
            url
            accept={MODEL_MAIN_EXTENSIONS.join(",")}
            chooseGlyph="fileUpload"
            folderGlyph="folderUpload"
            dropping={over}
            dropLabel={CUSTOM_MODEL.dropToLoad}
            loaded={held === null ? undefined : { name: heldFile, kind: held.url === undefined ? "file" : "url" }}
            onClear={clear}
            clearLabel={CUSTOM_MODEL.remove(heldFile)}
            label={CUSTOM_MODEL.chooseFile}
            folderLabel={CUSTOM_MODEL.chooseFolder}
            placeholder={CUSTOM_MODEL.addressOrDrop}
            urlLabel={CUSTOM_MODEL.address}
            defaultValue={address}
            error={addressProblem === null ? undefined : refusalLine(addressProblem)}
            onDiscard={() => {
                say("Address discarded");
            }}
            onFiles={(files, paths) => {
                load(paths === undefined ? files : { files: paths }, files, files[0]?.name ?? "");
            }}
            onUrl={(url) => {
                setAddress(url);
                load(url, [], url);
            }}
        />
    );

    const left = (
        <Stack gap="sm" className="ws-model-left">
            {fileSource}
            {addressProblem === null || busy ? null : (
                <AddressActions
                    problem={addressProblem}
                    onRetry={() => {
                        if (tried !== null) {
                            load(tried, [], tried);
                        }
                    }}
                    onUseAddress={(suggested) => {
                        setAddress(suggested);
                        setProblem(null);
                    }}
                />
            )}
            {fileProblem === null || busy ? null : <Refusal problem={fileProblem} />}
            {busy
                ? null
                : refused.map((r) => (
                      <Text key={r.name} size="xs" c="var(--cm-text-danger)" data-testid="model-refused">
                          {CUSTOM_MODEL.ofSet(r.name, refusalLine(r.problem))}
                      </Text>
                  ))}
            {picture === null ? null : (
                <Group gap={4} wrap="nowrap">
                    <Text size="xs" c="var(--cm-text-warning)">
                        {CUSTOM_MODEL.notModel(picture.name, MODEL_FORMATS)}
                    </Text>
                    {forLayer && onPicture !== undefined ? (
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
                    ) : null}
                </Group>
            )}
            {accepted === null || !forLayer || busy ? null : (
                <Stack gap={4} className="ws-model-settings">
                    {forLayer ? (
                        <SettingRows
                            channels={SHOWN_CHANNELS}
                            values={draft}
                            problems={accepted.record.problems}
                            write={write}
                            remove={unset}
                            clips={clips}
                        />
                    ) : null}
                </Stack>
            )}
            {draw.failure === undefined || busy ? null : (
                <Group gap={4} wrap="nowrap">
                    <Refusal problem={draw.failure} />
                    {draw.failure.code === "E_MODEL_DECODER_UNAVAILABLE" && draw.failure.params.reason === "load" ? (
                        <Button size="compact-xs" variant="default" onClick={draw.retry}>
                            Retry
                        </Button>
                    ) : null}
                </Group>
            )}
            {accepted === null || !forLayer || busy ? null : (
                <>
                    <Disclosure
                        word={CUSTOM_MODEL.moreOptions}
                        open={moreOpen}
                        onToggle={() => {
                            setMoreOpen(!moreOpen);
                        }}
                    />
                    <Collapse in={moreOpen} transitionDuration={0}>
                        <div data-testid="model-more">
                            <SettingRows
                                channels={MORE_CHANNELS}
                                values={draft}
                                problems={accepted.record.problems}
                                write={write}
                                remove={unset}
                                clips={clips}
                            />
                            <div className="ws-model-settings">
                                <PictureRow
                                    value={
                                        typeof draft["node.texture"] === "string" ? draft["node.texture"] : undefined
                                    }
                                    write={(ref) => {
                                        write("node.texture", ref);
                                    }}
                                    remove={() => {
                                        unset("node.texture");
                                    }}
                                    open={pictureOpen}
                                    setOpen={setPictureOpen}
                                />
                            </div>
                        </div>
                    </Collapse>
                </>
            )}
            {held === null || !showFiles || busy ? null : (
                <Stack gap={4}>
                    <Text size="sm" id={`${uid}-files`}>
                        {CUSTOM_MODEL.files}
                    </Text>
                    <section
                        className="ws-model-files ws-model-scroll"
                        data-testid="model-files"
                        aria-labelledby={`${uid}-files`}
                        tabIndex={0} // NOSONAR(S6845): a scrolling list takes focus so the keyboard scrolls it (WCAG 2.1.1)
                    >
                        <Stack gap={6}>
                            {waitingFor
                                .filter((fact) => fact.code === "E_MODEL_AMBIGUOUS")
                                .map((fact) => (
                                    <PartRow
                                        key="main"
                                        part={fact}
                                        first={false}
                                        supply={supply}
                                        onDiscard={() => {
                                            say("Address discarded");
                                        }}
                                    />
                                ))}
                            {listed.map((part) => {
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
                                        onDiscard={() => {
                                            say("Address discarded");
                                        }}
                                    />
                                );
                            })}
                            {held.record.problems
                                .filter(
                                    (p) =>
                                        p.code === "W_MODEL_PART_UNUSED" &&
                                        !unusedFiles.has(String(p.params.fileName).split("/").pop()),
                                )
                                .map((fact) => (
                                    <FactChip key={String(fact.params.fileName)} fact={fact} />
                                ))}
                        </Stack>
                    </section>
                </Stack>
            )}
            {summary === undefined || accepted === null || busy ? null : (
                <Stack gap={4} className="ws-model-details-box">
                    <Group gap={6} wrap="wrap" data-testid="model-details-line">
                        <Text size="sm" id={`${uid}-details`}>
                            {CUSTOM_MODEL.details}
                        </Text>
                        {detailChips.map((chip) => (
                            <ModelChip key={chip.word} chip={chip} tone="warning" />
                        ))}
                    </Group>
                    <section
                        data-testid="model-details"
                        className="ws-model-details ws-model-scroll"
                        aria-labelledby={`${uid}-details`}
                        tabIndex={0} // NOSONAR(S6845): a scrolling table takes focus so the keyboard scrolls it (WCAG 2.1.1)
                    >
                        {CUSTOM_MODEL.detailRows(summary, accepted.record.byteLength, ignored).map((row) => (
                            <DataRow key={row.name} stat name={row.name} value={row.value} description={row.tip} />
                        ))}
                    </section>
                </Stack>
            )}
        </Stack>
    );

    const side = (
        <Stack gap={8} className="ws-model-side">
            <Preview
                held={held}
                name={name}
                label={many && !busy ? name : undefined}
                skipped={many && current?.load === false}
                draw={draw}
                busy={busy}
                onHost={setPreviewHost}
            />
            {many && current !== undefined && !busy ? (
                <ModelSteps
                    at={index}
                    count={members.length}
                    load={current.load}
                    onStep={(by) => {
                        setIndex((index + by + members.length) % members.length);
                    }}
                    onLoad={(load) => {
                        change((member) => ({ ...member, load }));
                    }}
                />
            ) : null}
            {held === null || busy ? null : (
                // Under the model it names: each model of a set will carry its own.
                <div className="ws-row ws-model-name">
                    <div className="ws-field" data-named="">
                        <span className="ws-field-label">
                            <span className="ws-field-name" aria-hidden>
                                {CUSTOM_MODEL.name}
                            </span>
                        </span>
                        <div className="ws-field-control">
                            <TextInput
                                ref={nameField}
                                size="xs"
                                aria-label={CUSTOM_MODEL.name}
                                value={name}
                                onChange={(event) => {
                                    const typed = event.currentTarget.value;
                                    change((member) => ({ ...member, name: typed }));
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && blocked === null) {
                                        event.preventDefault();
                                        add();
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
            {summary === undefined || busy ? null : (
                <Text size="xs" c="dimmed" ta="center" data-testid="model-variant">
                    {CUSTOM_MODEL.variantLine(summary)}
                </Text>
            )}
            {forLayer && accepted !== null && !busy ? (
                <RotateButtons values={values} detected={detectedUp(summary)} write={write} />
            ) : null}
        </Stack>
    );

    return (
        <Modal
            opened
            onClose={cancel}
            // Mantine's modal sees Escape before anything inside it: the Picture pop-over closes alone.
            closeOnEscape={!pictureOpen}
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
                    {left}
                </ScrollArea>
                {side}
                <ModalFooter className="ws-model-footer">
                    <Button variant="default" onClick={cancel}>
                        {CUSTOM_MODEL.cancel}
                    </Button>
                    <Tooltip label={blocked ?? addWord} disabled={blocked === null}>
                        <Button
                            // A blocked Add stays focusable, with its reason as its tooltip.
                            aria-disabled={blocked !== null || undefined}
                            data-disabled={blocked !== null || undefined}
                            onClick={add}
                        >
                            {addWord}
                        </Button>
                    </Tooltip>
                </ModalFooter>
            </div>
        </Modal>
    );
}
