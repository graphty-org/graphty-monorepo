/**
 * What yEd draws inside a node beside its outline, as a picture over the node: the markers of its BPMN gateways, the
 * symbols of its events, the icons of its tasks, the markers along an activity's bottom, a data object's fold and
 * arrow, the lines inside a predefined process and an internal storage, and a UML note's fold. The marks are measured
 * from yEd 3.25's own SVG export of each (`yed-graphml-specimen-node-shapes-p2`, `-p3`, `-p4`, `-p5`, `-p6`), where
 * every node of a kind has one size: a gateway 40 across, an event 36, an activity 56 x 36, a data object 36 x 44. A
 * gateway's and an event's marks are scaled with the node's shorter side about its middle; a task's icon, an activity's
 * markers and the lines inside a flowchart node are drawn at the size measured, from the corner or side yEd draws them
 * against. That they keep these sizes on a node of another size is unproven.
 */
import { svgPicture } from "./styles-yed-live-drawing.js";

/**
 * How a mark is painted: in the icon's fill (`com.yworks.bpmn.icon.fill`, unset the node's), in its line color
 * (`com.yworks.bpmn.icon.line.color`, unset the node's border's), in its fill darkened as Java's `Color.darker()`
 * does, or not at all.
 */
type Paint = "fill" | "line" | "darker" | null;

/** One mark: its outline as an SVG path in its frame, its fill, its line and the line's width. */
type Mark = readonly [string, Paint, Paint, number];

/** The marker inside each BPMN gateway type (`com.yworks.bpmn.type`), about the middle of a gateway 40 across. */
const GATEWAY_MARKS: ReadonlyMap<string, readonly Mark[]> = new Map<string, readonly Mark[]>([
    ["DATA_BASED_EXCLUSIVE", [["M4.09,9.55L-4.09,-9.55M4.09,-9.55L-4.09,9.55", "fill", "line", 3]]],
    [
        "INCLUSIVE",
        [
            [
                "M9.66,0C9.66,5.34 5.34,9.66 0,9.66C-5.34,9.66 -9.66,5.34 -9.66,0C-9.66,-5.34 -5.34,-9.66 0,-9.66C5.34,-9.66 9.66,-5.34 9.66,0Z",
                "fill",
                "line",
                3.5,
            ],
        ],
    ],
    ["PARALLEL", [["M0,-10.91L0,10.91M-10.91,0L10.91,0", "fill", "line", 3]]],
    [
        "COMPLEX",
        [["M0,-10.91L0,10.91M-10.91,0L10.91,0M7.72,7.72L-7.72,-7.72M7.72,-7.72L-7.72,7.72", "fill", "line", 3]],
    ],
    [
        "EVENT_BASED_EXCLUSIVE",
        [
            [
                "M10.91,0C10.91,6.03 6.03,10.91 0,10.91C-6.03,10.91 -10.91,6.03 -10.91,0C-10.91,-6.03 -6.03,-10.91 0,-10.91C6.03,-10.91 10.91,-6.03 10.91,0ZM8.41,0C8.41,4.65 4.65,8.41 0,8.41C-4.65,8.41 -8.41,4.65 -8.41,0C-8.41,-4.65 -4.65,-8.41 0,-8.41C4.65,-8.41 8.41,-4.65 8.41,0ZM0,-6.45L6.13,-1.99L3.79,5.22L-3.79,5.22L-6.13,-1.99Z",
                "fill",
                "line",
                1,
            ],
        ],
    ],
    [
        "EVENT_BASED_EXCLUSIVE_START_PROCESS",
        [
            [
                "M10.91,0C10.91,6.03 6.03,10.91 0,10.91C-6.03,10.91 -10.91,6.03 -10.91,0C-10.91,-6.03 -6.03,-10.91 0,-10.91C6.03,-10.91 10.91,-6.03 10.91,0ZM0,-6.45L6.13,-1.99L3.79,5.22L-3.79,5.22L-6.13,-1.99Z",
                "fill",
                "line",
                1,
            ],
        ],
    ],
    [
        "PARALLEL_EVENT_BASED_EXCLUSIVE_START_PROCESS",
        [
            [
                "M10.91,0C10.91,6.03 6.03,10.91 0,10.91C-6.03,10.91 -10.91,6.03 -10.91,0C-10.91,-6.03 -6.03,-10.91 0,-10.91C6.03,-10.91 10.91,-6.03 10.91,0ZM-0.84,-6.73L0.84,-6.73L0.84,-0.84L6.73,-0.84L6.73,0.84L0.84,0.84L0.84,6.73L-0.84,6.73L-0.84,0.84L-6.73,0.84L-6.73,-0.84L-0.84,-0.84Z",
                "fill",
                "line",
                1,
            ],
        ],
    ],
]);

