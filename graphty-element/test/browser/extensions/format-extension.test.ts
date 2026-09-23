/**
 * @file A third party's file format, and whether the element loads it the way it loads its own.
 *
 * WHAT A FILE FORMAT IS HERE, for a reader who has never opened this package. graphty-element
 * reads a graph out of bytes by handing them to a "data source": one class that understands one
 * file format, parses it, and hands back plain node and edge records a chunk at a time. Seven ship
 * with the element -- JSON, GraphML, GEXF, CSV, GML, DOT and Pajek -- and every one of them is a
 * subclass of the same `DataSource` base that is published to third parties. Registering a
 * subclass files the reader under a name AND publishes the format's description, which is what
 * puts it in the catalogue a picker is built from and in the detection a dropped file goes
 * through. A host then reaches it by name -- `element.dataSource`, `addDataFromSource` -- or by
 * handing the element a file and letting it work the format out.
 *
 * WHY THAT MATTERS TO SOMEONE OUTSIDE. A graph almost never starts life in one of those seven
 * formats. It starts in whatever a company's own service already emits. If the only way to get it
 * on screen is to convert it first, the element has pushed a parser and a streaming loader back
 * onto the consumer -- which is precisely the work the element exists to own.
 *
 * WHAT THIS FILE PROVES. That a format nobody here has heard of gets what the seven built-in
 * formats get, and not merely the part that is easy. The main extension below is a fictional
 * "roster" format: one verb per line, `person <id> <team> <score>` and `knows <a> <b> <bond>`,
 * with an optional `roster directed` header. It is deliberately trivial to parse, because what is
 * under test is never the parsing. What is under test is everything the element wraps around a
 * parser: appearing in the catalogue and being found by name and by extension, being recognised
 * from a file name and from a file's first bytes with no format argument at all, streaming chunk
 * by chunk into a graph that grows as they arrive, progress and completion reported to the host
 * under the format's own name, per-record validation that drops a bad row instead of the whole
 * file, a host-set error ceiling that stops a hopeless load, options published as data a host can
 * render a form from and checked against that same declaration, failures that arrive as coded
 * errors a consumer can switch on, the direction the file states reaching the graph, and the same
 * three inputs the built-ins accept (a string, a File and a URL).
 *
 * THREE MORE EXTENSIONS APPEAR BELOW, and each exists for one question detection raises that one
 * format cannot answer: an XML dialect that claims `.xml` alongside GraphML and GEXF, so two
 * formats claiming one extension have to be told apart by content; a format whose sniffer claims
 * every file, so it can be shown never taking one the element already reads; and a format whose
 * sniffer throws, so a broken guess can be shown to be an answer rather than a failed import.
 *
 * ONE STATED LIMIT, so it is found as a decision rather than as an absence. An import cannot be
 * cancelled part-way through -- not this one, and not any of the element's own seven, which carry
 * no cancellation seam either. Parity holds because there is nothing to be at parity with, and
 * there is no test below for it because a test that passes whichever way the code goes is worth
 * nothing.
 *
 * EVERY IMPORT BELOW IS ONE A CUSTOMER COULD WRITE. The relative paths are this repository
 * reaching its own published entry points: `../../../extend` is
 * `@graphty/graphty-element/extend`, `../../../catalog` is `@graphty/graphty-element/catalog`,
 * `../../../index.js` is `@graphty/graphty-element`, `../../../schema` is
 * `@graphty/graphty-element/schema` and `../../../session` is
 * `@graphty/graphty-element/session`. Nothing here reaches into `src/`, and no part of WRITING A
 * FORMAT casts: the records the format produces go through `DataSource.toRecord`, which is where
 * the element now keeps the one cast a branded record used to force on every format author, and
 * each reader's constructor declares the config it accepts instead of narrowing `object` with an
 * `as`. The casts that remain below are the DOM's own -- `createElement` to the element's type
 * and an `Event` to its `CustomEvent` -- which every page that listens for an event writes, and
 * a `catch` binding, which is `unknown` by language rule. None of them is the element's to fix.
 */

import { afterAll, afterEach, assert, beforeEach, describe, it } from "vitest";
import { z } from "zod/v4";

import { formatDescriptor, formatsForExtension } from "../../../catalog";
import {
    type BaseDataSourceConfig,
    clearRegisteredFormatsForTesting,
    DataSource,
    type DataSourceChunk,
    detectFormat,
    detectFormats,
    type FormatDescriptor,
    GraphtyError,
    isGraphtyError,
} from "../../../extend";
/*
 * `Graphty` is imported as a value, not as a type, and that is load-bearing: importing the
 * package is what defines the `<graphty-element>` custom element, and a module whose every
 * binding is type-only is erased before it can do that.
 */
import {
    type DataLoadingCompleteEvent,
    type DataLoadingErrorEvent,
    type DataLoadingErrorSummaryEvent,
    type DataLoadingProgressEvent,
    type GraphErrorEvent,
    Graphty,
} from "../../../index.js";
import type { AdHocData } from "../../../schema";
import type { LayerSpec, StyleChange } from "../../../session";

// -------------------------------------------------------------------------------------------
// The extension: a format the element has never heard of
// -------------------------------------------------------------------------------------------

/** The name the format registers under, and the name a host asks for it by. */
const ROSTER_FORMAT = "roster";

/**
 * What a host may pass when it asks for this format.
 *
 * The members come from the element: `data` / `file` / `url` and `chunkSize` / `errorLimit` are
 * declared by `BaseDataSourceConfig` and are honoured by the base class, so a format author
 * writes none of the code behind them. `scoreScale` is this format's own, and it is here to prove
 * that a host can pass a source an option the element knows nothing about -- a real format needs
 * that for a delimiter, a projection, a credential.
 */
interface RosterConfig extends BaseDataSourceConfig {
    /** Multiplies every score as it is parsed, standing in for any format-specific knob. */
    scoreScale?: number;
}

/**
 * What the catalogue publishes about the roster format.
 *
 * This is plain data of a type the element already publishes, and it is everything a file picker,
 * a drop target and an import dialog need: what the format is called in words, what its files are
 * called, what a server calls it, whether it can be read and written, and what can be configured
 * about reading it. `scoreScale` is declared here once and is therefore the same declaration the
 * catalogue hands a form, the same one defaults are filled from, and the same one a bad value is
 * refused against.
 */
const ROSTER_DESCRIPTOR: FormatDescriptor = {
    id: ROSTER_FORMAT,
    plainName: "Team Roster",
    extensions: [".roster"],
    mimeTypes: ["text/vnd.acme.roster"],
    canImport: true,
    canExport: false,
    options: [
        {
            name: "scoreScale",
            plainName: "Score Multiplier",
            technicalName: "scoreScale",
            type: "number",
            default: 1,
            min: 0.1,
            max: 1000,
            description: "Multiplies every score in the file as it is read.",
        },
    ],
};

/**
 * Run just before each chunk leaves the roster source, when a test has set it.
 *
 * A streaming source is defined by what happens BETWEEN chunks, and a test can only observe that
 * from inside the gap. It is a module-level hook rather than a member of {@link RosterConfig}
 * because the roster format declares its options to the catalogue and refuses one it did not
 * declare, and a test hook is not an option any host would ever set.
 */
