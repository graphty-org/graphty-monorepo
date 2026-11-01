import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import { definePalette } from "@graphty/graphty-element/extend";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import type { GraphSession, LayerSpec, NodeId, Run, RunResult } from "@graphty/graphty-element/session";
import { Tooltip, UnstyledButton } from "@mantine/core";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";

import { loadGraphtyElement } from "../../elementLoader";
import { siteConfig } from "../../siteConfig";
import { GLYPHS } from "../glyphs";
import { EDGE_WIDTH, HIGHLIGHT_OPACITY, LOOK } from "./heroLook";
import { HeroTurns } from "./heroTurns";
import { Groups, Path, Star } from "./icons";

/** The graph the start page draws: a sample, and the two characters its shortest path joins. */
export interface HeroSample {
    /** Where the data is. */
    readonly url: string;
    /** The sample's name, for the import record. */
    readonly name: string;
    /** The ids of the two nodes Shortest path joins: this page's choice, made per sample. */
    readonly path: readonly [string, string];
}

/**
 * Framed for every angle it turns to, so the turning graph neither leaves the frame nor shrinks.
 * Paused, the still graph is not drawn again on every animation frame: on a software GPU each
 * frame held the page for tens of milliseconds, so every click on the page's buttons waited
 * behind them (the workspace's element does the same, issue #1943).
 */
const HERO_LAYOUT_BEHAVIOR = { camera: { fitBounds: "turning" }, rendering: { onDemand: true } } as const;

/**
 * A graph that starts still arrives already arranged: the layout's steps are taken before its
 * first frame, stopping once it settles, instead of drawn one frame at a time. The steps and where
 * the layout ends are the same; only the flight in is not drawn. A reader who asked for less
 * motion sees no flight, and a picture of the still page (Storybook) is final as soon as the graph
 * is up, where drawing the flight held every start screen picture for seconds (issue #4041).
 */
const HERO_STILL_LAYOUT_BEHAVIOR = { ...HERO_LAYOUT_BEHAVIOR, layout: { preSteps: 1000 } } as const;

/**
 * The selection's own halo is hidden: the clicked node is marked by the page's highlight layer
 * (which follows the pointer, and the clicked node only while nothing is pointed at) and its card.
 */
const HERO_SELECTION_STYLE = { opacity: 0 };

/** Every node's diameter, in scene units, while nothing sizes the nodes by a result. */
const NODE_SIZE = 2.56;

/** The layout seed, so the start page draws the same picture on every visit. */
const HERO_SEED = 9;

/** How fast the graph turns, in radians per second: a slow, steady drift. */
const TURN_SPEED = 0.15;

/** The start page's community colors: muted, so the groups read without shouting. */
const GROUP_PALETTE = {
    id: "graphty-start-groups",
    kind: "categorical",
    name: "Start page groups",
    colors: [
        "#4e79a7",
        "#f28e2b",
        "#e15759",
        "#76b7b2",
        "#b07aa1",
        "#edc948",
        "#ff9da7",
        "#9c755f",
        "#86bcb6",
        "#d37295",
        "#a0cbe8",
        "#ffbe7d",
    ],
} as const;

/**
 * How the page names a node on the graph: a small card in the page's font and colors.
 * @param scheme - The page's color scheme.
 * @returns The label style.
 */
function nameStyle(scheme: "light" | "dark"): LabelStyle {
    const look = LOOK[scheme];
    return {
        enabled: true,
        font: "Outfit",
        weight: 500,
        sizeMode: "screen",
        sizePx: 14,
        color: look.text,
        background: look.surface,
        padding: 4,
        cornerRadius: 4,
        location: "top",
        // Over the graph, so no nearer node or edge crosses the name.
        onTop: true,
    };
}

/**
 * The nodes' one color while Communities is off: the page's neutral gray rather than the
 * element's own default color.
 * @param scheme - The page's color scheme.
 * @returns The layer.
 */