/** The symbol inside each BPMN event type (`com.yworks.bpmn.type`), about the middle of an event 36 across. */
const EVENT_MARKS: ReadonlyMap<string, readonly Mark[]> = new Map<string, readonly Mark[]>([
    [
        "MESSAGE",
        [
            ["M-9.78,-6.52L9.78,-6.52L9.78,6.52L-9.78,6.52Z", "fill", null, 1],
            ["M-9.78,-6.52L9.78,-6.52L9.78,6.52L-9.78,6.52ZL0,0L9.78,-6.52", null, "line", 1],
        ],
    ],
    [
        "TIMER",
        [
            [
                "M13.29,0C13.29,7.34 7.34,13.29 0,13.29C-7.34,13.29 -13.29,7.34 -13.29,0C-13.29,-7.34 -7.34,-13.29 0,-13.29C7.34,-13.29 13.29,-7.34 13.29,0Z",
                "fill",
                "line",
                1,
            ],
            [
                "M11.4,0L13.21,0M9.88,5.7L11.44,6.61M5.7,9.88L6.61,11.44M0,11.4L0,13.21M-5.7,9.88L-6.61,11.44M-9.88,5.7L-11.44,6.61M-11.4,0L-13.21,0M-9.88,-5.7L-11.44,-6.61M-5.7,-9.88L-6.61,-11.44M0,-11.4L0,-13.21M5.7,-9.88L6.61,-11.44M9.88,-5.7L11.44,-6.61M2.18,-10.27L0,0L7.65,0",
                null,
                "line",
                1,
            ],
        ],
    ],
    ["ESCALATION", [["M0,-10.28L-8.52,8.53L0,-0.87L8.52,8.53Z", "fill", "line", 1]]],
    [
        "CONDITIONAL",
        [
            ["M-7.67,-9.68L7.67,-9.68L7.67,9.68L-7.67,9.68L-7.67,-9.68Z", "fill", "line", 1],
            ["M-5.99,-7.86L5.99,-7.86M-5.99,-3.63L5.99,-3.63M-5.99,1.5L5.99,1.5M-5.99,6.9L5.99,6.9", null, "line", 1],
        ],
    ],
    ["LINK", [["M1.7,-10.2L1.7,-3.39L-8.52,-3.39L-8.52,3.39L1.7,3.39L1.7,10.2L8.52,0Z", "fill", "line", 1]]],
    ["ERROR", [["M10.2,-9.6L2.43,1.32L-3.3,-7.05L-10.2,9.6L-2.43,-1.32L3.3,7.05Z", "fill", "line", 1]]],
    [
        "CANCEL",
        [
            [
                "M7.14,-9.7L9.7,-7.14L2.57,0L9.7,7.14L7.14,9.7L0,2.57L-7.14,9.7L-9.7,7.14L-2.57,0L-9.7,-7.14L-7.14,-9.7L0,-2.57Z",
                "fill",
                "line",
                1,
            ],
        ],
    ],
    ["COMPENSATION", [["M9.07,-6.81L-1.12,0L-1.12,-6.81L-11.32,0L-1.12,6.81L-1.12,0L9.07,6.81Z", "fill", "line", 1]]],
    ["SIGNAL", [["M0,-11.4L9.87,5.7L-9.87,5.7Z", "fill", "line", 1]]],
    ["MULTIPLE", [["M0,-11.4L10.84,-3.52L6.7,9.22L-6.7,9.22L-10.84,-3.52Z", "fill", "line", 1]]],
    [
        "PARALLEL_MULTIPLE",
        [
            [
                "M-2.55,-10.2L2.55,-10.2L2.55,-2.55L10.2,-2.55L10.2,2.55L2.55,2.55L2.55,10.2L-2.55,10.2L-2.55,2.55L-10.2,2.55L-10.2,-2.55L-2.55,-2.55Z",
                "fill",
                "line",
                1,
            ],
        ],
    ],
    [
        "TERMINATE",
        [
            [
                "M12.23,0C12.23,6.75 6.75,12.22 0,12.22C-6.75,12.22 -12.23,6.75 -12.23,0C-12.23,-6.75 -6.75,-12.23 0,-12.23C6.75,-12.23 12.23,-6.75 12.23,0Z",
                "fill",
                "line",
                1,
            ],
        ],
    ],
]);

