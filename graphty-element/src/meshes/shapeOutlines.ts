/**
 * @file The 2D outlines node shapes are built from: the flat shapes of 2D tools, the ring a node
 * border is drawn as, and the convex hull of a solid seen from the front.
 *
 * Plain arithmetic on [x, y] pairs, with no Babylon.js, so the geometry is tested on its own. Every
 * outline is counter-clockwise and centred on the origin.
 */

/** A point in the plane a flat shape is drawn in. */
export type Point2 = readonly [number, number];

/**
 * Whether a number is above zero: false for zero, a negative number and NaN, so a width or a size a style left
 * unreadable draws nothing.
 * @param x - The number.
 * @returns Whether it is positive.
 */
export function isPositive(x: number): boolean {
    return x > 0;
}

/** One piece of a border ring: its inner edge and its outer edge, point for point. */
export interface RingPiece {
    readonly inner: readonly Point2[];
    readonly outer: readonly Point2[];
    /** Whether the piece goes all the way round, so its last point joins its first. */
    readonly closed: boolean;
}

/** How many points a quarter of an ellipse or a rounded corner is drawn with. */
const ARC_STEPS = 8;

/**
 * Pajek 6.02's man and woman, the figures of its genealogies, as its SVG export draws them (x_fact 0.5,
 * `graph-io/test/fidelity/oracles/pajek-specimen-node-shapes.svg`, vertices 9 and 10): a man 2.5 times as tall as he
 * is wide, a woman in a skirt and with her arms out a little wider.
 */
const PAJEK_MAN =
    "M -0.48 28.93 A 1.60 1.60 0 0 1 -6.88 28.93 L -6.88 -11.97 A 0.59 0.59 0 0 0 -8.06 -11.97 L -8.06 3.33 " +
    "A 2.22 2.22 0 0 1 -12.51 3.33 L -12.51 -14.62 A 6.66 5.54 0 0 1 -6.98 -20.16 L -1.38 -20.86 L -1.38 -21.98 " +
    "A 5.47 5.47 0 1 1 1.38 -21.98 L 1.38 -20.86 L 6.98 -20.16 A 6.66 5.54 0 0 1 12.51 -14.62 L 12.51 3.33 " +
    "A 2.22 2.22 0 0 1 8.06 3.33 L 8.06 -11.97 A 0.59 0.59 0 0 0 6.88 -11.97 L 6.88 28.93 A 1.60 1.60 0 0 1 0.54 28.93 " +
    "L 0.48 5.57 L -0.48 5.57 z";
const PAJEK_WOMAN =
    "M -0.84 29.41 A 2.37 2.37 0 0 1 -5.59 29.41 L -5.59 11.47 L -12.32 11.47 L -5.33 -13.03 " +
    "A 0.59 0.59 0 0 0 -6.50 -13.03 L -11.08 1.82 A 2.05 2.05 0 0 1 -14.85 0.20 L -10.01 -16.25 " +
    "A 9.98 9.98 0 0 1 -1.40 -21.29 L -1.95 -22.13 A 5.52 5.61 0 1 1 1.95 -22.13 L 1.40 -21.29 " +
    "A 9.98 9.98 0 0 1 10.01 -16.25 L 14.85 0.20 A 2.05 2.05 0 0 1 11.08 1.82 L 6.50 -13.03 " +
    "A 0.59 0.59 0 0 0 5.33 -13.03 L 12.32 11.47 L 5.59 11.47 L 5.59 29.41 A 2.37 2.37 0 0 1 0.84 29.41 " +
    "L 0.84 11.47 L -0.84 11.47 z";

/**
 * The flat shapes as unit outlines, before they are fitted to a width and a height. Each is
 * stretched to fill its box exactly, which is how Cytoscape and yEd draw them.
 */
const UNIT_OUTLINES: Readonly<Record<string, readonly Point2[]>> = {
    rectangle: [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
    ],
    diamond: [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
    ],
    triangle: [
        [-1, -1],
        [1, -1],
        [0, 1],
    ],
    pentagon: regularPolygon(5),
    hexagon: regularPolygon(6, 0),
    octagon: regularPolygon(8, Math.PI / 8),
    parallelogram: [
        [-1, -1],
        [0.5, -1],
        [1, 1],
        [-0.5, 1],
    ],
    trapezoid: [
        [-1, -1],
        [1, -1],
        [0.5, 1],
        [-0.5, 1],
    ],
    star: starPolygon(5, 0.38),
    vee: [
        [0, -1],
        [1, 1],
        [0, 0.33],
        [-1, 1],
    ],
    // Pajek's vertex shapes: a plus-shaped cross, a house (a box under a pitched roof), and the
    // man and woman figures of its genealogy drawings, as Pajek draws them (PAJEK_MAN, PAJEK_WOMAN).
    cross: [
        [-1 / 3, -1],
        [1 / 3, -1],
        [1 / 3, -1 / 3],
        [1, -1 / 3],
        [1, 1 / 3],
        [1 / 3, 1 / 3],
        [1 / 3, 1],
        [-1 / 3, 1],
        [-1 / 3, 1 / 3],
        [-1, 1 / 3],
        [-1, -1 / 3],
        [-1 / 3, -1 / 3],
    ],
    house: [
        [-1, -1],
        [1, -1],
        [1, 0.2],
        [0, 1],
        [-1, 0.2],
    ],
    man: pajekFigure(PAJEK_MAN),
    woman: pajekFigure(PAJEK_WOMAN),
};

/**
 * An SVG path of straight lines and unrotated elliptical arcs (`M`, `L`, `A`, `z`, absolute, y down) as a unit
 * outline: its arcs drawn with `ARC_STEPS` points a quarter turn, fitted to the box -1..1 each way, y up,
 * counter-clockwise.
 * @param path - The path.
 * @returns The outline.
 */
function pajekFigure(path: string): Point2[] {
    const tokens = path.match(/[MLAz]|-?\d+(?:\.\d+)?/g) ?? [];
    const points: Point2[] = [];
    let at: Point2 = [0, 0];
    for (let i = 0; i < tokens.length;) {
        const n = (k: number): number => Number(tokens[i + k]);
        if (tokens[i] === "M" || tokens[i] === "L") {
            at = [n(1), n(2)];
            points.push(at);
            i += 3;
        } else if (tokens[i] === "A") {
            const to: Point2 = [n(6), n(7)];
            points.push(...arcPoints(at, n(1), n(2), n(4) === n(5), n(5) === 1, to));
            at = to;
            i += 8;
        } else {
            i += 1;
        }
    }
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const unit = points.map(([x, y]): Point2 => [(2 * x - x0 - x1) / (x1 - x0), (y0 + y1 - 2 * y) / (y1 - y0)]);
    // the path runs clockwise on screen, so counter-clockwise once y points up
    return signedArea(unit) < 0 ? unit.reverse() : unit;
}

/**
 * The points of an SVG elliptical arc after its start (SVG's endpoint-to-center conversion, with no rotation; radii
 * too small for the chord grow to reach it).
 * @param from - Where it starts.
 * @param rx - Its x radius.
 * @param ry - Its y radius.
 * @param sameFlags - Whether its large-arc flag equals its sweep flag (which picks the center).
 * @param sweep - Whether it turns the positive way (clockwise on screen).
 * @param to - Where it ends.
 * @returns Its points, the last one `to`.
 */
