/**
 * The workspace's icons: one icon per concept, one concept per icon. Every workspace file draws
 * its icons from here (lint forbids importing lucide-react anywhere else under src/workspace), so
 * a concept looks the same in the toolbar, the style tree, the inspector and the menus.
 */

import {
    ArrowDownToLine,
    ArrowLeftToLine,
    ArrowRightToLine,
    ArrowUpToLine,
    Blend,
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
    Columns3,
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
    GitCommitHorizontal,
    Group,
    Hash,
    Highlighter,
    History,
    Layers,
    Link2,
    List,
    ListFilter,
    ListOrdered,
    LoaderCircle,
    Lock,
    LockKeyhole,
    LockKeyholeOpen,
    type LucideIcon,
    Menu,
    MessageSquare,
    Minus,
    MoreHorizontal,
    MousePointerClick,
    Network,
    Orbit,
    Paintbrush,
    Pencil,
    Pin,
    PinOff,
    Plus,
    Redo2,
    Route,
    Search,
    Settings,
    Shapes,
    Share2,
    Sparkles,
    Spline,
    SquareDashed,
    StickyNote,
    Sun,
    Table,
    Tag,
    Trash2,
    TriangleAlert,
    Undo2,
    Ungroup,
    Unlink2,
    Upload,
    Workflow,
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
    category: CaseSensitive,
    ordinal: ListOrdered,
    time: Calendar,
    unknown: CircleHelp,
    file: FileText,
    // Tools and commands.
    analyze: FlaskConical,
    layout: ChartNetwork,
    legend: List,
    table: Table,
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
    "draft-row": GLYPHS.layer,
    attribute: GLYPHS.attribute,
    "filter-step": GLYPHS.filter,
    source: GLYPHS.file,
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
