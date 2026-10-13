/**
 * Live mocks of the options in design/ui/style-panel-set-vs-inherited.md: how the style sidebar
 * shows what a layer sets, and what it does not. Every story uses the same Les Miserables scene
 * (Everything, Degree, Louvain, Key people, Selected, Hovered) with Everything owning the base
 * look. There is no graph: the "Preview" strip under each panel draws a few of the layer's nodes
 * as they would look, so hiding a layer or clearing a property shows its effect.
 *
 * All values, counts and sources are computed from the mock scene below, the way
 * `styles.agreement`, `styles.explain` and `styles.writers` would answer them.
 */

import {
    CompactColorInput,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    PopoutManager,
    SegmentedControl,
    ToggleIconButton,
    Tree,
    type TreeNodeData,
    UiGlyph,
    VariablePill,
} from "@graphty/compact-mantine";
import { ActionIcon, Box, Button, Checkbox, Group, Menu, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------------------------------ */
/* The scene                                                                                   */
/* ------------------------------------------------------------------------------------------ */

type PropId =
    | "shape"
    | "size"
    | "color"
    | "edgeColor"
    | "edgeWidth"
    | "head"
    | "tail"
    | "label"
    | "halo"
    | "glow"
    | "opacity"
    | "wireframe"
    | "labelFont"
    | "curve"
    | "arrowSize";

type Value =
    | { readonly kind: "color"; readonly hex: string }
    | { readonly kind: "number"; readonly n: number }
    | { readonly kind: "choice"; readonly v: string }
    | { readonly kind: "effect"; readonly hex: string; readonly amount: number }
    | { readonly kind: "byData"; readonly source: "Degree" | "Louvain community"; readonly colors: readonly string[] };

type Control = "color" | "number" | "choice" | "effect";

interface PropDef {
    readonly id: PropId;
    readonly label: string;
    /** "node color" -- for "Add node color to Selected". */
    readonly long: string;
    readonly target: "node" | "edge";
    readonly control: Control;
    readonly group: string;
    readonly options?: readonly string[];
    readonly amountLabel?: string;
    /** What the renderer draws when no visible layer writes this channel (null: nothing). */
    readonly neutral: Value | null;
    /** What a property starts at when added over the neutral value. */
    readonly starter: Value;
}

const C = (hex: string): Value => ({ kind: "color", hex });
const N = (n: number): Value => ({ kind: "number", n });
const S = (v: string): Value => ({ kind: "choice", v });
const E = (hex: string, amount: number): Value => ({ kind: "effect", hex, amount });

const SHAPES = ["Icosphere", "Sphere", "Box", "Cylinder", "Cone", "Torus"];
const ENDS = ["None", "Normal", "Tee", "Diamond", "Dot"];
const NEUTRAL_GRAY = "#9E9E9E";

const PROP_LIST: readonly PropDef[] = [
    {
        id: "shape",
        label: "Shape",
        long: "node shape",
        target: "node",
        control: "choice",
        group: "Node look",
        options: SHAPES,
        neutral: S("Sphere"),
        starter: S("Sphere"),
    },
    {
        id: "size",
        label: "Size",
        long: "node size",
        target: "node",
        control: "number",
        group: "Node look",
        neutral: N(1),
        starter: N(1),
    },
    {
        id: "color",
        label: "Color",
        long: "node color",
        target: "node",
        control: "color",
        group: "Node look",
        neutral: C(NEUTRAL_GRAY),
        starter: C(NEUTRAL_GRAY),
    },
    {
        id: "edgeColor",
        label: "Edge color",
        long: "edge color",
        target: "edge",
        control: "color",
        group: "Edges",
        neutral: C(NEUTRAL_GRAY),
        starter: C(NEUTRAL_GRAY),
    },
    {
        id: "edgeWidth",
        label: "Edge width",
        long: "edge width",
        target: "edge",
        control: "number",
        group: "Edges",
        neutral: N(1),
        starter: N(1),
    },
    {
        id: "head",
        label: "Head",
        long: "arrow head",
        target: "edge",
        control: "choice",
        group: "Edge ends",
        options: ENDS,
        neutral: S("None"),
        starter: S("None"),
    },
    {
        id: "tail",
        label: "Tail",
        long: "arrow tail",
        target: "edge",
        control: "choice",
        group: "Edge ends",
        options: ENDS,
        neutral: S("None"),
        starter: S("None"),
    },
    {
        id: "label",
        label: "Label",
        long: "node label",
        target: "node",
        control: "choice",
        group: "Node text",
        options: ["None", "Name", "Degree", "Community"],
        neutral: null,
        starter: S("Name"),
    },
    {
        id: "halo",
        label: "Halo",
        long: "halo",
        target: "node",
        control: "effect",
        group: "Node effects",
        amountLabel: "width",
        neutral: null,
        starter: E("#FFD400", 2),
    },
    {
        id: "glow",
        label: "Glow",
        long: "glow",
        target: "node",
        control: "effect",
        group: "Node effects",
        amountLabel: "amount",
        neutral: null,
        starter: E("#FFD400", 0.6),
    },
    {
        id: "opacity",
        label: "Opacity",
        long: "node opacity",
        target: "node",
        control: "number",
        group: "Node look",
        neutral: N(1),
        starter: N(1),
    },
    {
        id: "wireframe",
        label: "Wireframe",
        long: "wireframe",
        target: "node",
        control: "choice",
        group: "Node look",
        options: ["Off", "On"],
        neutral: S("Off"),
        starter: S("Off"),
    },
    {
        id: "labelFont",
        label: "Label font",
        long: "label font",
        target: "node",
        control: "choice",
        group: "Node text",
        options: ["Sans", "Serif", "Mono"],
        neutral: S("Sans"),
        starter: S("Sans"),
    },
    {
        id: "curve",
        label: "Curve",
        long: "edge curve",
        target: "edge",
        control: "choice",
        group: "Edges",
        options: ["Straight", "Arc", "Bezier"],
        neutral: S("Straight"),
        starter: S("Straight"),
    },
    {
        id: "arrowSize",
        label: "Arrow size",
        long: "arrow size",
        target: "edge",
        control: "number",
        group: "Edge ends",
        neutral: N(1),
        starter: N(1),
    },
];
const PROPS = Object.fromEntries(PROP_LIST.map((p) => [p.id, p])) as Record<PropId, PropDef>;
const CORE: readonly PropId[] = ["shape", "size", "color", "edgeColor", "edgeWidth", "head", "tail"];
/** The properties named on Option 1's "Not set here" line; the rest sit behind "More styles". */
const NAMED: readonly PropId[] = [...CORE, "label", "halo", "glow"];
const GROUPS = ["Node look", "Node text", "Node effects", "Edges", "Edge ends"];

const NAMES = [
    "Myriel",
    "Napoleon",
    "Mlle Baptistine",
    "Mme Magloire",
    "Countess de Lo",
    "Geborand",
    "Champtercier",
    "Cravatte",
    "Count",
    "Old man",
    "Labarre",
    "Valjean",
    "Marguerite",
    "Mme de R",
    "Isabeau",
    "Gervais",
    "Tholomyes",
    "Listolier",
    "Fameuil",
    "Blacheville",
    "Favourite",
    "Dahlia",
    "Zephine",
    "Fantine",
    "Mme Thenardier",
    "Thenardier",
    "Cosette",
    "Javert",
    "Fauchelevent",
    "Bamatabois",
    "Perpetue",
    "Simplice",
    "Scaufflaire",
    "Woman 1",
    "Judge",
    "Champmathieu",
    "Brevet",
    "Chenildieu",
    "Cochepaille",
    "Pontmercy",
    "Boulatruelle",
    "Eponine",
    "Anzelma",
    "Woman 2",
    "Mother Innocent",
    "Gribier",
    "Jondrette",
    "Mme Burgon",
    "Gavroche",
    "Gillenormand",
    "Magnon",
    "Mlle Gillenormand",
    "Mme Pontmercy",
    "Mlle Vaubois",
    "Lt Gillenormand",
    "Marius",
    "Baroness T",
    "Mabeuf",
    "Enjolras",
    "Combeferre",
    "Prouvaire",
    "Feuilly",
    "Courfeyrac",
    "Bahorel",
    "Bossuet",
    "Joly",
    "Grantaire",
    "Mother Plutarch",
    "Gueulemer",
    "Babet",
    "Claquesous",
    "Montparnasse",
    "Toussaint",
    "Child 1",
    "Child 2",
    "Brujon",
    "Mme Hucheloup",
];
const KNOWN_DEGREE: Record<string, number> = {
    Valjean: 36,
    Gavroche: 22,
    Marius: 19,
    Javert: 17,
    Thenardier: 16,
    Fantine: 15,
    Enjolras: 15,
    Courfeyrac: 13,
    Bossuet: 13,
    Bahorel: 12,
    Cosette: 11,
    Eponine: 11,
    Myriel: 10,
};
const COMMUNITY_OF: Record<string, number> = {
    Myriel: 0,
    Napoleon: 0,
    Thenardier: 1,
    "Mme Thenardier": 1,
    Eponine: 1,
    Fantine: 2,
    Tholomyes: 2,
    Gavroche: 3,
    Enjolras: 3,
    Courfeyrac: 3,
    Bossuet: 3,
    Bahorel: 3,
    Valjean: 4,
    Javert: 4,
    Fauchelevent: 4,
    Cosette: 4,
    Marius: 5,
    Gillenormand: 5,
    Pontmercy: 5,
};
const RAMP = ["#2C7BB6", "#ABD9E9", "#FFFFBF", "#FDAE61", "#D7191C"];
const OKABE_ITO = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00"];

interface El {
    readonly id: string;
    readonly kind: "node" | "edge";
    readonly name: string;
    readonly degree: number;
    readonly community: number;
}

const NODES: readonly El[] = NAMES.map((name, i) => ({
    id: `n${String(i)}`,
    kind: "node",
    name,
    degree: KNOWN_DEGREE[name] ?? 1 + ((i * 7) % 9),
    community: COMMUNITY_OF[name] ?? i % 6,
}));
const EDGES: readonly El[] = Array.from({ length: 254 }, (_, i) => ({
    id: `e${String(i)}`,
    kind: "edge",
    name: `Edge ${String(i + 1)}`,
    degree: 0,
    community: 0,
}));
const ELEMENTS = [...NODES, ...EDGES];
const SELECTED_NODES = new Set(["Valjean", "Javert", "Cosette"]);
const KEY_PEOPLE = new Set(["Valjean", "Javert", "Cosette", "Marius", "Fantine", "Thenardier"]);

interface Layer {
    readonly id: string;
    readonly name: string;
    /** Which elements the layer's selector matches. */
    readonly scope: (el: El) => boolean;
    readonly scopeLabel: string;
    /** "selected" for Selected: "nothing selected" reads differently from an empty selector. */
    readonly scopeNoun: string;
    readonly writes: Partial<Record<PropId, Value>>;
    readonly hidden: boolean;
}

const DEGREE_RAMP: Value = { kind: "byData", source: "Degree", colors: [RAMP[0], RAMP[4]] };
const LOUVAIN: Value = { kind: "byData", source: "Louvain community", colors: OKABE_ITO };

/** Bottom first. Louvain starts hidden so Degree's colors show. */
function initialLayers(): Layer[] {
    return [
        {
            id: "everything",
            name: "Everything",
            scope: () => true,
            scopeLabel: "Every node and edge",
            scopeNoun: "elements",
            writes: {
                shape: S("Icosphere"),
                size: N(1),
                color: C("#3388FF"),
                edgeColor: C("#B8B8B8"),
                edgeWidth: N(1),
                head: S("Normal"),
                tail: S("None"),
            },
            hidden: false,
        },
        {
            id: "degree",
            name: "Degree",
            scope: (el) => el.kind === "node",
            scopeLabel: "Every node",
            scopeNoun: "nodes",
            writes: { color: DEGREE_RAMP },
            hidden: false,
        },
        {
            id: "louvain",
            name: "Louvain",
            scope: (el) => el.kind === "node",
            scopeLabel: "Every node",
            scopeNoun: "nodes",
            writes: { color: LOUVAIN },
            hidden: true,
        },
        {
            id: "key",
            name: "Key people",
            scope: (el) => KEY_PEOPLE.has(el.name),
            scopeLabel: "Nodes: 6 named people",
            scopeNoun: "nodes",
            writes: { size: N(2), label: S("Name") },
            hidden: false,
        },
        {
            id: "selected",
            name: "Selected",
            scope: (el) => SELECTED_NODES.has(el.name),
            scopeLabel: "Nodes: selected (3 now)",
            scopeNoun: "selected nodes",
            writes: { halo: E("#FFD400", 2), glow: E("#FFD400", 0.6) },
            hidden: false,
        },
        {
            id: "hovered",
            name: "Hovered",
            scope: () => false,
            scopeLabel: "Nodes: hovered (none now)",
            scopeNoun: "hovered nodes",
            writes: {},
            hidden: false,
        },
    ];
}

/* ------------------------------------------------------------------------------------------ */
/* What graphty-element would answer: agreement, explain, writers                              */
/* ------------------------------------------------------------------------------------------ */

const same = (a: Value | null | undefined, b: Value | null | undefined): boolean =>
    JSON.stringify(a) === JSON.stringify(b);

/** The elements a question about this layer and property reads: its own, or every one when it matches none. */
function elementsOf(layer: Layer, p: PropId): { els: El[]; empty: boolean } {
    const { target } = PROPS[p];
    const own = ELEMENTS.filter((el) => el.kind === target && layer.scope(el));
    return own.length > 0
        ? { els: own, empty: false }
        : { els: ELEMENTS.filter((el) => el.kind === target), empty: true };
}

/** One answer group: these elements get this value from this layer (null: no visible layer writes it). */
interface Group {
    readonly layer: Layer | null;
    readonly value: Value | null;
    readonly count: number;
}

function isVisible(layer: Layer, solo: string | null): boolean {
    return solo === null ? !layer.hidden : layer.id === solo;
}

/** The topmost visible layer at or below index `top` that writes p on el. */
function winnerAt(layers: readonly Layer[], el: El, p: PropId, top: number, solo: string | null): Layer | null {
    for (let i = top; i >= 0; i--) {
        const l = layers[i];
        if (isVisible(l, solo) && l.writes[p] !== undefined && l.scope(el)) {
            return l;
        }
    }
    return null;
}

function groupBy(layers: readonly Layer[], els: readonly El[], p: PropId, top: number, solo: string | null): Group[] {
    const out = new Map<string, { layer: Layer | null; value: Value | null; count: number }>();
    for (const el of els) {
        const w = winnerAt(layers, el, p, top, solo);
        const key = w?.id ?? "";
        const g = out.get(key) ?? { layer: w, value: w === null ? PROPS[p].neutral : (w.writes[p] ?? null), count: 0 };
        g.count++;
        out.set(key, g);
    }
    return [...out.values()].sort((a, b) => b.count - a.count);
}

/** `styles.agreement(scope, p, { below })`: what this layer's elements would get without it. */
function below(layers: readonly Layer[], id: string, p: PropId, solo: string | null): Group[] {
    const i = layers.findIndex((l) => l.id === id);
    return groupBy(layers, elementsOf(layers[i], p).els, p, i - 1, solo);
}

/** `styles.agreement(scope, p)`: what the canvas draws for this layer's elements. */
function result(layers: readonly Layer[], id: string, p: PropId, solo: string | null): Group[] {
    const i = layers.findIndex((l) => l.id === id);
    return groupBy(layers, elementsOf(layers[i], p).els, p, layers.length - 1, solo);
}

/** `styles.writers(scope, p)`: every visible layer that writes p on this layer's elements, topmost first. */
function writers(
    layers: readonly Layer[],
    id: string,
    p: PropId,
    solo: string | null,
): { layer: Layer; count: number; wins: number }[] {
    const i = layers.findIndex((l) => l.id === id);
    const { els } = elementsOf(layers[i], p);
    const out: { layer: Layer; count: number; wins: number }[] = [];
    for (let j = layers.length - 1; j >= 0; j--) {
        const l = layers[j];
        if (!isVisible(l, solo) || l.writes[p] === undefined) {
            continue;
        }
        const mine = els.filter((el) => l.scope(el));
        if (mine.length > 0) {
            out.push({
                layer: l,
                count: mine.length,
                wins: mine.filter((el) => winnerAt(layers, el, p, layers.length - 1, solo) === l).length,
            });
        }
    }
    return out;
}

/** The concrete look of one element for one property, for the preview and "Why this look". */
function concrete(v: Value | null, el: El): string | number | null {
    if (v === null) {
        return null;
    }
    switch (v.kind) {
        case "color":
            return v.hex;
        case "number":
            return v.n;
        case "choice":
            return v.v;
        case "effect":
            return v.hex;
        default:
            if (v.source === "Degree") {
                const t = Math.min(1, (el.degree - 1) / 35);
                return RAMP[Math.round(t * (RAMP.length - 1))];
            }
            return OKABE_ITO[el.community % OKABE_ITO.length];
    }
}

/* ------------------------------------------------------------------------------------------ */
/* The app's words over those facts                                                            */
/* ------------------------------------------------------------------------------------------ */

function words(v: Value | null, p: PropId): string {
    if (v === null) {
        return "none";
    }
    switch (v.kind) {
        case "color":
            return v.hex;
        case "number":
            return String(v.n);
        case "choice":
            return v.v;
        case "effect":
            return `${v.hex}, ${PROPS[p].amountLabel ?? "amount"} ${String(v.amount)}`;
        default:
            return `by ${v.source}`;
    }
}

/** The renderer's neutral value in words: "built-in gray", "no halo", "1, built-in". */
function neutralWords(p: PropId): string {
    const def = PROPS[p];
    if (def.control === "color") {
        return "built-in gray";
    }
    return def.neutral === null ? `no ${def.long}` : `${words(def.neutral, p)}, built-in`;
}

/** "#3388FF, from Everything", "built-in gray", or "Mixed: Key people on 6, Everything on 71". */
function source(groups: readonly Group[], p: PropId): string {
    if (groups.length === 1) {
        const g = groups[0];
        if (g.layer === null) {
            return neutralWords(p);
        }
        return `${words(g.value, p)}, from ${g.layer.name}`;
    }
    return `Mixed: ${groups.map((g) => `${g.layer?.name ?? "built-in"} on ${String(g.count)}`).join(", ")}`;
}

/* ------------------------------------------------------------------------------------------ */
/* Scene state                                                                                 */
/* ------------------------------------------------------------------------------------------ */

interface Scene {
    readonly layers: readonly Layer[];
    readonly selected: readonly string[];
    readonly select: (ids: readonly string[]) => void;
    readonly solo: string | null;
    readonly setSolo: (id: string | null) => void;
    /** Writes (or, with undefined, clears) p on every listed layer. */
    readonly write: (ids: readonly string[], p: PropId, v: Value | undefined, label: string) => void;
    readonly toggleHidden: (id: string) => void;
    readonly undo: () => void;
    readonly undoLabel: string | null;
    readonly layer: (id: string) => Layer;
}

function useScene(initialSelection: readonly string[]): Scene {
    const [layers, setLayers] = useState<Layer[]>(initialLayers);
    const [selected, select] = useState<readonly string[]>(initialSelection);
    const [solo, setSolo] = useState<string | null>(null);
    const [history, setHistory] = useState<{ layers: Layer[]; label: string }[]>([]);
    const commit = (next: Layer[], label: string): void => {
        setHistory((h) => [...h, { layers, label }]);
        setLayers(next);
    };
    return {
        layers,
        selected,
        select,
        solo,
        setSolo,
        write: (ids, p, v, label) => {
            commit(
                layers.map((l) => {
                    if (!ids.includes(l.id)) {
                        return l;
                    }
                    const writes: Partial<Record<PropId, Value>> = Object.fromEntries(
                        Object.entries(l.writes).filter(([k]) => k !== p),
                    );
                    if (v !== undefined) {
                        writes[p] = v;
                    }
                    return { ...l, writes };
                }),
                label,
            );
        },
        toggleHidden: (id) => {
            const l = layers.find((x) => x.id === id);
            commit(
                layers.map((x) => (x.id === id ? { ...x, hidden: !x.hidden } : x)),
                `${l?.hidden === true ? "Show" : "Hide"} ${l?.name ?? id}`,
            );
        },
        undo: () => {
            const last = history.at(-1);
            if (last !== undefined) {
                setLayers(last.layers);
                setHistory(history.slice(0, -1));
            }
        },
        undoLabel: history.at(-1)?.label ?? null,
        layer: (id) => layers.find((l) => l.id === id) ?? layers[0],
    };
}

/* ------------------------------------------------------------------------------------------ */
/* Shared pieces                                                                               */
/* ------------------------------------------------------------------------------------------ */

type OptionId = "o1" | "o2" | "o3" | "o4" | "o5" | "o6" | "o7";

interface PanelProps {
    readonly scene: Scene;
    /** The layers the panel edits: the tree's selection. */
    readonly ids: readonly string[];
}

/** Which of the panel's layers set p, and their values. */
function settersOf(scene: Scene, ids: readonly string[], p: PropId): { id: string; value: Value }[] {
    return ids.flatMap((id) => {
        const v = scene.layer(id).writes[p];
        return v === undefined ? [] : [{ id, value: v }];
    });
}

/** The value a newly added property starts at, or the candidates when the value beneath is mixed. */
function prefill(scene: Scene, ids: readonly string[], p: PropId): { value: Value } | { candidates: Group[] } {
    const groups = ids.flatMap((id) => below(scene.layers, id, p, scene.solo));
    const distinct = groups.filter((g, i) => groups.findIndex((h) => same(h.value, g.value)) === i);
    if (distinct.length === 1) {
        return { value: distinct[0].value ?? PROPS[p].starter };
    }
    return { candidates: distinct };
}

function names(scene: Scene, ids: readonly string[]): string {
    return ids.map((id) => scene.layer(id).name).join(" and ");
}

/** Moves focus to an element in the panel once React has drawn it. */
function useFocusRequest(): [React.RefObject<HTMLDivElement | null>, (selector: string) => void] {
    const root = useRef<HTMLDivElement>(null);
    const [want, setWant] = useState<string | null>(null);
    useEffect(() => {
        if (want !== null) {
            root.current?.querySelector<HTMLElement>(want)?.focus();
            setWant(null);
        }
    }, [want]);
    return [root, setWant];
}

const FOCUS_ROW = (p: PropId): string => `[data-row="${p}"] input, [data-row="${p}"] button`;

function MinusButton({
    label,
    tip,
    onClick,
}: {
    readonly label: string;
    readonly tip: string;
    readonly onClick: () => void;
}): React.JSX.Element {
    return (
        <Tooltip label={tip} withinPortal>
            <ActionIcon
                variant="subtle"
                size={PANEL_GRID.TRAIL}
                c={PANEL_INK.CHROME}
                aria-label={label}
                aria-description={tip}
                onClick={onClick}
            >
                <UiGlyph name="minus" size={PANEL_GRID.GLYPH} />
            </ActionIcon>
        </Tooltip>
    );
}

/**
 * The control for a set property. Several layers with different values read "Mixed", as a word.
 * @param props - Props.
 * @param props.p - The property.
 * @param props.values - The value on each layer that sets it.
 * @param props.onChange - Writes a new value.
 * @returns The control.
 */
function SetControl({
    p,
    values,
    onChange,
}: {
    readonly p: PropId;
    readonly values: readonly Value[];
    readonly onChange: (v: Value) => void;
}): React.JSX.Element {
    const def = PROPS[p];
    const v = values[0];
    if (values.some((x) => !same(x, v))) {
        return (
            <Tooltip
                label="The selected layers set different values. Click to give them all the first one, then edit."
                withinPortal
            >
                <Button
                    variant="default"
                    size="compact-xs"
                    fullWidth
                    aria-label={`${def.label}, mixed`}
                    onClick={() => {
                        onChange(v);
                    }}
                >
                    Mixed
                </Button>
            </Tooltip>
        );
    }
    switch (v.kind) {
        case "color":
            return (
                <CompactColorInput
                    color={v.hex}
                    defaultColor={v.hex}
                    showOpacity={false}
                    showReset={false}
                    width="100%"
                    onColorChange={(next) => {
                        if (next !== undefined) {
                            onChange(C(next.toUpperCase()));
                        }
                    }}
                />
            );
        case "number":
            return (
                <PanelField
                    label={def.label}
                    kind="number"
                    width="fill"
                    value={v.n}
                    min={0}
                    step={0.5}
                    onChange={(n) => {
                        onChange(N(Number(n)));
                    }}
                />
            );
        case "choice":
            return (
                <PanelField
                    label={def.label}
                    kind="select"
                    width="fill"
                    data={[...(def.options ?? [])]}
                    value={v.v}
                    onChange={(next) => {
                        onChange(S(String(next)));
                    }}
                />
            );
        case "effect":
            return (
                <Group gap={4} wrap="nowrap">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <CompactColorInput
                            color={v.hex}
                            defaultColor={v.hex}
                            showOpacity={false}
                            showReset={false}
                            width="100%"
                            onColorChange={(next) => {
                                if (next !== undefined) {
                                    onChange(E(next.toUpperCase(), v.amount));
                                }
                            }}
                        />
                    </Box>
                    <Box style={{ width: 64, flex: "0 0 64px" }}>
                        <PanelField
                            label={`${def.label} ${def.amountLabel ?? "amount"}`}
                            kind="number"
                            width="fill"
                            glyph={def.amountLabel === "width" ? "width" : "opacity"}
                            value={v.amount}
                            min={0}
                            step={0.1}
                            onChange={(n) => {
                                onChange(E(v.hex, Number(n)));
                            }}
                        />
                    </Box>
                </Group>
            );
        default:
            return (
                <Stack gap={2}>
                    <Group gap={4} wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <VariablePill name={`by ${v.source}`} kind="property" width="100%" />
                        </Box>
                        <Tooltip label="Use one color" withinPortal>
                            <ActionIcon
                                variant="subtle"
                                size={PANEL_GRID.TRAIL}
                                c={PANEL_INK.CHROME}
                                aria-label="Use one color"
                                onClick={() => {
                                    onChange(C(v.colors[0]));
                                }}
                            >
                                <UiGlyph name="unlink" size={PANEL_GRID.GLYPH} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                    <Group gap={4} wrap="nowrap">
                        <Box
                            aria-hidden="true"
                            style={{
                                width: 60,
                                height: 8,
                                borderRadius: 2,
                                background: `linear-gradient(90deg, ${v.colors.join(", ")})`,
                            }}
                        />
                        <Text size="xs" c={PANEL_INK.CHROME}>
                            {v.source === "Degree"
                                ? `low ${v.colors[0]} to high ${v.colors[1]}`
                                : `${String(v.colors.length)} colors, one per community`}
                        </Text>
                    </Group>
                </Stack>
            );
    }
}

/**
 * A set row: label, control, minus, and "Set on 2 of 3" when only some selected layers set it.
 * @param props - Props.
 * @param props.scene - The scene.
 * @param props.ids - The panel's layers.
 * @param props.p - The property.
 * @param props.onCleared - Called after the minus clears it.
 * @param props.caption - An extra line under the row.
 * @param props.withMinus - Draw the minus (Option 3 uses its checkbox instead).
 * @param props.labelSlot - Replaces the text label.
 * @returns The row.
 */
function SetRow({
    scene,
    ids,
    p,
    onCleared,
    caption,
    withMinus = true,
    labelSlot,
}: PanelProps & {
    readonly p: PropId;
    readonly onCleared?: () => void;
    readonly caption?: React.ReactNode;
    readonly withMinus?: boolean;
    readonly labelSlot?: React.ReactNode;
}): React.JSX.Element {
    const def = PROPS[p];
    const setters = settersOf(scene, ids, p);
    const beneath = source(
        ids
            .flatMap((id) => below(scene.layers, id, p, scene.solo))
            .filter((g, i, all) => all.findIndex((h) => h.layer === g.layer) === i),
        p,
    );
    return (
        <Box data-row={p} style={{ padding: "2px 0" }}>
            <Group gap={6} wrap="nowrap" align="flex-start">
                {labelSlot ?? (
                    <Text size="xs" style={{ width: 64, flex: "0 0 64px", paddingTop: 4 }}>
                        {def.label}
                    </Text>
                )}
                <Box style={{ flex: 1, minWidth: 0 }}>
                    <SetControl
                        p={p}
                        values={setters.map((s) => s.value)}
                        onChange={(v) => {
                            scene.write(ids, p, v, `Set ${def.long}`);
                        }}
                    />
                </Box>
                {withMinus && (
                    <MinusButton
                        label={`Clear ${def.long} on ${names(scene, ids)}`}
                        tip={`Clear: back to ${beneath}`}
                        onClick={() => {
                            scene.write(ids, p, undefined, `Clear ${def.long}`);
                            onCleared?.();
                        }}
                    />
                )}
            </Group>
            {ids.length > 1 && setters.length < ids.length && (
                <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingLeft: 70 }}>
                    Set on {setters.length} of {ids.length}
                </Text>
            )}
            {caption}
        </Box>
    );
}