function arcPoints(from: Point2, rx: number, ry: number, sameFlags: boolean, sweep: boolean, to: Point2): Point2[] {
    const [dx, dy] = [(from[0] - to[0]) / 2, (from[1] - to[1]) / 2];
    const grow = Math.max(1, Math.hypot(dx / rx, dy / ry));
    const [a, b] = [rx * grow, ry * grow];
    const square = (a * a * b * b - a * a * dy * dy - b * b * dx * dx) / (a * a * dy * dy + b * b * dx * dx);
    const k = Math.sqrt(Math.max(0, square)) * (sameFlags ? -1 : 1);
    const [ux, uy] = [(k * a * dy) / b, (-k * b * dx) / a];
    const [cx, cy] = [ux + (from[0] + to[0]) / 2, uy + (from[1] + to[1]) / 2];
    const start = Math.atan2((dy - uy) / b, (dx - ux) / a);
    let turn = Math.atan2((-dy - uy) / b, (-dx - ux) / a) - start;
    if (sweep && turn < 0) {
        turn += 2 * Math.PI;
    } else if (!sweep && turn > 0) {
        turn -= 2 * Math.PI;
    }
    const steps = Math.max(2, Math.ceil((Math.abs(turn) / (Math.PI / 2)) * ARC_STEPS));
    return Array.from({ length: steps }, (_, i): Point2 => {
        const angle = start + (turn * (i + 1)) / steps;
        return i === steps - 1 ? to : [cx + a * Math.cos(angle), cy + b * Math.sin(angle)];
    });
}

/**
 * The signed area (twice it) inside an outline (shoelace): positive when it runs counter-clockwise.
 * @param outline - The outline.
 * @returns The area.
 */
function signedArea(outline: readonly Point2[]): number {
    return outline.reduce((sum, [x, y], i) => {
        const [nx, ny] = outline[(i + 1) % outline.length];
        return sum + x * ny - nx * y;
    }, 0);
}

/**
 * A regular polygon, as a unit outline.
 * @param sides - How many sides.
 * @param start - The angle of the first corner; by default one corner points straight up.
 * @returns Its corners, counter-clockwise.
 */
function regularPolygon(sides: number, start = Math.PI / 2): Point2[] {
    return Array.from({ length: sides }, (_, i): Point2 => {
        const angle = start + (2 * Math.PI * i) / sides;

        return [Math.cos(angle), Math.sin(angle)];
    });
}

/**
 * A star, as a unit outline: points alternating between the outer and the inner radius.
 * @param points - How many points the star has.
 * @param inner - The inner radius as a fraction of the outer one.
 * @returns Its corners, counter-clockwise, the first pointing straight up.
 */
function starPolygon(points: number, inner: number): Point2[] {
    return Array.from({ length: points * 2 }, (_, i): Point2 => {
        const angle = Math.PI / 2 + (Math.PI * i) / points;
        const radius = i % 2 === 0 ? 1 : inner;

        return [radius * Math.cos(angle), radius * Math.sin(angle)];
    });
}

/**
 * An ellipse filling a box.
 * @param halfWidth - Half the box's width.
 * @param halfHeight - Half its height.
 * @returns The outline, counter-clockwise.
 */
function ellipse(halfWidth: number, halfHeight: number): Point2[] {
    const steps = ARC_STEPS * 4;

    return Array.from({ length: steps }, (_, i): Point2 => {
        const angle = (2 * Math.PI * i) / steps;

        return [halfWidth * Math.cos(angle), halfHeight * Math.sin(angle)];
    });
}

/**
 * A rectangle with rounded corners filling a box. The corner radius is `fraction` of the shorter
 * side (a quarter by default), or `maxRadius` when that is smaller -- Cytoscape.js's rule, which
 * caps a quarter at 8 px, so a large box keeps small corners -- and it is the same in both
 * directions however long and thin the box is.
 * @param halfWidth - Half the box's width.
 * @param halfHeight - Half its height.
 * @param maxRadius - The largest corner radius; unset, `fraction` of the shorter side.
 * @param exact - Whether `maxRadius` is drawn as given, up to half the shorter side, rather than capped at `fraction`.
 * @param fraction - The share of the shorter side the corners are rounded by, up to a half.
 * @returns The outline, counter-clockwise.
 */
function roundRectangle(
    halfWidth: number,
    halfHeight: number,
    maxRadius = Infinity,
    exact = false,
    fraction = 1 / 4,
): Point2[] {
    const half = Math.min(halfWidth, halfHeight);
    const radius = Math.max(
        0,
        exact && Number.isFinite(maxRadius)
            ? Math.min(half, maxRadius)
            : Math.min(half, 2 * half * fraction, maxRadius),
    );
    const corners: Point2[] = [
        [halfWidth - radius, -halfHeight + radius],
        [halfWidth - radius, halfHeight - radius],
        [-halfWidth + radius, halfHeight - radius],
        [-halfWidth + radius, -halfHeight + radius],
    ];
    const points: Point2[] = [];

    corners.forEach(([cx, cy], corner) => {
        for (let step = 0; step <= ARC_STEPS; step++) {
            const angle = -Math.PI / 2 + (Math.PI / 2) * (corner + step / ARC_STEPS);
            points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
        }
    });

    // a radius of half a side leaves that side no straight run, so one corner's last point is the next one's
    // first: a repeated point the fan and the ear clipper cannot triangulate (a pill drew half filled)
    return points.filter(([x, y], i) => {
        const [px, py] = points[(i + points.length - 1) % points.length];

        return Math.hypot(x - px, y - py) > 1e-9 * Math.max(1, half);
    });
}

/**
 * Stretch an outline so it exactly fills a box centred on the origin.
 * @param unit - The outline at any size.
 * @param halfWidth - Half the box's width.
 * @param halfHeight - Half its height.
 * @returns The fitted outline.
 */
