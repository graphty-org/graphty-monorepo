import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession, LayerSpec, Run, RunResult } from "@graphty/graphty-element/session";
import { Button, Group, Paper, Text } from "@mantine/core";
import { Network, Route, Square, Users } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { loadGraphtyElement } from "../../elementLoader";
import { addSelectedCard } from "../canvas/selectedCard";

/** The graph the start page draws: a sample, and the two characters its shortest path joins. */
export interface HeroSample {
    /** Where the data is. */
    readonly url: string;
    /** The sample's name, for the import record. */
    readonly name: string;
    /** The ids of the two nodes Shortest path joins: this page's choice, made per sample. */
    readonly path: readonly [string, string];
}

/** The layout seed, so the start page draws the same picture on every visit. */
const HERO_SEED = 7;

/**
 * This page's hover look: what the pointed-at node is not linked to fades. A presentation choice
 * of the start page, drawn by graphty-element from these two style layers.
 */
const DIM_LAYERS: readonly LayerSpec[] = [
    {
        name: "Fade what the pointed-at node is not linked to",
        target: "node",
        selector: { match: "hover", reach: "neighbors", invert: true },
        set: { "node.opacity": 0.25 },
    },
    {
        name: "Fade the links the pointed-at node does not have",
        target: "edge",
        selector: { match: "hover", invert: true },
        set: { "edge.opacity": 0.15, "edge.arrowHeadOpacity": 0.15 },
    },
];

/** Which analysis the second and third buttons show; at most one at a time. */
type Pick = "key" | "path" | null;

/** What the buttons have switched on. */
interface Shown {
    communities: boolean;
    pick: Pick;
    flat: boolean;
}

/** One line under the buttons per thing shown, written from the runs' results. */
interface Said {
    communities?: number;
    keyPlayer?: string;
    path?: { from: string; to: string; steps: number };
    flipped?: boolean;
}

/**
 * The name a node is shown by.
 * @param session - The session.
 * @param id - The node.
 * @returns Its name, else its id.
 */
function nameOf(session: GraphSession, id: string | number): string {
    return session.data.name(id) ?? String(id);
}

/**
 * Waits for a run, settling with its result, or with null when it failed.
 * @param run - The run.
 * @returns The result, or null.
 */
async function finished(run: Run): Promise<RunResult | null> {
    try {
        return await run;
    } catch (error) {
        console.error(`[start] the ${run.algorithm} run failed:`, error);
        return null;
    }
}

/**
 * The live graph behind the start page: one graphty-element, loaded after the page's words and
 * buttons have painted, drawing a sample. Pointing at a node fades what it is not
 * linked to; clicking it shows its card; the buttons run the element's algorithms on it.
 * @param props - Component props
 * @param props.sample - What to draw
 * @param props.background - The page's canvas color, which the graph is drawn over
 * @param props.onSession - Called with the session once the graph is up, for the page's counts
 * @returns The graph and its buttons
 */