function neutralLayer(scheme: "light" | "dark"): LayerSpec {
    return {
        name: "One neutral color while the communities are off",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": LOOK[scheme].node },
    };
}

/**
 * The layer that names the nodes an analysis points out: the ends of the shortest path, or the
 * biggest key player.
 * @param scheme - The page's color scheme.
 * @param nodes - The nodes to name.
 * @returns The layer.
 */
function namesLayer(scheme: "light" | "dark", nodes: readonly NodeId[]): LayerSpec {
    return {
        name: "Name the nodes the analysis points out",
        target: "node",
        selector: { match: "ids", nodes },
        set: { "node.labelStyle": nameStyle(scheme) },
        encode: { "node.label": { template: ["{data.id}"] } },
    };
}

/**
 * This page's look, drawn by graphty-element from style layers: shaded icospheres and plain
 * lines, and while a node is pointed at (or, with none pointed at, clicked) a highlight around it, its
 * links drawn darker and everything it is not linked to faded. Presentation choices of the start
 * page.
 * @param scheme - The page's color scheme.
 * @returns The layers, bottom first.
 */
function lookLayers(scheme: "light" | "dark"): LayerSpec[] {
    const look = LOOK[scheme];
    return [
        {
            name: "Shaded icospheres",
            target: "node",
            selector: { match: "everything" },
            // Lit and faceted in 3D; graphty-element draws every node flat in 2D.
            set: { "node.shape": "icosphere", "node.sizeMode": "diameter", "node.size": NODE_SIZE },
        },
        {
            name: "Plain lines",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": look.edge, "edge.opacity": look.edgeOpacity, "edge.arrowHead": "none" },
        },
        {
            name: "Fade what the focused node is not linked to",
            target: "node",
            selector: { match: "hover", reach: "neighbors", invert: true, orSelected: true },
            set: { "node.opacity": 0.3 },
        },
        {
            name: "Fade the links the focused node does not have",
            target: "edge",
            selector: { match: "hover", invert: true, orSelected: true },
            set: { "edge.opacity": 0.15 },
        },
        {
            name: "Draw the focused node's links darker",
            target: "edge",
            selector: { match: "hover", orSelected: true },
            set: { "edge.color": look.hot, "edge.opacity": 1, "edge.width": EDGE_WIDTH * 1.25 },
        },
        {
            // The selection's halo, in the node's own shape, in the page's color.
            name: "Highlight the focused node",
            target: "node",
            selector: { match: "hover", orSelected: true },
            set: { "node.haloColor": look.ring, "node.haloOpacity": HIGHLIGHT_OPACITY },
        },
        {
            // A tooltip, not a label: graphty-element draws a tooltip over everything, so no
            // edge or nearer node crosses the name.
            name: "Name the pointed-at node",
            target: "node",
            selector: { match: "everything" },
            set: { "node.tooltipStyle": nameStyle(scheme) },
            encode: { "node.tooltip": { template: ["{data.id}"] } },
        },
        {
            name: "No name on the clicked node, which its card names",
            target: "node",
            selector: { match: "member", of: "selection" },
            set: { "node.tooltipStyle": { enabled: false } },
        },
    ];
}

/** The two analyses that point nodes out; each button is on or off on its own. */
type Analysis = "key" | "path";

/** What the buttons have switched on. */
interface Shown {
    communities: boolean;
    key: boolean;
    path: boolean;
    flat: boolean;
}

