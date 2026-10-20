import "./start.css";

import type { GraphSession } from "@graphty/graphty-element/session";
import { Anchor, Button, Paper, Stack, Text, UnstyledButton, useComputedColorScheme } from "@mantine/core";
import {
    ArrowRight,
    Code,
    Database,
    Folder,
    LayoutGrid,
    Lock,
    Plus,
    Settings,
    Upload,
    Waypoints,
    Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { ColorSchemeToggle } from "../../components/ColorSchemeToggle";
import { START_SAMPLES } from "../../data/sampleManifest";
import { RecoveredWork } from "../autosave/RecoveredWork";
import { CommandButton } from "../frame/CommandButton";
import { UsageDataCard } from "../privacy/UsageDataCard";
import { locateRecent, openRecent } from "../project/actions";
import { type RecentProject, useRecentProjects } from "../project/recent";
import { RecentProjects } from "../project/RecentProjects";
import { agoWords } from "../project/words";
import { openServerForm } from "../server/commands";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";
import lockupOnDark from "./brand/graphty-lockup-color-on-dark.svg";
import lockupOnLight from "./brand/graphty-lockup-color-on-light.svg";
import { HeroGraph, type HeroSample } from "./HeroGraph";
import { Groups } from "./icons";
import { openFiles } from "./open";

/** Where the code and the license live. */
const GITHUB = "https://github.com/graphty-org/graphty-monorepo";
/** graphty-element's documentation: how to put a graph on your own site. */
const ELEMENT_DOCS = "https://graphty.app/docs/graphty-element/";
/** The documentation's landing page. */
const DOCS = "https://graphty.app/docs/";
/** graphty-element's license. */
const LICENSE = `${GITHUB}/blob/master/graphty-element/LICENSE`;

/** The canvas color behind the graph, per color scheme; the same as `--ws-land-canvas`. */
const CANVAS = { light: "#fbfbfd", dark: "#15171e" } as const;

/** The graph behind the start page: Les Miserables, and the two characters Shortest path joins. */
const HERO: HeroSample = (() => {
    const sample = START_SAMPLES.find((each) => each.id === "les-miserables") ?? START_SAMPLES[0];
    return { url: sample.url, name: sample.name, path: ["Napoleon", "Brujon"] };
})();

/**
 * The GitHub mark, in the text color: ink in light mode, white in dark.
 * @returns The mark
 */
function GitHubMark(): React.JSX.Element {
    return (
        <svg className="ws-land-octo" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
    );
}

/**
 * The horizontal lockup, in the color version for the scheme.
 * @param props - Component props
 * @param props.className - Where it sits
 * @param props.boxRef - Its box, for whoever watches where it is
 * @returns The lockup
 */
function Lockup({
    className,
    boxRef,
}: Readonly<{ className: string; boxRef?: React.RefObject<HTMLSpanElement | null> }>): React.JSX.Element {
    return (
        // Both carry the name: CSS shows one at a time, and a hidden image is not read out.
        <span className={className} ref={boxRef}>
            <img className="ws-land-logo-light" src={lockupOnLight} alt="graphty" />
            <img className="ws-land-logo-dark" src={lockupOnDark} alt="graphty" />
        </span>
    );
}

/**
 * When a project was saved, and its file where the browser keeps one: "football.graphty -- Oct 9".
 * @param entry - The project.
 * @param when - When, in words.
 * @returns The line.
 */
function savedWhere(entry: RecentProject, when: string): string {
    return entry.handle === undefined ? when : `${when} -- ${entry.handle.name}`;
}

/**
 * Time words as they read after "Saved": "yesterday", but still "Oct 9".
 * @param when - The words.
 * @returns The words in a sentence.
 */
function inSentence(when: string): string {
    return when === "Yesterday" || when === "Just now" ? when.toLowerCase() : when;
}

/**
 * An address for a stored picture, released when the picture changes or the tile goes.
 * @param blob - The picture, or undefined.
 * @returns Its address, or undefined.
 */
function usePicture(blob: Blob | undefined): string | undefined {
    const [url, setUrl] = useState<string | undefined>(undefined);
    useEffect(() => {
        if (blob === undefined) {
            setUrl(undefined);
            return undefined;
        }
        const next = URL.createObjectURL(blob);
        setUrl(next);
        return () => {
            URL.revokeObjectURL(next);
        };
    }, [blob]);
    return url;
}

/**
 * One recent project on the returning card: a click reopens it, or asks for the file where the
 * browser keeps no handle.
 * @param props - Component props
 * @param props.entry - The project
 * @returns The tile
 */
function RecentTile({ entry }: Readonly<{ entry: RecentProject }>): React.JSX.Element {
    const workspace = useWorkspace();
    const picture = usePicture(entry.thumbnail);
    return (
        <UnstyledButton
            className="ws-land-recent"
            aria-label={`Open ${entry.name}`}
            onClick={() => {
                void (entry.handle === undefined ? locateRecent(workspace, entry) : openRecent(workspace, entry));
            }}
        >
            {picture === undefined ? (
                <span className="ws-land-recent-pic ws-land-recent-none" aria-hidden>
                    <Waypoints />
                </span>
            ) : (
                <img className="ws-land-recent-pic" src={picture} alt="" />
            )}
            <span className="ws-land-recent-body">
                <b>{entry.name}</b>
                <small>
                    {entry.handle === undefined ? agoWords(entry.at) : `${entry.handle.name} -- ${agoWords(entry.at)}`}
                </small>
            </span>
        </UnstyledButton>
    );
}

/**
 * The counts in the bottom bar, read from graphty-element's catalog once the graph is up.
 * @param props - Component props
 * @param props.session - The hero graph's session, or null while it loads
 * @returns The bar
 */
function FactBar({ session }: Readonly<{ session: GraphSession | null }>): React.JSX.Element {
    const algorithms = session?.catalog.algorithms().length;
    const layouts = session?.catalog.layouts().length;
    return (
        <aside className="ws-land-strip" aria-label="graphty at a glance">
            <a className="ws-land-it ws-land-oss" href={GITHUB} target="_blank" rel="noopener noreferrer">
                <GitHubMark />
                MIT licensed <span>on GitHub</span>
            </a>
            <span className="ws-land-it">
                <Groups />
                {algorithms === undefined ? null : <b>{algorithms}</b>} algorithms
            </span>
            <span className="ws-land-it">
                <LayoutGrid aria-hidden />
                {layouts === undefined ? null : <b>{layouts}</b>} layouts
            </span>
            <span className="ws-land-it ws-land-vr">
                <Headset />
                2D, 3D, VR and AR
            </span>
            <span className="ws-land-it ws-land-gpu">
                <Zap aria-hidden />
                GPU accelerated
            </span>
            <span className="ws-land-sp" />
            <a className="ws-land-dev" href={ELEMENT_DOCS}>
                <Code aria-hidden />
                Put it on your own site
            </a>
        </aside>
    );
}

/**
 * A headset glyph for the VR and AR fact.
 * @returns The glyph
 */
function Headset(): React.JSX.Element {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4l-2-3h-2l-2 3H5a2 2 0 0 1-2-2z" />
            <circle cx="8" cy="11.5" r="1.5" />
            <circle cx="16" cy="11.5" r="1.5" />
        </svg>
    );
}

