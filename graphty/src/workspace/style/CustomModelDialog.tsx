import { ModalFooter } from "@graphty/compact-mantine";
import { assetFileExtensions, detectModelFormat } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import type { AssetRecord, AssetSource, CodedFact, ModelPart, PartAnswer } from "@graphty/graphty-element/session";
import {
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
import React, { useEffect, useRef, useState } from "react";

import { filesOf, fileStem, modelName, readDrop, useDropOver, useModelPicture } from "../canvas/models";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { FactChip, ModelChip } from "./ModelChip";
import { SettingRows } from "./ModelSettings";
import { AddressForm, FileInput } from "./ModelsPopover";
import { chipLine, countChip, middleCut, PART_CODES, partChip, roleWord } from "./modelWords";
import { PartRow, RoleGlyph } from "./PartsPopover";
import { useStillOpen } from "./useStillOpen";
import { CUSTOM_MODEL } from "./words";

/** What the choosers and the drop zone take, as graphty-element lists it. */
const MODEL_EXTENSIONS = assetFileExtensions("model");

/** The model formats graphty-element draws, as graphty-element tells them: for the drop hint. */
const MODEL_FORMATS = MODEL_EXTENSIONS.filter(
    (ext) => ext !== ".zip" && detectModelFormat({ filename: `model${ext}` })?.supported === true,
);

/** The preview's side, in CSS pixels. */
const PREVIEW_PX = 160;

/** Advanced's settings, with a layer to write them to. */
const ADVANCED_CHANNELS: readonly Channel[] = [
    "node.modelSourceUp",
    "node.modelTurn",
    "node.modelFit",
    "node.modelCenter",
];

/** Color, the one setting outside Advanced. */
const COLOR_CHANNELS: readonly Channel[] = ["node.modelTint"];

/** Address refusals: the field says what to do next. */
const ADDRESS_CODES: ReadonlySet<string> = new Set(["E_MODEL_FETCH", "E_MODEL_URL_BLOCKED", "E_MODEL_WEB_PAGE"]);

/** Format refusals: the line says which formats would do. */
const FORMAT_CODES: ReadonlySet<string> = new Set(["E_MODEL_FORMAT_UNKNOWN", "E_MODEL_FORMAT_UNSUPPORTED"]);

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

/** Props for CustomModelDialog. */
export interface CustomModelDialogProps {
    /** Whether a layer takes the model: Color, Up, Turn, Fit, Center and Use as picture are offered. */
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
 * The files a chooser gave, by folder path when a folder was chosen, as `session.assets.add` takes them.
 * @param files - the chosen files.
 * @returns the source.
 */
function chosenSource(files: readonly File[]): AssetSource {
    return files.some((f) => f.webkitRelativePath !== "")
        ? { files: new Map(files.map((f) => [f.webkitRelativePath || f.name, f])) }
        : [...files];
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
        <Group gap={6} wrap="nowrap">
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
 * The preview: a spinner while loading, the model drawn by graphty-element once it is accepted, or
 * the cube and the "N missing" chip while it waits for parts.
 * @param props - Component props
 * @param props.held - the model, if any
 * @param props.name - its name
 * @param props.style - the style values it is drawn with
 * @param props.busy - a source is loading
 * @returns The preview box
 */
function Preview({
    held,
    name,
    style,
    busy,
}: Readonly<{ held: Held | null; name: string; style: ModelDraft; busy: boolean }>): React.JSX.Element {
    const accepted = held?.record.state === "accepted";
    const ref = accepted ? (held.url ?? held.record.id) : undefined;
    const picture = useModelPicture(ref, PREVIEW_PX, style);
    const missing = countChip(held?.record.problems.filter((p) => PART_CODES.has(p.code)) ?? []);
    let content: React.ReactNode;
    if (picture !== undefined && !busy) {
        content = <img src={picture} alt={CUSTOM_MODEL.preview(name)} width={PREVIEW_PX} height={PREVIEW_PX} />;
    } else if (busy || accepted) {
        content = <Loader size="sm" aria-label={CUSTOM_MODEL.loading(held === null ? "model" : name)} />;
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
 * The Load custom model dialog (node-models design 14): a model's address, its files or folder, or
 * a drop; its preview drawn by graphty-element; its name; how its files matched, with the missing
 * ones answered by another file of the set ("Use file"), a file, an address or leaving them out;
 * and Color, then Up, Turn, Fit, Center and its details under Advanced. Settings are a draft until
 * Add. One model per dialog: files that are not a model, arriving while it waits, go to it; a
 * model, a folder holding one or a .zip replaces it. Once a model is held, the sources fold to one
 * line with Replace... and the body scrolls under a footer that stays. Cancel lets go of what it
 * loaded that no layer uses. Mounted only while open.
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
    const [url, setUrl] = useState("");
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<CodedFact | null>(null);
    const [tried, setTried] = useState<string | null>(null);
    const [picture, setPicture] = useState<Arrived | null>(null);
    const [held, setHeld] = useState<Held | null>(null);
    const [name, setName] = useState("");
    const [draft, setDraft] = useState<ModelDraft>({});
    const [filesOpen, setFilesOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [replacing, setReplacing] = useState(false);
    // What this dialog added, by what names it: let go on Cancel when no layer uses it.
    const added = useRef(new Set<string>());
    const chooser = useRef<HTMLInputElement | null>(null);
    const folder = useRef<HTMLInputElement | null>(null);
    const body = useRef<HTMLDivElement | null>(null);
    const nameField = useRef<HTMLInputElement | null>(null);
    const drop = useDropOver();
    const start = useStillOpen(true);
    const waitingFor = held?.record.problems.filter((p) => PART_CODES.has(p.code)) ?? [];
    // Focus goes where the reader acts next: Name once a model is in, its first part while it waits.
    const heldKey = held === null ? "" : `${held.record.id} ${held.record.state}`;
    const waits = waitingFor.length > 0;
    useEffect(() => {
        if (heldKey === "") {
            return;
        }
        if (waits) {
            body.current
                ?.querySelector<HTMLElement>(".ws-part-row input:not([type=file]), .ws-part-row button")
                ?.focus();
        } else {
            nameField.current?.focus();
        }
    }, [heldKey, waits]);
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
        setReplacing(false);
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
        setReplacing(false);
        const left = new Set(rest.map((f) => f.name));
        say(files.map((f) => `${f.name} ${left.has(f.name) ? "not needed" : "added"}`).join(", "));
    };
    const settle = async (source: AssetSource, files: readonly File[], live: () => boolean): Promise<void> => {
        if (held?.record.state === "rejected" && files.length > 0 && !files.some(isModelFile)) {
            await offer(held, files, live);
            return;
        }
        const before = new Set(session.assets.list().map((r) => r.id));
        const record = await session.assets.add(source);
        const address = typeof source === "string" ? source : undefined;
        const ref = address ?? record.id;
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
        hold({ ...(address === undefined ? {} : { url: address }), record });
        say(CUSTOM_MODEL.loaded(record.plainName ?? modelName(session, ref)));
    };
    const load = (source: AssetSource, files: readonly File[]): void => {
        setBusy(true);
        setProblem(null);
        setPicture(null);
        setTried(typeof source === "string" ? source : null);
        const live = start();
        settle(source, files, live)
            .catch((error: unknown) => {
                if (live()) {
                    setProblem({ code: "E_MODEL_PARSE", params: { message: String(error) } });
                }
            })
            .finally(() => {
                if (live()) {
                    setBusy(false);
                }
            });
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
    if (accepted === null) {
        blocked =
            typeof firstMissing === "string"
                ? CUSTOM_MODEL.missing(firstMissing.split("/").pop() ?? firstMissing)
                : CUSTOM_MODEL.addFirst;
    }
    const addWord = forLayer ? CUSTOM_MODEL.add : CUSTOM_MODEL.addToProject;
    const add = (): void => {
        if (ref === undefined || accepted === null) {
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
    const guessed = held?.record.problems.find((p) => p.code === "W_MODEL_UP_GUESSED");
    const summary = accepted === null ? undefined : session.assets.inspect(accepted.record.id);
    const write = (channel: Channel, value: ChannelValue): void => {
        setDraft((now) => ({ ...now, [channel]: value }));
    };
    const unset = (channel: Channel): void => {
        setDraft((now) => Object.fromEntries(Object.entries(now).filter(([c]) => c !== channel)));
    };
    const addressProblem = problem !== null && ADDRESS_CODES.has(problem.code) ? problem : null;
    const fileProblem = problem !== null && addressProblem === null ? problem : null;
    const sourcesOpen = held === null || replacing;
    const heldFile = held === null ? "" : (held.url ?? held.record.path ?? name);

    return (
        <Modal
            opened
            onClose={cancel}
            title={CUSTOM_MODEL.title}
            size="md"
            // A loaded model is not lost to a stray click beside the dialog.
            closeOnClickOutside={held === null}
            overlayProps={{ backgroundOpacity: 0.45 }}
        >
            <ScrollArea.Autosize mah="calc(90dvh - 140px)" type="auto" scrollbars="y" offsetScrollbars="y">
                <Stack
                    ref={body}
                    gap="sm"
                    className="ws-custom-model"
                    data-testid="custom-model"
                    {...drop.handlers}
                    onDrop={(event) => {
                        drop.handlers.onDrop?.(event);
                        event.preventDefault();
                        // Read during the drop: the browser empties the transfer after.
                        void readDrop(event.dataTransfer).then((read) => {
                            load(read.source, filesOf(read.source));
                        });
                    }}
                >
                    {sourcesOpen ? (
                        <>
                            <AddressForm
                                name={CUSTOM_MODEL.address}
                                submitName={CUSTOM_MODEL.load}
                                value={url}
                                busy={busy}
                                autofocus
                                error={addressProblem === null ? undefined : refusalLine(addressProblem)}
                                onChange={setUrl}
                                onDiscard={() => {
                                    say("Address discarded");
                                }}
                                onSubmit={() => {
                                    if (url.trim() !== "" && !busy) {
                                        load(url.trim(), []);
                                    }
                                }}
                            />
                            {addressProblem === null ? null : (
                                <AddressActions
                                    problem={addressProblem}
                                    onRetry={() => {
                                        if (tried !== null) {
                                            load(tried, []);
                                        }
                                    }}
                                    onUseAddress={(suggested) => {
                                        setUrl(suggested);
                                        setProblem(null);
                                    }}
                                />
                            )}
                            <div className="ws-model-drop" data-testid="model-drop" data-over={drop.over || undefined}>
                                <Group gap={4}>
                                    <Button
                                        size="compact-xs"
                                        variant="default"
                                        leftSection={<GLYPHS.upload size={12} aria-hidden />}
                                        aria-disabled={busy || undefined}
                                        data-disabled={busy || undefined}
                                        onClick={() => {
                                            if (!busy) {
                                                chooser.current?.click();
                                            }
                                        }}
                                    >
                                        {CUSTOM_MODEL.chooseFiles}
                                    </Button>
                                    <Button
                                        size="compact-xs"
                                        variant="default"
                                        leftSection={<GLYPHS.folder size={12} aria-hidden />}
                                        aria-disabled={busy || undefined}
                                        data-disabled={busy || undefined}
                                        onClick={() => {
                                            if (!busy) {
                                                folder.current?.click();
                                            }
                                        }}
                                    >
                                        {CUSTOM_MODEL.chooseFolder}
                                    </Button>
                                </Group>
                                <Text size="xs" c="var(--cm-text-secondary)">
                                    {CUSTOM_MODEL.dropHint(MODEL_FORMATS)}
                                </Text>
                            </div>
                        </>
                    ) : (
                        <Group gap={4} wrap="nowrap" data-testid="model-source">
                            <GLYPHS.model size={14} aria-hidden />
                            <Text size="xs" flex={1} miw={0} truncate title={heldFile}>
                                {heldFile}
                            </Text>
                            <Button
                                size="compact-xs"
                                variant="default"
                                onClick={() => {
                                    setReplacing(true);
                                }}
                            >
                                {CUSTOM_MODEL.replace}
                            </Button>
                        </Group>
                    )}
                    <FileInput
                        chooser={chooser}
                        accept={MODEL_EXTENSIONS.join(",")}
                        multiple
                        onFiles={(files) => {
                            load(chosenSource(files), files);
                        }}
                    />
                    <FileInput
                        chooser={folder}
                        folder
                        onFiles={(files) => {
                            load(chosenSource(files), files);
                        }}
                    />
                    {fileProblem === null ? null : <Refusal problem={fileProblem} />}
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
                    {held === null && !busy ? null : (
                        <Group gap="sm" align="flex-start" wrap="nowrap">
                            <Preview held={held} name={name} style={{ ...baseStyle, ...draft }} busy={busy} />
                            {held === null ? null : (
                                <Stack gap={4} flex={1} miw={0} className="ws-model-settings">
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
                                    {forLayer ? (
                                        <SettingRows
                                            channels={COLOR_CHANNELS}
                                            values={draft}
                                            problems={held.record.problems}
                                            write={write}
                                            remove={unset}
                                        />
                                    ) : null}
                                </Stack>
                            )}
                        </Group>
                    )}
                    {held === null || !showFiles ? null : (
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
                    {accepted === null ? null : (
                        <>
                            <Disclosure
                                word={CUSTOM_MODEL.advanced}
                                open={advancedOpen}
                                onToggle={() => {
                                    setAdvancedOpen(!advancedOpen);
                                }}
                            >
                                {guessed === undefined ? null : (
                                    <ModelChip
                                        chip={{ word: "Guessed", tip: "up axis guessed from the file" }}
                                        tone="warning"
                                    />
                                )}
                            </Disclosure>
                            <Collapse in={advancedOpen}>
                                <Stack gap={4} data-testid="model-advanced">
                                    {forLayer ? (
                                        <SettingRows
                                            channels={ADVANCED_CHANNELS}
                                            values={draft}
                                            problems={accepted.record.problems}
                                            write={write}
                                            remove={unset}
                                        />
                                    ) : null}
                                    {summary === undefined ? null : (
                                        <Text size="xs" c="var(--cm-text-secondary)" data-testid="model-details">
                                            {`${CUSTOM_MODEL.details}: ${CUSTOM_MODEL.detailLine(summary)}`}
                                        </Text>
                                    )}
                                </Stack>
                            </Collapse>
                        </>
                    )}
                </Stack>
            </ScrollArea.Autosize>
            <ModalFooter mt="md">
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
        </Modal>
    );
}