function fitToBox(unit: readonly Point2[], halfWidth: number, halfHeight: number): Point2[] {
    const xs = unit.map(([x]) => x);
    const ys = unit.map(([, y]) => y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    return unit.map(([x, y]): Point2 => [
        ((x - midX) / (maxX - midX)) * halfWidth,
        ((y - midY) / (maxY - midY)) * halfHeight,
    ]);
}

/**
 * A point of a shape's corners, parts or lines (`shape.points`, `shape.parts`, `shape.lines`): its x as a fraction of
 * the half width plus a length, and its y as a fraction of the half height plus a length.
 */
export type ShapePoint = readonly [x: number, xLength: number, y: number, yLength: number];

/**
 * A coordinate of a shape's points: a number, a fraction, or a fraction and the length added to it (`-1+24`: 24 in
 * from the left side).
 * @param text - The coordinate.
 * @returns The fraction and the length, NaN when it is neither.
 */
function coordinate(text: string | undefined): [number, number] {
    const plain = text === undefined ? Number.NaN : Number(text);
    if (text === undefined || Number.isFinite(plain)) {
        return [plain, 0];
    }
    // the length starts at the last sign that is not the fraction's own
    const at = Math.max(text.lastIndexOf("+"), text.lastIndexOf("-"));
    const [fraction, length] = at > 0 ? [Number(text.slice(0, at)), Number(text.slice(at))] : [Number.NaN, Number.NaN];
    return Number.isFinite(fraction) && Number.isFinite(length) ? [fraction, length] : [Number.NaN, Number.NaN];
}

/**
 * One list of a shape's points from its `x,y x,y ...` text, each coordinate a fraction of the half width or height,
 * optionally followed by a signed length (`-1+24,0`).
 * @param text - The points, as `x,y` pairs separated by spaces.
 * @returns The points, or null when there are none or one is not two coordinates.
 */
export function shapePointList(text: string | undefined): ShapePoint[] | null {
    const points = (text ?? "")
        .trim()
        .split(/\s+/)
        .filter((pair) => pair !== "")
        .map((pair): ShapePoint => {
            const [x, y, extra] = pair.split(",");
            return extra === undefined ? [...coordinate(x), ...coordinate(y)] : [Number.NaN, 0, Number.NaN, 0];
        });
    return points.length > 0 && points.every((p) => p.every((v) => Number.isFinite(v))) ? points : null;
}

/**
 * Whether a polygon is drawn against its box (`shape.points` whose corners add lengths to their fractions, `-1+24`):
 * a glyph of pieces at fixed sizes, which may fill little of its box and sit off its center. Graphviz ends its edges at
 * the box and places its label by it, so the node's surface is the box, not its pieces.
 * @param text - The corners.
 * @returns True when at least three corners parse and one of them carries a length.
 */
export function drawnAgainstBox(text: string | undefined): boolean {
    const corners = shapePointList(text);
    return (
        corners !== null &&
        corners.length >= 3 &&
        corners.some(([, xLength, , yLength]) => xLength !== 0 || yLength !== 0)
    );
}

/**
 * Where a shape's point is drawn in a box.
 * @param point - The point.
 * @param halfWidth - The box's half width.
 * @param halfHeight - Its half height.
 * @param perLength - The box's units per unit of the point's lengths.
 * @returns The point, relative to the box's center.
 */
export function placePoint(point: ShapePoint, halfWidth: number, halfHeight: number, perLength = 1): Point2 {
    const [x, xLength, y, yLength] = point;
    return [x * halfWidth + xLength * perLength, y * halfHeight + yLength * perLength];
}

/**
 * A polygon's corners from its `x,y x,y ...` text (`shape.points`), counter-clockwise, placed in a box: as fractions
 * of its half width and half height when it is 1 by 1, its corners' lengths in the box's units.
 * @param text - The corners, as `x,y` pairs separated by spaces.
 * @param halfWidth - The box's half width.
 * @param halfHeight - Its half height.
 * @returns The corners, or null when there are fewer than three or one is not two coordinates.
 */
export function polygonPoints(text: string | undefined, halfWidth = 1, halfHeight = 1): Point2[] | null {
    const corners = shapePointList(text);
    if (corners === null || corners.length < 3) {
        return null;
    }
    const points = corners.map((p) => placePoint(p, halfWidth, halfHeight));

    const area = points.reduce((sum, [x0, y0], i) => {
        const [x1, y1] = points[(i + 1) % points.length];

        return sum + x0 * y1 - x1 * y0;
    }, 0);

    return area < 0 ? points.reverse() : points;
}

/**
 * How far a polygon's corners reach from its center along x and along y, in the units they are in.
 * @param points - The corners.
 * @returns The farthest |x| and |y|.
 */
export function polygonReach(points: readonly Point2[]): [number, number] {
    return [Math.max(...points.map(([x]) => Math.abs(x))), Math.max(...points.map(([, y]) => Math.abs(y)))];
}

/** The polygons drawn with rounded corners, by the name of their rounded shape. */
const ROUNDED: Readonly<Record<string, string>> = {
    "round-triangle": "triangle",
    "round-diamond": "diamond",
    "round-pentagon": "pentagon",
    "round-hexagon": "hexagon",
    "round-octagon": "octagon",
    "round-polygon": "polygon",
};

/** How one of a node's further texts is drawn where it differs from the node's label. */
export interface ShapeTextLook {
    /** How tall its letters (one font size) are drawn, as a share of the node's height. */
    size?: number;
    /** Its color. */
    color?: string;
    /** Its font family. */
    font?: string;
    /** How far it is turned, in degrees clockwise on screen, about its point. */
    rotation?: number;
}

/**
 * A node's further texts (`shape.texts`): a JSON list of `[x, y, text]` or `[x, y, text, look]`, each point relative
 * to the node's center as fractions of its half width and half height, y up, and `look` an object of what differs
 * from the node's label (`size`, a share of the node's height; `color`; `font`; `rotation`). An entry of any other
 * shape is passed over, and so is a look's field of the wrong type.
 * @param text - the list, or undefined
 * @returns the texts, none when unset or not a list
 */
export function shapeTexts(text: string | undefined): [number, number, string, ShapeTextLook][] {
    if (text === undefined || text.trim() === "") {
        return [];
    }
    let list: unknown;
    try {
        list = JSON.parse(text);
    } catch {
        return [];
    }
    if (!Array.isArray(list)) {
        return [];
    }
    return list.flatMap((e: unknown): [number, number, string, ShapeTextLook][] => {
        if (
            !Array.isArray(e) ||
            !Number.isFinite(e[0]) ||
            !Number.isFinite(e[1]) ||
            typeof e[2] !== "string" ||
            e[2] === ""
        ) {
            return [];
        }
        const raw: unknown = e[3];
        const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
        const look: ShapeTextLook = {
            ...(typeof o.size === "number" && o.size > 0 ? { size: o.size } : {}),
            ...(typeof o.color === "string" ? { color: o.color } : {}),
            ...(typeof o.font === "string" ? { font: o.font } : {}),
            ...(typeof o.rotation === "number" && Number.isFinite(o.rotation) ? { rotation: o.rotation } : {}),
        };
        return [[e[0] as number, e[1] as number, e[2], look]];
    });
}

/**
 * Whether a shape name is one of the flat outlines this module draws.
 * @param shape - A node shape name.
 * @returns True for the flat shapes.
 */
export function isFlatShape(shape: string): boolean {
    return (
        shape === "ellipse" ||
        shape === "round-rectangle" ||
        shape === "none" ||
        shape === "polygon" ||
        shape === "barrel" ||
        shape === "database" ||
        Object.hasOwn(ROUNDED, shape) ||
        Object.hasOwn(UNIT_OUTLINES, shape)
    );
}

/**
 * A polygon with every corner rounded by a circular arc of one radius, the arc meeting both sides
 * where they touch it (Cytoscape.js's round polygons, `getRoundCorner`): a corner whose sides are
 * too short for the radius gets the largest arc that fits in half of each side.
 * @param corners - The polygon, counter-clockwise.
 * @param radius - The arc's radius.
 * @returns The rounded outline, counter-clockwise.
 */
export function roundCorners(corners: readonly Point2[], radius: number): Point2[] {
    if (!isPositive(radius)) {
        return [...corners];
    }

    const out: Point2[] = [];
    corners.forEach((p, i) => {
        const a = corners[(i + corners.length - 1) % corners.length];
        const b = corners[(i + 1) % corners.length];
        const l1 = Math.hypot(a[0] - p[0], a[1] - p[1]);
        const l2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
        const u1: Point2 = [(a[0] - p[0]) / l1, (a[1] - p[1]) / l1];
        const u2: Point2 = [(b[0] - p[0]) / l2, (b[1] - p[1]) / l2];
        const angle = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
        if (!(l1 > 0 && l2 > 0) || angle < 1e-6 || Math.PI - angle < 1e-6) {
            out.push(p);
            return;
        }

        const half = angle / 2;
        const along = Math.min(radius / Math.tan(half), l1 / 2, l2 / 2);
        const r = along * Math.tan(half);
        const bisector = Math.hypot(u1[0] + u2[0], u1[1] + u2[1]);
        const toCenter = r / Math.sin(half);
        const c: Point2 = [
            p[0] + ((u1[0] + u2[0]) / bisector) * toCenter,
            p[1] + ((u1[1] + u2[1]) / bisector) * toCenter,
        ];
        const from = Math.atan2(p[1] + u1[1] * along - c[1], p[0] + u1[0] * along - c[0]);
        let sweep = Math.atan2(p[1] + u2[1] * along - c[1], p[0] + u2[0] * along - c[0]) - from;
        // the short way round: the arc turns by the corner's exterior angle, under half a turn
        sweep -= 2 * Math.PI * Math.round(sweep / (2 * Math.PI));
        for (let step = 0; step <= ARC_STEPS; step++) {
            const t = from + (sweep * step) / ARC_STEPS;
            out.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]);
        }
    });

    return out;
}