/**
 * The foot of the page: the formats it opens, the license, the code and the docs.
 * @returns The footer
 */
function PageFoot(): React.JSX.Element {
    return (
        <footer className="ws-land-foot">
            <span>
                Opens <b>Gephi</b> (GEXF), <b>Cytoscape</b> (CYS, CX2), <b>GraphML</b>, <b>CSV</b>, GML, DOT and more.
            </span>
            <span>
                Free and open source,{" "}
                <a href={LICENSE} target="_blank" rel="noopener noreferrer">
                    MIT licensed
                </a>{" "}
                &middot;{" "}
                <a href={GITHUB} target="_blank" rel="noopener noreferrer">
                    GitHub
                </a>{" "}
                &middot;{" "}
                <a href={DOCS} target="_blank" rel="noopener noreferrer">
                    Docs
                </a>{" "}
                &middot; Put it on your own site: <code>npm i @graphty/graphty-element</code>{" "}
                <a href={ELEMENT_DOCS} target="_blank" rel="noopener noreferrer">
                    Docs
                </a>
            </span>
        </footer>
    );
}

/** The sticky header's height, in CSS pixels (start.css, `.ws-land-top`). */
const HEADER_HEIGHT = 52;

/**
 * Whether the big lockup has scrolled up under the header, so the header shows its own small one.
 * Read from the scroll, not an IntersectionObserver: an observer also fires when the window
 * shrinks (a screenshot tool sets it to 1 x 1 for a moment), and could leave the header showing
 * its lockup with the page at the top.
 * @param lockup - The big lockup.
 * @returns True once it has.
 */
