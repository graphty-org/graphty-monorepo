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

/** How far a picture reaches past its node's box on each side, in the node's units. */
interface PictureReach {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
}

/** A picture reaching nowhere past its node. */
const NO_REACH: PictureReach = { left: 0, top: 0, right: 0, bottom: 0 };

/** A node's size and the picture drawn over it. */
interface NodeDrawing {
    readonly width: number;
    readonly height: number;
    readonly picture: string;
}

/**
 * Text as the content or an attribute of an SVG element.
 * @param text - the text
 * @returns it escaped
 */
export function escapeSvg(text: string): string {
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
 * @param reach - how far the drawing reaches past the node's box (a BPMN event on a port)
 * @param program - the program whose drawing it is, as the picture's `data-node-drawing`
 * @returns the URL
 */
export function svgPicture(
    width: number,
    height: number,
    border: number,
    body: string,
    background = "",
    reach: PictureReach = NO_REACH,
    program = "yed-live",
): string {
    const [w, h] = [width - border + reach.left + reach.right, height - border + reach.top + reach.bottom];
    const size = `width="${String(w * PICTURE_SCALE)}" height="${String(h * PICTURE_SCALE)}"`;
    const view = `viewBox="${String(border / 2 - reach.left)} ${String(border / 2 - reach.top)} ${String(w)} ${String(h)}"`;
    const paint = background === "" ? "" : ` style="background:${background}"`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" data-node-drawing="${program}" ${size} ${view}${paint}>${body}</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
 * @param solid - fills every piece in the color (a throwing event's symbol)
 * @returns the elements
 */
function drawPieces(
    pieces: readonly Piece[],
    color: string,
    fit: (p: Piece) => readonly number[],
    solid = false,
): string {
    return pieces
        .map((piece) => {
            const [x, y, w, h] = fit(piece);
            const paint =
                solid || piece[5] === "solid" ? `fill="${color}"` : `fill="none" stroke="${piece[5] ?? color}"`;
            return `<path ${paint} vector-effect="non-scaling-stroke" d="${piece[4]}" transform="translate(${String(x)} ${String(y)}) scale(${String(w / 100)} ${String(h / 100)})"/>`;
        })
        .join("");
}

/** A BPMN event on one of a node's ports (EventPortStyle): its center on the node and its style's attributes. */
export interface PortEvent {
    /** Its center, from the node's left. */
    readonly x: number;
    /** Its center, from the node's top. */
    readonly y: number;
    /** Reads one of its style's attributes. */
    readonly attr: (name: string) => string | undefined;
    /** Reads one of its style's colors as `#rrggbb`, or undefined where it has none. */
    readonly color: (name: string) => string | undefined;
}

/** The characteristics of an event drawn with a second ring inside its first. */
const DOUBLE_RINGS: ReadonlySet<string> = new Set([
    "CATCHING",
    "BOUNDARY_INTERRUPTING",
    "BOUNDARY_NON_INTERRUPTING",
    "THROWING",
]);

/** The characteristics whose symbol is filled with the icon's color, not outlined. */
const FILLED_SYMBOLS: ReadonlySet<string> = new Set(["THROWING", "END"]);

/** How far an event's inner ring is inside its outer one. */
const INNER_RING = 2;

/**
 * Draws a BPMN event on a port as yEd Live 8.5.16 draws it (`yed-live-graphml-specimen-node-shapes-p6`): a ring of its
 * `renderSize` (20 by 20 unset) in its `background` and `outline`, a second ring inside it or a thick one by its
 * `characteristic` (BOUNDARY_INTERRUPTING unset), dashed where it does not interrupt, and its `type`'s symbol
 * (COMPENSATION unset) in its `iconColor`.
 * @param port - the event
 * @returns its elements, and its box on the node (left, top, right, bottom)
 */
function portEvent(port: PortEvent): [string, readonly number[]] {
    const [w, h] = (port.attr("renderSize") ?? "20,20").split(",").map(Number);
    const [left, top] = [port.x - w / 2, port.y - h / 2];
    const characteristic = port.attr("characteristic") ?? "BOUNDARY_INTERRUPTING";
    const fill = port.color("background") ?? "#FAFAFA";
    const outline = port.color("outline") ?? "#008000";
    const dash = characteristic.endsWith("NON_INTERRUPTING") ? ' stroke-dasharray="2,2"' : "";
    const width = characteristic === "END" ? 3 : 1;
    const ring = (inset: number): string =>
        `<ellipse fill="${fill}" stroke="${outline}" stroke-width="${String(width)}"${dash} cx="${String(port.x)}" cy="${String(port.y)}" rx="${String(w / 2 - inset)}" ry="${String(h / 2 - inset)}"/>`;
    const symbol = drawPieces(
        EVENT_SYMBOLS.get(port.attr("type") ?? "COMPENSATION") ?? [],
        port.color("iconColor") ?? "#000000",
        (p) => [left + (p[0] * w) / 30, top + (p[1] * h) / 30, (p[2] * w) / 30, (p[3] * h) / 30],
        FILLED_SYMBOLS.has(characteristic),
    );
    const rings = ring(0) + (DOUBLE_RINGS.has(characteristic) ? ring(INNER_RING) : "");
    return [rings + symbol, [left, top, left + w, top + h]];
}

/** A choreography's message: its envelope's size, and how far it is from the node with the dotted line to it. */
const MESSAGE = { width: 20, height: 14, gap: 15, line: 2 };

/**
 * A choreography's messages as yEd Live 8.5.16 draws them (`yed-live-graphml-specimen-node-shapes-p6`): an envelope
 * over the middle of the node, outside it and joined to it by a dotted line, above it for the initiating message and
 * below it for the response, or the other way round where `initiatingAtTop` is false. The initiating envelope is
 * white and the response's gray unset, both outlined in `messageOutline`.
 * @param style - the style
 * @param size - the node's size
 * @param size.width - its width
 * @param size.height - its height
 * @returns the elements, and the box of each envelope and line on the node (left, top, right, bottom)
 */
function choreographyMessages(
    style: Pick<PortEvent, "attr" | "color">,
    size: { width: number; height: number },
): [string, (readonly number[])[]] {
    const { attr, color } = style;
    const atTop = attr("initiatingAtTop") !== "false";
    const outline = color("messageOutline") ?? "#000000";
    const messages = [
        { shown: attr("initiatingMessage") === "true", top: atTop, fill: color("initiatingColor") ?? "#FFFFFF" },
        { shown: attr("responseMessage") === "true", top: !atTop, fill: color("responseColor") ?? "#808080" },
    ];
    const middle = size.width / 2;
    const left = middle - MESSAGE.width / 2;
    const parts: string[] = [];
    const boxes: (readonly number[])[] = [];
    for (const m of messages.filter((x) => x.shown)) {
        const [near, far] = m.top
            ? [-MESSAGE.line, -MESSAGE.gap - MESSAGE.height]
            : [size.height + MESSAGE.line, size.height + MESSAGE.gap];
        const lineEnd = m.top ? -MESSAGE.gap - MESSAGE.line : size.height + MESSAGE.gap + MESSAGE.line;
        parts.push(
            `<path fill="none" stroke="${outline}" stroke-dasharray="0.01,2" stroke-linecap="round" d="M${String(middle)},${String(near)}V${String(lineEnd)}"/>`,
            `<path fill="${m.fill}" stroke="${outline}" d="M${String(left)},${String(far)}h${String(MESSAGE.width)}v${String(MESSAGE.height)}h${String(-MESSAGE.width)}Z"/>`,
            `<path fill="none" stroke="${outline}" d="M${String(left)},${String(far)}l${String(MESSAGE.width / 2)},${String(MESSAGE.height / 2)}l${String(MESSAGE.width / 2)},${String(-MESSAGE.height / 2)}"/>`,
        );
        boxes.push([left, Math.min(near, far), left + MESSAGE.width, Math.max(near, far + MESSAGE.height)]);
    }
    return [parts.join(""), boxes];
}

/** A BPMN node's picture, its size in the node's units, and how far it reaches past the node. */
interface BpmnDrawing {
    readonly picture: string;
    readonly width: number;
    readonly height: number;
    readonly reach: PictureReach;
}

/**
 * The picture over a BPMN node, or null where its style draws nothing inside or beside its outline: its symbols, a
 * choreography's messages and the events on its ports, which reach past its box.
 * @param tag - the style's name
 * @param style - reads the style's attributes and colors
 * @param size - the node's size
 * @param size.width - its width
 * @param size.height - its height
 * @param ports - the events on its ports
 * @returns the picture and its reach, or null
 */
export function bpmnPicture(
    tag: string,
    style: Pick<PortEvent, "attr" | "color">,
    size: { width: number; height: number },
    ports: readonly PortEvent[] = [],
): BpmnDrawing | null {
    const { attr } = style;
    const color = style.color("iconColor") ?? "#000000";
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
    const draws: Partial<Record<string, () => string>> = {
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
    const [messages, messageBoxes] = tag === "ChoreographyNodeStyle" ? choreographyMessages(style, size) : ["", []];
    const events = ports.map(portEvent);
    const body = (draws[tag]?.() ?? "") + messages + events.map(([drawn]) => drawn).join("");
    if (body === "") {
        return null;
    }
    const boxes = [...messageBoxes, ...events.map(([, box]) => box)];
    const reach: PictureReach = {
        left: Math.max(0, ...boxes.map((b) => -b[0])),
        top: Math.max(0, ...boxes.map((b) => -b[1])),
        right: Math.max(0, ...boxes.map((b) => b[2] - width)),
        bottom: Math.max(0, ...boxes.map((b) => b[3] - height)),
    };
    return {
        picture: svgPicture(width, height, BPMN_BORDER, body, "", reach),
        width: width - BPMN_BORDER + reach.left + reach.right,
        height: height - BPMN_BORDER + reach.top + reach.bottom,
        reach,
    };
}

/**
 * A number as SVG text, to a thousandth.
 * @param v - the number
 * @returns the text
 */
function svgNumber(v: number): string {
    return String(Math.round(v * 1000) / 1000);
}

/**
 * The gloss yEd Live draws over a ShinyPlateNodeStyle: a white shape over its upper left, a corner of `radius` less a
 * quarter of it, opaque at its top left and nearly clear eight tenths of the way across, as yEd Live 8.5.16 draws it
 * (`yed-live-graphml-specimen-node-shapes-p2`): it reaches 0.65 of the node's width and 0.8 of its height, a quarter of
 * the radius in from both, and its lower right side curves through its middle.
 * @param width - the node's width
 * @param height - the node's height
 * @param radius - its corner radius
 * @param border - its border's width
 * @returns the picture URL
 */
export function shinyPlateGloss(width: number, height: number, radius: number, border: number): string {
    const inset = radius / 4;
    const c = radius - inset;
    const [x0, y0, x1, y1] = [inset, inset, 0.65 * width - inset, 0.8 * height - inset];
    const p = (x: number, y: number): string => `${svgNumber(x)},${svgNumber(y)}`;
    const d = [
        `M${p(x0, y0 + c)}`,
        `Q${p(x0, y0)} ${p(x0 + c, y0)}`,
        `L${p(x1 - c, y0)}`,
        `Q${p(x1, y0)} ${p(x1, y0 + c)}`,
        `Q${p(x1, y0 + 2 * c)} ${p((x0 + x1) / 2 + c, (y0 + y1) / 2 + c)}`,
        `Q${p(x0 + 2 * c, y1)} ${p(x0 + c, y1)}`,
        `Q${p(x0, y1)} ${p(x0, y1 - c)}Z`,
    ].join("");
    // ponytail: the ramp runs along the gloss box's diagonal, which is yEd Live's own with no radius; with one, its
    // direction differs by a few degrees
    const across = svgNumber(x1 > x0 ? (y1 - y0) / (x1 - x0) : 1);
    const ramp =
        `<linearGradient id="g" x1="0" y1="0" x2="${across}" y2="1">` +
        '<stop stop-color="white" stop-opacity="0.859" offset="0"/>' +
        '<stop stop-color="white" stop-opacity="0.078" offset="0.8"/></linearGradient>';
    return svgPicture(width, height, border, `<defs>${ramp}</defs><path fill="url(#g)" d="${d}"/>`);
}

/** A rounded square's outline, 14 across about its middle, with corners of 2.1. */
const ICON_ROUND_SQUARE =
    "M4.9,-7a2.1,2.1,0,0,1,2.1,2.1v9.8a2.1,2.1,0,0,1,-2.1,2.1h-9.8a2.1,2.1,0,0,1,-2.1,-2.1v-9.8a2.1,2.1,0,0,1,2.1,-2.1Z";
/** A circle's outline, 14 across about its middle. */
const ICON_CIRCLE = "M0,-7a7,7,0,0,1,0,14a7,7,0,0,1,0,-14Z";
/** A square's outline, 14 across about its middle. */
const ICON_SQUARE = "M-7,-7h14v14h-14Z";

/**
 * The backgrounds of a yFiles GroupNodeStyle's icon (`iconBackgroundShape`), copied from yEd Live 8.5.16's own drawing
 * of an icon 14 across about its middle (`yed-live-graphml-specimen-groups-p2`): a solid shape, or its ring a tenth
 * of the icon wide. NONE draws none.
 */
const GROUP_ICON_BACKGROUNDS: ReadonlyMap<string, string> = new Map([
    ["ROUND_RECTANGLE_SOLID", ICON_ROUND_SQUARE],
    [
        "ROUND_RECTANGLE",
        `${ICON_ROUND_SQUARE}m0,1.4a0.7,0.7,0,0,1,0.7,0.7v9.8a0.7,0.7,0,0,1,-0.7,0.7h-9.8a0.7,0.7,0,0,1,-0.7,-0.7v-9.8a0.7,0.7,0,0,1,0.7,-0.7Z`,
    ],
    ["CIRCLE_SOLID", ICON_CIRCLE],
    ["CIRCLE", `${ICON_CIRCLE}m0,1.4a5.6,5.6,0,0,1,0,11.2a5.6,5.6,0,0,1,0,-11.2Z`],
    ["SQUARE_SOLID", ICON_SQUARE],
    ["SQUARE", `${ICON_SQUARE}m1.4,1.4h11.2v11.2h-11.2Z`],
]);

/** A triangle pointing right, and a chevron pointing right, from the same drawing. */
const ICON_TRIANGLE = "M-1.4,-3.15v6.3l4.2,-3.15Z";
const ICON_CHEVRON = "M-1.89,2.17l2.1,-2.17l-2.1,-2.17l0.98,-0.98l3.15,3.15l-3.15,3.15Z";

/** The signs of a GroupNodeStyle's icon (`groupIcon`, `folderIcon`) and their turn in degrees, from the same drawing. */
const GROUP_ICON_SIGNS: ReadonlyMap<string, readonly [string, number]> = new Map([
    ["MINUS", ["M-3.5,-0.7h7v1.4h-7Z", 0]],
    ["PLUS", ["M0.7,-3.5h-1.4v2.8h-2.8v1.4h2.8v2.8h1.4v-2.8h2.8v-1.4h-2.8Z", 0]],
    ["TRIANGLE_RIGHT", [ICON_TRIANGLE, 0]],
    ["TRIANGLE_DOWN", [ICON_TRIANGLE, 90]],
    ["TRIANGLE_LEFT", [ICON_TRIANGLE, 180]],
    ["TRIANGLE_UP", [ICON_TRIANGLE, -90]],
    ["CHEVRON_RIGHT", [ICON_CHEVRON, 0]],
    ["CHEVRON_DOWN", [ICON_CHEVRON, 90]],
    ["CHEVRON_LEFT", [ICON_CHEVRON, 180]],
    ["CHEVRON_UP", [ICON_CHEVRON, -90]],
]);

/** The size the icon paths above are drawn at. */
const ICON_FRAME = 14;
/** How far in from the group's top and its side yEd Live 8.5.16 puts an icon's box, past its `iconOffset`. */
const GROUP_ICON_INSET = 4;

/** What a GroupNodeStyle says about its icon. */
export interface GroupIcon {
    /** `groupIcon` on an open group, `folderIcon` on a collapsed one */
    readonly sign: string;
    /** `iconBackgroundShape` */
    readonly background: string;
    /** `iconPosition`: LEADING puts it at the left of the top, anything else at the right */
    readonly position: string;
    readonly size: number;
    readonly offset: number;
    readonly foregroundFill: string;
    readonly backgroundFill: string;
}

/**
 * The picture of a group's collapse or expand icon on its top tab, or null where it shows none. yEd Live 8.5.16 draws
 * the icon's box `iconSize` across, `iconOffset` plus 4 in from the group's top and from its trailing (right) side, or
 * from its leading side under `iconPosition="LEADING"` (`yed-live-graphml-specimen-groups-p2`, `-p3`, `-p4`).
 * @param size - the group's size
 * @param size.width - its width
 * @param size.height - its height
 * @param border - its border's width
 * @param icon - the icon
 * @returns the picture URL, or null
 */
export function groupIconPicture(
    size: { width: number; height: number },
    border: number,
    icon: GroupIcon,
): string | null {
    const glyph = GROUP_ICON_SIGNS.get(icon.sign);
    if (glyph === undefined) {
        return null;
    }
    const near = GROUP_ICON_INSET + icon.offset + icon.size / 2;
    const x = icon.position === "LEADING" ? near : size.width - near;
    const scale = Math.round((icon.size / ICON_FRAME) * 1e6) / 1e6;
    const shape = GROUP_ICON_BACKGROUNDS.get(icon.background);
    const back = shape === undefined ? "" : `<path fill-rule="evenodd" fill="${icon.backgroundFill}" d="${shape}"/>`;
    const sign = `<path fill="${icon.foregroundFill}" d="${glyph[0]}" transform="rotate(${String(glyph[1])})"/>`;
    const body = `<g transform="translate(${svgNumber(x)} ${svgNumber(near)}) scale(${String(scale)})">${back}${sign}</g>`;
    return svgPicture(size.width, size.height, border, body);
}