/**
 * The row shown while an added property waits for a value because the value beneath is mixed.
 * @param props - Props.
 * @param props.p - The property.
 * @param props.candidates - The values beneath, to start from.
 * @param props.onPick - Writes the chosen value.
 * @param props.onCancel - Abandons the add.
 * @returns The row.
 */
function PendingRow({
    p,
    candidates,
    onPick,
    onCancel,
}: {
    readonly p: PropId;
    readonly candidates: readonly Group[];
    readonly onPick: (v: Value) => void;
    readonly onCancel: () => void;
}): React.JSX.Element {
    return (
        <Box data-row={p} style={{ padding: "4px 0" }}>
            <Text size="xs">{PROPS[p].label}: the value beneath is mixed. Pick one to start from:</Text>
            <Group gap={4} style={{ paddingTop: 4 }}>
                {candidates.map((g) => (
                    <Button
                        key={g.layer?.id ?? "builtin"}
                        size="compact-xs"
                        variant="default"
                        onClick={() => {
                            onPick(g.value ?? PROPS[p].starter);
                        }}
                    >
                        {words(g.value, p)} ({g.layer?.name ?? "built-in"})
                    </Button>
                ))}
                <Button size="compact-xs" variant="subtle" onClick={onCancel}>
                    Cancel
                </Button>
            </Group>
        </Box>
    );
}

