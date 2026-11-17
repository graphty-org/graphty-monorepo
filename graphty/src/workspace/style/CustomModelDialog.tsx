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
import {
    type AssetRecord,
    type AssetSource,
    type CodedFact,
    type GraphSession,
    MODEL_DEFAULT_CHANNELS,
    type ModelDefaultsPatch,
    type ModelPart,
    type ModelSummary,
    type PartAnswer,
    type ProgressChange,
    type TransactionScope,
} from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, Group, Loader, Modal, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

import { failureOf, fileStem, type ModelLive, modelName, useModelPreview } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { FactChip, ModelChip } from "./ModelChip";
import { SettingRows } from "./ModelSettings";
import { chipLine, countChip, middleCut, modelChip, PART_CODES, partChip, roleWord } from "./modelWords";
import { PartRow, RoleGlyph } from "./PartsPopover";
import { PictureField, PicturePopover } from "./PicturePopover";
import { useStillOpen } from "./useStillOpen";
import { CUSTOM_MODEL, logUnexpected, MODEL_SETTING_ROWS, PICTURE_WORD } from "./words";

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

/** The settings only a layer takes, opened from a layer (with Picture); the model's own are graphty-element's. */
const LAYER_CHANNELS: readonly Channel[] = ["node.unlit", "node.wireframe"];

/**
 * Whether a setting is one a model carries with it (`assets.setDefaults`), by graphty-element's list.
 * @param channel - the setting.
 * @returns true for a model's own setting.
 */
function isModelChannel(channel: Channel): boolean {
    return (MODEL_DEFAULT_CHANNELS as readonly Channel[]).includes(channel);
}

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
    /**
     * The name of the model the project already held for the same file: this one is a second model
     * of it (graphty-element's `assets.copy`), set up and added apart from it.
     */
    readonly again?: string;
}

