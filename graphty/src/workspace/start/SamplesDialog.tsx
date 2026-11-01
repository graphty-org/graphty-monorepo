import "./samples-dialog.css";

import { EntityChip, SearchInput } from "@graphty/compact-mantine";
import {
    DATASET_DESCRIPTORS,
    type DatasetMeta,
    DEFAULT_DATASET_BASE_URL,
    GENERATOR_DESCRIPTORS,
    type GeneratorDescriptor,
    sourceDescriptors,
} from "@graphty/graphty-element/catalog";
import { ActionIcon, Badge, Chip, Group, Modal, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { START_SAMPLES } from "../../data/sampleManifest";
import type { CommandContext } from "../commands/registry";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { unlessUnsaved } from "../project/actions";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useSessionVersion } from "../toolbar/useSessionVersion";
import { fitsInBrowser, isLarge, megabytes } from "./library";
import { DatasetDialog, GeneratorDialog } from "./LibraryDialogs";
import {
    addGraph,
    addSource,
    datasetBase,
    type GraphLoad,
    type Incoming,
    openProject,
    openSeparate,
    pictureOf,
} from "./open";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "./samples";

/** The id of the graph-samples source, whose samples are listed as Datasets rather than Live. */
const GRAPH_SAMPLES = "graph-samples";

/**
 * The graph-samples dataset each of the app's own four sample files is a copy of, by sample id: the
 * app's copy is listed (it carries the readable names), the dataset is not, so none is listed twice.
 */
const OWN_COPIES: Readonly<Record<string, string>> = {
    "les-miserables": "les-miserables",
    karate: "karate",
    "college-football": "football",
    florentine: "florentine-families",
};

/** Where a picked sample goes: into this project (the {@link addSource} rule), or a new project. */
type Target = "add" | "separate";

/** One row of the dialog. */
interface SampleEntry {
    readonly key: string;
    readonly name: string;
    /** The heading it is listed under. */
    readonly group: string;
    /** Who serves the data. */
    readonly provider: string;
    readonly nodes?: number;
    readonly edges?: number;
    readonly rows?: number;
    readonly bytes?: number;
    /** The picture graph-samples publishes of it, the one the start page's tile shows. */
    readonly picture?: string;
    /** What the search box matches, lowercase. */
    readonly words: string;
    /** Takes it to the target, asking first where it needs a word or parameters. */
    readonly open: (target: Target) => void;
}

/** The provider of what the app itself holds or builds: its fixture files and generated graphs. */
const OWN = "graphty";

/**
 * The host that serves a sample, as its provider: "query.wikidata.org".
 * @param url - the address it is read from.
 * @param fallback - the provider when there is no address, or it does not parse.
 * @returns the host.
 */
function hostOf(url: string | undefined, fallback: string): string {
    try {
        return url === undefined ? fallback : new URL(url).hostname.replace(/^www\./, "") || fallback;
    } catch {
        return fallback;
    }
}

/** Where graph-samples' datasets download from: graphty.app. */
const DATASET_HOST = hostOf(DEFAULT_DATASET_BASE_URL, GRAPH_SAMPLES);

/**
 * A file sample to its target: added by the {@link addSource} rule, or opened as its own project.
 * @param ctx - the command context.
 * @param incoming - the file.
 * @param target - where it goes.
 */
function bringFile(ctx: CommandContext, incoming: Incoming, target: Target): void {
    if (target === "add") {
        addSource(ctx, incoming);
        return;
    }
    unlessUnsaved(ctx, () => {
        openSeparate(ctx.workspace, incoming);
    });
}

/**
 * A whole graph to its target: added by the {@link addGraph} rule, or opened as its own project.
 * @param ctx - the command context.
 * @param name - the graph's name.
 * @param load - loads it.
 * @param target - where it goes.
 */
function bringGraph(ctx: CommandContext, name: string, load: GraphLoad, target: Target): void {
    if (target === "add") {
        addGraph(ctx, name, load);
        return;
    }
    unlessUnsaved(ctx, () => {
        openProject(ctx.workspace, name, (session) => load(session, { mode: "replace", history: "start" }));
    });
}

/**
 * Every sample, once: the prototype's fixture files by subject, the app's own graphs, the live
 * server samples,
 * graph-samples' datasets the element opens, and its generators.
 * @param ctx - the command context.
 * @param ask - shows what a large dataset takes, before it downloads.
 * @param configure - shows a generator's parameters.
 * @returns the rows, in order.
 */