/** What one pointing-out analysis left on the graph: its run, and the layer naming its nodes. */
interface Picked {
    run: string | null;
    names: { id: string; nodes: readonly NodeId[] } | null;
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
 * Whether the reader asked for less motion.
 * @returns True when the system says so.
 */
function prefersStill(): boolean {
    return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** The room kept under the buttons for the caption: two lines of it, in CSS pixels. */
const CAPTION_ROOM = 64;

/**
 * The room the graph is framed clear of: the words and the launcher on the left, the graph
 * buttons above, the hint below. Nothing on a narrow screen, where the words sit above the graph.
 * Measured from the buttons plus a fixed room for the caption, and not from the caption itself,
 * which comes and goes as the buttons are pressed: framing follows the insets, so a caption
 * measured here moved the graph.
 * @param hero - The hero section.
 * @returns The insets, in CSS pixels.
 */
function insetsFor(hero: HTMLElement): { top: number; right: number; bottom: number; left: number } {
    const box = hero.getBoundingClientRect();
    const over = hero.querySelector(".ws-land-over")?.getBoundingClientRect();
    const chips = hero.querySelector(".ws-land-chips")?.getBoundingClientRect();
    if (over === undefined || chips === undefined || globalThis.innerWidth <= 820) {
        return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    return {
        // Clear of the launcher, so no node is drawn against its edge.
        left: Math.max(0, over.right - box.left),
        // Clear of the buttons and of room for two caption lines under them. Fixed room, not the
        // caption's own height, so the graph keeps its place as lines come and go.
        top: Math.max(0, chips.bottom - box.top + 8 + CAPTION_ROOM),
        right: 24,
        bottom: 36,
    };
}

/** What the node card says, read from the element when the node is clicked. */
interface CardFacts {
    id: NodeId;
    name: string;
    links: number;
    linked: string[];
    community?: { rank: number; of: number; color?: string };
}

/**
 * What the card says about a node.
 * @param session - The session.
 * @param id - The node.
 * @param communities - Whether the communities are shown.
 * @returns The facts.
 */
function cardFacts(session: GraphSession, id: NodeId, communities: boolean): CardFacts {
    // The best-connected neighbors first, so the card names the ones a reader has heard of.
    const page = session.data.neighbors(id, { limit: 4, sort: { by: "degree", descending: true } });
    const facts: CardFacts = {
        id,
        name: nameOf(session, id),
        links: page.total,
        linked: page.records.map((row) => row.name),
    };
    const louvain = communities ? session.runs.get("louvain")?.result : undefined;
    const group = louvain?.node(id)?.group;
    const groups = louvain?.summary().groups;
    const rank = groups?.find((each) => each.group === group)?.rank;
    if (groups !== undefined && rank !== undefined) {
        // The color the element drew the node in, for the dot beside its community.
        const color = session.styles.explain({ node: id }).merged["node.color"]?.hex;
        facts.community = { rank, of: groups.length, color };
    }
    return facts;
}

/**
 * The live graph behind the start page: one graphty-element, loaded after the page's words and
 * buttons have painted, drawing a sample and turning slowly. Pointing at a node fades what it is
 * not linked to; clicking it shows its card; the buttons run the element's algorithms on it.
 * @param props - Component props
 * @param props.sample - What to draw
 * @param props.background - The page's canvas color, which the graph is drawn over
 * @param props.scheme - The page's color scheme
 * @param props.onSession - Called with the session once the graph is up, for the page's counts
 * @returns The graph and its buttons
 */
export function HeroGraph({
    sample,
    background,
    scheme,
    onSession,
}: Readonly<{
    sample: HeroSample;
    background: string;
    scheme: "light" | "dark";
    onSession?: (session: GraphSession) => void;
}>): React.JSX.Element {
    const ref = useRef<GraphtyElement>(null);
    const cardRef = useRef<HTMLDialogElement>(null);
    const [defined, setDefined] = useState(() => customElements.get("graphty-element") !== undefined);
    const [session, setSession] = useState<GraphSession | null>(null);
    const [shown, setShown] = useState<Shown>({ communities: true, key: false, path: false, flat: false });
    const [said, setSaid] = useState<Said>({});
    const turns = useContext(HeroTurns);
    // Read once: the pause button changes the turning, never how the graph arrived.
    const [startsStill] = useState(() => !turns || prefersStill());
    const [turning, setTurning] = useState(!startsStill);
    const [card, setCard] = useState<CardFacts | null>(null);
    // What Key players and Shortest path each left on the graph, so each button takes away
    // only its own. Each names its nodes in its own layer: a node both name gets one label.
    const picked = useRef<Record<Analysis, Picked>>({
        key: { run: null, names: null },
        path: { run: null, names: null },
    });
    // The look layers' ids, so a change of scheme repaints them.
    const lookIds = useRef<string[]>([]);
    // The neutral color layer while Communities is off.
    const neutral = useRef<string | null>(null);
    const schemeRef = useRef(scheme);
    schemeRef.current = scheme;

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

    // The turning follows the pause button, and touches nothing else.
    useEffect(() => {
        const element = ref.current;
        if (defined && element !== null) {
            element.autoRotate = turning ? TURN_SPEED : 0;
        }
    }, [defined, turning]);

    // The room the graph is framed clear of follows the page's size and the buttons' box.
    useEffect(() => {
        const element = ref.current;
        const hero = element?.closest<HTMLElement>(".ws-land-hero");
        if (!defined || element === null || hero === null || hero === undefined) {
            return undefined;
        }
        const frame = (): void => {
            // A window with no width to draw in -- a screenshot tool shrinks it to 1 x 1 for a
            // moment -- keeps the insets it had: framing for it would move the graph and back.
            if (hero.clientWidth > 1) {
                element.fitInsets = insetsFor(hero);
            }
        };
        frame();
        const observer = new ResizeObserver(frame);
        observer.observe(hero);
        const chips = hero.querySelector(".ws-land-chips");
        if (chips !== null) {
            observer.observe(chips);
        }
        return () => {
            observer.disconnect();
        };
    }, [defined]);

    // Once the tag has upgraded: the look, a seeded layout, the data, and the run the
    // Communities button reads.
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
            definePalette(GROUP_PALETTE);
            next.styles.setDefaultPalettes({ categorical: GROUP_PALETTE.id });
            const ids: string[] = [];
            // The scheme in force now; a later change is applied by the effect below.
            for (const layer of lookLayers(schemeRef.current)) {
                ids.push((await next.styles.add(layer)).id);
            }
            lookIds.current = ids;
            await next.layout.set("force", { options: { seed: HERO_SEED } });
            await next.data.import({ config: { url: sample.url }, name: sample.name });
            performance.mark("graphty:hero-data-loaded");
            if (!live) {
                return;
            }
            setSession(next);
            onSession?.(next);
            const communities = await finished(next.runs.start("louvain"));
            if (live && communities !== null) {
                setSaid((before) => ({ ...before, communities: communities.summary().groups?.length }));
            }
        })().catch((error: unknown) => {
            // Unmounted mid-load: the element aborts the import it no longer needs, which is no
            // failure to report.
            if (!live) {
                return;
            }
            console.error("[start] the start page's graph could not be drawn:", error);
        });
        return () => {
            live = false;
            element.removeEventListener("graphty-graph-frame-stable", onFrame);
        };
    }, [defined, sample, onSession]);

    // A change of scheme repaints the look in the page's other colors.
    useEffect(() => {
        if (session === null || lookIds.current.length === 0) {
            return;
        }
        const layers = lookLayers(scheme);
        lookIds.current.forEach((id, index) => {
            void session.styles.update(id, layers[index]);
        });
        for (const { names } of Object.values(picked.current)) {
            if (names !== null) {
                void session.styles.update(names.id, namesLayer(scheme, names.nodes));
            }
        }
        if (neutral.current !== null) {
            void session.styles.update(neutral.current, neutralLayer(scheme));
        }
    }, [session, scheme]);

    // The card: the clicked node's facts, kept beside it while the graph turns.
    useEffect(() => {
        const element = ref.current;
        if (session === null || element === null) {
            return undefined;
        }
        const read = (): void => {
            const { nodes } = session.selection;
            setCard(nodes.length === 1 ? cardFacts(session, nodes[0], shown.communities) : null);
        };
        read();
        return session.on("selection:changed", read);
    }, [session, shown.communities]);

    // Escape closes the card.
    useEffect(() => {
        if (card === null || session === null) {
            return undefined;
        }
        const close = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                session.selection.clear();
            }
        };
        globalThis.addEventListener("keydown", close);
        return () => {
            globalThis.removeEventListener("keydown", close);
        };
    }, [card, session]);

    useEffect(() => {
        const element = ref.current;
        if (card === null || element === null) {
            return undefined;
        }
        let frame = 0;
        const place = (): void => {
            placeCard(element, cardRef.current, card.id);
            frame = requestAnimationFrame(place);
        };
        place();
        return () => {
            cancelAnimationFrame(frame);
        };
    }, [card]);

    const toggleCommunities = useCallback(async () => {
        if (session === null) {
            return;
        }
        const on = !shown.communities;
        setShown((before) => ({ ...before, communities: on }));
        if (!on) {
            session.runs.remove("louvain");
            setSaid((before) => ({ ...before, communities: undefined, flipped: undefined }));
            neutral.current = (await session.styles.add(neutralLayer(scheme))).id;
            return;
        }
        if (neutral.current !== null) {
            void session.styles.remove(neutral.current);
            neutral.current = null;
        }
        const run = await finished(session.runs.start("louvain"));
        setSaid((before) => ({ ...before, communities: run?.summary().groups?.length, flipped: undefined }));
    }, [session, shown.communities, scheme]);

    const togglePick = useCallback(
        async (pick: Analysis) => {
            if (session === null) {
                return;
            }
            const on = !shown[pick];
            setShown((last) => ({ ...last, [pick]: on }));
            const before = picked.current[pick];
            if (before.run !== null) {
                session.runs.remove(before.run);
            }
            if (before.names !== null) {
                void session.styles.remove(before.names.id);
            }
            // A fresh record, so a click while this run is going takes this run away.
            const mine: Picked = { run: null, names: null };
            picked.current[pick] = mine;
            const forget = pick === "key" ? { keyPlayer: undefined } : { path: undefined };
            setSaid((last) => ({ ...last, ...forget, flipped: undefined }));
            if (!on) {
                return;
            }
            const found =
                pick === "key"
                    ? await showKeyPlayers(session, mine)
                    : await showPath(session, sample.path, mine, scheme);
            if (found === null) {
                return;
            }
            setSaid((last) => ({ ...last, ...found.said }));
            if (found.nodes.length > 0) {
                mine.names = { id: (await session.styles.add(namesLayer(scheme, found.nodes))).id, nodes: found.nodes };
            }
        },
        [session, shown, sample.path, scheme],
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

    const lines = saidLines(shown, said);
    const ready = session !== null;
    return (
        <>
            <div className="ws-land-live">
                {defined ? (
                    <graphty-element
                        ref={ref}
                        data-start-page=""
                        aria-label="A network drawn as a 3D graph. Drag or use the arrow keys to turn it; point at a node to see its neighbors, click it for details."
                        background={{ backgroundType: "color", color: background }}
                        pixelRatio="device"
                        layoutBehavior={startsStill ? HERO_STILL_LAYOUT_BEHAVIOR : HERO_LAYOUT_BEHAVIOR}
                        selectionStyle={HERO_SELECTION_STYLE}
                        // The site's experiments, as on the workspace's element.
                        features={siteConfig().features}
                        style={{ display: "block", width: "100%", height: "100%" }}
                    />
                ) : null}
            </div>
            <div className="ws-land-demo">
                <div className="ws-land-chips" role="toolbar" aria-label="Analyze the graph">
                    <Chip
                        pressed={shown.communities}
                        disabled={!ready}
                        icon={<Groups />}
                        onClick={() => void toggleCommunities()}
                    >
                        Communities
                    </Chip>
                    <Chip pressed={shown.key} disabled={!ready} icon={<Star />} onClick={() => void togglePick("key")}>
                        Key players
                    </Chip>
                    <Chip
                        pressed={shown.path}
                        disabled={!ready}
                        icon={<Path />}
                        onClick={() => void togglePick("path")}
                    >
                        Shortest path
                    </Chip>
                    <Chip
                        pressed={shown.flat}
                        disabled={!ready}
                        icon={<GLYPHS.stop aria-hidden />}
                        onClick={() => void toggleFlat()}
                    >
                        2D
                    </Chip>
                    {/* An icon alone, so it says on hover what it does, in the words of its name. */}
                    <Tooltip label={turning ? "Pause the turning" : "Turn the graph"}>
                        <UnstyledButton
                            className="ws-land-chip"
                            aria-label={turning ? "Pause the turning" : "Turn the graph"}
                            aria-pressed={!turning}
                            onClick={() => {
                                setTurning((before) => !before);
                            }}
                        >
                            {turning ? <GLYPHS.pause aria-hidden /> : <GLYPHS.play aria-hidden />}
                        </UnstyledButton>
                    </Tooltip>
                </div>
                {/* On the page, empty, before its first line: a live region that arrives already
                    holding its words is not read. Empty, it draws nothing (start.css). */}
                <div className="ws-land-said" aria-live="polite">
                    {lines.map((line) => (
                        <p key={line}>{line}</p>
                    ))}
                </div>
            </div>
            {card === null || session === null ? null : (
                <NodeCard
                    card={card}
                    boxRef={cardRef}
                    onClose={() => {
                        session.selection.clear();
                    }}
                />
            )}
            <p className="ws-land-hint">Drag to turn it. Click a node for details.</p>
        </>
    );
}

