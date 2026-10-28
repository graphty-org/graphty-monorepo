/**
 * The workspace's icons: one icon per concept, one concept per icon. Every workspace file draws
 * its icons from here (lint forbids importing lucide-react anywhere else under src/workspace), so
 * a concept looks the same in the toolbar, the style tree, the inspector and the menus.
 */

import type { ReadableValueKind } from "@graphty/graphty-element/catalog";
import {
    Activity,
    ArrowDownToLine,
    ArrowLeftToLine,
    ArrowRight,
    ArrowRightToLine,
    ArrowUpToLine,
    Blend,
    Boxes,
    Calendar,
    CaseSensitive,
    ChartColumn,
    ChartNetwork,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronsRight,
    Circle,
    CircleAlert,
    CircleCheck,
    CircleDashed,
    CircleDot,
    CircleHelp,
    CircleSlash,
    Clock,
    Code,
    Columns3,
    Combine,
    Copy,
    Database,
    Disc,
    Eye,
    EyeOff,
    FilePlus,
    FileText,
    FlaskConical,
    Folder,
    FolderOpen,
    Gauge,
    GitCommitHorizontal,
    GripVertical,
    Group,
    HardDriveDownload,
    Hash,
    Highlighter,
    History,
    KeyRound,
    Layers,
    LayoutGrid,
    Lightbulb,
    Link,
    Link2,
    List,
    ListFilter,
    ListOrdered,
    ListPlus,
    LoaderCircle,
    Lock,
    LockKeyhole,
    LockKeyholeOpen,
    type LucideIcon,
    MapPin,
    Maximize2,
    Menu,
    MessageSquare,
    Minimize2,
    Minus,
    MoreHorizontal,
    MousePointerClick,
    MoveHorizontal,
    Network,
    Orbit,
    Paintbrush,
    Pause,
    Pencil,
    Pin,
    PinOff,
    Play,
    Plus,
    Redo2,
    RefreshCw,
    Route,
    Search,
    Server,
    Settings,
    Settings2,
    Shapes,
    Share2,
    Shuffle,
    Sigma,
    Sparkles,
    Spline,
    Square,
    SquareArrowOutUpRight,
    SquareDashed,
    StepBack,
    StepForward,
    StickyNote,
    Sun,
    Table,
    Table2,
    Tag,
    Tags,
    ToggleLeft,
    ToggleRight,
    Trash2,
    TriangleAlert,
    Undo2,
    Ungroup,
    Unlink2,
    Upload,
    Waypoints,
    Weight,
    Workflow,
    X,
    Zap,
} from "lucide-react";

import type { SourceKind } from "./data-place/words";
import type { InspectedKindId } from "./inspector/inspected";