function sampleEntries(
    ctx: CommandContext,
    ask: (dataset: DatasetMeta, target: Target) => void,
    configure: (generator: GeneratorDescriptor, target: Target) => void,
): SampleEntry[] {
    const files = PROTOTYPE_SAMPLES.map((sample): SampleEntry => {
        const name = sampleName(sample);
        const incoming = { name, source: { config: { url: sampleUrl(sample) }, name } };
        return {
            key: sample.path,
            name,
            group: sample.group,
            provider: OWN,
            nodes: sample.nodes,
            edges: sample.edges,
            rows: sample.rows,
            words: `${name} ${sample.group} ${OWN}`.toLowerCase(),
            open: (target) => {
                bringFile(ctx, incoming, target);
            },
        };
    });
    const graphs = START_SAMPLES.map((sample): SampleEntry => {
        const copy = DATASET_DESCRIPTORS.find((dataset) => dataset.name === OWN_COPIES[sample.id]);
        const incoming = { name: sample.name, source: { config: { url: sample.url }, name: sample.name } };
        return {
            key: sample.id,
            name: sample.name,
            group: "Graphs",
            provider: OWN,
            nodes: copy?.nodes,
            edges: copy?.edges,
            picture: copy === undefined ? undefined : pictureOf(copy),
            words: `${sample.name} ${sample.sentence} ${OWN}`.toLowerCase(),
            open: (target) => {
                bringFile(ctx, incoming, target);
            },
        };
    });
    const live = sourceDescriptors()
        .filter((source) => source.id !== GRAPH_SAMPLES)
        .flatMap((source) =>
            (source.descriptor.samples ?? []).map((sample): SampleEntry => {
                const provider = hostOf(
                    sample.endpoint ?? source.descriptor.defaultEndpoint ?? undefined,
                    source.descriptor.plainName,
                );
                return {
                    key: sample.id,
                    name: sample.plainName,
                    group: "Live",
                    provider,
                    nodes: sample.counts?.nodes,
                    edges: sample.counts?.edges,
                    words: `${sample.plainName} live ${provider} ${source.descriptor.plainName}`.toLowerCase(),
                    open: (target) => {
                        bringGraph(
                            ctx,
                            sample.plainName,
                            (session, load) => session.data.loadSample(sample.id, load),
                            target,
                        );
                    },
                };
            }),
        );
    const copies = new Set(Object.values(OWN_COPIES));
    const datasets = DATASET_DESCRIPTORS.filter((dataset) => fitsInBrowser(dataset) && !copies.has(dataset.name)).map(
        (dataset): SampleEntry => ({
            key: dataset.name,
            name: dataset.title,
            group: "Datasets",
            provider: DATASET_HOST,
            nodes: dataset.nodes,
            edges: dataset.edges,
            // The download is named only where it is worth a word: a large dataset.
            bytes: isLarge(dataset) ? dataset.bytes : undefined,
            picture: pictureOf(dataset),
            words: `${dataset.title} ${dataset.name} ${DATASET_HOST} ${dataset.description}`.toLowerCase(),
            open: (target) => {
                if (isLarge(dataset)) {
                    ask(dataset, target);
                } else {
                    bringDataset(ctx, dataset, target);
                }
            },
        }),
    );
    const generated = GENERATOR_DESCRIPTORS.map((generator): SampleEntry => ({
        key: `generate-${generator.name}`,
        name: generator.plainName,
        group: "Generated",
        provider: OWN,
        picture: pictureOf(generator),
        words: `${generator.plainName} ${generator.name} generated ${generator.description}`.toLowerCase(),
        open: (target) => {
            configure(generator, target);
        },
    }));
    return [...files, ...graphs, ...live, ...datasets, ...generated];
}

/**
 * A dataset to its target, downloaded by graphty-element.
 * @param ctx - the command context.
 * @param dataset - the dataset.
 * @param target - where it goes.
 */
function bringDataset(ctx: CommandContext, dataset: DatasetMeta, target: Target): void {
    bringGraph(
        ctx,
        dataset.title,
        (session, load) => session.data.loadDataset(dataset.name, { ...datasetBase(), ...load }),
        target,
    );
}

/**
 * One tile: the picture the start page shows of it (or a plain stand-in), the name, and its size
 * as chips; while the project holds data, Open as a separate graph in its corner.
 * @param props - the tile
 * @param props.entry - the sample
 * @param props.separable - whether to offer Open as a separate graph
 * @returns the tile
 */