/**
 * The caption under the buttons: one line for each analysis on show, and for a flip of view.
 * @param shown - What the buttons have on
 * @param said - What the runs found
 * @returns The lines
 */
function saidLines(shown: Shown, said: Said): string[] {
    const lines: string[] = [];
    if (shown.communities && said.communities !== undefined) {
        lines.push(`Colored by community: ${String(said.communities)} groups, each more linked inside than out.`);
    }
    if (shown.key && said.keyPlayer !== undefined) {
        lines.push(`Sized by how often a node links the others. ${said.keyPlayer} is the biggest.`);
    }
    if (shown.path && said.path !== undefined) {
        lines.push(
            `The shortest route from ${said.path.from} to ${said.path.to}, in green: ${String(said.path.steps)} steps.`,
        );
    }
    if (said.flipped === true) {
        lines.push(shown.flat ? "Flat in 2D. The same graph, the same analyses." : "Back in 3D. Drag to turn it.");
    }
    return lines;
}

/** What a pointing-out analysis found: the caption's facts and the nodes to name. */
interface Found {
    said: Pick<Said, "keyPlayer" | "path">;
    nodes: readonly NodeId[];
}

/**
 * Size the nodes by betweenness, and nothing else: the communities keep their colors.
 * @param session - The graph's session
 * @param mine - Where the run's id is kept, so the button can take it away
 * @returns The biggest node, or null when the run did not finish
 */
