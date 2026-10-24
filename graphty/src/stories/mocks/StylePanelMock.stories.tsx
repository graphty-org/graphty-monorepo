/**
 * A live mock of the style panel: the layer tree on the left and the style panel on the right,
 * as specified by design/ui/style-panel-organization.md. There is no graph and nothing is
 * painted: every row, control and number is mock data, and graphty-element is never loaded.
 *
 * Controls that graphty-element cannot draw today carry an "i" that says what it would need;
 * the switch above the panels shows those marks.
 */

import {
    AdvancedButton,
    AlignmentMatrix,
    type AlignmentMatrixValue,
    ComboInput,
    CompactColorInput,
    ContextMenu,
    ControlGroup,
    ControlSection,
    ControlSubGroup,
    DataRow,
    FieldRow,
    HistogramRow,
    InfoCircle,
    InlineRename,
    MenuCheckItem,
    MetricRow,
    moveTreeItem,
    PANEL_GRID,
    PANEL_INK,
    PanelField,
    PanelLabelsProvider,
    Popout,
    PopoutManager,
    ProseBlock,
    RampRow,
    RankChip,
    SearchInput,
    SegmentedControl,
    StyleNumberInput,
    StyleSelect,
    ToggleIconButton,
    ToggleRow,
    Tree,
    type TreeMove,
    type TreeNodeData,
    UiGlyph,
    VariablePill,
} from "@graphty/compact-mantine";
import {
    ActionIcon,
    Anchor,
    Box,
    Button,
    Checkbox,
    ColorSwatch,
    Group,
    Menu,
    Switch,
    Tabs,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
} from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import {
    Circle,
    Folder,
    GitCommitHorizontal,
    Hash,
    Hexagon,
    Layers,
    Layers2,
    Minus as LineGlyph,
    Split,
    Tags,
    ToggleLeft,
    Type,
} from "lucide-react";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
    ARROW_KINDS,
    CATEGORY_PALETTES,
    COLOR_COMBINES,
    type Combine,
    COMMUNITIES,
    COUNTED_PATTERNS,
    DEFAULT_CATEGORICAL,
    DEFAULT_RAMP,
    derived,
    type DerivedWrite,
    type EffectEntry,
    type EffectField,
    type EffectType,
    type EndEntry,
    type EndField,
    fixed,
    type GapId,
    GAPS,
    INITIAL_LAYERS,
    INITIAL_TREE,
    LABEL_COUNTS,
    type LabelEntry,
    labelEntry,
    type LookValue,
    type MockLayer,
    newId,
    NUMBER_COMBINES,
    NUMBER_FACTS,
    OTHER_COLOR,
    PAINTED,
    paletteOf,
    type PropDef,
    type PropId,
    PROPS,
    RAMP_PALETTES,
    rampGradient,
    reaches,
    ROUTE,
    type Rule,
    RULE_KINDS,
    type RuleKind,
    type Scale,
    SCALES,
    type SectionDef,
    SECTIONS,
    SHAPE_SCHEMES,
    type Target,
    TOP_TEN,
    type TreeShape,
    valueLabel,
    type ValueRef,
    VALUES,
    type Write,
} from "./stylePanelMockData";

/* ------------------------------------------------------------------------------------------ */
/* Words and small helpers                                                                     */
/* ------------------------------------------------------------------------------------------ */

const ONE_LABEL_REASON = "One label per element until graphty-element has label slots";
const LOCKED_REASON = "This layer is locked";
const LOOK_VARY_REASON = "Label looks take one value until graphty-element lets them vary";
const MOTION_NOTE = "Not shown on curved or patterned edges, in 2D, in still exports or with reduced motion";
const GRADIENT_REASON = "graphty-element draws gradient fills, but no style channel reaches them yet";
const ROW_GAP = 4;
const CHIP_LIMIT = 8;
const MEMBER_LIMIT = 8;
/** Section titles and the panel's layer name: 11 px, the size Figma gives a section title. */
const TITLE_SIZE = 11;

