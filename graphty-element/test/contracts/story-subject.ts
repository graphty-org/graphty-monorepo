/**
 * @file Whether a story still demonstrates the thing it is named after.
 *
 * THE HOLE THIS FILLS. `stories/story-roster.json` counts story ids, and an id is a name. A story
 * kept by name whose body stops showing its subject is a story the roster is perfectly happy
 * with, and it is not a hypothetical: `Styles/Layered::ArrowSizeVariations` carried a comment
 * promising caps at 0.5 and 2.0 while all three of its layers wrote only a cap TYPE, so the
 * picture held one size and the name said three. Chromatic could not see it either -- the
 * baseline it diffs against was the same hollow picture.
 *
 * THE RULE, in one sentence: a story whose name contains the name of a style channel must write
 * that channel. `ArrowSizeVariations` says "size", and something it writes has to be a size.
 *
 * WHERE THE VOCABULARY COMES FROM. `CHANNELS` -- the element's own closed list of paintable
 * properties -- split into words. Nothing is typed out here, so publishing `edge.arrowTailSize`
 * makes "tail" a subject on the next run, and retiring a channel stops it being one. A gate whose
 * vocabulary is a hand-written list is a gate that stops growing the day somebody forgets it.
 *
 * WHAT COUNTS AS DEMONSTRATING A SUBJECT is deliberately wider than "writes a channel", because
 * the Styles tree shows more than channels:
 *
 * - a channel written by a layer, a static style or an encoding -- the ordinary case;
 * - a field of a `labelStyle` value, so `Styles/Label::FontSize` is satisfied by `sizePx`;
 * - an element setting, so `Styles/Selection Highlight::Color`, which configures the halo round
 *   a selected node rather than painting a channel, is satisfied by `selectionStyle.color`;
 * - a hex colour in a label style field, so `Styles/Label::BackgroundColor` is satisfied by
 *   `background: "#10B981"`. The label vocabulary names its fields after what they paint rather
 *   than after what they hold, so the word "colour" is in the story's name, in the value, and
 *   nowhere in between.
 *
 * WHAT IT DOES NOT READ. Only the `Styles/` tree, because that is where the element demonstrates
 * its channels and where hollowing hides. A story that leaves the tree changes its title, which
 * changes its id, which the roster gate refuses -- so the two interlock rather than leaving a
 * door. And a name that says nothing about a channel -- `Styles/Edge::Bezier`, whose subject is
 * `edge.curvature` under another word -- claims nothing and is not checked; this gate makes a
 * name that DOES name a channel binding, it does not invent subjects.
 *
 * THE OTHER TREES are checked by {@link checkTreeSubjects}, against a registry key rather than a
 * channel. The rule is the same one: a story whose export name spells a key from its tree's
 * registry must write that key somewhere in its own declaration or its meta's args -- as the
 * `layout` it sets, the `dataSource` it loads, or the algorithm it runs or is built for. What
 * each tree is checked for, and where its keys come from, is {@link SUBJECT_TREES}:
 *
 * - `Layout/` -- the layout engine: every engine name the layout catalogue lists, so
 *   `Layout/2D::KamadaKawai` must name `"kamada-kawai"`.
 * - `Data` -- the format: every format id the format catalogue lists, so `Data::CsvNeo4j` must
 *   name `"csv"`.
 * - `Algorithms/` -- the algorithm: every catalogue key and every older address the catalogue
 *   still answers to, so `Algorithms/Shortest Path::Dijkstra` must name `"dijkstra"` or
 *   `"graphty:dijkstra"`.
 *
 * WHAT IS NOT CHECKED, and why. `Camera Controls`, `ViewMode` and `Selection` name a view mode
 * as `TwoD`, `Mode2D` or `ModeVR`, and set it in a render function or a decorator rather than in
 * args, so nothing a parser can read ties the mode to the name. `Camera Controls` asserts its
 * mode at run time with `assertViewMode` from `stories/assertions.ts`; the Selection stories do
 * not yet. The remaining trees -- `AI Control`, `Graphty`, `Logging`, `Performance`,
 * `Screenshot`, `XR` -- have no registry whose keys their story names spell.
 */

import { BUILT_IN_ALGORITHMS } from "../../src/catalog/algorithms";
import { FORMAT_DESCRIPTORS } from "../../src/catalog/formats";
import { LAYOUT_CATALOG } from "../../src/catalog/layouts";
import { CHANNELS } from "../../src/session/styles/channels";
import type { StoryDeclaration, StoryFileReading } from "./story-source";

/** The story tree whose subject is the element's styling. */
const SUBJECT_TREE = "Styles/";