async function showKeyPlayers(session: GraphSession, mine: Picked): Promise<Found | null> {
    const run = session.runs.start("betweenness", {}, { style: false });
    mine.run = run.id;
    const result = await finished(run);
    if (result === null) {
        return null;
    }
    await session.styles.encode({ run: run.id, channel: "node.size", range: [NODE_SIZE * 0.625, NODE_SIZE * 2.5] });
    const top = result.summary().top[0];
    if (top === undefined) {
        return { said: {}, nodes: [] };
    }
    return { said: { keyPlayer: nameOf(session, top.id) }, nodes: [top.id] };
}

/**
 * Run the shortest path between the sample's two nodes, and mark it in the page's path color.
 *
 * The page marks the route itself: the element suppresses its own suggested mark here, because
 * the page's "Plain lines" layer already colors every edge (graphty-element's rule that a layer
 * somebody wrote wins), so the run alone draws nothing. The mark writes only to the route, so
 * Key players' sizes and the communities' colors stay on every other node.
 * @param session - The graph's session
 * @param ends - The path's two ends
 * @param mine - Where the run's id is kept, so the button can take it away
 * @param scheme - The page's color scheme, for the route's color
 * @returns The ends' names and the steps between them, or null when the run did not finish
 */
async function showPath(
    session: GraphSession,
    ends: HeroSample["path"],
    mine: Picked,
    scheme: "light" | "dark",
): Promise<Found | null> {
    const [from, to] = ends;
    const run = session.runs.start("shortest-path", { source: from, target: to }, { style: false });
    mine.run = run.id;
    const result = await finished(run);
    if (result === null) {
        return null;
    }
    const color = LOOK[scheme].path;
    await session.styles.mark({
        run: run.id,
        field: "onPath",
        set: { "node.color": color, "edge.color": color, "edge.opacity": 1, "edge.width": EDGE_WIDTH * 3 },
    });
    const { hops } = result.graph;
    const steps = typeof hops === "number" ? hops : 0;
    return { said: { path: { from: nameOf(session, from), to: nameOf(session, to), steps } }, nodes: ends };
}