let beforeChunk: ((chunkIndex: number) => void) | null = null;

/** What the roster text said about its own direction, when it said anything. */
interface RosterDirection {
    /** True when the header line said `directed`. */
    readonly directed: boolean;
    /** The words in the file that said so, for the element's log line. */
    readonly statedBy: string;
}

/** Everything one roster file turned into. */
interface ParsedRoster {
    nodes: AdHocData[];
    edges: AdHocData[];
    /** Null when the file carried no header, which leaves the element's own setting standing. */
    direction: RosterDirection | null;
}

/**
 * The error a roster reader raises when the bytes it was handed are not a roster.
 *
 * A consumer switches on `code`, never on the message, and reads the facts out of `details` --
 * which is why the line number is a field rather than something to be picked out of a sentence.
 * @param message - What went wrong, in words.
 * @param line - The line of the file it went wrong on, counting from one.
 * @returns The error to throw.
 */
function rosterParseFailure(message: string, line: number): GraphtyError {
    return new GraphtyError({
        code: "E_PARSE_FAILED",
        message,
        source: "data",
        details: { format: ROSTER_FORMAT, line },
    });
}

/**
 * Turn roster text into the plain records the element ingests.
 * @param text - The whole file.
 * @param scoreScale - The multiplier from the host's options.
 * @returns The node and edge records, unvalidated -- validation is the element's job, below --
 * and whatever the file said about its own direction.
 * @throws A `GraphtyError` with `E_PARSE_FAILED` for a line that is not roster at all.
 */
function parseRoster(text: string, scoreScale: number): ParsedRoster {
    const nodes: AdHocData[] = [];
    const edges: AdHocData[] = [];
    let direction: RosterDirection | null = null;
    const lines = text.split("\n");

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index].trim();

        if (line === "" || line.startsWith("#")) {
            continue;
        }

        const [verb, first, second, third, fourth, fifth, sixth] = line.split(/\s+/);

        if (verb === "roster") {
            if (first !== "directed" && first !== "undirected") {
                throw rosterParseFailure(
                    `roster line ${index + 1} declares the roster "${first}", and a roster is either ` +
                        '"directed" or "undirected"',
                    index + 1,
                );
            }

            direction = { directed: first === "directed", statedBy: `roster ${first}` };
        } else if (verb === "person") {
            // A person line is short on purpose when a test wants a record the schema will reject:
            // `second` and `third` come back undefined and the node schema refuses the record.
            // The three optional numbers after the score are where the file puts the person, and
            // `position` is the key the element reads as a node's seeded coordinates -- so a file
            // that arrives arranged arrives arranged, with no placement code in the format.
            const placed = fourth !== undefined && fifth !== undefined && sixth !== undefined;

            nodes.push(
                DataSource.toRecord({
                    id: first,
                    team: second,
                    score: Number(third) * scoreScale,
                    ...(placed ? { position: { x: Number(fourth), y: Number(fifth), z: Number(sixth) } } : {}),
                }),
            );
        } else if (verb === "knows") {
            // The fourth field is the link's strength as a number, and the element reads it as the
            // edge's weight because `weight` is the key the element's own weight path names.
            edges.push(
                DataSource.toRecord({
                    src: first,
                    dst: second,
                    bond: third,
                    ...(fourth === undefined ? {} : { weight: Number(fourth) }),
                }),
            );
        } else {
            throw rosterParseFailure(
                `roster line ${index + 1} begins with "${verb}", which is none of "roster", "person" ` +
                    'or "knows"',
                index + 1,
            );
        }
    }

    return { nodes, edges, direction };
}

/**
 * The extension itself: about sixty lines, which is the point.
 *
 * Fetching the bytes, retrying a failed fetch, splitting the records into chunks, validating each
 * record against the schemas below, collecting the rejects, publishing the description to the
 * catalogue and checking the host's options against it are all inherited. What this class adds is
 * the parser and nothing else.
 */
class RosterDataSource extends DataSource {
    /** The name a host asks for this format by, and the name the reader is filed under. */
    static type = ROSTER_FORMAT;

    /** What the catalogue publishes about it. Registration refuses a reader without one. */
    static descriptor: FormatDescriptor = ROSTER_DESCRIPTOR;

    /**
     * Recognise a roster by its first bytes, so a file whose name says nothing still loads.
     *
     * Asked only after every one of the element's own sniffers has been asked, which is what
     * stops a third party's guess from taking a file the element already reads.
     * @param sample - The first bytes of the file, as text.
     * @returns Whether this is a roster.
     */
    static detect = (sample: string): boolean => /^(roster|person|knows)\s/m.test(sample);

    /**
     * Every person the element accepts. A row that fails this is dropped and reported, rather
     * than taking the rest of the file down with it.
     */
    nodeSchema = z.object({
        id: z.string(),
        team: z.string(),
        score: z.number(),
    });

    /** Every link the element accepts. */
    edgeSchema = z.object({
        src: z.string(),
        dst: z.string(),
        bond: z.string(),
        weight: z.number().optional(),
    });

    readonly #config: RosterConfig;

    /** The score multiplier after the element filled in the declared default and checked it. */
    readonly #scoreScale: number;

    /**
     * The constructor declares the config THIS format accepts, rather than taking the registry's
     * `object` and casting it.
     *
     * A cast here would be the contract failing: a format author who has to write `as` to read
     * their own options is defeating the type system on the element's behalf. They do not have to
     * -- `DataSource.register` accepts a subclass whose constructor narrows the argument, exactly
     * as an overriding member narrows one anywhere else in TypeScript -- and the worked example a
     * format author lifts from should show the way that needs no cast.
     * @param opts - What the host passed this format.
     */
    constructor(opts: RosterConfig) {
        super(opts.errorLimit ?? 100, opts.chunkSize ?? DataSource.DEFAULT_CHUNK_SIZE);
        this.#config = opts;

        // The element checks what the host passed against the options this format DECLARED, fills
        // in the declared defaults, and refuses a name this format does not have or a value
        // outside the range it published. One declaration, so the form a host renders and the
        // values the reader accepts cannot drift apart.
        const resolved = this.resolveOptions(opts);
        this.#scoreScale = typeof resolved.scoreScale === "number" ? resolved.scoreScale : 1;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.#config;
    }

    /**
     * Hand the element the roster a chunk at a time.
     * @yields One chunk of records per call, smallest unit the element will ingest.
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const text = await this.getContent();
        const { nodes, edges, direction } = parseRoster(text, this.#scoreScale);

        // Told before the first chunk, because the element's builder accepts a direction only
        // while it holds no edges. A file with no header says nothing, and a source that says
        // nothing leaves the element's own configuration standing.
        if (direction !== null) {
            this.declareDirection(direction.directed, direction.statedBy);
        }

        let chunkIndex = 0;

        for (const chunk of this.chunkData(nodes, edges)) {
            beforeChunk?.(chunkIndex);
            chunkIndex++;
            yield chunk;
        }
    }
}

DataSource.register(RosterDataSource);

// -------------------------------------------------------------------------------------------
// Three more formats, each answering one question detection raises
// -------------------------------------------------------------------------------------------

/** The name the XML dialect registers under. */
const ACME_XML_FORMAT = "acme-xml";

/**
 * A third party's XML dialect, which claims `.xml` exactly as GraphML and GEXF already do.
 *
 * It is here because an extension two formats share is a real ambiguity, and how it is resolved
 * is the difference between a plugin being a first-class format and being a special case: the
 * element used to tell GraphML and GEXF apart inside a private function that compared two
 * hard-coded namespace strings, and a third format could not be added to it. Now each claimant is
 * asked its own `detect`, so this format is told apart from the other two by the same rule they
 * are told apart by each other.
 */
class AcmeXmlDataSource extends DataSource {
    /** The name a host asks for this format by. */
    static type = ACME_XML_FORMAT;