const HEX = (color: string): string => `#${color.replace(/^#/, "")}`;
const strip = (color: string | undefined): string | undefined => color?.replace(/^#/, "").toUpperCase();

/** The words for a combine mode, as a prefix ("x") or a word ("Mix"); none for Replace. */
const COMBINE_WORDS: Record<Combine, string | undefined> = {
    Replace: undefined,
    Multiply: "x",
    Add: "+",
    Mix: "Mix",
    "Set hue": "Hue",
    "Set lightness": "Light",
    "Set transparency": "Alpha",
};

/** The same, read aloud: "Size, multiplied by". */
const COMBINE_NAMES: Record<Combine, string | undefined> = {
    Replace: undefined,
    Multiply: "multiplied by",
    Add: "plus",
    Mix: "mixed with",
    "Set hue": "hue set from",
    "Set lightness": "lightness set from",
    "Set transparency": "transparency set from",
};

/**
 * A select's value, or undefined when it holds the neutral default, so the field offers no reset
 * that would only write the default again.
 * @param value - The stored value.
 * @param neutral - The default.
 * @returns What the select shows as set.
 */
function unlessDefault<T extends string>(value: T | undefined, neutral: T): T | undefined {
    return value === neutral ? undefined : value;
}

/** Where a label sits on a node, by graphty-element's `location`, in the panel's words. */
const NODE_POSITIONS: readonly (readonly [string, string])[] = [
    ["top", "Above"],
    ["top-left", "Above left"],
    ["top-right", "Above right"],
    ["left", "Left"],
    ["center", "Center"],
    ["right", "Right"],
    ["bottom", "Below"],
    ["bottom-left", "Below left"],
    ["bottom-right", "Below right"],
    ["automatic", "Automatic"],
];

/** The alignment grid's cell for a node `location`, and back. */
const LOCATION_CELL: Record<string, AlignmentMatrixValue> = {
    top: "top-center",
    "top-left": "top-left",
    "top-right": "top-right",
    left: "middle-left",
    center: "middle-center",
    right: "middle-right",
    bottom: "bottom-center",
    "bottom-left": "bottom-left",
    "bottom-right": "bottom-right",
};

const EDGE_POSITIONS = ["On the line", "Above", "Below", "At source end", "At target end"];
const END_POSITIONS = ["At source end", "At target end"];

/**
 * Whether a label entry sits on an edge: edge positions are words, node positions are
 * graphty-element's `location` keys.
 * @param entry - The entry.
 * @returns True for an edge label or caption.
 */
function isEdgeText(entry: LabelEntry): boolean {
    return EDGE_POSITIONS.includes(entry.position);
}

/* ------------------------------------------------------------------------------------------ */
/* The mock's state, shared through context                                                    */
/* ------------------------------------------------------------------------------------------ */

interface MockApi {
    readonly layers: Readonly<Record<string, MockLayer>>;
    readonly tree: readonly TreeShape[];
    readonly selectedId: string | null;
    readonly showGaps: boolean;
    readonly renamingId: string | null;
    readonly select: (id: string | null) => void;
    readonly update: (id: string, fn: (layer: MockLayer) => MockLayer) => void;
    readonly setRenamingId: (id: string | null) => void;
    readonly actions: RowActions;
}

interface RowActions {
    readonly duplicate: (id: string) => void;
    readonly remove: (id: string) => void;
    readonly moveToFolder: (id: string, folderId: string | null) => void;
    readonly pin: (id: string, pin: "top" | "bottom" | undefined) => void;
    readonly unsplit: (id: string) => void;
    readonly split: (id: string, source: string) => void;
    readonly ungroup: (id: string) => void;
    readonly followParentAll: (id: string) => void;
    readonly addAbove: (id: string, rule: Rule) => void;
}

const MockContext = createContext<MockApi | null>(null);

/**
 * The mock's shared state.
 * @returns The api.
 */
function useMock(): MockApi {
    const api = useContext(MockContext);
    if (api === null) {
        throw new Error("useMock outside the mock");
    }
    return api;
}

/** Tree shape helpers: the tree holds ids only, top of the paint order first. */
function findPlace(
    tree: readonly TreeShape[],
    id: string,
    parentId: string | null = null,
): { parentId: string | null; index: number; node: TreeShape } | null {
    for (let i = 0; i < tree.length; i++) {
        const node = tree[i];
        if (node.id === id) {
            return { parentId, index: i, node };
        }
        if (node.children !== undefined) {
            const found = findPlace(node.children, id, node.id);
            if (found !== null) {
                return found;
            }
        }
    }
    return null;
}

function removeNode(tree: readonly TreeShape[], id: string): TreeShape[] {
    return tree.flatMap((node) => {
        if (node.id === id) {
            return [];
        }
        return [node.children === undefined ? node : { ...node, children: removeNode(node.children, id) }];
    });
}

function insertNode(tree: readonly TreeShape[], parentId: string | null, index: number, node: TreeShape): TreeShape[] {
    if (parentId === null) {
        const out = [...tree];
        out.splice(Math.max(0, Math.min(index, out.length)), 0, node);
        return out;
    }
    return tree.map((n) => {
        if (n.id === parentId) {
            const kids = [...(n.children ?? [])];
            kids.splice(Math.max(0, Math.min(index, kids.length)), 0, node);
            return { ...n, children: kids };
        }
        return n.children === undefined ? n : { ...n, children: insertNode(n.children, parentId, index, node) };
    });
}

function idsOf(node: TreeShape): string[] {
    return [node.id, ...(node.children ?? []).flatMap(idsOf)];
}

/**
 * Where a new top-level row may go: after the rows pinned to the top, before those pinned to
 * the bottom.
 */
function unpinnedRange(tree: readonly TreeShape[], layers: Readonly<Record<string, MockLayer>>): [number, number] {
    let first = 0;
    while (first < tree.length && layers[tree[first].id]?.pin === "top") {
        first++;
    }
    let last = tree.length;
    while (last > first && layers[tree[last - 1].id]?.pin === "bottom") {
        last--;
    }
    return [first, last];
}

/**
 * A name no other row has.
 * @param layers - Every layer.
 * @param base - The wanted name.
 * @returns The name, numbered when taken.
 */
function uniqueName(layers: Readonly<Record<string, MockLayer>>, base: string): string {
    const taken = new Set(Object.values(layers).map((l) => l.name));
    if (!taken.has(base)) {
        return base;
    }
    let n = 2;
    while (taken.has(`${base} ${String(n)}`)) {
        n++;
    }
    return `${base} ${String(n)}`;
}

/* ------------------------------------------------------------------------------------------ */
/* Marks for what graphty-element cannot draw today                                            */
/* ------------------------------------------------------------------------------------------ */

/**
 * An "i" saying what graphty-element would need to draw the control beside it.
 * @param props - The gap.
 * @param props.gap - Which capability is missing.
 * @param props.label - What it explains.
 * @returns The mark, or nothing while the marks are switched off.
 */
function Gap({ gap, label }: { readonly gap: GapId; readonly label: string }): React.JSX.Element | null {
    const { showGaps } = useMock();
    if (!showGaps) {
        return null;
    }
    return (
        <InfoCircle label={label}>
            <Text size="xs">Not drawable today. {GAPS[gap]}</Text>
        </InfoCircle>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Row toggles that fire on pointer down                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * A lock or eye toggle that fires on pointer down, so a drag down the column toggles many rows,
 * and still answers Enter and Space.
 */
function PressToggle({
    label,
    checked,
    icon,
    checkedIcon,
    onToggle,
    disabled,
}: {
    readonly label: string;
    readonly checked: boolean;
    readonly icon: React.ReactNode;
    readonly checkedIcon: React.ReactNode;
    readonly onToggle: (next: boolean) => void;
    readonly disabled?: boolean;
}): React.JSX.Element {
    const fromPointer = useRef(false);
    return (
        <ToggleIconButton
            variant="swap"
            label={label}
            checked={checked}
            disabled={disabled}
            icon={icon}
            checkedIcon={checkedIcon}
            onPointerDown={(event: React.PointerEvent<HTMLButtonElement>) => {
                if (event.button !== 0 || disabled === true) {
                    return;
                }
                fromPointer.current = true;
                onToggle(!checked);
            }}
            onPointerEnter={(event: React.PointerEvent<HTMLButtonElement>) => {
                // A drag that started on another toggle in the column carries on through this one.
                if (event.buttons === 1 && disabled !== true) {
                    fromPointer.current = true;
                    onToggle(!checked);
                }
            }}
            onChange={(next) => {
                if (fromPointer.current) {
                    fromPointer.current = false;
                    return;
                }
                onToggle(next);
            }}
        />
    );
}

/**
 * An eye: shows or pauses the thing on its row.
 * @param props - Props.
 * @param props.hidden - Whether it is paused.
 * @param props.target - What it hides, for its accessible name.
 * @param props.onToggle - Called with the new hidden state.
 * @returns The toggle.
 */
function Eye({
    hidden,
    target,
    onToggle,
}: {
    readonly hidden: boolean;
    readonly target: string;
    readonly onToggle: (hidden: boolean) => void;
}): React.JSX.Element {
    return (
        <PressToggle
            label={`Hide ${target}`}
            checked={hidden}
            icon={<UiGlyph name="eye" size={PANEL_GRID.GLYPH} />}
            checkedIcon={<UiGlyph name="eyeClosed" size={PANEL_GRID.GLYPH} />}
            onToggle={onToggle}
        />
    );
}

/**
 * A minus: turns the thing on its row off.
 * @param props - Props.
 * @param props.target - What it removes.
 * @param props.onRemove - Called on press.
 * @returns The button.
 */
function Minus({ target, onRemove }: { readonly target: string; readonly onRemove: () => void }): React.JSX.Element {
    return (
        <ActionIcon
            type="button"
            variant="subtle"
            size={PANEL_GRID.TRAIL}
            c={PANEL_INK.CHROME}
            aria-label={`Remove ${target}`}
            title={`Remove ${target}`}
            onClick={onRemove}
        >
            <UiGlyph name="minus" size={PANEL_GRID.GLYPH} />
        </ActionIcon>
    );
}

/** The 24 px box a row keeps where it has no settings button, so every column lines up. */
function SlotSpacer(): React.JSX.Element {
    return <Box style={{ flex: `0 0 ${String(PANEL_GRID.TRAIL)}px` }} />;
}

/* ------------------------------------------------------------------------------------------ */
/* The layer tree                                                                              */
/* ------------------------------------------------------------------------------------------ */

const TYPE_GLYPH_SIZE = 12;

/**
 * The row's type glyph, carrying the row id so a right-click can find its row.
 * @param props - Props.
 * @param props.layer - The row.
 * @returns The glyph.
 */
function TypeGlyph({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    let glyph: React.ReactNode = <Layers size={TYPE_GLYPH_SIZE} />;
    if (layer.kind === "folder") {
        glyph = <Folder size={TYPE_GLYPH_SIZE} />;
    } else if (layer.kind === "split") {
        glyph = <Split size={TYPE_GLYPH_SIZE} />;
    } else if (layer.kind === "child") {
        glyph = null;
    }
    return (
        <span data-row-id={layer.id} style={{ display: "inline-flex" }}>
            {glyph}
        </span>
    );
}

/**
 * The color a split child shows on its chit: its override, else its parent's.
 * @param layer - The child.
 * @returns The hex color.
 */
function childColor(layer: MockLayer): string {
    const own = layer.props.nodeColor;
    if (own?.mode === "fixed" && typeof own.value === "string") {
        return own.value;
    }
    return layer.child?.chit ?? "999999";
}

/**
 * Whether the layers above cover everything this layer writes, so the tree marks it.
 * @param layer - The layer.
 * @returns True when every property it writes is painted over and it writes nothing else.
 */
function fullyPaintedOver(layer: MockLayer): boolean {
    const written = Object.keys(layer.props);
    return (
        written.length > 0 &&
        written.every((p) => layer.paintedOver?.[p as PropId] !== undefined) &&
        layer.labels.length === 0 &&
        layer.effects.length === 0 &&
        layer.ends.length === 0 &&
        layer.tooltip === undefined
    );
}

/**
 * Whether a split child changes anything its parent writes.
 * @param layer - The row.
 * @returns True for a child with its own writes.
 */
function overridesParent(layer: MockLayer): boolean {
    return layer.kind === "child" && (Object.keys(layer.props).length > 0 || layer.effects.length > 0);
}

/**
 * The marks after a row's name, as words: what a screen reader hears after the name.
 * @param layer - The row.
 * @returns The words, empty when the row has no marks.
 */
function markWords(layer: MockLayer, layers: Readonly<Record<string, MockLayer>>): string[] {
    const firstOver = Object.values(layer.paintedOver ?? {})[0];
    const target = targetOf(layer);
    return [
        target === undefined ? undefined : TARGET_WORDS[target].toLowerCase(),
        layer.pin === undefined ? undefined : `pinned to the ${layer.pin}`,
        overridesParent(layer) ? "overrides its parent" : undefined,
        fullyPaintedOver(layer) && firstOver !== undefined
            ? `painted over by ${layers[firstOver.by]?.name ?? firstOver.by}`
            : undefined,
    ].filter((w): w is string => w !== undefined);
}

/** What a layer's rule reaches, as the tree's tooltip and the panel's group words. */
const TARGET_WORDS: Record<Target, string> = {
    node: "Paints nodes",
    edge: "Paints edges",
    both: "Paints nodes and edges",
};

/**
 * What a row paints: nodes, edges or both. A folder and a layer still choosing its elements paint
 * nothing yet.
 * @param layer - The row.
 * @returns The target, or undefined.
 */
function targetOf(layer: MockLayer): Target | undefined {
    if (layer.kind === "folder" || layer.rule.kind === "draft") {
        return undefined;
    }
    return layer.rule.matches;
}

/**
 * The glyph for what a row paints: a dot for nodes, a line for edges, a dot on a line for both.
 */
function TargetGlyph({ target }: { readonly target: Target }): React.JSX.Element {
    if (target === "node") {
        return <Circle size={10} />;
    }
    return target === "edge" ? <LineGlyph size={12} /> : <GitCommitHorizontal size={12} />;
}

/**
 * The marks after a row's name: painted over, override dot, pin, and what it paints.
 */
function RowMarks({ layer }: { readonly layer: MockLayer }): React.JSX.Element | null {
    const { layers } = useMock();
    const overrides = overridesParent(layer);
    const firstOver = Object.values(layer.paintedOver ?? {})[0];
    const over = fullyPaintedOver(layer) && firstOver !== undefined ? layers[firstOver.by] : undefined;
    const target = targetOf(layer);
    if (layer.pin === undefined && !overrides && over === undefined && target === undefined) {
        return null;
    }
    return (
        <Group gap={4} wrap="nowrap" aria-hidden="true">
            {over !== undefined && (
                <Tooltip label={`Painted over by ${over.name}`}>
                    <Box component="span" style={{ display: "inline-flex", color: PANEL_INK.PLACEHOLDER }}>
                        <Layers2 size={12} />
                    </Box>
                </Tooltip>
            )}
            {overrides && (
                <Tooltip label="Overrides its parent">
                    <Box
                        component="span"
                        style={{ width: 6, height: 6, borderRadius: 3, background: PANEL_INK.ACCENT }}
                    />
                </Tooltip>
            )}
            {layer.pin !== undefined && (
                <Tooltip label={layer.pin === "top" ? "Pinned to the top" : "Pinned to the bottom"}>
                    <Box component="span" style={{ display: "inline-flex", color: PANEL_INK.CHROME }}>
                        <UiGlyph name="pin" size={PANEL_GRID.GLYPH} />
                    </Box>
                </Tooltip>
            )}
            {target !== undefined && (
                <Tooltip label={TARGET_WORDS[target]}>
                    <Box
                        component="span"
                        style={{ display: "inline-flex", width: 12, justifyContent: "center", color: PANEL_INK.CHROME }}
                    >
                        <TargetGlyph target={target} />
                    </Box>
                </Tooltip>
            )}
        </Group>
    );
}

/**
 * Lock and eye for one tree row.
 */
function TreeRowToggles({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const { update } = useMock();
    return (
        <>
            <PressToggle
                label={`Lock ${layer.name}`}
                checked={layer.locked}
                icon={<UiGlyph name="unlock" size={PANEL_GRID.GLYPH} />}
                checkedIcon={<UiGlyph name="lock" size={PANEL_GRID.GLYPH} />}
                onToggle={(locked) => {
                    update(layer.id, (l) => ({ ...l, locked }));
                }}
            />
            <PressToggle
                label={`Hide ${layer.name}`}
                checked={layer.hidden}
                icon={<UiGlyph name="eye" size={PANEL_GRID.GLYPH} />}
                checkedIcon={<UiGlyph name="eyeClosed" size={PANEL_GRID.GLYPH} />}
                onToggle={(hidden) => {
                    update(layer.id, (l) => ({ ...l, hidden }));
                }}
            />
        </>
    );
}

/**
 * The row menu: the same items in the tree's right-click menu and the panel header's "...".
 * @param props - Props.
 * @param props.id - The row.
 * @returns Menu items.
 */
function RowMenuItems({ id }: { readonly id: string }): React.JSX.Element {
    const { layers, tree, actions, setRenamingId, select } = useMock();
    const layer = layers[id];
    const place = findPlace(tree, id);
    const topLevel = place?.parentId === null;
    const folders = tree.filter((n) => layers[n.id]?.kind === "folder" && n.id !== id);
    const canMove = layer.kind === "layer" || layer.kind === "split";
    return (
        <>
            <Menu.Item
                onClick={() => {
                    select(id);
                    setRenamingId(id);
                }}
            >
                Rename
            </Menu.Item>
            <Menu.Item
                disabled={layer.kind === "child"}
                onClick={() => {
                    actions.duplicate(id);
                }}
            >
                Duplicate
            </Menu.Item>
            {canMove && (
                <Menu.Sub>
                    <Menu.Sub.Target>
                        <Menu.Sub.Item>Move to folder</Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                        {folders.map((f) => (
                            <Menu.Item
                                key={f.id}
                                title={
                                    layer.pin === undefined
                                        ? undefined
                                        : "A row inside a folder takes its folder's place, so this unpins it"
                                }
                                onClick={() => {
                                    actions.moveToFolder(id, f.id);
                                }}
                            >
                                {layers[f.id].name}
                            </Menu.Item>
                        ))}
                        <Menu.Item
                            disabled={topLevel}
                            onClick={() => {
                                actions.moveToFolder(id, null);
                            }}
                        >
                            Out of its folder
                        </Menu.Item>
                    </Menu.Sub.Dropdown>
                </Menu.Sub>
            )}
            <Menu.Divider />
            {layer.pin === undefined ? (
                <>
                    <Menu.Item
                        disabled={!topLevel}
                        title={topLevel ? undefined : "Only top-level rows can pin"}
                        onClick={() => {
                            actions.pin(id, "top");
                        }}
                    >
                        Pin to top
                    </Menu.Item>
                    <Menu.Item
                        disabled={!topLevel}
                        title={topLevel ? undefined : "Only top-level rows can pin"}
                        onClick={() => {
                            actions.pin(id, "bottom");
                        }}
                    >
                        Pin to bottom
                    </Menu.Item>
                </>
            ) : (
                <Menu.Item
                    onClick={() => {
                        actions.pin(id, undefined);
                    }}
                >
                    Unpin
                </Menu.Item>
            )}
            <Menu.Item disabled title="The mock has no canvas">
                Select what it paints
            </Menu.Item>
            {layer.kind === "split" && (
                <Menu.Item
                    onClick={() => {
                        actions.unsplit(id);
                    }}
                >
                    Unsplit
                </Menu.Item>
            )}
            {layer.kind === "child" && (
                <Menu.Item
                    onClick={() => {
                        actions.followParentAll(id);
                    }}
                >
                    Follow parent for everything
                </Menu.Item>
            )}
            {layer.kind === "folder" && (
                <Menu.Item
                    onClick={() => {
                        actions.ungroup(id);
                    }}
                >
                    Ungroup
                </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item
                color="red"
                disabled={layer.kind === "child" || layer.locked}
                title={layer.locked ? LOCKED_REASON : undefined}
                onClick={() => {
                    actions.remove(id);
                }}
            >
                Delete
            </Menu.Item>
        </>
    );
}

/**
 * The left panel: "Style layers", the add menu, the tree and its footer.
 */
function LayerTreePanel({
    onAddLayer,
    onAddFolder,
    onMove,
    onRestore,
    missingStarting,
}: {
    readonly onAddLayer: () => void;
    readonly onAddFolder: () => void;
    readonly onMove: (move: TreeMove) => void;
    readonly onRestore: () => void;
    readonly missingStarting: boolean;
}): React.JSX.Element {
    const { layers, tree, selectedId, select, update } = useMock();
    const [menuRow, setMenuRow] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string[]>(["annotations", "louvain"]);

    const build = (nodes: readonly TreeShape[], parentHidden: boolean): TreeNodeData[] =>
        nodes.flatMap((node) => {
            const layer = layers[node.id] as MockLayer | undefined;
            if (layer === undefined) {
                return [];
            }
            const hidden = parentHidden || layer.hidden;
            const marks = markWords(layer, layers);
            const words = [layer.hidden ? "Hidden" : undefined, layer.locked ? "Locked" : undefined].filter(
                (w) => w !== undefined,
            );
            return [
                {
                    id: layer.id,
                    name: layer.name,
                    label: marks.length === 0 ? undefined : `${layer.name}, ${marks.join(", ")}`,
                    icon: <TypeGlyph layer={layer} />,
                    dimmed: hidden,
                    strong: findPlace(tree, layer.id)?.parentId === null,
                    swatch:
                        layer.kind === "child" ? (
                            <ColorSwatch component="span" color={HEX(childColor(layer))} size={11} withShadow={false} />
                        ) : undefined,
                    count: <RowMarks layer={layer} />,
                    description: words.length > 0 ? words.join(". ") : undefined,
                    actions: <TreeRowToggles layer={layer} />,
                    children: node.children === undefined ? undefined : build(node.children, hidden),
                },
            ];
        });

    const items = build(tree, false);
    const footerPad = `8px ${String(PANEL_GRID.PAD_RIGHT)}px 8px ${String(PANEL_GRID.PAD_LEFT)}px`;

    return (
        <Box
            component="aside"
            aria-label="Style layers"
            style={{
                width: PANEL_GRID.WIDTH,
                flex: `0 0 ${String(PANEL_GRID.WIDTH)}px`,
                display: "flex",
                flexDirection: "column",
                background: PANEL_INK.PANEL,
                borderInlineEnd: `1px solid ${PANEL_INK.BORDER}`,
            }}
        >
            <Group
                justify="space-between"
                wrap="nowrap"
                style={{
                    height: PANEL_GRID.SECTION_HEADER,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                    borderBottom: `1px solid ${PANEL_INK.DIVIDER}`,
                }}
            >
                <Text component="h2" fz={TITLE_SIZE} fw={600} m={0} c={PANEL_INK.VALUE}>
                    Style layers
                </Text>
                <Menu position="bottom-end" withinPortal returnFocus={false}>
                    <Menu.Target>
                        <ActionIcon
                            variant="subtle"
                            size={PANEL_GRID.CONTROL_HEIGHT}
                            c={PANEL_INK.CHROME}
                            aria-label="Add a layer or folder"
                            title="Add a layer or folder"
                        >
                            <UiGlyph name="plus" size={PANEL_GRID.GLYPH} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item leftSection={<Layers size={12} />} onClick={onAddLayer}>
                            Add layer
                        </Menu.Item>
                        <Menu.Item leftSection={<Folder size={12} />} onClick={onAddFolder}>
                            Add folder
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
            <ContextMenu
                target={
                    <Box
                        style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
                        onContextMenu={(event: React.MouseEvent<HTMLElement>) => {
                            const row = (event.target as HTMLElement).closest('[role="treeitem"]');
                            const id = row?.querySelector("[data-row-id]")?.getAttribute("data-row-id") ?? null;
                            if (id === null) {
                                event.preventDefault();
                                return;
                            }
                            setMenuRow(id);
                            select(id);
                        }}
                        onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
                            const id =
                                (event.target as HTMLElement)
                                    .closest('[role="treeitem"]')
                                    ?.querySelector("[data-row-id]")
                                    ?.getAttribute("data-row-id") ?? null;
                            if (id !== null) {
                                setMenuRow(id);
                            }
                        }}
                    >
                        <Tree
                            items={items}
                            label="Style layers"
                            renameLabel="Layer name"
                            multiselect={false}
                            selected={selectedId === null ? [] : [selectedId]}
                            expanded={expanded}
                            onExpandedChange={setExpanded}
                            onSelect={(ids) => {
                                if (ids.length > 0) {
                                    select(ids[0]);
                                }
                            }}
                            onRename={(id, name) => {
                                const trimmed = name.trim();
                                if (trimmed !== "") {
                                    update(id, (l) => ({ ...l, name: trimmed }));
                                }
                            }}
                            onMove={onMove}
                        />
                    </Box>
                }
            >
                {menuRow !== null && layers[menuRow] !== undefined ? <RowMenuItems id={menuRow} /> : null}
            </ContextMenu>
            <Group gap={4} style={{ padding: footerPad, borderTop: `1px solid ${PANEL_INK.DIVIDER}` }}>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    aria-pressed={selectedId === null}
                    onClick={() => {
                        select(null);
                    }}
                >
                    Graph settings
                </Button>
                {missingStarting && (
                    <Button size="compact-xs" variant="subtle" onClick={onRestore}>
                        Restore starting layers
                    </Button>
                )}
            </Group>
        </Box>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* The value picker                                                                            */
/* ------------------------------------------------------------------------------------------ */

const LEVEL_GLYPH: Record<ValueRef["level"], React.ReactNode> = {
    categories: <Tags size={12} />,
    number: <Hash size={12} />,
    text: <Type size={12} />,
    yesno: <ToggleLeft size={12} />,
};

/** What a field can be driven by: the parts of a property definition the picker checks. */
type Fit = Pick<PropDef, "label" | "on" | "scheme" | "ramp" | "capacity">;

/**
 * Why `value` cannot drive a field, or null when it can. graphty-element's reason codes, in the
 * app's words.
 */
function incompatible(prop: Fit, value: ValueRef): string | null {
    if (prop.scheme === "rule") {
        return `${prop.label} turns on and off through Which elements: add a layer for the elements to change`;
    }
    if (value.on !== "both" && value.on !== prop.on) {
        return `${value.name} is measured on ${value.on}s; ${prop.label} styles ${prop.on}s`;
    }
    if (value.level === "text") {
        return `${prop.label} takes categories or a number; ${value.name} is text with 77 values`;
    }
    if (prop.ramp === "none" && value.level === "number") {
        return `${prop.label} takes categories; ${value.name} is a number`;
    }
    if (prop.capacity !== undefined && (value.distinct ?? 0) > prop.capacity) {
        return `${prop.label} tells ${String(prop.capacity)} categories apart; ${value.name} has ${String(value.distinct)}`;
    }
    return null;
}

/**
 * The value picker's list: Data, one group per run, Facts. Values that do not fit stay listed,
 * disabled, with the reason.
 */
function ValuePickerList({
    reasonFor,
    onPick,
    current,
    allowWords,
}: {
    readonly reasonFor: (value: ValueRef) => string | null;
    readonly onPick: (valueId: string | null) => void;
    readonly current?: string;
    readonly allowWords?: boolean;
}): React.JSX.Element {
    const [query, setQuery] = useState("");
    const groups = useMemo(() => {
        const out = new Map<string, ValueRef[]>();
        for (const v of VALUES) {
            if (query !== "" && !`${v.name} ${v.group}`.toLowerCase().includes(query.toLowerCase())) {
                continue;
            }
            out.set(v.group, [...(out.get(v.group) ?? []), v]);
        }
        return [...out.entries()];
    }, [query]);
    return (
        <Box>
            <Box style={{ padding: `4px ${String(PANEL_GRID.PAD_RIGHT)}px 4px ${String(PANEL_GRID.PAD_LEFT)}px` }}>
                <SearchInput aria-label="Search values" placeholder="Search values" value={query} onChange={setQuery} />
            </Box>
            {allowWords === true && (
                <DataRow
                    name="Type words instead"
                    icon={<Type size={12} />}
                    onClick={() => {
                        onPick(null);
                    }}
                />
            )}
            {groups.map(([group, values]) => (
                <Box key={group}>
                    <Text size="xs" c={PANEL_INK.CHROME} fw={600} style={{ padding: "8px 16px 4px" }}>
                        {group}
                    </Text>
                    {values.map((v) => {
                        const reason = reasonFor(v);
                        if (reason !== null) {
                            return (
                                <Tooltip key={v.id} label={reason} multiline w={220}>
                                    <Box aria-disabled="true" style={{ opacity: 0.45 }}>
                                        <DataRow name={v.name} icon={LEVEL_GLYPH[v.level]} value={v.state} />
                                    </Box>
                                </Tooltip>
                            );
                        }
                        return (
                            <DataRow
                                key={v.id}
                                name={v.name}
                                icon={LEVEL_GLYPH[v.level]}
                                value={v.state}
                                selected={v.id === current}
                                onClick={() => {
                                    onPick(v.id);
                                }}
                            />
                        );
                    })}
                </Box>
            ))}
        </Box>
    );
}

/** The range a picked number starts on, per property: graphty-element's own encode defaults. */
const START_RANGE: Partial<Record<PropId, [number, number]>> = {
    size: [1, 3],
    edgeWidth: [8, 16],
    nodeOpacity: [30, 100],
    edgeOpacity: [30, 100],
    patternCount: [2, 12],
};

/**
 * The derived write a picked value makes for a property: a ramp for a number, a scheme for
 * categories, a value table for numbers per category.
 */
function bindingFor(prop: PropDef, value: ValueRef): DerivedWrite {
    if (value.level === "number") {
        if (prop.control === "color") {
            return derived(value.id, "ramp", DEFAULT_RAMP);
        }
        const [from, to] = START_RANGE[prop.id] ?? [1, 3];
        return { ...derived(value.id, "ramp", DEFAULT_RAMP), from, to, steps: 5 };
    }
    if (prop.scheme === "palette") {
        return derived(value.id, "categories", DEFAULT_CATEGORICAL);
    }
    if (prop.scheme === "shapes") {
        return derived(value.id, "categories", "Distinct shapes");
    }
    if (prop.scheme === "list") {
        return derived(value.id, "categories", `${prop.label} list`);
    }
    return { ...derived(value.id, "table", ""), table: { 1: Number(prop.floor) * 2 } };
}

/**
 * Figma's apply-variable glyph at the end of a value control, shown on hover and focus. It opens
 * the value picker; "=" in the field opens it too.
 */
function VaryGlyph({ reason, label }: { readonly reason: string | null; readonly label: string }): React.JSX.Element {
    return (
        <ActionIcon
            className="spm-vary"
            type="button"
            variant="subtle"
            size={PANEL_GRID.TRAIL}
            c={reason === null ? PANEL_INK.CHROME : PANEL_INK.DISABLED}
            aria-label={reason === null ? `Vary ${label} by a value` : `Vary ${label} by a value. ${reason}`}
            title={reason ?? `Vary ${label} by a value`}
            aria-disabled={reason === null ? undefined : true}
            data-disabled={reason === null ? undefined : true}
            style={reason === null ? undefined : { background: "transparent", cursor: "not-allowed" }}
        >
            <Hexagon size={12} />
        </ActionIcon>
    );
}

/**
 * A field of a list entry (an effect's color, an arrow's kind) that can vary by a value: its own
 * control with the vary glyph, or, once bound, a pill naming the value and a button that fixes it
 * again. "=" in the control opens the picker, as on a property row.
 */
function VaryField({
    label,
    fit,
    bound,
    onBind,
    children,
}: {
    readonly label: string;
    readonly fit: Fit;
    readonly bound: string | undefined;
    readonly onBind: (valueId: string | undefined) => void;
    readonly children: React.ReactNode;
}): React.JSX.Element {
    const [open, setOpen] = useState(false);
    return (
        <Popout opened={open} onOpenChange={setOpen}>
            <Box
                className="spm-row"
                style={{ display: "flex", alignItems: "center", gap: ROW_GAP, flex: 1, minWidth: 0 }}
                onKeyDown={(event: React.KeyboardEvent) => {
                    if (event.key === "=" && bound === undefined) {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
            >
                {bound === undefined ? (
                    <>
                        <Box style={{ flex: 1, minWidth: 0 }}>{children}</Box>
                        <Popout.Trigger>
                            <span style={{ display: "inline-flex" }}>
                                <VaryGlyph reason={null} label={label} />
                            </span>
                        </Popout.Trigger>
                    </>
                ) : (
                    <>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Popout.Trigger>
                                <span style={{ display: "flex", width: "100%" }}>
                                    <VariablePill
                                        name={valueLabel(bound)}
                                        value={`${label} varies by ${valueLabel(bound)}`}
                                        kind="property"
                                        width="100%"
                                        glyph={<UiGlyph name="component" size={10} />}
                                    />
                                </span>
                            </Popout.Trigger>
                        </Box>
                        <ActionIcon
                            type="button"
                            variant="subtle"
                            size={PANEL_GRID.TRAIL}
                            c={PANEL_INK.CHROME}
                            aria-label={`Fix ${label} at one value`}
                            title={`Fix ${label} at one value`}
                            onClick={() => {
                                onBind(undefined);
                            }}
                        >
                            <UiGlyph name="unlink" size={PANEL_GRID.GLYPH} />
                        </ActionIcon>
                    </>
                )}
            </Box>
            <Popout.Panel
                width={PANEL_GRID.POPOVER_WIDTH}
                header={{ variant: "title", title: `Vary ${label} by` }}
                placement="left"
            >
                <Popout.Content>
                    <ValuePickerList
                        reasonFor={(v) => incompatible(fit, v)}
                        current={bound}
                        onPick={(valueId) => {
                            setOpen(false);
                            if (valueId !== null) {
                                onBind(valueId);
                            }
                        }}
                    />
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Property rows                                                                               */
/* ------------------------------------------------------------------------------------------ */

interface RowContext {
    readonly layer: MockLayer;
    readonly prop: PropDef;
    /** Writes nothing yet: added with "+" and waiting for its first value. */
    readonly pending: boolean;
    /** A split child following its parent: the parent's value in secondary text. */
    readonly inherited?: Write;
    readonly showLabel: boolean;
}

/**
 * Writes a property on the layer (and takes it off the pending list).
 */
function useWriter(layer: MockLayer, prop: PropId): (write: Write | undefined) => void {
    const { update } = useMock();
    return (write) => {
        update(layer.id, (l) => {
            const props = Object.fromEntries(
                Object.entries({ ...l.props, [prop]: write }).filter(([, w]) => w !== undefined),
            );
            return { ...l, props, pending: l.pending.filter((p) => p !== prop), draft: false };
        });
    };
}

/** What Show means, on its row: it is not opacity and not a filter. */
const SHOW_HELP: Partial<Record<PropId, string>> = {
    nodeVisible:
        "Off hides these nodes and the edges and labels on them. Opacity fades them instead; Which elements decides what this layer reaches.",
    edgeVisible:
        "Off hides these edges, their arrows and their labels. Opacity fades them instead; Which elements decides what this layer reaches.",
};

const NUMBER_GLYPH: Partial<Record<PropId, "width" | "opacity" | "sizeLargest">> = {
    edgeWidth: "width",
    nodeOpacity: "opacity",
    edgeOpacity: "opacity",
};

/**
 * The value control of a fixed row. A combine mode other than Replace sits inside the field, as
 * its prefix, and in its accessible name ("Edge width, multiplied by").
 */
function FixedControl({
    prop,
    value,
    placeholder,
    combine,
    onChange,
    autoFocus,
}: {
    readonly prop: PropDef;
    readonly value: string | number | boolean | undefined;
    readonly placeholder?: string | number;
    readonly combine: Combine;
    /** A row just added with "+": its field takes focus, so the reader types the value at once. */
    readonly autoFocus?: boolean;
    readonly onChange: (value: string | number) => void;
}): React.JSX.Element {
    const floor = placeholder ?? prop.floor;
    const word = COMBINE_WORDS[combine];
    const name = COMBINE_NAMES[combine] === undefined ? prop.label : `${prop.label}, ${String(COMBINE_NAMES[combine])}`;
    if (prop.control === "color") {
        return (
            <CompactColorInput
                color={typeof value === "string" ? HEX(value) : undefined}
                defaultColor={HEX(String(floor))}
                showOpacity={false}
                showReset={false}
                width="100%"
                onColorChange={(next) => {
                    if (next !== undefined) {
                        onChange(strip(next) ?? next);
                    }
                }}
            />
        );
    }
    if (prop.control === "select") {
        return (
            <PanelField
                label={prop.label}
                kind="select"
                width="fill"
                data={[...(prop.options ?? [])]}
                value={typeof value === "string" ? value : null}
                placeholder={String(floor)}
                autoFocus={autoFocus}
                onChange={(next) => {
                    onChange(next);
                }}
            />
        );
    }
    return (
        <PanelField
            label={name}
            kind="number"
            width="fill"
            glyph={
                word === undefined ? (
                    (NUMBER_GLYPH[prop.id] ?? "sizeLargest")
                ) : (
                    <Text span size="xs" c={PANEL_INK.CHROME} aria-hidden="true">
                        {word}
                    </Text>
                )
            }
            unit={prop.unit}
            value={typeof value === "number" ? value : null}
            placeholder={String(floor)}
            autoFocus={autoFocus}
            min={prop.min ?? 0}
            max={prop.max}
            step={prop.id === "size" ? 0.25 : 1}
            onChange={(next) => {
                onChange(Number(next));
            }}
        />
    );
}

/**
 * The row menu of a property: Combine, Vary by, Follow parent, Remove.
 */
function PropMenuItems({
    ctx,
    write,
    onCombine,
    onVary,
    onRemove,
}: {
    readonly ctx: RowContext;
    readonly write: Write | undefined;
    readonly onCombine: (combine: Combine) => void;
    readonly onVary: () => void;
    readonly onRemove: () => void;
}): React.JSX.Element {
    const combines = ctx.prop.control === "color" ? COLOR_COMBINES : NUMBER_COMBINES;
    return (
        <>
            {ctx.prop.control !== "switch" && ctx.prop.control !== "select" && (
                <Menu.Sub>
                    <Menu.Sub.Target>
                        <Menu.Sub.Item>Combine</Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                        {combines.map((c) => (
                            <MenuCheckItem
                                key={c}
                                radio
                                checked={(write?.combine ?? "Replace") === c}
                                onClick={() => {
                                    onCombine(c);
                                }}
                            >
                                {c}
                            </MenuCheckItem>
                        ))}
                    </Menu.Sub.Dropdown>
                </Menu.Sub>
            )}
            <Menu.Item onClick={onVary} disabled={ctx.prop.scheme === "rule"}>
                Vary by...
            </Menu.Item>
            {ctx.layer.kind === "child" && write !== undefined && (
                <Menu.Item onClick={onRemove}>Follow parent</Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item onClick={onRemove}>Remove</Menu.Item>
        </>
    );
}

/**
 * The sentence for a property the layers above cover entirely, or undefined when it shows.
 * @param layer - The layer.
 * @param prop - The property.
 * @param layers - Every layer.
 * @returns "Node color is painted over by Louvain and 2 more", and the topmost cover's id.
 */
function paintedOverBy(
    layer: MockLayer,
    prop: PropId,
    layers: Readonly<Record<string, MockLayer>>,
): { sentence: string; by: string } | undefined {
    const over = layer.paintedOver?.[prop];
    const by = over === undefined ? undefined : layers[over.by];
    if (over === undefined || by === undefined) {
        return undefined;
    }
    const more = over.more > 0 ? ` and ${String(over.more)} more` : "";
    return { sentence: `${PROPS[prop].label} is painted over by ${by.name}${more}`, by: by.id };
}

/**
 * One quiet mark on a property row the layers above cover entirely: the full sentence on hover
 * and focus, and a click selects the topmost layer covering it.
 */
function PaintedOverMark({
    layer,
    prop,
}: {
    readonly layer: MockLayer;
    readonly prop: PropId;
}): React.JSX.Element | null {
    const { layers, select } = useMock();
    const over = paintedOverBy(layer, prop, layers);
    if (over === undefined) {
        return null;
    }
    return (
        <Tooltip label={`${over.sentence}. Click to select it`} multiline w={200}>
            <ActionIcon
                type="button"
                variant="subtle"
                size={PANEL_GRID.TRAIL}
                c={PANEL_INK.CHROME}
                aria-label={`${over.sentence}. Select it`}
                onClick={() => {
                    select(over.by);
                }}
            >
                <Layers2 size={12} />
            </ActionIcon>
        </Tooltip>
    );
}

/**
 * One property row: fixed (a value control) or derived (settings, a pill, its second line and
 * notes).
 */
function PropRow({ ctx }: { readonly ctx: RowContext }): React.JSX.Element {
    const { layer, prop } = ctx;
    const write = layer.props[prop.id];
    const setWrite = useWriter(layer, prop.id);
    const [pickerOpen, setPickerOpen] = useState(false);
    const varyReason = prop.scheme === "rule" ? `${prop.label} turns on and off through Which elements` : null;

    const pick = (valueId: string | null): void => {
        setPickerOpen(false);
        const value = VALUES.find((v) => v.id === valueId);
        if (value !== undefined) {
            setWrite(bindingFor(prop, value));
        }
    };
    const picker = (
        <Popout.Panel width={PANEL_GRID.POPOVER_WIDTH} header={{ variant: "title", title: "Vary by" }} placement="left">
            <Popout.Content>
                <ValuePickerList
                    reasonFor={(v) => incompatible(prop, v)}
                    onPick={pick}
                    current={write?.mode === "derived" ? write.source : undefined}
                />
            </Popout.Content>
        </Popout.Panel>
    );
    const combine = (c: Combine): void => {
        if (write !== undefined) {
            setWrite({ ...write, combine: c });
        }
    };
    const menu = (
        <PropMenuItems
            ctx={ctx}
            write={write}
            onCombine={combine}
            onVary={() => {
                setPickerOpen(true);
            }}
            onRemove={() => {
                setWrite(undefined);
            }}
        />
    );

    if (prop.control === "switch") {
        const on = write?.mode === "fixed" ? write.value === true : false;
        return (
            <ContextMenu
                target={
                    <Box className="spm-row">
                        <ToggleRow
                            label={prop.short}
                            control="switch"
                            checked={on}
                            onChange={(checked) => {
                                setWrite(fixed(checked));
                            }}
                            trailing={
                                <Group gap={2} wrap="nowrap">
                                    {SHOW_HELP[prop.id] !== undefined && (
                                        <InfoCircle label={`What ${prop.label} means`}>
                                            <Text size="xs">{SHOW_HELP[prop.id]}</Text>
                                        </InfoCircle>
                                    )}
                                    {prop.gap !== undefined && <Gap gap={prop.gap} label={prop.label} />}
                                    <Minus
                                        target={`${prop.label} from ${layer.name}`}
                                        onRemove={() => {
                                            setWrite(undefined);
                                        }}
                                    />
                                </Group>
                            }
                        />
                    </Box>
                }
            >
                {menu}
            </ContextMenu>
        );
    }

    if (write?.mode === "derived") {
        return (
            <Popout opened={pickerOpen} onOpenChange={setPickerOpen}>
                <ContextMenu
                    target={
                        <Box className="spm-row">
                            {ctx.showLabel && <RowCaption text={prop.short} />}
                            <DerivedRow layer={layer} prop={prop} write={write} setWrite={setWrite} />
                        </Box>
                    }
                >
                    {menu}
                </ContextMenu>
                {picker}
            </Popout>
        );
    }

    const inheritedValue = ctx.inherited?.mode === "fixed" ? ctx.inherited.value : undefined;
    const paused = write?.paused ?? false;
    const combineMode = write?.combine ?? "Replace";
    const colorWord = prop.control === "color" ? COMBINE_WORDS[combineMode] : undefined;
    return (
        <Popout opened={pickerOpen} onOpenChange={setPickerOpen}>
            <ContextMenu
                target={
                    <Box className="spm-row">
                        {ctx.showLabel && <RowCaption text={prop.short} />}
                        <Box
                            style={rowStyle}
                            onKeyDown={(event: React.KeyboardEvent) => {
                                if (event.key === "=" && varyReason === null) {
                                    event.preventDefault();
                                    setPickerOpen(true);
                                }
                            }}
                        >
                            <Group
                                gap={ROW_GAP}
                                wrap="nowrap"
                                style={{ flex: 1, minWidth: 0, opacity: paused ? 0.45 : 1 }}
                            >
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                    <FixedControl
                                        prop={prop}
                                        combine={combineMode}
                                        value={write?.mode === "fixed" ? write.value : undefined}
                                        placeholder={
                                            inheritedValue === undefined || typeof inheritedValue === "boolean"
                                                ? undefined
                                                : inheritedValue
                                        }
                                        autoFocus={ctx.pending}
                                        onChange={(next) => {
                                            setWrite(fixed(next, combineMode));
                                        }}
                                    />
                                </Box>
                                {colorWord !== undefined && (
                                    <Tooltip label={`Combine: ${combineMode}`}>
                                        <Text size="xs" c={PANEL_INK.CHROME} style={{ flex: "0 0 auto" }}>
                                            {colorWord}
                                        </Text>
                                    </Tooltip>
                                )}
                                {combineMode !== "Replace" && <Gap gap="combine" label="Combine" />}
                                <Popout.Trigger>
                                    <span style={{ display: "inline-flex" }}>
                                        <VaryGlyph reason={varyReason} label={prop.label} />
                                    </span>
                                </Popout.Trigger>
                            </Group>
                            <PaintedOverMark layer={layer} prop={prop.id} />
                            {write === undefined ? (
                                <SlotSpacer />
                            ) : (
                                <Eye
                                    hidden={paused}
                                    target={`${prop.label} on ${layer.name}`}
                                    onToggle={(hidden) => {
                                        setWrite({ ...write, paused: hidden });
                                    }}
                                />
                            )}
                            {write === undefined && !ctx.pending ? (
                                <SlotSpacer />
                            ) : (
                                <Minus
                                    target={`${prop.label} from ${layer.name}`}
                                    onRemove={() => {
                                        setWrite(undefined);
                                    }}
                                />
                            )}
                        </Box>
                        {ctx.inherited !== undefined && write === undefined && (
                            <Note text="Follows its parent. Choose a value to override it here" />
                        )}
                        {layer.kind === "child" && write !== undefined && (
                            <Box style={{ paddingInlineStart: PANEL_GRID.PAD_LEFT, paddingBottom: 4 }}>
                                <Anchor
                                    component="button"
                                    type="button"
                                    size="xs"
                                    onClick={() => {
                                        setWrite(undefined);
                                    }}
                                >
                                    Follow parent
                                </Anchor>
                            </Box>
                        )}
                    </Box>
                }
            >
                {menu}
            </ContextMenu>
            {picker}
        </Popout>
    );
}

const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: ROW_GAP,
    minHeight: PANEL_GRID.ROW_PITCH,
    paddingInlineStart: PANEL_GRID.PAD_LEFT,
    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
};

/**
 * The property's name above its control, where a section holds more than one property.
 */
function RowCaption({
    text,
    children,
}: {
    readonly text: string;
    readonly children?: React.ReactNode;
}): React.JSX.Element {
    return (
        <Group
            gap={4}
            wrap="nowrap"
            style={{ paddingInlineStart: PANEL_GRID.PAD_LEFT, paddingInlineEnd: PANEL_GRID.PAD_RIGHT, paddingTop: 4 }}
        >
            <Text size="xs" c={PANEL_INK.CHROME}>
                {text}
            </Text>
            {children}
        </Group>
    );
}

/**
 * One line of secondary text under a row: a note the note rule requires. The warning mark is kept
 * for what the reader set that is not showing (painted over, locked, hidden).
 */
function Note({
    text,
    onClick,
    warn,
}: {
    readonly text: string;
    readonly onClick?: () => void;
    readonly warn?: boolean;
}): React.JSX.Element {
    return (
        <Box style={{ paddingInlineStart: PANEL_GRID.PAD_LEFT, paddingInlineEnd: PANEL_GRID.PAD_RIGHT }}>
            <ProseBlock variant={warn === true ? "departure" : "reading"}>
                {onClick === undefined ? (
                    text
                ) : (
                    <Anchor component="button" type="button" size="xs" onClick={onClick}>
                        {text}
                    </Anchor>
                )}
            </ProseBlock>
        </Box>
    );
}

/**
 * The split children of a parent that change a property, by category.
 * @param layers - Every layer.
 * @param parentId - The split parent.
 * @param prop - The property.
 * @returns Category number to the child's color.
 */
function childOverrides(
    layers: Readonly<Record<string, MockLayer>>,
    parentId: string,
    prop: PropId,
): Record<number, string> {
    const out: Record<number, string> = {};
    for (const l of Object.values(layers)) {
        const w = l.props[prop];
        if (l.child?.parentId === parentId && w?.mode === "fixed" && typeof w.value === "string") {
            out[l.child.group] = w.value;
        }
    }
    return out;
}

/**
 * The notes a derived write leaves on its row and in the legend: every hidden setting that is not
 * neutral.
 */
function notesFor(write: DerivedWrite, layer: MockLayer, changed: number): string[] {
    const notes: string[] = [];
    const value = VALUES.find((v) => v.id === write.source);
    if (value?.guessed === true && write.readAs === undefined) {
        notes.push(`Level guessed: ${value.level}`);
    }
    if (write.binding === "ramp" && value?.distinct !== undefined && value.distinct <= 5) {
        notes.push(`Only ${String(value.distinct)} distinct values`);
    }
    if (write.scale !== "Linear") {
        notes.push(`${write.scale} scale`);
    }
    if (write.binding === "ramp" && write.steps !== undefined) {
        notes.push(`${String(write.steps)} steps`);
    }
    if (write.clampLow !== undefined || write.clampHigh !== undefined) {
        notes.push(
            `Clamped at ${String(write.clampLow ?? 0)}th to ${String(write.clampHigh ?? 100)}th percentile, 14 outside`,
        );
    }
    if (write.noValue === "Paint") {
        notes.push("Elements with no value are painted");
    }
    if (write.keep) {
        notes.push("Range kept on re-run");
    }
    if (write.reverse) {
        notes.push("Palette reversed");
    }
    if (write.combine !== "Replace") {
        notes.push(`Combine: ${write.combine}`);
    }
    const hidden = write.hiddenValues?.length ?? 0;
    if (hidden > 0) {
        notes.push(`${String(hidden)} ${hidden === 1 ? "value" : "values"} hidden`);
    }
    if (
        write.binding === "categories" &&
        paletteOf(write.palette).id === write.palette &&
        paletteOf(write.palette).colors.length < categoriesOf(write.source).length
    ) {
        notes.push("Other: 16% of nodes");
    }
    if (layer.kind === "split" && changed > 0) {
        notes.push(`Mixed: ${String(changed)} ${changed === 1 ? "community" : "communities"} changed`);
    }
    return notes;
}

interface Category {
    readonly n: number;
    readonly name: string;
    readonly count: number;
}

/**
 * The categories a value holds, largest first.
 */
function categoriesOf(source: string): Category[] {
    if (source === "group") {
        return [...COMMUNITIES]
            .map((c) => ({ n: c.n, name: `Community ${String(c.n)}`, count: c.size }))
            .sort((a, b) => b.count - a.count);
    }
    if (source === "selected") {
        return [
            { n: 1, name: "yes", count: 2 },
            { n: 2, name: "no", count: 75 },
        ];
    }
    if (source === "hovered") {
        return [
            { n: 1, name: "yes", count: 0 },
            { n: 2, name: "no", count: 77 },
        ];
    }
    return [
        { n: 1, name: "yes", count: 5 },
        { n: 2, name: "no", count: 72 },
    ];
}

/**
 * The words a pill reads aloud: the whole binding ("Node color varies by degree, linear, 1 to 36").
 */
function bindingName(prop: PropDef, write: DerivedWrite, changed: number): string {
    const value = valueLabel(write.source);
    if (write.binding === "ramp") {
        const [lo, hi] = domainOf(write.source);
        const steps = write.steps === undefined ? "" : `, ${String(write.steps)} steps`;
        return `${prop.label} varies by ${value}, ${write.scale.toLowerCase()}, ${String(write.domainMin ?? lo)} to ${String(write.domainMax ?? hi)}${steps}`;
    }
    const cats = categoriesOf(write.source).length;
    const more = changed > 0 ? `, ${String(changed)} changed` : "";
    return `${prop.label} by ${value}, ${String(cats)} categories${more}`;
}

/**
 * A derived row: settings, pill, eye and minus; then a ramp, a range or swatches; then notes.
 */
function DerivedRow({
    layer,
    prop,
    write,
    setWrite,
}: {
    readonly layer: MockLayer;
    readonly prop: PropDef;
    readonly write: DerivedWrite;
    readonly setWrite: (write: Write | undefined) => void;
}): React.JSX.Element {
    const { layers } = useMock();
    const overrides = layer.kind === "split" ? childOverrides(layers, layer.id, prop.id) : {};
    const changed = Object.keys(overrides).length;
    const notes = notesFor(write, layer, changed);
    const [settingsOpen, setSettingsOpen] = useState(false);
    return (
        <Box>
            <Box style={rowStyle}>
                <BindingSettings
                    layer={layer}
                    prop={prop}
                    write={write}
                    setWrite={setWrite}
                    opened={settingsOpen}
                    onOpenChange={setSettingsOpen}
                />
                <Box style={{ flex: "1 1 0", minWidth: 0, opacity: write.paused ? 0.45 : 1 }}>
                    <Popout.Trigger>
                        <span style={{ display: "flex", width: "100%" }}>
                            <VariablePill
                                name={valueLabel(write.source)}
                                value={bindingName(prop, write, changed)}
                                glyph={<UiGlyph name={write.binding === "ramp" ? "refresh" : "component"} size={10} />}
                                width="100%"
                                kind="property"
                            />
                        </span>
                    </Popout.Trigger>
                </Box>
                <PaintedOverMark layer={layer} prop={prop.id} />
                <Eye
                    hidden={write.paused}
                    target={`${prop.label} on ${layer.name}`}
                    onToggle={(hidden) => {
                        setWrite({ ...write, paused: hidden });
                    }}
                />
                <Minus
                    target={`${prop.label} from ${layer.name}`}
                    onRemove={() => {
                        setWrite(undefined);
                    }}
                />
            </Box>
            <Box
                style={{
                    paddingInlineStart: PANEL_GRID.PAD_LEFT + PANEL_GRID.TRAIL + ROW_GAP,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT + 4,
                }}
            >
                <BindingPreview
                    prop={prop}
                    write={write}
                    setWrite={setWrite}
                    overrides={overrides}
                    onEdit={() => {
                        setSettingsOpen(true);
                    }}
                />
            </Box>
            {notes.map((n) => (
                <Note key={n} text={n} />
            ))}
        </Box>
    );
}

/**
 * The second line of a derived row.
 */
function BindingPreview({
    prop,
    write,
    setWrite,
    overrides,
    onEdit,
}: {
    readonly prop: PropDef;
    readonly write: DerivedWrite;
    readonly setWrite: (write: Write | undefined) => void;
    readonly overrides: Readonly<Record<number, string>>;
    /** Opens the binding's settings: the ramp is the obvious place to change the gradient. */
    readonly onEdit: () => void;
}): React.JSX.Element | null {
    const domain = domainOf(write.source);
    if (write.binding === "ramp" && prop.control === "color") {
        return (
            <Tooltip label="Change the gradient: palette, range, scale, steps">
                <UnstyledButton
                    aria-label={`Change the ${prop.label.toLowerCase()} gradient`}
                    onClick={onEdit}
                    style={{ display: "block", width: "100%", cursor: "pointer" }}
                >
                    <RampRow
                        label={`${prop.label} ramp`}
                        variant="color"
                        gradient={rampGradient(write.palette, write.reverse, write.steps)}
                        min={String(write.domainMin ?? domain[0])}
                        max={String(write.domainMax ?? domain[1])}
                    />
                </UnstyledButton>
            </Tooltip>
        );
    }
    if (write.binding === "ramp") {
        return (
            <PanelLabelsProvider showLabels>
                <FieldRow groupLabel={`${prop.label} range`}>
                    <PanelField
                        label="From"
                        kind="number"
                        glyph="sizeSmallest"
                        unit={prop.unit}
                        value={write.from ?? 1}
                        onChange={(v) => {
                            setWrite({ ...write, from: Number(v) });
                        }}
                    />
                    <PanelField
                        label="To"
                        kind="number"
                        glyph="sizeLargest"
                        unit={prop.unit}
                        value={write.to ?? 3}
                        onChange={(v) => {
                            setWrite({ ...write, to: Number(v) });
                        }}
                    />
                </FieldRow>
            </PanelLabelsProvider>
        );
    }
    const cats = categoriesOf(write.source);
    if (write.binding === "table") {
        return (
            <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingBottom: 4 }}>
                {`${String(Object.keys(write.table ?? {}).length)} of ${String(cats.length)} categories set; the rest keep the layers beneath`}
            </Text>
        );
    }
    if (prop.scheme !== "palette") {
        const kinds = prop.options ?? [];
        return (
            <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingBottom: 4 }}>
                {cats
                    .slice(0, 4)
                    .map((c, i) => `${c.name}: ${String(kinds[(i + 1) % kinds.length] ?? "")}`)
                    .join(", ")}
            </Text>
        );
    }
    const palette = paletteOf(write.palette).colors;
    const shown = [...cats].sort((a, b) => a.n - b.n).slice(0, CHIP_LIMIT);
    return (
        <Group gap={4} style={{ minHeight: 24, paddingBottom: 4 }}>
            {shown.map((c) => {
                const override = overrides[c.n];
                const hidden = write.hiddenValues?.includes(c.n) === true;
                return (
                    <Tooltip key={c.n} label={chipLabel(c.name, hidden, override !== undefined)}>
                        <Box style={{ position: "relative", display: "inline-flex", opacity: hidden ? 0.3 : 1 }}>
                            <ColorSwatch
                                color={HEX(override ?? palette[(c.n - 1) % palette.length])}
                                size={16}
                                radius="sm"
                                withShadow={false}
                                aria-label={c.name}
                            />
                            {override !== undefined && (
                                <Box
                                    aria-hidden="true"
                                    style={{
                                        position: "absolute",
                                        right: -2,
                                        top: -2,
                                        width: 6,
                                        height: 6,
                                        borderRadius: 3,
                                        background: PANEL_INK.ACCENT,
                                        border: `1px solid ${PANEL_INK.PANEL}`,
                                    }}
                                />
                            )}
                        </Box>
                    </Tooltip>
                );
            })}
            {cats.length > CHIP_LIMIT && (
                <Text size="xs" c={PANEL_INK.CHROME}>{`+${String(cats.length - CHIP_LIMIT)}`}</Text>
            )}
        </Group>
    );
}

/**
 * A category chit's tooltip.
 * @param name - The category.
 * @param hidden - Whether the reader hid it.
 * @param changed - Whether its split child overrides it.
 * @returns The words.
 */
function chipLabel(name: string, hidden: boolean, changed: boolean): string {
    if (hidden) {
        return `${name}: hidden`;
    }
    return changed ? `${name}: changed on its layer` : name;
}

/**
 * A value's range, as the domain ends the ramp prints.
 */
function domainOf(source: string): readonly [number, number] {
    if (source === "group") {
        return [1, 6];
    }
    return NUMBER_FACTS[source]?.domain ?? [0, 1];
}

/* ------------------------------------------------------------------------------------------ */
/* Binding popovers                                                                            */
/* ------------------------------------------------------------------------------------------ */

/** The tallest a popover's body grows before it scrolls: it never runs past the window. */
const POPOVER_BODY: React.CSSProperties = {
    maxHeight: "min(420px, calc(100vh - 160px))",
    overflowY: "auto",
    overflowX: "hidden",
};

/**
 * The settings button of a derived row and the popover it opens: a ramp or a categories popover.
 */
function BindingSettings({
    layer,
    prop,
    write,
    setWrite,
    opened,
    onOpenChange,
}: {
    readonly layer: MockLayer;
    readonly prop: PropDef;
    readonly write: DerivedWrite;
    readonly setWrite: (write: Write | undefined) => void;
    readonly opened: boolean;
    readonly onOpenChange: (opened: boolean) => void;
}): React.JSX.Element {
    const value = VALUES.find((v) => v.id === write.source);
    const title = `${prop.label} by ${value?.name ?? write.source}`;
    let fixAt: string | number = write.from ?? prop.floor;
    if (prop.control === "color") {
        const { colors } = paletteOf(write.palette);
        fixAt = write.binding === "ramp" ? colors[Math.floor(colors.length / 2)] : colors[0];
    } else if (prop.control === "select") {
        fixAt = prop.options?.[0] ?? prop.floor;
    }
    const changed =
        write.scale !== "Linear" ||
        write.keep ||
        write.reverse ||
        write.noValue === "Paint" ||
        write.clampLow !== undefined ||
        write.combine !== "Replace" ||
        (write.hiddenValues?.length ?? 0) > 0;
    return (
        <Popout opened={opened} onOpenChange={onOpenChange}>
            <Popout.Trigger>
                <AdvancedButton label={`${title} settings`} changed={changed} />
            </Popout.Trigger>
            <Popout.Panel
                width={PANEL_GRID.POPOVER_WIDTH}
                header={{ variant: "title", title }}
                placement="left"
                actions={[
                    {
                        id: "fix",
                        icon: <UiGlyph name="unlink" size={PANEL_GRID.GLYPH} />,
                        label: `Fix at ${String(fixAt)}`,
                        onClick: () => {
                            setWrite(fixed(fixAt));
                        },
                    },
                ]}
            >
                <Popout.Content>
                    <Box style={POPOVER_BODY}>
                        {write.binding === "ramp" ? (
                            <RampSettings prop={prop} write={write} setWrite={setWrite} />
                        ) : (
                            <CategorySettings layer={layer} prop={prop} write={write} setWrite={setWrite} />
                        )}
                    </Box>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * Elements with no value: skip them, or paint them one color.
 */
function NoValueRows({
    write,
    set,
}: {
    readonly write: DerivedWrite;
    readonly set: (patch: Partial<DerivedWrite>) => void;
}): React.JSX.Element {
    return (
        <Box style={{ padding: "0 8px 4px 16px" }}>
            <SegmentedControl
                size="xs"
                fullWidth
                aria-label="Elements with no value"
                data={["Skip", "Paint"]}
                value={write.noValue}
                onChange={(v) => {
                    set({ noValue: v === "Paint" ? "Paint" : "Skip" });
                }}
            />
            {write.noValue === "Paint" && (
                <Box style={{ paddingTop: 4 }}>
                    <CompactColorInput
                        label="No value color"
                        color={write.noValueColor === undefined ? undefined : HEX(write.noValueColor)}
                        defaultColor="#FF00FF"
                        showOpacity={false}
                        onColorChange={(c) => {
                            set({ noValueColor: strip(c) });
                        }}
                    />
                </Box>
            )}
        </Box>
    );
}

/**
 * The combine select at the foot of a binding popover.
 */
function CombineSelect({
    prop,
    write,
    set,
}: {
    readonly prop: PropDef;
    readonly write: DerivedWrite;
    readonly set: (patch: Partial<DerivedWrite>) => void;
}): React.JSX.Element {
    const combines = prop.control === "color" ? COLOR_COMBINES : NUMBER_COMBINES;
    return (
        <Group gap={4} wrap="nowrap" align="flex-end">
            <Box style={{ flex: 1 }}>
                <StyleSelect
                    label="Combine with the layers beneath"
                    value={unlessDefault(write.combine, "Replace")}
                    defaultValue="Replace"
                    options={combines.map((c) => ({ value: c, label: c }))}
                    onChange={(c) => {
                        set({ combine: (c ?? "Replace") as Combine });
                    }}
                />
            </Box>
            {write.combine !== "Replace" && <Gap gap="combine" label="Combine" />}
        </Group>
    );
}

/**
 * The ramp popover: the value with its histogram and ramp, the palette or range, scale and domain,
 * missing values, combine.
 */
function RampSettings({
    prop,
    write,
    setWrite,
}: {
    readonly prop: PropDef;
    readonly write: DerivedWrite;
    readonly setWrite: (write: Write | undefined) => void;
}): React.JSX.Element {
    const set = (patch: Partial<DerivedWrite>): void => {
        setWrite({ ...write, ...patch });
    };
    const domain = domainOf(write.source);
    const facts = NUMBER_FACTS[write.source] as (typeof NUMBER_FACTS)[string] | undefined;
    const value = VALUES.find((v) => v.id === write.source);
    const diverging = paletteOf(write.palette).kind === "diverging";
    const stepped = write.steps !== undefined || write.scale === "Equal ranges" || write.scale === "Equal counts";
    const domainSet = write.domainMin !== undefined || write.domainMax !== undefined;
    const clampSet = write.clampLow !== undefined || write.clampHigh !== undefined;
    return (
        <Box>
            <ControlGroup label="Values">
                <Box style={{ padding: `4px ${String(PANEL_GRID.PAD_RIGHT)}px 4px ${String(PANEL_GRID.PAD_LEFT)}px` }}>
                    <VariablePill name={valueLabel(write.source)} kind="property" width={184} />
                </Box>
                {write.readAs !== undefined && (
                    <Box style={{ padding: "0 8px 4px 16px" }}>
                        <Text size="xs" c={PANEL_INK.CHROME}>
                            {`Read as a number (guessed: categories). `}
                            <Anchor
                                component="button"
                                type="button"
                                size="xs"
                                onClick={() => {
                                    setWrite({ ...derived(write.source, "categories", DEFAULT_CATEGORICAL) });
                                }}
                            >
                                Read as categories
                            </Anchor>
                        </Text>
                    </Box>
                )}
                {value?.distinct !== undefined && value.distinct <= 5 && (
                    <Box style={{ padding: "0 8px 4px 16px" }}>
                        <Text size="xs" c={PANEL_INK.CHROME}>
                            {`Only ${String(value.distinct)} distinct values. `}
                            {prop.scheme !== "table" && (
                                <Anchor
                                    component="button"
                                    type="button"
                                    size="xs"
                                    onClick={() => {
                                        setWrite(derived(write.source, "categories", DEFAULT_CATEGORICAL));
                                    }}
                                >
                                    Use categories instead
                                </Anchor>
                            )}
                        </Text>
                    </Box>
                )}
                {facts !== undefined && (
                    <HistogramRow
                        label={`${valueLabel(write.source)} histogram`}
                        bins={facts.bins.map((b) => ({ ...b }))}
                        minLabel={String(domain[0])}
                        maxLabel={String(domain[1])}
                    />
                )}
                {prop.control === "color" ? (
                    <>
                        <RampRow
                            label="Ramp"
                            variant="color"
                            gradient={rampGradient(write.palette, write.reverse, write.steps)}
                            min={String(write.domainMin ?? domain[0])}
                            max={String(write.domainMax ?? domain[1])}
                        />
                        <Group gap={4} wrap="nowrap" align="flex-end" style={{ padding: "0 8px 4px 16px" }}>
                            <Box style={{ flex: 1 }}>
                                <StyleSelect
                                    label="Palette"
                                    value={unlessDefault(write.palette, DEFAULT_RAMP)}
                                    defaultValue={DEFAULT_RAMP}
                                    options={RAMP_PALETTES.map((p) => ({ value: p.id, label: p.name }))}
                                    onChange={(p) => {
                                        set({ palette: p ?? DEFAULT_RAMP });
                                    }}
                                />
                            </Box>
                            <ToggleIconButton
                                variant="fill"
                                label="Reverse the palette"
                                checked={write.reverse}
                                icon={<UiGlyph name="flipHorizontal" size={PANEL_GRID.GLYPH} />}
                                onChange={(reverse) => {
                                    set({ reverse });
                                }}
                            />
                        </Group>
                    </>
                ) : (
                    <PanelLabelsProvider showLabels>
                        <FieldRow groupLabel="Range">
                            <PanelField
                                label="From"
                                kind="number"
                                unit={prop.unit}
                                value={write.from ?? 1}
                                onChange={(v) => {
                                    set({ from: Number(v) });
                                }}
                            />
                            <PanelField
                                label="To"
                                kind="number"
                                unit={prop.unit}
                                value={write.to ?? 3}
                                onChange={(v) => {
                                    set({ to: Number(v) });
                                }}
                            />
                        </FieldRow>
                    </PanelLabelsProvider>
                )}
            </ControlGroup>
            <ControlGroup label="Scale and domain">
                <Box style={{ padding: "0 8px 4px 16px" }}>
                    <StyleSelect
                        label="Scale"
                        value={unlessDefault(write.scale, "Linear")}
                        defaultValue="Linear"
                        options={SCALES.map((s) => ({ value: s, label: s }))}
                        onChange={(s) => {
                            set({ scale: (s ?? "Linear") as Scale });
                        }}
                    />
                    {diverging && (
                        <StyleNumberInput
                            label="Midpoint"
                            value={write.midpoint}
                            defaultValue={(domain[0] + domain[1]) / 2}
                            onChange={(midpoint) => {
                                set({ midpoint });
                            }}
                        />
                    )}
                    {prop.control === "color" && write.scale !== "Equal ranges" && write.scale !== "Equal counts" && (
                        <Box style={{ paddingBlock: 4 }}>
                            <SegmentedControl
                                size="xs"
                                fullWidth
                                aria-label="Draw the ramp smooth or in steps"
                                data={["Smooth", "Steps"]}
                                value={write.steps === undefined ? "Smooth" : "Steps"}
                                onChange={(v) => {
                                    set({ steps: v === "Steps" ? 5 : undefined });
                                }}
                            />
                        </Box>
                    )}
                    {stepped && (
                        <StyleNumberInput
                            label="Steps"
                            value={write.steps}
                            defaultValue={5}
                            min={2}
                            max={20}
                            onChange={(steps) => {
                                set({ steps });
                            }}
                        />
                    )}
                    {write.scale === "Power" && (
                        <StyleNumberInput
                            label="Exponent"
                            value={write.exponent}
                            defaultValue={1}
                            step={0.1}
                            onChange={(exponent) => {
                                set({ exponent });
                            }}
                        />
                    )}
                </Box>
                <PanelLabelsProvider showLabels>
                    <FieldRow groupLabel="Domain">
                        <PanelField
                            label="Lowest"
                            kind="number"
                            value={write.domainMin ?? null}
                            placeholder="Auto"
                            disabled={clampSet}
                            onChange={(v) => {
                                set({ domainMin: v === "" ? undefined : Number(v) });
                            }}
                        />
                        <PanelField
                            label="Highest"
                            kind="number"
                            value={write.domainMax ?? null}
                            placeholder="Auto"
                            disabled={clampSet}
                            onChange={(v) => {
                                set({ domainMax: v === "" ? undefined : Number(v) });
                            }}
                        />
                    </FieldRow>
                </PanelLabelsProvider>
                {clampSet && <Note text="Clear the clamp to type domain ends: the two exclude each other" />}
                <Group gap={4} style={{ padding: "4px 8px 4px 16px" }}>
                    <Checkbox
                        size="xs"
                        label="Keep on re-run"
                        checked={write.keep}
                        onChange={(event) => {
                            set({ keep: event.currentTarget.checked });
                        }}
                    />
                    <Gap gap="keep" label="Keep on re-run" />
                </Group>
                <PanelLabelsProvider showLabels>
                    <FieldRow groupLabel="Clamp">
                        <PanelField
                            label="Clamp low"
                            kind="number"
                            unit="th"
                            value={write.clampLow ?? null}
                            placeholder="None"
                            disabled={domainSet}
                            onChange={(v) => {
                                set({ clampLow: v === "" ? undefined : Number(v) });
                            }}
                        />
                        <PanelField
                            label="Clamp high"
                            kind="number"
                            unit="th"
                            value={write.clampHigh ?? null}
                            placeholder="None"
                            disabled={domainSet}
                            onChange={(v) => {
                                set({ clampHigh: v === "" ? undefined : Number(v) });
                            }}
                        />
                    </FieldRow>
                </PanelLabelsProvider>
                {domainSet && <Note text="Clamp works on an automatic domain: clear the domain ends to clamp" />}
            </ControlGroup>
            <ControlGroup label="Elements with no value">
                <NoValueRows write={write} set={set} />
            </ControlGroup>
            <Box style={{ padding: "4px 8px 8px 16px" }}>
                <CombineSelect prop={prop} write={write} set={set} />
            </Box>
        </Box>
    );
}

/**
 * The schemes a categories binding can use for a property.
 */
function schemesFor(prop: PropDef, write: DerivedWrite): { value: string; label: string }[] {
    if (write.binding === "table") {
        return [];
    }
    if (prop.scheme === "shapes") {
        return SHAPE_SCHEMES.map((s) => ({ value: s, label: s }));
    }
    if (prop.scheme === "list") {
        return [{ value: write.palette, label: write.palette }];
    }
    return CATEGORY_PALETTES.map((p) => ({ value: p.id, label: p.name }));
}

/**
 * The categories popover: the value and its level, scheme, category rows (each with an eye),
 * Other, values with none, combine, split.
 */
function CategorySettings({
    layer,
    prop,
    write,
    setWrite,
}: {
    readonly layer: MockLayer;
    readonly prop: PropDef;
    readonly write: DerivedWrite;
    readonly setWrite: (write: Write | undefined) => void;
}): React.JSX.Element {
    const { actions, layers } = useMock();
    const [query, setQuery] = useState("");
    const set = (patch: Partial<DerivedWrite>): void => {
        setWrite({ ...write, ...patch });
    };
    const all = categoriesOf(write.source);
    const cats = all.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    const palette = paletteOf(write.palette).colors;
    const schemes = schemesFor(prop, write);
    const overrides = layer.kind === "split" ? childOverrides(layers, layer.id, prop.id) : {};
    const value = VALUES.find((v) => v.id === write.source);
    const folds = prop.scheme === "palette" && all.length > palette.length;
    const hidden = write.hiddenValues ?? [];
    const toggleHidden = (n: number, hide: boolean): void => {
        set({ hiddenValues: hide ? [...hidden, n] : hidden.filter((h) => h !== n) });
    };
    return (
        <Box>
            <ControlGroup label="Values">
                <Box style={{ padding: "4px 8px 4px 16px" }}>
                    <VariablePill name={valueLabel(write.source)} kind="property" width={184} />
                </Box>
                {value?.guessed === true && (
                    <Box style={{ padding: "0 8px 4px 16px" }}>
                        <Text size="xs" c={PANEL_INK.CHROME}>
                            {`Level guessed: ${value.level}. `}
                            {prop.ramp !== "none" && (
                                <Anchor
                                    component="button"
                                    type="button"
                                    size="xs"
                                    onClick={() => {
                                        setWrite({
                                            ...bindingFor(prop, { ...value, level: "number" }),
                                            readAs: "number",
                                        });
                                    }}
                                >
                                    Read as a number
                                </Anchor>
                            )}
                        </Text>
                    </Box>
                )}
                {schemes.length > 0 && (
                    <Group gap={4} wrap="nowrap" align="flex-end" style={{ padding: "0 8px 4px 16px" }}>
                        <Box style={{ flex: 1 }}>
                            <StyleSelect
                                label="Scheme"
                                value={unlessDefault(write.palette, schemes[0].value)}
                                defaultValue={schemes[0].value}
                                options={schemes}
                                onChange={(p) => {
                                    set({ palette: p ?? schemes[0].value });
                                }}
                            />
                        </Box>
                        {prop.scheme === "shapes" && <Gap gap="shapes" label="Shape scheme" />}
                    </Group>
                )}
            </ControlGroup>
            <ControlGroup label="Categories">
                {all.length > CHIP_LIMIT && (
                    <Box style={{ padding: "0 8px 4px 16px" }}>
                        <SearchInput aria-label="Search categories" value={query} onChange={setQuery} />
                    </Box>
                )}
                {cats.slice(0, CHIP_LIMIT).map((c) => {
                    const isHidden = hidden.includes(c.n);
                    return (
                        <Box key={c.n} style={{ opacity: isHidden ? 0.5 : 1 }}>
                            <DataRow
                                name={c.name}
                                icon={
                                    prop.scheme === "palette" ? (
                                        <ColorSwatch
                                            color={HEX(overrides[c.n] ?? palette[(c.n - 1) % palette.length])}
                                            size={12}
                                            withShadow={false}
                                        />
                                    ) : undefined
                                }
                                value={write.binding === "table" ? String(write.table?.[c.n] ?? "--") : undefined}
                                trailing={
                                    <Group gap={2} wrap="nowrap">
                                        <RankChip>{c.count}</RankChip>
                                        <Eye
                                            hidden={isHidden}
                                            target={`${c.name} from ${prop.label}`}
                                            onToggle={(hide) => {
                                                toggleHidden(c.n, hide);
                                            }}
                                        />
                                    </Group>
                                }
                            />
                        </Box>
                    );
                })}
                {hidden.length > 0 && (
                    <Note
                        text={`${String(hidden.length)} ${hidden.length === 1 ? "value" : "values"} hidden: not painted, kept in the legend`}
                    />
                )}
                {folds && <DataRow name="Other" value="16% of nodes" trailing={<RankChip>12</RankChip>} />}
            </ControlGroup>
            <ControlGroup label="More than the scheme holds">
                <Box style={{ padding: "0 8px 4px 16px" }}>
                    <StyleSelect
                        label="Overflow"
                        value={unlessDefault(write.overflow, "Fold into Other")}
                        defaultValue="Fold into Other"
                        options={["Fold into Other", "Cycle shapes", "Extend the ramp"].map((o) => ({
                            value: o,
                            label: o,
                        }))}
                        onChange={(o) => {
                            set({ overflow: o ?? "Fold into Other" });
                        }}
                    />
                    <StyleNumberInput
                        label="Other threshold"
                        suffix="%"
                        value={write.otherThreshold === 1 ? undefined : write.otherThreshold}
                        defaultValue={1}
                        onChange={(v) => {
                            set({ otherThreshold: v ?? 1 });
                        }}
                    />
                    {prop.control === "color" && write.overflow === "Fold into Other" && (
                        <CompactColorInput
                            label="Other color"
                            color={write.otherColor === undefined ? undefined : HEX(write.otherColor)}
                            defaultColor={HEX(OTHER_COLOR)}
                            showOpacity={false}
                            onColorChange={(c) => {
                                set({ otherColor: strip(c) });
                            }}
                        />
                    )}
                    <StyleSelect
                        label="Order"
                        value={unlessDefault(write.order, "Largest first")}
                        defaultValue="Largest first"
                        options={["Largest first", "By name", "As found"].map((o) => ({ value: o, label: o }))}
                        onChange={(o) => {
                            set({ order: o ?? "Largest first" });
                        }}
                    />
                    {write.binding === "table" && (
                        <Group gap={4} wrap="nowrap" style={{ paddingTop: 4 }}>
                            <SegmentedControl
                                size="xs"
                                aria-label="Values the table does not list"
                                data={["Skip", "Paint"]}
                                value={write.unmapped}
                                onChange={(v) => {
                                    set({ unmapped: v === "Paint" ? "Paint" : "Skip" });
                                }}
                            />
                            <Gap gap="unmapped" label="Values not listed" />
                        </Group>
                    )}
                </Box>
            </ControlGroup>
            <ControlGroup label="Elements with no value">
                <NoValueRows write={write} set={set} />
            </ControlGroup>
            <Box style={{ padding: "4px 8px 8px 16px" }}>
                <CombineSelect prop={prop} write={write} set={set} />
                {layer.kind === "layer" && (
                    <Group gap={4} wrap="nowrap" style={{ paddingTop: 8 }}>
                        <Button
                            variant="default"
                            size="compact-sm"
                            fullWidth
                            onClick={() => {
                                actions.split(layer.id, write.source);
                            }}
                        >
                            Split into layers
                        </Button>
                        <Gap gap="split" label="Split into layers" />
                    </Group>
                )}
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Text: label entries and the tooltip                                                         */
/* ------------------------------------------------------------------------------------------ */

/** Which text block an entry is: its defaults differ (graphty-element's label and caption columns). */
type TextKind = "label" | "tooltip" | "caption";

/** graphty-element's defaults for every label look field, by block: what an empty field draws. */
const LOOK_DEFAULTS: Record<TextKind, Readonly<Record<string, LookValue>>> = (() => {
    const label: Record<string, LookValue> = {
        color: "000000",
        background: "000000",
        font: "Verdana",
        weight: "Normal",
        lineHeight: 1.2,
        textAlign: "Center",
        padding: 0,
        cornerRadius: 0,
        marginTop: 5,
        marginBottom: 5,
        marginLeft: 5,
        marginRight: 5,
        borderWidth: 1,
        borderColor: "000000",
        gradientType: "Linear",
        gradientFrom: "000000",
        gradientTo: "323232",
        gradientDirection: "Vertical",
        outlineColor: "000000",
        outlineWidth: 2,
        shadowColor: "000000",
        shadowBlur: 4,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        attachOffset: 0,
        priority: 0,
        pointerDirection: "Auto",
        pointerWidth: 20,
        pointerHeight: 10,
        pointerOffset: 0,
        pointerCurve: false,
        animation: "None",
        animationSpeed: 1,
        depthFadeNear: 10,
        depthFadeFar: 50,
        badge: "None",
        icon: "",
        iconPosition: "Left",
        progress: 0,
        maxNumber: 999,
        overflowSuffix: "+",
    };
    return {
        label,
        tooltip: { ...label, background: "FFFFFF" },
        caption: {
            ...label,
            borderColor: "FFFFFF",
            attachOffset: 0.3,
            pointerDirection: "Bottom",
            pointerHeight: 15,
            pointerCurve: true,
            depthFadeNear: 5,
            depthFadeFar: 20,
        },
    };
})();

/** Each block's background with nothing set: label and caption transparent, tooltip white. */
const BACKGROUND_OPACITY: Record<TextKind, number> = { label: 0, tooltip: 100, caption: 0 };

const NUMBER_FORMATS = ["As is", "1,234", "1.2k", "2 decimals", "Percent"];

/**
 * The fit a label text field checks a value against.
 */
function textFit(layer: MockLayer): Fit {
    return { label: "Label text", on: layer.rule.matches === "edge" ? "edge" : "node", scheme: "table", ramp: "steps" };
}

/**
 * One label entry: settings, source, eye, minus; then size and position. A preview entry is drawn
 * greyed and inert: a second label graphty-element cannot draw today.
 */
function LabelEntryRow({
    layer,
    entry,
    onEntry,
    onRemove,
    tooltip,
}: {
    readonly layer: MockLayer;
    readonly entry: LabelEntry;
    readonly onEntry: (entry: LabelEntry) => void;
    readonly onRemove: () => void;
    readonly tooltip?: boolean;
}): React.JSX.Element {
    const [pickerOpen, setPickerOpen] = useState(false);
    const onEdges = layer.rule.matches === "edge";
    const endPosition = END_POSITIONS.includes(entry.position);
    let kind: TextKind = endPosition ? "caption" : "label";
    if (tooltip === true) {
        kind = "tooltip";
    }
    const what = { label: "label", tooltip: "tooltip", caption: "caption" }[kind];
    const hasArrow = layer.ends.some(
        (e) => (entry.position === "At target end" ? e.end === "Head" : e.end === "Tail") && e.kind !== "None",
    );
    const sourceId = entry.source.kind === "value" ? entry.source.value : undefined;
    const source = VALUES.find((v) => v.id === sourceId);
    const isNumber = source?.level === "number";
    const positions = onEdges || endPosition ? EDGE_POSITIONS : NODE_POSITIONS.map(([, word]) => word);
    const positionWord =
        onEdges || endPosition ? entry.position : (NODE_POSITIONS.find(([v]) => v === entry.position)?.[1] ?? "Above");
    const row = (
        <Box className="spm-row" style={{ opacity: entry.hidden || entry.preview === true ? 0.5 : 1 }}>
            {tooltip === true && <RowCaption text="Tooltip" />}
            {endPosition && (
                <RowCaption text={entry.position === "At target end" ? "Caption, target end" : "Caption, source end"} />
            )}
            {entry.preview === true && (
                <RowCaption text="Second label">
                    <Gap gap="slots" label="Second label" />
                </RowCaption>
            )}
            <Box style={rowStyle}>
                <LabelSettings entry={entry} onEntry={onEntry} kind={kind} onNode={!onEdges && !endPosition} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                    {entry.source.kind === "value" ? (
                        <Popout opened={pickerOpen} onOpenChange={setPickerOpen}>
                            <Popout.Trigger>
                                <span style={{ display: "inline-flex", maxWidth: "100%" }}>
                                    <VariablePill
                                        name={valueLabel(entry.source.value)}
                                        value={`${what} text from ${valueLabel(entry.source.value)}`}
                                        kind="property"
                                        width={124}
                                        glyph={<Type size={10} />}
                                    />
                                </span>
                            </Popout.Trigger>
                            <Popout.Panel
                                width={PANEL_GRID.POPOVER_WIDTH}
                                header={{ variant: "title", title: `${what[0].toUpperCase()}${what.slice(1)} text` }}
                                placement="left"
                            >
                                <Popout.Content>
                                    <Box style={POPOVER_BODY}>
                                        <ValuePickerList
                                            allowWords
                                            current={entry.source.value}
                                            reasonFor={(v) =>
                                                v.on !== "both" &&
                                                layer.rule.matches !== "both" &&
                                                v.on !== textFit(layer).on
                                                    ? `${v.name} is measured on ${v.on}s`
                                                    : null
                                            }
                                            onPick={(valueId) => {
                                                setPickerOpen(false);
                                                onEntry({
                                                    ...entry,
                                                    source:
                                                        valueId === null
                                                            ? { kind: "text", text: "" }
                                                            : { kind: "value", value: valueId },
                                                });
                                            }}
                                        />
                                        <ControlGroup label="How it reads">
                                            <Box style={{ padding: "0 8px 8px 16px" }}>
                                                {isNumber && (
                                                    <Group gap={4} wrap="nowrap" align="flex-end">
                                                        <Box style={{ flex: 1 }}>
                                                            <StyleSelect
                                                                label="Number format"
                                                                value={unlessDefault(entry.format, "As is")}
                                                                defaultValue="As is"
                                                                options={NUMBER_FORMATS.map((f) => ({
                                                                    value: f,
                                                                    label: f,
                                                                }))}
                                                                onChange={(f) => {
                                                                    onEntry({ ...entry, format: f });
                                                                }}
                                                            />
                                                        </Box>
                                                        <Gap gap="format" label="Number format" />
                                                    </Group>
                                                )}
                                                <SegmentedControl
                                                    size="xs"
                                                    fullWidth
                                                    aria-label="When the value is missing"
                                                    data={["Show nothing", "Show text"]}
                                                    value={
                                                        entry.missingText === undefined ? "Show nothing" : "Show text"
                                                    }
                                                    onChange={(v) => {
                                                        onEntry({
                                                            ...entry,
                                                            missingText: v === "Show text" ? "" : undefined,
                                                        });
                                                    }}
                                                />
                                                {entry.missingText !== undefined && (
                                                    <TextInput
                                                        size="xs"
                                                        aria-label="Text shown when the value is missing"
                                                        placeholder="No value"
                                                        value={entry.missingText}
                                                        onChange={(event) => {
                                                            onEntry({
                                                                ...entry,
                                                                missingText: event.currentTarget.value,
                                                            });
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        </ControlGroup>
                                    </Box>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    ) : (
                        <TextInput
                            size="xs"
                            aria-label={`${what} words`}
                            placeholder="Type the words"
                            value={entry.source.text}
                            onChange={(event) => {
                                onEntry({ ...entry, source: { kind: "text", text: event.currentTarget.value } });
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "=") {
                                    event.preventDefault();
                                    onEntry({ ...entry, source: { kind: "value", value: "name" } });
                                }
                            }}
                        />
                    )}
                </Box>
                <Eye
                    hidden={entry.hidden}
                    target={`${what} on ${layer.name}`}
                    onToggle={(hidden) => {
                        onEntry({ ...entry, hidden });
                    }}
                />
                <Minus target={`${what} from ${layer.name}`} onRemove={onRemove} />
            </Box>
            <Box style={{ ...rowStyle, paddingBottom: 4 }}>
                <Box style={{ flex: "0 0 72px" }}>
                    <PanelField
                        label={`${what} size, label px`}
                        kind="number"
                        width="fill"
                        glyph="sizeLargest"
                        unit="px"
                        value={entry.size ?? null}
                        placeholder="48"
                        onChange={(v) => {
                            onEntry({ ...entry, size: v === "" ? undefined : Number(v) });
                        }}
                    />
                </Box>
                <VaryGlyph reason={LOOK_VARY_REASON} label={`${what} size`} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                    <PanelField
                        label={`${what} position`}
                        kind="select"
                        width="fill"
                        data={positions}
                        value={positionWord}
                        onChange={(v) => {
                            const word = String(v);
                            const location =
                                onEdges || endPosition
                                    ? word
                                    : (NODE_POSITIONS.find(([, w]) => w === word)?.[0] ?? "top");
                            onEntry({ ...entry, position: location });
                        }}
                    />
                </Box>
            </Box>
            {endPosition && !hasArrow && <Note text="Needs an arrow at this end: add one in Ends" />}
            {isNumber && entry.format === undefined && <Note text="Numbers draw as they are" />}
            {entry.preview === true && <Note text="A second label on the same nodes: not drawable today" />}
        </Box>
    );
    if (entry.preview === true) {
        return (
            <fieldset disabled style={fieldsetStyle} aria-label="Second label, not drawable today">
                {row}
            </fieldset>
        );
    }
    return row;
}

/**
 * The label settings popover: colors, then captioned groups. Every field shows graphty-element's
 * own default while it is empty, and a switch shows its fields only while it is on.
 */
function LabelSettings({
    entry,
    onEntry,
    kind,
    onNode,
}: {
    readonly entry: LabelEntry;
    readonly onEntry: (entry: LabelEntry) => void;
    readonly kind: TextKind;
    readonly onNode: boolean;
}): React.JSX.Element {
    const defaults = LOOK_DEFAULTS[kind];
    const { look } = entry;
    const set = (key: string, value: LookValue | undefined): void => {
        const next = Object.fromEntries(Object.entries(look).filter(([k]) => k !== key));
        onEntry({ ...entry, look: value === undefined ? next : { ...next, [key]: value } });
    };
    const on = (key: string): boolean => look[key] === true;
    const num = (
        key: string,
        label: string,
        extra: { suffix?: string; step?: number; min?: number; max?: number } = {},
    ): React.JSX.Element => (
        <StyleNumberInput
            key={key}
            label={label}
            value={typeof look[key] === "number" ? look[key] : undefined}
            defaultValue={Number(defaults[key])}
            suffix={extra.suffix}
            step={extra.step}
            min={extra.min ?? 0}
            max={extra.max}
            onChange={(v) => {
                set(key, v);
            }}
        />
    );
    const sel = (key: string, label: string, options: readonly string[]): React.JSX.Element => (
        <StyleSelect
            key={key}
            label={label}
            value={unlessDefault(typeof look[key] === "string" ? look[key] : undefined, String(defaults[key]))}
            defaultValue={String(defaults[key])}
            options={options.map((o) => ({ value: o, label: o }))}
            onChange={(v) => {
                set(key, v);
            }}
        />
    );
    const col = (key: string, label: string, opacity?: number): React.JSX.Element => (
        <CompactColorInput
            key={key}
            label={label}
            color={typeof look[key] === "string" ? HEX(look[key]) : undefined}
            defaultColor={HEX(String(defaults[key]))}
            defaultOpacity={opacity}
            showOpacity={opacity !== undefined}
            onColorChange={(c) => {
                set(key, strip(c));
            }}
        />
    );
    const sw = (key: string, label: string, trailing?: React.ReactNode): React.JSX.Element => (
        <ToggleRow
            key={key}
            label={label}
            control="switch"
            checked={on(key)}
            trailing={trailing}
            onChange={(checked) => {
                set(key, checked ? true : undefined);
            }}
        />
    );
    const changed = Object.keys(look).length > 0;
    const badge = typeof look.badge === "string" ? look.badge : "None";
    const animation = typeof look.animation === "string" ? look.animation : "None";
    const title = { label: "Label settings", tooltip: "Tooltip settings", caption: "Caption settings" }[kind];
    return (
        <Popout>
            <Popout.Trigger>
                <AdvancedButton label={title} changed={changed} />
            </Popout.Trigger>
            <Popout.Panel width={PANEL_GRID.POPOVER_WIDTH} header={{ variant: "title", title }} placement="left">
                <Popout.Content>
                    <Box style={POPOVER_BODY}>
                        <Box style={{ padding: "4px 8px 4px 16px" }}>
                            <Group gap={4} wrap="nowrap" align="flex-end">
                                <Box style={{ flex: 1 }}>{col("color", "Text color")}</Box>
                                <VaryGlyph reason={LOOK_VARY_REASON} label="text color" />
                            </Group>
                            <Group gap={4} wrap="nowrap" align="flex-end">
                                <Box style={{ flex: 1 }}>
                                    {col("background", "Background", BACKGROUND_OPACITY[kind])}
                                </Box>
                                <VaryGlyph reason={LOOK_VARY_REASON} label="background" />
                            </Group>
                            <Gap gap="looks" label="Label looks" />
                        </Box>
                        <ControlSubGroup label="Type" defaultOpened={false}>
                            {sel("font", "Font", ["Verdana", "Inter", "Roboto", "System UI", "Georgia"])}
                            {sel("weight", "Weight", ["Normal", "Medium", "Semibold", "Bold"])}
                            {num("lineHeight", "Line height", { step: 0.1 })}
                            {sel("textAlign", "Alignment", ["Left", "Center", "Right"])}
                        </ControlSubGroup>
                        <ControlSubGroup label="Box" defaultOpened={false}>
                            {num("padding", "Padding", { suffix: " px" })}
                            {num("cornerRadius", "Corners", { suffix: " px" })}
                            {num("marginTop", "Margin, top", { suffix: " px" })}
                            {num("marginBottom", "Margin, bottom", { suffix: " px" })}
                            {num("marginLeft", "Margin, left", { suffix: " px" })}
                            {num("marginRight", "Margin, right", { suffix: " px" })}
                            {sw("border", "Border")}
                            {on("border") && (
                                <>
                                    {num("borderWidth", "Border width", { suffix: " px", min: 1 })}
                                    {col("borderColor", "Border color")}
                                </>
                            )}
                            {sw("gradient", "Gradient")}
                            {on("gradient") && (
                                <>
                                    {sel("gradientType", "Gradient type", ["Linear", "Radial"])}
                                    {col("gradientFrom", "First color", 80)}
                                    {col("gradientTo", "Last color", 80)}
                                    {look.gradientType !== "Radial" &&
                                        sel("gradientDirection", "Direction", ["Vertical", "Horizontal", "Diagonal"])}
                                </>
                            )}
                        </ControlSubGroup>
                        <ControlSubGroup label="Letters" defaultOpened={false}>
                            {sw("outline", "Outline")}
                            {on("outline") && (
                                <>
                                    {col("outlineColor", "Outline color")}
                                    {num("outlineWidth", "Outline width", { suffix: " px" })}
                                </>
                            )}
                            {sw("shadow", "Shadow")}
                            {on("shadow") && (
                                <>
                                    {col("shadowColor", "Shadow color")}
                                    {num("shadowBlur", "Shadow blur", { suffix: " px" })}
                                    {num("shadowOffsetX", "Shadow offset, across", { suffix: " px", min: -100 })}
                                    {num("shadowOffsetY", "Shadow offset, down", { suffix: " px", min: -100 })}
                                </>
                            )}
                        </ControlSubGroup>
                        <ControlSubGroup label="Placement" defaultOpened={false}>
                            {onNode && (
                                <Box style={{ padding: "4px 0" }}>
                                    <AlignmentMatrix
                                        label={`${kind === "tooltip" ? "Tooltip" : "Label"} position`}
                                        value={LOCATION_CELL[entry.position]}
                                        onChange={(cell) => {
                                            const location = Object.entries(LOCATION_CELL).find(
                                                ([, c]) => c === cell,
                                            )?.[0];
                                            if (location !== undefined) {
                                                onEntry({ ...entry, position: location });
                                            }
                                        }}
                                    />
                                </Box>
                            )}
                            {num("attachOffset", "Offset, world units", { step: 0.1 })}
                            <Group gap={4} wrap="nowrap" align="flex-end">
                                <Box style={{ flex: 1 }}>{num("priority", "Priority when crowded")}</Box>
                                <Gap gap="priority" label="Label priority" />
                            </Group>
                            {sw("pointer", "Pointer")}
                            {on("pointer") && (
                                <>
                                    {sel("pointerDirection", "Pointer side", [
                                        "Auto",
                                        "Top",
                                        "Bottom",
                                        "Left",
                                        "Right",
                                    ])}
                                    {num("pointerWidth", "Pointer width", { suffix: " px" })}
                                    {num("pointerHeight", "Pointer height", { suffix: " px" })}
                                    {num("pointerOffset", "Pointer offset", { suffix: " px", min: -100 })}
                                    {sw("pointerCurve", "Curved pointer")}
                                </>
                            )}
                            {kind !== "tooltip" &&
                                sw("onTop", "Draw on top of the graph", <Gap gap="branch" label="Draw on top" />)}
                            {onNode &&
                                sw(
                                    "pickable",
                                    "Clicking the label picks the node",
                                    <Gap gap="branch" label="Clickable label" />,
                                )}
                        </ControlSubGroup>
                        <ControlSubGroup label="Motion and distance" defaultOpened={false}>
                            {sel("animation", "Animation", ["None", "Pulse", "Bounce", "Shake", "Glow", "Fill"])}
                            {animation !== "None" && num("animationSpeed", "Animation speed", { step: 0.25 })}
                            {animation !== "None" && (
                                <Text size="xs" c={PANEL_INK.CHROME} style={{ padding: "0 0 4px" }}>
                                    Runs on node labels only, once the layout is at rest.
                                </Text>
                            )}
                            {sw("depthFade", "Fade with distance")}
                            {on("depthFade") && (
                                <>
                                    {num("depthFadeNear", "Fade starts at, world units")}
                                    {num("depthFadeFar", "Gone at, world units")}
                                </>
                            )}
                        </ControlSubGroup>
                        <ControlSubGroup label="Badge" defaultOpened={false}>
                            {sel("badge", "Preset", [
                                "None",
                                "Notification",
                                "Count",
                                "Label",
                                "Label success",
                                "Label warning",
                                "Label danger",
                                "Icon",
                                "Progress",
                                "Dot",
                            ])}
                            {badge === "Icon" && (
                                <>
                                    <TextInput
                                        size="xs"
                                        label="Icon"
                                        placeholder="A character or emoji name"
                                        value={typeof look.icon === "string" ? look.icon : ""}
                                        onChange={(event) => {
                                            set(
                                                "icon",
                                                event.currentTarget.value === ""
                                                    ? undefined
                                                    : event.currentTarget.value,
                                            );
                                        }}
                                    />
                                    {sel("iconPosition", "Icon side", ["Left", "Right"])}
                                </>
                            )}
                            {badge === "Progress" && num("progress", "Progress, 0 to 1", { step: 0.1, max: 1 })}
                            {sw("smartOverflow", "Shorten large numbers")}
                            {on("smartOverflow") && (
                                <>
                                    {num("maxNumber", "Largest number in full")}
                                    <TextInput
                                        size="xs"
                                        label="Suffix after a shortened number"
                                        placeholder="+"
                                        value={typeof look.overflowSuffix === "string" ? look.overflowSuffix : ""}
                                        onChange={(event) => {
                                            set(
                                                "overflowSuffix",
                                                event.currentTarget.value === ""
                                                    ? undefined
                                                    : event.currentTarget.value,
                                            );
                                        }}
                                    />
                                </>
                            )}
                            <Text size="xs" c={PANEL_INK.CHROME} style={{ padding: "4px 0" }}>
                                A badge restyles this label: a node cannot show a badge and a name at once today.
                            </Text>
                        </ControlSubGroup>
                    </Box>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Effects and ends                                                                            */
/* ------------------------------------------------------------------------------------------ */

/** What each effect field can be driven by. */
const EFFECT_FITS: Record<EffectField, Fit> = {
    color: { label: "Effect color", on: "node", scheme: "palette", ramp: "steps" },
    strength: { label: "Glow strength", on: "node", scheme: "table", ramp: "steps" },
    scale: { label: "Halo size", on: "node", scheme: "table", ramp: "steps" },
    opacity: { label: "Halo opacity", on: "node", scheme: "table", ramp: "steps" },
    speed: { label: "Motion speed", on: "edge", scheme: "table", ramp: "steps" },
};

/** What each arrow-end field can be driven by. */
const END_FITS: Record<EndField, Fit> = {
    kind: { label: "Arrow kind", on: "edge", scheme: "list", ramp: "none", capacity: 14 },
    size: { label: "Arrow size", on: "edge", scheme: "table", ramp: "steps" },
    color: { label: "Arrow color", on: "edge", scheme: "palette", ramp: "steps" },
    opacity: { label: "Arrow opacity", on: "edge", scheme: "table", ramp: "steps" },
};

/** Each effect type's color when it is added: graphty-element's fallbacks, the halo's own. */
const EFFECT_COLORS: Record<Exclude<EffectType, "Motion">, string> = {
    Outline: "FFFF00",
    Glow: "FFFFFF",
    Halo: "FFD700",
};

/**
 * A new effect of a type, at graphty-element's defaults.
 * @param type - The effect type.
 * @returns The entry.
 */
function newEffect(type: EffectType): EffectEntry {
    const base = { id: newId("effect"), type, combine: "Replace", bound: {}, hidden: false } as const;
    if (type === "Motion") {
        return { ...base, speed: 1 };
    }
    if (type === "Halo") {
        return { ...base, color: EFFECT_COLORS.Halo, scale: 1.45, opacity: 40 };
    }
    return { ...base, color: EFFECT_COLORS[type], strength: 1 };
}

/**
 * One effect entry: settings, its color (speed for Motion), eye, minus. Outline, glow and halo can
 * append a ring beside the layers beneath instead of replacing theirs.
 */
function EffectRow({
    layer,
    entry,
    onEntry,
    onRemove,
}: {
    readonly layer: MockLayer;
    readonly entry: EffectEntry;
    readonly onEntry: (entry: EffectEntry) => void;
    readonly onRemove: () => void;
}): React.JSX.Element {
    const bind = (field: EffectField) => (valueId: string | undefined) => {
        onEntry({ ...entry, bound: { ...entry.bound, [field]: valueId } });
    };
    const settings =
        entry.type === "Glow" || entry.type === "Halo" ? (
            <Popout>
                <Popout.Trigger>
                    <AdvancedButton
                        label={`${entry.type} settings`}
                        changed={
                            entry.type === "Glow"
                                ? (entry.strength ?? 1) !== 1
                                : (entry.scale ?? 1.45) !== 1.45 || (entry.opacity ?? 40) !== 40
                        }
                    />
                </Popout.Trigger>
                <Popout.Panel
                    width={PANEL_GRID.POPOVER_WIDTH}
                    header={{ variant: "title", title: entry.type }}
                    placement="left"
                >
                    <Popout.Content>
                        <Box style={{ padding: "4px 8px 8px 16px" }}>
                            {entry.type === "Glow" ? (
                                <VaryField
                                    label="glow strength"
                                    fit={EFFECT_FITS.strength}
                                    bound={entry.bound.strength}
                                    onBind={bind("strength")}
                                >
                                    <StyleNumberInput
                                        label="Strength"
                                        value={entry.strength === 1 ? undefined : entry.strength}
                                        defaultValue={1}
                                        step={0.25}
                                        min={0}
                                        onChange={(strength) => {
                                            onEntry({ ...entry, strength });
                                        }}
                                    />
                                </VaryField>
                            ) : (
                                <>
                                    <VaryField
                                        label="halo size"
                                        fit={EFFECT_FITS.scale}
                                        bound={entry.bound.scale}
                                        onBind={bind("scale")}
                                    >
                                        <StyleNumberInput
                                            label="Size, times the node"
                                            value={entry.scale === 1.45 ? undefined : entry.scale}
                                            defaultValue={1.45}
                                            step={0.05}
                                            min={0}
                                            onChange={(scale) => {
                                                onEntry({ ...entry, scale });
                                            }}
                                        />
                                    </VaryField>
                                    <VaryField
                                        label="halo opacity"
                                        fit={EFFECT_FITS.opacity}
                                        bound={entry.bound.opacity}
                                        onBind={bind("opacity")}
                                    >
                                        <StyleNumberInput
                                            label="Opacity"
                                            suffix="%"
                                            value={entry.opacity === 40 ? undefined : entry.opacity}
                                            defaultValue={40}
                                            min={0}
                                            max={100}
                                            onChange={(opacity) => {
                                                onEntry({ ...entry, opacity });
                                            }}
                                        />
                                    </VaryField>
                                </>
                            )}
                        </Box>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        ) : (
            <SlotSpacer />
        );
    return (
        <ContextMenu
            target={
                <Box className="spm-row" style={{ opacity: entry.hidden ? 0.6 : 1 }}>
                    <RowCaption text={entry.type}>
                        {entry.combine === "Append" && (
                            <Text size="xs" c={PANEL_INK.CHROME}>
                                appended
                            </Text>
                        )}
                        {entry.combine === "Append" && <Gap gap="append" label="Append" />}
                        {entry.type === "Halo" && <Gap gap="halo" label="Halo" />}
                    </RowCaption>
                    <Box style={rowStyle}>
                        {settings}
                        {entry.type === "Motion" ? (
                            <VaryField
                                label="motion speed"
                                fit={EFFECT_FITS.speed}
                                bound={entry.bound.speed}
                                onBind={bind("speed")}
                            >
                                <PanelField
                                    label="Motion speed"
                                    kind="number"
                                    width="fill"
                                    unit="x"
                                    value={entry.speed ?? 1}
                                    onChange={(v) => {
                                        onEntry({ ...entry, speed: Number(v) });
                                    }}
                                />
                            </VaryField>
                        ) : (
                            <VaryField
                                label={`${entry.type.toLowerCase()} color`}
                                fit={{ ...EFFECT_FITS.color, label: `${entry.type} color` }}
                                bound={entry.bound.color}
                                onBind={bind("color")}
                            >
                                <CompactColorInput
                                    color={entry.color === undefined ? undefined : HEX(entry.color)}
                                    defaultColor={HEX(EFFECT_COLORS[entry.type])}
                                    showOpacity={false}
                                    showReset={false}
                                    width="100%"
                                    onColorChange={(c) => {
                                        onEntry({ ...entry, color: strip(c) });
                                    }}
                                />
                            </VaryField>
                        )}
                        <Eye
                            hidden={entry.hidden}
                            target={`${entry.type.toLowerCase()} on ${layer.name}`}
                            onToggle={(hidden) => {
                                onEntry({ ...entry, hidden });
                            }}
                        />
                        <Minus target={`${entry.type.toLowerCase()} from ${layer.name}`} onRemove={onRemove} />
                    </Box>
                    {entry.type === "Motion" && <Note text={MOTION_NOTE} />}
                </Box>
            }
        >
            {entry.type !== "Motion" && (
                <Menu.Sub>
                    <Menu.Sub.Target>
                        <Menu.Sub.Item>Combine</Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                        {(["Replace", "Append"] as const).map((c) => (
                            <MenuCheckItem
                                key={c}
                                radio
                                checked={entry.combine === c}
                                onClick={() => {
                                    onEntry({ ...entry, combine: c });
                                }}
                            >
                                {c === "Append" ? "Append: a ring beside theirs" : "Replace"}
                            </MenuCheckItem>
                        ))}
                    </Menu.Sub.Dropdown>
                </Menu.Sub>
            )}
            <Menu.Divider />
            <Menu.Item onClick={onRemove}>Remove</Menu.Item>
        </ContextMenu>
    );
}

/**
 * One arrow end: settings (size, color, opacity, caption), kind, eye, minus. Each field can vary
 * by a value; the caption is a label entry in Text, at this end.
 */
function EndRow({
    layer,
    entry,
    onEntry,
    onRemove,
    onCaption,
}: {
    readonly layer: MockLayer;
    readonly entry: EndEntry;
    readonly onEntry: (entry: EndEntry) => void;
    readonly onRemove: () => void;
    /** Adds a caption at this end to the Text section, or undefined when it has one. */
    readonly onCaption: (() => void) | undefined;
}): React.JSX.Element {
    const hasCap = entry.kind !== "None" || entry.bound.kind !== undefined;
    const bind = (field: EndField) => (valueId: string | undefined) => {
        onEntry({ ...entry, bound: { ...entry.bound, [field]: valueId } });
    };
    const lower = entry.end.toLowerCase();
    return (
        <Box className="spm-row" style={{ opacity: entry.hidden ? 0.6 : 1 }}>
            <RowCaption text={entry.end === "Head" ? "Head (target end)" : "Tail (source end)"} />
            <Box style={rowStyle}>
                {hasCap ? (
                    <Popout>
                        <Popout.Trigger>
                            <AdvancedButton
                                label={`${entry.end} settings`}
                                changed={
                                    entry.color !== undefined || entry.size !== undefined || entry.opacity !== undefined
                                }
                            />
                        </Popout.Trigger>
                        <Popout.Panel
                            width={PANEL_GRID.POPOVER_WIDTH}
                            header={{
                                variant: "title",
                                title: `${entry.end} (${entry.end === "Head" ? "target" : "source"} end)`,
                            }}
                            placement="left"
                        >
                            <Popout.Content>
                                <Box style={{ padding: "4px 8px 8px 16px" }}>
                                    <VaryField
                                        label={`${lower} size`}
                                        fit={END_FITS.size}
                                        bound={entry.bound.size}
                                        onBind={bind("size")}
                                    >
                                        <StyleNumberInput
                                            label="Size"
                                            value={entry.size}
                                            defaultValue={1}
                                            step={0.25}
                                            onChange={(size) => {
                                                onEntry({ ...entry, size });
                                            }}
                                        />
                                    </VaryField>
                                    <VaryField
                                        label={`${lower} color`}
                                        fit={END_FITS.color}
                                        bound={entry.bound.color}
                                        onBind={bind("color")}
                                    >
                                        {entry.color === undefined ? (
                                            <Group justify="space-between" wrap="nowrap" style={{ minHeight: 32 }}>
                                                <Text size="xs" c={PANEL_INK.CHROME}>
                                                    Color: Line color
                                                </Text>
                                                <Button
                                                    size="compact-xs"
                                                    variant="subtle"
                                                    onClick={() => {
                                                        onEntry({ ...entry, color: "D55E00" });
                                                    }}
                                                >
                                                    Choose
                                                </Button>
                                            </Group>
                                        ) : (
                                            <Group gap={4} wrap="nowrap" align="flex-end">
                                                <Box style={{ flex: 1 }}>
                                                    <CompactColorInput
                                                        label="Color"
                                                        color={HEX(entry.color)}
                                                        defaultColor="#A9A9A9"
                                                        showOpacity={false}
                                                        onColorChange={(c) => {
                                                            onEntry({ ...entry, color: strip(c) });
                                                        }}
                                                    />
                                                </Box>
                                                <Minus
                                                    target="arrow color"
                                                    onRemove={() => {
                                                        onEntry({ ...entry, color: undefined });
                                                    }}
                                                />
                                            </Group>
                                        )}
                                    </VaryField>
                                    <VaryField
                                        label={`${lower} opacity`}
                                        fit={END_FITS.opacity}
                                        bound={entry.bound.opacity}
                                        onBind={bind("opacity")}
                                    >
                                        <StyleNumberInput
                                            label="Opacity"
                                            suffix="%"
                                            value={entry.opacity}
                                            defaultValue={100}
                                            min={0}
                                            max={100}
                                            onChange={(opacity) => {
                                                onEntry({ ...entry, opacity });
                                            }}
                                        />
                                    </VaryField>
                                    <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingTop: 8 }}>
                                        {onCaption === undefined
                                            ? "Caption: in Text, at this end. "
                                            : "Caption: none. "}
                                        {onCaption !== undefined && (
                                            <Anchor component="button" type="button" size="xs" onClick={onCaption}>
                                                Add one in Text
                                            </Anchor>
                                        )}
                                    </Text>
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                ) : (
                    <SlotSpacer />
                )}
                <VaryField label={`${lower} kind`} fit={END_FITS.kind} bound={entry.bound.kind} onBind={bind("kind")}>
                    <PanelField
                        label={`${entry.end} kind`}
                        kind="select"
                        width="fill"
                        data={[...ARROW_KINDS]}
                        value={entry.kind}
                        onChange={(v) => {
                            onEntry({ ...entry, kind: String(v) });
                        }}
                    />
                </VaryField>
                <Eye
                    hidden={entry.hidden}
                    target={`${lower} on ${layer.name}`}
                    onToggle={(hidden) => {
                        onEntry({ ...entry, hidden });
                    }}
                />
                <Minus target={`${lower} from ${layer.name}`} onRemove={onRemove} />
            </Box>
            {hasCap && entry.color === undefined && entry.bound.color === undefined && (
                <Box style={{ paddingInlineStart: PANEL_GRID.PAD_LEFT + PANEL_GRID.TRAIL + ROW_GAP }}>
                    <Text size="xs" c={PANEL_INK.CHROME}>
                        Color: Line color
                    </Text>
                </Box>
            )}
        </Box>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Sections                                                                                    */
/* ------------------------------------------------------------------------------------------ */

interface AddItem {
    readonly label: string;
    readonly onClick?: () => void;
    readonly reason?: string;
}

/**
 * A section's "+" and the dark menu it opens. An empty section's title opens the same menu.
 */
function SectionAdd({
    section,
    items,
    opened,
    setOpened,
    hidden,
}: {
    readonly section: string;
    readonly items: readonly AddItem[];
    readonly opened: boolean;
    readonly setOpened: (opened: boolean) => void;
    readonly hidden: boolean;
}): React.JSX.Element {
    const allBlocked = items.length > 0 && items.every((i) => i.onClick === undefined);
    return (
        <Menu opened={opened} onChange={setOpened} position="bottom-end" withinPortal>
            <Menu.Target>
                {hidden ? (
                    <Box
                        component="span"
                        aria-hidden="true"
                        style={{ display: "inline-block", width: 1, height: 16 }}
                    />
                ) : (
                    <ActionIcon
                        variant="subtle"
                        size={PANEL_GRID.CONTROL_HEIGHT}
                        c={allBlocked ? PANEL_INK.DISABLED : PANEL_INK.CHROME}
                        aria-label={`Add to ${section}`}
                        title={allBlocked ? items[0].reason : `Add to ${section}`}
                        aria-disabled={allBlocked || undefined}
                        style={allBlocked ? { background: "transparent", cursor: "not-allowed" } : undefined}
                        onClick={(event: React.MouseEvent) => {
                            if (allBlocked) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }}
                    >
                        <UiGlyph name="plus" size={PANEL_GRID.GLYPH} />
                    </ActionIcon>
                )}
            </Menu.Target>
            <Menu.Dropdown>
                {items.map((item) => (
                    <Menu.Item
                        key={item.label}
                        disabled={item.onClick === undefined}
                        title={item.reason}
                        onClick={item.onClick}
                    >
                        {item.label}
                        {item.reason !== undefined && (
                            <Text size="xs" c={PANEL_INK.ON_MENU_SECONDARY}>
                                {item.reason}
                            </Text>
                        )}
                    </Menu.Item>
                ))}
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * Whether a layer's pattern write is one a pattern count can spread.
 */
function countedPattern(layer: MockLayer): boolean {
    const w = layer.props.pattern;
    return w?.mode === "derived" || (w?.mode === "fixed" && COUNTED_PATTERNS.includes(String(w.value)));
}

/**
 * The Text section's rows and "+" items: label entries, end captions, the tooltip.
 */
function textSection(
    layer: MockLayer,
    patch: (fn: (l: MockLayer) => MockLayer) => void,
    target: "node" | "edge",
): { rows: React.ReactNode[]; items: AddItem[] } {
    const mine = layer.labels.filter((e) => isEdgeText(e) === (target === "edge"));
    const rows: React.ReactNode[] = mine.map((entry) => (
        <LabelEntryRow
            key={entry.id}
            layer={layer}
            entry={entry}
            onEntry={(next) => {
                patch((l) => ({ ...l, labels: l.labels.map((e) => (e.id === next.id ? next : e)) }));
            }}
            onRemove={() => {
                patch((l) => ({ ...l, labels: l.labels.filter((e) => e.id !== entry.id) }));
            }}
        />
    ));
    if (target === "node" && layer.tooltip !== undefined) {
        const tip = layer.tooltip;
        rows.push(
            <LabelEntryRow
                key={tip.id}
                layer={layer}
                entry={tip}
                tooltip
                onEntry={(next) => {
                    patch((l) => ({ ...l, tooltip: next }));
                }}
                onRemove={() => {
                    patch((l) => ({ ...l, tooltip: undefined }));
                }}
            />,
        );
    }
    const add = (position: string): void => {
        patch((l) => ({ ...l, labels: [...l.labels, labelEntry(newId("label"), "name", position)] }));
    };
    const items: AddItem[] = [];
    const mainLabels = mine.filter((e) => e.preview !== true && !END_POSITIONS.includes(e.position));
    items.push(
        mainLabels.length > 0
            ? { label: "Label", reason: ONE_LABEL_REASON }
            : {
                  label: "Label",
                  onClick: () => {
                      add(target === "edge" ? "On the line" : "top");
                  },
              },
    );
    if (target === "edge") {
        for (const position of END_POSITIONS) {
            const label = position === "At target end" ? "Caption at the target end" : "Caption at the source end";
            items.push(
                layer.labels.some((e) => e.position === position)
                    ? { label, reason: "One caption per end" }
                    : {
                          label,
                          onClick: () => {
                              add(position);
                          },
                      },
            );
        }
    }
    if (target === "edge" || layer.tooltip === undefined) {
        items.push(
            target === "edge"
                ? { label: "Tooltip", reason: "Edges cannot be hovered today, so they show no tooltip" }
                : {
                      label: "Tooltip",
                      onClick: () => {
                          patch((l) => ({ ...l, tooltip: labelEntry(newId("tooltip"), "name", "top-right") }));
                      },
                  },
        );
    }
    return { rows, items };
}

/**
 * One property section in the fixed order: written rows, or a dimmed title with "+".
 */
function Section({
    layer,
    section,
    draft,
}: {
    readonly layer: MockLayer;
    readonly section: SectionDef;
    readonly draft: boolean;
}): React.JSX.Element {
    const { update, layers, actions, showGaps } = useMock();
    const [menuOpen, setMenuOpen] = useState(false);
    const parent = layer.child === undefined ? undefined : layers[layer.child.parentId];
    const target = section.on;
    const reachable = section.props;
    const inheritedOf = (p: PropId): Write | undefined => {
        if (parent === undefined || layer.child === undefined) {
            return undefined;
        }
        const pw = parent.props[p];
        if (pw?.mode === "derived" && pw.binding === "categories" && p === "nodeColor") {
            return fixed(paletteOf(pw.palette).colors[(layer.child.group - 1) % paletteOf(pw.palette).colors.length]);
        }
        return pw;
    };
    const shown = reachable.filter(
        (p) => layer.props[p] !== undefined || layer.pending.includes(p) || inheritedOf(p) !== undefined,
    );

    const patch = (fn: (l: MockLayer) => MockLayer): void => {
        update(layer.id, (l) => ({ ...fn(l), draft: false }));
    };

    let rows: React.ReactNode[] = [];
    let items: AddItem[] = [];
    const notes: string[] = [];

    if (section.id === "text") {
        ({ rows, items } = textSection(layer, patch, target));
    } else if (section.id === "effects") {
        const types: readonly EffectType[] = target === "node" ? ["Outline", "Glow", "Halo"] : ["Motion"];
        rows = layer.effects
            .filter((e) => types.includes(e.type))
            .map((entry) => (
                <EffectRow
                    key={entry.id}
                    layer={layer}
                    entry={entry}
                    onEntry={(next) => {
                        patch((l) => ({ ...l, effects: l.effects.map((e) => (e.id === next.id ? next : e)) }));
                    }}
                    onRemove={() => {
                        patch((l) => ({ ...l, effects: l.effects.filter((e) => e.id !== entry.id) }));
                    }}
                />
            ));
        for (const type of types) {
            if (!layer.effects.some((e) => e.type === type)) {
                items.push({
                    label: type,
                    onClick: () => {
                        patch((l) => ({
                            ...l,
                            effects: [...l.effects, newEffect(type)],
                        }));
                    },
                });
            }
        }
    } else if (section.id === "ends") {
        rows = layer.ends.map((entry) => {
            const position = entry.end === "Head" ? "At target end" : "At source end";
            const hasCaption = layer.labels.some((e) => e.position === position);
            return (
                <EndRow
                    key={entry.id}
                    layer={layer}
                    entry={entry}
                    onEntry={(next) => {
                        patch((l) => ({ ...l, ends: l.ends.map((e) => (e.id === next.id ? next : e)) }));
                    }}
                    onRemove={() => {
                        patch((l) => ({ ...l, ends: l.ends.filter((e) => e.id !== entry.id) }));
                    }}
                    onCaption={
                        hasCaption
                            ? undefined
                            : () => {
                                  patch((l) => ({
                                      ...l,
                                      labels: [...l.labels, labelEntry(newId("label"), "name", position)],
                                  }));
                              }
                    }
                />
            );
        });
        for (const end of ["Head", "Tail"] as const) {
            if (!layer.ends.some((e) => e.end === end)) {
                items.push({
                    label: end === "Head" ? "Head (target end)" : "Tail (source end)",
                    onClick: () => {
                        patch((l) => ({
                            ...l,
                            ends: [...l.ends, { id: newId("end"), end, kind: "Normal", bound: {}, hidden: false }],
                        }));
                    },
                });
            }
        }
    } else {
        rows = shown.map((p) => (
            <PropRow
                key={p}
                ctx={{
                    layer,
                    prop: PROPS[p],
                    pending: layer.pending.includes(p),
                    inherited: layer.props[p] === undefined ? inheritedOf(p) : undefined,
                    showLabel: shown.length > 1 || PROPS[p].short !== section.title,
                }}
            />
        ));
        for (const p of reachable) {
            if (shown.includes(p)) {
                continue;
            }
            if (p === "patternCount" && !countedPattern(layer)) {
                items.push({
                    label: PROPS[p].short,
                    reason: "Set a repeating pattern first: dot, star, box, dash, diamond or dash-dot",
                });
                continue;
            }
            items.push({
                label: PROPS[p].short,
                onClick: () => {
                    // A switch is added to flip it, so it writes the other state at once; every
                    // other property is added as an empty field showing its default.
                    const def = PROPS[p];
                    if (def.control === "switch") {
                        update(layer.id, (l) => ({ ...l, props: { ...l.props, [p]: fixed(def.floor !== "on") } }));
                    } else {
                        update(layer.id, (l) => ({ ...l, pending: [...l.pending, p] }));
                    }
                },
            });
        }
        if (section.id === "fill") {
            items.push({ label: "Linear gradient", reason: GRADIENT_REASON });
            items.push({ label: "Radial gradient", reason: GRADIENT_REASON });
        }
        const { curved } = layer.props;
        const { pattern } = layer.props;
        if (
            section.id === "line" &&
            curved?.mode === "fixed" &&
            curved.value === true &&
            pattern !== undefined &&
            !(pattern.mode === "fixed" && pattern.value === "Solid")
        ) {
            notes.push("A curved edge draws solid: its pattern is not drawn");
        }
    }

    if (items.filter((i) => i.onClick !== undefined).length === 0 && rows.length > 0 && section.id !== "text") {
        items = [
            ...items,
            {
                label: "Add layer above, scoped like this one",
                onClick: () => {
                    actions.addAbove(layer.id, layer.rule);
                },
            },
        ];
    }

    const empty = rows.length === 0;
    const targetWord = target === "node" ? "Node" : "Edge";
    const info =
        section.id === "text" && rows.length > 0 ? <Text size="xs">Not drawable today. {GAPS.slots}</Text> : undefined;

    return (
        <ControlSection
            label={section.title}
            collapsible={false}
            empty={empty}
            onAdd={
                draft
                    ? undefined
                    : () => {
                          setMenuOpen(true);
                      }
            }
            info={showGaps ? info : undefined}
            actions={
                draft ? undefined : (
                    <SectionAdd
                        section={`${targetWord} ${section.title.toLowerCase()}`}
                        items={items}
                        opened={menuOpen}
                        setOpened={setMenuOpen}
                        hidden={empty}
                    />
                )
            }
        >
            {empty ? null : (
                <>
                    {rows}
                    {notes.map((n) => (
                        <Note key={n} text={n} />
                    ))}
                </>
            )}
        </ControlSection>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Which elements and Split by                                                                 */
/* ------------------------------------------------------------------------------------------ */

const COMPARISONS = ["is", "is not", "is more than", "is less than"];
const SETS = ["the route", "Community 3", "the selection"];
const SET_VALUES: Record<string, string> = { "the route": "onRoute", "the selection": "selected" };
const SET_COUNTS: Record<string, string> = { "the route": "5 nodes, 4 edges", "the selection": "2 nodes" };

/**
 * The rule a kind of rule makes, in words, with a mock count.
 */
function ruleFor(kind: RuleKind, value = "group", comparison = "is", operand = "3", n = 10, set = "the route"): Rule {
    const ref = VALUES.find((v) => v.id === value || v.name === value);
    const on: Target = ref?.on ?? "node";
    const noun = { edge: "Edges", node: "Nodes", both: "Elements" }[on];
    switch (kind) {
        case "everything":
            return { kind, words: "Every node and edge", count: "77 nodes, 254 edges", matches: "both" };
        case "everyNode":
            return { kind, words: "Every node", count: "77 nodes", matches: "node" };
        case "everyEdge":
            return { kind, words: "Every edge", count: "254 edges", matches: "edge" };
        case "where":
            return {
                kind,
                words: `${noun} where ${ref?.name ?? value} ${comparison} ${operand}`,
                count: on === "edge" ? "31 edges" : "12 nodes",
                matches: on,
                value: ref?.id ?? value,
                comparison,
                operand,
            };
        case "top":
            return {
                kind,
                words: `Top ${String(n)} nodes by ${ref?.name ?? value}`,
                count: `${String(n)} nodes`,
                matches: "node",
                value: ref?.id ?? value,
                operand: String(n),
            };
        case "named":
            return {
                kind,
                words: `Named nodes: ${operand}`,
                count: `${String(operand.split(",").filter((s) => s.trim() !== "").length)} nodes`,
                matches: "node",
                operand,
            };
        case "members":
            return {
                kind,
                words: `Members of ${set}`,
                count: SET_COUNTS[set] ?? "12 nodes",
                matches: set === "Community 3" ? "node" : "both",
                value: SET_VALUES[set] ?? "group",
                operand: set,
            };
        case "selected":
            return { kind, words: "Selected elements", count: "2 nodes", matches: "both" };
        default:
            return { kind: "hovered", words: "Hovered element", count: "None now", matches: "both" };
    }
}

/**
 * Which elements: the rule in words and its count; click to edit it in place. Opening the editor
 * focuses the kind of rule; Escape puts the rule back and returns focus to the words; Done keeps it.
 */
function WhichElements({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const { update, showGaps } = useMock();
    const draft = layer.rule.kind === "draft";
    const [editing, setEditing] = useState(draft);
    const [ands, setAnds] = useState(0);
    const { rule } = layer;
    const readOnly = layer.kind === "child";
    const before = useRef<Rule>(rule);
    const editorRef = useRef<HTMLDivElement>(null);
    const wordsRef = useRef<HTMLButtonElement>(null);
    const returnFocus = useRef(false);
    const setRule = (next: Rule): void => {
        update(layer.id, (l) => ({ ...l, rule: next }));
    };
    const kind = rule.kind === "draft" ? undefined : rule.kind;
    const gap = (rule.kind === "selected" || rule.kind === "hovered") && showGaps;

    useEffect(() => {
        if (editing) {
            // After the menu or button that opened the editor has finished moving focus.
            const timer = window.setTimeout(() => {
                editorRef.current?.querySelector<HTMLInputElement>("input")?.focus();
            }, 0);
            return () => {
                window.clearTimeout(timer);
            };
        }
        if (returnFocus.current) {
            returnFocus.current = false;
            wordsRef.current?.focus();
        }
        return undefined;
    }, [editing]);

    const close = (revert: boolean): void => {
        if (revert && !draft) {
            setRule(before.current);
            setAnds(0);
        }
        returnFocus.current = true;
        setEditing(false);
    };

    return (
        <ControlSection
            label="Which elements"
            collapsible={false}
            info={gap ? <Text size="xs">Not drawable today. {GAPS.facts}</Text> : undefined}
            actions={
                editing && !readOnly ? (
                    <ActionIcon
                        variant="subtle"
                        size={PANEL_GRID.CONTROL_HEIGHT}
                        c={PANEL_INK.CHROME}
                        aria-label="Add an and condition"
                        title="Add an and condition"
                        onClick={() => {
                            setAnds((n) => n + 1);
                        }}
                    >
                        <UiGlyph name="plus" size={PANEL_GRID.GLYPH} />
                    </ActionIcon>
                ) : undefined
            }
        >
            {editing && !readOnly ? (
                <Box
                    ref={editorRef}
                    style={{ padding: "0 8px 4px 16px" }}
                    onKeyDown={(event: React.KeyboardEvent) => {
                        const target = event.target as HTMLElement;
                        if (event.key === "Escape" && target.getAttribute("aria-expanded") !== "true" && !draft) {
                            event.preventDefault();
                            close(true);
                        }
                    }}
                >
                    <StyleSelect
                        label="Kind of rule"
                        value={kind}
                        defaultValue="Choose..."
                        options={[
                            { value: "Choose...", label: "Choose..." },
                            ...RULE_KINDS.map((k) => ({ value: k.value, label: k.label })),
                        ]}
                        onChange={(k) => {
                            if (k !== undefined && k !== "Choose...") {
                                setRule(ruleFor(k as RuleKind));
                            }
                        }}
                    />
                    {rule.kind === "where" && (
                        <>
                            <ComboInput
                                label="Value"
                                value={rule.value ?? "group"}
                                options={VALUES.map((v) => ({ value: v.id, label: valueLabel(v.id) }))}
                                onChange={(v) => {
                                    setRule(ruleFor("where", String(v), rule.comparison, rule.operand));
                                }}
                            />
                            <Group gap={8} wrap="nowrap" style={{ paddingTop: 4 }}>
                                <Box style={{ flex: 1 }}>
                                    <StyleSelect
                                        label="Comparison"
                                        value={unlessDefault(rule.comparison, "is")}
                                        defaultValue="is"
                                        options={COMPARISONS.map((c) => ({ value: c, label: c }))}
                                        onChange={(c) => {
                                            setRule(ruleFor("where", rule.value, c ?? "is", rule.operand));
                                        }}
                                    />
                                </Box>
                                <TextInput
                                    size="xs"
                                    label="Operand"
                                    w={72}
                                    value={rule.operand ?? ""}
                                    onChange={(event) => {
                                        setRule(
                                            ruleFor("where", rule.value, rule.comparison, event.currentTarget.value),
                                        );
                                    }}
                                />
                            </Group>
                        </>
                    )}
                    {rule.kind === "top" && (
                        <Group gap={8} wrap="nowrap" align="flex-end">
                            <Box style={{ width: 72 }}>
                                <StyleNumberInput
                                    label="How many"
                                    value={Number(rule.operand ?? 10)}
                                    defaultValue={10}
                                    min={1}
                                    onChange={(v) => {
                                        setRule(ruleFor("top", rule.value ?? "degree", "is", "", v ?? 10));
                                    }}
                                />
                            </Box>
                            <ComboInput
                                label="By"
                                value={rule.value ?? "degree"}
                                options={VALUES.filter((v) => v.level === "number").map((v) => ({
                                    value: v.id,
                                    label: valueLabel(v.id),
                                }))}
                                onChange={(v) => {
                                    setRule(ruleFor("top", String(v), "is", "", Number(rule.operand ?? 10)));
                                }}
                            />
                        </Group>
                    )}
                    {rule.kind === "named" && (
                        <TextInput
                            size="xs"
                            label="Names"
                            placeholder="Valjean, Javert"
                            value={rule.operand ?? ""}
                            onChange={(event) => {
                                setRule(ruleFor("named", "name", "is", event.currentTarget.value));
                            }}
                        />
                    )}
                    {rule.kind === "members" && (
                        <StyleSelect
                            label="Set"
                            value={unlessDefault(rule.operand, "the route")}
                            defaultValue="the route"
                            options={SETS.map((s) => ({ value: s, label: s }))}
                            onChange={(s) => {
                                setRule(ruleFor("members", "onRoute", "is", "", 10, s ?? "the route"));
                            }}
                        />
                    )}
                    {Array.from({ length: ands }, (_, i) => (
                        <Group key={i} gap={4} wrap="nowrap" style={{ paddingTop: 4 }}>
                            <Text size="xs" c={PANEL_INK.CHROME}>
                                and
                            </Text>
                            <ComboInput
                                label={`Condition ${String(i + 2)} value`}
                                defaultValue="degree"
                                options={VALUES.map((v) => ({ value: v.id, label: valueLabel(v.id) }))}
                            />
                            <Minus
                                target={`condition ${String(i + 2)}`}
                                onRemove={() => {
                                    setAnds((n) => n - 1);
                                }}
                            />
                        </Group>
                    ))}
                    <Group justify="space-between" style={{ paddingTop: 8 }}>
                        <Text size="xs" c={PANEL_INK.CHROME}>
                            {rule.count === "" ? "Choose a kind of rule" : rule.count}
                        </Text>
                        <Button
                            size="compact-xs"
                            variant="default"
                            disabled={rule.kind === "draft"}
                            onClick={() => {
                                close(false);
                            }}
                        >
                            Done
                        </Button>
                    </Group>
                </Box>
            ) : (
                <UnstyledButton
                    ref={wordsRef}
                    aria-label={
                        readOnly ? `${rule.parentPart ?? ""} ${rule.words}` : `Edit which elements: ${rule.words}`
                    }
                    disabled={readOnly}
                    onClick={() => {
                        before.current = rule;
                        setEditing(true);
                    }}
                    style={{
                        display: "block",
                        width: "100%",
                        padding: "0 8px 4px 16px",
                        cursor: readOnly ? "default" : "text",
                    }}
                >
                    <Text size="xs" c={PANEL_INK.VALUE} style={{ lineHeight: 1.5 }}>
                        {rule.parentPart !== undefined && (
                            <Text span size="xs" c={PANEL_INK.CHROME}>
                                {`${rule.parentPart} `}
                            </Text>
                        )}
                        {rule.words}
                    </Text>
                    <Text size="xs" c={PANEL_INK.CHROME}>
                        {rule.count}
                        {readOnly ? ". Set by the split; not editable here" : ""}
                    </Text>
                </UnstyledButton>
            )}
        </ControlSection>
    );
}

/**
 * Split by, on a split parent: the value it splits on. The scheme its children start from is on
 * the Fill row's binding, with the override marks and the Mixed note.
 */
function SplitBy({ layer }: { readonly layer: MockLayer }): React.JSX.Element | null {
    const { showGaps } = useMock();
    if (layer.split === undefined) {
        return null;
    }
    return (
        <ControlSection
            label="Split by"
            collapsible={false}
            info={showGaps ? <Text size="xs">Not drawable today. {GAPS.split}</Text> : undefined}
        >
            <Box style={rowStyle}>
                <VariablePill
                    name={valueLabel(layer.split.value)}
                    value={`split by ${valueLabel(layer.split.value)}, ${String(categoriesOf(layer.split.value).length)} layers`}
                    kind="property"
                    width={184}
                />
            </Box>
        </ControlSection>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Folder panel                                                                                */
/* ------------------------------------------------------------------------------------------ */

/**
 * A folder writes nothing: its panel lists its rows and the colors they paint.
 */
function FolderPanel({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const { tree, layers, select, update } = useMock();
    const kids = (findPlace(tree, layer.id)?.node.children ?? []).map((n) => layers[n.id]).filter(Boolean);
    const colors: { color: string; layer: MockLayer }[] = [];
    for (const kid of kids) {
        const found = [
            ...Object.values(kid.props).flatMap((w) =>
                w?.mode === "fixed" && typeof w.value === "string" && /^[0-9A-F]{6}$/i.test(w.value) ? [w.value] : [],
            ),
            ...kid.labels.flatMap((l) =>
                [l.look.color, l.look.background].filter((c): c is string => typeof c === "string"),
            ),
            ...kid.effects.flatMap((e) => (e.color === undefined ? [] : [e.color])),
        ];
        for (const color of found) {
            if (!colors.some((c) => c.color === color)) {
                colors.push({ color, layer: kid });
            }
        }
    }
    return (
        <>
            <ControlSection label="Contents" collapsible={false} empty={kids.length === 0}>
                {kids.length === 0
                    ? null
                    : kids.map((kid) => (
                          <DataRow
                              key={kid.id}
                              name={kid.name}
                              icon={<TypeGlyph layer={kid} />}
                              onClick={() => {
                                  select(kid.id);
                              }}
                              trailing={
                                  <Eye
                                      hidden={kid.hidden}
                                      target={kid.name}
                                      onToggle={(hidden) => {
                                          update(kid.id, (l) => ({ ...l, hidden }));
                                      }}
                                  />
                              }
                          />
                      ))}
            </ControlSection>
            <ControlSection label="Colors painted" collapsible={false} empty={colors.length === 0}>
                {colors.length === 0 ? null : (
                    <Group gap={6} style={{ padding: "4px 8px 8px 16px" }}>
                        {colors.slice(0, 3).map(({ color, layer: owner }) => (
                            <Tooltip key={color} label={`#${color}, painted by ${owner.name}`}>
                                <UnstyledButton
                                    aria-label={`#${color}, painted by ${owner.name}`}
                                    onClick={() => {
                                        select(owner.id);
                                    }}
                                >
                                    <ColorSwatch color={HEX(color)} size={16} />
                                </UnstyledButton>
                            </Tooltip>
                        ))}
                        {colors.length > 3 && (
                            <Text size="xs" c={PANEL_INK.CHROME}>{`+${String(colors.length - 3)}`}</Text>
                        )}
                    </Group>
                )}
            </ControlSection>
        </>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Values tab                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/**
 * A caption over a group of rows in the Values tab, with an optional count at its end.
 */
function Caption({
    children,
    count,
}: {
    readonly children: React.ReactNode;
    readonly count?: number;
}): React.JSX.Element {
    return (
        <Group justify="space-between" wrap="nowrap" style={{ padding: "12px 8px 4px 16px" }}>
            <Text size="xs" fw={600} c={PANEL_INK.CHROME}>
                {children}
            </Text>
            {count !== undefined && <RankChip>{count}</RankChip>}
        </Group>
    );
}

/**
 * A line of prose in the Values tab, on the panel's padding.
 */
function Prose({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
    return (
        <Box style={{ padding: "0 8px 0 16px" }}>
            <ProseBlock variant="reading">{children}</ProseBlock>
        </Box>
    );
}

/**
 * The panel's inline padding around a chart row, which draws edge to edge.
 */
function Padded({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
    return (
        <Box style={{ paddingInlineStart: PANEL_GRID.PAD_LEFT, paddingInlineEnd: PANEL_GRID.PAD_RIGHT }}>
            {children}
        </Box>
    );
}

/**
 * Every value a layer reads, in the order the panel lists them: its rule's, its split's, then
 * each write's.
 * @param layer - The layer.
 * @returns Value ids, each once.
 */
function valuesReadBy(layer: MockLayer): string[] {
    const { rule } = layer;
    const ids: string[] = [];
    if (rule.kind === "selected") {
        ids.push("selected");
    }
    if (rule.kind === "hovered") {
        ids.push("hovered");
    }
    if (rule.kind === "named") {
        ids.push("name");
    }
    if (rule.value !== undefined) {
        ids.push(rule.value);
    }
    if (layer.split !== undefined) {
        ids.push(layer.split.value);
    }
    for (const w of Object.values(layer.props)) {
        if (w?.mode === "derived") {
            ids.push(w.source);
        }
    }
    for (const e of [...layer.labels, ...(layer.tooltip === undefined ? [] : [layer.tooltip])]) {
        if (e.source.kind === "value" && e.preview !== true) {
            ids.push(e.source.value);
        }
    }
    for (const e of [...layer.effects, ...layer.ends]) {
        ids.push(...Object.values(e.bound).filter((v): v is string => v !== undefined));
    }
    return [...new Set(ids)];
}

/**
 * The values a layer reads, with when they were computed.
 */
function ValuesRead({ ids }: { readonly ids: readonly string[] }): React.JSX.Element {
    return (
        <>
            <Caption>Values read</Caption>
            {ids.length === 0 ? (
                <Prose>None</Prose>
            ) : (
                ids.map((id) => {
                    const v = VALUES.find((x) => x.id === id);
                    return (
                        <DataRow
                            key={id}
                            name={valueLabel(id)}
                            icon={v ? LEVEL_GLYPH[v.level] : undefined}
                            value={v?.group === "Facts" ? "this view only" : v?.state}
                        />
                    );
                })
            )}
        </>
    );
}

/**
 * A list of names, at most eight, then "N more"; searchable when longer.
 */
function NameList({ names, total }: { readonly names: readonly string[]; readonly total: number }): React.JSX.Element {
    const [query, setQuery] = useState("");
    const matching = names.filter((m) => m.toLowerCase().includes(query.toLowerCase()));
    const shown = matching.slice(0, MEMBER_LIMIT);
    const more = query === "" ? total - shown.length : matching.length - shown.length;
    return (
        <>
            {total > MEMBER_LIMIT && (
                <Box style={{ padding: "0 8px 4px 16px" }}>
                    <SearchInput
                        aria-label="Search members"
                        placeholder="Search members"
                        value={query}
                        onChange={setQuery}
                    />
                </Box>
            )}
            {shown.map((m) => (
                <DataRow key={m} name={m} onClick={() => undefined} />
            ))}
            {more > 0 && <Prose>{`${String(more)} more`}</Prose>}
        </>
    );
}

/**
 * What one value a layer reads holds, by its level and by how the rule uses it: group sizes for
 * categories, members for a rule on one category, a histogram for a number, an ordered list for a
 * route or a top N, the current elements for selected and hovered, a found count for names.
 */
function ValueFacts({ id, layer }: { readonly id: string; readonly layer: MockLayer }): React.JSX.Element | null {
    const { layers, select } = useMock();
    const value = VALUES.find((v) => v.id === id);
    const { rule } = layer;
    if (value === undefined) {
        return null;
    }
    if (value.level === "categories") {
        if (rule.kind === "where" && rule.value === id && rule.comparison === "is") {
            const c = COMMUNITIES.find((x) => String(x.n) === rule.operand);
            if (c === undefined) {
                return null;
            }
            return (
                <>
                    <Caption count={c.size}>Members</Caption>
                    <NameList names={c.members} total={c.size} />
                    <DataRow
                        name="Share of the graph's nodes"
                        value={`${String(Math.round((c.size / 77) * 100))}%`}
                        stat
                    />
                    {layer.kind === "child" && (
                        <Prose>{`Last re-run: matched by ${String(c.size - 1)} of its ${String(c.size)} members.`}</Prose>
                    )}
                </>
            );
        }
        const write = Object.values(layer.props).find((w) => w?.mode === "derived" && w.source === id);
        const palette = write?.mode === "derived" ? paletteOf(write.palette).colors : undefined;
        const kids = Object.values(layers).filter((l) => l.child?.parentId === layer.id);
        return (
            <>
                <Caption>{`Group sizes, ${valueLabel(id)}`}</Caption>
                {categoriesOf(id).map((c) => {
                    const kid = kids.find((k) => k.child?.group === c.n);
                    const color = kid === undefined ? palette?.[(c.n - 1) % palette.length] : childColor(kid);
                    return (
                        <DataRow
                            key={c.n}
                            name={c.name}
                            icon={
                                color === undefined ? undefined : (
                                    <ColorSwatch color={HEX(color)} size={12} withShadow={false} />
                                )
                            }
                            trailing={<RankChip>{c.count}</RankChip>}
                            onClick={
                                kid === undefined
                                    ? undefined
                                    : () => {
                                          select(kid.id);
                                      }
                            }
                        />
                    );
                })}
                {layer.kind === "split" && (
                    <Prose>{`Last re-run: ran 2 minutes ago. All ${String(kids.length)} groups matched.`}</Prose>
                )}
            </>
        );
    }
    if (value.level === "yesno") {
        if (id === "selected") {
            return (
                <>
                    <Caption count={2}>Selected now</Caption>
                    <DataRow name="Valjean" value="node" onClick={() => undefined} />
                    <DataRow name="Javert" value="node" onClick={() => undefined} />
                </>
            );
        }
        if (id === "hovered") {
            return (
                <>
                    <Caption>Hovered now</Caption>
                    <Prose>Nothing hovered</Prose>
                </>
            );
        }
        return (
            <>
                <Caption>{`${valueLabel(id)}: yes`}</Caption>
                <DataRow name="Elements" value="5 nodes, 4 edges" stat />
            </>
        );
    }
    if (value.level === "number" && value.ordered === true) {
        return (
            <>
                <Caption count={ROUTE.length}>{`In order, ${valueLabel(id)}`}</Caption>
                {ROUTE.map((name, i) => (
                    <DataRow key={name} name={name} icon={<Text size="xs">{i + 1}</Text>} onClick={() => undefined} />
                ))}
                <DataRow name="Length" value="4 edges" stat />
                <DataRow name="Total weight" value="11" stat />
            </>
        );
    }
    if (value.level === "number") {
        const facts = NUMBER_FACTS[id] as (typeof NUMBER_FACTS)[string] | undefined;
        if (facts === undefined) {
            return null;
        }
        const stepped = Object.values(layer.props).find(
            (w) => w?.mode === "derived" && w.source === id && w.steps !== undefined,
        );
        return (
            <>
                <Caption>{facts.axes === undefined ? valueLabel(id) : `${valueLabel(id)}, ${facts.axes}`}</Caption>
                <Padded>
                    <HistogramRow
                        label={`${valueLabel(id)} histogram`}
                        bins={facts.bins.map((b) => ({ ...b }))}
                        minLabel={String(facts.domain[0])}
                        maxLabel={facts.max}
                    />
                </Padded>
                {stepped !== undefined &&
                    facts.bins.map((b, i) => (
                        <DataRow
                            key={b.label}
                            name={`Step ${String(i + 1)}: ${b.label.split(":")[0]}`}
                            trailing={<RankChip>{b.count}</RankChip>}
                        />
                    ))}
                <Padded>
                    <MetricRow name="Minimum" percentile={0} value={facts.min} />
                </Padded>
                <Padded>
                    <MetricRow name="Median" percentile={50} value={facts.median} />
                </Padded>
                <Padded>
                    <MetricRow name="Maximum" percentile={100} value={facts.max} rank={facts.maxAt} />
                </Padded>
                {rule.kind === "top" && rule.value === id && (
                    <>
                        <Caption
                            count={TOP_TEN.length}
                        >{`Top ${String(rule.operand ?? 10)} by ${valueLabel(id)}`}</Caption>
                        {TOP_TEN.map(([name, n], i) => (
                            <DataRow
                                key={name}
                                name={name}
                                icon={<Text size="xs">{i + 1}</Text>}
                                trailing={<RankChip>{n}</RankChip>}
                            />
                        ))}
                    </>
                )}
            </>
        );
    }
    if (rule.kind === "named" && id === "name") {
        const asked = (rule.operand ?? "").split(",").filter((s) => s.trim() !== "").length;
        return (
            <>
                <Caption>Named elements</Caption>
                <DataRow name="Found" value={`${String(asked)} of ${String(asked)}`} stat />
            </>
        );
    }
    return null;
}

/**
 * The painted counts of a layer: how much of what each property it writes reaches the canvas. A
 * split child counts what it follows from its parent too.
 */
function PaintedCounts({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const { layers } = useMock();
    const parent = layer.child === undefined ? undefined : layers[layer.child.parentId];
    const size = layer.rule.count.split(" ")[0];
    const computed = (): (readonly [string, string])[] => {
        const own = Object.keys(layer.props).map((p): readonly [string, string] => [
            PROPS[p as PropId].label,
            layer.rule.count === "" ? "--" : `${size} of ${size}`,
        ]);
        const followed =
            parent === undefined
                ? []
                : Object.keys(parent.props)
                      .filter((p) => layer.props[p as PropId] === undefined)
                      .map((p): readonly [string, string] => [
                          PROPS[p as PropId].label,
                          `${size} of ${size}, follows ${parent.name}`,
                      ]);
        const lists = [
            ...layer.labels
                .filter((e) => e.preview !== true)
                .map((): readonly [string, string] => ["Label", `${size} of ${size}`]),
            ...layer.effects.map((e): readonly [string, string] => [e.type, `${size} of ${size}`]),
            ...layer.ends.map((e): readonly [string, string] => [e.end, `${size} of ${size}`]),
        ];
        return [...own, ...followed, ...lists];
    };
    const rows = PAINTED[layer.id] ?? computed();
    return (
        <>
            <Caption>Painted</Caption>
            {rows.length === 0 ? (
                <Prose>Writes nothing yet</Prose>
            ) : (
                rows.map(([name, value]) => <DataRow key={name} name={name} value={value} />)
            )}
        </>
    );
}

/**
 * The Values tab: facts about what a layer reads and paints, built from the values it reads and
 * its rule, the same for every layer whoever made it.
 */
function ValuesTab({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const { layers, tree } = useMock();
    if (layer.kind === "folder") {
        const kids = (findPlace(tree, layer.id)?.node.children ?? []).map((n) => layers[n.id]).filter(Boolean);
        const readers = new Map<string, string[]>();
        for (const kid of kids) {
            for (const id of valuesReadBy(kid)) {
                readers.set(id, [...(readers.get(id) ?? []), kid.name]);
            }
        }
        return (
            <>
                <Caption>Values its layers read</Caption>
                {readers.size === 0 ? (
                    <Prose>None</Prose>
                ) : (
                    [...readers.entries()].map(([id, names]) => {
                        const v = VALUES.find((x) => x.id === id);
                        return (
                            <DataRow
                                key={id}
                                name={valueLabel(id)}
                                icon={v ? LEVEL_GLYPH[v.level] : undefined}
                                value={names.join(", ")}
                            />
                        );
                    })
                )}
            </>
        );
    }
    const read = valuesReadBy(layer);
    const labels = layer.labels.filter((e) => e.preview !== true);
    const counts = LABEL_COUNTS[layer.id] ?? [
        Number(layer.rule.count.split(" ")[0]) || 0,
        Number(layer.rule.count.split(" ")[0]) || 0,
        0,
    ];
    const nothingNow = layer.rule.count === "None now";
    return (
        <>
            <Caption>Matched</Caption>
            <DataRow name="Elements" value={layer.rule.count === "" ? "--" : layer.rule.count} stat />
            <ValuesRead ids={read} />
            {read.map((id) => (
                <ValueFacts key={id} id={id} layer={layer} />
            ))}
            {labels.length > 0 && (
                <>
                    <Caption>Labels</Caption>
                    <DataRow name="Labeled" value={String(counts[0])} stat />
                    <DataRow name="Drawn" value={String(counts[1])} stat />
                    <DataRow name="Hidden by overlap" value={String(counts[2])} stat />
                </>
            )}
            {!nothingNow && <PaintedCounts layer={layer} />}
        </>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Graph settings: the panel with no layer selected                                            */
/* ------------------------------------------------------------------------------------------ */

/**
 * What belongs to the whole graph, not to a layer: background, view mode, label declutter and
 * avoidance, and the settings the studio branch adds.
 */
function GraphSettings(): React.JSX.Element {
    const { showGaps } = useMock();
    const [background, setBackground] = useState<"Color" | "Image">("Color");
    const [color, setColor] = useState<string | undefined>(undefined);
    const [image, setImage] = useState("");
    const [view, setView] = useState<string | undefined>(undefined);
    const [declutter, setDeclutter] = useState(false);
    const [avoid, setAvoid] = useState(false);
    const [highlight, setHighlight] = useState<string | undefined>(undefined);
    const [depthSize, setDepthSize] = useState(false);
    const branch = showGaps ? <Text size="xs">Not drawable today. {GAPS.branch}</Text> : undefined;
    return (
        <>
            <Group
                gap={4}
                wrap="nowrap"
                style={{
                    height: PANEL_GRID.SECTION_HEADER,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                    borderBottom: `1px solid ${PANEL_INK.DIVIDER}`,
                }}
            >
                <Text component="h2" fz={TITLE_SIZE} fw={600} m={0} c={PANEL_INK.VALUE}>
                    Graph settings
                </Text>
            </Group>
            <Box style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
                <ControlSection label="Background" collapsible={false}>
                    <Box style={{ padding: "0 8px 4px 16px" }}>
                        <SegmentedControl
                            size="xs"
                            fullWidth
                            aria-label="Background kind"
                            data={["Color", "Image"]}
                            value={background}
                            onChange={(v) => {
                                setBackground(v === "Image" ? "Image" : "Color");
                            }}
                        />
                        <Box style={{ paddingTop: 4 }}>
                            {background === "Color" ? (
                                <CompactColorInput
                                    label="Background color"
                                    color={color}
                                    defaultColor="#F5F5F5"
                                    onColorChange={setColor}
                                />
                            ) : (
                                <TextInput
                                    size="xs"
                                    label="Image address, drawn as a sky around the graph"
                                    placeholder="https://..."
                                    value={image}
                                    onChange={(event) => {
                                        setImage(event.currentTarget.value);
                                    }}
                                />
                            )}
                        </Box>
                    </Box>
                </ControlSection>
                <ControlSection label="View" collapsible={false}>
                    <Box style={{ padding: "0 8px 4px 16px" }}>
                        <StyleSelect
                            label="View mode"
                            value={view}
                            defaultValue="3D"
                            options={["3D", "2D", "VR", "AR"].map((v) => ({ value: v, label: v }))}
                            onChange={setView}
                        />
                    </Box>
                    <ToggleRow
                        label="Same size at any depth"
                        control="switch"
                        checked={depthSize}
                        onChange={setDepthSize}
                        trailing={<Gap gap="branch" label="Same size at any depth" />}
                    />
                </ControlSection>
                <ControlSection label="Labels" collapsible={false}>
                    <ToggleRow
                        label="Hide overlapping labels"
                        control="switch"
                        checked={declutter}
                        onChange={setDeclutter}
                    />
                    <ToggleRow
                        label="Move labels off nodes and edges"
                        control="switch"
                        checked={avoid}
                        onChange={setAvoid}
                    />
                </ControlSection>
                <ControlSection label="Highlight" collapsible={false} info={branch}>
                    <Box style={{ padding: "0 8px 4px 16px" }}>
                        <CompactColorInput
                            label="Highlight color"
                            color={highlight}
                            defaultColor="#D55E00"
                            showOpacity={false}
                            onColorChange={setHighlight}
                        />
                    </Box>
                    <Note text="The color a run paints its result in when no layer says otherwise" />
                </ControlSection>
                <Box style={{ padding: "12px 8px 8px 16px" }}>
                    <ProseBlock variant="reading">Select a layer in the tree to edit it.</ProseBlock>
                </Box>
            </Box>
        </>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* The right panel                                                                             */
/* ------------------------------------------------------------------------------------------ */

/**
 * Whether a row or any folder holding it is hidden.
 */
function hiddenInTree(id: string, tree: readonly TreeShape[], layers: Readonly<Record<string, MockLayer>>): boolean {
    let place = findPlace(tree, id);
    if (layers[id]?.hidden === true) {
        return true;
    }
    while (place !== null && place.parentId !== null) {
        if (layers[place.parentId]?.hidden === true) {
            return true;
        }
        place = findPlace(tree, place.parentId);
    }
    return false;
}

/**
 * The right panel: Style and Values tabs, the header, and the selected row's sections; Graph
 * settings when no row is selected.
 */
function RightPanel({
    tab,
    setTab,
}: {
    readonly tab: string;
    readonly setTab: (tab: string) => void;
}): React.JSX.Element {
    const { layers, selectedId, update, renamingId, setRenamingId } = useMock();
    const layer = selectedId === null ? undefined : layers[selectedId];
    if (layer === undefined) {
        return (
            <PanelFrame>
                <GraphSettings />
            </PanelFrame>
        );
    }
    const draft = layer.rule.kind === "draft";
    const effectiveTab = draft ? "style" : tab;
    return (
        <PanelFrame>
            <Box style={{ padding: "8px 8px 0 16px" }}>
                <Tabs
                    variant="pills"
                    value={effectiveTab}
                    onChange={(next) => {
                        setTab(next ?? "style");
                    }}
                >
                    <Tabs.List>
                        <Tabs.Tab value="style">Style</Tabs.Tab>
                        <Tabs.Tab
                            value="values"
                            disabled={draft}
                            title={draft ? "Choose which elements first" : undefined}
                        >
                            Values
                        </Tabs.Tab>
                    </Tabs.List>
                </Tabs>
            </Box>
            <Group
                gap={4}
                wrap="nowrap"
                style={{
                    height: PANEL_GRID.SECTION_HEADER,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                    borderBottom: `1px solid ${PANEL_INK.DIVIDER}`,
                }}
            >
                <Box style={{ color: PANEL_INK.CHROME, display: "inline-flex" }}>
                    {layer.kind === "child" ? (
                        <ColorSwatch color={HEX(childColor(layer))} size={11} withShadow={false} />
                    ) : (
                        <TypeGlyph layer={layer} />
                    )}
                </Box>
                <Box style={{ flex: 1, minWidth: 0 }}>
                    {renamingId === layer.id || draft ? (
                        <InlineRename
                            key={layer.id}
                            value={layer.name}
                            label="Layer name"
                            onCommit={(name) => {
                                if (name.trim() !== "") {
                                    update(layer.id, (l) => ({ ...l, name: name.trim() }));
                                }
                                setRenamingId(null);
                            }}
                            onCancel={() => {
                                setRenamingId(null);
                            }}
                        />
                    ) : (
                        <UnstyledButton
                            aria-label={`Rename ${layer.name}`}
                            onDoubleClick={() => {
                                setRenamingId(layer.id);
                            }}
                            onKeyDown={(event: React.KeyboardEvent) => {
                                if (event.key === "F2" || event.key === "Enter") {
                                    setRenamingId(layer.id);
                                }
                            }}
                            style={{ maxWidth: "100%" }}
                        >
                            <Text component="h2" m={0} fz={TITLE_SIZE} fw={600} c={PANEL_INK.VALUE} truncate>
                                {layer.name}
                            </Text>
                        </UnstyledButton>
                    )}
                </Box>
                {layer.pin !== undefined && (
                    <Tooltip label={`Pinned to the ${layer.pin}`}>
                        <Box
                            style={{ display: "inline-flex", color: PANEL_INK.CHROME }}
                            role="img"
                            aria-label={`Pinned to the ${layer.pin}`}
                        >
                            <UiGlyph name="pin" size={PANEL_GRID.GLYPH} />
                        </Box>
                    </Tooltip>
                )}
                <Gap gap="tree" label="Pins, folders and locks" />
                <PressToggle
                    label={`Lock ${layer.name}`}
                    checked={layer.locked}
                    icon={<UiGlyph name="unlock" size={PANEL_GRID.GLYPH} />}
                    checkedIcon={<UiGlyph name="lock" size={PANEL_GRID.GLYPH} />}
                    onToggle={(locked) => {
                        update(layer.id, (l) => ({ ...l, locked }));
                    }}
                />
                <PressToggle
                    label={`Hide ${layer.name}`}
                    checked={layer.hidden}
                    icon={<UiGlyph name="eye" size={PANEL_GRID.GLYPH} />}
                    checkedIcon={<UiGlyph name="eyeClosed" size={PANEL_GRID.GLYPH} />}
                    onToggle={(hidden) => {
                        update(layer.id, (l) => ({ ...l, hidden }));
                    }}
                />
                <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                        <ActionIcon
                            variant="subtle"
                            size={PANEL_GRID.CONTROL_HEIGHT}
                            c={PANEL_INK.CHROME}
                            aria-label={`More for ${layer.name}`}
                            title="More"
                        >
                            <UiGlyph name="more" size={PANEL_GRID.GLYPH} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <RowMenuItems id={layer.id} />
                    </Menu.Dropdown>
                </Menu>
            </Group>
            <Box style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
                {effectiveTab === "values" ? (
                    <Box style={{ paddingBottom: 16 }}>
                        <ValuesTab layer={layer} />
                    </Box>
                ) : (
                    <StyleTab layer={layer} />
                )}
            </Box>
        </PanelFrame>
    );
}

/**
 * The Style tab: Which elements, Split by, then every section in the fixed order. A locked
 * layer's controls are disabled with the reason; a hidden one says its changes will not show.
 */
function StyleTab({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const { tree, layers } = useMock();
    const hidden = hiddenInTree(layer.id, tree, layers);
    const notes = (
        <>
            {layer.locked && (
                <Box style={{ paddingTop: 8 }}>
                    <Note warn text="This layer is locked. Unlock it to change it." />
                </Box>
            )}
            {hidden && (
                <Box style={{ paddingTop: 8 }}>
                    <Note warn text="Hidden: changes will not show until it is shown." />
                </Box>
            )}
        </>
    );
    if (layer.kind === "folder") {
        return (
            <Box key={layer.id}>
                {notes}
                <fieldset
                    disabled={layer.locked}
                    style={fieldsetStyle}
                    title={layer.locked ? LOCKED_REASON : undefined}
                >
                    <FolderPanel layer={layer} />
                </fieldset>
            </Box>
        );
    }
    const draft = layer.rule.kind === "draft";
    return (
        <Box key={layer.id}>
            {notes}
            <fieldset disabled={layer.locked} style={fieldsetStyle} title={layer.locked ? LOCKED_REASON : undefined}>
                <WhichElements layer={layer} />
                <SplitBy layer={layer} />
                {draft && (
                    <Box style={{ padding: "8px 8px 4px 16px" }}>
                        <ProseBlock variant="reading">Choose which elements, then set a property</ProseBlock>
                    </Box>
                )}
                {(["node", "edge"] as const)
                    .filter((target) => reaches(layer.rule.matches, target))
                    .map((target) => (
                        <Box key={target} role="group" aria-label={target === "node" ? "Nodes" : "Edges"}>
                            <TargetHeading target={target} />
                            {SECTIONS.filter((s) => s.on === target).map((s) => (
                                <Section key={`${target}-${s.id}`} layer={layer} section={s} draft={draft} />
                            ))}
                        </Box>
                    ))}
            </fieldset>
        </Box>
    );
}

/**
 * The heading over a group of sections: what every row under it styles.
 */
function TargetHeading({ target }: { readonly target: "node" | "edge" }): React.JSX.Element {
    return (
        <Group
            gap={6}
            wrap="nowrap"
            style={{
                height: 28,
                marginTop: 8,
                paddingInlineStart: PANEL_GRID.PAD_LEFT,
                paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                background: PANEL_INK.SURFACE,
                borderTop: `1px solid ${PANEL_INK.DIVIDER}`,
                borderBottom: `1px solid ${PANEL_INK.DIVIDER}`,
                color: PANEL_INK.VALUE,
            }}
        >
            <Box style={{ display: "inline-flex", width: 12, justifyContent: "center" }} aria-hidden="true">
                <TargetGlyph target={target} />
            </Box>
            <Text component="h3" m={0} fz={TITLE_SIZE} fw={700} c={PANEL_INK.VALUE}>
                {target === "node" ? "Nodes" : "Edges"}
            </Text>
        </Group>
    );
}

const fieldsetStyle: React.CSSProperties = { border: 0, margin: 0, padding: 0, minWidth: 0 };

/**
 * The 240 px column the right panel draws in.
 */
function PanelFrame({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
    return (
        <Popout.Anchor>
            <Box
                component="aside"
                aria-label="Style panel"
                style={{
                    width: PANEL_GRID.WIDTH,
                    flex: `0 0 ${String(PANEL_GRID.WIDTH)}px`,
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    background: PANEL_INK.PANEL,
                    borderInlineStart: `1px solid ${PANEL_INK.BORDER}`,
                }}
            >
                {children}
            </Box>
        </Popout.Anchor>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* The mock                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const STARTING_IDS = ["hovered", "selected", "everything"];

/** A row's band: pinned to the top, unpinned, or pinned to the bottom. */
const BAND = { top: 0, none: 1, bottom: 2 } as const;

/**
 * Whether top-level rows run top band, then unpinned, then bottom band.
 * @param tree - The tree.
 * @param layers - Every layer.
 * @returns True when every band is in its place.
 */
function bandsInOrder(tree: readonly TreeShape[], layers: Readonly<Record<string, MockLayer>>): boolean {
    const bands = tree.map((n) => BAND[layers[n.id]?.pin ?? "none"]);
    return bands.every((b, i) => i === 0 || b >= bands[i - 1]);
}

/**
 * The whole mock: tree, an empty canvas between, and the style panel.
 */
function StylePanelMock(): React.JSX.Element {
    const [layers, setLayers] = useState<Record<string, MockLayer>>(INITIAL_LAYERS);
    const [tree, setTree] = useState<readonly TreeShape[]>(INITIAL_TREE);
    const [selectedId, setSelectedId] = useState<string | null>("degree");
    const [tab, setTab] = useState("style");
    const [showGaps, setShowGaps] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);

    const update = (id: string, fn: (layer: MockLayer) => MockLayer): void => {
        setLayers((prev) => (prev[id] === undefined ? prev : { ...prev, [id]: fn(prev[id]) }));
    };

    /** Where a new row goes: the top of the unpinned stack, beneath the rows pinned to the top. */
    const insertionPoint = (): { parentId: string | null; index: number } => ({
        parentId: null,
        index: unpinnedRange(tree, layers)[0],
    });

    const addRow = (layer: MockLayer, at = insertionPoint()): void => {
        setLayers((prev) => ({ ...prev, [layer.id]: layer }));
        setTree((prev) =>
            insertNode(
                prev,
                at.parentId,
                at.index,
                layer.kind === "folder" ? { id: layer.id, children: [] } : { id: layer.id },
            ),
        );
        setSelectedId(layer.id);
        setTab("style");
    };

    const blankLayer = (name: string, rule: Rule): MockLayer => ({
        id: newId("layer"),
        name: uniqueName(layers, name),
        kind: "layer",
        locked: false,
        hidden: false,
        draft: true,
        rule,
        props: {},
        pending: [],
        labels: [],
        effects: [],
        ends: [],
    });

    const onAddLayer = (): void => {
        addRow(blankLayer("New layer", { kind: "draft", words: "", count: "", matches: "both" }));
    };
    const onAddFolder = (): void => {
        const folder: MockLayer = { ...blankLayer("New folder", ruleFor("everything")), kind: "folder", draft: false };
        addRow(folder);
        setRenamingId(folder.id);
    };

    const onMove = (move: TreeMove): void => {
        const moved = layers[move.id];
        const from = findPlace(tree, move.id);
        if (moved === undefined || from === null) {
            return;
        }
        const target = move.parentId === null ? undefined : layers[move.parentId];
        // A split child moves only among its siblings; nothing else drops into a split parent.
        if (moved.kind === "child" ? move.parentId !== from.parentId : target?.kind === "split") {
            return;
        }
        // Folders do not nest in the mock.
        if (moved.kind === "folder" && move.parentId !== null) {
            return;
        }
        // A pinned row dropped into a folder takes its folder's place, so it unpins.
        const unpins = moved.pin !== undefined && move.parentId !== null;
        const after = unpins ? { ...layers, [move.id]: { ...moved, pin: undefined } } : layers;
        const next = moveTreeItem([...tree] as TreeShape[], move);
        // Every row stays in its band: pinned rows move only within theirs.
        if (!bandsInOrder(next, after)) {
            return;
        }
        if (unpins) {
            update(move.id, (l) => ({ ...l, pin: undefined }));
        }
        setTree(next);
    };

    const actions: RowActions = {
        duplicate: (id) => {
            const place = findPlace(tree, id);
            if (place === null) {
                return;
            }
            const copies: Record<string, MockLayer> = {};
            const copy = (node: TreeShape, parentId?: string): TreeShape => {
                const newKey = newId("copy");
                const src = layers[node.id];
                copies[newKey] = {
                    ...src,
                    id: newKey,
                    name: parentId === undefined ? uniqueName(layers, `${src.name} copy`) : src.name,
                    pin: undefined,
                    starting: false,
                    child: src.child === undefined || parentId === undefined ? src.child : { ...src.child, parentId },
                };
                return { id: newKey, children: node.children?.map((c) => copy(c, newKey)) };
            };
            const node = copy(place.node);
            setLayers((prev) => ({ ...prev, ...copies }));
            setTree((prev) => {
                const [first] = unpinnedRange(prev, layers);
                return insertNode(
                    prev,
                    place.parentId,
                    place.parentId === null ? Math.max(first, place.index) : place.index,
                    node,
                );
            });
            setSelectedId(node.id);
        },
        remove: (id) => {
            const place = findPlace(tree, id);
            if (place === null) {
                return;
            }
            const next = removeNode(tree, id);
            setTree(next);
            const siblings = place.parentId === null ? next : (findPlace(next, place.parentId)?.node.children ?? []);
            setSelectedId(siblings[Math.min(place.index, siblings.length - 1)]?.id ?? place.parentId);
        },
        moveToFolder: (id, folderId) => {
            const place = findPlace(tree, id);
            if (place === null) {
                return;
            }
            if (folderId !== null) {
                // A row inside a folder takes its folder's place: it cannot keep a pin.
                update(id, (l) => ({ ...l, pin: undefined }));
            }
            setTree((prev) => {
                const without = removeNode(prev, id);
                if (folderId === null) {
                    const [first] = unpinnedRange(without, layers);
                    return insertNode(without, null, first, place.node);
                }
                return insertNode(without, folderId, 0, place.node);
            });
        },
        pin: (id, pin) => {
            update(id, (l) => ({ ...l, pin }));
            setTree((prev) => {
                const place = findPlace(prev, id);
                if (place === null) {
                    return prev;
                }
                const without = removeNode(prev, id);
                const pinned = { ...layers, [id]: { ...layers[id], pin } };
                const [first, last] = unpinnedRange(without, pinned);
                const index = pin === "bottom" ? last : first;
                return insertNode(without, null, index, place.node);
            });
        },
        unsplit: (id) => {
            const place = findPlace(tree, id);
            update(id, (l) => ({ ...l, kind: "layer", split: undefined }));
            setTree((prev) => prev.map((n) => (n.id === id ? { id } : n)));
            if (place !== null && selectedId !== null && (place.node.children ?? []).some((c) => c.id === selectedId)) {
                setSelectedId(id);
            }
        },
        split: (id, source) => {
            const layer = layers[id];
            const write = Object.values(layer.props).find((w) => w?.mode === "derived" && w.source === source);
            const palette = paletteOf(write?.mode === "derived" ? write.palette : DEFAULT_CATEGORICAL).colors;
            const cats = categoriesOf(source).sort((a, b) => a.n - b.n);
            const kids: MockLayer[] = cats.map((c) => ({
                id: newId("child"),
                name: c.name,
                kind: "child",
                locked: false,
                hidden: false,
                rule: {
                    kind: "where",
                    words: `where ${valueLabel(source)} is ${c.name}`,
                    parentPart: `${layer.name}'s ${layer.rule.matches === "edge" ? "edges" : "nodes"}`,
                    count: `${String(c.count)} nodes`,
                    matches: "node",
                    value: source,
                    comparison: "is",
                    operand: String(c.n),
                },
                props: {},
                pending: [],
                labels: [],
                effects: [],
                ends: [],
                child: { parentId: id, group: c.n, chit: palette[(c.n - 1) % palette.length] },
            }));
            setLayers((prev) => ({
                ...prev,
                [id]: { ...prev[id], kind: "split", split: { value: source } },
                ...Object.fromEntries(kids.map((k) => [k.id, k])),
            }));
            setTree((prev) => {
                const swap = (nodes: readonly TreeShape[]): TreeShape[] =>
                    nodes.map((n) => {
                        if (n.id === id) {
                            return { id, children: kids.map((k) => ({ id: k.id })) };
                        }
                        return n.children === undefined ? n : { ...n, children: swap(n.children) };
                    });
                return swap(prev);
            });
        },
        ungroup: (id) => {
            setTree((prev) => {
                const place = findPlace(prev, id);
                if (place === null) {
                    return prev;
                }
                const out = [...prev];
                out.splice(place.index, 1, ...(place.node.children ?? []));
                return out;
            });
        },
        followParentAll: (id) => {
            update(id, (l) => ({ ...l, props: {}, effects: [], labels: [], pending: [] }));
        },
        addAbove: (id, rule) => {
            const place = findPlace(tree, id);
            const layer = { ...blankLayer(`${layers[id].name} above`, rule), draft: false };
            addRow(layer, place === null ? undefined : { parentId: place.parentId, index: place.index });
        },
    };

    const present = new Set(tree.flatMap(idsOf));
    const missingStarting = STARTING_IDS.some((id) => !present.has(id));
    const onRestore = (): void => {
        setTree((prev) => {
            let next = [...prev];
            for (const id of ["selected", "hovered"]) {
                if (!next.some((n) => n.id === id)) {
                    next = [{ id }, ...next];
                }
            }
            if (!next.some((n) => n.id === "everything")) {
                next = [...next, { id: "everything" }];
            }
            return next;
        });
        setLayers((prev) => ({
            ...prev,
            ...Object.fromEntries(STARTING_IDS.filter((id) => !present.has(id)).map((id) => [id, INITIAL_LAYERS[id]])),
        }));
    };

    const api: MockApi = {
        layers,
        tree,
        selectedId,
        showGaps,
        renamingId,
        select: (id) => {
            setSelectedId(id);
            setRenamingId(null);
        },
        update,
        setRenamingId,
        actions,
    };

    return (
        <MockContext.Provider value={api}>
            <style>{`
                .spm-row .spm-vary { opacity: 0; transition: opacity 100ms; }
                .spm-row:hover .spm-vary, .spm-row:focus-within .spm-vary, .spm-vary[aria-expanded="true"] { opacity: 1; }
                @media (hover: none) { .spm-row .spm-vary { opacity: 1; } }
            `}</style>
            <Box
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: 860,
                    background: PANEL_INK.SURFACE,
                    border: `1px solid ${PANEL_INK.BORDER}`,
                }}
            >
                <Group
                    justify="space-between"
                    style={{
                        padding: "6px 12px",
                        borderBottom: `1px solid ${PANEL_INK.BORDER}`,
                        background: PANEL_INK.PANEL,
                    }}
                >
                    <Text size="xs" c={PANEL_INK.CHROME}>
                        Les Miserables: 77 nodes, 254 edges. Louvain, degree, edge betweenness and a route from Valjean
                        to Javert.
                    </Text>
                    <Group gap={4} wrap="nowrap">
                        <Switch
                            size="xs"
                            label="Mark what graphty-element cannot draw today"
                            checked={showGaps}
                            onChange={(event) => {
                                setShowGaps(event.currentTarget.checked);
                            }}
                        />
                        <InfoCircle label="What graphty-element cannot draw today">
                            <Text size="xs" fw={600}>
                                Drawn here, not drawable by graphty-element today. Each needs an additive change:
                            </Text>
                            {Object.values(GAPS).map((g) => (
                                <Text key={g} size="xs">
                                    {g.replace("graphty-element needs ", "- ")}
                                </Text>
                            ))}
                        </InfoCircle>
                    </Group>
                </Group>
                <Box style={{ display: "flex", flex: 1, minHeight: 0 }}>
                    <LayerTreePanel
                        onAddLayer={onAddLayer}
                        onAddFolder={onAddFolder}
                        onMove={onMove}
                        onRestore={onRestore}
                        missingStarting={missingStarting}
                    />
                    <Box
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 280,
                        }}
                    >
                        <Text size="xs" c={PANEL_INK.PLACEHOLDER}>
                            No graph in this mock: only the panels
                        </Text>
                    </Box>
                    <RightPanel tab={tab} setTab={setTab} />
                </Box>
            </Box>
        </MockContext.Provider>
    );
}

const meta: Meta = {
    title: "Mocks/Style panel",
    parameters: { layout: "padded" },
    decorators: [
        (Story): React.JSX.Element => (
            <PopoutManager>
                <Story />
            </PopoutManager>
        ),
    ],
};

export default meta;

type Story = StoryObj;

/**
 * The layer tree and the style panel for the Les Miserables network. Select any row in the tree;
 * right-click a row for its menu; "+" in the tree header adds a layer or a folder; "Graph settings"
 * under the tree shows what belongs to the whole graph.
 */
export const StylePanel: Story = {
    render: () => <StylePanelMock />,
};