/** The icon in the top left corner of each BPMN task type (`com.yworks.bpmn.taskType`). */
const TASK_MARKS: ReadonlyMap<string, readonly Mark[]> = new Map<string, readonly Mark[]>([
    ["SEND", [["M5,8.33L15,15L25,8.33ZM5,9.6L5,21.67L25,21.67L25,9.6L15,16.26L5,9.6Z", "line", null, 1]]],
    [
        "RECEIVE",
        [
            ["M5,8.33L25,8.33L25,21.67L5,21.67Z", "fill", null, 1],
            ["M5,8.33L25,8.33L25,21.67L5,21.67ZL15,15L25,8.33", null, "line", 1],
        ],
    ],
    [
        "USER",
        [
            [
                "M15,5C12.53,5 10.52,7.01 10.52,9.48C10.52,10.87 11.16,12.12 12.15,12.94L11.32,13.86Q7.6,15 5,19.02L5,25L25,25L25,19.02Q22.4,15 18.68,13.86L17.85,12.94C18.84,12.12 19.48,10.87 19.48,9.48C19.48,7.01 17.47,5 15,5Z",
                "fill",
                "line",
                1,
            ],
            ["M8.8,25L8.8,21.32M21.2,25L21.2,21.32M11.32,13.86C11,18.44 19,18.44 18.68,13.86", null, "line", 1],
            [
                "M19.45,8.93C19.24,7.28 18.14,5.88 16.58,5.29C15.02,4.7 13.27,5.03 12.02,6.13C10.78,7.24 10.25,8.95 10.65,10.56L10.74,10.58C14.6,7.06 15.4,11.06 19.26,8.74",
                "line",
                null,
                1,
            ],
        ],
    ],
    [
        "MANUAL",
        [
            [
                "M5,11.12Q5.74,9.15 7.93,8.52L16.64,8.52Q17,10.01 13.99,11.12L10.3,11.12L23.94,11.12Q24.94,12.42 23.94,13.7L14.41,13.7L23.25,13.7Q24.24,15 23.25,16.3L15.59,16.3L22.53,16.3Q23.52,17.58 22.53,18.88L15.01,18.88L20.87,18.88Q21.89,20.18 20.87,21.48L6.75,21.48Q5.44,21.04 5,19.7Z",
                "fill",
                "line",
                1,
            ],
        ],
    ],
    [
        "BUSINESS_RULE",
        [
            ["M5,7.6L25,7.6L25,11.15L5,11.15L5,7.6Z", "darker", null, 1],
            ["M5,11.15L25,11.15L25,22.4L5,22.4L5,11.15Z", "fill", null, 1],
            ["M5,7.6L25,7.6L25,22.4L5,22.4ZM5,11.15L25,11.15M5,16.78L25,16.78M10.28,11.15L10.28,22.4", null, "line", 1],
        ],
    ],
    [
        "SERVICE",
        [
            [
                "M18.45,11.55L18.45,11.9L20.02,12.55L20.63,11.95L20.63,11.55ZM11.55,5L11.55,7.53L9.98,8.18L8.18,6.39L6.39,8.18L8.18,9.98L7.53,11.55L5,11.55L5,14.08L7.53,14.08L8.18,15.66L6.39,17.45L8.18,19.24L9.37,18.05L9.37,15.92L11.9,15.92L12.13,15.37C11,15.06 10.17,14.04 10.17,12.82C10.17,11.36 11.36,10.17 12.82,10.17C14.04,10.17 15.06,11 15.37,12.13L15.92,11.9L15.92,9.37L18.05,9.37L19.24,8.18L17.45,6.39L15.66,8.18L14.08,7.53L14.08,5ZM11.55,18.45L11.55,20.63L11.95,20.63L12.55,20.02L11.9,18.45L11.55,18.45Z",
                "fill",
                "line",
                1,
            ],
            [
                "M17.18,14.54C18.64,14.54 19.83,15.73 19.83,17.18C19.83,18.64 18.64,19.83 17.18,19.83C15.73,19.83 14.54,18.64 14.54,17.18C14.54,15.73 15.73,14.54 17.18,14.54ZM15.92,9.37L15.92,11.9L14.34,12.55L12.55,10.76L10.76,12.55L12.55,14.34L11.9,15.92L9.37,15.92L9.37,18.45L11.9,18.45L12.55,20.02L10.76,21.82L12.55,23.61L14.34,21.82L15.92,22.47L15.92,25L18.45,25L18.45,22.47L20.02,21.82L21.82,23.61L23.61,21.82L21.82,20.02L22.47,18.45L25,18.45L25,15.92L22.47,15.92L21.82,14.34L23.61,12.55L21.82,10.76L20.02,12.55L18.45,11.9L18.45,9.37Z",
                "fill",
                "line",
                1,
            ],
        ],
    ],
    [
        "SCRIPT",
        [
            ["M25,5C12.35,10 32.35,20 19.7,25L5,25C17.65,20 -2.35,10 10.3,5Z", "fill", "line", 1],
            ["M8.89,9L17.71,9M9.69,13L18.51,13M11.49,17L20.31,17M12.29,21L21.11,21", null, "line", 1],
        ],
    ],
]);