    /** What the catalogue publishes about it. */
    static descriptor: FormatDescriptor = {
        id: ACME_XML_FORMAT,
        plainName: "Acme Roster XML",
        extensions: [".xml", ".acmex"],
        mimeTypes: ["application/vnd.acme.roster+xml"],
        canImport: true,
        canExport: false,
        options: [],
    };

    /**
     * Recognise the dialect by its root element, which is what tells it from the other two XML
     * formats that claim the same extension.
     * @param sample - The first bytes of the file, as text.
     * @returns Whether this is an Acme roster.
     */
    static detect = (sample: string): boolean => sample.includes("<acme-roster");

    readonly #config: BaseDataSourceConfig;

    /**
     * @param opts - What the host passed this format. Declared rather than cast, for the reason
     *   the roster reader's own constructor gives.
     */
    constructor(opts: BaseDataSourceConfig) {
        super(opts.errorLimit ?? 100, opts.chunkSize ?? DataSource.DEFAULT_CHUNK_SIZE);
        this.#config = opts;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.#config;
    }

    /**
     * Read the people and the links out of the dialect.
     * @yields One chunk of records per call.
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const text = await this.getContent();

        const nodes = DataSource.toRecords(
            [...text.matchAll(/<person id="([^"]+)" team="([^"]+)"\s*\/>/g)].map((match) => ({
                id: match[1],
                team: match[2],
            })),
        );
        const edges = DataSource.toRecords(
            [...text.matchAll(/<knows from="([^"]+)" to="([^"]+)"\s*\/>/g)].map((match) => ({
                src: match[1],
                dst: match[2],
            })),
        );

        yield* this.chunkData(nodes, edges);
    }
}

DataSource.register(AcmeXmlDataSource);

/** The name the claims-everything format registers under. */
const GREEDY_FORMAT = "acme-greedy";

/**
 * A format whose sniffer claims every file there is.
 *
 * Registered so that the promise "a third party's sniffer is asked only after every one of the
 * element's own" can be shown holding rather than asserted. A plugin that could out-guess a
 * built-in would be able to take over reading JSON from any page that imported it, which is a
 * thing a consumer could not debug and did not ask for.
 */
class GreedyDataSource extends RosterDataSource {
    /** The name a host asks for this format by. */
    static override type = GREEDY_FORMAT;

    /** What the catalogue publishes about it. */
    static override descriptor: FormatDescriptor = {
        ...ROSTER_DESCRIPTOR,
        id: GREEDY_FORMAT,
        plainName: "Acme Everything",
        extensions: [".acmegreedy"],
        mimeTypes: ["text/vnd.acme.greedy"],
    };

    /**
     * Claim every file.
     * @returns Always true.
     */
    static override detect = (): boolean => true;
}

DataSource.register(GreedyDataSource);

/** The name the broken-sniffer format registers under. */
const BROKEN_SNIFFER_FORMAT = "acme-broken";

/**
 * A format whose sniffer throws.
 *
 * A sniffer is a guess about somebody else's bytes, and a guess that fails is an answer -- "no" --
 * rather than an import that fails. Registered so that the catching is exercised rather than
 * described.
 */
class BrokenSnifferDataSource extends RosterDataSource {
    /** The name a host asks for this format by. */
    static override type = BROKEN_SNIFFER_FORMAT;

    /** What the catalogue publishes about it. */
    static override descriptor: FormatDescriptor = {
        ...ROSTER_DESCRIPTOR,
        id: BROKEN_SNIFFER_FORMAT,
        plainName: "Acme Broken",
        extensions: [".acmebroken"],
        mimeTypes: ["text/vnd.acme.broken"],
    };