/**
 * Put the card beside its node: to the right, or to the left when the right has no room, kept
 * between the buttons and the bottom of the graph, and hidden while the node is out of sight.
 * @param element - The graph
 * @param box - The card
 * @param id - The node
 */
function placeCard(element: GraphtyElement, box: HTMLElement | null, id: NodeId): void {
    const at = element.nodeScreenPosition(id);
    const hero = element.closest<HTMLElement>(".ws-land-hero");
    if (at === undefined || box === null || hero === null) {
        return;
    }
    const area = element.getBoundingClientRect();
    const outer = hero.getBoundingClientRect();
    const demo = hero.querySelector(".ws-land-demo")?.getBoundingClientRect();
    const x0 = area.left - outer.left + at.x;
    const y0 = area.top - outer.top + at.y;
    const { offsetWidth: w, offsetHeight: h } = box;
    let x = x0 + at.radius + 14;
    if (x + w > hero.clientWidth - 12) {
        x = x0 - at.radius - 14 - w;
    }
    const top = demo === undefined ? 12 : demo.bottom - outer.top + 10;
    const bottom = area.bottom - outer.top - 12;
    box.style.left = `${String(Math.round(x))}px`;
    box.style.top = `${String(Math.round(Math.max(top, Math.min(bottom - h, y0 - h / 2))))}px`;
    box.style.visibility = at.visible ? "visible" : "hidden";
}

