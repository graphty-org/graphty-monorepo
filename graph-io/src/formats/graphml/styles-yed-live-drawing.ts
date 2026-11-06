/**
 * What yEd Live draws inside a node beside its outline, as a picture over the node: the compartments of a UMLNodeStyle
 * and the BPMN symbols. The picture moves and scales with its node, and its numbers are measured from yEd Live 8.5.16's
 * drawings (`yed-live-graphml-specimen-node-shapes-p4` to `-p7`); the symbols are BPMN's own, drawn plainly.
 */

/** A UMLNodeStyle's header, from the top of the node to the white rule under it. */
const UML_HEADER = 50;
/** The white rule under the header. */
const UML_RULE = 2;
/** A section's bar. */
const UML_BAR = 20;
/** One row of an open section. */
const UML_ROW = 16;
/** What is left under the last section. */
const UML_FOOT = 10;
/** The narrowest yEd Live draws a UMLNodeStyle. */
const UML_MIN_WIDTH = 125;
/** Where a section's name and rows start across the node. */
const UML_TEXT_LEFT = 25;
/** A UMLNodeStyle's outline, and the usual BPMN one. */
const UML_BORDER = 2;
const BPMN_BORDER = 1;
/** The two buttons' distance from the node's right side, and a button's side. */
const UML_BUTTONS = [37, 19];
const UML_BUTTON = 16;

/** The words of a UMLClassModel and what it opens. */
export interface UmlClass {
    readonly stereotype: string;
    readonly constraint: string;
    readonly sections: readonly { readonly name: string; readonly rows: readonly string[]; readonly open: boolean }[];
}

/** A node's size and the picture drawn over it. */
export interface NodeDrawing {
    readonly width: number;
    readonly height: number;
    readonly picture: string;
}

/**
 * Text as the content or an attribute of an SVG element.
 * @param text - the text
 * @returns it escaped
 */