    /** Fail instead of answering, which the element has to treat as "no". */
    static override detect = (): boolean => {
        throw new Error("this sniffer is broken on purpose");
    };
}

DataSource.register(BrokenSnifferDataSource);

// -------------------------------------------------------------------------------------------
// The data, and the counts every assertion is checked against
// -------------------------------------------------------------------------------------------

/**
 * Six people in three teams of three different sizes, in a line of five links.
 *
 * The team sizes are 3, 2 and 1 rather than 2, 2 and 2 so that a selector which quietly matched
 * the wrong team could not hide behind an equal count. The scores are chosen the same way: the
 * number above two is four, which is not the same as any team size, any node count or any edge
 * count in this file.
 */
const ROSTER = [
    "# A team roster: one person or one link per line.",
    "person ada Engineering 9",
    "person brian Engineering 4",
    "person cleo Engineering 7",
    "person dev Design 2",
    "person edith Design 5",
    "person felix Research 1",
    "",
    "knows ada brian strong",
    "knows brian cleo weak",
    "knows cleo dev strong",
    "knows dev edith weak",
    "knows edith felix strong",
].join("\n");

/** Everyone in {@link ROSTER}, sorted, which is how node ids are compared below. */
const PEOPLE = ["ada", "brian", "cleo", "dev", "edith", "felix"];

/** How many links {@link ROSTER} declares. */
const LINKS = 5;

/** How many people {@link ROSTER} puts on the Engineering team. */
const ENGINEERS = 3;

/** How many people {@link ROSTER} puts on the Design team. */
const DESIGNERS = 2;

/** How many people in {@link ROSTER} score above two. */
const SCORING_ABOVE_TWO = 4;

/**
 * The same roster with every line indented, which the parser trims and the sniffer does not match.
 *
 * It exists so that one test can be about the file NAME and nothing else: the roster's content
 * sniffer anchors its verbs to the start of a line, so an indented roster is a file only its
 * extension can identify. Without it a test that drops "team.roster" on the element would pass on
 * the strength of the content tier even if the extension tier had been taken out entirely.
 */
const ROSTER_ONLY_ITS_NAME_IDENTIFIES = ROSTER.split("\n")
    .map((line) => ` ${line}`)
    .join("\n");

/** The same roster, with a header line stating that the links run both ways. */
const ROSTER_DECLARING_UNDIRECTED = `roster undirected\n${ROSTER}`;

/** The same roster, with a header line stating that the links run one way. */
const ROSTER_DECLARING_DIRECTED = `roster directed\n${ROSTER}`;

/** Two people and one link that carries a strength the element reads as the edge's weight. */
const ROSTER_WITH_A_WEIGHTED_LINK = ["person ada Engineering 9", "person brian Engineering 4", "knows ada brian strong 7"].join(
    "\n",
);

/**
 * A graph in the element's own JSON format, with node ids nothing in the roster shares.
 *
 * Registering a format must not cost a consumer the seven that ship with the element, and ids
 * from a different alphabet are how a test tells which of the two formats produced the graph.
 */
const BUILT_IN_JSON = JSON.stringify({
    nodes: [{ id: "ceres" }, { id: "pallas" }],
    edges: [{ src: "ceres", dst: "pallas" }],
});

/** A GraphML document, used to show a plugin's sniffer never taking a file the element reads. */
const BUILT_IN_GRAPHML = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
    '  <graph id="G" edgedefault="undirected">',
    '    <node id="ceres"/>',
    '    <node id="pallas"/>',
    '    <edge source="ceres" target="pallas"/>',
    "  </graph>",
    "</graphml>",
].join("\n");

/** Two people and one link in the third party's XML dialect, which also claims `.xml`. */
const ACME_XML = [
    "<acme-roster>",
    '  <person id="orion" team="Ops"/>',
    '  <person id="vega" team="Ops"/>',
    '  <knows from="orion" to="vega"/>',
    "</acme-roster>",
].join("\n");

/** Everyone in {@link ACME_XML}, sorted. */
const ACME_PEOPLE = ["orion", "vega"];

/**
 * The same roster with one person line that names no team and no score.
 *
 * This is a record the format produced and the SCHEMA refuses, which is a different failure from
 * a file the parser cannot read: the rest of the roster is perfectly good and must still load.
 */
const ROSTER_WITH_ONE_BAD_RECORD = `${ROSTER}\nperson gil\n`;

/**
 * The same six people, each with the coordinate its file places them at.
 *
 * The numbers are all different and none is zero, so a reader that dropped the column and a
 * reader that wrote a default both look different from one that carried the file's own values.
 */
const ROSTER_WITH_PLACED_PEOPLE = [
    "person ada Engineering 9 1 2 3",
    "person brian Engineering 4 4 5 6",
    "person cleo Engineering 7 7 8 9",
    "person dev Design 2 10 11 12",
    "person edith Design 5 13 14 15",
    "person felix Research 1 16 17 18",
    "knows ada brian strong",
].join("\n");

/** A roster whose very first line the parser cannot make sense of at all. */
const ROSTER_THE_PARSER_REFUSES = "standup ada brian\nperson cleo Engineering 7";

/**
 * Four people, the second of whom has no team, and no links at all.
 *
 * Loaded two at a time this puts the bad record in the first chunk, so a host that set an error
 * ceiling of one can be shown stopping there rather than reading on to brian and cleo.
 */
const ROSTER_THAT_GOES_BAD_EARLY = [
    "person ada Engineering 9",
    "person gil",
    "person brian Engineering 4",
    "person cleo Engineering 7",
].join("\n");

// -------------------------------------------------------------------------------------------
// Mounting an element, and reading back what it holds
// -------------------------------------------------------------------------------------------

/** How long the element is given to build its scene before a test gives up on it. */
const ELEMENT_READY_TIMEOUT_MS = 10000;

/** How long a test waits for an event the element should already be emitting. */
const EVENT_TIMEOUT_MS = 10000;

/** Tests that mount an element and load a graph need more than the five-second default. */
const TEST_TIMEOUT_MS = 20000;

/**
 * A failed fetch is retried three times with a second and then two seconds between attempts, so a
 * test that watches one fail needs room for those three seconds on top of everything else.
 */
const FETCH_FAILURE_TIMEOUT_MS = 30000;

let element: Graphty;
let container: HTMLDivElement;

/**
 * Mount a `<graphty-element>` the way a page does and wait until its graph is live.
 * @returns The mounted element.
 */
async function mountElement(): Promise<Graphty> {
    container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);

    const mounted = document.createElement("graphty-element");

    assert.instanceOf(mounted, Graphty, "importing the package is what defines the custom element");

    mounted.style.width = "100%";
    mounted.style.height = "100%";
    mounted.style.display = "block";
    container.appendChild(mounted);

    const deadline = Date.now() + ELEMENT_READY_TIMEOUT_MS;

    while (!mounted.graph.initialized) {
        if (Date.now() > deadline) {
            throw new Error("the element never finished initialising");
        }

        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return mounted;
}

/**
 * Ask the element for the roster format and wait until the graph has settled.
 * @param opts - What the host passes the source.
 */
async function loadRoster(opts: RosterConfig): Promise<void> {
    await element.addDataFromSource(ROSTER_FORMAT, opts);
    await element.graph.operationQueue.waitForCompletion();
}

/**
 * The next event of one type the element emits on the DOM.
 * @param type - The event name.
 * @returns Its detail.
 */
function nextEvent<T>(type: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            element.removeEventListener(type, handler);
            reject(new Error(`the element emitted no "${type}" within ${EVENT_TIMEOUT_MS}ms`));
        }, EVENT_TIMEOUT_MS);

        function handler(event: Event): void {
            clearTimeout(timer);
            element.removeEventListener(type, handler);
            resolve((event as CustomEvent<T>).detail);
        }

        element.addEventListener(type, handler);
    });
}

/**
 * Collect every event of one type until the returned reader is called.
 * @param type - The event name.
 * @returns A reader that stops listening and hands back what arrived, in order.
 */
function recordEvents<T>(type: string): () => T[] {
    const seen: T[] = [];
    const handler = (event: Event): void => {
        seen.push((event as CustomEvent<T>).detail);
    };

    element.addEventListener(type, handler);

    return () => {
        element.removeEventListener(type, handler);
        return seen;
    };
}

/** @returns The ids of the nodes the element is holding, sorted. */
function heldNodeIds(): string[] {
    return [...element.getDataManager().nodes.keys()].map(String).sort();
}

/** @returns How many nodes the element is holding right now. */
function heldNodeCount(): number {
    return element.getDataManager().nodes.size;
}

/**
 * Run something that is expected to be refused, and hand back the coded refusal.
 *
 * A consumer switches on `code` and reads `details`; so does every assertion below, which is the
 * whole point of a coded error existing.
 * @param act - What should be refused.
 * @returns The refusal.
 */
function refusalFrom(act: () => unknown): GraphtyError {
    let caught: unknown;

    try {
        act();
    } catch (error) {
        caught = error;
    }

    if (!isGraphtyError(caught)) {
        const got = caught instanceof Error ? `${caught.name}: ${caught.message}` : "no failure at all";

        throw new Error(`expected the call to be refused with a GraphtyError, and got ${got}`);
    }

    return caught;
}

beforeEach(async () => {
    element = await mountElement();
});

afterEach(async () => {
    // A load leaves queued work behind it, and disposing while that work is still queued runs it
    // against a graph that no longer exists.
    await element.graph.operationQueue.waitForCompletion();
    container.remove();
    beforeChunk = null;
});

afterAll(() => {
    // Registration is global and there is no unregister, so a suite leaves the registry as it
    // found it through the escape hatch named so nobody mistakes it for part of the contract.
    clearRegisteredFormatsForTesting();
});

