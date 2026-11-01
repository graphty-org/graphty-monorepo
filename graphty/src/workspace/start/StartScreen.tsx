import "./start.css";

import { useFileDrop } from "@graphty/compact-mantine";
import {
    DATASET_DESCRIPTORS,
    type DatasetMeta,
    GENERATOR_DESCRIPTORS,
    type GeneratorDescriptor,
} from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Anchor, Button, Paper, Stack, Text, TextInput, UnstyledButton, useComputedColorScheme } from "@mantine/core";
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { ColorSchemeToggle } from "../../components/ColorSchemeToggle";
import { START_SAMPLES, type StartSample } from "../../data/sampleManifest";
import { onSiteConfig } from "../../siteConfig";
import { RecoveredWork } from "../autosave/RecoveredWork";
import { holdsModel } from "../canvas/models";
import { CommandButton } from "../frame/CommandButton";
import { GLYPHS } from "../glyphs";
import { count } from "../inspector/words";
import { UsageDataCard } from "../privacy/UsageDataCard";
import { openRecent } from "../project/actions";
import { type RecentProject, useRecentProjects } from "../project/recent";
import { RecentProjects } from "../project/RecentProjects";
import { agoWords } from "../project/words";
import type { WorkspaceStore } from "../state/store";
import { useAnnounceChange } from "../state/useAnnounceChange";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";
import lockupOnDark from "./brand/graphty-lockup-color-on-dark.svg";
import lockupOnLight from "./brand/graphty-lockup-color-on-light.svg";
import { HeroGraph, type HeroSample } from "./HeroGraph";
import { Groups } from "./icons";
import { countWords, fitsInBrowser, isLarge, megabytes } from "./library";
import { DatasetDialog, GeneratorDialog } from "./LibraryDialogs";
import { NETWORK_DIALOG } from "./NetworkDataDialog";
import { openDataset, openFiles, openGenerated, openModel, openSample, pictureOf } from "./open";

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

/** The graph-samples dataset each of the app's own four sample files is a copy of, by sample id. */
const OWN_COPIES: Readonly<Record<string, string>> = {
    "les-miserables": "les-miserables",
    karate: "karate",
    "college-football": "football",
    florentine: "florentine-families",
};

/**
 * The field each dataset comes from, for the tag on its tile and the library's field filter: this
 * page's grouping of graph-samples' catalog. A dataset not named here is filed under "Other".
 */
const FIELDS: Readonly<Record<string, string>> = {
    karate: "Social",
    "florentine-families": "Social",
    "davis-southern-women": "Social",
    "les-miserables": "Social",
    football: "Sports",
    // The app's own copies of football and florentine-families, by their sample ids.
    "college-football": "Sports",
    florentine: "Social",
    "campus-contacts": "Social",
    "graph-research": "Science",
    "marvel-films": "Culture",
    "paper-citations": "Science",
    "political-books": "Politics",
    dolphins: "Animals",
    "contiguous-usa": "Places",
    "knuth-miles": "Places",
    "celegans-neural": "Biology",
    "political-blogs": "Politics",
    openflights: "Places",
    "venice-transit": "Places",
    "yeast-perturbation": "Biology",
    "stelzl-interactome": "Biology",
    "wikipathways-senescence-autophagy": "Biology",
    "go-slim-generic": "Ontology",
    "road-ny": "Places",
    "com-dblp": "Science",
    "ogbn-arxiv": "Science",
    "go-basic": "Ontology",
    "disease-ontology": "Ontology",
    "bioplex3-hct116": "Biology",
};

/** The field of every generated graph, for the field filter. */
const GENERATED = "Generated";

/** A short title that says what each dataset is good for; the dataset's own name is the subline. */
const HOOKS: Readonly<Record<string, string>> = {
    karate: "A club that split in two",
    "florentine-families": "How the Medici brokered power",
    "davis-southern-women": "Who went to which party, 1930s",
    "les-miserables": "Who holds the novel together",
    football: "Conferences fall out of who played whom",
    "college-football": "Conferences fall out of who played whom",
    florentine: "How the Medici brokered power",
    "campus-contacts": "A week of who was near whom",
    "graph-research": "A research community grows",
    "marvel-films": "A film universe, release by release",
    "paper-citations": "Thirty years of citations",
    "political-books": "Left, right and the few in between",
    dolphins: "A pod with two social circles",
    "contiguous-usa": "Borders as a network",
    "knuth-miles": "128 cities, every driving distance",
    "celegans-neural": "The wiring of a whole nervous system",
    "political-blogs": "The 2004 blogosphere, split by party",
    openflights: "Every airline route on Earth",
    "venice-transit": "Every stop by bus, tram and boat",
    "yeast-perturbation": "Cytoscape's classic gene network",
    "stelzl-interactome": "Human proteins that bind each other",
    "wikipathways-senescence-autophagy": "A drawn pathway from NDEx",
    "go-slim-generic": "The Gene Ontology in miniature",
    "road-ny": "Every road in New York City",
    "com-dblp": "Who wrote papers with whom",
    "ogbn-arxiv": "What arXiv papers cite",
    "go-basic": "The whole Gene Ontology",
    "disease-ontology": "How human diseases are classified",
    "bioplex3-hct116": "Human proteins found together",
};

