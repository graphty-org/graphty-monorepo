import { EntityChip } from "@graphty/compact-mantine";
import { DATASET_DESCRIPTORS, sourceDescriptors } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Group, Modal, Stack, Text, UnstyledButton } from "@mantine/core";
import React from "react";

import { START_SAMPLES } from "../../data/sampleManifest";
import type { CommandContext } from "../commands/registry";
import { formatNumber } from "../inspector/words";
import { unlessUnsaved } from "../project/actions";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { fitsInBrowser } from "./library";
import { addSource, datasetBase, openProject } from "./open";
import { PROTOTYPE_SAMPLES, type PrototypeSample, sampleName, sampleUrl } from "./samples";

/** The id of the graph-samples source, whose samples are listed as Datasets rather than Live. */
const GRAPH_SAMPLES = "graph-samples";

/**
 * Loads a whole graph (a dataset or a live server sample): into an empty project in place, else as
 * a new project, asking first when the open one has unsaved work.
 * @param ctx - the command context.
 * @param name - the graph's name.
 * @param load - loads it into a session.
 */
function loadGraph(ctx: CommandContext, name: string, load: (session: GraphSession) => Promise<void>): void {
    const { session, workspace } = ctx;
    if (session !== null && session.data.sources().length === 0) {
        load(session).catch((error: unknown) => {
            const reason = error instanceof Error ? error.message : String(error);
            workspace.set({ notice: { message: `${name} could not be added. ${reason}` } });
        });
        return;
    }
    unlessUnsaved(ctx, () => {
        openProject(workspace, name, load);
    });
}

/**
 * One row: a name, then its counts as node and edge chips, or its rows.
 * @param props - the row
 * @param props.name - what it is called
 * @param props.nodes - its nodes, when known
 * @param props.edges - its edges, when known
 * @param props.rows - its rows, shown when neither count is known
 * @param props.onOpen - opens it
 * @returns the row, a button
 */
function SampleRow({
    name,
    nodes,
    edges,
    rows,
    onOpen,
}: {
    name: string;
    nodes?: number;
    edges?: number;
    rows?: number;
    onOpen: () => void;
}): React.JSX.Element {
    return (
        <UnstyledButton className="ws-samples-row" onClick={onOpen}>
            <Group gap="xs" wrap="nowrap" justify="space-between">
                <Text size="sm" truncate>
                    {name}
                </Text>
                <Group gap={4} wrap="nowrap">
                    {nodes === undefined ? null : <EntityChip kind="node">{formatNumber(nodes)}</EntityChip>}
                    {edges === undefined ? null : <EntityChip kind="edge">{formatNumber(edges)}</EntityChip>}
                    {nodes === undefined && edges === undefined && rows !== undefined ? (
                        <Text size="xs" c="dimmed">
                            {formatNumber(rows)} rows
                        </Text>
                    ) : null}
                </Group>
            </Group>
        </UnstyledButton>
    );
}

/**
 * A titled list of rows.
 * @param props - the section
 * @param props.title - its heading
 * @param props.children - its rows
 * @returns the section
 */
function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <section aria-label={title}>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={2}>
                {title}
            </Text>
            <Stack gap={0}>{children}</Stack>
        </section>
    );
}

/**
 * Sources "+" > Samples...: the prototype's fixture files by subject, the app's own graphs, the
 * live server samples and graph-samples' datasets. A file opens as a dropped file does; a whole
 * graph loads into an empty project or opens as a new one.
 * @returns the dialog, open while the workspace dialog is "samples"
 */
export function SamplesDialog(): React.JSX.Element {
    const ctx = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "samples");
    const close = (): void => {
        ctx.store.set({ dialog: null });
    };
    const openFixture = (sample: PrototypeSample): void => {
        close();
        const name = sampleName(sample);
        addSource(ctx, { name, source: { config: { url: sampleUrl(sample) }, name } });
    };
    const groups = [...new Set(PROTOTYPE_SAMPLES.map((sample) => sample.group))];
    const live = sourceDescriptors()
        .filter((source) => source.id !== GRAPH_SAMPLES)
        .flatMap((source) => source.descriptor.samples ?? []);
    const datasets = DATASET_DESCRIPTORS.filter(fitsInBrowser);
    return (
        <Modal opened={opened} onClose={close} title="Samples" size="md">
            <Stack gap="md">
                {groups.map((group) => (
                    <Section key={group} title={group}>
                        {PROTOTYPE_SAMPLES.filter((sample) => sample.group === group).map((sample) => (
                            <SampleRow
                                key={sample.path}
                                name={sampleName(sample)}
                                nodes={sample.nodes}
                                edges={sample.edges}
                                rows={sample.rows}
                                onOpen={() => {
                                    openFixture(sample);
                                }}
                            />
                        ))}
                    </Section>
                ))}
                <Section title="Graphs">
                    {START_SAMPLES.map((sample) => (
                        <SampleRow
                            key={sample.id}
                            name={sample.name}
                            onOpen={() => {
                                close();
                                addSource(ctx, {
                                    name: sample.name,
                                    source: { config: { url: sample.url }, name: sample.name },
                                });
                            }}
                        />
                    ))}
                </Section>
                {live.length === 0 ? null : (
                    <Section title="Live">
                        {live.map((sample) => (
                            <SampleRow
                                key={sample.id}
                                name={sample.plainName}
                                nodes={sample.counts?.nodes}
                                edges={sample.counts?.edges}
                                onOpen={() => {
                                    close();
                                    loadGraph(ctx, sample.plainName, (session) => session.data.loadSample(sample.id));
                                }}
                            />
                        ))}
                    </Section>
                )}
                <Section title="Datasets">
                    {datasets.map((dataset) => (
                        <SampleRow
                            key={dataset.name}
                            name={dataset.title}
                            nodes={dataset.nodes}
                            edges={dataset.edges}
                            onOpen={() => {
                                close();
                                loadGraph(ctx, dataset.title, (session) =>
                                    session.data.loadDataset(dataset.name, datasetBase()),
                                );
                            }}
                        />
                    ))}
                </Section>
            </Stack>
        </Modal>
    );
}
