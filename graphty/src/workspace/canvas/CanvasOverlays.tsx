import "./canvas.css";

import type { GraphSession, LegendBlock, ProgressChange, RunStatus } from "@graphty/graphty-element/session";
import { Button, Menu, Tooltip } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { pathAnnouncement, wordsFor } from "../analyze/words";
import { SampleItems } from "../frame/menus";
import { GLYPHS } from "../glyphs";
import { count } from "../inspector/words";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { LegendCard } from "./LegendCard";
import { keyBlocks } from "./legendWords";
import { runNotice } from "./runNotice";
import { StateCard } from "./StateCard";

/** How a run that ended is announced, by its status. */
const ENDED: Partial<Record<RunStatus, string>> = { succeeded: "finished", failed: "failed", canceled: "stopped" };

/** The element's events after which the legend or the node count may read differently. */
const REDRAW_EVENTS = ["style:changed", "run:changed", "project:changed"] as const;

/** What the canvas draws from, read from the session. */
interface CanvasReading {
    readonly blocks: readonly LegendBlock[];
    readonly nodeCount: number;
    readonly edgeCount: number;
    /** The load in flight, from the element's progress event, or null. */
    readonly load: ProgressChange | null;
}

const NOTHING: CanvasReading = { blocks: [], nodeCount: 0, edgeCount: 0, load: null };

/**
 * Reads the legend, the node and edge counts and the load in flight from the session, again after every
 * event that can change them; announces a finished load with its size and a finished run by name;
 * and, when a run finishes, posts the notice its painting calls for.
 * @param session - the element's session, or null.
 * @returns what the canvas draws from.
 */
function useCanvasReading(session: GraphSession | null): CanvasReading {
    const { store } = useWorkspace();
    const [reading, setReading] = useState<CanvasReading>(NOTHING);

    useEffect(() => {
        if (session === null) {
            setReading(NOTHING);
            return undefined;
        }
        let load: ProgressChange | null = null;
        // A run that ends after the session changed must not post a notice for the old session.
        let live = true;
        const read = (): void => {
            const { nodeCount, edgeCount } = session.data.statistics();
            setReading({ blocks: keyBlocks(session.styles.legend()), nodeCount, edgeCount, load });
        };
        read();
        const offs = [
            ...REDRAW_EVENTS.map((event) => session.on(event, read)),
            session.on("selection:changed", () => {
                const { nodes, edges } = session.selection;
                const parts = [
                    ...(nodes.length > 0 ? [count(nodes.length, "node")] : []),
                    ...(edges.length > 0 ? [count(edges.length, "edge")] : []),
                ];
                if (parts.length > 0) {
                    store.set({ announcement: `${parts.join(", ")} selected` });
                }
            }),
            session.on("progress:changed", (change) => {
                if (change.task === "load") {
                    load = change.phase === "end" ? null : change;
                    read();
                    if (change.phase === "end") {
                        const { nodeCount, edgeCount } = session.data.statistics();
                        const name = store.get().project?.name ?? "Graph";
                        store.set({
                            announcement: `${name}: ${nodeCount.toLocaleString()} nodes, ${edgeCount.toLocaleString()} edges`,
                        });
                    }
                }
            }),
            session.on("run:changed", (change) => {
                if (change.phase !== "end" || change.cause !== "command") {
                    return;
                }
                const ended = ENDED[change.run.status];
                if (ended !== undefined) {
                    const descriptor = session.catalog
                        .algorithms()
                        .find((algorithm) => algorithm.key === change.run.algorithm);
                    const name = descriptor === undefined ? change.run.label : wordsFor(descriptor).name;
                    // The event carries the run's record; its result is on the live run.
                    const run = session.runs.get(change.run.id);
                    const path =
                        change.run.status === "succeeded" && run !== undefined ? pathAnnouncement(session, run) : null;
                    store.set({ announcement: path ?? `${name} ${ended}` });
                }
                // The painting is decided once the element has finished painting for the run.
                void session.styles.settled().then(() => {
                    if (!live) {
                        return;
                    }
                    const notice = runNotice(session, change.run.id);
                    if (notice !== null) {
                        store.set({ notice });
                    }
                });
            }),
        ];
        return () => {
            live = false;
            offs.forEach((off) => {
                off();
            });
        };
    }, [session, store]);

    return reading;
}

