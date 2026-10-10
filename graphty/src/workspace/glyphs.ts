/**
 * The workspace's icons: one icon per concept, one concept per icon. Every workspace file draws
 * its icons from here (lint forbids importing lucide-react anywhere else under src/workspace), so
 * a concept looks the same in the toolbar, the paint tree, the inspector and the menus.
 */

import {
    Calendar,
    CaseSensitive,
    ChartColumn,
    ChartNetwork,
    Check,
    ChevronDown,
    ChevronLeft,
    Circle,
    CircleAlert,
    CircleCheck,
    CircleDashed,
    CircleDot,
    CircleHelp,
    CircleSlash,
    Columns3,
    Database,
    Eye,
    EyeOff,
    FilePlus,
    FileText,
    FlaskConical,
    FolderOpen,
    Group,
    Hash,
    History,
    Layers,
    Link2,
    List,
    ListFilter,
    ListOrdered,
    LoaderCircle,
    Lock,
    type LucideIcon,
    Menu,
    Minus,
    MoreHorizontal,
    MousePointerClick,
    Network,
    Orbit,
    Paintbrush,
    Plus,
    Redo2,
    Route,
    Search,
    Settings,
    Shapes,
    Share2,
    Spline,
    SquareDashed,
    StickyNote,
    Trash2,
    TriangleAlert,
    Undo2,
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
    several: Group,
    neighborhood: Orbit,
    attribute: Columns3,
    // Paint tree rows. A group row's icon is filled with the group's color.
    selection: SquareDashed,
    measure: ChartColumn,
    run: Shapes,
    group: Circle,
    layer: Paintbrush,
    everything: Layers,
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
    undo: Undo2,
    redo: Redo2,
    add: Plus,
    // Take a value or a row out of a list.
    remove: Minus,
    // Delete a thing for good (a note).
    delete: Trash2,
    link: Link2,
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

/** The icon of each thing the inspector shows; a paint tree row draws the same icon. */
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