function escapeSvg(text: string): string {
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** How many times a drawing's size its picture is rendered at, so that it stays sharp when the reader zooms in. */
const PICTURE_SCALE = 3;

/**
 * An SVG drawing as a picture URL. A node's picture covers its fill, which stops at the middle of its border, so the
 * drawing, in the node's own units, is cut to that.
 * @param width - the node's width
 * @param height - the node's height
 * @param border - its border's width
 * @param body - the elements
 * @param background - the color behind them, unset none: light words on a clear picture take a dark edge when drawn
 * @returns the URL
 */
export function svgPicture(width: number, height: number, border: number, body: string, background = ""): string {
    const [w, h] = [width - border, height - border];
    const size = `width="${String(w * PICTURE_SCALE)}" height="${String(h * PICTURE_SCALE)}"`;
    const view = `viewBox="${String(border / 2)} ${String(border / 2)} ${String(w)} ${String(h)}"`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" ${size} ${view}${background === "" ? "" : ` style="background:${background}"`}>${body}</svg>`)}`;
}

/**
 * One line of a UMLNodeStyle's words.
 * @param x - where it is anchored across the node
 * @param y - its baseline
 * @param words - the words
 * @param look - its other SVG attributes
 * @returns the element
 */
function umlText(x: number, y: number, words: string, look: string): string {
    return `<text x="${String(x)}" y="${String(y)}" font-family="Arial" ${look}>${escapeSvg(words)}</text>`;
}

/**
 * A round button with a sign cut out of it: a plus with `plus`, else a minus.
 * @param x - the button's left
 * @param y - its top
 * @param plus - whether it is a plus
 * @returns the element
 */
function umlButton(x: number, y: number, plus: boolean): string {
    const [cx, cy, r, arm, half] = [x + 8, y + 8, 6.4, 4, 0.8];
    const ring = `M${String(cx - r)},${String(cy)}a${String(r)},${String(r)} 0 1,0 ${String(2 * r)},0a${String(r)},${String(r)} 0 1,0 ${String(-2 * r)},0Z`;
    const bar = `M${String(cx - arm)},${String(cy - half)}h${String(2 * arm)}v${String(2 * half)}h${String(-2 * arm)}Z`;
    const post = `M${String(cx - half)},${String(cy - arm)}h${String(2 * half)}v${String(2 * arm)}h${String(-2 * half)}Z`;
    return `<path fill="white" fill-rule="evenodd"${plus ? "" : ' fill-opacity="0.5"'} d="${ring}${bar}${plus ? post : ""}"/>`;
}

/**
 * One section of a UMLNodeStyle: its bar with its name, its open or closed triangle and its two buttons, and its rows
 * when it is open.
 * @param section - the section
 * @param section.name - its name
 * @param section.rows - its rows
 * @param section.open - whether they are shown
 * @param top - where it starts down the node
 * @param width - the node's width
 * @param fill - the node's color
 * @returns the elements, and where the next section starts
 */
function umlSection(section: UmlClass["sections"][number], top: number, width: number, fill: string): [string, number] {
    const triangle = section.open ? "7,6.5 17,6.5 12,16" : "8.5,5 8.5,15 18,10";
    const buttons = UML_BUTTONS.map(
        (right, i) =>
            `<rect fill="${fill}" x="${String(width - right)}" y="${String(top + 2)}" width="${String(UML_BUTTON)}" height="${String(UML_BUTTON)}"/>${umlButton(width - right, top + 2, i === 0)}`,
    );
    const parts = [
        `<rect fill="${fill}" x="0" y="${String(top)}" width="${String(width)}" height="${String(UML_BAR)}"/>`,
        `<polygon fill="white" points="${triangle}" transform="translate(0 ${String(top)})"/>`,
        ...buttons,
        umlText(UML_TEXT_LEFT, top + 14, section.name, 'font-size="12" fill="white"'),
    ];
    const rows = section.open ? section.rows : [];
    const below = top + UML_BAR;
    if (rows.length > 0) {
        parts.push(
            `<rect fill="white" x="1" y="${String(below)}" width="${String(width - 2)}" height="${String(rows.length * UML_ROW)}"/>`,
            ...rows.map((row, i) =>
                umlText(UML_TEXT_LEFT, below + i * UML_ROW + 12, row, 'font-size="12" fill="black"'),
            ),
        );
    }
    return [parts.join(""), below + rows.length * UML_ROW];
}

/**
 * A UMLNodeStyle as yEd Live draws it. yEd Live makes the box tall enough for its rows and at least 125 wide as it
 * loads the file, about the stored center.
 * @param model - its words
 * @param stored - the node's stored size
 * @param stored.width - the stored width
 * @param stored.height - the stored height
 * @param fill - the node's color
 * @returns the size to draw it at and its picture
 */
export function umlDrawing(model: UmlClass, stored: { width: number; height: number }, fill: string): NodeDrawing {
    const width = Math.max(stored.width, UML_MIN_WIDTH);
    const middle = width / 2;
    const small = 'font-size="10" font-style="italic" text-anchor="middle" fill="white"';
    const parts = [
        model.stereotype === "" ? "" : umlText(middle, 14, `<<${model.stereotype}>>`, small),
        model.constraint === "" ? "" : umlText(middle, 38, `{${model.constraint}}`, small),
        `<rect fill="white" x="1" y="${String(UML_HEADER)}" width="${String(width - 2)}" height="${String(UML_RULE)}"/>`,
    ];
    let top = UML_HEADER + UML_RULE;
    for (const section of model.sections) {
        const [drawn, next] = umlSection(section, top, width, fill);
        parts.push(drawn);
        top = next;
    }
    // a last section closed ends in the same white rule as the header
    if (model.sections.at(-1)?.open === false) {
        parts.push(
            `<rect fill="white" x="1" y="${String(top)}" width="${String(width - 2)}" height="${String(UML_RULE)}"/>`,
        );
    }
    const height = Math.max(stored.height, top + UML_FOOT);
    return { width, height, picture: svgPicture(width, height, UML_BORDER, parts.join(""), fill) };
}

/** A symbol's outlines, as an SVG path in a box of 100 by 100. */
const RING = "M0,50a50,50 0 1,0 100,0a50,50 0 1,0 -100,0Z";
const BOX = "M0,0H100V100H0Z";
const ENVELOPE = `${BOX}M0,0L50,50L100,0`;
const CROSS = "M15,0L50,35L85,0L100,15L65,50L100,85L85,100L50,65L15,100L0,85L35,50L0,15Z";
const PLUS = "M35,0H65V35H100V65H65V100H35V65H0V35H35Z";
const PENTAGON = "M50,0L100,38L81,100H19L0,38Z";
const ARROW = "M0,30H60V0L100,50L60,100V70H0Z";
const GEAR =
    "M40,0H60L65,15L80,8L92,20L85,35L100,40V60L85,65L92,80L80,92L65,85L60,100H40L35,85L20,92L8,80L15,65L0,60V40L15,35L8,20L20,8L35,15Z";
const BARS = "M0,0H25V100H0ZM37,0H62V100H37ZM75,0H100V100H75Z";
const ROWS = "M0,0V25H100V0ZM0,37V62H100V37ZM0,75V100H100V75Z";

/** One symbol piece: its box on a node of the sheet's size (left, top, width, height), its outline, and how it is painted: `solid`, a white line, or a line in the icon's color. */
type Piece = readonly [number, number, number, number, string, ("solid" | "white")?];

/** The symbol of each BPMN event type, on an event 30 across. */
const EVENT_SYMBOLS: ReadonlyMap<string, readonly Piece[]> = new Map<string, readonly Piece[]>([
    ["MESSAGE", [[6.3, 9, 17, 12, ENVELOPE]]],
    ["TIMER", [[4.7, 4, 21, 22, `${RING}M50,0V10M100,50H90M50,100V90M0,50H10M50,50L75,52M50,50L60,15`]]],
    ["ESCALATION", [[7, 4, 16, 19, "M50,0L85,100L50,60L15,100Z"]]],
    ["CONDITIONAL", [[9.3, 7, 12, 16, `${BOX}M10,15H90M10,38H90M10,62H90M10,85H90`]]],
    ["LINK", [[6.7, 6, 17, 18, ARROW]]],
    ["ERROR", [[7, 7, 16, 16, "M0,100L30,15L60,55L100,0L70,85L40,45Z"]]],
    ["CANCEL", [[6.3, 6, 17, 18, CROSS]]],
    ["COMPENSATION", [[4.7, 9, 18, 12, "M45,0V100L0,50ZM100,0V100L55,50Z"]]],
    ["SIGNAL", [[6, 4, 18, 16, "M50,0L100,100H0Z"]]],
    ["MULTIPLE", [[4.3, 4, 21, 20, PENTAGON]]],
    ["PARALLEL_MULTIPLE", [[4.7, 4, 21, 22, PLUS]]],
    ["TERMINATE", [[4, 4, 22, 22, RING]]],
]);

/** The marker of each BPMN gateway type, on a gateway 34 across. */
const GATEWAY_SYMBOLS: ReadonlyMap<string, readonly Piece[]> = new Map<string, readonly Piece[]>([
    ["EXCLUSIVE_WITH_MARKER", [[11.3, 10, 11, 14, CROSS, "solid"]]],
    ["INCLUSIVE", [[6.7, 7, 21, 20, RING]]],
    ["PARALLEL", [[9, 9, 16, 16, PLUS, "solid"]]],
    ["COMPLEX", [[7.3, 7, 20, 20, "M50,0V100M0,50H100M15,15L85,85M85,15L15,85"]]],
    [
        "EVENT_BASED",
        [
            [6.7, 7, 21, 20, RING],
            [8.7, 9, 17, 16, RING],
            [11.7, 12, 10, 9, PENTAGON],
        ],
    ],
    [
        "EXCLUSIVE_EVENT_BASED",
        [
            [7, 7, 20, 20, RING],
            [12, 12, 10, 9, PENTAGON],
        ],
    ],
    [
        "PARALLEL_EVENT_BASED",
        [
            [6.3, 7, 21, 20, RING],
            [11.3, 11, 12, 12, PLUS],
        ],
    ],
]);

/** The picture in the top left corner of each BPMN task type, the same at any size. */
const TASK_SYMBOLS: ReadonlyMap<string, readonly Piece[]> = new Map<string, readonly Piece[]>([
    [
        "SEND",
        [
            [6, 9.3, 15, 10, BOX, "solid"],
            [6, 8.3, 15, 5, "M0,0L50,100L100,0", "white"],
        ],
    ],
    ["RECEIVE", [[6.3, 8.3, 15, 11, ENVELOPE]]],
    [
        "USER",
        [
            [
                5.7,
                6.3,
                15,
                15,
                "M0,100V70Q0,55 30,50L50,60L70,50Q100,55 100,70V100ZM30,20A20,25 0 1,1 70,20A20,30 0 1,1 30,20Z",
            ],
            [9.7, 6.3, 7, 3, "M0,100Q0,0 50,0Q100,0 100,100Z", "solid"],
        ],
    ],
    ["MANUAL", [[6, 8.3, 15, 11, "M0,40L30,0H60V20H100V40H70V60H90V80H70V100H20L0,80Z"]]],
    [
        "BUSINESS_RULE",
        [
            [6.3, 7.3, 15, 3, BOX, "solid"],
            [6.3, 10.3, 15, 9, `${BOX}M30,0V100M0,50H100`],
        ],
    ],
    ["SCRIPT", [[6, 6.5, 15, 15, "M25,25H80M28,50H83M25,75H80M20,0H100Q75,25 90,50T75,100H0Q25,75 10,50T20,0"]]],
    [
        "SERVICE",
        [
            [5.7, 6.2, 12, 12, GEAR],
            [8.7, 9.2, 12, 12, GEAR],
            [9.7, 9.2, 5, 5, RING],
            [12.7, 12.2, 5, 5, RING],
        ],
    ],
    [
        "EVENT_TRIGGERED",
        [
            [6.3, 6.2, 15, 15, RING],
            [10.3, 11.2, 6, 5, ENVELOPE],
        ],
    ],
]);

/** The markers along a node's bottom, each 10 across, from the middle of the node. */
const BOTTOM_MARKERS: ReadonlyMap<string, readonly Piece[]> = new Map<string, readonly Piece[]>([
    ["subState=EXPANDED", [[-5, 0, 10, 10, `${BOX}M20,50H80`]]],
    ["subState=DYNAMIC", [[-5, 0, 10, 10, `${BOX}M20,50H80`]]],
    ["subState=COLLAPSED", [[-5, 0, 10, 10, `${BOX}M20,50H80M50,20V80`]]],
    ["loopCharacteristic=LOOP", [[-5, 0, 10, 10, "M30,100A50,50 0 1,1 70,100M70,100V75M70,100H95"]]],
    ["loopCharacteristic=PARALLEL", [[-5, 0, 10, 10, BARS, "solid"]]],
    ["loopCharacteristic=SEQUENTIAL", [[-5, 0, 10, 10, ROWS, "solid"]]],
    ["adHoc=true", [[-5, 4, 10, 3, "M0,70Q25,0 50,50T100,30"]]],
    ["compensation=true", [[-5, 2, 9, 6, "M45,0V100L0,50ZM100,0V100L55,50Z"]]],
]);

/**
 * Draws pieces.
 * @param pieces - the pieces
 * @param color - their color
 * @param fit - turns a piece's box into its place on the node
 * @returns the elements
 */
function drawPieces(pieces: readonly Piece[], color: string, fit: (p: Piece) => readonly number[]): string {
    return pieces
        .map((piece) => {
            const [x, y, w, h] = fit(piece);
            const paint = piece[5] === "solid" ? `fill="${color}"` : `fill="none" stroke="${piece[5] ?? color}"`;
            return `<path ${paint} vector-effect="non-scaling-stroke" d="${piece[4]}" transform="translate(${String(x)} ${String(y)}) scale(${String(w / 100)} ${String(h / 100)})"/>`;
        })
        .join("");
}

/**
 * The picture over a BPMN node, or null where its style draws nothing inside its outline.
 * @param tag - the style's name
 * @param attr - reads one of the style's attributes
 * @param size - the node's size
 * @param size.width - its width
 * @param size.height - its height
 * @param color - its `iconColor`
 * @returns the picture's URL, or null
 */
export function bpmnPicture(
    tag: string,
    attr: (name: string) => string | undefined,
    size: { width: number; height: number },
    color: string,
): string | null {
    const { width, height } = size;
    const scaled =
        (across: number, down = across) =>
        (p: Piece) => [
            (p[0] * width) / across,
            (p[1] * height) / down,
            (p[2] * width) / across,
            (p[3] * height) / down,
        ];
    const asIs = (p: Piece): readonly number[] => p.slice(0, 4) as number[];
    const bottom = (rise: number) => (p: Piece) => [width / 2 + p[0], height - rise + p[1], p[2], p[3]];
    const marks = (rise: number): string => {
        const names = ["subState", "loopCharacteristic", "adHoc", "compensation"];
        const pieces = names.flatMap((name) => BOTTOM_MARKERS.get(`${name}=${attr(name) ?? ""}`) ?? []);
        return drawPieces(pieces, color, bottom(rise));
    };
    const fold = (): string => drawPieces([[16, 0, 10, 10, "M0,0V100H100"]], color, scaled(26, 34));
    const draws: Record<string, () => string> = {
        EventNodeStyle: () => drawPieces(EVENT_SYMBOLS.get(attr("type") ?? "") ?? [], color, scaled(30)),
        GatewayNodeStyle: () => drawPieces(GATEWAY_SYMBOLS.get(attr("type") ?? "") ?? [], color, scaled(34)),
        ActivityNodeStyle: () => drawPieces(TASK_SYMBOLS.get(attr("taskType") ?? "") ?? [], color, asIs) + marks(15),
        ChoreographyNodeStyle: () => marks(12),
        ConversationNodeStyle: () =>
            attr("type") === "SUB_CONVERSATION" || attr("type") === "CALLING_COLLABORATION"
                ? drawPieces([[13, 20, 10, 10, `${BOX}M20,50H80M50,20V80`]], color, scaled(36, 32))
                : "",
        DataObjectNodeStyle: () => {
            const type = attr("type");
            const arrow: Piece[] = type === "INPUT" || type === "OUTPUT" ? [[3, 3, 8, 6, ARROW]] : [];
            const many: Piece[] = attr("collection") === "true" ? [[8, 22, 10, 10, BARS, "solid"]] : [];
            return fold() + drawPieces([...arrow, ...many], color, scaled(26, 34));
        },
    };
    const body = draws[tag]?.() ?? "";
    return body === "" ? null : svgPicture(width, height, BPMN_BORDER, body);
}