/**
 * A barrel filling a box: a rectangle whose corners are cut back by a quarter of its width and a
 * twentieth of its height with shallow curves (Cytoscape.js's `barrel`, `drawBarrelPath`).
 * @param halfWidth - Half the box's width.
 * @param halfHeight - Half its height.
 * @returns The outline, counter-clockwise.
 */
function barrel(halfWidth: number, halfHeight: number): Point2[] {
    // ponytail: Cytoscape.js caps the cut at 100 x 15 px; a barrel wider than 400 px cuts deeper here
    const w = 0.5 * halfWidth;
    const h = 0.1 * halfHeight;
    const ctrl = 0.05 * w;
    /**
     * One corner's quadratic curve, from its side to its top or bottom.
     * @param sx - Which side: 1 right, -1 left.
     * @param sy - Which end: 1 top, -1 bottom.
     * @returns The curve's points.
     */
    const corner = (sx: number, sy: number): Point2[] => {
        const p0: Point2 = [sx * halfWidth, sy * (halfHeight - h)];
        const p1: Point2 = [sx * (halfWidth - ctrl), sy * halfHeight];
        const p2: Point2 = [sx * (halfWidth - w), sy * halfHeight];
        return Array.from({ length: ARC_STEPS + 1 }, (_, i): Point2 => {
            const t = i / ARC_STEPS;
            const [k0, k1, k2] = [(1 - t) * (1 - t), 2 * t * (1 - t), t * t];
            return [k0 * p0[0] + k1 * p1[0] + k2 * p2[0], k0 * p0[1] + k1 * p1[1] + k2 * p2[1]];
        });
    };
    const flip = (points: Point2[]): Point2[] => [...points].reverse();

    // counter-clockwise from the right side's bottom: up the right, along the top, down the left, along the bottom
    return [...flip(corner(1, -1)), ...corner(1, 1), ...flip(corner(-1, 1)), ...corner(-1, -1)];
}

/**
 * A cylinder seen from the side, filling a box: its sides straight, its top and bottom the near
 * halves of ellipses a sixth of its height deep (vis-network's `database`, a flowchart's stored data).
 * @param halfWidth - Half the box's width.
 * @param halfHeight - Half its height.
 * @returns The outline, counter-clockwise.
 */
function database(halfWidth: number, halfHeight: number): Point2[] {
    // vis-network's `database`: the ellipse at each end is a third of the height tall
    const cap = halfHeight / 3;
    const steps = ARC_STEPS * 2;
    const arc = (cy: number, from: number): Point2[] =>
        Array.from({ length: steps + 1 }, (_, i): Point2 => {
            const t = from + (Math.PI * i) / steps;
            return [halfWidth * Math.cos(t), cy + cap * Math.sin(t)];
        });

    // the top's upper half (right to left), then the bottom's lower half (left to right)
    return [...arc(halfHeight - cap, 0), ...arc(-halfHeight + cap, Math.PI)];
}

/**
 * A polygon's outline in a box: its corners where they say, or stretched about its center, not its box, so the
 * corners stay where they are around the node's position and the farthest on each axis reach the node's side.
 * @param points - The corners (`shape.points`), their lengths in the box's units.
 * @param halfWidth - The box's half width.
 * @param halfHeight - Its half height.
 * @param stretch - Whether the corners are stretched.
 * @returns The outline, counter-clockwise; the box without usable corners.
 */
function polygonOutline(points: string | undefined, halfWidth: number, halfHeight: number, stretch: boolean): Point2[] {
    const corners = polygonPoints(points, halfWidth, halfHeight);
    if (corners === null) {
        return fitToBox(UNIT_OUTLINES.rectangle, halfWidth, halfHeight);
    }
    if (!stretch) {
        return corners;
    }
    const [reachX, reachY] = polygonReach(corners);
    const toX = reachX > 0 ? halfWidth / reachX : 1;
    const toY = reachY > 0 ? halfHeight / reachY : 1;
    return corners.map(([x, y]): Point2 => [x * toX, y * toY]);
}

/**
 * The outline of one flat shape, filling a box centred on the origin.
 * @param shape - A flat shape name.
 * @param width - The box's width.
 * @param height - Its height.
 * @param cornerRadius - A round-rectangle's or a round-* polygon's largest corner radius, in the box's units.
 * @param points - A polygon's corners (`shape.points`), their lengths in the box's units; a polygon without
 *   usable ones is drawn as a rectangle.
 * @param stretch - Whether a polygon's corners are stretched to reach the box's sides (`shape.stretchPoints`), or
 *   drawn where they say.
 * @param corners - How the corners are rounded.
 * @param corners.exact - Whether `cornerRadius` is drawn as given (`shape.exactCornerRadius`), up to half the
 *   shorter side, rather than capped at a quarter of it (round-rectangle) or a tenth (round-* polygons).
 * @param corners.fraction - The share of the shorter side a round-rectangle's corners are rounded by when not
 *   `exact` (`shape.cornerFraction`), a quarter by default.
 * @returns The outline, counter-clockwise, or an empty list for a shape that is not flat.
 */
export function flatShapeOutline(
    shape: string,
    width: number,
    height: number,
    cornerRadius?: number,
    points?: string,
    stretch = true,
    { exact = false, fraction }: { readonly exact?: boolean; readonly fraction?: number } = {},
): Point2[] {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    if (shape === "polygon") {
        return polygonOutline(points, halfWidth, halfHeight, stretch);
    }

    if (shape === "ellipse") {
        return ellipse(halfWidth, halfHeight);
    }

    if (shape === "round-rectangle") {
        return roundRectangle(halfWidth, halfHeight, cornerRadius, exact, fraction);
    }

    const sharp = ROUNDED[shape] as string | undefined;
    if (sharp !== undefined) {
        // a tenth of the shorter side, as Cytoscape.js rounds its polygons, never more than the
        // corner radius (as a round-rectangle's corners are capped); exact, the radius as given
        // (`roundCorners` still keeps each arc within half of both its sides)
        const tenth = Math.min(width, height) / 10;
        return roundCorners(
            flatShapeOutline(sharp, width, height, undefined, points, stretch),
            exact && cornerRadius !== undefined ? cornerRadius : Math.min(tenth, cornerRadius ?? Infinity),
        );
    }

    if (shape === "barrel") {
        return barrel(halfWidth, halfHeight);
    }

    if (shape === "database") {
        return database(halfWidth, halfHeight);
    }

    // A node with no body still takes up its box, for its label and the edges that meet it.
    if (shape === "none") {
        return fitToBox(UNIT_OUTLINES.rectangle, halfWidth, halfHeight);
    }

    const unit = UNIT_OUTLINES[shape] as readonly Point2[] | undefined;

    return unit === undefined ? [] : fitToBox(unit, halfWidth, halfHeight);
}

