/**
 * The workspace's icons: one icon per concept, one concept per icon. Every workspace file draws
 * its icons from here (lint forbids importing lucide-react anywhere else under src/workspace), so
 * a concept looks the same in the toolbar, the style tree, the inspector and the menus.
 */

import type { ReadableValueKind } from "@graphty/graphty-element/catalog";
import {
    Activity,
    AlignCenter,
    AlignLeft,
    AlignRight,
    ArrowDown,
    ArrowDownToLine,
    ArrowDownUp,
    ArrowLeft,
    ArrowLeftRight,
    ArrowLeftToLine,
    ArrowRight,
    ArrowRightToLine,
    ArrowUp,
    ArrowUpRight,
    ArrowUpToLine,
    Ban,
    Blend,
    Bold,
    Box,
    Boxes,
    Calendar,
    Camera,
    CaseSensitive,
    ChartCandlestick,
    ChartColumn,
    ChartColumnStacked,
    ChartLine,
    ChartNetwork,
    ChartNoAxesColumn,
    ChartSpline,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsRight,
    Circle,
    CircleAlert,
    CircleCheck,
    CircleDashed,
    CircleDot,
    CircleHelp,
    CircleSlash,
    ClipboardPaste,
    Clock,
    Code,
    Columns2,
    Columns3,
    Columns4,
    Combine,
    Copy,
    CornerUpRight,
    createLucideIcon,
    Database,
    Disc,
    Divide,
    Earth,
    Equal,
    EqualApproximately,
    Expand,
    Eye,
    EyeOff,
    FilePlus,
    FileText,
    FlaskConical,
    Folder,
    FolderOpen,
    Gauge,
    GitCommitHorizontal,
    Grid2x2,
    Grid3x2,
    GripVertical,
    Group,
    HardDriveDownload,
    Hash,
    Highlighter,
    History,
    Hourglass,
    Image,
    Italic,
    KeyRound,
    Lamp,
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
    LocateFixed,
    Lock,
    LockKeyhole,
    LockKeyholeOpen,
    type LucideIcon,
    MapPin,
    Maximize2,
    Menu,
    Merge,
    MessageSquare,
    Mic,
    Minimize2,
    Minus,
    MoreHorizontal,
    MousePointerClick,
    Move,
    MoveHorizontal,
    MoveRight,
    Network,
    Orbit,
    Paintbrush,
    Palette,
    PanelLeft,
    PanelRight,
    Pause,
    Pencil,
    PenTool,
    Pin,
    PinOff,
    Play,
    Plus,
    Rainbow,
    RectangleGoggles,
    Redo2,
    RefreshCw,
    Rotate3d,
    RotateCcwSquare,
    RotateCw,
    RotateCwSquare,
    Route,
    Rows2,
    Rows3,
    Scale,
    Scan,
    Search,
    Send,
    Server,
    Settings,
    Shapes,
    Share2,
    Shuffle,
    Sigma,
    Slash,
    SlidersHorizontal,
    Spline,
    Square,
    SquareArrowOutUpRight,
    SquareDashed,
    SquaresIntersect,
    SquareSplitHorizontal,
    SquareSquare,
    SquaresSubtract,
    SquaresUnite,
    StepBack,
    StepForward,
    StickyNote,
    Strikethrough,
    Table,
    Table2,
    Tag,
    Tags,
    Target,
    ToggleLeft,
    ToggleRight,
    Trash2,
    TriangleAlert,
    Underline,
    Undo2,
    Ungroup,
    Unlink2,
    Upload,
    Waypoints,
    Weight,
    X,
    Zap,
    ZoomOut,
} from "lucide-react";

import type { InspectedKindId } from "./inspector/inspected";

/**
 * The AI sparkle: one large four-point star and two small ones, drawn as lucide draws its own
 * icons. lucide's Sparkle is one star and its Sparkles adds plus-crosses, neither of them this.
 */
const AiSparkles = createLucideIcon("ai-sparkles", [
    [
        "path",
        {
            d: "M8.5 8.5Q9.76 14.24 15.5 15.5Q9.76 16.76 8.5 22.5Q7.24 16.76 1.5 15.5Q7.24 14.24 8.5 8.5Z",
            key: "large",
        },
    ],
    ["path", { d: "M18.5 7Q19.5 10 22.5 11Q19.5 12 18.5 15Q17.5 12 14.5 11Q17.5 10 18.5 7Z", key: "medium" }],
    ["path", { d: "M14 1Q14.84 3.16 17 4Q14.84 4.84 14 7Q13.16 4.84 11 4Q13.16 3.16 14 1Z", key: "small" }],
]);