describe("a third party's file format", () => {
    it(
        "loads a graph the element then holds, chosen by the format name a host sets",
        async () => {
            const loaded = nextEvent<DataLoadingCompleteEvent>("data-loading-complete");

            element.dataSource = ROSTER_FORMAT;
            element.dataSourceConfig = { data: ROSTER };

            await loaded;
            await element.graph.operationQueue.waitForCompletion();

            assert.deepStrictEqual(heldNodeIds(), PEOPLE, "every person in the file is a node in the graph");
            assert.strictEqual(element.getDataManager().edges.size, LINKS, "and every link is an edge");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "loads the same graph through the direct call a host makes for a second dataset",
        async () => {
            await loadRoster({ data: ROSTER });

            assert.deepStrictEqual(heldNodeIds(), PEOPLE);
            assert.strictEqual(element.getDataManager().edges.size, LINKS);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "does not displace the formats that ship with the element",
        async () => {
            await loadRoster({ data: ROSTER });
            assert.deepStrictEqual(heldNodeIds(), PEOPLE, "the third party's format loaded its graph");

            element.clearData();
            await element.addDataFromSource("json", { data: BUILT_IN_JSON });
            await element.graph.operationQueue.waitForCompletion();

            assert.deepStrictEqual(heldNodeIds(), ["ceres", "pallas"], "and the built-in JSON format still loads its own");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "puts the attributes it parsed onto the nodes and edges the element holds",
        async () => {
            await loadRoster({ data: ROSTER });

            const ada = element.getDataManager().nodes.get("ada");
            const link = [...element.getDataManager().edges.values()].find(
                (edge) => edge.srcId === "ada" && edge.dstId === "brian",
            );

            assert.isDefined(ada, "the node the file named");
            assert.strictEqual(ada.data.team, "Engineering");
            assert.strictEqual(ada.data.score, 9, "a number the format parsed, still a number");

            assert.isDefined(link, "the edge the file named, with both endpoints resolved");
            assert.strictEqual(link.data.bond, "strong");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "passes options only the format knows about from the host straight to the source",
        async () => {
            await loadRoster({ data: ROSTER, scoreScale: 10 });

            assert.strictEqual(element.getDataManager().nodes.get("ada")?.data.score, 90);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "reads its bytes from a string, a File and a URL without implementing any of the three",
        async () => {
            await loadRoster({ data: ROSTER });
            assert.strictEqual(heldNodeCount(), PEOPLE.length, "from a string the host already has");

            element.clearData();
            await loadRoster({ file: new File([ROSTER], "team.roster", { type: "text/plain" }) });
            assert.strictEqual(heldNodeCount(), PEOPLE.length, "from a File a user dropped on the page");

            element.clearData();

            const url = URL.createObjectURL(new Blob([ROSTER], { type: "text/plain" }));

            try {
                await loadRoster({ url });
                assert.strictEqual(heldNodeCount(), PEOPLE.length, "and from a URL the element fetches itself");
            } finally {
                URL.revokeObjectURL(url);
            }
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "is accepted by loadFromFile when the host names the format",
        async () => {
            await element.loadFromFile(new File([ROSTER], "team.roster", { type: "text/plain" }), {
                format: ROSTER_FORMAT,
            });
            await element.graph.operationQueue.waitForCompletion();

            assert.deepStrictEqual(heldNodeIds(), PEOPLE);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "streams: each chunk is in the graph before the next one is asked for",
        async () => {
            // Two people per chunk over six people is three chunks, so the graph should hold none,
            // then two, then four at the three moments the source is about to hand one over.
            const heldBeforeEachChunk: number[] = [];

            beforeChunk = () => {
                heldBeforeEachChunk.push(heldNodeCount());
            };

            await loadRoster({ data: ROSTER, chunkSize: 2 });

            assert.deepStrictEqual(heldBeforeEachChunk, [0, 2, 4], "the graph grew as the chunks arrived");
            assert.strictEqual(heldNodeCount(), PEOPLE.length, "and held everything once the last one landed");
            assert.strictEqual(
                element.getDataManager().edges.size,
                LINKS,
                "including links whose second endpoint arrived in a later chunk",
            );
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "reports progress after every chunk, with the running node and edge counts",
        async () => {
            const readProgress = recordEvents<DataLoadingProgressEvent>("data-loading-progress");

            await loadRoster({ data: ROSTER, chunkSize: 2 });

            const progress = readProgress();

            assert.strictEqual(progress.length, 3, "one report per chunk");
            assert.deepStrictEqual(
                progress.map((event) => event.format),
                [ROSTER_FORMAT, ROSTER_FORMAT, ROSTER_FORMAT],
                "reported under the format's own name, not a built-in's",
            );
            assert.deepStrictEqual(
                progress.map((event) => event.nodeRecordsLoaded),
                [2, 4, 6],
                "a running total a host can put in a progress bar",
            );
            assert.deepStrictEqual(
                progress.map((event) => event.chunksProcessed),
                [1, 2, 3],
            );
            assert.strictEqual(progress[0].edgeRecordsLoaded, LINKS, "the links arrive with the first chunk");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "announces completion under its own format name, with what it loaded",
        async () => {
            const finished = nextEvent<DataLoadingCompleteEvent>("data-loading-complete");

            await loadRoster({ data: ROSTER });

            const event = await finished;

            assert.strictEqual(event.format, ROSTER_FORMAT);
            assert.strictEqual(event.nodesLoaded, PEOPLE.length);
            assert.strictEqual(event.edgesLoaded, LINKS);
            assert.strictEqual(event.errors, 0);
            assert.isTrue(event.success);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "skips the records its own schema rejects and keeps the rest",
        async () => {
            const summary = nextEvent<DataLoadingErrorSummaryEvent>("data-loading-error-summary");

            await loadRoster({ data: ROSTER_WITH_ONE_BAD_RECORD });

            assert.deepStrictEqual(heldNodeIds(), PEOPLE, "the six good people loaded");
            assert.isFalse(element.getDataManager().nodes.has("gil"), "and the one with no team did not");

            const event = await summary;

            assert.strictEqual(event.format, ROSTER_FORMAT);
            assert.strictEqual(event.totalErrors, 1, "the host is told how many records were dropped");
            assert.isNotEmpty(event.message, "in a sentence the host can show a user");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "stops the load when the host's error limit is reached",
        async () => {
            const finished = nextEvent<DataLoadingCompleteEvent>("data-loading-complete");

            // Two records per chunk and a ceiling of one: the bad record is the second half of the
            // first chunk, so the load must end there and never reach brian or cleo.
            await loadRoster({ data: ROSTER_THAT_GOES_BAD_EARLY, chunkSize: 2, errorLimit: 1 });

            assert.deepStrictEqual(heldNodeIds(), ["ada"], "only what had already arrived");
            assert.isFalse(element.getDataManager().nodes.has("brian"), "reading stopped rather than continuing");

            const event = await finished;

            assert.strictEqual(event.nodesLoaded, 1);
            assert.strictEqual(event.errors, 1);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "surfaces a parse failure as an error the host can catch and see",
        async () => {
            const reported = nextEvent<DataLoadingErrorEvent>("data-loading-error");
            const onGraph = nextEvent<GraphErrorEvent>("error");

            let refusal: Error | null = null;

            try {
                await loadRoster({ data: ROSTER_THE_PARSER_REFUSES });
            } catch (error) {
                refusal = error as Error;
            }

            assert.isNotNull(refusal, "the call a host awaited rejects rather than resolving quietly");
            assert.include(refusal.message, ROSTER_FORMAT, "naming the format that failed");

            const event = await reported;

            assert.strictEqual(event.format, ROSTER_FORMAT);
            assert.strictEqual(event.context, "parsing");
            assert.include(event.error.message, "standup", "carrying what the parser actually objected to");
            assert.isFalse(event.canContinue);

            const graphError = await onGraph;

            assert.strictEqual(graphError.context, "data-loading", "and the general error channel hears about it too");
            assert.strictEqual(heldNodeCount(), 0, "nothing half-loaded was left behind");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "lets a style layer select on the attributes it loaded, exactly like a built-in format",
        async () => {
            await loadRoster({ data: ROSTER });

            const changes: StyleChange[] = [];
            const stopWatching = element.session.on("style:changed", (change) => {
                changes.push(change);
            });

            /**
             * A layer that paints whatever its expression matches.
             * @param name - What to call it, so two layers in one stack are distinguishable.
             * @param where - The expression, over the columns the roster format loaded.
             * @returns The layer.
             */
            const layerOver = (name: string, where: string): LayerSpec => ({
                name,
                target: "node",
                selector: { match: "expression", where },
                set: { "node.color": "#ff9900" },
            });

            try {
                // `painted` is the repaint reporting the dirty set it actually walked, so a layer
                // that silently matched the whole graph and one that silently matched nothing are
                // both visible in this one number.
                await element.session.styles.add(layerOver("Engineering", 'data.team == `"Engineering"`'));
                assert.strictEqual(changes.at(-1)?.painted?.nodes, ENGINEERS, "a string column the format loaded");

                await element.session.styles.add(layerOver("Design", 'data.team == `"Design"`'));
                assert.strictEqual(changes.at(-1)?.painted?.nodes, DESIGNERS, "and not the other team");

                await element.session.styles.add(layerOver("Above two", "data.score > `2`"));
                assert.strictEqual(
                    changes.at(-1)?.painted?.nodes,
                    SCORING_ABOVE_TWO,
                    "a numeric comparison, so the score arrived as a number and not as text",
                );
            } finally {
                stopWatching();
            }
        },
        TEST_TIMEOUT_MS,
    );
});

describe("a third party's format in the catalogue a picker is built from", () => {
    it("is offered beside the formats the element ships, under its own plain name", () => {
        const offered = element.session.catalog.formats();
        const roster = offered.find((descriptor) => descriptor.id === ROSTER_FORMAT);

        assert.isDefined(roster, "a picker reading the session's catalogue is offered the registered format");
        assert.strictEqual(roster.plainName, "Team Roster", "under the words the format calls itself");
        assert.deepStrictEqual(roster.extensions, [".roster"], "with the file names it answers to");
        assert.isTrue(roster.canImport);

        for (const shipped of ["json", "csv", "graphml", "gexf", "gml", "dot", "pajek"]) {
            assert.isDefined(
                offered.find((descriptor) => descriptor.id === shipped),
                `registering a format did not cost the reader the built-in "${shipped}"`,
            );
        }
    });

    it("is found by the name a saved document records", () => {
        assert.strictEqual(formatDescriptor(ROSTER_FORMAT)?.plainName, "Team Roster");
        assert.strictEqual(formatDescriptor("graphml")?.plainName, "GraphML", "and a built-in name still means itself");
        assert.isUndefined(formatDescriptor("no-such-format"));
    });

    it("is found from a file name's extension by a drop target that has not read the file yet", () => {
        assert.deepStrictEqual(
            formatsForExtension(".ROSTER").map((descriptor) => descriptor.id),
            [ROSTER_FORMAT],
            "in any case, because a file name's case is the user's business",
        );
        assert.deepStrictEqual(
            formatsForExtension(".xml").map((descriptor) => descriptor.id),
            ["graphml", "gexf", ACME_XML_FORMAT],
            "and an extension three formats claim is answered with all three, the element's own first",
        );
    });

    it("publishes the options a host builds an import dialog from", () => {
        const roster = element.session.catalog.formats().find((descriptor) => descriptor.id === ROSTER_FORMAT);
        const scale = roster?.options.find((option) => option.name === "scoreScale");

        assert.isDefined(scale, "the option the format declared reaches the host as plain data");
        assert.strictEqual(scale.plainName, "Score Multiplier", "with words a form can label it with");
        assert.strictEqual(scale.type, "number");
        assert.strictEqual(scale.default, 1);
        assert.strictEqual(scale.min, 0.1, "and the range a slider needs");
        assert.strictEqual(scale.max, 1000);
    });

    it("is listed among the readers the element can build", () => {
        const readers = DataSource.getRegisteredTypes();

        assert.include(readers, ROSTER_FORMAT);
        assert.include(readers, "json", "beside the element's own");
    });
});

describe("a third party's format being recognised from a file", () => {
    it(
        "is recognised from a dropped file's name, with no format argument at all",
        async () => {
            const finished = nextEvent<DataLoadingCompleteEvent>("data-loading-complete");

            // Indented, so the format's own content sniffer does not match it and the file name is
            // genuinely the only thing identifying it.
            await element.loadFromFile(
                new File([ROSTER_ONLY_ITS_NAME_IDENTIFIES], "team.roster", { type: "text/plain" }),
            );
            await element.graph.operationQueue.waitForCompletion();

            assert.deepStrictEqual(heldNodeIds(), PEOPLE, "the element worked out which format it had been handed");
            assert.strictEqual(
                (await finished).format,
                ROSTER_FORMAT,
                "and it was the format whose descriptor claims that extension that read the file",
            );
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "is recognised from a file's first bytes when its name says nothing",
        async () => {
            const finished = nextEvent<DataLoadingCompleteEvent>("data-loading-complete");

            await element.loadFromFile(new File([ROSTER], "notes.txt", { type: "text/plain" }));
            await element.graph.operationQueue.waitForCompletion();

            assert.deepStrictEqual(heldNodeIds(), PEOPLE, "the sniffer the format declared was asked and answered");
            assert.strictEqual((await finished).format, ROSTER_FORMAT, "and it was that format that read the file");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "is recognised from the content of a URL whose address says nothing about the format",
        async () => {
            // An object URL carries no extension at all, so the only thing left to go on is what
            // comes back from fetching it -- which is the path a host takes for an API endpoint.
            const url = URL.createObjectURL(new Blob([ROSTER], { type: "text/plain" }));

            try {
                await element.loadFromUrl(url);
                await element.graph.operationQueue.waitForCompletion();

                assert.deepStrictEqual(heldNodeIds(), PEOPLE);
            } finally {
                URL.revokeObjectURL(url);
            }
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "is accepted by loadFromUrl when the host names the format",
        async () => {
            const url = URL.createObjectURL(new Blob([ROSTER], { type: "text/plain" }));

            try {
                await element.loadFromUrl(url, { format: ROSTER_FORMAT });
                await element.graph.operationQueue.waitForCompletion();

                assert.deepStrictEqual(heldNodeIds(), PEOPLE);
            } finally {
                URL.revokeObjectURL(url);
            }
        },
        TEST_TIMEOUT_MS,
    );

    it("is offered to a host that wants to know what it is holding before it loads it", () => {
        assert.strictEqual(
            detectFormat({ filename: "team.roster" }),
            ROSTER_FORMAT,
            "from the name alone, before a single byte has been read",
        );
        assert.strictEqual(detectFormat({ sample: ROSTER }), ROSTER_FORMAT, "from the bytes alone");
        assert.strictEqual(
            detectFormat({ filename: "https://example.com/exports/team.roster" }),
            ROSTER_FORMAT,
            "and from an address, which is what spares a host a fetch it does not need to make",
        );
        assert.deepStrictEqual(
            detectFormats({ filename: "notes.txt", sample: "nothing here is a graph" }),
            [GREEDY_FORMAT],
            "and a file that is no kind of graph is claimed by nothing the element ships -- only by the " +
                "format registered above to claim everything, which is exactly where a greedy plugin belongs",
        );
    });

    it(
        "is told apart from another format claiming the same extension by looking at the content",
        async () => {
            assert.deepStrictEqual(
                detectFormats({ filename: "team.xml", sample: ACME_XML }),
                [ACME_XML_FORMAT, "graphml", "gexf"],
                "the claimant whose own sniffer says yes is ranked first, and the others are still offered",
            );

            await element.loadFromFile(new File([ACME_XML], "team.xml", { type: "text/xml" }));
            await element.graph.operationQueue.waitForCompletion();

            assert.deepStrictEqual(heldNodeIds(), ACME_PEOPLE, "and the file loaded through the format that claimed it");
        },
        TEST_TIMEOUT_MS,
    );

    it("never takes a file one of the element's own formats claims, however greedy its sniffer", () => {
        assert.strictEqual(
            detectFormat({ sample: BUILT_IN_JSON }),
            "json",
            "a registered sniffer that claims every file is asked only after every built-in one",
        );
        assert.strictEqual(detectFormat({ filename: "graph.xml", sample: BUILT_IN_GRAPHML }), "graphml");
        assert.strictEqual(
            detectFormats({ sample: BUILT_IN_JSON })[0],
            "json",
            "and the ranking says the same thing the single answer does",
        );
        assert.include(
            detectFormats({ sample: BUILT_IN_JSON }),
            GREEDY_FORMAT,
            "while still offering the greedy format as a lesser candidate",
        );
    });

    it("treats a sniffer that throws as a no, rather than as a failed import", () => {
        // The broken format claims ".acmebroken" and nothing else, so reaching it by content is
        // the only way its sniffer is asked at all -- and asking it must not take the detection
        // down with it.
        assert.strictEqual(detectFormat({ sample: ROSTER }), ROSTER_FORMAT);
        assert.notInclude(detectFormats({ sample: ROSTER }), BROKEN_SNIFFER_FORMAT);
    });
});

describe("a third party's format being configured", () => {
    it("takes the default it declared when the host sets nothing", async () => {
        await loadRoster({ data: ROSTER });

        assert.strictEqual(
            element.getDataManager().nodes.get("ada")?.data.score,
            9,
            "the declared default of 1 was filled in and multiplied nothing away",
        );
    }, TEST_TIMEOUT_MS);

    it("refuses a value its published declaration would not accept", () => {
        const refusal = refusalFrom(() => DataSource.get(ROSTER_FORMAT, { data: ROSTER, scoreScale: -5 }));

        assert.strictEqual(refusal.code, "E_OPTION_RANGE");
        assert.strictEqual(refusal.details.option, "scoreScale");
        assert.strictEqual(refusal.details.value, -5, "the value that was passed, so an error panel can show it");
        assert.strictEqual(refusal.details.min, 0.1, "beside the range the catalogue published");
    });

    it("refuses an option name it does not have, and offers the nearest one it does", () => {
        const refusal = refusalFrom(() => DataSource.get(ROSTER_FORMAT, { data: ROSTER, scoreScal: 2 }));

        assert.strictEqual(refusal.code, "E_UNKNOWN_OPTION");
        assert.deepStrictEqual(refusal.details.available, ["scoreScale"], "what this format does declare");
        assert.deepStrictEqual(refusal.details.candidates, ["scoreScale"], "and what the host probably meant");
    });

    it(
        "reports a bad option to a host that went through the element rather than the registry",
        async () => {
            let refusal: Error | null = null;

            try {
                await element.addDataFromSource(ROSTER_FORMAT, { data: ROSTER, scoreScale: 5000 });
            } catch (error) {
                refusal = error as Error;
            }

            assert.isNotNull(refusal, "the load a host awaited rejects rather than reading the file anyway");
            assert.include(refusal.message, "scoreScale", "naming the option that was wrong");
            assert.strictEqual(heldNodeCount(), 0, "and nothing was loaded on the way to finding out");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "still receives the facts the element itself adds to an options object",
        async () => {
            // `loadFromFile` adds the file's name and size, and `loadFromUrl` adds the configured
            // identity paths. None of those is an option this format declared, and a format that
            // was refused for them could not be reached through either call.
            await element.loadFromFile(new File([ROSTER], "team.roster", { type: "text/plain" }));
            await element.graph.operationQueue.waitForCompletion();

            assert.deepStrictEqual(heldNodeIds(), PEOPLE);
        },
        TEST_TIMEOUT_MS,
    );
});

describe("a third party's format failing", () => {
    it(
        "reports a file it cannot parse as a coded error carrying the format and the line",
        async () => {
            const reported = nextEvent<DataLoadingErrorEvent>("data-loading-error");

            await loadRoster({ data: ROSTER_THE_PARSER_REFUSES }).catch(() => {
                // The rejection itself is asserted by the parse-failure test above; what is under
                // test here is the coded error the host is handed.
            });

            const event = await reported;

            assert.isTrue(isGraphtyError(event.error), "a consumer switches on a code, never on a message");

            if (!isGraphtyError(event.error)) {
                return;
            }

            assert.strictEqual(event.error.code, "E_PARSE_FAILED");
            assert.strictEqual(event.error.details.format, ROSTER_FORMAT);
            assert.strictEqual(event.error.details.line, 1, "the line of the file that could not be read");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "reports a source it cannot fetch as a coded error carrying the address",
        async () => {
            const url = URL.createObjectURL(new Blob([ROSTER], { type: "text/plain" }));

            // Revoked before the load starts, so fetching it fails the way an address that is
            // simply not there fails -- the retries are the element's, and the format wrote none
            // of them.
            URL.revokeObjectURL(url);

            const reported = nextEvent<DataLoadingErrorEvent>("data-loading-error");

            await loadRoster({ url }).catch(() => {
                // The rejection is expected; the coded error is what is under test.
            });

            const event = await reported;

            assert.isTrue(isGraphtyError(event.error));

            if (!isGraphtyError(event.error)) {
                return;
            }

            assert.strictEqual(event.error.code, "E_FETCH_FAILED");
            assert.strictEqual(event.error.details.url, url, "so a host can say which address failed");
            assert.strictEqual(event.error.details.attempts, 3, "after the three attempts the element makes");
            assert.isTrue(event.error.recoverable, "a network that dropped could work on the next try");
        },
        FETCH_FAILURE_TIMEOUT_MS,
    );
});

describe("a third party's format declaring what its file says", () => {
    it(
        "declares the direction its file states, and the graph is counted as that kind",
        async () => {
            await loadRoster({ data: ROSTER_DECLARING_UNDIRECTED });

            assert.strictEqual(
                element.session.data.statistics().directedness,
                "undirected",
                "the file said its links run both ways, and the element counted the graph that way",
            );
            assert.isFalse(element.session.status.directed);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "is believed when its file states the opposite direction",
        async () => {
            await loadRoster({ data: ROSTER_DECLARING_DIRECTED });

            assert.strictEqual(element.session.data.statistics().directedness, "directed");
            assert.isTrue(element.session.status.directed);
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "leaves the direction alone when its file states none",
        async () => {
            await loadRoster({ data: ROSTER });

            assert.strictEqual(
                element.session.data.statistics().directedness,
                "directed",
                "a file that says nothing leaves the element's own setting standing, rather than guessing",
            );
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "places the nodes its file placed, so the element knows the graph arrived arranged",
        async () => {
            await loadRoster({ data: ROSTER });
            assert.strictEqual(
                element.session.seededNodeCount,
                0,
                "a roster with no coordinates in it seeds none, whatever a layout goes on to do",
            );

            element.clearData();
            await loadRoster({ data: ROSTER_WITH_PLACED_PEOPLE });

            assert.strictEqual(
                element.session.seededNodeCount,
                PEOPLE.length,
                "and every person the file placed reached the element's own seed column, which is " +
                    "what a layout recommendation reads to decide whether to arrange the graph at all",
            );
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "carries an edge weight the element reads as a weight rather than as another attribute",
        async () => {
            await loadRoster({ data: ROSTER_WITH_A_WEIGHTED_LINK });

            assert.isTrue(
                element.session.data.statistics().weighted,
                "the number on the link reached the element's weight column, not just the record",
            );
        },
        TEST_TIMEOUT_MS,
    );
});

/**
 * A reader with nothing to read.
 *
 * Every class below is refused at the door, so what it would parse never matters; what matters is
 * what it DECLARES. Extending this rather than the roster reader is what lets one of them omit
 * the description entirely, which is the mistake a first attempt actually makes.
 */
abstract class DeclarationOnlyReader extends DataSource {
    /**
     * @param _opts - Whatever the host passed. The element builds every reader from one options
     *   object, and nothing here reads it.
     */
    constructor(_opts: object) {
        super();
    }

    protected getConfig(): BaseDataSourceConfig {
        return {};
    }

    /**
     * Never reached, because registration refuses these classes before anything can ask them.
     * @yields One empty chunk, if the element ever got this far.
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        yield await Promise.resolve({ nodes: [], edges: [] });
    }
}

describe("registering a third party's format", () => {
    it("refuses a reader that never says what it is called", () => {
        /** A reader whose name is blank, which used to be filed under the string "undefined". */
        class Unnamed extends DeclarationOnlyReader {
            static override type = "";
            static override descriptor: FormatDescriptor = { ...ROSTER_DESCRIPTOR, id: "" };
        }

        const refusal = refusalFrom(() => DataSource.register(Unnamed));

        assert.strictEqual(refusal.code, "E_BAD_COMMAND");
        assert.strictEqual(refusal.details.field, "type", "naming the static the author has to add");
    });

    it("refuses a reader that never describes itself, because nothing could offer it", () => {
        /** A reader with no description: loadable by name, invisible to every picker. */
        class Undescribed extends DeclarationOnlyReader {
            static override type = "acme-undescribed";
        }

        const refusal = refusalFrom(() => DataSource.register(Undescribed));

        assert.strictEqual(refusal.code, "E_BAD_COMMAND");
        assert.strictEqual(refusal.details.field, "descriptor");
        assert.notInclude(DataSource.getRegisteredTypes(), "acme-undescribed", "and nothing was half-registered");
    });

    it("refuses a reader whose two halves disagree about its name", () => {
        /** A reader filed under one name and describing itself as another. */
        class Misnamed extends DeclarationOnlyReader {
            static override type = "acme-misnamed";
            static override descriptor: FormatDescriptor = {
                ...ROSTER_DESCRIPTOR,
                id: "something-else",
                extensions: [".acmemisnamed"],
            };
        }

        const refusal = refusalFrom(() => DataSource.register(Misnamed));

        assert.strictEqual(refusal.code, "E_BAD_COMMAND");
        assert.strictEqual(refusal.details.field, "descriptor.id");
    });

    it("refuses a format that claims no file extension, because no file could be recognised as it", () => {
        /** A reader no dropped file could ever reach. */
        class Unreachable extends DeclarationOnlyReader {
            static override type = "acme-unreachable";
            static override descriptor: FormatDescriptor = {
                ...ROSTER_DESCRIPTOR,
                id: "acme-unreachable",
                extensions: [],
            };
        }

        const refusal = refusalFrom(() => DataSource.register(Unreachable));

        assert.strictEqual(refusal.code, "E_BAD_COMMAND");
        assert.strictEqual(refusal.details.field, "descriptor.extensions");
    });

    it("refuses a format that claims it can be written, because there is nowhere to register a writer", () => {
        /** A reader that would put an entry in a "Save as" menu that saves nothing. */
        class Writable extends DeclarationOnlyReader {
            static override type = "acme-writable";
            static override descriptor: FormatDescriptor = {
                ...ROSTER_DESCRIPTOR,
                id: "acme-writable",
                extensions: [".acmewritable"],
                canExport: true,
            };
        }

        const refusal = refusalFrom(() => DataSource.register(Writable));

        assert.strictEqual(refusal.code, "E_BAD_COMMAND");
        assert.strictEqual(refusal.details.field, "descriptor.canExport");
    });

    it("refuses a format name the element ships, so a saved document keeps meaning what it meant", () => {
        /** A reader trying to become the element's JSON. */
        class TakesJson extends DeclarationOnlyReader {
            static override type = "json";
            static override descriptor: FormatDescriptor = { ...ROSTER_DESCRIPTOR, id: "json" };
        }

        const refusal = refusalFrom(() => DataSource.register(TakesJson));

        assert.strictEqual(refusal.code, "E_DUPLICATE_PLUGIN");
        assert.strictEqual(refusal.details.name, "json");
        assert.strictEqual(
            formatDescriptor("json")?.plainName,
            "JSON",
            "and the built-in format is still exactly what it was",
        );
    });

    it("refuses a format whose sniffer is not something that can be asked", () => {
        /** A reader whose content sniffer is a string. */
        class BadSniffer extends DeclarationOnlyReader {
            static override type = "acme-badsniffer";
            static override descriptor: FormatDescriptor = {
                ...ROSTER_DESCRIPTOR,
                id: "acme-badsniffer",
                extensions: [".acmebadsniffer"],
            };
            static override detect = "not a function" as unknown as (sample: string) => boolean;
        }

        const refusal = refusalFrom(() => DataSource.register(BadSniffer));

        assert.strictEqual(refusal.code, "E_BAD_COMMAND");
        assert.strictEqual(refusal.details.field, "detect");
    });
});