/**
 * A clicked node's card: its name, how connected it is, its community and who it links to.
 * @param props - Component props
 * @param props.card - The node's facts
 * @param props.boxRef - The card's box, which follows the node
 * @param props.onClose - Closes the card
 * @returns The card
 */
function NodeCard({
    card,
    boxRef,
    onClose,
}: Readonly<{
    card: CardFacts;
    boxRef: React.RefObject<HTMLDialogElement | null>;
    onClose: () => void;
}>): React.JSX.Element {
    const more = card.links - card.linked.length;
    return (
        <dialog open className="ws-land-info" ref={boxRef} aria-label="Node details">
            <UnstyledButton className="ws-land-info-x" aria-label="Close" onClick={onClose}>
                <GLYPHS.close aria-hidden />
            </UnstyledButton>
            <b>{card.name}</b>
            <p>
                <span className="ws-land-info-k">{card.links}</span> {card.links === 1 ? "connection" : "connections"}
            </p>
            {card.community === undefined ? null : (
                <p>
                    {card.community.color === undefined ? null : (
                        <span className="ws-land-info-dot" style={{ background: card.community.color }} />
                    )}
                    Community {card.community.rank} of {card.community.of}
                </p>
            )}
            {card.linked.length === 0 ? null : (
                <p>
                    Linked to {card.linked.join(", ")}
                    {more > 0 ? ` and ${String(more)} more` : ""}
                </p>
            )}
        </dialog>
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
        <UnstyledButton
            className="ws-land-chip"
            aria-pressed={pressed}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : onClick}
        >
            {icon}
            {children}
        </UnstyledButton>
    );
}