function useScrolledPast(lockup: React.RefObject<HTMLElement | null>): boolean {
    const [past, setPast] = useState(false);
    useEffect(() => {
        const target = lockup.current;
        if (target === null) {
            return undefined;
        }
        const read = (): void => {
            setPast(target.getBoundingClientRect().bottom <= HEADER_HEIGHT);
        };
        read();
        // Captured, so a scroll of whichever box holds the page is heard.
        document.addEventListener("scroll", read, { capture: true, passive: true });
        return () => {
            document.removeEventListener("scroll", read, { capture: true });
        };
    }, [lockup]);
    return past;
}

/**
 * The start page, shown whenever no project is open: the graphty lockup, the headline and the
 * launcher over a live graph drawn by graphty-element, and a bar of facts at the foot. A first visit
 * gets Open a file, Open network data, Samples and New project; a returning reader gets Resume, their
 * recent projects, Open a file and New project. A file dropped anywhere on it opens.
 * @returns The start page
 */
export function StartScreen(): React.JSX.Element {
    const workspace = useWorkspace();
    const scheme = useComputedColorScheme("dark");
    const recent = useRecentProjects();
    const openDoor = useCommand("file.open");
    const newDoor = useCommand("project.new");
    const [dragging, setDragging] = useState(false);
    const [session, setSession] = useState<GraphSession | null>(null);
    const onSession = useCallback((next: GraphSession) => {
        setSession(next);
    }, []);
    const lockup = useRef<HTMLSpanElement>(null);
    const scrolled = useScrolledPast(lockup);

    // The page scrolls while it is up (start.css, html.ws-land-page); the workspace never does.
    useEffect(() => {
        document.documentElement.classList.add("ws-land-page");
        return () => {
            document.documentElement.classList.remove("ws-land-page");
        };
    }, []);

    // The drop target is the whole window ("drop a file anywhere in this window"), so the
    // listeners go on globalThis (the window) rather than on an element.
    useEffect(() => {
        const over = (event: DragEvent): void => {
            event.preventDefault();
            setDragging(true);
        };
        const leave = (event: DragEvent): void => {
            if (event.relatedTarget === null) {
                setDragging(false);
            }
        };
        const drop = (event: DragEvent): void => {
            event.preventDefault();
            setDragging(false);
            openFiles(workspace, [...(event.dataTransfer?.files ?? [])]);
        };
        globalThis.addEventListener("dragover", over);
        globalThis.addEventListener("dragleave", leave);
        globalThis.addEventListener("drop", drop);
        return () => {
            globalThis.removeEventListener("dragover", over);
            globalThis.removeEventListener("dragleave", leave);
            globalThis.removeEventListener("drop", drop);
        };
    }, [workspace]);

    const returning = recent.length > 0;
    const [latest] = recent;
    // The one Samples dialog, the same one Sources "+" opens in a project.
    const showSamples = (): void => {
        workspace.store.set({ dialog: "samples" });
    };
    const privacy = (
        <Text size="xs" c="dimmed" className="ws-land-privacy">
            <Lock size={13} aria-hidden /> Or drop a file anywhere. It never leaves your computer.
        </Text>
    );
    const openButton = (variant: "primary" | "tint"): React.JSX.Element => (
        <Button
            className={variant === "primary" ? "ws-land-go ws-land-xl" : "ws-land-tint"}
            onClick={openDoor?.run}
            leftSection={variant === "tint" ? <Folder size={16} aria-hidden /> : undefined}
        >
            {variant === "primary" ? (
                <span className="ws-land-xl-label">
                    <span className="ws-land-xl-top">
                        <Folder size={18} aria-hidden />
                        Open a file
                    </span>
                    <span className="ws-land-xl-sub">CSV, GraphML, GEXF, Cytoscape, or a saved project</span>
                </span>
            ) : (
                "Open a file"
            )}
        </Button>
    );
    const newButton = (
        <Button
            variant="default"
            className="ws-land-plain"
            leftSection={<Plus size={16} aria-hidden />}
            onClick={newDoor?.run}
        >
            New project
        </Button>
    );

    return (
        <div className="ws-land" data-scheme={scheme}>
            <header className="ws-land-top" data-scrolled={scrolled || undefined}>
                <Anchor
                    className="ws-land-toplogo"
                    href="#"
                    aria-label="graphty, back to the top"
                    tabIndex={scrolled ? undefined : -1}
                    onClick={(event) => {
                        event.preventDefault();
                        globalThis.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                >
                    <Lockup className="ws-land-toplockup" />
                </Anchor>
                <span className="ws-land-grow" />
                <Anchor component="button" className="ws-land-tlink" onClick={showSamples}>
                    Samples
                </Anchor>
                <Anchor className="ws-land-tlink" href={DOCS}>
                    Docs
                </Anchor>
                <Anchor className="ws-land-tlink" href={ELEMENT_DOCS}>
                    For developers
                </Anchor>
                <Anchor className="ws-land-tlink ws-land-gh" href={GITHUB} target="_blank" rel="noopener noreferrer">
                    <GitHubMark />
                    GitHub
                </Anchor>
                <ColorSchemeToggle />
                <CommandButton id="settings.open" icon={<Settings size={18} aria-hidden />} />
            </header>

            <section className="ws-land-hero" aria-label="Start a project, over a live graph you can turn and explore">
                <HeroGraph sample={HERO} background={CANVAS[scheme]} scheme={scheme} onSession={onSession} />
                <div className="ws-land-over">
                    <Lockup className="ws-land-lockup" boxRef={lockup} />
                    <RecoveredWork />
                    {returning && latest !== undefined ? (
                        <>
                            <h1 className="ws-land-h1">Welcome back.</h1>
                            <Paper className="ws-land-launcher" withBorder>
                                <Button
                                    className="ws-land-go ws-land-resume"
                                    leftSection={<ArrowRight size={18} aria-hidden />}
                                    onClick={() => {
                                        void (latest.handle === undefined
                                            ? locateRecent(workspace, latest)
                                            : openRecent(workspace, latest));
                                    }}
                                >
                                    <span className="ws-land-xl-label">
                                        <span>Resume {latest.name}</span>
                                        <span className="ws-land-xl-sub">
                                            Saved {savedWhere(latest, inSentence(agoWords(latest.at)))}
                                        </span>
                                    </span>
                                </Button>
                                {recent.length > 1 ? (
                                    <div>
                                        <div className="ws-land-lh">
                                            <span>Recent projects</span>
                                            <Anchor
                                                component="button"
                                                size="sm"
                                                onClick={() => {
                                                    document
                                                        .getElementById("ws-land-projects")
                                                        ?.scrollIntoView({ behavior: "smooth" });
                                                }}
                                            >
                                                All projects <ArrowRight size={13} aria-hidden />
                                            </Anchor>
                                        </div>
                                        <div className="ws-land-recents">
                                            {recent.slice(1, 4).map((entry) => (
                                                <RecentTile key={entry.id} entry={entry} />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                                <div className="ws-land-more">
                                    {openButton("tint")}
                                    {newButton}
                                </div>
                                {privacy}
                            </Paper>
                        </>
                    ) : (
                        <>
                            <h1 className="ws-land-h1">
                                Analyze any network.<em>Free and open source.</em>
                            </h1>
                            <p className="ws-land-lede">
                                Lay it out, measure it and explore it in your browser. Nothing to install.
                            </p>
                            <Paper className="ws-land-launcher" withBorder>
                                {openButton("primary")}
                                <div className="ws-land-more">
                                    <Button
                                        className="ws-land-tint"
                                        leftSection={<Database size={16} aria-hidden />}
                                        onClick={() => {
                                            openServerForm(workspace.store);
                                        }}
                                    >
                                        Open network data
                                    </Button>
                                    <Button
                                        className="ws-land-tint"
                                        leftSection={<LayoutGrid size={16} aria-hidden />}
                                        onClick={showSamples}
                                    >
                                        Samples
                                    </Button>
                                    <div className="ws-land-wide">{newButton}</div>
                                </div>
                                {privacy}
                            </Paper>
                        </>
                    )}
                </div>
                <FactBar session={session} />
            </section>

            {returning ? (
                <section className="ws-land-band" id="ws-land-projects" aria-label="Your projects">
                    <h2 className="ws-land-h2">Your projects</h2>
                    <RecentProjects />
                </section>
            ) : null}

            <div className="ws-land-usage">
                <UsageDataCard />
            </div>

            <PageFoot />

            {dragging ? (
                <div className="ws-start-drop" aria-hidden>
                    <Paper withBorder p="lg">
                        <Stack align="center" gap={4}>
                            <Upload size={24} aria-hidden />
                            <Text fw={600}>Drop to open</Text>
                            <Text size="xs" c="dimmed">
                                The file is read here and never uploaded.
                            </Text>
                        </Stack>
                    </Paper>
                </div>
            ) : null}
        </div>
    );
}