/**
 * Channel words that name no subject.
 *
 * "node" and "edge" are which thing is painted, not what about it; every story in `Styles/Node`
 * would otherwise claim "node". "style" is in `edge.style` and in both `labelStyle` channels and
 * in the name of the tree itself, so it identifies nothing.
 *
 * "text" is the same shape, and it earned its place here the day the arrow captions were
 * published. In `edge.arrowHeadText` it means the words an edge carries at one END of itself;
 * in the label vocabulary it is the prefix of `textAlign`, `textColor`, `textOutline` and
 * `textShadow`, where it means the letters of any label at all; and in a story name --
 * `TextColor`, `TextShadow`, `StaticText`, `UnicodeText` -- it means whichever of those the
 * story is about. One word, three subjects, so it picks out none of them. The subjects it used
 * to stand in for are still checked under their own words: an arrow caption story claims
 * "arrow", and `Styles/Label::TextAlign` claims "align".
 */
const NOT_A_SUBJECT = new Set(["node", "edge", "style", "text"]);

/** One story that names a subject and does not show it. */
export interface SubjectFinding {
    /** The story's id, `<title>::<export>`. */
    readonly id: string;
    /** The file it is declared in. */
    readonly file: string;
    /** The subject words its name claims and nothing it writes accounts for. */
    readonly missing: readonly string[];
    /** Everything it does write, for a reader deciding whether the name or the body is wrong. */
    readonly writes: readonly string[];
}

/** What a run of this gate found. */
export interface SubjectReport {
    /** Every story whose name claims a subject it does not show. */
    readonly findings: readonly SubjectFinding[];
    /** How many stories named a subject at all, which is how much the gate actually read. */
    readonly checked: number;
    /** Stories read through the whole-file fallback, because their layers are built by a helper. */
    readonly readLoosely: readonly string[];
}

/**
 * Reduce a word to the one form the vocabulary and the story names are compared in.
 * @param word - One word, in whatever case and number it was written.
 * @returns The word, lower case, Americanised, and singular.
 */
function normalise(word: string): string {
    const lower = word.toLowerCase().replaceAll("colour", "color");

    return lower.endsWith("s") && lower.length > 3 ? lower.slice(0, -1) : lower;
}

/**
 * Split any identifier, title or dotted path into the words it is made of.
 *
 * `edge.arrowHeadSize` is four words, `Styles/Node Tooltip` is three, `TwoLayerNodeColors` is
 * four. Digits end a word, so `TwoDAllArrows` does not smear into one.
 * @param text - The text to split.
 * @returns Its words, normalised.
 */