export function HeroGraph({
    sample,
    background,
    onSession,
}: Readonly<{
    sample: HeroSample;
    background: string;
    onSession?: (session: GraphSession) => void;
}>): React.JSX.Element {
    const ref = useRef<GraphtyElement>(null);
    const [defined, setDefined] = useState(() => customElements.get("graphty-element") !== undefined);
    const [session, setSession] = useState<GraphSession | null>(null);
    const [shown, setShown] = useState<Shown>({ communities: true, pick: null, flat: false });
    const [said, setSaid] = useState<Said>({});
    // The run Key players or Shortest path started, so the other button can take it away.
    const pickRun = useRef<string | null>(null);

    useEffect(() => {
        let live = true;
        void loadGraphtyElement()
            .then(() => customElements.whenDefined("graphty-element"))
            .then(() => {
                if (live) {
                    performance.mark("graphty:hero-element-defined");
                    setDefined(true);
                }
            });
        return () => {
            live = false;
        };
    }, []);

    // Once the tag has upgraded: the look (card, hover fade), a seeded layout, the data, and the
    // two runs the card and the Communities button read.
    useEffect(() => {
        const element = ref.current;
        const next: GraphSession | undefined = element?.session;
        if (!defined || element === null || next === undefined) {
            return undefined;
        }
        const onFrame = (): void => {
            performance.mark("graphty:hero-frame-stable");
        };
        element.addEventListener("graphty-graph-frame-stable", onFrame, { once: true });
        let live = true;
        void (async () => {
            await addSelectedCard(next);
            for (const layer of DIM_LAYERS) {
                await next.styles.add(layer);
            }
            await next.layout.set("force", { options: { seed: HERO_SEED } });
            await next.data.import({ config: { url: sample.url }, name: sample.name });
            performance.mark("graphty:hero-data-loaded");
            if (!live) {
                return;
            }
            setSession(next);
            onSession?.(next);
            void finished(next.runs.start("degree", {}, { style: false }));
            const communities = await finished(next.runs.start("louvain"));
            if (live && communities !== null) {
                setSaid((before) => ({ ...before, communities: communities.summary().groups?.length }));
            }
        })().catch((error: unknown) => {
            console.error("[start] the start page's graph could not be drawn:", error);
        });
        return () => {
            live = false;
            element.removeEventListener("graphty-graph-frame-stable", onFrame);
        };
    }, [defined, sample, onSession]);

    const toggleCommunities = useCallback(async () => {
        if (session === null) {
            return;
        }
        const on = !shown.communities;
        setShown((before) => ({ ...before, communities: on }));
        if (!on) {
            session.runs.remove("louvain");
            setSaid((before) => ({ ...before, communities: undefined, flipped: undefined }));
            return;
        }
        const run = await finished(session.runs.start("louvain"));
        setSaid((before) => ({ ...before, communities: run?.summary().groups?.length, flipped: undefined }));
    }, [session, shown.communities]);

    const togglePick = useCallback(
        async (pick: Exclude<Pick, null>) => {
            if (session === null) {
                return;
            }
            const next: Pick = shown.pick === pick ? null : pick;
            setShown((before) => ({ ...before, pick: next }));
            setSaid((before) => ({ ...before, keyPlayer: undefined, path: undefined, flipped: undefined }));
            if (pickRun.current !== null) {
                session.runs.remove(pickRun.current);
                pickRun.current = null;
            }
            if (next === "key") {
                // Sized by the measure, and nothing else: the communities keep their colors.
                const run = session.runs.start("betweenness", {}, { style: false });
                pickRun.current = run.id;
                const result = await finished(run);
                if (result !== null) {
                    await session.styles.encode({ run: run.id, channel: "node.size", range: [1, 4] });
                    const top = result.summary().top[0];
                    setSaid((before) => ({
                        ...before,
                        keyPlayer: top === undefined ? undefined : nameOf(session, top.id),
                    }));
                }
            } else if (next === "path") {
                const [from, to] = sample.path;
                const run = session.runs.start("shortest-path", { source: from, target: to });
                pickRun.current = run.id;
                const result = await finished(run);
                if (result !== null) {
                    const { hops } = result.graph;
                    const steps = typeof hops === "number" ? hops : 0;
                    setSaid((before) => ({
                        ...before,
                        path: { from: nameOf(session, from), to: nameOf(session, to), steps },
                    }));
                }
            }
        },
        [session, shown.pick, sample.path],
    );

    const toggleFlat = useCallback(async () => {
        if (session === null) {
            return;
        }
        const flat = !shown.flat;
        setShown((before) => ({ ...before, flat }));
        await session.layout.setDimension(flat ? "2d" : "3d");
        setSaid((before) => ({ ...before, flipped: true }));
    }, [session, shown.flat]);

    const lines: string[] = [];
    if (shown.communities && said.communities !== undefined) {
        lines.push(`Colored by community: ${String(said.communities)} groups, each more linked inside than out.`);
    }
    if (shown.pick === "key" && said.keyPlayer !== undefined) {
        lines.push(`Sized by how often a node links the others. ${said.keyPlayer} is the biggest.`);
    }
    if (shown.pick === "path" && said.path !== undefined) {
        lines.push(`The shortest route from ${said.path.from} to ${said.path.to}: ${String(said.path.steps)} steps.`);
    }
    if (said.flipped === true) {
        lines.push(shown.flat ? "Flat in 2D. The same graph, the same analyses." : "Back in 3D. Drag to turn it.");
    }

    const ready = session !== null;
    return (
        <>
            <div className="ws-land-live">
                {defined ? (
                    <graphty-element
                        ref={ref}
                        data-start-page=""
                        aria-label="A network drawn as a 3D graph. Drag to turn it; point at a node to see its neighbors, click it for details."
                        background={{ backgroundType: "color", color: background }}
                        style={{ display: "block", width: "100%", height: "100%" }}
                    />
                ) : null}
            </div>
            <div className="ws-land-demo">
                <Paper className="ws-land-chips" role="toolbar" aria-label="Analyze the graph" withBorder>
                    <Group gap={4} wrap="nowrap">
                        <Chip
                            pressed={shown.communities}
                            disabled={!ready}
                            icon={<Users size={14} aria-hidden />}
                            onClick={() => void toggleCommunities()}
                        >
                            Communities
                        </Chip>
                        <Chip
                            pressed={shown.pick === "key"}
                            disabled={!ready}
                            icon={<Network size={14} aria-hidden />}
                            onClick={() => void togglePick("key")}
                        >
                            Key players
                        </Chip>
                        <Chip
                            pressed={shown.pick === "path"}
                            disabled={!ready}
                            icon={<Route size={14} aria-hidden />}
                            onClick={() => void togglePick("path")}
                        >
                            Shortest path
                        </Chip>
                        <Chip
                            pressed={shown.flat}
                            disabled={!ready}
                            icon={<Square size={14} aria-hidden />}
                            onClick={() => void toggleFlat()}
                        >
                            2D
                        </Chip>
                    </Group>
                </Paper>
                {lines.length > 0 ? (
                    <Paper className="ws-land-said" withBorder aria-live="polite">
                        {lines.map((line) => (
                            <Text key={line} size="xs">
                                {line}
                            </Text>
                        ))}
                    </Paper>
                ) : null}
            </div>
            <Text size="xs" className="ws-land-hint">
                Drag to turn it. Click a node for details.
            </Text>
        </>
    );
}

/**
 * One graph button: a toggle that says whether it is on.
 * @param props - Component props
 * @param props.pressed - Whether it is on
 * @param props.disabled - Whether the graph is still loading
 * @param props.icon - Its glyph
 * @param props.onClick - Toggles it
 * @param props.children - Its label
 * @returns The button
 */
function Chip({
    pressed,
    disabled,
    icon,
    onClick,
    children,
}: Readonly<{
    pressed: boolean;
    disabled: boolean;
    icon: React.ReactNode;
    onClick: () => void;
    children: React.ReactNode;
}>): React.JSX.Element {
    return (
        <Button
            variant="subtle"
            size="compact-sm"
            className="ws-land-chip"
            data-pressed={pressed || undefined}
            aria-pressed={pressed}
            disabled={disabled}
            leftSection={icon}
            onClick={onClick}
        >
            {children}
        </Button>
    );
}