/**
 * Whether an outline can be fanned from the origin: the origin is on the inner side of every
 * one of its sides, so every corner can be seen from it.
 * @param outline - The outline, counter-clockwise.
 * @returns True when a fan from the origin covers it exactly.
 */
export function fansFromOrigin(outline: readonly Point2[]): boolean {
    return outline.every(([x0, y0], i) => {
        const [x1, y1] = outline[(i + 1) % outline.length];

        return x0 * y1 - y0 * x1 > 0;
    });
}

/**
 * Cut a simple outline into triangles by clipping its ears, for an outline that cannot be fanned
 * from the origin (a figure's head over its shoulders).
 * @param outline - The outline, counter-clockwise, without a repeated point.
 * @returns The triangles, each counter-clockwise, as indices into the outline.
 */
export function earClip(outline: readonly Point2[]): [number, number, number][] {
    const left = outline.map((_, i) => i);
    const triangles: [number, number, number][] = [];
    const turn = (o: Point2, a: Point2, b: Point2): number =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const inside = (p: Point2, a: Point2, b: Point2, c: Point2): boolean =>
        turn(a, b, p) >= 0 && turn(b, c, p) >= 0 && turn(c, a, p) >= 0;

    // ponytail: O(n^3) on an outline of a few dozen corners, built once per style.
    while (left.length > 3) {
        const ear = left.findIndex((index, k) => {
            const [a, b, c] = [left[(k + left.length - 1) % left.length], index, left[(k + 1) % left.length]];

            return (
                turn(outline[a], outline[b], outline[c]) > 0 &&
                !left.some(
                    (o) => o !== a && o !== b && o !== c && inside(outline[o], outline[a], outline[b], outline[c]),
                )
            );
        });

        if (ear < 0) {
            break;
        }

        triangles.push([left[(ear + left.length - 1) % left.length], left[ear], left[(ear + 1) % left.length]]);
        left.splice(ear, 1);
    }

    if (left.length === 3) {
        triangles.push([left[0], left[1], left[2]]);
    }

    return triangles;
}

/**
 * The convex hull of a set of points: the outline a solid shows a camera looking along z.
 * @param points - The points, in any order.
 * @returns The hull, counter-clockwise, with no repeated point.
 */
export function convexHull(points: readonly Point2[]): Point2[] {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o: Point2, a: Point2, b: Point2): number =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const half = (list: Point2[]): Point2[] => {
        const chain: Point2[] = [];

        for (const point of list) {
            while (chain.length >= 2 && cross(chain.at(-2) ?? point, chain.at(-1) ?? point, point) <= 0) {
                chain.pop();
            }

            chain.push(point);
        }

        chain.pop();
        return chain;
    };

    return [...half(sorted), ...half([...sorted].reverse())];
}

/**
 * Move every point of a closed outline outward by a distance, along the bisector of its corner.
 *
 * A sharp corner's mitre is clamped to three times the distance, so a star's points do not grow
 * spikes; a line along the offset is then thinner near that corner. A ring's edges come from
 * {@link mitredEdges}, which cuts such a corner square instead and keeps the ring its full width.
 * @param outline - The outline, counter-clockwise.
 * @param distance - How far out.
 * @returns The offset outline, point for point.
 */
export function offsetOutline(outline: readonly Point2[], distance: number): Point2[] {
    const count = outline.length;

    return outline.map(([x, y], i): Point2 => {
        const [px, py] = outline[(i + count - 1) % count];
        const [nx, ny] = outline[(i + 1) % count];

        return offsetCorner(x, y, unitNormal(px, py, x, y), unitNormal(x, y, nx, ny), distance);
    });
}

/** How far a corner's mitre reaches past it, at most, as a multiple of the offset (see {@link offsetOutline}). */
const MITRE_LIMIT = 3;

/**
 * A closed outline and its offsets by several distances, point for point, for the edges of a ring. Where a convex
 * corner is too sharp to mitre in full, its mitre is cut square to the corner's bisector at {@link MITRE_LIMIT} times
 * the distance, so the corner takes two points on every edge (the outline's own corner twice): each offset side stays
 * parallel to its side all the way to the cut, and a ring between two of these edges is its full width along every
 * side, not thinner along a side whose ends are both sharp, as pulling the mitre's point in along its bisector left
 * it (a bow tie's long sides, a stretched diamond's or a vee's, issue #5570). A concave corner, and any corner
 * blunt enough to mitre in full, is offset as {@link offsetOutline} offsets it.
 * @param outline - The outline, counter-clockwise.
 * @param distances - How far out each edge is; 0 is the outline itself.
 * @returns One edge per distance, all with the same number of points.
 */
export function mitredEdges(outline: readonly Point2[], distances: readonly number[]): Point2[][] {
    const count = outline.length;
    const edges: Point2[][] = distances.map(() => []);

    outline.forEach(([x, y], i) => {
        const [px, py] = outline[(i + count - 1) % count];
        const [nx, ny] = outline[(i + 1) % count];
        const [ax, ay] = unitNormal(px, py, x, y);
        const [bx, by] = unitNormal(x, y, nx, ny);
        const along = Math.hypot(ax + bx, ay + by);
        const convex = (x - px) * (ny - y) - (y - py) * (nx - x) > 0;

        if (!convex || along < 1e-9 || 2 / along <= MITRE_LIMIT) {
            distances.forEach((distance, k) => edges[k].push(offsetCorner(x, y, [ax, ay], [bx, by], distance)));
            return;
        }

        // the cut: points P + L m + t m', square to the bisector m at L = MITRE_LIMIT * distance, on each side's
        // offset line (X - P) . n = distance, so t = (distance - L m . n) / (m' . n)
        const [mx, my] = [(ax + bx) / along, (ay + by) / along];
        const cut = (n: Point2, distance: number): Point2 => {
            const reach = MITRE_LIMIT * distance;
            const t = (distance - reach * (mx * n[0] + my * n[1])) / (-my * n[0] + mx * n[1]);
            return [x + reach * mx - t * my, y + reach * my + t * mx];
        };
        distances.forEach((distance, k) => edges[k].push(cut([ax, ay], distance), cut([bx, by], distance)));
    });

    return edges;
}

/**
 * One corner of an outline moved outward by a distance along its bisector, its mitre clamped to
 * {@link MITRE_LIMIT} times the distance.
 * @param x - The corner, x.
 * @param y - The corner, y.
 * @param a - The outward unit normal of the side before it.
 * @param b - The outward unit normal of the side after it.
 * @param distance - How far out.
 * @returns The moved corner.
 */
function offsetCorner(x: number, y: number, a: Point2, b: Point2, distance: number): Point2 {
    const [mx, my] = [a[0] + b[0], a[1] + b[1]];
    const along = Math.hypot(mx, my);

    if (along < 1e-9) {
        return [x + a[0] * distance, y + a[1] * distance];
    }

    // The mitre's length is distance / cos(half the turn) = 2 * distance / |a + b|.
    const length = Math.min((2 * distance) / along, distance * MITRE_LIMIT);

    return [x + (mx / along) * length, y + (my / along) * length];
}

/**
 * The outward unit normal of one side of a counter-clockwise outline.
 * @param x0 - Where the side starts, x.
 * @param y0 - Where it starts, y.
 * @param x1 - Where it ends, x.
 * @param y1 - Where it ends, y.
 * @returns The normal.
 */
function unitNormal(x0: number, y0: number, x1: number, y1: number): Point2 {
    const length = Math.hypot(x1 - x0, y1 - y0) || 1;

    return [(y1 - y0) / length, -(x1 - x0) / length];
}