/**
 * Adds p to the panel's layers, prefilled from the value beneath so the canvas does not change.
 * @param scene - The scene.
 * @param ids - The panel's layers.
 * @param p - The property.
 * @param setPending - Shows the pick row when the value beneath is mixed.
 */
function addProp(
    scene: Scene,
    ids: readonly string[],
    p: PropId,
    setPending: (x: { p: PropId; candidates: Group[] } | null) => void,
): void {
    const pre = prefill(scene, ids, p);
    if ("value" in pre) {
        scene.write(ids, p, pre.value, `Set ${PROPS[p].long}`);
    } else {
        setPending({ p, candidates: pre.candidates });
    }
}

/** "Now #3388FF, from Everything" for an unset property. */
function nowText(scene: Scene, ids: readonly string[], p: PropId): string {
    const groups = ids.flatMap((id) => below(scene.layers, id, p, scene.solo));
    const merged = groups.filter((g, i) => groups.findIndex((h) => h.layer === g.layer) === i);
    return `Now ${source(merged, p)}`;
}

/** The properties any panel layer sets, in register order. */
function setProps(scene: Scene, ids: readonly string[]): PropId[] {
    return PROP_LIST.map((d) => d.id).filter((p) => ids.some((id) => scene.layer(id).writes[p] !== undefined));
}

