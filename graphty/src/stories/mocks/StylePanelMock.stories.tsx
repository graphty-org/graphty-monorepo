/**
 * A live mock of the style panel: the layer tree on the left and the style panel on the right,
 * as specified by design/ui/style-panel-organization.md. There is no graph and nothing is
 * painted: every row, control and number is mock data, and graphty-element is never loaded.
 *
 * Controls that graphty-element cannot draw today carry an "i" that says what it would need;
 * the switch above the panels hides those marks.
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
import { Folder, Hash, Hexagon, Layers, Split, Tags, ToggleLeft, Type } from "lucide-react";
import React, { createContext, useContext, useMemo, useRef, useState } from "react";

import {
    ARROW_KINDS,
    BETWEENNESS_BINS,
    CATEGORY_PALETTES,
    COLOR_COMBINES,
    type Combine,
    COMMUNITIES,
    DEGREE_BINS,
    derived,
    type DerivedWrite,
    type EffectEntry,
    type EffectType,
    type EndEntry,
    fixed,
    INITIAL_LAYERS,
    INITIAL_TREE,
    type LabelEntry,
    type MockLayer,
    newId,
    NUMBER_COMBINES,
    PAINTED,
    PATTERNS,
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
const RING_REASON = "One outline and one glow per element: the renderer draws one of each at one width";
const LOCKED_REASON = "This layer is locked";
const LOOK_VARY_REASON = "Label looks take one value until graphty-element lets them vary";
const MOTION_NOTE = "Not shown on curved or patterned edges, in 2D, in still exports or with reduced motion";
const ROW_GAP = 4;
const CHIP_LIMIT = 8;

/** What graphty-element needs before it can draw each marked control (the mock's "i" marks). */
const GAPS = {
    facts: "graphty-element needs is-selected and is-hovered values, scoped to a view.",
    tree: "graphty-element needs folders, pins and a reader-set lock in the layer stack.",
    split: "graphty-element needs split by value, with children matched across re-runs.",
    combine: "graphty-element needs a combine mode on each property write.",
    pause: "graphty-element needs a paused flag on each property write, saved with the layer.",
    slots: "graphty-element needs label slots keyed by name before a second label can be drawn.",
    looks: "graphty-element needs label size, color and background to take bindings.",
    format: "graphty-element needs a number format on text bindings.",
    shapes: "graphty-element needs named shape schemes, distinct shapes first.",
    keep: "graphty-element needs a domain kept across re-runs.",
    unmapped: "graphty-element needs a Skip option for values a value table does not list.",
} as const;

type GapId = keyof typeof GAPS;

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

/* ------------------------------------------------------------------------------------------ */
/* The mock's state, shared through context                                                    */
/* ------------------------------------------------------------------------------------------ */

