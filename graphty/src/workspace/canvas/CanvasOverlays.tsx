import "./canvas.css";

import type { GraphSession, LegendBlock, ProgressChange } from "@graphty/graphty-element/session";
import { Button, Tooltip } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { LegendCard } from "./LegendCard";
import { runNotice } from "./runNotice";
import { StateCard } from "./StateCard";

/** The element's events after which the legend or the node count may read differently. */
const REDRAW_EVENTS = ["style:changed", "run:changed", "project:changed"] as const;

/** What the canvas draws from, read from the session. */
interface CanvasReading {
    readonly blocks: readonly LegendBlock[];
    readonly nodeCount: number;
    /** The load in flight, from the element's progress event, or null. */
    readonly load: ProgressChange | null;
}

const NOTHING: CanvasReading = { blocks: [], nodeCount: 0, load: null };

/**
 * Reads the legend, the node count and the load in flight from the session, again after every
 * event that can change them; and, when a run finishes, posts the notice its painting calls for.
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
        const read = (): void => {
            setReading({ blocks: session.styles.legend(), nodeCount: session.data.statistics().nodeCount, load });
        };
        read();
        const offs = [
            ...REDRAW_EVENTS.map((event) => session.on(event, read)),
            session.on("progress:changed", (change) => {
                if (change.task === "load") {
                    load = change.phase === "end" ? null : change;
                    read();
                }
            }),
            session.on("run:changed", (change) => {
                if (change.phase !== "end" || change.cause !== "command") {
                    return;
                }
                // The painting is decided once the element has finished painting for the run.
                void session.styles.settled().then(() => {
                    const notice = runNotice(session, change.run.id);
                    if (notice !== null) {
                        store.set({ notice });
                    }
                });
            }),
        ];
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session, store]);

    return reading;
}

/**
 * What the canvas draws over the element (tier1-design.md section 2.4): the legend card at its
 * top left, and one state card at its center -- loading while the element reports a load, empty
 * while it holds no node. The canvas has no other buttons.
 *
 * Not drawn yet, because graphty-element cannot report them: the loading card's Cancel (#296),
 * the too-large card (#902: a watcher cannot tell that a load was refused, or when one starts, so
 * "No nodes to draw" can show while a file is fetched) and the GPU-lost card.
 * @returns The overlays
 */
export function CanvasOverlays(): React.JSX.Element | null {
    const { session } = useWorkspace();
    const projectName = useWorkspaceState((state) => state.project?.name ?? "");
    const legendShown = useWorkspaceState((state) => state.legendShown);
    const addData = useCommand("file.open");
    const { blocks, nodeCount, load } = useCanvasReading(session);

    if (session === null) {
        return null;
    }

    let card: React.ReactNode = null;
    if (load !== null) {
        card = (
            <StateCard
                title={`Reading ${projectName}`}
                sentence={load.completed > 0 ? `${load.completed.toLocaleString()} records read` : undefined}
                progress={load.fraction}
            />
        );
    } else if (nodeCount === 0) {
        card = (
            <StateCard
                title="No nodes to draw"
                actions={
                    addData === null ? undefined : (
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
                    )
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