/** One tile in the sample library. */
interface SampleTile {
    readonly id: string;
    readonly name: string;
    /** The short title the tile leads with. */
    readonly hook: string;
    /** The field it comes from. */
    readonly field: string;
    readonly size: string;
    readonly sentence: string;
    /**
     * The address of a picture of the graph, when graph-samples publishes one. Asked for when the
     * tile draws: the address depends on the site's dataset address, which loads after this module.
     */
    readonly picture: () => string | undefined;
    /** A word on what opening it takes, for a large dataset. */
    readonly note: string | undefined;
    /** What the search box matches against. */
    readonly words: string;
    /** What a click does: open it now, or ask first. */
    readonly open: (library: LibraryActions) => void;
}

/** What a tile can do when it is clicked. */
interface LibraryActions {
    readonly store: WorkspaceStore;
    /** Shows what a large dataset takes to open, before it downloads. */
    readonly ask: (dataset: DatasetMeta) => void;
    /** Shows a generator's parameters. */
    readonly configure: (generator: GeneratorDescriptor) => void;
}

/**
 * The note on a large dataset's tile: its download.
 * @param dataset - The dataset.
 * @returns The words, or undefined for one that opens in a moment.
 */
function noteOf(dataset: DatasetMeta): string | undefined {
    if (!isLarge(dataset)) {
        return undefined;
    }
    return dataset.bytes === undefined ? "Large: slower to open" : `Large: ${megabytes(dataset.bytes)}, slower to open`;
}

/**
 * A dataset's size as a tile reads it: "77 nodes, 254 edges".
 * @param dataset - The dataset.
 * @returns The words.
 */
function sizeWords(dataset: DatasetMeta): string {
    return `${countWords(dataset.nodes)} nodes, ${countWords(dataset.edges)} edges`;
}

/**
 * The first sentence of a dataset's description.
 * @param text - The description.
 * @returns Its first sentence.
 */
function firstSentence(text: string): string {
    // A full stop after something other than a full stop: "E1 .. E14" does not end it.
    const end = text.search(/[^.]\.(\s|$)/);
    return end === -1 ? text : text.slice(0, end + 2);
}

/**
 * The sample library: the app's own samples first, then every other dataset in graph-samples'
 * catalog that graphty-element can open, in the catalog's order, then every generator. A dataset
 * past the element's published ceilings is left out: its tile could only open an empty graph.
 * @param samples - The app's own samples.
 * @param datasets - graph-samples' catalog.
 * @param generators - graph-samples' generators.
 * @returns The tiles.
 */