/**
 * A patterned border's period: how long each dash and each gap after it are, in turn, as multiples of the
 * border's width.
 */
const PATTERNS: Readonly<Record<string, readonly number[] | undefined>> = {
    dashed: [3, 2],
    dotted: [1, 1],
    "dash-dot": [3, 2, 1, 2],
};

/**
 * The pieces a node border is drawn as: one closed ring for a solid border, two thin rings for a
 * double one, and a ring cut into dashes or dots along its length for the patterned styles.
 *
 * The ring lies OUTSIDE the outline, so it never covers the node's fill.
 * @param outline - The node's outline, counter-clockwise.
 * @param width - How wide the border is.
 * @param style - Its line style: solid, dashed, dotted, double, dash-dot, contiguous-arrow, or one of
 *   the strokes {@link strokedRing} draws (zigzag, sine wave, slashes, arrows).
 * @param wave - A zigzag's or sine wave's swing and period, in the units of `width`; given, the wave
 *   is drawn with them and `width` is the thickness of its line ({@link wavedRing}).
 * @returns The pieces.
 */
export function borderRing(outline: readonly Point2[], width: number, style: string, wave?: WaveShape): RingPiece[] {
    const waved = wave === undefined ? null : wavedRing(outline, width, style, wave);
    if (waved !== null) {
        return waved;
    }

    if (style === "contiguous-arrow") {
        return arrowChainRing(offsetOutline(outline, width / 2), width);
    }

    if (style === "double") {
        const third = width / 3;
        const [base, first, second, outer] = mitredEdges(outline, [0, third, third * 2, width]);

        return [
            { inner: base, outer: first, closed: true },
            { inner: second, outer, closed: true },
        ];
    }

    const drawn = strokedRing(outline, width, style);
    if (drawn !== null) {
        return drawn;
    }

    const [inner, outer] = mitredEdges(outline, [0, width]);
    const pattern = PATTERNS[style];

    if (pattern === undefined) {
        return [{ inner, outer, closed: true }];
    }

    return cutIntoDashes(
        inner,
        outer,
        pattern.map((length) => length * width),
    );
}

/**
 * Cut a closed ring into dashes along its inner edge, fitting a whole number of pattern periods so
 * the pattern meets itself where it closes.
 * @param inner - The ring's inner edge.
 * @param outer - Its outer edge, point for point.
 * @param pattern - Each dash's length and the gap after it, in turn, before fitting.
 * @returns One open piece per dash.
 */
function cutIntoDashes(inner: readonly Point2[], outer: readonly Point2[], pattern: readonly number[]): RingPiece[] {
    const lengths = cumulativeLengths(inner);
    const perimeter = lengths.at(-1) ?? 0;
    const unfitted = pattern.reduce((sum, length) => sum + length, 0);
    const periods = Math.max(1, Math.round(perimeter / unfitted));
    const scale = perimeter / periods / unfitted;
    const pieces: RingPiece[] = [];

    for (let p = 0, at = 0; p < periods; p++) {
        for (let i = 0; i < pattern.length; i += 2) {
            pieces.push(slice(inner, outer, lengths, at, at + pattern[i] * scale));
            at += (pattern[i] + (pattern[i + 1] ?? 0)) * scale;
        }
    }

    return pieces;
}

/**
 * How far along a closed outline each of its points is, ending with the whole perimeter.
 * @param outline - The outline.
 * @returns The distances; one more than there are points.
 */
function cumulativeLengths(outline: readonly Point2[]): number[] {
    const lengths = [0];

    for (let i = 0; i < outline.length; i++) {
        const [x0, y0] = outline[i];
        const [x1, y1] = outline[(i + 1) % outline.length];
        lengths.push(lengths[i] + Math.hypot(x1 - x0, y1 - y0));
    }

    return lengths;
}

/**
 * One stretch of a ring, between two distances along its inner edge.
 * @param inner - The ring's inner edge.
 * @param outer - Its outer edge, point for point.
 * @param lengths - {@link cumulativeLengths} of the inner edge.
 * @param from - Where the stretch starts.
 * @param to - Where it ends.
 * @returns The stretch, as an open piece.
 */
function slice(
    inner: readonly Point2[],
    outer: readonly Point2[],
    lengths: readonly number[],
    from: number,
    to: number,
): RingPiece {
    const at = (distance: number, edge: readonly Point2[]): Point2 => {
        const side = Math.max(0, lengths.findIndex((length) => length > distance) - 1);
        const span = lengths[side + 1] - lengths[side] || 1;
        const t = (distance - lengths[side]) / span;
        const [x0, y0] = edge[side % edge.length];
        const [x1, y1] = edge[(side + 1) % edge.length];

        return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    };
    // each corner the stretch passes is taken by its index, not by its distance: a corner cut square (`mitredEdges`)
    // is two points at one distance along the inner edge, and both of its outer points belong in the stretch
    const corners = lengths.map((length, i) => ({ length, i })).filter(({ length }) => length > from && length < to);
    const edgeOf = (edge: readonly Point2[]): Point2[] => [
        at(from, edge),
        ...corners.map(({ i }) => edge[i % edge.length]),
        at(to, edge),
    ];

    return { inner: edgeOf(inner), outer: edgeOf(outer), closed: false };
}

/** A point on a closed outline and the outline's direction there. */
interface Station {
    readonly at: Point2;
    /** Unit tangent, along the outline. */
    readonly along: Point2;
    /** Unit normal, out of the outline (for a counter-clockwise outline). */
    readonly out: Point2;
}

/**
 * Evenly spaced stations round a closed outline, about `spacing` apart: a whole number of them,
 * and a multiple of `multiple`, so a pattern of that many stations meets itself where it closes.
 * @param outline - The outline, counter-clockwise.
 * @param spacing - The wanted distance between stations.
 * @param multiple - What the number of stations is a multiple of.
 * @returns The stations.
 */
function stations(outline: readonly Point2[], spacing: number, multiple = 1): Station[] {
    const lengths = cumulativeLengths(outline);
    const perimeter = lengths.at(-1) ?? 0;
    const count = multiple * Math.max(Math.ceil(3 / multiple), Math.round(perimeter / spacing / multiple));
    const step = perimeter / count;

    return Array.from({ length: count }, (_unused, k): Station => {
        const distance = k * step;
        const side = Math.max(0, lengths.findIndex((length) => length > distance) - 1);
        const [x0, y0] = outline[side % outline.length];
        const [x1, y1] = outline[(side + 1) % outline.length];
        const span = lengths[side + 1] - lengths[side] || 1;
        const t = (distance - lengths[side]) / span;
        const [ox, oy] = unitNormal(x0, y0, x1, y1);

        return { at: [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], along: [-oy, ox], out: [ox, oy] };
    });
}

/**
 * A point moved from a station along its tangent and its normal.
 * @param s - The station.
 * @param along - How far along the outline.
 * @param out - How far out of it.
 * @returns The point.
 */
function moved(s: Station, along: number, out: number): Point2 {
    return [s.at[0] + s.along[0] * along + s.out[0] * out, s.at[1] + s.along[1] * along + s.out[1] * out];
}

/** The borders drawn as strokes of their own rather than as a ring or dashes of one. */
const STROKES: ReadonlySet<string> = new Set([
    "zigzag",
    "sinewave",
    "forward-slash",
    "backward-slash",
    "vertical-slash",
    "separate-arrow",
]);