function SampleTile({ entry, separable }: Readonly<{ entry: SampleEntry; separable: boolean }>): React.JSX.Element {
    const counted = entry.nodes !== undefined || entry.edges !== undefined;
    return (
        <div className="ws-samples-tile">
            <UnstyledButton
                className="ws-samples-open"
                title={entry.provider}
                onClick={() => {
                    entry.open("add");
                }}
            >
                <span className="ws-samples-name">{entry.name}</span>
                {entry.picture === undefined ? (
                    <span className="ws-samples-pic ws-samples-none" aria-hidden>
                        {entry.rows === undefined ? <GLYPHS.noPicture /> : <GLYPHS.tableFile />}
                    </span>
                ) : (
                    <img className="ws-samples-pic" src={entry.picture} alt="" loading="lazy" />
                )}
                <Group gap={4} wrap="nowrap" className="ws-samples-size">
                    {entry.nodes === undefined ? null : (
                        <EntityChip kind="node">{formatNumber(entry.nodes)}</EntityChip>
                    )}
                    {entry.edges === undefined ? null : (
                        <EntityChip kind="edge">{formatNumber(entry.edges)}</EntityChip>
                    )}
                    {!counted && entry.rows !== undefined ? (
                        <Badge size="xs" variant="light" color="gray" tt="none">
                            {formatNumber(entry.rows)} rows
                        </Badge>
                    ) : null}
                    {entry.bytes === undefined ? null : (
                        <Badge size="xs" variant="light" color="gray" tt="none">
                            {megabytes(entry.bytes)}
                        </Badge>
                    )}
                </Group>
            </UnstyledButton>
            {separable ? (
                <Tooltip label={`Open ${entry.name} as a separate graph`}>
                    <ActionIcon
                        className="ws-samples-separate"
                        variant="default"
                        size="sm"
                        aria-label={`Open ${entry.name} as a separate graph`}
                        onClick={() => {
                            entry.open("separate");
                        }}
                    >
                        <GLYPHS.openExternal size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            ) : null}
        </div>
    );
}

/**
 * Samples..., from Sources "+": the prototype's fixture files by subject, the app's own graphs, the
 * live server samples, graph-samples' datasets and its generators, as tiles with the start page's
 * pictures and their sizes as chips, narrowed by a search box and a group filter. Every sample
 * goes into the project the way a dropped file does (addSource); while the project holds data,
 * each tile also offers Open as a separate graph.
 * @returns the dialog, open while the workspace dialog is "samples"
 */
export function SamplesDialog(): React.JSX.Element {
    const ctx = useWorkspace();
    useSessionVersion(ctx.session);
    const opened = useWorkspaceState((state) => state.dialog === "samples");
    const [text, setText] = useState("");
    const [group, setGroup] = useState("");
    const [asking, setAsking] = useState<{ dataset: DatasetMeta; target: Target } | null>(null);
    const [configuring, setConfiguring] = useState<{ generator: GeneratorDescriptor; target: Target } | null>(null);
    const close = (): void => {
        ctx.store.set({ dialog: null });
    };
    const entries = sampleEntries(
        ctx,
        (dataset, target) => {
            setAsking({ dataset, target });
        },
        (generator, target) => {
            setConfiguring({ generator, target });
        },
    );
    const query = text.trim().toLowerCase();
    const allGroups = [...new Set(entries.map((entry) => entry.group))];
    const shown = entries.filter(
        (entry) => (group === "" || entry.group === group) && (query === "" || entry.words.includes(query)),
    );
    const groups = [...new Set(shown.map((entry) => entry.group))];
    const separable = ctx.session !== null && ctx.session.data.sources().length > 0;
    return (
        <>
            <Modal
                opened={opened}
                onClose={close}
                onExitTransitionEnd={() => {
                    setText("");
                    setGroup("");
                }}
                title="Samples"
                size={720}
            >
                <Stack gap="sm">
                    <SearchInput aria-label="Search samples" placeholder="Search" value={text} onChange={setText} />
                    <Chip.Group multiple={false} value={group} onChange={setGroup}>
                        <Group gap={4} role="radiogroup" aria-label="Group">
                            {["", ...allGroups].map((each) => (
                                <Chip key={each} value={each} size="xs" variant="light">
                                    {each === "" ? "All" : each}
                                </Chip>
                            ))}
                        </Group>
                    </Chip.Group>
                    {groups.map((each) => (
                        <section key={each} aria-label={each}>
                            <Text size="xs" fw={600} c="dimmed" mb={4}>
                                {each}
                            </Text>
                            <div className="ws-samples-grid">
                                {shown
                                    .filter((entry) => entry.group === each)
                                    .map((entry) => (
                                        <SampleTile
                                            key={entry.key}
                                            separable={separable}
                                            entry={{
                                                ...entry,
                                                open: (target) => {
                                                    close();
                                                    entry.open(target);
                                                },
                                            }}
                                        />
                                    ))}
                            </div>
                        </section>
                    ))}
                    {shown.length === 0 ? (
                        <Text size="sm" c="dimmed">
                            No matches
                        </Text>
                    ) : null}
                </Stack>
            </Modal>
            <DatasetDialog
                dataset={asking?.dataset ?? null}
                onClose={() => {
                    setAsking(null);
                }}
                onOpen={(dataset) => {
                    const target = asking?.target ?? "add";
                    setAsking(null);
                    bringDataset(ctx, dataset, target);
                }}
            />
            <GeneratorDialog
                generator={configuring?.generator ?? null}
                onClose={() => {
                    setConfiguring(null);
                }}
                onGenerate={(generator, params) => {
                    const target = configuring?.target ?? "add";
                    setConfiguring(null);
                    bringGraph(
                        ctx,
                        generator.plainName,
                        (session, load) => session.data.generate(generator.name, params, load),
                        target,
                    );
                }}
            />
        </>
    );
}