function Header({ scene, ids, extra }: PanelProps & { readonly extra?: React.ReactNode }): React.JSX.Element {
    if (ids.length > 1) {
        return (
            <Box style={{ paddingBottom: 6, borderBottom: `1px solid ${PANEL_INK.DIVIDER}` }}>
                <Text size="sm" fw={600}>
                    {ids.length} layers selected
                </Text>
                <Text size="xs" c={PANEL_INK.CHROME}>
                    {names(scene, ids)}. Edits write to every one.
                </Text>
                {extra}
            </Box>
        );
    }
    const l = scene.layer(ids[0]);
    const n = Object.keys(l.writes).length;
    return (
        <Box style={{ paddingBottom: 6, borderBottom: `1px solid ${PANEL_INK.DIVIDER}` }}>
            <Group gap={4} wrap="nowrap" justify="space-between">
                <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                    <EyeToggle scene={scene} id={l.id} />
                    <Text
                        size="sm"
                        fw={600}
                        truncate
                        aria-label={`${l.name}, sets ${String(n)} ${n === 1 ? "style" : "styles"}`}
                    >
                        {l.name}
                    </Text>
                </Group>
                <Text size="xs" c={PANEL_INK.CHROME} aria-hidden="true" style={{ flex: "0 0 auto" }}>
                    {n === 0 ? "sets nothing" : `sets ${String(n)}`}
                </Text>
            </Group>
            <Text size="xs" c={PANEL_INK.CHROME}>
                {l.scopeLabel}
            </Text>
            {extra}
        </Box>
    );
}

function EyeToggle({ scene, id }: { readonly scene: Scene; readonly id: string }): React.JSX.Element {
    const l = scene.layer(id);
    return (
        <ToggleIconButton
            variant="swap"
            label={`Hide ${l.name}`}
            checked={l.hidden}
            icon={<UiGlyph name="eye" size={PANEL_GRID.GLYPH} />}
            checkedIcon={<UiGlyph name="eyeClosed" size={PANEL_GRID.GLYPH} />}
            onChange={() => {
                scene.toggleHidden(id);
            }}
        />
    );
}

function SoloToggle({ scene, id }: { readonly scene: Scene; readonly id: string }): React.JSX.Element {
    const l = scene.layer(id);
    return (
        <ToggleIconButton
            variant="fill"
            label={`Show only ${l.name}`}
            checked={scene.solo === id}
            icon={
                <Text span size="xs" fw={700} aria-hidden="true">
                    S
                </Text>
            }
            onChange={(on) => {
                scene.setSolo(on ? id : null);
            }}
        />
    );
}