/**
 * A border drawn as a stroke running round the node in a band as wide as the border, centered on
 * the band's middle (Cytoscape desktop's border line types):
 *
 * - zigzag and sinewave: one closed thin line waving from the band's inner edge to its outer edge
 * - forward-slash, backward-slash and vertical-slash: short strokes across the band, leaning with
 *   the outline's direction, against it, or straight across
 * - separate-arrow: small arrows, each with its own shaft, chasing each other round the node
 * @param outline - The node's outline, counter-clockwise.
 * @param width - How wide the border is.
 * @param style - Its line style.
 * @returns The pieces, or null for a style that is not a stroke.
 */
export function strokedRing(outline: readonly Point2[], width: number, style: string): RingPiece[] | null {
    if (!STROKES.has(style)) {
        return null;
    }

    const middle = offsetOutline(outline, width / 2);
    const half = width / 2;
    const line = width * 0.15;

    if (style === "zigzag" || style === "sinewave") {
        // a zigzag turns at every station, a wave is drawn through eight stations a period
        const wave = style === "sinewave";
        const ring = stations(middle, wave ? width / 2 : width, wave ? 8 : 2);
        const zig = (k: number): number => (k % 2 === 0 ? 1 : -1);
        const swing = (k: number): number => (half - line) * (wave ? Math.sin((k / 8) * Math.PI * 2) : zig(k));

        return [
            {
                inner: ring.map((s, k) => moved(s, 0, swing(k) - line)),
                outer: ring.map((s, k) => moved(s, 0, swing(k) + line)),
                closed: true,
            },
        ];
    }

    if (style === "separate-arrow") {
        // an arrow two band widths long every four, its head a third of it
        return stations(middle, width * 4).flatMap((s): RingPiece[] => [
            {
                inner: [moved(s, -width, -line), moved(s, width / 3, -line)],
                outer: [moved(s, -width, line), moved(s, width / 3, line)],
                closed: false,
            },
            {
                inner: [moved(s, width / 3, -half), moved(s, width, 0)],
                outer: [moved(s, width / 3, half), moved(s, width, 0)],
                closed: false,
            },
        ]);
    }

    // a stroke across the band every band width, leaning half a band width either way or none
    const lean = { "forward-slash": half, "backward-slash": -half, "vertical-slash": 0 }[style] ?? 0;
    return stations(middle, width).map((s): RingPiece => ({
        inner: [moved(s, -lean - line, -half), moved(s, lean - line, half)],
        outer: [moved(s, -lean + line, -half), moved(s, lean + line, half)],
        closed: false,
    }));
}

/** A wave's shape: how far it swings to either side of its path, and how far along the path it repeats. */
export interface WaveShape {
    readonly amplitude: number;
    readonly period: number;
}

/** How many points each quadratic arc of a sine wave is drawn with. */
const WAVE_STEPS = 8;

/**
 * Java's default miter limit (`BasicStroke`): a corner's miter reaches no further than this many half line widths
 * from it.
 */
const MITER_LIMIT = 10;

/**
 * One period of a sine wave drawn as a band, in its own frame: x along the path from -period/2 to period/2, y across
 * it. A crest then a trough, each a quadratic arc whose control point is `amplitude + width` off the path, and the
 * band's two edges `width` apart across the path where they meet it and half that at a crest: the wave Java2D's
 * `quadTo` draws for Cytoscape desktop's sine-wave line, centered on its path.
 * @param amplitude - The swing to either side.
 * @param period - The length along the path.
 * @param width - The band's thickness across the path where it meets it.
 * @returns The band, as an open piece; `outer` is its +y edge.
 */
export function sineWavePeriod(amplitude: number, period: number, width: number): RingPiece {
    const inner: Point2[] = [];
    const outer: Point2[] = [];
    for (const [sign, from] of [
        [1, -period / 2],
        [-1, 0],
    ] as const) {
        for (let k = from < 0 ? 0 : 1; k <= WAVE_STEPS; k++) {
            const t = k / WAVE_STEPS;
            const x = from + (t * period) / 2;
            const y = 2 * t * (1 - t) * sign * (amplitude + width) - width / 2;
            inner.push([x, y]);
            outer.push([x, y + width * ((1 - t) ** 2 + t ** 2)]);
        }
    }

    return { inner, outer, closed: false };
}

/**
 * How much of a zigzag's period a piece draws: all of it, or up to its first or its second turn, where a zigzag
 * that has no room for another turn ends (Cytoscape desktop's `ZigzagStroke`).
 */
export type ZigzagStretch = "period" | "first-turn" | "second-turn";

/**
 * One piece of a zigzag laid along a line: how much of its period it draws, and whether it starts or ends the line,
 * where the line is capped square, half its width past its end (Java2D's default cap, which Cytoscape desktop draws).
 */
export interface ZigzagPiece {
    readonly stretch: ZigzagStretch;
    readonly startCap?: boolean;
    readonly endCap?: boolean;
}

/** A piece that draws its whole period, capped at neither end: the default piece. */
export const WHOLE_PERIOD: ZigzagPiece = Object.freeze({ stretch: "period" });

/**
 * A zigzag piece's own name, which tells pieces drawn alike from pieces drawn otherwise.
 * @param piece - The piece.
 * @returns Its name.
 */
export function zigzagPieceKey(piece: ZigzagPiece): string {
    return `${piece.startCap === true ? "<" : ""}${piece.stretch}${piece.endCap === true ? ">" : ""}`;
}

/**
 * One period of a zigzag, in its own frame: x along the path from 0 to period, y across it. It leaves the path at x
 * = 0, turns `amplitude` to -y a quarter period on and to +y three quarters on, and meets the path again at the
 * period's end, a line `width` thick with mitred corners, so periods laid end to end make one zigzag.
 * @param amplitude - The swing to either side.
 * @param period - The length along the path.
 * @param width - The line's thickness.
 * @param piece - How much of the period it draws (all of it by default) and whether its ends are capped.
 * @returns The line, as an open piece.
 */
export function zigzagPeriod(
    amplitude: number,
    period: number,
    width: number,
    piece: ZigzagPiece = WHOLE_PERIOD,
): RingPiece {
    const line: Point2[] = [
        [0, 0],
        [period / 4, -amplitude],
        [(3 * period) / 4, amplitude],
        [period, 0],
    ];
    return strokeLine(line.slice(0, { period: 4, "first-turn": 2, "second-turn": 3 }[piece.stretch]), width, false, [
        piece.startCap === true,
        piece.endCap === true,
    ]);
}

/**
 * A line through points, `width` thick, as a piece: each point moved half the width to either side along the miter of
 * its corner (no further than {@link MITER_LIMIT} half widths), an open line's ends cut square, at the end or, capped,
 * half the width past it.
 * @param points - The points.
 * @param width - The thickness.
 * @param closed - Whether the last point joins the first.
 * @param caps - Whether an open line's start and end are capped.
 * @returns The piece; `outer` is the side on the left of the line's direction.
 */