function sampleTiles(
    samples: readonly StartSample[],
    datasets: readonly DatasetMeta[],
    generators: readonly GeneratorDescriptor[],
): SampleTile[] {
    return [
        ...samples.map((sample) => {
            const dataset = datasets.find((each) => each.name === OWN_COPIES[sample.id]);
            const field = FIELDS[sample.id] ?? "Other";
            const hook = HOOKS[sample.id] ?? sample.name;
            return {
                id: sample.id,
                name: sample.name,
                hook,
                field,
                size: dataset === undefined ? sample.size : sizeWords(dataset),
                sentence: sample.sentence,
                picture: () => (dataset === undefined ? sample.picture : pictureOf(dataset)),
                note: undefined,
                words: `${sample.name} ${hook} ${field} ${sample.sentence}`.toLowerCase(),
                open: ({ store }: LibraryActions) => {
                    openSample(store, sample);
                },
            };
        }),
        ...datasets
            .filter((dataset) => !Object.values(OWN_COPIES).includes(dataset.name) && fitsInBrowser(dataset))
            .map((dataset) => ({
                id: dataset.name,
                name: dataset.title,
                hook: HOOKS[dataset.name] ?? dataset.title,
                field: FIELDS[dataset.name] ?? "Other",
                size: sizeWords(dataset),
                sentence: firstSentence(dataset.description),
                picture: () => pictureOf(dataset),
                note: noteOf(dataset),
                words: `${dataset.title} ${HOOKS[dataset.name] ?? ""} ${FIELDS[dataset.name] ?? "Other"} ${dataset.description}`.toLowerCase(),
                open: ({ store, ask }: LibraryActions) => {
                    if (isLarge(dataset)) {
                        ask(dataset);
                    } else {
                        openDataset(store, dataset);
                    }
                },
            })),
        ...generators.map((generator) => ({
            id: `generate-${generator.name}`,
            name: generator.plainName,
            hook: generator.plainName,
            field: GENERATED,
            size:
                generator.params.length === 0
                    ? "nothing to set"
                    : generator.params.map((param) => param.plainName).join(", "),
            sentence: generator.description,
            picture: () => pictureOf(generator),
            note: undefined,
            words: `${generator.plainName} ${generator.name} ${GENERATED} ${generator.description}`.toLowerCase(),
            open: ({ configure }: LibraryActions) => {
                configure(generator);
            },
        })),
    ];
}

/** The tiles, worked out once. */
const SAMPLE_TILES = sampleTiles(START_SAMPLES, DATASET_DESCRIPTORS, GENERATOR_DESCRIPTORS);

/** The fields the tiles come from, in the order they first appear. */
const SAMPLE_FIELDS = [...new Set(SAMPLE_TILES.map((tile) => tile.field))];