/** One model the dialog holds: a folder, a .zip or a drop may hold several, each with its own name. */
interface Member {
    readonly held: Held;
    /** What Name says for it. */
    readonly name: string;
    /** The model's own settings as the reader set them, or undefined until the reader changes one. */
    readonly settings?: ModelDraft;
    /** The model's pictures drawn without them, or undefined until the reader changes one. */
    readonly hidden?: readonly string[];
    /** Whether Add takes it (Load this model). */
    readonly load: boolean;
    /** Why graphty-element could not draw it; Add is blocked while it is taken. */
    readonly failure?: CodedFact;
    /** Whether graphty-element has been asked to draw it, so `failure` is known. */
    readonly checked?: boolean;
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

/**
 * What graphty-element read of a model: an accepted one, or one waiting for pictures or materials
 * (read as it is drawn meanwhile); none for one it cannot read yet (waiting for its geometry or
 * for an answer).
 * @param session - the element's session.
 * @param id - the model's id.
 * @returns the summary, if any.
 */
function summaryOf(session: GraphSession, id: AssetRecord["id"]): ModelSummary | undefined {
    try {
        return session.assets.inspect(id);
    } catch {
        return undefined;
    }
}

/**
 * A model's clips, from graphty-element's summary: none until it can be read.
 * @param session - the element's session.
 * @param record - the model.
 * @returns the clips.
 */
function clipsOf(session: GraphSession, record: AssetRecord): ModelSummary["animations"] {
    return summaryOf(session, record.id)?.animations ?? [];
}

/**
 * The model's own settings in the dialog: as the reader set them, else what the model carries
 * (`AssetRecord.defaults`), with its first clip for a model with clips that names none, so the
 * preview plays it. Playing is the dialog's choice: graphty-element's default draws a model still.
 * @param session - the element's session.
 * @param member - the model.
 * @param record - the model as graphty-element holds it now: Add reads the accepted record, since a
 *   model accepted while its pictures still download is held under a new id.
 * @returns the settings.
 */
function settingsOf(session: GraphSession, member: Member, record: AssetRecord = member.held.record): ModelDraft {
    if (member.settings !== undefined) {
        return member.settings;
    }
    const own = member.held.record.defaults?.style ?? {};
    const [first] = clipsOf(session, record);
    return own["node.modelAnimation"] === undefined && first !== undefined
        ? { ...own, "node.modelAnimation": first.name }
        : own;
}

/**
 * A name for a second model of a file the project already holds, that no model of the project has:
 * the first one's name and the next free number ("Fox 2").
 * @param session - the element's session.
 * @param first - the first model's name.
 * @param id - the second model's id, whose own name does not count.
 * @returns the name.
 */
function freeName(session: GraphSession, first: string, id: AssetRecord["id"]): string {
    const taken = new Set(
        session.assets
            .list()
            .filter((r) => r.kind === "model" && r.state === "accepted" && r.id !== id)
            .map((r) => modelName(session, r.id)),
    );
    let n = 2;
    while (taken.has(`${first} ${n}`)) {
        n += 1;
    }
    return `${first} ${n}`;
}

/**
 * The model's pictures drawn without them in the dialog: as the reader set them, else the model's own.
 * @param member - the model.
 * @returns the pictures' names.
 */
function hiddenOf(member: Member): readonly string[] {
    return member.hidden ?? member.held.record.defaults?.hiddenTextures ?? [];
}

/**
 * What Add stores with a model (`assets.setDefaults`): each setting that differs from what it
 * carries (null takes one back) and its hidden pictures when they changed.
 * @param session - the element's session.
 * @param member - the model, as the dialog holds it.
 * @param record - the model as it is now (accepted, possibly with a new id).
 * @returns the patch, or undefined when nothing changed.
 */
function defaultsPatch(session: GraphSession, member: Member, record: AssetRecord): ModelDefaultsPatch | undefined {
    const settings = settingsOf(session, member, record);
    const before = record.defaults;
    const style = Object.fromEntries(
        MODEL_DEFAULT_CHANNELS.flatMap((channel) =>
            settings[channel] === before?.style[channel] ? [] : [[channel, settings[channel] ?? null]],
        ),
    );
    const hidden = hiddenOf(member);
    const sameHidden = JSON.stringify(hidden) === JSON.stringify(before?.hiddenTextures ?? []);
    if (Object.keys(style).length === 0 && sameHidden) {
        return undefined;
    }
    return sameHidden ? { style } : { style, hiddenTextures: hidden };
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
    /** Stops only the pictures still downloading: the model stays, waiting for them. */
    readonly pictures: AbortController;
    /** graphty-element's stage, or undefined before its first change. */
    readonly stage?: string;
    readonly completed: number;
    readonly total: number | null;
    /** The model is held while its pictures still download: shown, set up and added without them. */
    readonly held?: boolean;
}

/** Props for CustomModelDialog. */
export interface CustomModelDialogProps {
    /** Whether a layer takes the model: Light, Wireframe, Picture and Use as picture are offered too. */
    readonly forLayer: boolean;
    /**
     * The target layer's own values (`node.color` and the `node.model*` settings), so the preview
     * draws the model as that layer would, under the dialog's draft. Default: none.
     */
    readonly baseStyle?: ModelDraft;
    /**
     * Add model: what `node.model` names, the layer's own draft settings (Light, Wireframe,
     * Picture), every model added (`ref` among them; several when the reader took more than one
     * model of a set), and, when the reader changed a model's own settings, what stores them with
     * the models (`assets.setDefaults`), to run in the caller's undo step. The dialog has already
     * renamed and accepted them.
     */
    readonly onAdd: (
        ref: string,
        settings: ModelDraft,
        refs: readonly string[],
        saveDefaults?: (tx: TransactionScope) => Promise<void>,
    ) => void;
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
 * The model's pictures, each drawn or not (`hiddenTextures`): a part drawn without its picture
 * takes the node's color. All textures checks or clears them all.
 * @param props - Component props
 * @param props.pictures - the model's pictures, from graphty-element's summary
 * @param props.hidden - the names drawn without them
 * @param props.onChange - sets the names drawn without them
 * @returns The group, or nothing for a model with no pictures
 */
function TextureRows({
    pictures,
    hidden,
    onChange,
}: Readonly<{
    pictures: readonly { readonly name: string }[];
    hidden: readonly string[];
    onChange: (hidden: readonly string[]) => void;
}>): React.JSX.Element | null {
    if (pictures.length === 0) {
        return null;
    }
    const shown = pictures.filter((p) => !hidden.includes(p.name)).length;
    return (
        <fieldset className="ws-model-textures" data-testid="model-textures">
            <legend>
                <Text size="sm" span>
                    {CUSTOM_MODEL.textures}
                </Text>
            </legend>
            <Stack gap={4}>
                <Checkbox
                    size="xs"
                    label={CUSTOM_MODEL.allTextures}
                    checked={shown === pictures.length}
                    indeterminate={shown > 0 && shown < pictures.length}
                    onChange={(event) => {
                        onChange(event.currentTarget.checked ? [] : pictures.map((p) => p.name));
                    }}
                />
                {pictures.map((p) => (
                    <Checkbox
                        key={p.name}
                        size="xs"
                        label={p.name}
                        checked={!hidden.includes(p.name)}
                        onChange={(event) => {
                            onChange(
                                event.currentTarget.checked ? hidden.filter((n) => n !== p.name) : [...hidden, p.name],
                            );
                        }}
                    />
                ))}
            </Stack>
        </fieldset>
    );
}

/**
 * One file of the model that needs nothing from the reader: its role glyph, its name (the full path
 * in the tooltip), its role word, its state chip unless it was found (Downloading while it still
 * downloads), and an x that takes that one file back out (`assets.dropPart`).
 * @param props - Component props
 * @param props.part - the part
 * @param props.downloading - it is still downloading
 * @param props.onDrop - takes it back out, when it can be
 * @returns The line
 */
function PartLine({
    part,
    downloading,
    onDrop,
}: Readonly<{ part: ModelPart; downloading?: boolean; onDrop?: () => void }>): React.JSX.Element {
    const file = part.name.split("/").pop() ?? part.name;
    const chip = downloading === true ? CUSTOM_MODEL.downloadingChip(file) : partChip(part);
    const removeName = CUSTOM_MODEL.remove(file);
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
            {onDrop === undefined ? null : (
                <Tooltip label={removeName}>
                    <ActionIcon variant="subtle" size="sm" aria-label={removeName} onClick={onDrop}>
                        {/* An x, as the loaded file's own line clears it. */}
                        <GLYPHS.close size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            )}
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
    // A picture still downloading is not missing: the box shows it loading, not a failure.
    const missing = countChip(
        held?.record.problems.filter((p) => PART_CODES.has(p.code) && p.params.downloading !== true) ?? [],
    );
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
        // Blank until a model is loaded: the loader row beside it takes files, and the whole dialog a drop.
        return null;
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
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- an ARIA group naming four buttons; a fieldset would draw its own border and legend
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
    // A model waiting only for files that are missing is added without them (`assets.accept`), so a
    // model can be styled without its textures; one waiting for an answer (which file is which) is not.
    const notReady = taking.find(
        (m) =>
            m.held.record.state !== "accepted" &&
            m.held.record.problems.some((p) => PART_CODES.has(p.code) && p.code !== "E_MODEL_MISSING_FILE"),
    );
    if (members.length === 0 || notReady !== undefined) {
        const firstMissing = notReady?.held.record.problems.find((p) => PART_CODES.has(p.code))?.params.name;
        return typeof firstMissing === "string"
            ? CUSTOM_MODEL.missing(firstMissing.split("/").pop() ?? firstMissing)
            : CUSTOM_MODEL.addFirst;
    }
    return drawBlock(taking, current, failure);
}

/**
 * Every model taken that graphty-element could not draw blocks Add, not only the one shown.
 * @param taking - the models Add takes
 * @param current - the model shown
 * @param failure - why graphty-element could not draw the model shown, if it could not
 * @returns Add's tooltip while blocked, or null
 */
function drawBlock(
    taking: readonly Member[],
    current: Member | undefined,
    failure: CodedFact | undefined,
): string | null {
    for (const member of taking) {
        if (member.held.record.state !== "accepted") {
            // Accepted on Add, without what is missing; graphty-element refuses it then if it must.
            continue;
        }
        if (member !== current && member.checked !== true) {
            return CUSTOM_MODEL.loading(member.name);
        }
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
 * progress with Cancel load; two columns at every state: the loading on the left (the file loader,
 * its progress bar, the loaded file with its x, lines about the load, and Files), and what was loaded
 * on the right (the model drawn by graphty-element, a set's arrows, Name with the Model settings gear,
 * and Details, a box that scrolls). The gear opens Model settings in a modal pop-over over the
 * dialog (rotation, Color, Animation and Pose, Textures and, for a layer, its own settings).
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
    const { session, store, element } = useWorkspace();
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
    // A model's own settings (Color, Animation and Pose, Up, Turn, Textures...) are each model's, kept
    // with it on Add. The layer's own (Light, Wireframe, Picture) are one draft for the layer.
    const [draft, setDraft] = useState<ModelDraft>({});
    // Model settings open in a modal pop-over over the dialog, from the gear beside Name. It lies over
    // the loading column, where it was when the gear was pressed, so the model stays in sight while
    // the reader turns it, poses it or takes its pictures away.
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsOver, setSettingsOver] = useState<DOMRect | null>(null);
    const [pictureOpen, setPictureOpen] = useState(false);
    // What this dialog added, by what names it: let go on Cancel when no layer uses it.
    const added = useRef(new Set<string>());
    const nameField = useRef<HTMLInputElement | null>(null);
    // The Modal mounts its body after this renders: the drop target is the element itself.
    const [body, setBody] = useState<HTMLDivElement | null>(null);
    const start = useStillOpen(true);
    const uid = useId();
    // Loading and nothing to show yet: a model held while its pictures download is shown and taken.
    const busy = loading !== null && loading.held !== true;
    // Add pressed: a load settling after it holds nothing more.
    const adding = useRef(false);
    // The x's on parts still taking their files out, in turn: Add waits for them.
    const [dropping, setDropping] = useState(0);
    const drops = useRef<Promise<void>>(Promise.resolve());
    // A model a part's x replaced, by the id it had: an x pressed before it was redrawn follows it.
    const replaced = useRef(new Map<string, Held>());
    // Cancel load said under the file: the model stays, without what had not arrived.
    const [stopped, setStopped] = useState<string | null>(null);
    const waitingFor = held?.record.problems.filter((p) => PART_CODES.has(p.code)) ?? [];
    // Focus goes where the reader acts next: Name once a model is in, its first part while it waits.
    // Stepping through a set's models changes none of this, so focus stays on the arrows.
    const heldKey = members.map((m) => `${m.held.record.id} ${m.held.record.state}`).join(",");
    const waits = waitingFor.length > 0;
    const modelDraft: ModelDraft = session === null || current === undefined ? {} : settingsOf(session, current);
    const hidden = current === undefined ? [] : hiddenOf(current);
    // The dialog's settings over the layer's own, so a change in the dialog is always seen.
    const values: ModelDraft = { ...baseStyle, ...modelDraft, ...draft };
    // graphty-element draws the model live in this element of the preview box.
    const [previewHost, setPreviewHost] = useState<HTMLDivElement | null>(null);
    // A model waiting for parts is drawn with them stood in for, while Files still asks for them.
    const drawn = useModelPreview(
        held?.record.state === "accepted" ? (held.url ?? held.record.id) : held?.record.id,
        previewHost,
        values,
        CUSTOM_MODEL.preview(name),
        true,
        hidden,
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
        // Without scrolling: the column stays at its top, the file's address and Files whole, and
        // the model under them (a focus that scrolled cut the address under the header, #8606).
        if (waits) {
            body?.querySelector<HTMLElement>(".ws-part-row input, .ws-part-row button")?.focus({ preventScroll: true });
        } else {
            nameField.current?.focus({ preventScroll: true });
        }
    }, [heldKey, waits, body, busy]);
    // Each model of a set remembers whether it could be drawn, so Add stays blocked by one that
    // could not after the reader steps away from it.
    const heldId = held?.record.id;
    const { failure, drawn: shown } = draw;
    useEffect(() => {
        // Only what the preview settled: while it draws, what the off-screen draw found stands.
        if (heldId === undefined || (failure === undefined && !shown)) {
            return;
        }
        setMembers((now) =>
            now.some((m) => m.held.record.id === heldId && m.failure !== failure)
                ? now.map((m) => (m.held.record.id === heldId ? { ...m, failure } : m))
                : now,
        );
    }, [heldId, failure, shown]);
    // Every accepted model is drawn once off screen, so a model of a set the reader never steps to
    // still blocks Add when graphty-element cannot draw it.
    const asked = useRef(new Set<string>());
    useEffect(() => {
        if (element === null) {
            return;
        }
        for (const member of members) {
            const { id, state } = member.held.record;
            if (state !== "accepted" || asked.current.has(id)) {
                continue;
            }
            asked.current.add(id);
            // graphty-element says whether it can draw the model; null (no WebGL here) blocks nothing.
            void element
                .checkModel(refOf(member.held))
                .catch((error: unknown) => ({ drawable: false, failure: failureOf(error) }))
                .then(({ failure: found }) => {
                    setMembers((now) =>
                        now.map((m) =>
                            m.held.record.id === id ? { ...m, checked: true, failure: m.failure ?? found } : m,
                        ),
                    );
                });
        }
    }, [element, members]);
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
        name:
            next.again === undefined
                ? (next.record.plainName ?? modelName(session, refOf(next)))
                : freeName(session, next.again, next.record.id),
        load: true,
    });
    // What the dialog holds now, after letting go of what it held before and no longer does.
    const holdAll = (next: readonly Held[]): void => {
        const keep = new Set(next.map((h) => refOf(h)));
        for (const member of members) {
            if (!keep.has(refOf(member.held))) {
                letGo(refOf(member.held));
            }
        }
        // A set loaded again takes the same ids: its new members are drawn off screen again, and an
        // x on one follows no model an x replaced before.
        asked.current.clear();
        replaced.current.clear();
        // A model held while its pictures downloaded keeps what the reader set meanwhile.
        setMembers((now) =>
            next.map((h) => {
                const was = now.find((m) => refOf(m.held) === refOf(h));
                return was === undefined ? memberOf(h) : { ...was, held: h, failure: undefined, checked: undefined };
            }),
        );
        setIndex(0);
    };
    // Waiting for parts: files that are not a model go to it, matched by graphty-element.
    const offer = async (waiting: Held, files: readonly File[], live: () => boolean): Promise<void> => {
        const { rest } = await session.assets.offer([...files]);
        if (!live()) {
            return;
        }
        // eslint-disable-next-line unicorn/no-array-callback-reference -- the session's find, not Array.find
        const after = session.assets.find(waiting.url ?? waiting.record.id) ?? waiting.record;
        moved(waiting.record, after);
        change((member) => ({ ...member, held: { ...waiting, record: after } }));
        const left = new Set(rest.map((f) => f.name));
        say(files.map((f) => `${f.name} ${left.has(f.name) ? "not needed" : "added"}`).join(", "));
    };
    // By address: once all but its pictures is in, the model is shown, set up and taken by Add
    // while they download (graphty-element stops them when Add takes it without them).
    const holdEarly =
        (url: string | undefined, controller: AbortController, live: () => boolean) =>
        (record: AssetRecord): void => {
            if (url === undefined || !live()) {
                return;
            }
            added.current.add(url);
            holdAll([{ url, record }]);
            setLoading((now) => (now?.controller === controller ? { ...now, held: true } : now));
        };
    // What a load brought that the session did not hold before is the dialog's to let go, until
    // Add takes it: once Add took the model, what the load brings is the project's.
    const noteAdded = (records: readonly AssetRecord[], refs: readonly string[], before: ReadonlySet<string>): void => {
        for (const [at, r] of records.entries()) {
            if (!before.has(r.id) && !adding.current) {
                added.current.add(refs[at]);
            }
        }
    };
    const settle = async (
        source: AssetSource,
        files: readonly File[],
        controller: AbortController,
        live: () => boolean,
        stopPictures?: AbortSignal,
    ): Promise<void> => {
        if (held?.record.state === "rejected" && files.length > 0 && !files.some((f) => isModelFile(f))) {
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
        const url = typeof source === "string" ? source : undefined;
        const onWaiting = holdEarly(url, controller, live);
        // A folder, a .zip or a drop may hold several models: graphty-element adds each as its own.
        const loaded = await session.assets.addEach(source, {
            signal: controller.signal,
            onProgress,
            onWaiting,
            stopPictures,
        });
        // A model the project already held is never changed from here: the dialog sets up and adds
        // a second model of the same file, by its own id (#8609, #8610).
        const again = new Map<AssetRecord["id"], string>();
        const records = await Promise.all(
            loaded.map(async (r) => {
                const ours = added.current.has(r.id) || (url !== undefined && added.current.has(url));
                if (r.kind !== "model" || r.state !== "accepted" || !before.has(r.id) || ours) {
                    return r;
                }
                const copy = await session.assets.copy(r.id);
                again.set(copy.id, r.plainName ?? modelName(session, url ?? r.id));
                return copy;
            }),
        );
        const refs = records.map((r) => (again.has(r.id) ? r.id : (url ?? r.id)));
        noteAdded(records, refs, before);
        if (!live()) {
            for (const r of refs) {
                letGo(r);
            }
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
            for (const r of refs) {
                letGo(r);
            }
            // Shown while its pictures downloaded, then refused outright (too large): not Add's to take.
            setMembers((now) => now.filter((m) => !refs.includes(refOf(m.held))));
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
        holdAll(
            kept.map((r) => {
                const first = again.get(r.id);
                return first === undefined
                    ? { ...(url === undefined ? {} : { url }), record: r }
                    : { record: r, again: first };
            }),
        );
        const shownName = kept[0].plainName ?? modelName(session, url ?? kept[0].id);
        let loadedLine = kept.length > 1 ? CUSTOM_MODEL.loadedMany(kept.length) : CUSTOM_MODEL.loaded(shownName);
        // Cancel load while only its pictures downloaded: the model stays, without them.
        if (stopPictures?.aborted === true) {
            loadedLine = CUSTOM_MODEL.cancelled(shownName);
            setStopped(loadedLine);
        }
        say([loadedLine, ...out.map((r) => CUSTOM_MODEL.ofSet(r.name, refusalLine(r.problem)))].join(". "));
    };
    const load = (source: AssetSource, files: readonly File[], shown: string): void => {
        // A new source (a drop, Retry, the address field) replaces the one still loading.
        loading?.controller.abort();
        const controller = new AbortController();
        const byAddress = typeof source === "string";
        const pictures = new AbortController();
        setLoading({ name: shown, byAddress, controller, pictures, completed: 0, total: null });
        setProblem(null);
        setPicture(null);
        setRefused([]);
        setStopped(null);
        setTried(byAddress ? source : null);
        say(CUSTOM_MODEL.loading(shown));
        const stillOpen = start();
        // Add pressed: a load settling after it holds nothing more.
        const live = (): boolean => stillOpen() && !controller.signal.aborted && !adding.current;
        settle(source, files, controller, live, pictures.signal)
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
        // A model shown while its pictures download stays: only the pictures stop, and it waits
        // for them (handed over in Files, or added without them).
        if (loading?.held === true) {
            loading.pictures.abort();
            return;
        }
        if (loading !== null) {
            loading.controller.abort();
            setLoading(null);
            setStopped(CUSTOM_MODEL.cancelled(loading.name));
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

    // The x on a part's line: the model read again without that file, which it then asks for. The
    // x's pressed one after another each take their file out of what the one before left, in turn.
    const dropPart = (part: string): void => {
        if (held === null) {
            return;
        }
        const clicked = held;
        setDropping((n) => n + 1);
        drops.current = drops.current.then(async () => {
            // Pressed before the x before it was drawn: the model that x left.
            let from = clicked;
            const seen = new Set([from.record.id]);
            for (let next = replaced.current.get(from.record.id); next !== undefined && !seen.has(next.record.id);) {
                from = next;
                seen.add(from.record.id);
                next = replaced.current.get(from.record.id);
            }
            try {
                const after = await session.assets.dropPart(refOf(from), part);
                // A waiting model is read again in place; an accepted one comes back as a new one,
                // and the model as it was is let go.
                const next: Held = after.id === from.record.id ? { ...from, record: after } : { record: after };
                if (after.id !== from.record.id) {
                    replaced.current.set(from.record.id, next);
                    added.current.add(after.id);
                    letGo(refOf(from));
                }
                setMembers((now) => now.map((m) => (m.held.record.id === from.record.id ? { ...m, held: next } : m)));
                say(CUSTOM_MODEL.removed(part.split("/").pop() ?? part));
            } catch (error) {
                const fact = failureOf(error);
                setProblem(fact);
                say(refusalLine(fact));
            } finally {
                setDropping((n) => n - 1);
            }
        });
    };

    // Of a set, Add takes the models checked; of one model, that model.
    const taking = many ? members.filter((m) => m.load) : members;
    const blocked = addBlock(
        busy || dropping > 0 ? (loading?.name ?? name) : undefined,
        members,
        current,
        draw.failure,
    );
    let addWord: string = forLayer ? CUSTOM_MODEL.add : CUSTOM_MODEL.addToProject;
    if (taking.length > 1) {
        addWord = CUSTOM_MODEL.addMany(taking.length);
    }
    // Accepts a model waiting only for missing files, without them: the new record, or undefined
    // after saying why graphty-element refused (a part it cannot be drawn without).
    const acceptOf = async (member: Member): Promise<AssetRecord | undefined> => {
        const { record } = member.held;
        if (record.state === "accepted") {
            return record;
        }
        try {
            // By its address while it downloads, so graphty-element stops its pictures first.
            const after = await session.assets.accept(refOf(member.held), { without: "missing" });
            moved(record, after);
            return after;
        } catch (error) {
            const fact = failureOf(error);
            setProblem(fact);
            say(refusalLine(fact));
            return undefined;
        }
    };
    // Accepts every model Add takes, or none: undefined after saying why one was refused.
    const acceptAll = async (): Promise<{ member: Member; record: AssetRecord; ref: string }[] | undefined> => {
        adding.current = true;
        // What Add takes is the project's from now: a load settling meanwhile (its pictures
        // stopped by accept) must not let it go.
        const taken = taking.map((m) => refOf(m.held));
        for (const ref of taken) {
            added.current.delete(ref);
        }
        const ready: { member: Member; record: AssetRecord; ref: string }[] = [];
        for (const member of taking) {
            const record = await acceptOf(member);
            if (record === undefined) {
                adding.current = false;
                for (const ref of taken) {
                    added.current.add(ref);
                }
                return undefined;
            }
            ready.push({ member, record, ref: member.held.url ?? record.id });
        }
        return ready;
    };
    const add = async (): Promise<void> => {
        // Every way to Add (click, Enter or Space on the button, Enter in Name) stops here when blocked.
        // A second click while the first is still taking the models (a double click) adds nothing more.
        if (blocked !== null || taking.length === 0 || adding.current) {
            return;
        }
        const ready = await acceptAll();
        if (ready === undefined) {
            return;
        }
        for (const { member, record } of ready) {
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
        // What Add took is the project's now: nothing the dialog does later lets go of it.
        for (const { member, ref } of ready) {
            added.current.delete(ref);
            added.current.delete(refOf(member.held));
        }
        const patches = ready.flatMap(({ member, record, ref }) => {
            const patch = defaultsPatch(session, member, record);
            return patch === undefined ? [] : [{ ref, patch }];
        });
        const saveDefaults =
            patches.length === 0
                ? undefined
                : async (tx: TransactionScope): Promise<void> => {
                      for (const { ref, patch } of patches) {
                          await tx.assets.setDefaults(ref, patch);
                      }
                  };
        // A layer takes the model shown when it is checked, else the first checked.
        const shown = ready.find((r) => r.member === current) ?? ready[0];
        onAdd(
            shown.ref,
            draft,
            ready.map((r) => r.ref),
            saveDefaults,
        );
    };
    const parts = held?.record.parts ?? [];
    const unusedParts = parts.filter((p) => p.state === "unused");
    const unused = unusedParts.map((p) => p.name);
    const unusedFiles = new Set(unused.map((n) => n.split("/").pop()));
    const facts = new Map(waitingFor.map((fact) => [String(fact.params.name ?? ""), fact]));
    // Files lists what the model was loaded from, a single file too: the loading column holds what
    // was loaded down to the footer, as Details does beside it.
    const showFiles = held !== null;
    // The parts that need an answer come first, so the list's scroll never hides them.
    const listed = [...parts.filter((p) => facts.has(p.name)), ...parts.filter((p) => !facts.has(p.name))];
    // A model waiting for pictures or materials is read as it is drawn meanwhile: set up before Add.
    const summary = held === null ? undefined : summaryOf(session, held.record.id);
    const clips = summary?.animations ?? [];
    // One chip per word: a model over the budget and heavy for its nodes is "Heavy" once.
    const detailChips = [
        ...new Map(
            DETAIL_CHIP_CODES.flatMap((code) => held?.record.problems.filter((p) => p.code === code) ?? [])
                .map((p) =>
                    // The dialog plays the first clip, and Model settings chooses another: say so.
                    p.code === "W_MODEL_HAS_ANIMATIONS"
                        ? { ...modelChip(p), tip: CUSTOM_MODEL.animatedTip }
                        : modelChip(p),
                )
                .map((chip) => [chip.word, chip]),
        ).values(),
    ];
    // Pictures not in yet: Details gives no size for them.
    const missingPictures = (held?.record.problems ?? []).filter(
        (p) =>
            p.code === "E_MODEL_MISSING_FILE" &&
            (held?.record.parts ?? []).some((part) => part.name === p.params.name && part.role === "texture"),
    );
    const picturesWaiting = {
        count: missingPictures.length,
        downloading: missingPictures.some((p) => p.params.downloading === true),
        skipped: (held?.record.parts ?? []).filter((part) => part.role === "texture" && part.state === "skipped")
            .length,
    };
    const ignored = (held?.record.problems ?? [])
        .filter((p) => p.code === "W_MODEL_EXTENSION_IGNORED")
        .map((p) => String(p.params.extension));
    // A model's own setting goes to the model shown; Light, Wireframe and Picture to the layer's draft.
    const write = (channel: Channel, value: ChannelValue): void => {
        if (isModelChannel(channel)) {
            change((member) => ({ ...member, settings: { ...settingsOf(session, member), [channel]: value } }));
        } else {
            setDraft((now) => ({ ...now, [channel]: value }));
        }
    };
    const unset = (channel: Channel): void => {
        const drop = (now: ModelDraft): ModelDraft =>
            Object.fromEntries(Object.entries(now).filter(([c]) => c !== channel));
        if (isModelChannel(channel)) {
            change((member) => ({ ...member, settings: drop(settingsOf(session, member)) }));
        } else {
            setDraft(drop);
        }
    };
    const hide = (next: readonly string[]): void => {
        change((member) => ({ ...member, hidden: next }));
    };
    // The model's own settings a layer opening the dialog sets itself: its value wins on the graph.
    const layerOwn = MODEL_SETTING_ROWS.filter(
        (row) => isModelChannel(row.channel) && baseStyle?.[row.channel] !== undefined,
    )
        .map((row) => row.word)
        .join(", ");
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
        asked.current.clear();
        replaced.current.clear();
        setMembers([]);
        setIndex(0);
        setDraft({});
        setProblem(null);
        setTried(null);
        setPicture(null);
        setRefused([]);
        setStopped(null);
        setAddress("");
        setSettingsOpen(false);
        say(CUSTOM_MODEL.removed(heldFile));
    };

    const fileSource = (
        <FileSource
            submitOnBlur
            barUnderField
            variant="row"
            autoFocus={empty}
            progress={shownLoad?.progress}
            status={shownLoad?.status}
            onCancel={loading === null ? undefined : cancelLoad}
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
            folderTip={CUSTOM_MODEL.folderTip}
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

    // Name, under the model it names, with the model's settings behind its gear: always in reach.
    const nameRow =
        held === null || busy ? null : (
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
                                    void add();
                                }
                            }}
                        />
                    </div>
                    <span className="ws-slot">
                        {summary === undefined ? null : (
                            <Tooltip label={CUSTOM_MODEL.settings}>
                                <ActionIcon
                                    variant={settingsOpen ? "light" : "subtle"}
                                    size="sm"
                                    aria-label={CUSTOM_MODEL.settings}
                                    aria-haspopup="dialog"
                                    aria-expanded={settingsOpen}
                                    onClick={() => {
                                        const column = body?.querySelector(".ws-model-main");
                                        setSettingsOver(column?.getBoundingClientRect() ?? null);
                                        setSettingsOpen(true);
                                    }}
                                >
                                    <GLYPHS.settings size={14} aria-hidden />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </span>
                </div>
            </div>
        );

    // Files: under the file, in the loading column, a list that takes the column's height left and
    // scrolls past it.
    const filesBox =
        held === null || !showFiles || busy ? null : (
            <Stack gap={4} className="ws-model-files-box">
                <Text size="sm" id={`${uid}-files`}>
                    {CUSTOM_MODEL.files}
                </Text>
                <section
                    className="ws-model-files ws-model-scroll"
                    data-testid="model-files"
                    aria-labelledby={`${uid}-files`}
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling box must take focus so the keyboard can scroll it
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
                            if (fact?.params.downloading === true) {
                                // Its x stops that download: the model then asks for the picture.
                                return (
                                    <PartLine
                                        key={part.name}
                                        part={part}
                                        downloading
                                        onDrop={() => {
                                            dropPart(part.name);
                                        }}
                                    />
                                );
                            }
                            return fact === undefined ? (
                                <PartLine
                                    key={part.name}
                                    part={part}
                                    onDrop={
                                        part.role === "model" || part.state === "skipped"
                                            ? undefined
                                            : () => {
                                                  dropPart(part.name);
                                              }
                                    }
                                />
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
        );

    // A set's models, each by its file: checked for Add, the one shown marked, and an x that takes it
    // out of the set. The arrows under the preview step through the same models.
    const dropMember = (at: number): void => {
        const member = members.at(at);
        if (member === undefined) {
            return;
        }
        if (members.length === 1) {
            clear();
            return;
        }
        letGo(refOf(member.held));
        setMembers((now) => now.filter((_, i) => i !== at));
        setIndex((now) => (at < now || now === members.length - 1 ? Math.max(0, now - 1) : now));
        setSettingsOpen(false);
        say(CUSTOM_MODEL.removed(member.name));
    };
    const setBox =
        !many || busy ? null : (
            <Stack gap={4}>
                <Text size="sm" id={`${uid}-set`}>
                    {CUSTOM_MODEL.setModels}
                </Text>
                <section
                    className="ws-model-scroll"
                    data-testid="model-set"
                    aria-labelledby={`${uid}-set`}
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling box must take focus so the keyboard can scroll it
                    tabIndex={0} // NOSONAR(S6845): a scrolling list takes focus so the keyboard scrolls it (WCAG 2.1.1)
                >
                    <Stack gap={6}>
                        {members.map((member, at) => {
                            const file = member.held.record.path ?? member.held.url?.split("/").pop() ?? member.name;
                            return (
                                <Group
                                    key={member.held.record.id}
                                    gap={4}
                                    wrap="nowrap"
                                    justify="space-between"
                                    aria-current={at === index || undefined}
                                >
                                    <Checkbox
                                        size="xs"
                                        label={middleCut(file, 40)}
                                        aria-label={CUSTOM_MODEL.loadFile(file)}
                                        title={file}
                                        checked={member.load}
                                        fw={at === index ? 600 : undefined}
                                        onChange={(event) => {
                                            const load = event.currentTarget.checked;
                                            setMembers((now) => now.map((m, i) => (i === at ? { ...m, load } : m)));
                                        }}
                                    />
                                    <Tooltip label={CUSTOM_MODEL.remove(file)}>
                                        <ActionIcon
                                            variant="subtle"
                                            size="sm"
                                            aria-label={CUSTOM_MODEL.remove(file)}
                                            onClick={() => {
                                                dropMember(at);
                                            }}
                                        >
                                            <GLYPHS.close size={14} aria-hidden />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            );
                        })}
                    </Stack>
                </section>
            </Stack>
        );

    // The file and any line about it: across the column's whole width.
    const top = (
        <Stack gap="sm" className="ws-model-top">
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
            {current?.held.again === undefined || busy ? null : (
                <Text size="xs" c="var(--cm-text-secondary)" data-testid="model-again">
                    {CUSTOM_MODEL.again(current.held.again)}
                </Text>
            )}
            {stopped === null || busy ? null : (
                <Text size="xs" c="var(--cm-text-secondary)" data-testid="model-stopped">
                    {stopped}
                </Text>
            )}
            {busy
                ? null
                : refused.map((r) => (
                      <Text key={r.name} size="xs" c="var(--cm-text-danger)" data-testid="model-refused">
                          {CUSTOM_MODEL.ofSet(r.name, refusalLine(r.problem))}
                      </Text>
                  ))}
            {busy
                ? null
                : members
                      .filter((m) => m !== current && m.failure !== undefined)
                      .map((m) => (
                          <Text
                              key={m.held.record.id}
                              size="xs"
                              c="var(--cm-text-danger)"
                              data-testid="model-undrawable"
                          >
                              {CUSTOM_MODEL.ofSet(
                                  m.name,
                                  refusalLine(m.failure ?? { code: "E_MODEL_PARSE", params: {} }),
                              )}
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
        </Stack>
    );

    const settings =
        held === null || summary === undefined || !settingsOpen || busy ? null : (
            <Stack gap={6} data-testid="model-settings">
                <RotateButtons values={values} detected={detectedUp(summary)} write={write} />
                <SettingRows
                    channels={MODEL_DEFAULT_CHANNELS}
                    values={modelDraft}
                    problems={held.record.problems}
                    write={write}
                    remove={unset}
                    clips={clips}
                />
                {layerOwn === "" ? null : (
                    <Text size="xs" c="dimmed" data-testid="model-layer-own">
                        {CUSTOM_MODEL.layerOwn(layerOwn)}
                    </Text>
                )}
                <TextureRows pictures={summary?.pictures ?? []} hidden={hidden} onChange={hide} />
                {forLayer ? (
                    <Stack gap={4} data-testid="model-layer-settings">
                        <Text size="xs" c="dimmed">
                            {CUSTOM_MODEL.forThisLayer}
                        </Text>
                        <SettingRows
                            channels={LAYER_CHANNELS}
                            values={draft}
                            problems={held.record.problems}
                            write={write}
                            remove={unset}
                        />
                        <div className="ws-model-settings">
                            <PictureRow
                                value={typeof draft["node.texture"] === "string" ? draft["node.texture"] : undefined}
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
                    </Stack>
                ) : null}
            </Stack>
        );

    // The right column, what was loaded: the model, a set's arrows and Load this model under it,
    // Name with the Model settings gear, then Details, a box that scrolls on its own.
    const side = (
        <div className="ws-model-side">
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
            {nameRow}
            {summary === undefined || held === null || busy ? null : (
                <div className="ws-model-details-box">
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
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling box must take focus so the keyboard can scroll it
                        tabIndex={0} // NOSONAR(S6845): a scrolling list takes focus so the keyboard scrolls it (WCAG 2.1.1)
                    >
                        {CUSTOM_MODEL.detailRows(summary, held.record.byteLength, ignored, picturesWaiting).map(
                            (row) => (
                                <DataRow key={row.name} stat name={row.name} value={row.value} description={row.tip} />
                            ),
                        )}
                    </section>
                </div>
            )}
        </div>
    );

    return (
        <Modal
            opened
            onClose={cancel}
            // Mantine's modal sees Escape before anything inside it: the Picture pop-over and Model
            // settings close alone.
            closeOnEscape={!pictureOpen && !settingsOpen}
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
                <Stack gap="sm" className="ws-model-main">
                    {top}
                    {setBox}
                    {filesBox}
                </Stack>
                {side}
                <Modal
                    opened={settings !== null}
                    onClose={() => {
                        setSettingsOpen(false);
                    }}
                    closeOnEscape={!pictureOpen}
                    title={CUSTOM_MODEL.settings}
                    closeButtonProps={{ "aria-label": CUSTOM_MODEL.closeSettings }}
                    // Clear, so the model beside it is seen as each setting changes it.
                    overlayProps={{ backgroundOpacity: 0 }}
                    styles={
                        settingsOver === null
                            ? undefined
                            : {
                                  inner: {
                                      justifyContent: "flex-start",
                                      alignItems: "flex-start",
                                      padding: `${settingsOver.top}px 0 0 ${settingsOver.left}px`,
                                  },
                                  content: { flex: `0 0 ${settingsOver.width}px`, maxHeight: settingsOver.height },
                              }
                    }
                >
                    {settings}
                </Modal>
                <ModalFooter className="ws-model-footer">
                    <Button variant="default" onClick={cancel}>
                        {CUSTOM_MODEL.cancel}
                    </Button>
                    <Tooltip label={blocked ?? addWord} disabled={blocked === null}>
                        <Button
                            // A blocked Add stays focusable, with its reason as its tooltip.
                            aria-disabled={blocked !== null || undefined}
                            data-disabled={blocked !== null || undefined}
                            onClick={() => {
                                void add();
                            }}
                        >
                            {addWord}
                        </Button>
                    </Tooltip>
                </ModalFooter>
            </div>
        </Modal>
    );
}