/** The icon of each concept the workspace draws. */
export const GLYPHS = {
    // Things in the graph.
    graph: Workflow,
    node: CircleDot,
    edge: Spline,
    // A style layer that paints nodes and edges: a dot on a line.
    bothKinds: GitCommitHorizontal,
    several: Group,
    neighborhood: Orbit,
    attribute: Columns3,
    // Paint tree rows. A group row's icon is filled with the group's color.
    selection: SquareDashed,
    measure: ChartColumn,
    run: Shapes,
    group: Circle,
    layer: Paintbrush,
    // A folder of style layers, and the marks a layer row carries.
    folder: Folder,
    pin: Pin,
    lock: LockKeyhole,
    // A layer row every property of which a layer above paints over: two paints overlapping.
    paintedOver: Blend,
    unlock: LockKeyholeOpen,
    everything: Layers,
    // The effects a layer adds to nodes (outline, glow, halo) and to edges (band, motion).
    outline: Disc,
    glow: Sparkles,
    halo: Sun,
    band: Highlighter,
    motion: ChevronsRight,
    // The kinds of text a layer adds: a label, a node's tooltip, and an edge's caption at each end.
    label: Tag,
    tooltip: MessageSquare,
    captionAtTarget: ArrowRightToLine,
    captionAtSource: ArrowLeftToLine,
    // Analyses and value types.
    paths: Route,
    number: Hash,
    // Named groups (a category) and free text are two kinds of value, each its own icon.
    category: Boxes,
    text: CaseSensitive,
    ordinal: ListOrdered,
    time: Calendar,
    // A column of yes-or-no values.
    yesNo: ToggleRight,
    unknown: CircleHelp,
    file: FileText,
    // Tools and commands.
    analyze: FlaskConical,
    layout: ChartNetwork,
    legend: List,
    table: Table,
    // The timeline strip's tool.
    timeline: Clock,
    // The table dock's Maximize toggle.
    maximize: Maximize2,
    minimize: Minimize2,
    quickActions: Search,
    filter: ListFilter,
    // Take the next node clicked on the canvas.
    pick: MousePointerClick,
    data: Database,
    notes: StickyNote,
    sample: Network,
    newFile: FilePlus,
    open: FolderOpen,
    upload: Upload,
    settings: Settings,
    // A shader's facts in the gallery and its settings: it moves, what it costs, it reacts to light.
    animates: Activity,
    cost: Gauge,
    light: Lightbulb,
    // A row that reorders by drag.
    drag: GripVertical,
    menu: Menu,
    more: MoreHorizontal,
    rename: Pencil,
    duplicate: Copy,
    // Pin a style row above or below the unpinned rows, and let it go.
    pinTop: ArrowUpToLine,
    pinBottom: ArrowDownToLine,
    unpin: PinOff,
    ungroup: Ungroup,
    undo: Undo2,
    redo: Redo2,
    add: Plus,
    // Take a value or a row out of a list.
    remove: Minus,
    // Delete a thing for good (a note).
    delete: Trash2,
    link: Link2,
    // Take a property off the value it varies by, keeping one value.
    unlink: Unlink2,
    back: ChevronLeft,
    // The current choice in a list.
    check: Check,
    expand: ChevronDown,
    show: Eye,
    hide: EyeOff,
    // States.
    loading: LoaderCircle,
    // Nothing here yet: an empty graph, a step not ready.
    empty: CircleDashed,
    ready: CircleCheck,
    warning: TriangleAlert,
    // A result computed on data that has changed since.
    outOfDate: History,
    failed: CircleAlert,
    canceled: CircleSlash,
    private: Lock,
    shared: Share2,
    // Work the browser kept from a visit that ended before it was saved.
    recovered: History,
    // The start page.
    go: ArrowRight,
    openFile: Folder,
    gridView: LayoutGrid,
    listView: List,
    generated: Shuffle,
    noPicture: Waypoints,
    gpu: Zap,
    developer: Code,
    webAddress: Link,
    close: X,
    // The start page's turning graph.
    play: Play,
    pause: Pause,
    stop: Square,
    key: KeyRound,
    // The Data place's Fields entries a column glyph does not name.
    location: MapPin,
    weight: Weight,
    joined: Link,
    mixed: Shapes,
    computed: Sigma,
    saveLocal: HardDriveDownload,
    join: Combine,
    tags: Tags,
    toggle: ToggleLeft,
    server: Server,
    serverOptions: Settings2,
    openExternal: SquareArrowOutUpRight,
    tableFile: Table2,
    // A sample source, and a server source's Load more and Refresh.
    sampleSource: FlaskConical,
    loadMore: ListPlus,
    refresh: RefreshCw,
    // The timeline dock's transport.
    stepBack: StepBack,
    stepForward: StepForward,
    // The whole span of the data: the window opened wide.
    allTime: MoveHorizontal,
} as const satisfies Readonly<Record<string, LucideIcon>>;

/** The icon of each thing the inspector shows; a style tree row draws the same icon. */
export const KIND_GLYPHS: Readonly<Record<InspectedKindId, LucideIcon>> = {
    graph: GLYPHS.graph,
    node: GLYPHS.node,
    edge: GLYPHS.edge,
    several: GLYPHS.several,
    neighborhood: GLYPHS.neighborhood,
    "measure-row": GLYPHS.measure,
    "run-row": GLYPHS.run,
    "group-row": GLYPHS.group,
    "everything-row": GLYPHS.everything,
    "selection-row": GLYPHS.selection,
    "layer-row": GLYPHS.layer,
    "folder-row": GLYPHS.folder,
    rows: GLYPHS.layer,
    attribute: GLYPHS.attribute,
    "filter-step": GLYPHS.filter,
    source: GLYPHS.file,
};

/**
 * The icon of each kind of value a list offers (Vary by, Add a condition), so one column wears one
 * icon in every list: a yes-or-no its toggle, a number its #, text its Aa, a category its boxes.
 */
export const VALUE_GLYPHS: Readonly<Record<ReadableValueKind, LucideIcon>> = {
    number: GLYPHS.number,
    category: GLYPHS.category,
    text: GLYPHS.text,
    "yes-no": GLYPHS.yesNo,
};

/**
 * The icon of each kind of Sources row, and its color when it is not the text's. The Sources tree
 * and the inspector opened from a row both draw it, so the two cannot drift apart.
 */
export const SOURCE_GLYPHS: Readonly<Record<SourceKind, { readonly icon: LucideIcon; readonly color?: string }>> = {
    file: { icon: GLYPHS.file },
    nodes: { icon: GLYPHS.node },
    edges: { icon: GLYPHS.edge },
    // The warning the import page draws for the same rows.
    "left-out": { icon: GLYPHS.warning, color: "var(--cm-text-danger)" },
};