function SetsNothing(): React.JSX.Element {
    return (
        <Text size="xs" c={PANEL_INK.CHROME} style={{ padding: "6px 0" }}>
            Sets nothing yet
        </Text>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Option 1: set rows, then a line of named add buttons                                        */
/* ------------------------------------------------------------------------------------------ */

function NamedLine({ scene, ids, onAdd }: PanelProps & { readonly onAdd: (p: PropId) => void }): React.JSX.Element {
    const unset = (list: readonly PropId[]): PropId[] =>
        list.filter((p) => ids.every((id) => scene.layer(id).writes[p] === undefined));
    const named = unset(NAMED);
    const more = unset(PROP_LIST.map((d) => d.id).filter((p) => !NAMED.includes(p)));
    return (
        <Box style={{ borderTop: `1px solid ${PANEL_INK.DIVIDER}`, marginTop: 6, paddingTop: 6 }}>
            <Group gap={4} align="center">
                <Text size="xs" c={PANEL_INK.CHROME} component="span">
                    {named.length === 0 ? "Every core style is set here." : "Not set here:"}
                </Text>
                {named.map((p) => {
                    const now = nowText(scene, ids, p);
                    return (
                        <Tooltip key={p} label={now} withinPortal>
                            <Button
                                data-add={p}
                                size="compact-xs"
                                variant="default"
                                aria-label={`Add ${PROPS[p].long} to ${names(scene, ids)}`}
                                aria-description={now}
                                onClick={() => {
                                    onAdd(p);
                                }}
                            >
                                {PROPS[p].label}
                            </Button>
                        </Tooltip>
                    );
                })}
                <AddMenu scene={scene} ids={ids} props={more} onAdd={onAdd} label="More styles" />
            </Group>
        </Box>
    );
}

/**
 * A menu of properties to add, grouped, each with the value now in effect as its second line.
 * @param props - Props.
 * @param props.scene - The scene.
 * @param props.ids - The panel's layers.
 * @param props.props - The properties to offer.
 * @param props.onAdd - Adds one.
 * @param props.label - The button's text.
 * @returns The menu.
 */
function AddMenu({
    scene,
    ids,
    props,
    onAdd,
    label,
}: PanelProps & {
    readonly props: readonly PropId[];
    readonly onAdd: (p: PropId) => void;
    readonly label: string;
}): React.JSX.Element | null {
    if (props.length === 0) {
        return null;
    }
    return (
        <Menu position="bottom-start" withinPortal width={240}>
            <Menu.Target>
                <Button
                    data-add="menu"
                    size="compact-xs"
                    variant="subtle"
                    leftSection={<UiGlyph name="plus" size={12} />}
                >
                    {label}
                </Button>
            </Menu.Target>
            <Menu.Dropdown>
                {GROUPS.map((g) => {
                    const inGroup = props.filter((p) => PROPS[p].group === g);
                    if (inGroup.length === 0) {
                        return null;
                    }
                    return (
                        <React.Fragment key={g}>
                            <Menu.Label>{g}</Menu.Label>
                            {inGroup.map((p) => {
                                const now = nowText(scene, ids, p);
                                return (
                                    <Menu.Item
                                        key={p}
                                        aria-description={now.toLowerCase()}
                                        onClick={() => {
                                            onAdd(p);
                                        }}
                                    >
                                        <Text size="xs">{PROPS[p].label}</Text>
                                        <Text size="xs" c={PANEL_INK.CHROME}>
                                            {now.toLowerCase()}
                                        </Text>
                                    </Menu.Item>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * Option 1's panel (also the layer panel of Options 6 and 7).
 * @param props - Props.
 * @param props.scene - The scene.
 * @param props.ids - The panel's layers.
 * @param props.headerExtra - Extra header content (Option 6's switch).
 * @param props.menuOnly - Option 2: one "Add style" menu instead of the line of names.
 * @returns The panel.
 */
function SetOnlyPanel({
    scene,
    ids,
    headerExtra,
    menuOnly = false,
}: PanelProps & { readonly headerExtra?: React.ReactNode; readonly menuOnly?: boolean }): React.JSX.Element {
    const [root, focus] = useFocusRequest();
    const [pending, setPending] = useState<{ p: PropId; candidates: Group[] } | null>(null);
    const rows = setProps(scene, ids);
    const add = (p: PropId): void => {
        addProp(scene, ids, p, setPending);
        focus(FOCUS_ROW(p));
    };
    return (
        <Box ref={root}>
            <Header scene={scene} ids={ids} extra={headerExtra} />
            <Box style={{ paddingTop: 4 }}>
                {rows.length === 0 && pending === null && <SetsNothing />}
                {rows.map((p) => (
                    <SetRow
                        key={p}
                        scene={scene}
                        ids={ids}
                        p={p}
                        onCleared={() => {
                            focus(menuOnly ? '[data-add="menu"]' : `[data-add="${p}"], [data-add="menu"]`);
                        }}
                    />
                ))}
                {pending !== null && (
                    <PendingRow
                        p={pending.p}
                        candidates={pending.candidates}
                        onPick={(v) => {
                            scene.write(ids, pending.p, v, `Set ${PROPS[pending.p].long}`);
                            setPending(null);
                            focus(FOCUS_ROW(pending.p));
                        }}
                        onCancel={() => {
                            setPending(null);
                        }}
                    />
                )}
            </Box>
            {menuOnly ? (
                <Box style={{ paddingTop: 4 }}>
                    <AddMenu
                        scene={scene}
                        ids={ids}
                        props={PROP_LIST.map((d) => d.id).filter((p) => !rows.includes(p))}
                        onAdd={add}
                        label="Add style"
                    />
                </Box>
            ) : (
                <NamedLine scene={scene} ids={ids} onAdd={add} />
            )}
        </Box>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Option 3: every core row kept, with an "Includes" checkbox                                  */
/* ------------------------------------------------------------------------------------------ */

/** The fixed rows of Options 3 to 5: the seven core properties, then any other the layers set. */
function fixedRows(scene: Scene, ids: readonly string[]): PropId[] {
    return [...CORE, ...setProps(scene, ids).filter((p) => !CORE.includes(p))];
}

function CheckboxPanel({ scene, ids }: PanelProps): React.JSX.Element {
    const [root, focus] = useFocusRequest();
    const [pending, setPending] = useState<{ p: PropId; candidates: Group[] } | null>(null);
    const rows = fixedRows(scene, ids);
    const more = PROP_LIST.map((d) => d.id).filter((p) => !rows.includes(p));
    return (
        <Box ref={root}>
            <Header scene={scene} ids={ids} />
            <Box style={{ paddingTop: 4 }}>
                {rows.map((p) => {
                    const def = PROPS[p];
                    const setters = settersOf(scene, ids, p);
                    const box = (
                        <Checkbox
                            size="xs"
                            label={def.label}
                            checked={setters.length === ids.length}
                            indeterminate={setters.length > 0 && setters.length < ids.length}
                            aria-label={`Include ${def.long} in ${names(scene, ids)}`}
                            styles={{ root: { width: 88, flex: "0 0 88px", paddingTop: 4 } }}
                            onChange={(e) => {
                                if (e.currentTarget.checked) {
                                    addProp(scene, ids, p, setPending);
                                    focus(`${FOCUS_ROW(p)}:not([type=checkbox])`);
                                } else {
                                    scene.write(ids, p, undefined, `Clear ${def.long}`);
                                }
                            }}
                        />
                    );
                    if (pending?.p === p) {
                        return (
                            <PendingRow
                                key={p}
                                p={p}
                                candidates={pending.candidates}
                                onPick={(v) => {
                                    scene.write(ids, p, v, `Set ${def.long}`);
                                    setPending(null);
                                }}
                                onCancel={() => {
                                    setPending(null);
                                }}
                            />
                        );
                    }
                    if (setters.length > 0) {
                        return <SetRow key={p} scene={scene} ids={ids} p={p} withMinus={false} labelSlot={box} />;
                    }
                    const beneath = ids.flatMap((id) => below(scene.layers, id, p, scene.solo));
                    const builtin = beneath.length > 0 && beneath.every((g) => g.layer === null);
                    return (
                        <Tooltip key={p} label={nowText(scene, ids, p)} withinPortal position="left">
                            <Group data-row={p} gap={6} wrap="nowrap" style={{ padding: "2px 0" }}>
                                {box}
                                <Text size="xs" c={PANEL_INK.PLACEHOLDER} style={{ paddingTop: 4 }}>
                                    {builtin ? `Not set (${neutralWords(p)})` : "Not set"}
                                </Text>
                            </Group>
                        </Tooltip>
                    );
                })}
            </Box>
            <Box style={{ paddingTop: 4 }}>
                <AddMenu
                    scene={scene}
                    ids={ids}
                    props={more}
                    onAdd={(p) => {
                        addProp(scene, ids, p, setPending);
                    }}
                    label="More styles"
                />
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Option 4: two columns, "This layer" and "Result"                                            */
/* ------------------------------------------------------------------------------------------ */

function shortWords(v: Value | null, p: PropId): string {
    if (v?.kind === "byData") {
        return "varies";
    }
    if (v?.kind === "choice" && v.v === "Icosphere") {
        return "Ico";
    }
    if (v?.kind === "effect") {
        return v.hex;
    }
    return words(v, p);
}

function SourceLink({ scene, layer }: { readonly scene: Scene; readonly layer: Layer | null }): React.JSX.Element {
    if (layer === null) {
        return <>built-in</>;
    }
    return (
        <UnstyledButton
            aria-label={`Select layer ${layer.name}`}
            style={{ fontSize: "inherit", color: "inherit", textDecoration: "underline dotted" }}
            onClick={() => {
                scene.select([layer.id]);
            }}
        >
            {layer.name}
        </UnstyledButton>
    );
}

function ResultCaption({
    scene,
    id,
    p,
}: {
    readonly scene: Scene;
    readonly id: string;
    readonly p: PropId;
}): React.JSX.Element {
    const groups = result(scene.layers, id, p, scene.solo);
    const own = scene.layer(id);
    const { empty } = elementsOf(own, p);
    let body: React.ReactNode;
    let full: string;
    if (groups.length > 1) {
        full = groups
            .map((g) => `${words(g.value, p)} from ${g.layer?.name ?? "built-in"} on ${String(g.count)}`)
            .join("; ");
        body = `Mixed (${String(groups.length)})`;
    } else {
        const g = groups[0];
        if (g.layer?.id === id) {
            full = "this layer";
            body = "this layer";
        } else if (own.writes[p] !== undefined && g.layer !== null) {
            full = `covered by ${g.layer.name}`;
            body = (
                <>
                    covered - <SourceLink scene={scene} layer={g.layer} />
                </>
            );
        } else {
            full = `${words(g.value, p)} from ${g.layer?.name ?? "built-in"}`;
            body = (
                <>
                    {shortWords(g.value, p)} - <SourceLink scene={scene} layer={g.layer} />
                </>
            );
        }
    }
    if (empty) {
        full = `Nothing ${own.scopeNoun.replace(/ nodes$/, "")} now: as every element. ${full}`;
    }
    return (
        <Tooltip label={full} withinPortal multiline w={240}>
            <Text
                size="xs"
                c={PANEL_INK.CHROME}
                truncate
                aria-label={`Result: ${full}`}
                style={{ width: 130, flex: "0 0 130px", paddingTop: 4 }}
            >
                {empty && "as all: "}
                {body}
            </Text>
        </Tooltip>
    );
}

function TwoColumnPanel({ scene, ids }: PanelProps): React.JSX.Element {
    const [root, focus] = useFocusRequest();
    const [pending, setPending] = useState<{ p: PropId; candidates: Group[] } | null>(null);
    const rows = fixedRows(scene, ids);
    return (
        <Box ref={root}>
            <Header scene={scene} ids={ids} />
            <Group gap={6} wrap="nowrap" style={{ paddingTop: 6 }}>
                <Box style={{ width: 64 }} />
                <Text size="xs" fw={600} style={{ flex: 1 }}>
                    This layer
                </Text>
                <Text size="xs" fw={600} style={{ width: 130 }}>
                    Result
                </Text>
            </Group>
            {rows.map((p) => {
                const def = PROPS[p];
                const setters = settersOf(scene, ids, p);
                const result_ = <ResultCaption scene={scene} id={ids[0]} p={p} />;
                if (pending?.p === p) {
                    return (
                        <PendingRow
                            key={p}
                            p={p}
                            candidates={pending.candidates}
                            onPick={(v) => {
                                scene.write(ids, p, v, `Set ${def.long}`);
                                setPending(null);
                                focus(FOCUS_ROW(p));
                            }}
                            onCancel={() => {
                                setPending(null);
                            }}
                        />
                    );
                }
                if (setters.length > 0) {
                    return (
                        <Group key={p} gap={6} wrap="nowrap" align="flex-start">
                            <Box style={{ flex: 1, minWidth: 0 }}>
                                <SetRow
                                    scene={scene}
                                    ids={ids}
                                    p={p}
                                    onCleared={() => {
                                        focus(`[data-set="${p}"]`);
                                    }}
                                />
                            </Box>
                            {result_}
                        </Group>
                    );
                }
                return (
                    <Group
                        key={p}
                        data-row={p}
                        gap={6}
                        wrap="nowrap"
                        style={{ padding: "2px 0" }}
                        role="group"
                        aria-label={`${def.label}, not set in this layer`}
                    >
                        <Text size="xs" style={{ width: 64, flex: "0 0 64px" }}>
                            {def.label}
                        </Text>
                        <Box style={{ flex: 1 }}>
                            <Button
                                data-set={p}
                                size="compact-xs"
                                variant="default"
                                aria-label={`Set ${def.long} on ${names(scene, ids)}`}
                                onClick={() => {
                                    addProp(scene, ids, p, setPending);
                                    focus(FOCUS_ROW(p));
                                }}
                            >
                                Set
                            </Button>
                        </Box>
                        {result_}
                    </Group>
                );
            })}
            <Box style={{ paddingTop: 4 }}>
                <AddMenu
                    scene={scene}
                    ids={ids}
                    props={PROP_LIST.map((d) => d.id).filter((p) => !rows.includes(p))}
                    onAdd={(p) => {
                        addProp(scene, ids, p, setPending);
                    }}
                    label="More styles"
                />
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Option 5: a stack strip on unset rows                                                       */
/* ------------------------------------------------------------------------------------------ */

function StackStrip({
    scene,
    ids,
    p,
    onSet,
}: PanelProps & { readonly p: PropId; readonly onSet: () => void }): React.JSX.Element {
    const id = ids[0];
    const def = PROPS[p];
    const list = writers(scene.layers, id, p, scene.solo);
    const total = elementsOf(scene.layer(id), p).els.length;
    const own = scene.layers.findIndex((l) => l.id === id);
    // This layer's ring sits at its own position in the stack, topmost first.
    const marks: ({ kind: "ring" } | { kind: "layer"; layer: Layer; count: number; wins: number })[] = [];
    let placed = false;
    for (const w of list) {
        if (!placed && scene.layers.findIndex((l) => l.id === w.layer.id) < own) {
            marks.push({ kind: "ring" });
            placed = true;
        }
        marks.push({ kind: "layer", ...w });
    }
    if (!placed) {
        marks.push({ kind: "ring" });
    }
    const winners = list.filter((w) => w.wins > 0);
    const described =
        winners.length === 0
            ? `${def.label}, not set here. Nothing writes it: built-in.`
            : `${def.label}, not set here. Decided by ${winners.map((w) => `${w.layer.name} on ${String(w.wins)}`).join(", ")}.`;
    return (
        <Group gap={6} wrap="nowrap" role="group" aria-label={described} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={0} wrap="nowrap" style={{ flex: "0 0 auto" }}>
                {marks.map((m, i) => {
                    const joint =
                        i > 0 ? (
                            <Box aria-hidden="true" style={{ width: 6, height: 1, background: PANEL_INK.CHROME }} />
                        ) : null;
                    if (m.kind === "ring") {
                        return (
                            <React.Fragment key="ring">
                                {joint}
                                <Tooltip label={`Set ${def.long} here, starting from the winning value`} withinPortal>
                                    <UnstyledButton
                                        aria-label={`Set ${def.long} on ${scene.layer(id).name}`}
                                        onClick={onSet}
                                        style={{
                                            width: 14,
                                            height: 14,
                                            borderRadius: 7,
                                            border: `1.5px dashed ${PANEL_INK.CHROME}`,
                                        }}
                                    />
                                </Tooltip>
                            </React.Fragment>
                        );
                    }
                    const win = m.wins > 0;
                    const v = m.layer.writes[p] ?? null;
                    const fill =
                        v?.kind === "byData" ? `linear-gradient(90deg, ${v.colors.join(", ")})` : PANEL_INK.VALUE;
                    return (
                        <React.Fragment key={m.layer.id}>
                            {joint}
                            <Tooltip
                                label={`${m.layer.name}: ${words(v, p)}${win ? `, decides ${String(m.wins)} of ${String(total)}` : ", covered"}`}
                                withinPortal
                            >
                                <UnstyledButton
                                    aria-label={`${m.layer.name}, ${win ? `decides ${String(m.wins)} of ${String(total)}` : "covered"}. Select it`}
                                    onClick={() => {
                                        scene.select([m.layer.id]);
                                    }}
                                    style={{
                                        width: win ? Math.max(8, Math.round((28 * m.wins) / total)) : 12,
                                        height: 12,
                                        borderRadius: 2,
                                        border: `1.5px solid ${PANEL_INK.VALUE}`,
                                        background: win ? fill : "transparent",
                                    }}
                                />
                            </Tooltip>
                        </React.Fragment>
                    );
                })}
            </Group>
            <Text size="xs" c={PANEL_INK.CHROME} truncate>
                {list.length === 0 ? "built-in" : list.map((w) => w.layer.name).join(", ")}
            </Text>
        </Group>
    );
}

function CoverCaption({
    scene,
    id,
    p,
}: {
    readonly scene: Scene;
    readonly id: string;
    readonly p: PropId;
}): React.JSX.Element | null {
    const list = writers(scene.layers, id, p, scene.solo);
    const total = elementsOf(scene.layer(id), p).els.length;
    const me = list.find((w) => w.layer.id === id);
    if (me === undefined) {
        return null;
    }
    const above = list.filter((w) => w.wins > 0 && w.layer.id !== id);
    const lower = list.slice(list.indexOf(me) + 1);
    let text: string | null = null;
    if (above.length > 0) {
        text = `covered by ${above.map((w) => `${w.layer.name} on ${String(w.wins)}`).join(", ")} of ${String(total)}`;
    } else if (lower.length > 0) {
        text = `covers ${lower.map((w) => w.layer.name).join(", ")} on ${String(me.wins)} of ${String(total)}`;
    }
    return text === null ? null : (
        <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingLeft: 70 }}>
            {text}
        </Text>
    );
}

function StripPanel({ scene, ids }: PanelProps): React.JSX.Element {
    const [root, focus] = useFocusRequest();
    const [pending, setPending] = useState<{ p: PropId; candidates: Group[] } | null>(null);
    const rows = fixedRows(scene, ids);
    return (
        <Box ref={root}>
            <Header scene={scene} ids={ids} />
            <Box style={{ paddingTop: 4 }}>
                {rows.map((p) => {
                    const def = PROPS[p];
                    if (pending?.p === p) {
                        return (
                            <PendingRow
                                key={p}
                                p={p}
                                candidates={pending.candidates}
                                onPick={(v) => {
                                    scene.write(ids, p, v, `Set ${def.long}`);
                                    setPending(null);
                                    focus(FOCUS_ROW(p));
                                }}
                                onCancel={() => {
                                    setPending(null);
                                }}
                            />
                        );
                    }
                    if (settersOf(scene, ids, p).length > 0) {
                        return (
                            <SetRow
                                key={p}
                                scene={scene}
                                ids={ids}
                                p={p}
                                caption={<CoverCaption scene={scene} id={ids[0]} p={p} />}
                            />
                        );
                    }
                    return (
                        <Group key={p} data-row={p} gap={6} wrap="nowrap" style={{ padding: "3px 0" }}>
                            <Text size="xs" style={{ width: 64, flex: "0 0 64px" }}>
                                {def.label}
                            </Text>
                            <StackStrip
                                scene={scene}
                                ids={ids}
                                p={p}
                                onSet={() => {
                                    addProp(scene, ids, p, setPending);
                                    focus(FOCUS_ROW(p));
                                }}
                            />
                        </Group>
                    );
                })}
            </Box>
            <Box style={{ paddingTop: 4 }}>
                <AddMenu
                    scene={scene}
                    ids={ids}
                    props={PROP_LIST.map((d) => d.id).filter((p) => !rows.includes(p))}
                    onAdd={(p) => {
                        addProp(scene, ids, p, setPending);
                    }}
                    label="More styles"
                />
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Option 6: Full look, Why this look, Show only this layer                                    */
/* ------------------------------------------------------------------------------------------ */

/** The value and source words of one Full look row. */
function fullLookCell(groups: readonly Group[], id: string, p: PropId): { value: string; from: string } {
    const g = groups[0];
    if (groups.length > 1) {
        return {
            value: "Mixed",
            from: groups.map((x) => `${x.layer?.name ?? "built-in"} on ${String(x.count)}`).join(", "),
        };
    }
    const value = g.value?.kind === "byData" ? "varies" : words(g.value, p);
    if (g.layer === null) {
        return { value, from: "built-in" };
    }
    return { value, from: g.layer.id === id ? "this layer" : `from ${g.layer.name}` };
}

function labelText(label: string | number | null, el: El): string {
    if (label === "Name") {
        return el.name;
    }
    return label === "Degree" ? String(el.degree) : "\u00a0";
}

function FullLook({ scene, id }: { readonly scene: Scene; readonly id: string }): React.JSX.Element {
    const l = scene.layer(id);
    const rows = [
        ...CORE,
        ...PROP_LIST.map((d) => d.id).filter(
            (p) => !CORE.includes(p) && result(scene.layers, id, p, scene.solo).some((g) => g.layer !== null),
        ),
    ];
    return (
        <Box style={{ paddingTop: 4 }}>
            <Text size="xs" fw={600} style={{ paddingBottom: 4 }}>
                Full look of {l.scopeNoun === "elements" ? "every element" : l.scopeNoun}
                {elementsOf(l, "color").empty ? " (none now: as every element)" : ""}
            </Text>
            {rows.map((p) => {
                const groups = result(scene.layers, id, p, scene.solo);
                const { value, from } = fullLookCell(groups, id, p);
                return (
                    <Group key={p} gap={6} wrap="nowrap" style={{ padding: "2px 0" }}>
                        <Text size="xs" style={{ width: 64, flex: "0 0 64px" }}>
                            {PROPS[p].label}
                        </Text>
                        <Text size="xs" style={{ width: 92, flex: "0 0 92px" }} truncate>
                            {value}
                        </Text>
                        <Text size="xs" c={PANEL_INK.CHROME} truncate>
                            {from}
                        </Text>
                    </Group>
                );
            })}
        </Box>
    );
}

const INSPECTABLE = ["Valjean", "Javert", "Cosette", "Marius", "Gavroche", "Myriel"];

function WhyThisLook({ scene }: { readonly scene: Scene }): React.JSX.Element {
    const [who, setWho] = useState("Valjean");
    const el = NODES.find((n) => n.name === who) ?? NODES[0];
    const props = PROP_LIST.filter((d) => d.target === "node").map((d) => d.id);
    return (
        <Box style={{ borderTop: `1px solid ${PANEL_INK.DIVIDER}`, marginTop: 12, paddingTop: 8 }}>
            <Group gap={6} wrap="nowrap">
                <Text size="xs" fw={600}>
                    Why this look:
                </Text>
                <Box style={{ width: 130 }}>
                    <PanelField
                        label="Node to explain"
                        kind="select"
                        width="fill"
                        data={[...INSPECTABLE]}
                        value={who}
                        onChange={(v) => {
                            setWho(String(v));
                        }}
                    />
                </Box>
            </Group>
            <Text size="xs" c={PANEL_INK.CHROME} style={{ padding: "2px 0 4px" }}>
                Why node "{who}" looks like this
            </Text>
            {props.map((p) => {
                const ws = [...scene.layers]
                    .reverse()
                    .filter((l) => isVisible(l, scene.solo) && l.writes[p] !== undefined && l.scope(el));
                if (ws.length === 0) {
                    return null;
                }
                return (
                    <Box
                        key={p}
                        style={{ padding: "2px 0" }}
                        aria-label={`${PROPS[p].label}, ${String(concrete(ws[0].writes[p] ?? null, el))}, from ${ws[0].name}${
                            ws.length > 1
                                ? `; covers ${ws
                                      .slice(1)
                                      .map((w) => w.name)
                                      .join(", ")}`
                                : ""
                        }`}
                        role="group"
                    >
                        {ws.map((w, i) => {
                            const v = w.writes[p] ?? null;
                            const c = concrete(v, el);
                            const text =
                                v?.kind === "byData"
                                    ? `${String(c)} (${v.source === "Degree" ? `degree ${String(el.degree)}` : `community ${String(el.community + 1)}`})`
                                    : words(v, p);
                            return (
                                <Group key={w.id} gap={6} wrap="nowrap" aria-hidden="true">
                                    <Text size="xs" style={{ width: 64, flex: "0 0 64px" }}>
                                        {i === 0 ? PROPS[p].label : ""}
                                    </Text>
                                    <Text
                                        size="xs"
                                        td={i > 0 ? "line-through" : undefined}
                                        c={i > 0 ? PANEL_INK.CHROME : undefined}
                                        style={{ flex: 1 }}
                                        truncate
                                    >
                                        {text}
                                    </Text>
                                    <Text size="xs" c={PANEL_INK.CHROME}>
                                        {w.name}
                                        {i > 0 ? " (covered)" : ""}
                                    </Text>
                                </Group>
                            );
                        })}
                    </Box>
                );
            })}
        </Box>
    );
}

function FullLookPanel({ scene, ids }: PanelProps): React.JSX.Element {
    const [mode, setMode] = useState<"This layer" | "Full look">("This layer");
    const switcher =
        ids.length === 1 ? (
            <Box style={{ paddingTop: 6 }}>
                <SegmentedControl
                    size="xs"
                    fullWidth
                    aria-label="What the panel shows"
                    data={["This layer", "Full look"]}
                    value={mode}
                    onChange={(v) => {
                        setMode(v === "Full look" ? "Full look" : "This layer");
                    }}
                />
            </Box>
        ) : null;
    if (mode === "Full look" && ids.length === 1) {
        return (
            <Box>
                <Header scene={scene} ids={ids} extra={switcher} />
                <FullLook scene={scene} id={ids[0]} />
            </Box>
        );
    }
    return <SetOnlyPanel scene={scene} ids={ids} headerExtra={switcher} />;
}

/* ------------------------------------------------------------------------------------------ */
/* The frame: tree, panel and preview                                                          */
/* ------------------------------------------------------------------------------------------ */

const PANELS: Record<OptionId, (props: PanelProps) => React.JSX.Element> = {
    o1: (props) => <SetOnlyPanel {...props} />,
    o2: (props) => <SetOnlyPanel {...props} menuOnly />,
    o3: (props) => <CheckboxPanel {...props} />,
    o4: (props) => <TwoColumnPanel {...props} />,
    o5: (props) => <StripPanel {...props} />,
    o6: (props) => <FullLookPanel {...props} />,
    o7: (props) => <SetOnlyPanel {...props} />,
};

const PANEL_WIDTH: Record<OptionId, number> = { o1: 300, o2: 300, o3: 300, o4: 440, o5: 320, o6: 300, o7: 300 };

const SHAPE_RADIUS: Record<string, string> = { Box: "2px", Cylinder: "4px", Cone: "2px 2px 50% 50%", Torus: "50%" };

/**
 * What a few of the layer's nodes, and one edge, would look like on the canvas.
 * @param props - Props.
 * @param props.scene - The scene.
 * @param props.id - The layer.
 * @returns The strip.
 */
function Preview({ scene, id }: { readonly scene: Scene; readonly id: string }): React.JSX.Element {
    const layer = scene.layer(id);
    const own = NODES.filter((n) => layer.scope(n));
    const shown = (own.length > 0 ? own : NODES.filter((n) => KEY_PEOPLE.has(n.name) || n.name === "Gavroche")).slice(
        0,
        6,
    );
    const look = (el: El, p: PropId): Value | null => {
        const w = winnerAt(scene.layers, el, p, scene.layers.length - 1, scene.solo);
        return w === null ? PROPS[p].neutral : (w.writes[p] ?? null);
    };
    const drawn = (el: El): boolean =>
        scene.layers.some(
            (l) =>
                isVisible(l, scene.solo) &&
                l.scope(el) &&
                PROP_LIST.some((d) => d.target === el.kind && l.writes[d.id] !== undefined),
        );
    const edge = EDGES[0];
    return (
        <Box style={{ borderTop: `1px solid ${PANEL_INK.DIVIDER}`, marginTop: 12, paddingTop: 8 }}>
            <Text size="xs" c={PANEL_INK.CHROME}>
                Preview:{" "}
                {own.length > 0
                    ? `${layer.scopeNoun === "elements" ? "some nodes" : layer.scopeNoun}`
                    : `no ${layer.scopeNoun} now, so other nodes`}
                {scene.solo !== null ? ` (showing only ${scene.layer(scene.solo).name})` : ""}
            </Text>
            <Group gap={12} style={{ paddingTop: 10 }} align="flex-end">
                {shown.map((el) => {
                    if (!drawn(el)) {
                        return (
                            <Stack key={el.id} gap={2} align="center" style={{ width: 44 }}>
                                <Box
                                    style={{
                                        width: 20,
                                        height: 20,
                                        border: `1px dashed ${PANEL_INK.PLACEHOLDER}`,
                                        borderRadius: 10,
                                    }}
                                />
                                <Text size="9px" c={PANEL_INK.PLACEHOLDER}>
                                    not drawn
                                </Text>
                            </Stack>
                        );
                    }
                    const color = String(concrete(look(el, "color"), el) ?? NEUTRAL_GRAY);
                    const size = Number(concrete(look(el, "size"), el) ?? 1);
                    const shape = String(concrete(look(el, "shape"), el) ?? "Sphere");
                    const halo = look(el, "halo");
                    const glow = look(el, "glow");
                    const label = concrete(look(el, "label"), el);
                    const px = Math.max(8, Math.min(30, 12 * size));
                    const shadows = [
                        halo?.kind === "effect" ? `0 0 0 ${String(halo.amount)}px ${halo.hex}` : "",
                        glow?.kind === "effect" ? `0 0 ${String(16 * glow.amount)}px ${glow.hex}` : "",
                    ].filter((s) => s !== "");
                    return (
                        <Tooltip
                            key={el.id}
                            label={`${el.name}: ${color}, ${shape}, size ${String(size)}`}
                            withinPortal
                        >
                            <Stack gap={2} align="center" style={{ width: 44 }}>
                                <Box
                                    style={{
                                        width: px,
                                        height: px,
                                        background: color,
                                        borderRadius: SHAPE_RADIUS[shape] ?? "50%",
                                        boxShadow: shadows.join(", ") || undefined,
                                    }}
                                />
                                <Text size="9px" c={PANEL_INK.CHROME} truncate style={{ maxWidth: 44 }}>
                                    {labelText(label, el)}
                                </Text>
                            </Stack>
                        </Tooltip>
                    );
                })}
                {drawn(edge) ? (
                    <Stack gap={2} align="center">
                        <Box
                            style={{
                                width: 40,
                                height: Number(concrete(look(edge, "edgeWidth"), edge) ?? 1) * 2,
                                background: String(concrete(look(edge, "edgeColor"), edge) ?? NEUTRAL_GRAY),
                                margin: "9px 0",
                            }}
                        />
                        <Text size="9px" c={PANEL_INK.CHROME}>
                            an edge
                        </Text>
                    </Stack>
                ) : (
                    <Text size="9px" c={PANEL_INK.PLACEHOLDER}>
                        edges not drawn
                    </Text>
                )}
            </Group>
        </Box>
    );
}

function LayerTree({ scene, option }: { readonly scene: Scene; readonly option: OptionId }): React.JSX.Element {
    const items: TreeNodeData[] = [...scene.layers].reverse().map((l) => {
        const props = Object.keys(l.writes) as PropId[];
        const list = props.map((p) =>
            l.writes[p]?.kind === "byData" ? `${PROPS[p].long} ${words(l.writes[p] ?? null, p)}` : PROPS[p].long,
        );
        const countText =
            props.length === 0
                ? "sets nothing"
                : `sets ${String(props.length)} ${props.length === 1 ? "style" : "styles"}: ${list.join(", ")}`;
        return {
            id: l.id,
            name: l.name,
            dimmed: !isVisible(l, scene.solo),
            description: `${l.hidden ? "Hidden. " : ""}${option === "o7" ? countText : ""}`,
            count:
                option === "o7" ? (
                    <Tooltip label={props.length === 0 ? "Sets nothing" : list.join(", ")} withinPortal>
                        <span>{props.length === 0 ? "--" : props.length}</span>
                    </Tooltip>
                ) : undefined,
            actions: (
                <Group gap={0} wrap="nowrap">
                    {option === "o6" && <SoloToggle scene={scene} id={l.id} />}
                    <EyeToggle scene={scene} id={l.id} />
                </Group>
            ),
        };
    });
    return (
        <Box style={{ width: 240, flex: "0 0 240px", borderRight: `1px solid ${PANEL_INK.DIVIDER}` }}>
            <Text size="xs" fw={600} style={{ padding: "6px 8px" }}>
                Layers
            </Text>
            <Tree
                items={items}
                label="Style layers"
                height={6 * 32 + 8}
                selected={scene.selected}
                onSelect={(ids) => {
                    if (ids.length > 0) {
                        scene.select(ids);
                    }
                }}
                onRowKeyDown={(id, event) => {
                    if (event.key === " " && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
                        event.preventDefault();
                        scene.toggleHidden(id);
                    }
                }}
            />
            <Text size="xs" c={PANEL_INK.CHROME} style={{ padding: "6px 8px" }}>
                Ctrl- or Shift-click a second row to select two layers. Space toggles a row's eye.
            </Text>
        </Box>
    );
}

/**
 * One option's whole mock: the layer tree, the style panel for the tree's selection, a preview.
 * @param props - Props.
 * @param props.option - Which option.
 * @param props.title - The option's name.
 * @param props.summary - One sentence on what it does.
 * @returns The mock.
 */
function OptionMock({
    option,
    title,
    summary,
}: {
    readonly option: OptionId;
    readonly title: string;
    readonly summary: string;
}): React.JSX.Element {
    const scene = useScene(["selected"]);
    const Panel = PANELS[option];
    const ids = scene.selected.filter((id) => scene.layers.some((l) => l.id === id));
    return (
        <Box
            onKeyDown={(e) => {
                if (
                    (e.ctrlKey || e.metaKey) &&
                    e.key.toLowerCase() === "z" &&
                    !(e.target instanceof HTMLInputElement)
                ) {
                    e.preventDefault();
                    scene.undo();
                }
            }}
            style={{
                border: `1px solid ${PANEL_INK.DIVIDER}`,
                borderRadius: 6,
                background: PANEL_INK.PANEL,
                width: "fit-content",
                maxWidth: "100%",
            }}
        >
            <Group
                justify="space-between"
                wrap="nowrap"
                style={{ padding: "8px 12px", borderBottom: `1px solid ${PANEL_INK.DIVIDER}` }}
                gap={16}
            >
                <Box style={{ minWidth: 0 }}>
                    <Text size="sm" fw={700}>
                        {title}
                    </Text>
                    <Text size="xs" c={PANEL_INK.CHROME} style={{ maxWidth: 520 }}>
                        {summary}
                    </Text>
                </Box>
                <Button size="compact-xs" variant="default" disabled={scene.undoLabel === null} onClick={scene.undo}>
                    {scene.undoLabel === null ? "Undo" : `Undo: ${scene.undoLabel}`}
                </Button>
            </Group>
            <Group align="flex-start" gap={0} wrap="nowrap">
                <LayerTree scene={scene} option={option} />
                <Box style={{ width: PANEL_WIDTH[option], padding: "8px 12px" }}>
                    {ids.length === 0 ? <Text size="xs">Select a layer.</Text> : <Panel scene={scene} ids={ids} />}
                    {ids.length === 1 && <Preview scene={scene} id={ids[0]} />}
                    {option === "o6" && <WhyThisLook scene={scene} />}
                </Box>
            </Group>
        </Box>
    );
}

const OPTIONS: readonly { id: OptionId; title: string; summary: string }[] = [
    {
        id: "o1",
        title: "Option 1: Show only what the layer sets, plus named add buttons",
        summary:
            'Rows only for what the layer writes. "Not set here:" names every other core property as a button; click one to add it, prefilled. Hover a name for the value now in effect.',
    },
    {
        id: "o2",
        title: 'Option 2: Show only what the layer sets, plus one "Add style" menu',
        summary:
            'Rows only for what the layer writes, then one "Add style" menu listing every other property with the value now in effect.',
    },
    {
        id: "o3",
        title: 'Option 3: Every core row, with an "Includes" checkbox',
        summary:
            'All seven core rows stay. A checked row shows its control; an unchecked one says "Not set". Hover an unchecked row for the value now in effect.',
    },
    {
        id: "o4",
        title: 'Option 4: Two columns, "This layer" and "Result"',
        summary:
            "Left: the editor, or a Set button. Right: a read-only caption of what the canvas draws and which layer decides it. Click a layer name to select it.",
    },
    {
        id: "o5",
        title: "Option 5: A stack strip on unset rows",
        summary:
            "An unset row shows one mark per layer that writes it, topmost first: filled wins, hollow is covered, the dashed ring is this layer (click it to set here). Click a mark to select that layer.",
    },
    {
        id: "o6",
        title: 'Option 6: "Full look", "Why this look" and "Show only this layer"',
        summary:
            'Option 1\'s panel plus a "This layer / Full look" switch, an S (solo) button on each tree row, and an inspector for one node.',
    },
    {
        id: "o7",
        title: 'Option 7: A "sets N" count in the layer tree',
        summary:
            'Option 1\'s panel with a count of set properties on every tree row ("--" for none); hover the count for the list.',
    },
];

function OverviewCard({ option, title }: { readonly option: OptionId; readonly title: string }): React.JSX.Element {
    const scene = useScene(["selected"]);
    const Panel = PANELS[option];
    return (
        <Box
            style={{
                width: PANEL_WIDTH[option],
                padding: "8px 12px",
                border: `1px solid ${PANEL_INK.DIVIDER}`,
                borderRadius: 6,
                background: PANEL_INK.PANEL,
            }}
        >
            <Text size="xs" fw={700} style={{ paddingBottom: 6 }}>
                {title}
            </Text>
            {option === "o7" && (
                <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingBottom: 6 }}>
                    Tree row: Selected {Object.keys(scene.layer("selected").writes).length || "--"} (hover:{" "}
                    {(Object.keys(scene.layer("selected").writes) as PropId[]).map((p) => PROPS[p].label).join(", ") ||
                        "sets nothing"}
                    )
                </Text>
            )}
            <Panel scene={scene} ids={["selected"]} />
        </Box>
    );
}

function OverviewGrid(): React.JSX.Element {
    return (
        <Box>
            <Text size="sm" fw={700}>
                The Selected layer under every option
            </Text>
            <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingBottom: 12 }}>
                Selected sets only a halo and a glow. Each card is live and separate: add, clear and hover here too.
            </Text>
            <Group align="flex-start" gap={12}>
                {OPTIONS.map((o) => (
                    <OverviewCard
                        key={o.id}
                        option={o.id}
                        title={`${o.title.replace(/:.*/, "")}: ${o.title.replace(/^[^:]*: /, "")}`}
                    />
                ))}
            </Group>
        </Box>
    );
}

const meta: Meta = {
    title: "Mocks/Set vs inherited",
    parameters: { layout: "padded" },
    decorators: [
        (Story): React.JSX.Element => (
            <PopoutManager>
                {/* The app's stylesheet stops the page scrolling, so the story scrolls itself. */}
                <Box style={{ height: "calc(100vh - 2rem)", overflow: "auto" }}>
                    <Story />
                </Box>
            </PopoutManager>
        ),
    ],
};

export default meta;

type Story = StoryObj;

const story = (i: number, name: string): Story => ({
    name,
    render: () => <OptionMock option={OPTIONS[i].id} title={OPTIONS[i].title} summary={OPTIONS[i].summary} />,
});

/** The Selected layer under every option, side by side. */
export const Overview: Story = { render: () => <OverviewGrid /> };
/** Option 1 (recommended): only what the layer sets, plus a line of named add buttons. */
export const Option1: Story = story(0, "Option 1: Named add buttons");
/** Option 2: only what the layer sets, plus one Add style menu. */
export const Option2: Story = story(1, "Option 2: Add style menu");
/** Option 3: every core row, with an Includes checkbox. */
export const Option3: Story = story(2, "Option 3: Includes checkbox");
/** Option 4: two columns, This layer and Result. */
export const Option4: Story = story(3, "Option 4: This layer and Result");
/** Option 5: a stack strip on unset rows. */
export const Option5: Story = story(4, "Option 5: Stack strip");
/** Option 6: Full look, Why this look and Show only this layer. */
export const Option6: Story = story(5, "Option 6: Full look, Why, Solo");
/** Option 7: a sets-N count in the layer tree. */
export const Option7: Story = story(6, "Option 7: Sets N count");
