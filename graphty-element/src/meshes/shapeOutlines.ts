/**
 * @file The 2D outlines node shapes are built from: the flat shapes of 2D tools, the ring a node
 * border is drawn as, and the convex hull of a solid seen from the front.
 *
 * Plain arithmetic on [x, y] pairs, with no Babylon.js, so the geometry is tested on its own. Every
 * outline is counter-clockwise and centred on the origin.
 */

/** A point in the plane a flat shape is drawn in. */
export type Point2 = readonly [number, number];

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
    // man and woman pictograms of its genealogy drawings (a figure with a head, arms and legs;
    // the woman's in a skirt).
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
    man: figure([
        [0.06, -0.3],
        [0.06, -1],
        [0.5, -1],
        [0.5, -0.1],
        [0.55, -0.1],
        [0.55, 0.2],
        [0.62, 0.2],
        [0.62, -0.3],
        [0.95, -0.3],
        [0.95, 0.3],
        [0.8, 0.42],
        [0.14, 0.42],
    ]),
    woman: figure([
        [0.08, -0.55],
        [0.08, -1],
        [0.35, -1],
        [0.35, -0.55],
        [0.7, -0.55],
        [0.52, -0.05],
        [0.55, 0.2],
        [0.66, 0.2],
        [0.66, -0.2],
        [0.95, -0.2],
        [0.95, 0.3],
        [0.8, 0.42],
        [0.14, 0.42],
    ]),
};

/**
 * A standing figure as a unit outline: the right half of its body, given from the bottom of its
 * middle up to its neck, under a round head, mirrored to the left.
 * @param rightHalf - The body's right half, counter-clockwise, from the middle at the bottom to
 *   the right of the neck.
 * @returns The whole outline, counter-clockwise.
 */