/** How many of the tiles are real networks. */
const DATASET_COUNT = SAMPLE_TILES.filter((tile) => tile.field !== GENERATED).length;

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
                void openRecent(workspace, entry);
            }}
        >
            {picture === undefined ? (
                <span className="ws-land-recent-pic ws-land-recent-none" aria-hidden>
                    <GLYPHS.noPicture />
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
                <GLYPHS.gridView aria-hidden />
                {layouts === undefined ? null : <b>{layouts}</b>} layouts
            </span>
            <span className="ws-land-it ws-land-vr">
                <Headset />
                2D, 3D, VR and AR
            </span>
            <span className="ws-land-it ws-land-gpu">
                <GLYPHS.gpu aria-hidden />
                GPU accelerated
            </span>
            <span className="ws-land-sp" />
            <a className="ws-land-dev" href={ELEMENT_DOCS}>
                <GLYPHS.developer aria-hidden />
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
 * A tile's picture, or a plain stand-in where graph-samples publishes none. Drawn again once the
 * site's configuration loads, which can move the picture to the site's own copy.
 * @param props - Component props
 * @param props.address - Works out the picture's address, or undefined
 * @returns The picture
 */
function TilePicture({ address }: Readonly<{ address: () => string | undefined }>): React.JSX.Element {
    const picture = useSyncExternalStore(onSiteConfig, address);
    return picture === undefined ? (
        <span className="ws-land-sample-pic ws-land-sample-none" aria-hidden>
            <GLYPHS.noPicture />
        </span>
    ) : (
        <img className="ws-land-sample-pic" src={picture} alt="" loading="lazy" />
    );
}

/**
 * One tile of the library.
 * @param props - Component props
 * @param props.tile - The tile
 * @param props.label - What it is called for a screen reader
 * @param props.onClick - What a click does
 * @returns The tile
 */
function LibraryTile({
    tile,
    label,
    onClick,
}: Readonly<{ tile: SampleTile; label: string; onClick: () => void }>): React.JSX.Element {
    const generated = tile.field === GENERATED;
    return (
        <UnstyledButton className="ws-land-sample" aria-label={label} title={tile.sentence} onClick={onClick}>
            <TilePicture address={tile.picture} />
            <span className="ws-land-sample-tag">
                {generated ? <GLYPHS.generated size={11} aria-hidden /> : null}
                {tile.field}
            </span>
            <span className="ws-land-sample-t">{tile.hook}</span>
            <span className="ws-land-sample-m">{generated ? tile.sentence : `${tile.name} -- ${tile.size}`}</span>
            {tile.note === undefined ? null : <span className="ws-land-sample-note">{tile.note}</span>}
        </UnstyledButton>
    );
}

/**
 * The sample library: every sample tile and every generator, and a box and a field filter that
 * narrow them.
 * @returns The section
 */
function SampleLibrary(): React.JSX.Element {
    const workspace = useWorkspace();
    const [text, setText] = useState("");
    const [field, setField] = useState("");
    const [view, setView] = useState<"grid" | "list">("grid");
    const [asking, setAsking] = useState<DatasetMeta | null>(null);
    const [configuring, setConfiguring] = useState<GeneratorDescriptor | null>(null);
    const actions: LibraryActions = { store: workspace.store, ask: setAsking, configure: setConfiguring };
    const query = text.trim().toLowerCase();
    const tiles = SAMPLE_TILES.filter(
        (tile) => (field === "" || tile.field === field) && (query === "" || tile.words.includes(query)),
    );
    const samples = tiles.filter((tile) => tile.field !== GENERATED);
    const generators = tiles.filter((tile) => tile.field === GENERATED);
    // How many the box and the field filter leave, said as they change; never on arrival.
    useAnnounceChange(`${count(tiles.length, "sample")} shown`);
    return (
        <section className="ws-land-band" id="ws-land-samples" aria-label="Sample library">
            <h2 className="ws-land-h2 cm-focus-inside" id="ws-land-samples-title" tabIndex={-1}>
                Sample library
            </h2>
            <p className="ws-land-intro">
                {DATASET_COUNT} real networks to explore, from a novel&apos;s characters to the world&apos;s airline
                routes, and {GENERATOR_DESCRIPTORS.length} ways to generate one.
            </p>
            <div className="ws-land-libhead">
                <TextInput
                    className="ws-land-search"
                    type="search"
                    aria-label="Search samples"
                    placeholder={`Search ${String(SAMPLE_TILES.length)} samples: karate, airline, protein, small world...`}
                    leftSection={<GLYPHS.quickActions size={15} aria-hidden />}
                    value={text}
                    onChange={(event) => {
                        setText(event.currentTarget.value);
                    }}
                />
                <fieldset className="ws-land-seg" aria-label="View">
                    <UnstyledButton
                        aria-label="Grid"
                        aria-pressed={view === "grid"}
                        onClick={() => {
                            setView("grid");
                        }}
                    >
                        <GLYPHS.gridView size={16} aria-hidden />
                    </UnstyledButton>
                    <UnstyledButton
                        aria-label="List"
                        aria-pressed={view === "list"}
                        onClick={() => {
                            setView("list");
                        }}
                    >
                        <GLYPHS.listView size={16} aria-hidden />
                    </UnstyledButton>
                </fieldset>
            </div>
            <fieldset className="ws-land-facets" aria-label="Field">
                {["", ...SAMPLE_FIELDS].map((each) => (
                    <UnstyledButton
                        key={each}
                        className="ws-land-facet"
                        aria-pressed={field === each}
                        onClick={() => {
                            setField(each);
                        }}
                    >
                        {each === "" ? "Any" : each}
                    </UnstyledButton>
                ))}
            </fieldset>
            {samples.length === 0 ? null : (
                <div className="ws-land-samples" data-view={view}>
                    {samples.map((tile) => (
                        <LibraryTile
                            key={tile.id}
                            tile={tile}
                            label={`Open the ${tile.name} sample: ${tile.hook}`}
                            onClick={() => {
                                tile.open(actions);
                            }}
                        />
                    ))}
                </div>
            )}
            {generators.length === 0 ? null : (
                <section aria-label="Generate a graph">
                    <h3 className="ws-land-h3">Generate a graph</h3>
                    <p className="ws-land-intro">
                        Build a network from a model instead: random, grown, planted with communities, or one of the
                        classic shapes. The same settings always build the same graph.
                    </p>
                    <div className="ws-land-samples" data-view={view}>
                        {generators.map((tile) => (
                            <LibraryTile
                                key={tile.id}
                                tile={tile}
                                label={`Generate a graph: ${tile.name}`}
                                onClick={() => {
                                    tile.open(actions);
                                }}
                            />
                        ))}
                    </div>
                </section>
            )}
            {tiles.length === 0 ? (
                <p className="ws-land-empty">
                    No sample matches &quot;{text}&quot;. Try a field, such as biology or places.
                </p>
            ) : null}
            <DatasetDialog
                dataset={asking}
                onClose={() => {
                    setAsking(null);
                }}
                onOpen={(dataset) => {
                    setAsking(null);
                    openDataset(workspace.store, dataset);
                }}
            />
            <GeneratorDialog
                generator={configuring}
                onClose={() => {
                    setConfiguring(null);
                }}
                onGenerate={(generator, params) => {
                    setConfiguring(null);
                    openGenerated(workspace.store, generator, params);
                }}
            />
        </section>
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
                {/* The footer's other "Docs" is the app's; this one names what it documents. */}
                <a href={ELEMENT_DOCS} target="_blank" rel="noopener noreferrer" aria-label="Docs for graphty-element">
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

    // The drop target is the whole window ("drop a file anywhere in this window"). graphty-element
    // says whether it is a model before it is read as graph data.
    const onDrop = useCallback(
        (files: File[]) => {
            void holdsModel(files).then((model) => {
                if (model) {
                    openModel(workspace.store, files[0]?.name ?? "Model", files);
                } else {
                    openFiles(workspace, files);
                }
            });
        },
        [workspace],
    );
    const { over: dragging } = useFileDrop("window", onDrop);

    const returning = recent.length > 0;
    const [latest] = recent;
    // Focus goes with the scroll, to the library's heading: not editable, so Home, End and the Page
    // keys still scroll the page, and the next Tab reaches the search.
    const showSamples = (): void => {
        document.getElementById("ws-land-samples-title")?.focus({ preventScroll: true });
        document.getElementById("ws-land-samples")?.scrollIntoView({ behavior: "smooth" });
    };
    const privacy = (
        <Text size="xs" c="dimmed" className="ws-land-privacy">
            <GLYPHS.private size={13} aria-hidden /> Or drop a file anywhere. It never leaves your computer.
        </Text>
    );
    const openButton = (variant: "primary" | "tint"): React.JSX.Element => (
        <Button
            className={variant === "primary" ? "ws-land-go ws-land-xl" : "ws-land-tint"}
            onClick={openDoor?.run}
            leftSection={variant === "tint" ? <GLYPHS.openFile size={16} aria-hidden /> : undefined}
        >
            {variant === "primary" ? (
                <span className="ws-land-xl-label">
                    <span className="ws-land-xl-top">
                        <GLYPHS.openFile size={18} aria-hidden />
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
            leftSection={<GLYPHS.add size={16} aria-hidden />}
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
                <Anchor
                    className="ws-land-tlink"
                    href="#ws-land-samples"
                    onClick={(event) => {
                        // Scrolled to, not navigated to, so the address keeps no #fragment.
                        event.preventDefault();
                        showSamples();
                    }}
                >
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
                <CommandButton id="settings.open" icon={<GLYPHS.settings size={18} aria-hidden />} />
            </header>

            <section className="ws-land-hero" aria-label="Start a project, over a live graph you can turn and explore">
                <div className="ws-land-over">
                    <Lockup className="ws-land-lockup" boxRef={lockup} />
                    <RecoveredWork />
                    {returning && latest !== undefined ? (
                        <>
                            <h1 className="ws-land-h1">Welcome back.</h1>
                            <Paper className="ws-land-launcher" withBorder>
                                <Button
                                    className="ws-land-go ws-land-resume"
                                    leftSection={<GLYPHS.go size={18} aria-hidden />}
                                    onClick={() => {
                                        void openRecent(workspace, latest);
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
                                                All projects <GLYPHS.go size={13} aria-hidden />
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
                                        leftSection={<GLYPHS.data size={16} aria-hidden />}
                                        aria-haspopup="dialog"
                                        onClick={() => {
                                            workspace.store.set({ dialog: NETWORK_DIALOG });
                                        }}
                                    >
                                        Open network data
                                    </Button>
                                    <Button
                                        className="ws-land-tint"
                                        leftSection={<GLYPHS.gridView size={16} aria-hidden />}
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
                {/* After the words in the markup, so Tab reaches "Open a file" before the demo graph and
                    its buttons; the CSS places each part, so the look is unchanged. */}
                <HeroGraph sample={HERO} background={CANVAS[scheme]} scheme={scheme} onSession={onSession} />
                <FactBar session={session} />
            </section>

            {returning ? (
                <section className="ws-land-band" id="ws-land-projects" aria-label="Your projects">
                    <h2 className="ws-land-h2">Your projects</h2>
                    <RecentProjects />
                </section>
            ) : null}

            <SampleLibrary />

            <div className="ws-land-usage">
                <UsageDataCard />
            </div>

            <PageFoot />

            {dragging ? (
                <div className="ws-start-drop" aria-hidden>
                    <Paper withBorder p="lg">
                        <Stack align="center" gap={4}>
                            <GLYPHS.upload size={24} aria-hidden />
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