/**
 * Augmented reality: a cube inside a frame's four corners, the "view in AR" mark of model-viewer,
 * Scene Viewer and Material Symbols. lucide has no AR icon: this is its Scan corners round a
 * half-size Box, in lucide's own stroke.
 */
const ViewInAr = createLucideIcon("view-in-ar", [
    ["path", { d: "M3 7V5a2 2 0 0 1 2-2h2", key: "corner-top-left" }],
    ["path", { d: "M17 3h2a2 2 0 0 1 2 2v2", key: "corner-top-right" }],
    ["path", { d: "M21 17v2a2 2 0 0 1-2 2h-2", key: "corner-bottom-right" }],
    ["path", { d: "M7 21H5a2 2 0 0 1-2-2v-2", key: "corner-bottom-left" }],
    ["path", { d: "M12 7l4.5 2.5v5L12 17l-4.5-2.5v-5Z", key: "cube" }],
    ["path", { d: "M7.5 9.5 12 12l4.5-2.5", key: "cube-top" }],
    ["path", { d: "M12 12v5", key: "cube-edge" }],
]);

/** The icon of each concept the workspace draws. */
export const GLYPHS = {
    // Things in the graph.
    // A graph: nodes joined by edges.
    graph: Waypoints,
    node: CircleDot,
    edge: Spline,
    // The AI assistant: one large sparkle and two small ones.
    assistant: AiSparkles,
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
    // Draw a selection's groups in their colors while picking.
    groupColors: Palette,
    layer: Paintbrush,
    // A folder of style layers, and the marks a layer row carries.
    folder: Folder,
    pin: Pin,
    lock: LockKeyhole,
    // A layer row every property of which a layer above paints over: two paints overlapping.
    paintedOver: Blend,
    unlock: LockKeyholeOpen,
    everything: Layers,
    // What a result ran over, when it is not what is showing: a frame round the part it read.
    ranOver: Scan,
    // The effects a layer adds to nodes (glow) and to edges (outline, band, motion).
    outline: Disc,
    // A lamp: light given off. Sparkles would read as the assistant.
    glow: Lamp,
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
    // The Camera tool: its menu moves the camera (Fit, the standard views, Auto-rotate).
    camera: Camera,
    // The Mode tool's face in VR and AR (2D and 3D show the words): a headset for VR, a cube in a
    // frame for AR (the usual marks: Material Symbols, SF Symbols, model-viewer).
    modeVr: RectangleGoggles,
    modeAr: ViewInAr,
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
    // A part's settings page in the Style panel by part.
    sliders: SlidersHorizontal,
    // A shader's facts in the gallery and its settings: it moves, what it costs, it reacts to light.
    animates: Activity,
    cost: Gauge,
    light: Lightbulb,
    // A row that reorders by drag.
    drag: GripVertical,
    menu: Menu,
    more: MoreHorizontal,
    // Switch a row to another member of its family (a solid fill to a gradient).
    switchTo: ArrowLeftRight,
    rename: Pencil,
    duplicate: Copy,
    // Copy text to the clipboard.
    copy: Copy,
    paste: ClipboardPaste,
    // Pin a style row above or below the unpinned rows, and let it go.
    pinTop: ArrowUpToLine,
    pinBottom: ArrowDownToLine,
    unpin: PinOff,
    // Move a row one place up or down its list (Mod+[ and Mod+]).
    moveUp: ArrowUp,
    moveDown: ArrowDown,
    ungroup: Ungroup,
    undo: Undo2,
    redo: Redo2,
    add: Plus,
    // A selection step's verbs, Figma's boolean glyphs: Add (union), Except (subtract), Keep (intersect).
    union: SquaresUnite,
    subtract: SquaresSubtract,
    intersect: SquaresIntersect,
    // A step whose result depends on where it sits in its list.
    order: ArrowDownUp,
    // Swap two fields, one above the other (the Join card).
    swap: ArrowDownUp,
    // Make every share of a list equal (a pie's slices, stripes): no share set, each an equal part.
    equalShares: Scale,
    // Take a value or a row out of a list.
    remove: Minus,
    // Delete a thing for good (a note).
    delete: Trash2,
    link: Link2,
    // Take a property off the value it varies by, keeping one value.
    unlink: Unlink2,
    back: ChevronLeft,
    // The next one of several, as back is the one before.
    next: ChevronRight,
    // The current choice in a list.
    check: Check,
    // The likeliest choice, not picked.
    suggested: EqualApproximately,
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
    // A graph with no picture yet shows the graph icon itself.
    noPicture: Waypoints,
    // A node drawn as a 3D model, and a picture drawn on a node.
    model: Box,
    // The Load custom model dialog's rotate buttons: a quarter turn about the up axis, and a tip.
    turnLeft: RotateCcwSquare,
    turnRight: RotateCwSquare,
    tip: Rotate3d,
    picture: Image,
    gpu: Zap,
    developer: Code,
    webAddress: Link,
    close: X,
    // The start page's turning graph.
    play: Play,
    pause: Pause,
    // A selection whose step waits for the reader's Run (its run was removed).
    waiting: Hourglass,
    stop: Square,
    // The Assistant composer's Talk and Send.
    talk: Mic,
    send: Send,
    // The Assistant's reply actions: its steps, Send again, Jump to newest, a change line's mark
    // and Open layer.
    steps: List,
    again: RotateCw,
    newest: ArrowDown,
    changed: Layers,
    openLayer: ArrowUpRight,
    // An untitled chat in the Assistant's header: the way into the chat history.
    history: History,
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
    // The histogram zoomed back out to the whole span.
    wholeTimeline: ZoomOut,
    // The window moved to where the selection is.
    jumpToSelection: LocateFixed,
    // The model preview's Reset view: back to the first view of the model.
    resetView: LocateFixed,
    // Style panel v2 (design/ui/style-panel-v2/design.md, section 6): a stroke width's in-field
    // glyph is `weight` above; italic beside a font weight.
    italic: Italic,
    // Each side of a box, one toggle a side (a frame's sides).
    arrowUpToLine: ArrowUpToLine,
    arrowRightToLine: ArrowRightToLine,
    arrowDownToLine: ArrowDownToLine,
    arrowLeftToLine: ArrowLeftToLine,
    // Where a border's stroke sits on the shape's edge: inside it, centered on it, outside it.
    borderInside: SquareSquare,
    borderCenter: Square,
    borderOutside: Expand,
    // Which way stripes run: stacked down, or side by side to the right.
    stripesDown: Rows3,
    stripesRight: Columns4,
    // How a picture repeats over a node: once, both ways, across, down.
    repeatNone: Ban,
    repeatBoth: Grid2x2,
    repeatAcross: Columns2,
    repeatDown: Rows2,
    // How a label's lines line up: to the left, centered, to the right.
    alignLeft: AlignLeft,
    alignCenter: AlignCenter,
    alignRight: AlignRight,
    // Which way a label's speech-bubble pointer points, or Auto: toward its node from wherever the label sits.
    pointUp: ArrowUp,
    pointDown: ArrowDown,
    pointLeft: ArrowLeft,
    pointRight: ArrowRight,
    pointAuto: Move,
    // An edge's route: straight, an arc, or along a great circle of the globe.
    routeStraight: Slash,
    routeArc: Rainbow,
    routeGreatCircle: Earth,
    routeBundled: Merge,
    // Which side of its line a one-sided arrowhead sits on.
    sideLeft: PanelLeft,
    sideRight: PanelRight,
    sideBoth: SquareSplitHorizontal,
    // A gradient's kind: along a direction, out from a center, or none (an edge's flat color).
    gradientLinear: MoveRight,
    gradientRadial: Target,
    gradientNone: Ban,
    // How a curved edge runs through its bends: corners rounded, one smooth curve, one Bezier curve.
    bendCorners: CornerUpRight,
    bendMidpoints: ChartSpline,
    bendBezier: PenTool,
    // A chart's kind: bars, stacked bars, a line, a box plot, a row of cells.
    chartBar: ChartNoAxesColumn,
    chartStackedBar: ChartColumnStacked,
    chartLine: ChartLine,
    chartBox: ChartCandlestick,
    chartCells: Grid3x2,
    // What a linked number does with the value it would have without the link: set it, or add, subtract,
    // multiply or divide by the data's value.
    opSet: Equal,
    opAdd: Plus,
    opSubtract: Minus,
    opMultiply: X,
    opDivide: Divide,
    // A label's font style toggles.
    fontBold: Bold,
    fontItalic: Italic,
    fontUnderline: Underline,
    fontStrikethrough: Strikethrough,
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
