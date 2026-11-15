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

import { fileStem, type ModelLive, modelName, useModelPreview } from "../canvas/models";
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
 * The preview: graphty-element draws the model live in it (`modelPreview`) once it is accepted or,
 * while it waits for parts, with them stood in for; the reader turns it by dragging or with the
 * arrow keys, and its clip plays. Over it: a spinner while it loads or draws, the cube and the
 * "N missing" chip while it waits for a part it cannot be drawn without, or the cube and the chip
 * saying why graphty-element could not draw it.
 * @param props - Component props
 * @param props.held - the model, if any
 * @param props.name - its name
 * @param props.draw - whether graphty-element drew it, or why it could not
 * @param props.busy - a source is loading
 * @param props.onHost - takes the element graphty-element draws in
 * @returns The preview box
 */
function Preview({
    held,
    name,
    draw,
    busy,
    onHost,
}: Readonly<{
    held: Held | null;
    name: string;
    draw: ModelLive;
    busy: boolean;
    onHost: (host: HTMLDivElement | null) => void;
}>): React.JSX.Element {
    const accepted = held?.record.state === "accepted";
    const missing = countChip(held?.record.problems.filter((p) => PART_CODES.has(p.code)) ?? []);
    let over: React.ReactNode;
    if (draw.drawn && !busy) {
        over = null;
    } else if (draw.failure !== undefined && !busy) {
        over = (
            <Stack gap={4} align="center">
                <GLYPHS.model size={32} aria-hidden />
                <ModelChip chip={modelChip(draw.failure)} />
            </Stack>
        );
    } else if (held === null) {
        // Blank until a model is loaded.
        over = null;
    } else if (busy || accepted || missing === undefined) {
        over = <Loader size="sm" aria-label={CUSTOM_MODEL.loading(busy ? "model" : name)} />;
    } else {
        over = (
            <Stack gap={4} align="center">
                <GLYPHS.model size={32} aria-hidden />
                <ModelChip chip={missing} />
            </Stack>
        );
    }
    return (
        <div className="ws-model-preview" data-testid="model-preview">
            {held === null || busy ? null : (
                <div ref={onHost} className="ws-model-live" aria-busy={draw.drawing || undefined} />
            )}
            {over === null ? null : <div className="ws-model-preview-over">{over}</div>}
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
    const waitingFor = held?.record.problems.filter((p) => PART_CODES.has(p.code)) ?? [];
    // Focus goes where the reader acts next: Name once a model is in, its first part while it waits.
    const heldKey = held === null ? "" : `${held.record.id} ${held.record.state}`;
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
        setName(next.record.plainName ?? modelName(session, next.url ?? next.record.id));
        // Files opens by itself only when a part needs an answer before Add can work.
        setFilesOpen(next.record.problems.some((p) => PART_CODES.has(p.code)));
    };
    // Waiting for parts: files that are not a model go to it, matched by graphty-element.
    const offer = async (waiting: Held, files: readonly File[], live: () => boolean): Promise<void> => {
        const { rest } = await session.assets.offer([...files]);
        if (!live()) {
            return;
        }
        const after = session.assets.find(waiting.url ?? waiting.record.id) ?? waiting.record;
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
            setPicture({ id: record.id, name: fileStem(record.path ?? files[0]?.name ?? "") || "picture" });
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
        if (held !== null && (held.url ?? held.record.id) !== ref) {
            letGo(held.url ?? held.record.id);
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
        const named = "name" in answer && answer.name !== undefined ? answer.name : undefined;
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

    const accepted = held?.record.state === "accepted" ? held : null;
    const ref = accepted === null ? undefined : (accepted.url ?? accepted.record.id);
    const firstMissing = waitingFor[0]?.params.name;
    let blocked: string | null = null;
    if (busy) {
        blocked = CUSTOM_MODEL.loading(loading.name);
    } else if (accepted === null) {
        blocked =
            typeof firstMissing === "string"
                ? CUSTOM_MODEL.missing(firstMissing.split("/").pop() ?? firstMissing)
                : CUSTOM_MODEL.addFirst;
    } else if (draw.failure !== undefined) {
        blocked = refusalLine(draw.failure);
    }
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
    const parts = held?.record.parts ?? [];
    const unusedParts = parts.filter((p) => p.state === "unused");
    const unused = unusedParts.map((p) => p.name);
    const unusedFiles = new Set(unused.map((n) => n.split("/").pop()));
    const facts = new Map(waitingFor.map((fact) => [String(fact.params.name ?? ""), fact]));
    // One self-contained file says nothing the preview and Name do not: no Files line.
    const showFiles = held !== null && (parts.length > 1 || waits);
    const filesNote = CUSTOM_MODEL.filesNote(quietCounts(parts));
    const summary = accepted === null ? undefined : session.assets.inspect(accepted.record.id);
    const clips = summary?.animations ?? [];
    // One chip per word: a model over the budget and heavy for its nodes is "Heavy" once.
    const detailChips = [
        ...new Map(
            DETAIL_CHIP_CODES.flatMap((code) => accepted?.record.problems.filter((p) => p.code === code) ?? [])
                .map(modelChip)
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
    const heldFile = held === null ? "" : (held.url ?? held.record.path ?? name);
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
            {held === null || busy ? null : (
                <Stack gap={4} className="ws-model-settings">
                    <div className="ws-row">
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
                                        setName(event.currentTarget.value);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && blocked === null) {
                                            event.preventDefault();
                                            add();
                                        }
                                    }}
                                />
                            </div>
                            <span className="ws-slot" />
                        </div>
                    </div>
                    {forLayer && accepted !== null ? (
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
                        </div>
                    </Collapse>
                </>
            )}
            {held === null || !showFiles || busy ? null : (
                <>
                    <Disclosure
                        word={CUSTOM_MODEL.files}
                        open={filesOpen}
                        onToggle={() => {
                            setFilesOpen(!filesOpen);
                        }}
                    >
                        {filesOpen || filesNote === "" ? null : (
                            <Text size="sm" c="dimmed" span>
                                {filesNote}
                            </Text>
                        )}
                    </Disclosure>
                    <Collapse in={filesOpen} transitionDuration={0}>
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
                                        onDiscard={() => {
                                            say("Address discarded");
                                        }}
                                    />
                                );
                            })}
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
                    </Collapse>
                </>
            )}
        </Stack>
    );

    const side = (
        <Stack gap={8} className="ws-model-side">
            <Preview held={held} name={name} draw={draw} busy={busy} onHost={setPreviewHost} />
            {summary === undefined || busy ? null : (
                <Text size="xs" c="dimmed" ta="center" data-testid="model-variant">
                    {CUSTOM_MODEL.variantLine(summary)}
                </Text>
            )}
            {held === null || busy ? null : (
                <Group gap={4} justify="center" wrap="nowrap">
                    {forLayer && accepted !== null ? (
                        <RotateButtons values={values} detected={detectedUp(summary)} write={write} />
                    ) : null}
                    {draw.drawn ? (
                        <Tooltip label={CUSTOM_MODEL.resetView}>
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                aria-label={CUSTOM_MODEL.resetView}
                                onClick={draw.resetView}
                            >
                                <GLYPHS.resetView size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    ) : null}
                </Group>
            )}
            {summary === undefined || accepted === null || busy ? null : (
                <>
                    <Disclosure
                        word={CUSTOM_MODEL.details}
                        open={detailsOpen}
                        onToggle={() => {
                            setDetailsOpen(!detailsOpen);
                        }}
                    >
                        {detailChips.map((chip) => (
                            <ModelChip key={chip.word} chip={chip} tone="warning" />
                        ))}
                    </Disclosure>
                    <Collapse in={detailsOpen} transitionDuration={0}>
                        <div data-testid="model-details" className="ws-model-details">
                            {CUSTOM_MODEL.detailRows(summary, accepted.record.byteLength, ignored).map((row) => (
                                <DataRow key={row.name} stat name={row.name} value={row.value} description={row.tip} />
                            ))}
                        </div>
                    </Collapse>
                </>
            )}
        </Stack>
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