/** The arrow on a data object of each `com.yworks.bpmn.dataObjectType`, from its top left: an output's is filled. */
const DATA_OBJECT_ARROW = "M11.64,3.7L11.64,8.24L4.82,8.24L4.82,12.76L11.64,12.76L11.64,17.3L16.18,10.5Z";
const DATA_OBJECT_MARKS: ReadonlyMap<string, readonly Mark[]> = new Map<string, readonly Mark[]>([
    ["DATA_OBJECT_TYPE_INPUT", [[DATA_OBJECT_ARROW, "fill", "line", 1]]],
    ["DATA_OBJECT_TYPE_OUTPUT", [[DATA_OBJECT_ARROW, "line", "line", 1]]],
]);

/** The side of an activity marker's square, the room between two, and how far above the activity's bottom they end. */
const MARKER = { side: 15, gap: 5, rise: 4 };

/** Each activity marker, in its square from the square's top left. */
const ACTIVITY_MARKERS: ReadonlyMap<string, readonly Mark[]> = new Map<string, readonly Mark[]>([
    ["AD_HOC", [["M2.25,8.25C5.62,3.75 9.38,11.25 12.75,6.75", null, "line", 1]]],
    [
        "CLOSED",
        [
            ["M0,0L15,0L15,15L0,15Z", null, "line", 1],
            ["M3.66,7.5L11.34,7.5M7.5,3.66L7.5,11.34", null, "line", 1],
        ],
    ],
    ["COMPENSATION", [["M15,2.49L7.5,7.5L7.5,2.49L0,7.5L7.5,12.51L7.5,7.5L15,12.51Z", null, "line", 1]]],
    [
        "LOOP",
        [
            [
                "M0.5,13.56L4,13.56L4,10.06M7.5,14.5C11.01,14.5 13.98,11.9 14.44,8.41C14.9,4.93 12.7,1.65 9.31,0.74C5.92,-0.17 2.38,1.58 1.03,4.82C-0.31,8.07 0.96,11.81 4,13.56",
                null,
                "line",
                1,
            ],
        ],
    ],
    [
        "OPEN",
        [
            ["M0,0L15,0L15,15L0,15Z", null, "line", 1],
            ["M3.66,7.5L11.34,7.5", null, "line", 1],
        ],
    ],
    ["PARALLEL", [["M0,0L0,15L3,15L3,0ZM6,0L6,15L9,15L9,0ZM12,0L12,15L15,15L15,0Z", "line", "line", 1]]],
    ["SEQUENTIAL", [["M0,0L0,3L15,3L15,0ZM0,6L0,9L15,9L15,6ZM0,12L0,15L15,15L15,12Z", "line", "line", 1]]],
]);

