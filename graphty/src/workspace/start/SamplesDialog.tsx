import { SearchInput } from "@graphty/compact-mantine";
import type { DatasetMeta, GeneratorDescriptor } from "@graphty/graphty-element/catalog";
import { ActionIcon, Chip, Group, Modal, Stack, Text, Tooltip } from "@mantine/core";
import React, { useState, useSyncExternalStore } from "react";

import { onSiteConfig, siteTimeline } from "../../siteConfig";
import type { CommandContext } from "../commands/registry";
import { GLYPHS } from "../glyphs";
import { unlessUnsaved } from "../project/actions";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useSessionVersion } from "../toolbar/useSessionVersion";
import { countWords, isLarge } from "./library";
import { DatasetDialog, GeneratorDialog } from "./LibraryDialogs";
import { addGraph, addSource, datasetBase, type GraphLoad, type Incoming, openProject, openSeparate } from "./open";
import { SampleCard } from "./SampleCard";
import { type LibraryTile, offeredTiles, type SampleCardData } from "./sampleLibrary";
import { JOIN_WALKS, PROTOTYPE_SAMPLES, type PrototypeSample, sampleName, sampleUrl } from "./samples";

/** Where a picked sample goes: into this project (the {@link addSource} rule), or a new project. */
type Target = "add" | "separate";

/** One card of the dialog. */
interface SampleEntry {
    readonly key: string;
    /** The heading it is listed under. */
    readonly group: string;
    readonly card: SampleCardData;
    /** What the search box matches, lowercase. */
    readonly words: string;
    /** Takes it to the target, asking first where it needs a word or parameters. */
    readonly open: (target: Target) => void;
}

/** What the dialog asks before a sample goes in. */
interface Asks {
    /** Shows what a large dataset takes, before it downloads. */
    readonly ask: (dataset: DatasetMeta, target: Target) => void;
    /** Shows a generator's parameters. */
    readonly configure: (generator: GeneratorDescriptor, target: Target) => void;
}

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
 * A fixture file's size: "60 nodes, 120 edges" where it draws them alone, else "120 rows".
 * @param sample - the fixture.
 * @returns the words.
 */
function fileSize(sample: PrototypeSample): string {
    const counts = [
        sample.nodes === undefined ? undefined : `${countWords(sample.nodes)} nodes`,
        sample.edges === undefined ? undefined : `${countWords(sample.edges)} edges`,
    ].filter((each) => each !== undefined);
    return counts.length === 0 ? `${countWords(sample.rows)} rows` : counts.join(", ");
}

/**
 * One of the start page's library tiles as a card of the dialog, under Samples or Generated.
 * @param ctx - the command context.
 * @param tile - the tile.
 * @param asks - what the dialog asks first.
 * @param asks.ask - shows what a large dataset takes.
 * @param asks.configure - shows a generator's parameters.
 * @returns the card.
 */
function libraryEntry(ctx: CommandContext, tile: LibraryTile, { ask, configure }: Asks): SampleEntry {
    const { source } = tile;
    const open = (target: Target): void => {
        if (source.kind === "sample") {
            const { name, url } = source.sample;
            bringFile(ctx, { name, source: { config: { url }, name }, origin: "sample" }, target);
        } else if (source.kind === "generator") {
            configure(source.generator, target);
        } else if (isLarge(source.dataset)) {
            ask(source.dataset, target);
        } else {
            bringDataset(ctx, source.dataset, target);
        }
    };
    // As the start page splits them: the samples, then the generators.
    const group = source.kind === "generator" ? "Generated" : "Samples";
    return { key: tile.id, group, card: tile, words: tile.words, open };
}

/**
 * Every sample, once: the data prototype's fixture files by subject, then the start page's whole
 * library in its order (the app's own graphs, graph-samples' datasets the element opens, and its
 * generators). A network server's examples are not samples: they are offered only by the network
 * data form.
 * @param ctx - the command context.
 * @param timeline - whether the timeline experiment is on.
 * @param asks - what the dialog asks first.
 * @returns the cards, in order.
 */
function sampleEntries(ctx: CommandContext, timeline: boolean, asks: Asks): SampleEntry[] {
    const fileEntry = (sample: PrototypeSample, group: string, hook: string, field: string): SampleEntry => {
        const name = sampleName(sample);
        const incoming: Incoming = { name, source: { config: { url: sampleUrl(sample) }, name }, origin: "sample" };
        return {
            key: `${group}:${hook}:${sample.path}`,
            group,
            card: {
                name,
                hook,
                field,
                size: fileSize(sample),
                sentence: name,
                picture: () => undefined,
                note: undefined,
            },
            words: `${name} ${group} ${hook}`.toLowerCase(),
            open: (target) => {
                bringFile(ctx, incoming, target);
            },
        };
    };
    const files = PROTOTYPE_SAMPLES.map((sample) => fileEntry(sample, sample.group, sampleName(sample), sample.group));
    const joins = JOIN_WALKS.flatMap((walk) =>
        walk.files.flatMap((path, at) => {
            const sample = PROTOTYPE_SAMPLES.find((each) => each.path === path);
            return sample === undefined
                ? []
                : [fileEntry(sample, "Join", `${walk.name} ${String(at + 1)} of ${String(walk.files.length)}`, "Join")];
        }),
    );
    return [...files, ...joins, ...offeredTiles(timeline).map((tile) => libraryEntry(ctx, tile, asks))];
}

/**
 * A card's name for a screen reader: the sample's name, then the card's title where it differs.
 * @param card - the card.
 * @returns the name, such as "Les Miserables: Who holds the novel together".
 */
function cardLabel(card: SampleCardData): string {
    return card.hook === card.name ? card.name : `${card.name}: ${card.hook}`;
}

/**
 * Samples..., from Sources "+": the data prototype's fixture files by subject, then the start page's
 * sample library in its order, drawn with the start page's own card (SampleCard), narrowed by a
 * search box and a group filter. Every sample goes into the project the way a dropped file does
 * (addSource); while the project holds data, each card also offers Open as a separate graph.
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
    // The first paint does not wait for the site's configuration.
    const timeline = useSyncExternalStore(onSiteConfig, siteTimeline);
    const entries = sampleEntries(ctx, timeline, {
        ask: (dataset, target) => {
            setAsking({ dataset, target });
        },
        configure: (generator, target) => {
            setConfiguring({ generator, target });
        },
    });
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
                size={800}
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
                            <div className="ws-land-cards ws-land-samples" data-view="grid">
                                {shown
                                    .filter((entry) => entry.group === each)
                                    .map((entry) => {
                                        const open = (target: Target): void => {
                                            close();
                                            entry.open(target);
                                        };
                                        const separate = `Open ${entry.card.name} as a separate graph`;
                                        return (
                                            <SampleCard
                                                key={entry.key}
                                                card={entry.card}
                                                label={cardLabel(entry.card)}
                                                onClick={() => {
                                                    open("add");
                                                }}
                                                corner={
                                                    separable ? (
                                                        <Tooltip label={separate}>
                                                            <ActionIcon
                                                                variant="default"
                                                                size="sm"
                                                                aria-label={separate}
                                                                onClick={() => {
                                                                    open("separate");
                                                                }}
                                                            >
                                                                <GLYPHS.openExternal size={14} aria-hidden />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    ) : undefined
                                                }
                                            />
                                        );
                                    })}
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