function words(text: string): string[] {
    return text
        .replace(/([a-z\d])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .split(/[^A-Za-z\d]+/)
        .filter((word) => word.length > 0)
        .map(normalise);
}

/**
 * Every word that names a subject: the words of the channel names, less the ones that identify
 * nothing.
 * @returns The subject vocabulary.
 */
function subjectVocabulary(): Set<string> {
    const vocabulary = new Set<string>();

    for (const channel of CHANNELS) {
        for (const word of words(channel.slice(channel.indexOf(".") + 1))) {
            if (!NOT_A_SUBJECT.has(word)) {
                vocabulary.add(word);
            }
        }
    }

    return vocabulary;
}

/**
 * Everything one story writes, as words.
 * @param story - The story.
 * @param fileChannels - Channel-shaped names from anywhere in its file, the loose reading.
 * @returns The words, and the paths they came from for a failure message.
 */
function written(
    story: StoryDeclaration,
    fileChannels: readonly string[],
): { words: Set<string>; paths: string[] } {
    // A story whose setup the parser could not evaluate is read at the level of its whole file:
    // stories/AllNodeShapes.stories.ts builds one layer per shape by mapping over the shape list
    // the schema publishes, which is how it should be written and is not something a parser can
    // evaluate. The looser reading is recorded in the report rather than passed off as the same
    // thing as the strict one.
    const loose = story.unreadable.length > 0 ? fileChannels : [];
    const paths = [...story.channels, ...story.labelFields, ...story.configPaths, ...loose];
    const found = new Set<string>();

    for (const path of paths) {
        for (const word of words(path)) {
            found.add(word);
        }
    }

    if (story.writesColour) {
        found.add("color");
    }

    return { words: found, paths };
}

/**
 * Check every story in the `Styles/` tree against its own name.
 * @param readings - The story files, as read by `story-source`.
 * @returns What names a subject, and what fails to show the subject it names.
 */
export function checkSubjects(readings: readonly StoryFileReading[]): SubjectReport {
    const vocabulary = subjectVocabulary();
    const findings: SubjectFinding[] = [];
    const readLoosely: string[] = [];
    let checked = 0;

    for (const reading of readings) {
        if (!reading.title.startsWith(SUBJECT_TREE)) {
            continue;
        }

        for (const story of reading.stories) {
            const claimed = [...new Set(words(`${story.title} ${story.exportName}`))].filter((word) =>
                vocabulary.has(word),
            );

            if (claimed.length === 0) {
                continue;
            }

            checked += 1;

            if (story.unreadable.length > 0) {
                readLoosely.push(story.id);
            }

            const writes = written(story, reading.fileChannels);
            const missing = claimed.filter((word) => !writes.words.has(word)).sort();

            if (missing.length > 0) {
                findings.push({
                    id: story.id,
                    file: story.file,
                    missing,
                    writes: writes.paths.sort(),
                });
            }
        }
    }

    return { findings, checked, readLoosely };
}

/** A story tree whose subject is a key in one of the element's registries. */
export interface SubjectTree {
    /** The title prefix of the stories in the tree. */
    readonly tree: string;
    /** What a key in this tree is, in a failure message. */
    readonly subject: string;
    /** Every key, read from the element's own catalogue. */
    readonly keys: () => readonly string[];
    /** Every string that counts as writing a key: the key, and any address it is also run by. */
    readonly spellings: (key: string) => readonly string[];
}

/** The trees checked by {@link checkTreeSubjects}. */
export const SUBJECT_TREES: readonly SubjectTree[] = [
    {
        tree: "Layout/",
        subject: "layout engine",
        keys: () => [...new Set(LAYOUT_CATALOG.flatMap((entry) => entry.implementations.map((impl) => impl.engine)))],
        spellings: (key) => [key],
    },
    {
        tree: "Data",
        subject: "format",
        keys: () => FORMAT_DESCRIPTORS.map((format) => format.id),
        spellings: (key) => [key],
    },
    {
        tree: "Algorithms/",
        subject: "algorithm",
        keys: () => [
            ...new Set(
                BUILT_IN_ALGORITHMS.flatMap((algorithm) => [
                    algorithm.key,
                    ...(algorithm.legacyKeys ?? []).map((legacy) => legacy.key),
                ]),
            ),
        ],
        spellings: (key) => [key, `graphty:${key}`],
    },
];

/** What {@link checkTreeSubjects} found in one tree. */
export interface TreeReport {
    /** The tree's title prefix. */
    readonly tree: string;
    /** Every story whose name spells a key it never writes. */
    readonly findings: readonly SubjectFinding[];
    /** How many stories in the tree spelled a key at all. */
    readonly checked: number;
}

/**
 * Lower case with everything but letters and digits removed, so `kamada-kawai` and
 * `KamadaKawaiWeighted` can be compared.
 * @param text - The text.
 * @returns Its letters and digits, lower case.
 */
function compact(text: string): string {
    return text.toLowerCase().replace(/[^a-z\d]/g, "");
}

/**
 * The keys a story's export name spells, less any key that is only part of a longer one it also
 * spells: `ConnectedComponents` claims `connected-components`, not `components` as well.
 * @param exportName - The story's export name.
 * @param keys - The tree's keys.
 * @returns The keys the name claims.
 */
function claimedKeys(exportName: string, keys: readonly string[]): string[] {
    const name = compact(exportName);
    const spelled = keys.filter((key) => name.includes(compact(key)));

    return spelled.filter(
        (key) => !spelled.some((other) => other !== key && compact(other).includes(compact(key))),
    );
}

/**
 * Check every tree in {@link SUBJECT_TREES} against its stories' names.
 * @param readings - The story files, as read by `story-source`.
 * @returns One report per tree, in table order.
 */
export function checkTreeSubjects(readings: readonly StoryFileReading[]): TreeReport[] {
    return SUBJECT_TREES.map(({ tree, subject, keys, spellings }) => {
        const vocabulary = keys();
        const findings: SubjectFinding[] = [];
        let checked = 0;

        for (const reading of readings) {
            if (!reading.title.startsWith(tree)) {
                continue;
            }

            for (const story of reading.stories) {
                const claimed = claimedKeys(story.exportName, vocabulary);

                if (claimed.length === 0) {
                    continue;
                }

                checked += 1;

                const strings = new Set(story.strings);
                const missing = claimed.filter((key) => !spellings(key).some((spelling) => strings.has(spelling)));

                if (missing.length > 0) {
                    findings.push({
                        id: story.id,
                        file: story.file,
                        missing: missing.map((key) => `${subject} "${key}"`).sort(),
                        writes: story.configPaths.filter((configPath) => !configPath.includes(".")),
                    });
                }
            }
        }

        return { tree, findings, checked };
    });
}