/**
 * The markers an activity's `com.yworks.bpmn.type` draws: its loop characteristic's (`..._LOOP`, `..._MULTIPLE`,
 * `..._AD_HOC`), then a task's open square or a sub-process's closed one; a stateless task draws no square.
 */
const ACTIVITY_TYPE = /^ACTIVITY_TYPE_(STATELESS_TASK|SUBPROCESS|TASK)_(PLAIN|LOOP|MULTIPLE|AD_HOC)$/;
const LOOP_MARKERS: Readonly<Record<string, string>> = { LOOP: "LOOP", MULTIPLE: "PARALLEL", AD_HOC: "AD_HOC" };
const KIND_MARKERS: Readonly<Record<string, string>> = { TASK: "OPEN", SUBPROCESS: "CLOSED" };

/** How far in from the side a predefined process's and an internal storage's lines are drawn. */
const FLOWCHART_INSET = 10;

/** The side of the corner yEd folds down from a UML note. */
const NOTE_FOLD = 15;

/** The node a picture is drawn over. */
interface MarkedNode {
    /** The GenericNode's `configuration`, or the realizer's name for a node of another kind (`UMLNoteNode`). */
    readonly kind: string;
    /** Reads a `com.yworks.bpmn.*` style property by its name after that prefix, as the file writes its value. */
    readonly property: (name: string) => string | undefined;
    /** Its size as drawn. */
    readonly width: number;
    readonly height: number;
    /** Its fill and its border's color as `#rrggbb`, and its border's width. */
    readonly fill: string | null;
    readonly line: string | null;
    readonly border: number;
}

/** The marks placed in the node: each set of marks with the move and scale that put its frame there. */
type Placed = readonly (readonly [readonly Mark[], number, number, number])[];

/**
 * The marks of a BPMN activity: its task type's icon in its top left corner and its markers in a row along its
 * bottom, about its middle, in the order its type and then `marker1` to `marker4` name them.
 * @param node - the node
 * @returns the marks
 */
function activityMarks(node: MarkedNode): Placed {
    const typed = ACTIVITY_TYPE.exec(node.property("type") ?? "");
    const names = [
        ...(typed === null ? [] : [LOOP_MARKERS[typed[2]], KIND_MARKERS[typed[1]]]),
        ...[1, 2, 3, 4].map((i) => node.property(`marker${String(i)}`)?.replace(/^BPMN_MARKER_/, "")),
    ].flatMap((name) => {
        const marks = name === undefined ? undefined : ACTIVITY_MARKERS.get(name);
        return marks === undefined ? [] : [marks];
    });
    const pitch = MARKER.side + MARKER.gap;
    const first = node.width / 2 - MARKER.side / 2 - ((names.length - 1) * pitch) / 2;
    const top = node.height - MARKER.rise - MARKER.side;
    const task = TASK_MARKS.get(node.property("taskType")?.replace(/^TASK_TYPE_/, "") ?? "") ?? [];
    return [[task, 0, 0, 1], ...names.map((marks, i): Placed[number] => [marks, first + i * pitch, top, 1])];
}

/**
 * The marks inside a node, before they are painted.
 * @param node - the node
 * @returns the marks and the SVG path of the lines drawn plainly in the node's border color
 */
