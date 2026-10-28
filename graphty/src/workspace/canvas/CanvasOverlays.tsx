import "./canvas.css";

import type { BasemapStatusEvent, LayoutWarningEvent } from "@graphty/graphty-element";
import type { GraphSession, LegendBlock, ProgressChange, RunStatus } from "@graphty/graphty-element/session";
import { Button, Tooltip } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { groupsAnnouncement, pathAnnouncement } from "../analyze/words";
import { GLYPHS } from "../glyphs";
import { selectedNameWords } from "../inspector/words";
import { layoutWarningWords } from "../layout/refusalWords";
import { runName } from "../runWords";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { LegendCard } from "./LegendCard";
import { dataBlocks, isEffectBlock, keyBlocks } from "./legendWords";
import { runNotice } from "./runNotice";
import { StateCard } from "./StateCard";

/** How a run that ended is announced, by its status. */
const ENDED: Partial<Record<RunStatus, string>> = { succeeded: "finished", failed: "failed", canceled: "stopped" };

/**
 * The element's events after which the legend or the node count may read differently: a filter
 * step changes what the key counts. `style:batch-changed` closes a repaint once, however many
 * edits it carried (a grouping run adds a layer per group).
 */
const REDRAW_EVENTS = ["style:batch-changed", "run:changed", "project:changed", "visibility:changed"] as const;

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
            store.set({ keyHasEntries: false });
            return undefined;
        }
        let load: ProgressChange | null = null;
        // A run that ends after the session changed must not post a notice for the old session.
        let live = true;
        const read = (): void => {
            const { nodeCount, edgeCount } = session.data.statistics();
            const blocks = keyBlocks(dataBlocks(session));
            setReading({ blocks, nodeCount, edgeCount, load });
            // An effect is listed in a key that shows, and never opens it: a style write of an
            // effect is no reason for the key to appear.
            const keyHasEntries = blocks.some((block) => !isEffectBlock(block));
            if (store.get().keyHasEntries !== keyHasEntries) {
                store.set({ keyHasEntries });
            }
        };
        read();
        const offs = [
            ...REDRAW_EVENTS.map((event) => session.on(event, read)),
            session.on("selection:changed", () => {
                const { nodes, edges } = session.selection;
                if (nodes.length + edges.length > 0) {
                    // "Selection cleared" would contradict the new selection beside it.
                    const ended = store.get().notice?.endsWithSelection === true;
                    store.set({ announcement: selectedNameWords(session), ...(ended ? { notice: null } : {}) });
                }
            }),
            session.on("progress:changed", (change) => {
                if (change.task === "load") {
                    load = change.phase === "end" ? null : change;
                    read();
                    // A load from the Data page is announced by the page, once it has named the
                    // graph and the place is showing again.
                    if (change.phase === "end" && store.get().page !== "data-page") {
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
                const name = runName(session, change.run);
                // The event carries the run's record; its result is on the live run.
                const run = change.run.status === "succeeded" ? session.runs.get(change.run.id) : undefined;
                // A grouping run says what it made once its layers are in the tree.
                const grouped = run?.result?.summary().groups !== undefined;
                if (ended !== undefined && !grouped) {
                    const path = run === undefined ? null : pathAnnouncement(session, run);
                    store.set({ announcement: path ?? `${name} ${ended}` });
                }
                // The painting is decided once the element has finished painting for the run.
                void session.styles.settled().then(() => {
                    if (!live) {
                        return;
                    }
                    const groups = run === undefined ? null : groupsAnnouncement(session, run, name);
                    if (groups !== null) {
                        store.set({ announcement: groups });
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

/**
 * The widest data, in degrees of latitude or longitude, the app draws over a street map rather
 * than the bundled Natural Earth picture, which is a 2048 pixel world: at the scale of a country or
 * a city it is a blur.
 */
const DETAILED_MAP_SPAN = 20;

/**
 * The street map the app draws small data over: free, keyless and credited on the canvas, as
 * OpenStreetMap's tile usage policy asks (https://operations.osmfoundation.org/policies/tiles/);
 * the map only loads the tiles in view and never prefetches.
 */
const DETAILED_MAP_SOURCE = "openstreetmap";

/**
 * Draws data of a country or a city over a detailed street map. The element's own default is the
 * bundled world picture, which contacts no third party; choosing a tiled source is the app's
 * call. Made once per project, the first time a flat map is drawn while the reader has chosen no
 * map, as the layout's `map` option, so the Map form names it and the reader can change it.
 */
function useDetailedMapForSmallData(): void {
    const { element } = useWorkspace();
    useEffect(() => {
        const session = element?.session;
        if (element === null || session === undefined) {
            return undefined;
        }
        let chosen = false;
        const onBasemap = (): void => {
            const frame = element.mapFrame;
            const { layout } = session;
            if (
                chosen ||
                frame?.surface !== "flat" ||
                layout.id !== "location-map" ||
                (layout.options.map ?? null) !== null
            ) {
                return;
            }
            const [[west, south], [east, north]] = frame.bounds;
            if (Math.max(east - west, north - south) > DETAILED_MAP_SPAN) {
                return;
            }
            chosen = true;
            // Only the map changes: the element swaps it under nodes that stay where they are.
            void layout.set("location-map", { options: { ...layout.options, map: { source: DETAILED_MAP_SOURCE } } });
        };
        element.addEventListener("basemap-status", onBasemap);
        return () => {
            element.removeEventListener("basemap-status", onBasemap);
        };
    }, [element]);
}

/** The words a change of the map under a map layout is announced with, by its state. */
const BASEMAP_STATE_WORDS: Readonly<Record<string, string>> = {
    ready: "Map shown",
    fallback: "Map unavailable, showing Natural Earth",
};

/**
 * Posts the location map's notice ("6 of 14 nodes unplaced", with Select), read from the
 * element's `layout-warning` event, and announces the map's state as it changes, read from its
 * `basemap-status` event. A warning from a layout that is no longer the active one is ignored, and
 * the same count for the same layout and options is posted once: a 2D/3D switch runs the layout
 * again and would otherwise post it again. A new project brings a new element and starts afresh.
 */
function useLayoutWarningNotice(): void {
    const { element, store } = useWorkspace();
    useEffect(() => {
        const session = element?.session;
        if (element === null || session === undefined) {
            return undefined;
        }
        let posted: string | null = null;
        let message: string | null = null;
        const onWarning = (event: CustomEvent<LayoutWarningEvent>): void => {
            const { layoutType, code, params } = event.detail;
            const words = layoutWarningWords(code, params);
            if (words === null || layoutType !== session.layout.id) {
                return;
            }
            const key = JSON.stringify([layoutType, session.layout.options, words]);
            if (key === posted) {
                return;
            }
            posted = key;
            message = words;
            const ids = Array.isArray(params.ids) ? (params.ids as (string | number)[]) : [];
            store.set({
                notice: {
                    message: words,
                    ...(ids.length === 0
                        ? {}
                        : {
                              action: {
                                  label: "Select",
                                  run: () => {
                                      void session.selection.apply({ nodes: ids });
                                  },
                              },
                          }),
                },
            });
        };
        let announced: string | null = null;
        const onBasemap = (event: CustomEvent<BasemapStatusEvent>): void => {
            const words = BASEMAP_STATE_WORDS[event.detail.state];
            if (words !== undefined && words !== announced) {
                announced = words;
                store.set({ announcement: words });
            }
        };
        element.addEventListener("layout-warning", onWarning);
        element.addEventListener("basemap-status", onBasemap);
        return () => {
            element.removeEventListener("layout-warning", onWarning);
            element.removeEventListener("basemap-status", onBasemap);
            // The notice was about this project's graph: it does not carry into the next.
            if (message !== null && store.get().notice?.message === message) {
                store.set({ notice: null });
            }
        };
    }, [element, store]);
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
    const legendAsked = useWorkspaceState((state) => state.legendAsked);
    // The empty card's doors: the Sources "+" doors a first source most often comes through.
    const doors = [useCommand("data.add-file"), useCommand("data.samples")].filter((door) => door !== null);
    const { blocks, nodeCount, edgeCount, load } = useCanvasReading(session);
    useLayoutWarningNotice();
    useDetailedMapForSmallData();

    if (session === null) {
        return null;
    }
    // Effects alone do not show the key: the reader asks for it (Legend), or another row keys.
    const keyed = blocks.some((block) => !isEffectBlock(block));

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
                    doors.length === 0
                        ? undefined
                        : doors.map((door) => (
                              <Tooltip
                                  key={door.command.id}
                                  label={door.disabledReason}
                                  disabled={door.disabledReason === null}
                              >
                                  <Button
                                      size="xs"
                                      aria-disabled={door.disabledReason !== null}
                                      data-disabled={door.disabledReason === null ? undefined : true}
                                      onClick={door.disabledReason === null ? door.run : undefined}
                                  >
                                      {door.command.label}
                                  </Button>
                              </Tooltip>
                          ))
                }
            />
        );
    }

    return (
        <>
            {/* Asked for over nothing, the card says nothing is styled yet. */}
            {legendShown && (keyed || legendAsked) ? <LegendCard blocks={blocks} session={session} /> : null}
            {card === null ? null : <div className="ws-state-card-slot">{card}</div>}
        </>
    );
}