export function strokeLine(
    points: readonly Point2[],
    width: number,
    closed: boolean,
    caps: readonly [boolean, boolean] = [false, false],
): RingPiece {
    const count = points.length;
    const past = (from: Point2, to: Point2): Point2 => {
        const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
        return [to[0] + ((to[0] - from[0]) / length) * (width / 2), to[1] + ((to[1] - from[1]) / length) * (width / 2)];
    };
    const line = [...points];
    if (!closed && count >= 2) {
        if (caps[0]) {
            line[0] = past(points[1], points[0]);
        }
        if (caps[1]) {
            line[count - 1] = past(points[count - 2], points[count - 1]);
        }
    }
    const leftOf = (a: Point2, b: Point2): Point2 => {
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
    };
    const inner: Point2[] = [];
    const outer: Point2[] = [];
    for (let i = 0; i < count; i++) {
        const before = i > 0 || closed ? leftOf(line[(i + count - 1) % count], line[i]) : null;
        const after = i < count - 1 || closed ? leftOf(line[i], line[(i + 1) % count]) : null;
        const [ax, ay] = before ?? after ?? [0, 1];
        const [bx, by] = after ?? before ?? [0, 1];
        const [mx, my] = [ax + bx, ay + by];
        const along = Math.hypot(mx, my);
        // the miter is half the width over the cosine of half the turn, 2 / |a + b| of it
        const reach = along < 1e-9 ? width / 2 : Math.min(width / along, (MITER_LIMIT * width) / 2);
        const [ux, uy] = along < 1e-9 ? [ax, ay] : [mx / along, my / along];
        const [x, y] = line[i];
        outer.push([x + ux * reach, y + uy * reach]);
        inner.push([x - ux * reach, y - uy * reach]);
    }

    return { inner, outer, closed };
}

/**
 * Where a closed outline is a distance along from its first point, and its direction there.
 * @param outline - The outline, counter-clockwise.
 * @param lengths - {@link cumulativeLengths} of it.
 * @param distance - How far along.
 * @returns The station.
 */
function stationAt(outline: readonly Point2[], lengths: readonly number[], distance: number): Station {
    const perimeter = lengths.at(-1) ?? 0;
    const d = perimeter > 0 ? ((distance % perimeter) + perimeter) % perimeter : 0;
    const side = Math.max(0, lengths.findIndex((length) => length > d) - 1);
    const [x0, y0] = outline[side % outline.length];
    const [x1, y1] = outline[(side + 1) % outline.length];
    const t = (d - lengths[side]) / (lengths[side + 1] - lengths[side] || 1);
    const [ox, oy] = unitNormal(x0, y0, x1, y1);

    return { at: [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], along: [-oy, ox], out: [ox, oy] };
}

/**
 * A piece drawn in its own frame, laid on a station: x along the outline, y in toward the node.
 * @param piece - The piece.
 * @param s - The station.
 * @returns The piece where it goes.
 */
function laid(piece: RingPiece, s: Station): RingPiece {
    const place = ([x, y]: Point2): Point2 => moved(s, x, -y);
    return { inner: piece.inner.map(place), outer: piece.outer.map(place), closed: piece.closed };
}

/**
 * A zigzag or sine-wave border drawn with a swing and a period of its own, as Cytoscape desktop draws its border line
 * types, round the ring's middle, the line `width` thick:
 *
 * - zigzag: one line round the outline, turning `amplitude` out and in every half period, its first turn a quarter
 *   period from the outline's first point (Cytoscape's `ZigzagStroke`)
 * - sinewave: one {@link sineWavePeriod} every period from the outline's first point, each drawn straight along the
 *   outline's direction where it is laid (Cytoscape's `ShapeStroke`), so round a small node its crests loop out
 * @param outline - The node's outline, counter-clockwise.
 * @param width - The line's thickness.
 * @param style - The border's line style.
 * @param wave - Its swing and period.
 * @returns The pieces, or null for a style that is no wave.
 */
export function wavedRing(
    outline: readonly Point2[],
    width: number,
    style: string,
    wave: WaveShape,
): RingPiece[] | null {
    if ((style !== "zigzag" && style !== "sinewave") || !isPositive(wave.period)) {
        return null;
    }

    const middle = offsetOutline(outline, width / 2);
    const lengths = cumulativeLengths(middle);
    const perimeter = lengths.at(-1) ?? 0;
    if (style === "sinewave") {
        const period = sineWavePeriod(wave.amplitude, wave.period, width);
        return Array.from({ length: Math.floor(perimeter / wave.period) + 1 }, (_unused, k) =>
            laid(period, stationAt(middle, lengths, k * wave.period)),
        );
    }

    const half = wave.period / 2;
    const turns = Math.floor((perimeter - wave.period / 4) / half) + 1;
    const line: Point2[] = [middle[0]];
    for (let k = 0; k < turns; k++) {
        line.push(
            moved(
                stationAt(middle, lengths, wave.period / 4 + k * half),
                0,
                k % 2 === 0 ? wave.amplitude : -wave.amplitude,
            ),
        );
    }

    return [strokeLine(line, width, true)];
}

/**
 * A ring of Cytoscape desktop's contiguous arrows round the ring's middle: one every three widths, each a bar three
 * widths long and one thick with a chevron on it, two widths to either side, pointing along the outline
 * (`ContiguousArrowStroke`), laid straight along the outline's direction where it starts.
 * @param middle - The ring's middle, counter-clockwise.
 * @param width - The border's width.
 * @returns The pieces.
 */
function arrowChainRing(middle: readonly Point2[], width: number): RingPiece[] {
    const w = width;
    const arrow: RingPiece[] = [
        {
            inner: [
                [-1.5 * w, -w / 2],
                [1.5 * w, -w / 2],
            ],
            outer: [
                [-1.5 * w, w / 2],
                [1.5 * w, w / 2],
            ],
            closed: false,
        },
        {
            inner: [
                [-1.5 * w, 2 * w],
                [-0.25 * w, w / 2],
            ],
            outer: [
                [-w, 2 * w],
                [0.25 * w, w / 2],
            ],
            closed: false,
        },
        {
            inner: [
                [-1.5 * w, -2 * w],
                [-0.25 * w, -w / 2],
            ],
            outer: [
                [-w, -2 * w],
                [0.25 * w, -w / 2],
            ],
            closed: false,
        },
    ];
    const lengths = cumulativeLengths(middle);
    const perimeter = lengths.at(-1) ?? 0;
    if (!isPositive(w)) {
        return [];
    }

    return Array.from({ length: Math.floor(perimeter / (3 * w)) + 1 }, (_unused, k) =>
        stationAt(middle, lengths, k * 3 * w),
    ).flatMap((s) => arrow.map((piece) => laid(piece, s)));
}

/**
 * How thick the line a set of pieces draws is: twice their area over the length of their edges, the measure of a
 * band of one thickness (an outline drawn as a fill is read so).
 * @param pieces - The pieces.
 * @returns The thickness, or 0 for pieces with no area.
 */
export function piecesThickness(pieces: readonly RingPiece[]): number {
    let area = 0;
    let edges = 0;
    for (const { inner, outer, closed } of pieces) {
        const steps = closed ? inner.length : inner.length - 1;
        for (let i = 0; i < steps; i++) {
            const j = (i + 1) % inner.length;
            area += Math.abs(signedArea([inner[i], outer[i], outer[j], inner[j]])) / 2;
            edges += Math.hypot(inner[j][0] - inner[i][0], inner[j][1] - inner[i][1]);
            edges += Math.hypot(outer[j][0] - outer[i][0], outer[j][1] - outer[i][1]);
        }
        if (!closed) {
            edges += Math.hypot(outer[0][0] - inner[0][0], outer[0][1] - inner[0][1]);
            const [a, b] = [inner.at(-1) ?? inner[0], outer.at(-1) ?? outer[0]];
            edges += Math.hypot(b[0] - a[0], b[1] - a[1]);
        }
    }

    return edges > 0 ? (2 * area) / edges : 0;
}