interface MockApi {
    readonly layers: Readonly<Record<string, MockLayer>>;
    readonly tree: readonly TreeShape[];
    readonly selectedId: string | null;
    readonly showGaps: boolean;
    readonly renamingId: string | null;
    readonly select: (id: string) => void;
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
    readonly split: (id: string) => void;
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
 * The marks after a row's name: pin, override dot, painted over.
 */
function RowMarks({ layer }: { readonly layer: MockLayer }): React.JSX.Element | null {
    const { layers } = useMock();
    const overrides = layer.kind === "child" && (Object.keys(layer.props).length > 0 || layer.effects.length > 0);
    const over = layer.paintedOverBy === undefined ? undefined : layers[layer.paintedOverBy];
    if (layer.pin === undefined && !overrides && over === undefined) {
        return null;
    }
    return (
        <Group gap={4} wrap="nowrap">
            {over !== undefined && (
                <Tooltip label={`Painted over by ${over.name}`}>
                    <Text size="xs" c={PANEL_INK.PLACEHOLDER} component="span">
                        painted over
                    </Text>
                </Tooltip>
            )}
            {overrides && (
                <Tooltip label="Overrides its parent">
                    <Box
                        component="span"
                        aria-label="Overrides its parent"
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
                        disabled={!topLevel || layer.kind === "folder"}
                        title={topLevel ? undefined : "Only top-level rows can pin"}
                        onClick={() => {
                            actions.pin(id, "top");
                        }}
                    >
                        Pin to top
                    </Menu.Item>
                    <Menu.Item
                        disabled={!topLevel || layer.kind === "folder"}
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
            const over = layer.paintedOverBy === undefined ? undefined : layers[layer.paintedOverBy];
            const words = [
                layer.hidden ? "Hidden" : undefined,
                layer.locked ? "Locked" : undefined,
                layer.pin === undefined ? undefined : `Pinned to the ${layer.pin}`,
                over === undefined ? undefined : `Painted over by ${over.name}`,
            ].filter((w) => w !== undefined);
            return [
                {
                    id: layer.id,
                    name: layer.name,
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
                <Text component="h2" size="xs" fw={600} m={0} c={PANEL_INK.VALUE}>
                    Style layers
                </Text>
                <Menu position="bottom-end" withinPortal>
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
            {missingStarting && (
                <Box style={{ padding: `8px ${String(PANEL_GRID.PAD_RIGHT)}px 8px ${String(PANEL_GRID.PAD_LEFT)}px` }}>
                    <Button size="compact-xs" variant="subtle" onClick={onRestore}>
                        Restore starting layers
                    </Button>
                </Box>
            )}
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

/**
 * Why `value` cannot drive `prop`, or null when it can. graphty-element's reason codes, in the
 * app's words.
 */
function incompatible(prop: PropDef, value: ValueRef): string | null {
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

/**
 * The derived write a picked value makes for a property: a ramp for a number, a scheme for
 * categories, a value table for numbers per category.
 */
function bindingFor(prop: PropDef, value: ValueRef): DerivedWrite {
    if (value.level === "number") {
        if (prop.control === "color") {
            return derived(value.id, "ramp", "Yellow-orange-brown");
        }
        const range: Record<string, [number, number]> = {
            size: [1, 3],
            edgeWidth: [1, 6],
            opacity: [30, 100],
        };
        const [from, to] = range[prop.id] ?? [1, 3];
        return { ...derived(value.id, "ramp", "Yellow-orange-brown"), from, to, steps: 5 };
    }
    if (prop.scheme === "palette") {
        return derived(value.id, "categories", "Okabe-Ito");
    }
    if (prop.scheme === "shapes") {
        return derived(value.id, "categories", "Distinct shapes");
    }
    return { ...derived(value.id, "table", ""), table: { 1: Number(prop.floor) * 2 } };
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

/**
 * The value control of a fixed row.
 */
function FixedControl({
    prop,
    value,
    placeholder,
    onChange,
}: {
    readonly prop: PropDef;
    readonly value: string | number | boolean | undefined;
    readonly placeholder?: string | number;
    readonly onChange: (value: string | number) => void;
}): React.JSX.Element {
    const floor = placeholder ?? prop.floor;
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
                placeholder={`Default: ${String(floor).toLowerCase()}`}
                onChange={(next) => {
                    onChange(next);
                }}
            />
        );
    }
    return (
        <PanelField
            label={prop.label}
            kind="number"
            width="fill"
            glyph={NUMBER_GLYPH[prop.id] ?? "sizeLargest"}
            unit={prop.unit}
            value={typeof value === "number" ? value : null}
            placeholder={`Default: ${String(floor)}`}
            min={0}
            step={prop.id === "size" ? 0.25 : 1}
            onChange={(next) => {
                onChange(Number(next));
            }}
        />
    );
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
 * One property row: fixed (a value control) or derived (a pill, its second line and notes).
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
                            label={prop.label}
                            control="switch"
                            checked={on}
                            onChange={(checked) => {
                                setWrite(fixed(checked));
                            }}
                            trailing={
                                <Minus
                                    target={`${prop.label} from ${layer.name}`}
                                    onRemove={() => {
                                        setWrite(undefined);
                                    }}
                                />
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
                            {ctx.showLabel && <RowCaption text={prop.label} />}
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
    const word = write === undefined ? undefined : COMBINE_WORDS[write.combine];
    return (
        <Popout opened={pickerOpen} onOpenChange={setPickerOpen}>
            <ContextMenu
                target={
                    <Box className="spm-row">
                        {ctx.showLabel && <RowCaption text={prop.label} />}
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
                                {word !== undefined && (
                                    <Tooltip label={`Combine: ${write?.combine ?? ""}`}>
                                        <Text size="xs" c={PANEL_INK.CHROME} style={{ flex: "0 0 auto" }}>
                                            {word}
                                        </Text>
                                    </Tooltip>
                                )}
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                    <FixedControl
                                        prop={prop}
                                        value={write?.mode === "fixed" ? write.value : undefined}
                                        placeholder={
                                            inheritedValue === undefined || typeof inheritedValue === "boolean"
                                                ? undefined
                                                : inheritedValue
                                        }
                                        onChange={(next) => {
                                            setWrite(fixed(next, write?.mode === "fixed" ? write.combine : "Replace"));
                                        }}
                                    />
                                </Box>
                                {word !== undefined && <Gap gap="combine" label="Combine" />}
                                <Popout.Trigger>
                                    <span style={{ display: "inline-flex" }}>
                                        <VaryGlyph reason={varyReason} label={prop.label} />
                                    </span>
                                </Popout.Trigger>
                            </Group>
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
                        {ctx.pending && <Note neutral text="Writes nothing until you choose a value" />}
                        {ctx.inherited !== undefined && write === undefined && (
                            <Note neutral text="Follows Louvain. Choose a value to override it here" />
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

const NUMBER_GLYPH: Partial<Record<PropId, "width" | "opacity" | "sizeLargest">> = {
    edgeWidth: "width",
    opacity: "opacity",
};

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
function RowCaption({ text }: { readonly text: string }): React.JSX.Element {
    return (
        <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingInlineStart: PANEL_GRID.PAD_LEFT, paddingTop: 4 }}>
            {text}
        </Text>
    );
}

/**
 * One line of secondary text under a row: a note the note rule requires.
 */
function Note({
    text,
    onClick,
    neutral,
}: {
    readonly text: string;
    readonly onClick?: () => void;
    readonly neutral?: boolean;
}): React.JSX.Element {
    return (
        <Box style={{ paddingInlineStart: PANEL_GRID.PAD_LEFT, paddingInlineEnd: PANEL_GRID.PAD_RIGHT }}>
            <ProseBlock variant={neutral === true ? "reading" : "departure"}>
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
 * The notes a derived write leaves on its row and in the legend: every hidden setting that is not
 * neutral.
 */
function notesFor(write: DerivedWrite, layer: MockLayer): string[] {
    const notes: string[] = [];
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
    if (write.binding === "categories" && write.source === "group" && write.palette === "Tol vibrant") {
        notes.push("Other: 16% of nodes");
    }
    const changed = Object.keys(write.overrides ?? {}).length;
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
            { n: 1, name: "yes", count: 1 },
            { n: 2, name: "no", count: 76 },
        ];
    }
    return [
        { n: 1, name: "yes", count: 5 },
        { n: 2, name: "no", count: 72 },
    ];
}

/**
 * A derived row: pill, settings, eye and minus; then a ramp, a range or swatches; then notes.
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
    const { select, layers } = useMock();
    const notes = notesFor(write, layer);
    const over = layer.paintedOverBy === undefined ? undefined : layers[layer.paintedOverBy];
    return (
        <Box>
            <Box style={rowStyle}>
                <Box style={{ flex: "1 1 0", minWidth: 0, opacity: write.paused ? 0.45 : 1 }}>
                    <Popout.Trigger>
                        <span style={{ display: "flex", width: "100%" }}>
                            <VariablePill
                                name={valueLabel(write.source)}
                                glyph={<UiGlyph name={write.binding === "ramp" ? "refresh" : "component"} size={10} />}
                                width="100%"
                                kind="property"
                            />
                        </span>
                    </Popout.Trigger>
                </Box>
                <BindingSettings layer={layer} prop={prop} write={write} setWrite={setWrite} />
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
            <Box style={{ paddingInlineStart: PANEL_GRID.PAD_LEFT, paddingInlineEnd: PANEL_GRID.PAD_RIGHT + 4 }}>
                <BindingPreview prop={prop} write={write} setWrite={setWrite} />
            </Box>
            {notes.map((n) => (
                <Note key={n} text={n} />
            ))}
            {over !== undefined && (
                <Note
                    text={`Painted over by ${over.name}`}
                    onClick={() => {
                        select(over.id);
                    }}
                />
            )}
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
}: {
    readonly prop: PropDef;
    readonly write: DerivedWrite;
    readonly setWrite: (write: Write | undefined) => void;
}): React.JSX.Element | null {
    const domain = domainOf(write.source);
    if (write.binding === "ramp" && prop.control === "color") {
        return (
            <RampRow
                label={`${prop.label} ramp`}
                variant="color"
                gradient={rampGradient(write.palette, write.reverse, write.steps)}
                min={String(write.domainMin ?? domain[0])}
                max={String(write.domainMax ?? domain[1])}
            />
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
    if (write.binding === "table") {
        const cats = categoriesOf(write.source);
        return (
            <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingBottom: 4 }}>
                {`${String(Object.keys(write.table ?? {}).length)} of ${String(cats.length)} categories set; the rest keep the layers beneath`}
            </Text>
        );
    }
    const cats = categoriesOf(write.source);
    if (prop.scheme === "shapes") {
        return (
            <Text size="xs" c={PANEL_INK.CHROME} style={{ paddingBottom: 4 }}>
                {cats
                    .slice(0, 4)
                    .map((c, i) => `${c.name}: ${["Icosphere", "Box", "Octahedron", "Cylinder"][i]}`)
                    .join(", ")}
            </Text>
        );
    }
    const palette = CATEGORY_PALETTES[write.palette] ?? CATEGORY_PALETTES["Okabe-Ito"];
    const shown = [...cats].sort((a, b) => a.n - b.n).slice(0, CHIP_LIMIT);
    return (
        <Group gap={4} style={{ minHeight: 24, paddingBottom: 4 }}>
            {shown.map((c) => {
                const override = write.overrides?.[c.n];
                return (
                    <Tooltip key={c.n} label={override === undefined ? c.name : `${c.name}: changed on its layer`}>
                        <Box style={{ position: "relative", display: "inline-flex" }}>
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
 * A value's range, as the domain ends the ramp prints.
 */
function domainOf(source: string): [number, number] {
    switch (source) {
        case "degree":
            return [1, 36];
        case "betweenness":
            return [0, 1140];
        case "step":
            return [1, 5];
        case "weight":
            return [1, 31];
        default:
            return [0, 1];
    }
}

/* ------------------------------------------------------------------------------------------ */
/* Binding popovers                                                                            */
/* ------------------------------------------------------------------------------------------ */

/**
 * The settings button of a derived row and the popover it opens: a ramp or a categories popover.
 */
function BindingSettings({
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
    const value = VALUES.find((v) => v.id === write.source);
    const title = `${prop.label} by ${value?.name ?? write.source}`;
    let fixAt: string | number = write.from ?? prop.floor;
    if (prop.control === "color") {
        fixAt =
            write.binding === "ramp"
                ? (RAMP_PALETTES[write.palette]?.[2] ?? "FEC44F")
                : (CATEGORY_PALETTES[write.palette]?.[0] ?? "E69F00");
    }
    const changed =
        write.scale !== "Linear" ||
        write.keep ||
        write.reverse ||
        write.noValue === "Paint" ||
        write.clampLow !== undefined ||
        write.combine !== "Replace";
    return (
        <Popout>
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
                    <Box
                        style={{ maxHeight: "min(400px, calc(100vh - 200px))", overflowY: "auto", overflowX: "hidden" }}
                    >
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
 * The ramp popover: histogram over ramp, look, scale, domain, missing values, combine.
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
    const bins = write.source === "betweenness" ? BETWEENNESS_BINS : DEGREE_BINS;
    const diverging = write.palette.includes("diverging");
    const stepped = write.steps !== undefined || write.scale === "Equal ranges" || write.scale === "Equal counts";
    const combines = prop.control === "color" ? COLOR_COMBINES : NUMBER_COMBINES;
    return (
        <Box>
            <ControlGroup label="Values">
                <Box style={{ padding: `4px ${String(PANEL_GRID.PAD_RIGHT)}px 4px ${String(PANEL_GRID.PAD_LEFT)}px` }}>
                    <VariablePill name={valueLabel(write.source)} kind="property" width={184} />
                </Box>
                <HistogramRow
                    label={`${valueLabel(write.source)} histogram`}
                    bins={bins.map((b) => ({ ...b }))}
                    minLabel={String(domain[0])}
                    maxLabel={String(domain[1])}
                />
                {prop.control === "color" ? (
                    <RampRow
                        label="Ramp"
                        variant="color"
                        gradient={rampGradient(write.palette, write.reverse, write.steps)}
                        min={String(write.domainMin ?? domain[0])}
                        max={String(write.domainMax ?? domain[1])}
                    />
                ) : (
                    <RampRow
                        label="Range"
                        variant="size"
                        min={`${String(write.from ?? 1)} ${prop.unit ?? ""}`}
                        max={`${String(write.to ?? 3)} ${prop.unit ?? ""}`}
                    />
                )}
            </ControlGroup>
            <ControlGroup label="Look">
                {prop.control === "color" ? (
                    <Group gap={4} wrap="nowrap" align="flex-end" style={{ padding: "0 8px 4px 16px" }}>
                        <Box style={{ flex: 1 }}>
                            <StyleSelect
                                label="Palette"
                                value={write.palette}
                                defaultValue="Yellow-orange-brown"
                                options={Object.keys(RAMP_PALETTES).map((p) => ({ value: p, label: p }))}
                                onChange={(p) => {
                                    set({ palette: p ?? "Yellow-orange-brown" });
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
            <ControlGroup label="Scale">
                <Box style={{ padding: "0 8px 4px 16px" }}>
                    <StyleSelect
                        label="Scale"
                        value={write.scale}
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
                    {stepped && (
                        <StyleNumberInput
                            label="Steps"
                            value={write.steps}
                            defaultValue={5}
                            min={2}
                            max={9}
                            onChange={(steps) => {
                                set({ steps });
                            }}
                        />
                    )}
                    {write.scale === "Power" && (
                        <StyleNumberInput
                            label="Exponent"
                            value={write.exponent}
                            defaultValue={2}
                            step={0.5}
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
                            onChange={(v) => {
                                set({ domainMin: Number(v) });
                            }}
                        />
                        <PanelField
                            label="Highest"
                            kind="number"
                            value={write.domainMax ?? null}
                            placeholder="Auto"
                            onChange={(v) => {
                                set({ domainMax: Number(v) });
                            }}
                        />
                    </FieldRow>
                </PanelLabelsProvider>
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
                            onChange={(v) => {
                                set({ clampLow: Number(v) });
                            }}
                        />
                        <PanelField
                            label="Clamp high"
                            kind="number"
                            unit="th"
                            value={write.clampHigh ?? null}
                            placeholder="None"
                            onChange={(v) => {
                                set({ clampHigh: Number(v) });
                            }}
                        />
                    </FieldRow>
                </PanelLabelsProvider>
            </ControlGroup>
            <ControlGroup label="No value">
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
                                defaultColor="#999999"
                                showOpacity={false}
                                onColorChange={(c) => {
                                    set({ noValueColor: strip(c) });
                                }}
                            />
                        </Box>
                    )}
                </Box>
            </ControlGroup>
            <ControlGroup label="Combine">
                <Box style={{ padding: "0 8px 8px 16px" }}>
                    <StyleSelect
                        label="Combine with the layers beneath"
                        value={write.combine}
                        defaultValue="Replace"
                        options={combines.map((c) => ({ value: c, label: c }))}
                        onChange={(c) => {
                            set({ combine: (c ?? "Replace") as Combine });
                        }}
                    />
                </Box>
            </ControlGroup>
        </Box>
    );
}

/**
 * The categories popover: scheme, category rows, Other, overflow, unmapped, combine, split.
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
    const { actions } = useMock();
    const [query, setQuery] = useState("");
    const set = (patch: Partial<DerivedWrite>): void => {
        setWrite({ ...write, ...patch });
    };
    const cats = categoriesOf(write.source).filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    const palette = CATEGORY_PALETTES[write.palette] ?? CATEGORY_PALETTES["Okabe-Ito"];
    let schemes: string[] = write.binding === "table" ? [] : Object.keys(CATEGORY_PALETTES);
    if (prop.scheme === "shapes") {
        schemes = SHAPE_SCHEMES;
    }
    const combines = prop.control === "color" ? COLOR_COMBINES : NUMBER_COMBINES;
    return (
        <Box>
            <ControlGroup label="Values">
                <Box style={{ padding: "4px 8px 4px 16px" }}>
                    <VariablePill name={valueLabel(write.source)} kind="property" width={184} />
                </Box>
                {schemes.length > 0 && (
                    <Group gap={4} wrap="nowrap" align="flex-end" style={{ padding: "0 8px 4px 16px" }}>
                        <Box style={{ flex: 1 }}>
                            <StyleSelect
                                label="Scheme"
                                value={write.palette}
                                defaultValue={schemes[0]}
                                options={schemes.map((s) => ({ value: s, label: s }))}
                                onChange={(p) => {
                                    set({ palette: p ?? schemes[0] });
                                }}
                            />
                        </Box>
                        {prop.scheme === "shapes" && <Gap gap="shapes" label="Shape scheme" />}
                    </Group>
                )}
            </ControlGroup>
            <ControlGroup label="Categories">
                {categoriesOf(write.source).length > CHIP_LIMIT && (
                    <Box style={{ padding: "0 8px 4px 16px" }}>
                        <SearchInput aria-label="Search categories" value={query} onChange={setQuery} />
                    </Box>
                )}
                {cats.slice(0, CHIP_LIMIT).map((c) => (
                    <DataRow
                        key={c.n}
                        name={c.name}
                        icon={
                            prop.scheme === "palette" ? (
                                <ColorSwatch
                                    color={HEX(write.overrides?.[c.n] ?? palette[(c.n - 1) % palette.length])}
                                    size={12}
                                    withShadow={false}
                                />
                            ) : undefined
                        }
                        value={write.binding === "table" ? String(write.table?.[c.n] ?? "--") : undefined}
                        trailing={<RankChip>{c.count}</RankChip>}
                    />
                ))}
                {write.palette === "Tol vibrant" && write.source === "group" && (
                    <DataRow name="Other" value="16% of nodes" trailing={<RankChip>12</RankChip>} />
                )}
            </ControlGroup>
            <ControlGroup label="More than the scheme holds">
                <Box style={{ padding: "0 8px 4px 16px" }}>
                    <StyleSelect
                        label="Overflow"
                        value={write.overflow}
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
                        value={write.otherThreshold}
                        defaultValue={1}
                        onChange={(v) => {
                            set({ otherThreshold: v ?? 1 });
                        }}
                    />
                    <StyleSelect
                        label="Order"
                        value={write.order}
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
            <ControlGroup label="Combine">
                <Box style={{ padding: "0 8px 8px 16px" }}>
                    <StyleSelect
                        label="Combine with the layers beneath"
                        value={write.combine}
                        defaultValue="Replace"
                        options={combines.map((c) => ({ value: c, label: c }))}
                        onChange={(c) => {
                            set({ combine: (c ?? "Replace") as Combine });
                        }}
                    />
                    {layer.kind === "layer" && (
                        <Group gap={4} wrap="nowrap" style={{ paddingTop: 8 }}>
                            <Button
                                variant="default"
                                size="compact-sm"
                                fullWidth
                                onClick={() => {
                                    actions.split(layer.id);
                                }}
                            >
                                Split into layers
                            </Button>
                            <Gap gap="split" label="Split into layers" />
                        </Group>
                    )}
                </Box>
            </ControlGroup>
        </Box>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Text: label entries and the tooltip                                                         */
/* ------------------------------------------------------------------------------------------ */

const EDGE_POSITIONS = ["On the line", "Above", "Below", "At source end", "At target end"];

/**
 * One label entry: settings, source, eye, minus; then size and position.
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
    const what = tooltip === true ? "tooltip" : "label";
    const endPosition = entry.position === "At source end" || entry.position === "At target end";
    const hasArrow = layer.ends.some(
        (e) => (entry.position === "At target end" ? e.end === "Head" : e.end === "Tail") && e.kind !== "None",
    );
    return (
        <Box className="spm-row" style={{ opacity: entry.hidden ? 0.6 : 1 }}>
            {tooltip === true && <RowCaption text="Tooltip" />}
            <Box style={rowStyle}>
                <LabelSettings entry={entry} onEntry={onEntry} what={what} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                    {entry.source.kind === "value" ? (
                        <Popout opened={pickerOpen} onOpenChange={setPickerOpen}>
                            <Popout.Trigger>
                                <span style={{ display: "inline-flex", maxWidth: "100%" }}>
                                    <VariablePill
                                        name={valueLabel(entry.source.value)}
                                        kind="property"
                                        width={124}
                                        glyph={<Type size={10} />}
                                    />
                                </span>
                            </Popout.Trigger>
                            <Popout.Panel
                                width={PANEL_GRID.POPOVER_WIDTH}
                                header={{ variant: "title", title: `${what === "label" ? "Label" : "Tooltip"} text` }}
                                placement="left"
                            >
                                <Popout.Content>
                                    <ValuePickerList
                                        allowWords
                                        current={entry.source.value}
                                        reasonFor={(v) =>
                                            v.on !== "both" &&
                                            layer.rule.matches !== "both" &&
                                            v.on !== layer.rule.matches
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
            {tooltip !== true && (
                <Box style={{ ...rowStyle, alignItems: "flex-start", paddingBottom: 4 }}>
                    <SlotSpacer />
                    <Group gap={0} wrap="nowrap" style={{ flex: "0 0 88px" }}>
                        <PanelField
                            label="Label size"
                            kind="number"
                            width={PANEL_GRID.FIELD}
                            glyph="sizeLargest"
                            unit="px"
                            value={entry.size}
                            onChange={(v) => {
                                onEntry({ ...entry, size: Number(v) });
                            }}
                        />
                    </Group>
                    <VaryGlyph reason={LOOK_VARY_REASON} label="label size" />
                    {onEdges ? (
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <PanelField
                                label="Position"
                                kind="select"
                                width="fill"
                                data={EDGE_POSITIONS}
                                value={entry.position}
                                onChange={(v) => {
                                    onEntry({ ...entry, position: String(v) });
                                }}
                            />
                        </Box>
                    ) : (
                        <AlignmentMatrix
                            label="Label position"
                            value={entry.position as AlignmentMatrixValue}
                            onChange={(v) => {
                                onEntry({ ...entry, position: v });
                            }}
                        />
                    )}
                </Box>
            )}
            {endPosition && !hasArrow && <Note neutral text="Needs an arrow at this end" />}
            {entry.source.kind === "value" && valueLabel(entry.source.value).startsWith("step") && (
                <Note text="Numbers draw unformatted" />
            )}
        </Box>
    );
}

/**
 * The label settings popover: colors, then captioned groups that open and close.
 */
function LabelSettings({
    entry,
    onEntry,
    what,
}: {
    readonly entry: LabelEntry;
    readonly onEntry: (entry: LabelEntry) => void;
    readonly what: string;
}): React.JSX.Element {
    const changed = entry.textColor !== undefined || entry.background !== undefined;
    return (
        <Popout>
            <Popout.Trigger>
                <AdvancedButton label={`${what === "label" ? "Label" : "Tooltip"} settings`} changed={changed} />
            </Popout.Trigger>
            <Popout.Panel
                width={PANEL_GRID.POPOVER_WIDTH}
                header={{ variant: "title", title: what === "label" ? "Label settings" : "Tooltip settings" }}
                placement="left"
            >
                <Popout.Content>
                    <Box
                        style={{ maxHeight: "min(400px, calc(100vh - 200px))", overflowY: "auto", overflowX: "hidden" }}
                    >
                        <Box style={{ padding: "4px 8px 4px 16px" }}>
                            <Group gap={4} wrap="nowrap" align="flex-end">
                                <Box style={{ flex: 1 }}>
                                    <CompactColorInput
                                        label="Text color"
                                        color={entry.textColor === undefined ? undefined : HEX(entry.textColor)}
                                        defaultColor="#FFFFFF"
                                        showOpacity={false}
                                        onColorChange={(c) => {
                                            onEntry({ ...entry, textColor: strip(c) });
                                        }}
                                    />
                                </Box>
                                <VaryGlyph reason={LOOK_VARY_REASON} label="text color" />
                            </Group>
                            <Group gap={4} wrap="nowrap" align="flex-end">
                                <Box style={{ flex: 1 }}>
                                    <CompactColorInput
                                        label="Background"
                                        color={entry.background === undefined ? undefined : HEX(entry.background)}
                                        defaultColor="#000000"
                                        defaultOpacity={60}
                                        onColorChange={(c) => {
                                            onEntry({ ...entry, background: strip(c) });
                                        }}
                                    />
                                </Box>
                                <VaryGlyph reason={LOOK_VARY_REASON} label="background" />
                            </Group>
                            <Gap gap="looks" label="Label looks" />
                        </Box>
                        <ControlSubGroup label="Type" defaultOpened={false}>
                            <StyleSelect
                                label="Font"
                                defaultValue="Inter"
                                options={["Inter", "Roboto", "System UI", "Serif"].map((f) => ({ value: f, label: f }))}
                            />
                            <StyleSelect
                                label="Weight"
                                defaultValue="Regular"
                                options={["Regular", "Medium", "Bold"].map((f) => ({ value: f, label: f }))}
                            />
                            <StyleNumberInput label="Line height" defaultValue={1.2} step={0.1} decimalScale={1} />
                            <StyleSelect
                                label="Alignment"
                                defaultValue="Center"
                                options={["Left", "Center", "Right"].map((f) => ({ value: f, label: f }))}
                            />
                        </ControlSubGroup>
                        <ControlSubGroup label="Box" defaultOpened={false}>
                            <StyleNumberInput label="Padding" defaultValue={4} suffix="px" />
                            <StyleNumberInput label="Corners" defaultValue={4} suffix="px" />
                            <ToggleRow label="Border" control="switch" defaultChecked={false} />
                            <ToggleRow label="Gradient" control="switch" defaultChecked={false} />
                        </ControlSubGroup>
                        <ControlSubGroup label="Letters" defaultOpened={false}>
                            <ToggleRow label="Outline" control="switch" defaultChecked={false} />
                            <ToggleRow label="Shadow" control="switch" defaultChecked={false} />
                        </ControlSubGroup>
                        <ControlSubGroup label="Placement" defaultOpened={false}>
                            <StyleNumberInput label="Offset" defaultValue={0} suffix="px" />
                            <StyleNumberInput label="Priority" defaultValue={0} />
                            <ToggleRow label="Pointer" control="switch" defaultChecked={false} />
                        </ControlSubGroup>
                        <ControlSubGroup label="Motion and distance" defaultOpened={false}>
                            <StyleSelect
                                label="Animation"
                                defaultValue="None"
                                options={["None", "Pulse", "Bounce", "Shake", "Glow", "Fill"].map((f) => ({
                                    value: f,
                                    label: f,
                                }))}
                            />
                            <ToggleRow label="Fade with distance" control="switch" defaultChecked={false} />
                        </ControlSubGroup>
                        <ControlSubGroup label="Badge" defaultOpened={false}>
                            <StyleSelect
                                label="Preset"
                                defaultValue="None"
                                options={["None", "Count", "Notification", "Label", "Progress"].map((f) => ({
                                    value: f,
                                    label: f,
                                }))}
                            />
                            <ToggleRow label="Shorten numbers" control="switch" defaultChecked={false} />
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

/**
 * One effect entry: settings, its color (speed for Motion), eye, minus.
 */
function EffectRow({
    layer,
    entry,
    index,
    count,
    onEntry,
    onRemove,
    onMove,
}: {
    readonly layer: MockLayer;
    readonly entry: EffectEntry;
    readonly index: number;
    readonly count: number;
    readonly onEntry: (entry: EffectEntry) => void;
    readonly onRemove: () => void;
    readonly onMove: (delta: number) => void;
}): React.JSX.Element {
    return (
        <ContextMenu
            target={
                <Box className="spm-row" style={{ opacity: entry.hidden ? 0.6 : 1 }}>
                    <RowCaption text={entry.type} />
                    <Box style={rowStyle}>
                        {entry.type === "Glow" ? (
                            <Popout>
                                <Popout.Trigger>
                                    <AdvancedButton label="Glow settings" changed={(entry.strength ?? 1) !== 1} />
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={PANEL_GRID.POPOVER_WIDTH}
                                    header={{ variant: "title", title: "Glow" }}
                                    placement="left"
                                >
                                    <Popout.Content>
                                        <Box style={{ padding: "4px 8px 8px 16px" }}>
                                            <StyleNumberInput
                                                label="Strength"
                                                value={entry.strength}
                                                defaultValue={1}
                                                step={0.25}
                                                min={0}
                                                onChange={(strength) => {
                                                    onEntry({ ...entry, strength });
                                                }}
                                            />
                                        </Box>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        ) : (
                            <SlotSpacer />
                        )}
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            {entry.type === "Motion" ? (
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
                            ) : (
                                <CompactColorInput
                                    color={entry.color === undefined ? undefined : HEX(entry.color)}
                                    defaultColor="#FFD54F"
                                    showOpacity={false}
                                    showReset={false}
                                    width="100%"
                                    onColorChange={(c) => {
                                        onEntry({ ...entry, color: strip(c) });
                                    }}
                                />
                            )}
                        </Box>
                        <Eye
                            hidden={entry.hidden}
                            target={`${entry.type.toLowerCase()} on ${layer.name}`}
                            onToggle={(hidden) => {
                                onEntry({ ...entry, hidden });
                            }}
                        />
                        <Minus target={`${entry.type.toLowerCase()} from ${layer.name}`} onRemove={onRemove} />
                    </Box>
                    {entry.type === "Motion" && <Note neutral text={MOTION_NOTE} />}
                </Box>
            }
        >
            <Menu.Item
                disabled={index === 0}
                onClick={() => {
                    onMove(-1);
                }}
            >
                Move up
            </Menu.Item>
            <Menu.Item
                disabled={index === count - 1}
                onClick={() => {
                    onMove(1);
                }}
            >
                Move down
            </Menu.Item>
            {entry.type !== "Motion" && (
                <Menu.Item disabled title={RING_REASON}>
                    Add a ring
                </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item onClick={onRemove}>Remove</Menu.Item>
        </ContextMenu>
    );
}

/**
 * One arrow end: settings (size, color, opacity, caption), kind, eye, minus.
 */
function EndRow({
    layer,
    entry,
    onEntry,
    onRemove,
}: {
    readonly layer: MockLayer;
    readonly entry: EndEntry;
    readonly onEntry: (entry: EndEntry) => void;
    readonly onRemove: () => void;
}): React.JSX.Element {
    const hasCap = entry.kind !== "None";
    return (
        <Box className="spm-row" style={{ opacity: entry.hidden ? 0.6 : 1 }}>
            <RowCaption text={entry.end === "Head" ? "Head (target end)" : "Tail (source end)"} />
            <Box style={rowStyle}>
                {hasCap ? (
                    <Popout>
                        <Popout.Trigger>
                            <AdvancedButton label={`${entry.end} settings`} changed={entry.color !== undefined} />
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
                                    <StyleNumberInput
                                        label="Size"
                                        value={entry.size}
                                        defaultValue={1}
                                        step={0.25}
                                        onChange={(size) => {
                                            onEntry({ ...entry, size });
                                        }}
                                    />
                                    {entry.color === undefined ? (
                                        <Group justify="space-between" style={{ minHeight: 32 }}>
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
                                    <StyleNumberInput
                                        label="Opacity"
                                        suffix="%"
                                        value={entry.opacity}
                                        defaultValue={100}
                                        onChange={(opacity) => {
                                            onEntry({ ...entry, opacity });
                                        }}
                                    />
                                    <TextInput
                                        size="xs"
                                        label="Caption"
                                        placeholder="No caption"
                                        value={entry.caption ?? ""}
                                        onChange={(event) => {
                                            onEntry({ ...entry, caption: event.currentTarget.value });
                                        }}
                                    />
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                ) : (
                    <SlotSpacer />
                )}
                <Box style={{ flex: 1, minWidth: 0 }}>
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
                </Box>
                <Eye
                    hidden={entry.hidden}
                    target={`${entry.end.toLowerCase()} on ${layer.name}`}
                    onToggle={(hidden) => {
                        onEntry({ ...entry, hidden });
                    }}
                />
                <Minus target={`${entry.end.toLowerCase()} from ${layer.name}`} onRemove={onRemove} />
            </Box>
            {hasCap && entry.color === undefined && (
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
                        style={{ display: "inline-block", width: 1, height: 24 }}
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
    const { matches } = layer.rule;
    const reachable = section.props.filter((p) => reaches(matches, PROPS[p].on));
    const inheritedOf = (p: PropId): Write | undefined => {
        if (parent === undefined || layer.child === undefined) {
            return undefined;
        }
        const pw = parent.props[p];
        if (pw?.mode === "derived" && pw.binding === "categories" && p === "nodeColor") {
            return fixed(layer.child.chit);
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
    const items: AddItem[] = [];
    let sectionActions: React.ReactNode = null;

    if (section.id === "text") {
        rows = layer.labels.map((entry) => (
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
        if (layer.tooltip !== undefined) {
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
        items.push(
            layer.labels.length > 0
                ? { label: "Label", reason: ONE_LABEL_REASON }
                : {
                      label: "Label",
                      onClick: () => {
                          patch((l) => ({
                              ...l,
                              labels: [
                                  {
                                      id: newId("label"),
                                      source: { kind: "value", value: "name" },
                                      size: 24,
                                      position: matches === "edge" ? "On the line" : "top-center",
                                      hidden: false,
                                  },
                              ],
                          }));
                      },
                  },
        );
        if (layer.tooltip === undefined) {
            items.push(
                matches === "edge"
                    ? { label: "Tooltip", reason: "Edges cannot be hovered today, so they show no tooltip" }
                    : {
                          label: "Tooltip",
                          onClick: () => {
                              patch((l) => ({
                                  ...l,
                                  tooltip: {
                                      id: newId("tooltip"),
                                      source: { kind: "value", value: "name" },
                                      size: 12,
                                      position: "top-center",
                                      hidden: false,
                                  },
                              }));
                          },
                      },
            );
        }
    } else if (section.id === "effects") {
        const types: EffectType[] = [
            ...(reaches(matches, "node") ? (["Outline", "Glow"] as const) : []),
            ...(reaches(matches, "edge") ? (["Motion"] as const) : []),
        ];
        rows = layer.effects.map((entry, index) => (
            <EffectRow
                key={entry.id}
                layer={layer}
                entry={entry}
                index={index}
                count={layer.effects.length}
                onEntry={(next) => {
                    patch((l) => ({ ...l, effects: l.effects.map((e) => (e.id === next.id ? next : e)) }));
                }}
                onRemove={() => {
                    patch((l) => ({ ...l, effects: l.effects.filter((e) => e.id !== entry.id) }));
                }}
                onMove={(delta) => {
                    patch((l) => {
                        const list = [...l.effects];
                        const [moved] = list.splice(index, 1);
                        list.splice(index + delta, 0, moved);
                        return { ...l, effects: list };
                    });
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
                            effects: [
                                ...l.effects,
                                type === "Motion"
                                    ? { id: newId("effect"), type, speed: 1, hidden: false }
                                    : {
                                          id: newId("effect"),
                                          type,
                                          color: type === "Glow" ? "FFD54F" : "0D99FF",
                                          strength: 1,
                                          hidden: false,
                                      },
                            ],
                        }));
                    },
                });
            }
        }
        if (reaches(matches, "node")) {
            items.push({ label: "Add a ring", reason: RING_REASON });
        }
    } else if (section.id === "ends") {
        rows = layer.ends.map((entry) => (
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
            />
        ));
        for (const end of ["Head", "Tail"] as const) {
            if (!layer.ends.some((e) => e.end === end)) {
                items.push({
                    label: end === "Head" ? "Head (target end)" : "Tail (source end)",
                    onClick: () => {
                        patch((l) => ({
                            ...l,
                            ends: [...l.ends, { id: newId("end"), end, kind: "Normal", hidden: false }],
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
                    showLabel: shown.length > 1 || PROPS[p].label !== section.title,
                }}
            />
        ));
        for (const p of reachable) {
            if (!shown.includes(p) || (layer.props[p] === undefined && inheritedOf(p) !== undefined)) {
                if (shown.includes(p) && inheritedOf(p) !== undefined) {
                    continue;
                }
                items.push({
                    label: PROPS[p].label,
                    onClick: () => {
                        update(layer.id, (l) => ({ ...l, pending: [...l.pending, p] }));
                    },
                });
            }
        }
        if (section.id === "stroke" && layer.line !== undefined) {
            sectionActions = <LineSettings layer={layer} />;
        }
    }

    if (items.filter((i) => i.onClick !== undefined).length === 0 && rows.length > 0 && section.id !== "text") {
        items.push({
            label: "Add layer above, scoped like this one",
            onClick: () => {
                actions.addAbove(layer.id, layer.rule);
            },
        });
    }

    const empty = rows.length === 0;
    const lineNotes =
        section.id === "stroke" && layer.line !== undefined
            ? [
                  layer.line.pattern !== "Solid" ? `${layer.line.pattern} pattern` : undefined,
                  layer.line.curved ? "Curved" : undefined,
              ].filter((n) => n !== undefined)
            : [];
    const info =
        section.id === "text" && layer.labels.length > 0 ? (
            <Text size="xs">Not drawable today. {GAPS.slots}</Text>
        ) : undefined;

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
                    <>
                        {sectionActions}
                        <SectionAdd
                            section={section.title}
                            items={items}
                            opened={menuOpen}
                            setOpened={setMenuOpen}
                            hidden={empty}
                        />
                    </>
                )
            }
        >
            {empty ? null : (
                <>
                    {rows}
                    {lineNotes.map((n) => (
                        <Note key={n} text={n} />
                    ))}
                </>
            )}
        </ControlSection>
    );
}

/**
 * The Stroke section's settings: pattern, pattern count, curved.
 */
function LineSettings({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const { update } = useMock();
    const line = layer.line ?? { pattern: "Solid", curved: false };
    const set = (patch: Partial<NonNullable<MockLayer["line"]>>): void => {
        update(layer.id, (l) => ({ ...l, line: { ...line, ...patch } }));
    };
    const counted = !["Solid", "Sine wave", "Zigzag"].includes(line.pattern);
    return (
        <Popout>
            <Popout.Trigger>
                <AdvancedButton label="Line settings" changed={line.pattern !== "Solid" || line.curved} />
            </Popout.Trigger>
            <Popout.Panel
                width={PANEL_GRID.POPOVER_WIDTH}
                header={{ variant: "title", title: "Line" }}
                placement="left"
            >
                <Popout.Content>
                    <Box style={{ padding: "4px 8px 8px 16px" }}>
                        <StyleSelect
                            label="Pattern"
                            value={line.pattern}
                            defaultValue="Solid"
                            options={PATTERNS.map((p) => ({ value: p, label: p }))}
                            onChange={(p) => {
                                set({ pattern: p ?? "Solid" });
                            }}
                        />
                        {counted && (
                            <StyleNumberInput
                                label="Pattern count"
                                value={line.patternCount}
                                defaultValue={8}
                                min={2}
                                onChange={(patternCount) => {
                                    set({ patternCount });
                                }}
                            />
                        )}
                    </Box>
                    <ToggleRow
                        label="Curved"
                        control="switch"
                        checked={line.curved}
                        onChange={(curved) => {
                            set({ curved });
                        }}
                    />
                    {line.curved && line.pattern !== "Solid" && (
                        <Text size="xs" c={PANEL_INK.CHROME} style={{ padding: "0 8px 8px 16px" }}>
                            A curved edge draws solid: patterns are not drawn on curves.
                        </Text>
                    )}
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/* ------------------------------------------------------------------------------------------ */
/* Which elements and Split by                                                                 */
/* ------------------------------------------------------------------------------------------ */

const COMPARISONS = ["is", "is not", "is more than", "is less than"];
const SETS = ["the route", "Community 3", "the selection"];
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
                operand: set,
            };
        case "selected":
            return { kind, words: "Selected elements", count: "2 nodes", matches: "both" };
        default:
            return { kind: "hovered", words: "Hovered element", count: "1 node", matches: "both" };
    }
}

/**
 * Which elements: the rule in words and its count; click to edit it in place.
 */
function WhichElements({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const { update, showGaps } = useMock();
    const draft = layer.rule.kind === "draft";
    const [editing, setEditing] = useState(draft);
    const [ands, setAnds] = useState(0);
    const { rule } = layer;
    const readOnly = layer.kind === "child";
    const setRule = (next: Rule): void => {
        update(layer.id, (l) => ({ ...l, rule: next }));
    };
    const kind = rule.kind === "draft" ? undefined : rule.kind;
    const gap = (rule.kind === "selected" || rule.kind === "hovered") && showGaps;

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
                <Box style={{ padding: "0 8px 4px 16px" }}>
                    <StyleSelectAutofocus
                        autoFocus={draft}
                        value={kind}
                        onChange={(k) => {
                            setRule(ruleFor(k));
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
                                        value={rule.comparison}
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
                            value={rule.operand}
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
                                setEditing(false);
                            }}
                        >
                            Done
                        </Button>
                    </Group>
                </Box>
            ) : (
                <UnstyledButton
                    aria-label={
                        readOnly ? `${rule.parentPart ?? ""} ${rule.words}` : `Edit which elements: ${rule.words}`
                    }
                    disabled={readOnly}
                    onClick={() => {
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
 * The kind-of-rule select, focused when a new layer opens.
 */
function StyleSelectAutofocus({
    autoFocus,
    value,
    onChange,
}: {
    readonly autoFocus: boolean;
    readonly value: RuleKind | undefined;
    readonly onChange: (kind: RuleKind) => void;
}): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (autoFocus) {
            ref.current?.querySelector("input")?.focus();
        }
    }, [autoFocus]);
    return (
        <Box ref={ref}>
            <StyleSelect
                label="Kind of rule"
                value={value}
                defaultValue="Choose..."
                options={[
                    { value: "Choose...", label: "Choose..." },
                    ...RULE_KINDS.map((k) => ({ value: k.value, label: k.label })),
                ]}
                onChange={(k) => {
                    if (k !== undefined && k !== "Choose...") {
                        onChange(k as RuleKind);
                    }
                }}
            />
        </Box>
    );
}

/**
 * Split by, on a split parent: the value it splits on and the scheme its children start from.
 */
function SplitBy({ layer }: { readonly layer: MockLayer }): React.JSX.Element | null {
    const { update, showGaps } = useMock();
    if (layer.split === undefined) {
        return null;
    }
    const { split } = layer;
    const palette = CATEGORY_PALETTES[split.scheme] ?? CATEGORY_PALETTES["Okabe-Ito"];
    return (
        <ControlSection
            label="Split by"
            collapsible={false}
            info={showGaps ? <Text size="xs">Not drawable today. {GAPS.split}</Text> : undefined}
        >
            <Box style={rowStyle}>
                <VariablePill name={valueLabel(split.value)} kind="property" width={184} />
            </Box>
            <Box style={{ padding: "0 8px 4px 16px" }}>
                <StyleSelect
                    label="Fill scheme"
                    value={split.scheme}
                    defaultValue="Okabe-Ito"
                    options={Object.keys(CATEGORY_PALETTES).map((p) => ({ value: p, label: p }))}
                    onChange={(scheme) => {
                        update(layer.id, (l) => {
                            const s = scheme ?? "Okabe-Ito";
                            const { nodeColor } = l.props;
                            return {
                                ...l,
                                split: { value: split.value, scheme: s },
                                props:
                                    nodeColor?.mode === "derived"
                                        ? { ...l.props, nodeColor: { ...nodeColor, palette: s } }
                                        : l.props,
                            };
                        });
                    }}
                />
                <Group gap={2} style={{ paddingTop: 4 }} aria-label={`${split.scheme} swatches`}>
                    {palette.map((c) => (
                        <ColorSwatch key={c} color={HEX(c)} size={12} radius={2} withShadow={false} />
                    ))}
                </Group>
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
            ...kid.labels.flatMap((l) => [l.textColor, l.background].filter((c) => c !== undefined)),
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
 * A caption over a group of rows in the Values tab.
 */
function Caption({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
    return (
        <Text size="xs" fw={600} c={PANEL_INK.CHROME} style={{ padding: "12px 8px 4px 16px" }}>
            {children}
        </Text>
    );
}

/**
 * The painted counts of a layer: how much of what each property writes reaches the canvas.
 */
function PaintedCounts({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const key = layer.id === "community3" ? "community3" : layer.id;
    const rows =
        PAINTED[key] ??
        Object.keys(layer.props).map((p): readonly [string, string] => [
            PROPS[p as PropId].label,
            layer.rule.count === "" ? "--" : `all of ${layer.rule.count}`,
        ]);
    return (
        <>
            <Caption>Painted</Caption>
            {rows.length === 0 ? (
                <ProseBlock variant="reading">Writes nothing yet</ProseBlock>
            ) : (
                rows.map(([name, value]) => <DataRow key={name} name={name} value={value} />)
            )}
        </>
    );
}

/**
 * The values a layer reads, with when they were computed.
 */
function ValuesRead({ ids, note }: { readonly ids: readonly string[]; readonly note?: string }): React.JSX.Element {
    return (
        <>
            <Caption>Values read</Caption>
            {ids.length === 0 ? (
                <Box style={{ padding: "0 8px 0 16px" }}>
                    <ProseBlock variant="reading">None</ProseBlock>
                </Box>
            ) : (
                ids.map((id) => {
                    const v = VALUES.find((x) => x.id === id);
                    return (
                        <DataRow
                            key={id}
                            name={valueLabel(id)}
                            icon={v ? LEVEL_GLYPH[v.level] : undefined}
                            value={note ?? v?.state}
                        />
                    );
                })
            )}
        </>
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
 * The Values tab: facts about what a layer reads and paints.
 */
function ValuesTab({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    const { select, layers } = useMock();
    const [query, setQuery] = useState("");
    switch (layer.values) {
        case "everything":
            return (
                <>
                    <Caption>Matched</Caption>
                    <DataRow name="Nodes" value="77" stat />
                    <DataRow name="Edges" value="254" stat />
                    <ValuesRead ids={[]} />
                    <PaintedCounts layer={layer} />
                </>
            );
        case "selected":
            return (
                <>
                    <ValuesRead ids={["selected"]} note="this view only" />
                    <Caption>Selected now</Caption>
                    <DataRow name="Valjean" value="node" onClick={() => undefined} />
                    <DataRow name="Javert" value="node" onClick={() => undefined} />
                    <PaintedCounts layer={layer} />
                </>
            );
        case "hovered":
            return (
                <>
                    <ValuesRead ids={["hovered"]} note="this view only" />
                    <Caption>Hovered now</Caption>
                    <Box style={{ padding: "0 8px 0 16px" }}>
                        <ProseBlock variant="reading">Nothing hovered</ProseBlock>
                    </Box>
                    <PaintedCounts layer={layer} />
                </>
            );
        case "louvain":
            return (
                <>
                    <ValuesRead ids={["group"]} />
                    <Caption>Group sizes</Caption>
                    {[...COMMUNITIES]
                        .sort((a, b) => b.size - a.size)
                        .map((c) => (
                            <DataRow
                                key={c.n}
                                name={`Community ${String(c.n)}`}
                                icon={
                                    <ColorSwatch
                                        color={HEX(childColor(layers[`community${String(c.n)}`] ?? layer))}
                                        size={12}
                                        withShadow={false}
                                    />
                                }
                                trailing={<RankChip>{c.size}</RankChip>}
                                onClick={() => {
                                    select(`community${String(c.n)}`);
                                }}
                            />
                        ))}
                    <Caption>Last re-run</Caption>
                    <Box style={{ padding: "0 8px 0 16px" }}>
                        <ProseBlock variant="reading">
                            Ran 2 minutes ago. All 6 communities matched; Community 3 kept its override.
                        </ProseBlock>
                    </Box>
                    <PaintedCounts layer={layer} />
                </>
            );
        case "community": {
            const c = COMMUNITIES.find((x) => x.n === layer.child?.group) ?? COMMUNITIES[0];
            const members = c.members.filter((m) => m.toLowerCase().includes(query.toLowerCase()));
            return (
                <>
                    <Caption>{`Members: ${String(c.size)}`}</Caption>
                    <Box style={{ padding: "0 8px 4px 16px" }}>
                        <SearchInput
                            aria-label="Search members"
                            placeholder="Search members"
                            value={query}
                            onChange={setQuery}
                        />
                    </Box>
                    {members.map((m) => (
                        <DataRow key={m} name={m} onClick={() => undefined} />
                    ))}
                    {c.members.length < c.size && query === "" && (
                        <Text size="xs" c={PANEL_INK.CHROME} style={{ padding: "0 8px 0 16px" }}>
                            {`${String(c.size - c.members.length)} more`}
                        </Text>
                    )}
                    <Caption>Share</Caption>
                    <DataRow name="Of the graph's nodes" value={`${String(Math.round((c.size / 77) * 100))}%`} stat />
                    <Caption>Last re-run</Caption>
                    <Box style={{ padding: "0 8px 0 16px" }}>
                        <ProseBlock variant="reading">{`Matched by ${String(c.size - 1)} of its ${String(c.size)} members.`}</ProseBlock>
                    </Box>
                    <PaintedCounts layer={layer} />
                </>
            );
        }
        case "degree":
            return (
                <>
                    <ValuesRead ids={["degree"]} />
                    <Caption>Degree, log-log</Caption>
                    <Padded>
                        <HistogramRow
                            label="Degree histogram, log-log axes"
                            bins={DEGREE_BINS.map((b) => ({ ...b }))}
                            minLabel="1"
                            maxLabel="36"
                        />
                    </Padded>
                    <DataRow name="With no edges" value="0" stat />
                    <Padded>
                        <MetricRow name="Minimum" percentile={0} value="1" />
                    </Padded>
                    <Padded>
                        <MetricRow name="Median" percentile={50} value="6" />
                    </Padded>
                    <Padded>
                        <MetricRow name="Maximum" percentile={100} value="36" rank="Valjean" />
                    </Padded>
                    <PaintedCounts layer={layer} />
                </>
            );
        case "route":
            return (
                <>
                    <ValuesRead ids={["onRoute", "step"]} />
                    <Caption>Route</Caption>
                    {ROUTE.map((name, i) => (
                        <DataRow
                            key={name}
                            name={name}
                            icon={<Text size="xs">{i + 1}</Text>}
                            onClick={() => undefined}
                        />
                    ))}
                    <DataRow name="Length" value="4 edges" stat />
                    <DataRow name="Total weight" value="11" stat />
                    <PaintedCounts layer={layer} />
                </>
            );
        case "betweenness":
            return (
                <>
                    <ValuesRead ids={["betweenness"]} />
                    <Caption>Edge betweenness, 5 steps</Caption>
                    <Padded>
                        <HistogramRow
                            label="Edge betweenness histogram"
                            bins={BETWEENNESS_BINS.map((b) => ({ ...b }))}
                            minLabel="0"
                            maxLabel="1,140"
                        />
                    </Padded>
                    {BETWEENNESS_BINS.map((b, i) => (
                        <DataRow
                            key={b.label}
                            name={`Step ${String(i + 1)}: ${b.label.split(":")[0]}`}
                            trailing={<RankChip>{b.count}</RankChip>}
                        />
                    ))}
                    <Padded>
                        <MetricRow name="Minimum" percentile={0} value="0.5" />
                    </Padded>
                    <Padded>
                        <MetricRow name="Maximum" percentile={100} value="1,140" />
                    </Padded>
                    <PaintedCounts layer={layer} />
                </>
            );
        case "keyPeople":
            return (
                <>
                    <ValuesRead ids={["name"]} />
                    <Caption>Found</Caption>
                    <DataRow name="Named nodes found" value="5 of 5" stat />
                    <Caption>Labels</Caption>
                    <DataRow name="Labeled" value="5" stat />
                    <DataRow name="Drawn" value="5" stat />
                    <DataRow name="Hidden by overlap" value="0" stat />
                    <PaintedCounts layer={layer} />
                </>
            );
        case "topTen":
            return (
                <>
                    <ValuesRead ids={["degree", "name"]} />
                    <Caption>Top 10 by degree</Caption>
                    {TOP_TEN.map(([name, degree]) => (
                        <DataRow key={name} name={name} trailing={<RankChip>{degree}</RankChip>} />
                    ))}
                    <Caption>Labels</Caption>
                    <DataRow name="Labeled" value="10" stat />
                    <DataRow name="Drawn" value="7" stat />
                    <DataRow name="Hidden by overlap" value="3" stat />
                    <PaintedCounts layer={layer} />
                </>
            );
        case "folder":
            return (
                <>
                    <Caption>Values its layers read</Caption>
                    <DataRow name="degree" icon={LEVEL_GLYPH.number} value="Top 10 labels" />
                    <DataRow name="name" icon={LEVEL_GLYPH.text} value="Key people, Top 10 labels" />
                </>
            );
        default:
            return (
                <>
                    <Caption>Matched</Caption>
                    <DataRow name="Elements" value={layer.rule.count === "" ? "--" : layer.rule.count} stat />
                    <ValuesRead
                        ids={Object.values(layer.props).flatMap((w) => (w?.mode === "derived" ? [w.source] : []))}
                    />
                    <PaintedCounts layer={layer} />
                </>
            );
    }
}

/* ------------------------------------------------------------------------------------------ */
/* The right panel                                                                             */
/* ------------------------------------------------------------------------------------------ */

/**
 * The right panel: Style and Values tabs, the header, and the selected row's sections.
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
                <Box style={{ padding: 16 }}>
                    <ProseBlock variant="reading">Select a layer to edit it.</ProseBlock>
                </Box>
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
                            <Text size="xs" fw={600} c={PANEL_INK.VALUE} truncate>
                                {layer.name}
                            </Text>
                        </UnstyledButton>
                    )}
                </Box>
                {layer.pin !== undefined && (
                    <Tooltip label={`Pinned to the ${layer.pin}`}>
                        <Box style={{ display: "inline-flex", color: PANEL_INK.CHROME }}>
                            <UiGlyph name="pin" size={PANEL_GRID.GLYPH} />
                        </Box>
                    </Tooltip>
                )}
                {(layer.pin !== undefined || layer.kind === "folder") && (
                    <Gap gap="tree" label="Pins, folders and locks" />
                )}
                <PressToggle
                    label={`Lock ${layer.name}`}
                    checked={layer.locked}
                    icon={<UiGlyph name="unlock" size={PANEL_GRID.GLYPH} />}
                    checkedIcon={<UiGlyph name="lock" size={PANEL_GRID.GLYPH} />}
                    onToggle={(locked) => {
                        update(layer.id, (l) => ({ ...l, locked }));
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
 * layer's controls are disabled with the reason.
 */
function StyleTab({ layer }: { readonly layer: MockLayer }): React.JSX.Element {
    if (layer.kind === "folder") {
        return (
            <fieldset disabled={layer.locked} style={fieldsetStyle} title={layer.locked ? LOCKED_REASON : undefined}>
                <FolderPanel layer={layer} />
            </fieldset>
        );
    }
    const draft = layer.rule.kind === "draft";
    return (
        <Box key={layer.id}>
            {layer.locked && (
                <Box style={{ padding: "8px 8px 0 16px" }}>
                    <ProseBlock variant="departure">This layer is locked. Unlock it to change it.</ProseBlock>
                </Box>
            )}
            <fieldset disabled={layer.locked} style={fieldsetStyle} title={layer.locked ? LOCKED_REASON : undefined}>
                <WhichElements layer={layer} />
                <SplitBy layer={layer} />
                {draft && (
                    <Box style={{ padding: "8px 8px 4px 16px" }}>
                        <ProseBlock variant="reading">Choose which elements, then set a property</ProseBlock>
                    </Box>
                )}
                {SECTIONS.filter((s) => reaches(layer.rule.matches, s.on)).map((s) => (
                    <Section key={s.id} layer={layer} section={s} draft={draft} />
                ))}
            </fieldset>
        </Box>
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

/**
 * The whole mock: tree, an empty canvas between, and the style panel.
 */
function StylePanelMock(): React.JSX.Element {
    const [layers, setLayers] = useState<Record<string, MockLayer>>(INITIAL_LAYERS);
    const [tree, setTree] = useState<readonly TreeShape[]>(INITIAL_TREE);
    const [selectedId, setSelectedId] = useState<string | null>("degree");
    const [tab, setTab] = useState("style");
    const [showGaps, setShowGaps] = useState(true);
    const [renamingId, setRenamingId] = useState<string | null>(null);

    const update = (id: string, fn: (layer: MockLayer) => MockLayer): void => {
        setLayers((prev) => (prev[id] === undefined ? prev : { ...prev, [id]: fn(prev[id]) }));
    };

    /** Where a new row goes: above the selected row, inside its folder. */
    const insertionPoint = (): { parentId: string | null; index: number } => {
        const [first, last] = unpinnedRange(tree, layers);
        const place = selectedId === null ? null : findPlace(tree, selectedId);
        if (place === null) {
            return { parentId: null, index: first };
        }
        if (place.parentId !== null) {
            const parent = layers[place.parentId];
            if (parent.kind === "folder") {
                return { parentId: place.parentId, index: place.index };
            }
            const parentPlace = findPlace(tree, place.parentId);
            return { parentId: parentPlace?.parentId ?? null, index: parentPlace?.index ?? first };
        }
        return { parentId: null, index: Math.min(Math.max(place.index, first), last) };
    };

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
        values: "generic",
    });

    const onAddLayer = (): void => {
        addRow(blankLayer("New layer", { kind: "draft", words: "", count: "", matches: "both" }));
    };
    const onAddFolder = (): void => {
        const folder: MockLayer = {
            ...blankLayer("New folder", ruleFor("everything")),
            kind: "folder",
            draft: false,
            values: "folder",
        };
        const at = insertionPoint();
        addRow(folder, {
            parentId: at.parentId !== null && layers[at.parentId].kind === "folder" ? null : at.parentId,
            index: at.index,
        });
        setRenamingId(folder.id);
    };

    const onMove = (move: TreeMove): void => {
        const moved = layers[move.id];
        const from = findPlace(tree, move.id);
        if (moved === undefined || from === null || moved.pin !== undefined) {
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
        const next = moveTreeItem([...tree] as TreeShape[], move);
        const [first, last] = unpinnedRange(next, layers);
        const idx = next.findIndex((n) => n.id === move.id);
        if (move.parentId === null && (idx < first || idx >= last)) {
            return;
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
                const [first, last] = unpinnedRange(
                    without,
                    Object.fromEntries(Object.entries(pinned).map(([k, v]) => [k, v])),
                );
                const index = pin === "bottom" ? last : first;
                return insertNode(without, null, index, place.node);
            });
        },
        unsplit: (id) => {
            const place = findPlace(tree, id);
            update(id, (l) => ({ ...l, kind: "layer", split: undefined, values: "generic" }));
            setTree((prev) => prev.map((n) => (n.id === id ? { id } : n)));
            if (place !== null && selectedId !== null && (place.node.children ?? []).some((c) => c.id === selectedId)) {
                setSelectedId(id);
            }
        },
        split: (id) => {
            const layer = layers[id];
            const write = layer.props.nodeColor;
            const source = write?.mode === "derived" ? write.source : "group";
            const palette =
                CATEGORY_PALETTES[write?.mode === "derived" ? write.palette : "Okabe-Ito"] ??
                CATEGORY_PALETTES["Okabe-Ito"];
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
                    parentPart: `${layer.name}'s nodes`,
                    count: `${String(c.count)} nodes`,
                    matches: "node",
                },
                props: {},
                pending: [],
                labels: [],
                effects: [],
                ends: [],
                child: { parentId: id, group: c.n, chit: palette[(c.n - 1) % palette.length] },
                values: "generic",
            }));
            setLayers((prev) => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    kind: "split",
                    split: { value: source, scheme: write?.mode === "derived" ? write.palette : "Okabe-Ito" },
                },
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
                            <Text size="xs">
                                - the per-property eye: {GAPS.pause.replace("graphty-element needs ", "")}
                            </Text>
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
 * right-click a row for its menu; "+" in the tree header adds a layer or a folder.
 */
export const StylePanel: Story = {
    render: () => <StylePanelMock />,
};