function figure(rightHalf: readonly Point2[]): Point2[] {
    const [cy, radius, neck] = [0.72, 0.27, 0.12];
    const start = Math.atan2(-Math.sqrt(radius * radius - neck * neck), neck);
    const steps = ARC_STEPS * 2;
    const head = Array.from({ length: steps + 1 }, (_, i): Point2 => {
        const angle = start + ((Math.PI - 2 * start) * i) / steps;

        return [radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
    const right = [...rightHalf, ...head.slice(0, steps / 2)];

    return [...right, head[steps / 2], ...[...right].reverse().map(([x, y]): Point2 => [-x, y])];
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
 * A rectangle with rounded corners filling a box. The corner radius is a quarter of the shorter
 * side, or `maxRadius` when that is smaller -- Cytoscape.js's rule, which caps it at 8 px, so a
 * large box keeps small corners -- and it is the same in both directions however long and thin
 * the box is.
 * @param halfWidth - Half the box's width.
 * @param halfHeight - Half its height.
 * @param maxRadius - The largest corner radius; unset, a quarter of the shorter side.
 * @returns The outline, counter-clockwise.
 */
function roundRectangle(halfWidth: number, halfHeight: number, maxRadius = Infinity): Point2[] {
    // ponytail: a radius above a quarter of the shorter side (a file's own, larger one) is drawn
    // at the quarter; let it reach half the side if such a file turns up.
    const radius = Math.max(0, Math.min(Math.min(halfWidth, halfHeight) / 2, maxRadius));
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

    return points;
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
 * A polygon's corners from its `x,y x,y ...` text (`shape.points`), counter-clockwise.
 * @param text - The corners, as `x,y` pairs separated by spaces.
 * @returns The corners, or null when there are fewer than three or one is not two finite numbers.
 */
export function polygonPoints(text: string | undefined): Point2[] | null {
    const pairs = (text ?? "").trim().split(/\s+/);
    const points = pairs.map((pair): Point2 => {
        const [x, y, extra] = pair.split(",").map(Number);

        return extra === undefined ? [x, y] : [Number.NaN, Number.NaN];
    });
    if (points.length < 3 || !points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))) {
        return null;
    }

    const area = points.reduce((sum, [x0, y0], i) => {
        const [x1, y1] = points[(i + 1) % points.length];

        return sum + x0 * y1 - x1 * y0;
    }, 0);

    return area < 0 ? points.reverse() : points;
}

/**
 * How far a polygon's corners reach from its center along x and along y, as fractions of its half
 * width and half height.
 * @param points - The corners.
 * @returns The farthest |x| and |y|.
 */
export function polygonReach(points: readonly Point2[]): [number, number] {
    return [Math.max(...points.map(([x]) => Math.abs(x))), Math.max(...points.map(([, y]) => Math.abs(y)))];
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
        Object.hasOwn(UNIT_OUTLINES, shape)
    );
}

/**
 * The outline of one flat shape, filling a box centred on the origin.
 * @param shape - A flat shape name.
 * @param width - The box's width.
 * @param height - Its height.
 * @param cornerRadius - A round-rectangle's largest corner radius, in the box's units.
 * @param points - A polygon's corners (`shape.points`); a polygon without usable ones is drawn as a
 *   rectangle.
 * @returns The outline, counter-clockwise, or an empty list for a shape that is not flat.
 */
export function flatShapeOutline(
    shape: string,
    width: number,
    height: number,
    cornerRadius?: number,
    points?: string,
): Point2[] {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    if (shape === "polygon") {
        const corners = polygonPoints(points);
        if (corners === null) {
            return fitToBox(UNIT_OUTLINES.rectangle, halfWidth, halfHeight);
        }

        // Stretched about its center, not its box: the corners stay where they are around the
        // node's position, the farthest on each axis reaching the node's side.
        const [reachX, reachY] = polygonReach(corners);

        return corners.map(([x, y]): Point2 => [(x / reachX) * halfWidth, (y / reachY) * halfHeight]);
    }

    if (shape === "ellipse") {
        return ellipse(halfWidth, halfHeight);
    }

    if (shape === "round-rectangle") {
        return roundRectangle(halfWidth, halfHeight, cornerRadius);
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
 * spikes; the ring is then slightly thinner at that point, which no reader can see.
 * @param outline - The outline, counter-clockwise.
 * @param distance - How far out.
 * @returns The offset outline, point for point.
 */
export function offsetOutline(outline: readonly Point2[], distance: number): Point2[] {
    const count = outline.length;

    return outline.map(([x, y], i): Point2 => {
        const [px, py] = outline[(i + count - 1) % count];
        const [nx, ny] = outline[(i + 1) % count];
        const [ax, ay] = unitNormal(px, py, x, y);
        const [bx, by] = unitNormal(x, y, nx, ny);
        const [mx, my] = [ax + bx, ay + by];
        const along = Math.hypot(mx, my);

        if (along < 1e-9) {
            return [x + ax * distance, y + ay * distance];
        }

        // The mitre's length is distance / cos(half the turn) = 2 * distance / |a + b|.
        const length = Math.min((2 * distance) / along, distance * 3);

        return [x + (mx / along) * length, y + (my / along) * length];
    });
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

/** How long a dash and its gap are, as multiples of the border's width. */
const PATTERNS: Readonly<Record<string, readonly [number, number] | undefined>> = {
    dashed: [3, 2],
    dotted: [1, 1],
};

/**
 * The pieces a node border is drawn as: one closed ring for a solid border, two thin rings for a
 * double one, and a ring cut into dashes or dots along its length for the patterned styles.
 *
 * The ring lies OUTSIDE the outline, so it never covers the node's fill.
 * @param outline - The node's outline, counter-clockwise.
 * @param width - How wide the border is.
 * @param style - Its line style: solid, dashed, dotted or double.
 * @returns The pieces.
 */
export function borderRing(outline: readonly Point2[], width: number, style: string): RingPiece[] {
    if (style === "double") {
        const third = width / 3;

        return [
            { inner: [...outline], outer: offsetOutline(outline, third), closed: true },
            { inner: offsetOutline(outline, third * 2), outer: offsetOutline(outline, width), closed: true },
        ];
    }

    const outer = offsetOutline(outline, width);
    const pattern = PATTERNS[style];

    if (pattern === undefined) {
        return [{ inner: [...outline], outer, closed: true }];
    }

    return cutIntoDashes(outline, outer, width * pattern[0], width * pattern[1]);
}

/**
 * Cut a closed ring into dashes along its inner edge, fitting a whole number of dash-and-gap
 * periods so the pattern meets itself where it closes.
 * @param inner - The ring's inner edge.
 * @param outer - Its outer edge, point for point.
 * @param dash - How long a dash is, before fitting.
 * @param gap - How long a gap is, before fitting.
 * @returns One open piece per dash.
 */
function cutIntoDashes(inner: readonly Point2[], outer: readonly Point2[], dash: number, gap: number): RingPiece[] {
    const lengths = cumulativeLengths(inner);
    const perimeter = lengths.at(-1) ?? 0;
    const periods = Math.max(1, Math.round(perimeter / (dash + gap)));
    const period = perimeter / periods;
    const dashLength = period * (dash / (dash + gap));
    const pieces: RingPiece[] = [];

    for (let p = 0; p < periods; p++) {
        const start = p * period;
        pieces.push(slice(inner, outer, lengths, start, start + dashLength));
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
    const corners = lengths.map((length, i) => ({ length, i })).filter(({ length }) => length > from && length < to);
    const distances = [from, ...corners.map(({ length }) => length), to];

    return {
        inner: distances.map((distance) => at(distance, inner)),
        outer: distances.map((distance) => at(distance, outer)),
        closed: false,
    };
}