/** Props for LoadingCard. */
interface LoadingCardProps {
    /** The project being read. */
    projectName: string;
    /** Nodes read so far. */
    nodeCount: number;
    /** Edges read so far. */
    edgeCount: number;
    /** How far the load has got, from 0 to 1, or null when the element cannot say. */
    fraction: number | null;
}

/**
 * The state card the canvas shows while the element reports a load.
 * @param props - Component props
 * @param props.projectName - The project being read
 * @param props.nodeCount - Nodes read so far
 * @param props.edgeCount - Edges read so far
 * @param props.fraction - How far the load has got
 * @returns The card
 */
export function LoadingCard({
    projectName,
    nodeCount,
    edgeCount,
    fraction,
}: Readonly<LoadingCardProps>): React.JSX.Element {
    return (
        <StateCard
            icon={<GLYPHS.loading size={20} />}
            title={`Reading ${projectName}`}
            sentence={`${nodeCount.toLocaleString()} nodes, ${edgeCount.toLocaleString()} edges...`}
            progress={fraction}
        />
    );
}

/**
 * What the canvas draws over the element (tier1-design.md section 2.4): the legend card at its
 * top left, and one state card at its center -- loading while the element reports a load, empty
 * while it holds no node, with Add data... and Open a sample. The canvas has no other buttons.
 *
 * Not drawn yet, because graphty-element cannot report them: the loading card's Cancel (#296);
 * the file name on the loading card and the too-large card (#902: a load event names no source,
 * a watcher cannot tell that a load was refused, or when one starts, so "No nodes to draw" can
 * show while a file is fetched); and the GPU-lost card.
 * @returns The overlays
 */
export function CanvasOverlays(): React.JSX.Element | null {
    const { session } = useWorkspace();
    const projectName = useWorkspaceState((state) => state.project?.name ?? "");
    const legendShown = useWorkspaceState((state) => state.legendShown);
    const addData = useCommand("data.add");
    const { blocks, nodeCount, edgeCount, load } = useCanvasReading(session);

    if (session === null) {
        return null;
    }

    let card: React.ReactNode = null;
    if (load !== null) {
        card = (
            <LoadingCard
                projectName={projectName}
                nodeCount={nodeCount}
                edgeCount={edgeCount}
                fraction={load.fraction}
            />
        );
    } else if (nodeCount === 0) {
        card = (
            <StateCard
                icon={<GLYPHS.empty size={20} />}
                title="No nodes to draw"
                actions={
                    <>
                        {addData === null ? null : (
                            <Tooltip label={addData.disabledReason} disabled={addData.disabledReason === null}>
                                <Button
                                    size="xs"
                                    aria-disabled={addData.disabledReason !== null}
                                    data-disabled={addData.disabledReason === null ? undefined : true}
                                    onClick={addData.disabledReason === null ? addData.run : undefined}
                                >
                                    {addData.command.label}
                                </Button>
                            </Tooltip>
                        )}
                        <Menu position="bottom" withinPortal>
                            <Menu.Target>
                                <Button size="xs" variant="default">
                                    Open a sample
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <SampleItems />
                            </Menu.Dropdown>
                        </Menu>
                    </>
                }
            />
        );
    }

    return (
        <>
            {legendShown && blocks.length > 0 ? <LegendCard blocks={blocks} session={session} /> : null}
            {card === null ? null : <div className="ws-state-card-slot">{card}</div>}
        </>
    );
}