function placedMarks(node: MarkedNode): [Placed, string] {
    const { width: w, height: h } = node;
    const kind = node.kind
        .toLowerCase()
        .replace(/^com\.yworks\./, "")
        .replace(/\.withshadow$/, "");
    const type = node.property("type") ?? "";
    const middle = (marks: readonly Mark[] | undefined, across: number): Placed =>
        marks === undefined ? [] : [[marks, w / 2, h / 2, Math.min(w, h) / across]];
    const n = (v: number): string => String(Math.round(v * 1000) / 1000);
    switch (kind) {
        case "bpmn.gateway":
            return [middle(GATEWAY_MARKS.get(type.replace(/^GATEWAY_TYPE_/, "")), 40), ""];
        case "bpmn.event":
            return [middle(EVENT_MARKS.get(type.replace(/^EVENT_TYPE_/, "")), 36), ""];
        case "bpmn.activity":
            return [activityMarks(node), ""];
        case "bpmn.artifact": {
            if (type !== "ARTIFACT_TYPE_DATA_OBJECT") {
                return [[], ""];
            }
            const fold = 0.4 * w;
            const arrow = DATA_OBJECT_MARKS.get(node.property("dataObjectType") ?? "") ?? [];
            return [[[arrow, 0, 0, 1]], `M${n(w - fold)},0L${n(w - fold)},${n(fold)}L${n(w)},${n(fold)}`];
        }
        case "flowchart.predefinedprocess":
            return [
                [],
                `M${n(FLOWCHART_INSET)},0L${n(FLOWCHART_INSET)},${n(h)}M${n(w - FLOWCHART_INSET)},0L${n(w - FLOWCHART_INSET)},${n(h)}`,
            ];
        case "flowchart.internalstorage":
            return [
                [],
                `M${n(FLOWCHART_INSET)},0L${n(FLOWCHART_INSET)},${n(h)}M0,${n(FLOWCHART_INSET)}L${n(w)},${n(FLOWCHART_INSET)}`,
            ];
        default:
            return [[], ""];
    }
}

/**
 * A color as Java's `Color.darker()` paints it: each channel at 0.7.
 * @param hex - the `#rrggbb` color
 * @returns the darker color
 */
function darker(hex: string): string {
    const channels = [1, 3, 5].map((i) => Math.floor(Number.parseInt(hex.slice(i, i + 2), 16) * 0.7));
    return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The picture of what yEd draws inside a node beside its outline, or null where it draws nothing there. Marks are
 * filled in the icon's fill (`com.yworks.bpmn.icon.fill`, unset the node's), shaded to `com.yworks.bpmn.icon.fill2`
 * from the node's top left to its bottom right where that is set, and drawn in its line color
 * (`com.yworks.bpmn.icon.line.color`, unset the node's border's), as yEd draws an event with each set
 * (`yed-graphml-specimen-node-shapes-p4`).
 * @param node - the node
 * @returns the picture URL, drawn over the node's box, or null
 */
export function yedNodePicture(node: MarkedNode): string | null {
    const { width: w, height: h } = node;
    if (node.kind === "UMLNoteNode") {
        const fold = Math.min(NOTE_FOLD, w, h);
        const body = `<path fill="white" stroke="${node.line ?? "#000000"}" d="M${String(w - fold)},0L${String(w - fold)},${String(fold)}L${String(w)},${String(fold)}Z"/>`;
        return svgPicture(w, h, node.border, body, "", undefined, "yed");
    }
    const [placed, lines] = placedMarks(node);
    // an icon color's alpha (`#ffffffe6`, yEd's palette) is not drawn
    const color = (name: string): string | undefined => {
        const value = node.property(name);
        return value !== undefined && /^#[0-9a-f]{6}/i.test(value) ? value.slice(0, 7).toLowerCase() : undefined;
    };
    const line = color("icon.line.color") ?? node.line ?? "#000000";
    const fill = color("icon.fill") ?? node.fill ?? "#ffffff";
    const fill2 = color("icon.fill2");
    const shade =
        fill2 === undefined
            ? ""
            : `<defs><linearGradient id="icon" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${String(w)}" y2="${String(h)}" spreadMethod="reflect"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="${fill2}"/></linearGradient></defs>`;
    const paints: Record<string, string> = {
        fill: fill2 === undefined ? fill : "url(#icon)",
        line,
        darker: darker(fill),
    };
    const marks = placed.flatMap(([set, x, y, scale]) =>
        set.map(([d, inside, outline, width]) => {
            const painted = `fill="${inside === null ? "none" : paints[inside]}" stroke="${outline === null ? "none" : paints[outline]}" stroke-width="${String(width)}"`;
            return `<path ${painted} transform="translate(${String(x)} ${String(y)}) scale(${String(scale)})" d="${d}"/>`;
        }),
    );
    // a fold or a flowchart node's lines are its outline's, in its border's color
    const outline = lines === "" ? "" : `<path fill="none" stroke="${node.line ?? "#000000"}" d="${lines}"/>`;
    const body = shade + outline + marks.join("");
    return marks.length === 0 && lines === "" ? null : svgPicture(w, h, node.border, body, "", undefined, "yed");
}
