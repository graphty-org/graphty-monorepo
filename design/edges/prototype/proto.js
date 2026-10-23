// Edge-corner prototypes for graphty-element (design/edges/sharp-corners.md). One page, many variants:
//   proto.html?variant=A|B|C|D|E|F|G|H&mode=2d|3d&dash=0|1&stress=0|10000|50000[&ref=1]
// A: today's pieces, no join          B: 2D miter/bevel join triangles (thin instances)
// C: round-join discs at each bend     D: vertex-shader miter from prev/next points (one draw)
// E: Babylon GreasedLine               F: 2D pieces extended to the miter + bevel triangle past the limit
// G: the shader graphty-element ships  H: A's rectangles as one plain mesh (the SwiftShader question)
import {
    Buffer,
    Color3,
    Color4,
    CreateGreasedLine,
    Effect,
    Engine,
    EngineInstrumentation,
    FreeCamera,
    Camera,
    Matrix,
    Mesh,
    Scene,
    SceneInstrumentation,
    ShaderMaterial,
    Vector3,
    VertexData,
} from "@babylonjs/core";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import {
    EDGE_JOIN_FRAGMENT_SHADER,
    EDGE_JOIN_VERTEX_SHADER,
    EDGE_MITER_LIMIT,
    JOIN_FLOATS_PER_PIECE,
    JOIN_TEMPLATE_INDICES,
    JOIN_TEMPLATE_POSITIONS,
} from "../../../graphty-element/src/meshes/edgeJoinShader.ts";

const q = new URLSearchParams(location.search);
const VARIANT = q.get("variant") ?? "A";
const MODE = q.get("mode") ?? "2d";
const DASH = q.get("dash") === "1";
const STRESS = Number(q.get("stress") ?? 0);
const MITER_LIMIT = 4;
const DASH_ON = 12;
const DASH_OFF = 8;
const COLOR = [0.12, 0.3, 0.6];

const CELL = 160;
const WIDTHS = [1, 3, 8, 24];
const ALPHAS = [1, 0.5];
const CASES = [179, 170, 135, 90, 45, 20, 5, 0, "U"];
const W = STRESS ? 1280 : CELL * 8;
const H = STRESS ? 900 : CELL * CASES.length;

const canvas = document.getElementById("c");
canvas.width = W;
canvas.height = H;
canvas.style.width = `${W}px`;
canvas.style.height = `${H}px`;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true }, false);
engine.setHardwareScalingLevel(1);
const scene = new Scene(engine);
scene.clearColor = new Color4(1, 1, 1, 1);
scene.skipPointerMovePicking = true;

// ---------------------------------------------------------------- camera
let camera;
if (MODE === "2d") {
    camera = new FreeCamera("cam", new Vector3(0, 0, -100), scene);
    camera.setTarget(new Vector3(0, 0, 0));
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = 0;
    camera.orthoRight = W;
    camera.orthoTop = 0;
    camera.orthoBottom = -H;
    camera.minZ = 0.1;
    camera.maxZ = 1000;
} else {
    const target = new Vector3(W / 2, -H / 2 - (STRESS ? 0 : 230), 0);
    const tilt = (50 * Math.PI) / 180;
    const dist = STRESS ? 1500 : 1950;
    camera = new FreeCamera("cam", target.add(new Vector3(0, -dist * Math.sin(tilt), -dist * Math.cos(tilt))), scene);
    camera.fov = 0.8;
    camera.minZ = 1;
    camera.maxZ = 10000;
    camera.setTarget(target);
}

// ---------------------------------------------------------------- shaders
Effect.ShadersStore.tiVertexShader = `precision highp float;
attribute vec3 position; attribute vec2 uv; attribute vec2 dashInfo;
attribute vec4 world0; attribute vec4 world1; attribute vec4 world2; attribute vec4 world3;
uniform mat4 viewProjection; varying float vDist;
void main() {
  mat4 m = mat4(world0, world1, world2, world3);
  gl_Position = viewProjection * m * vec4(position, 1.0);
  vDist = dashInfo.x + uv.x * dashInfo.y;
}`;

// Today's 3D path (CustomLineRenderer): one instance per piece, widened in screen space from its
// own two ends only. Matrix rows carry a (row 3), b - a (row 0) and the width (row 1, x).
Effect.ShadersStore.seg3VertexShader = `precision highp float;
attribute vec3 position; attribute vec2 dashInfo;
attribute vec4 world0; attribute vec4 world1; attribute vec4 world2; attribute vec4 world3;
uniform mat4 viewProjection; uniform vec2 resolution; varying float vDist;
void main() {
  vec3 a = world3.xyz; vec3 b = a + world0.xyz; float w = world1.x;
  vec4 ca = viewProjection * vec4(a, 1.0); vec4 cb = viewProjection * vec4(b, 1.0);
  vec2 d = (cb.xy / cb.w - ca.xy / ca.w) * 0.5 * resolution; float L = length(d);
  vec2 n = L < 0.0005 ? vec2(0.0) : vec2(-d.y, d.x) / L;
  vec4 c = position.x < 0.5 ? ca : cb;
  c.xy += n * position.y * w * 0.5 * 2.0 / resolution * c.w;
  gl_Position = c;
  vDist = dashInfo.x + position.x * dashInfo.y;
}`;

// Round join in 3D: a pixel-sized disc at the corner. Row 3 = center, row 1 x = width.
Effect.ShadersStore.disc3VertexShader = `precision highp float;
attribute vec3 position; attribute vec2 dashInfo;
attribute vec4 world0; attribute vec4 world1; attribute vec4 world2; attribute vec4 world3;
uniform mat4 viewProjection; uniform vec2 resolution; varying float vDist;
void main() {
  vec4 c = viewProjection * vec4(world3.xyz, 1.0);
  c.xy += position.xy * world1.x * 0.5 * 2.0 / resolution * c.w;
  gl_Position = c;
  vDist = dashInfo.x;
}`;

// D: one instance per piece reading prev, a, b, next. Each instance builds its own piece plus
// HALF of the join at each end, so neighbours meet on shared vertices with no overlap and no
// notch. Six template vertices: (end, side, isMid). Miter up to the limit, bevel past it, and a
// "broken" join (square ends, overlapping) when the inset would eat more than half a piece.
Effect.ShadersStore.miterVertexShader = `precision highp float;
attribute vec3 position;
attribute vec3 pPrev; attribute vec3 pA; attribute vec3 pB; attribute vec3 pNext; attribute vec2 inst;
uniform mat4 viewProjection; uniform vec2 resolution; uniform float miterLimit;
varying float vAlong; varying vec2 vSpan;
vec2 px(vec4 c) { return c.xy / c.w * 0.5 * resolution; }
vec2 perp(vec2 v) { return vec2(-v.y, v.x); }
void main() {
  vec4 cA = viewProjection * vec4(pA, 1.0);
  vec4 cB = viewProjection * vec4(pB, 1.0);
  bool atB = position.x > 0.5;
  float side = position.y;
  bool isMid = position.z > 0.5;
  float hw = inst.x * 0.5;
  vec2 sA = px(cA); vec2 sB = px(cB);
  vec2 own = sB - sA; float lenOwn = length(own);
  vec4 cP = atB ? cB : cA;
  vec2 other = atB ? px(viewProjection * vec4(pNext, 1.0)) - sB : sA - px(viewProjection * vec4(pPrev, 1.0));
  float lenOther = length(other);
  vec2 off = vec2(0.0);
  if (lenOwn > 1e-4) {
    vec2 d = own / lenOwn; vec2 n = perp(d);
    if (lenOther < 1e-4) {
      off = isMid ? vec2(0.0) : side * n * hw;
    } else {
      vec2 dO = other / lenOther;
      vec2 dIn = atB ? d : dO; vec2 dOut = atB ? dO : d;
      float cr = dIn.x * dOut.y - dIn.y * dOut.x;
      float outer = cr > 0.0 ? -1.0 : 1.0;
      vec2 sum = perp(dIn) + perp(dOut); float sl = length(sum);
      float cosH = max(sl * 0.5, 1e-6);
      vec2 m = sl > 1e-6 ? sum / sl : n;
      float ratio = 1.0 / cosH;
      float inset = hw * sqrt(max(0.0, 1.0 - cosH * cosH)) / cosH;
      bool broken = inset > 0.5 * min(lenOwn, lenOther);
      bool miter = ratio <= miterLimit && !broken;
      if (isMid) off = miter ? outer * m * hw * ratio : outer * sum * 0.5 * hw;
      else if (side * outer > 0.0) off = miter ? side * m * hw * ratio : side * n * hw;
      else off = broken ? side * n * hw : side * m * hw * ratio;
    }
  }
  cP.xy += off * 2.0 / resolution * cP.w;
  gl_Position = cP;
  // Distance along THIS piece, measured perpendicular to it, clamped per fragment: dash ends stay
  // square to the piece, and everything past the corner (the join) carries the corner's distance.
  float worldLen = length(pB - pA);
  vec2 here = (atB ? sB : sA) + off;
  vAlong = lenOwn > 1e-4 ? dot(here - sA, own / lenOwn) / lenOwn * worldLen : 0.0;
  vSpan = vec2(inst.y, worldLen);
}`;

Effect.ShadersStore.miterFragmentShader = `precision highp float;
uniform vec4 color; uniform vec2 dash; varying float vAlong; varying vec2 vSpan;
void main() {
  float d = vSpan.x + clamp(vAlong, 0.0, vSpan.y);
  if (dash.x > 0.0 && mod(d, dash.x + dash.y) > dash.x) discard;
  gl_FragColor = color;
}`;

Effect.ShadersStore.flatFragmentShader = `precision highp float;
uniform vec4 color; uniform vec2 dash; varying float vDist;
void main() {
  if (dash.x > 0.0 && mod(vDist, dash.x + dash.y) > dash.x) discard;
  gl_FragColor = color;
}`;

const materials = [];
function material(vertex, alpha, extraAttribs) {
    const mat = new ShaderMaterial(
        `m${materials.length}`,
        scene,
        { vertex, fragment: vertex === "miter" ? "miter" : "flat" },
        {
            attributes: ["position", "uv", "dashInfo", "world0", "world1", "world2", "world3", ...(extraAttribs ?? [])],
            uniforms: ["viewProjection", "resolution", "color", "dash", "miterLimit"],
            needAlphaBlending: alpha < 1,
        },
    );
    mat.backFaceCulling = false;
    mat.setColor4("color", new Color4(COLOR[0], COLOR[1], COLOR[2], alpha));
    mat.setVector2("dash", DASH ? { x: DASH_ON, y: DASH_OFF } : { x: 0, y: 0 });
    mat.setFloat("miterLimit", MITER_LIMIT);
    materials.push(mat);
    return mat;
}
scene.onBeforeRenderObservable.add(() => {
    for (const m of materials) {
        m.setVector2("resolution", { x: engine.getRenderWidth(), y: engine.getRenderHeight() });
    }
});

// ---------------------------------------------------------------- templates
function templateMesh(name, positions, indices, uvs) {
    const mesh = new Mesh(name, scene);
    const vd = new VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.uvs = uvs ?? new Array((positions.length / 3) * 2).fill(0);
    vd.applyToMesh(mesh);
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.doNotSyncBoundingInfo = true;
    return mesh;
}
// 2D rectangle: x along 0..1, y across -0.5..0.5 (world-space width via the matrix).
const RECT = () =>
    templateMesh("rect", [0, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, 0, 0.5, 0], [0, 1, 2, 0, 2, 3], [0, 0, 1, 0, 1, 1, 0, 1]);
// 3D screen-space piece: x along 0..1, y side -1..1 (width applied in the shader).
const SEG3 = () => templateMesh("seg3", [0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], [0, 1, 2, 0, 2, 3]);
// Unit triangle (0,0) (1,0) (0,1): a matrix places it anywhere.
const TRI = () => templateMesh("tri", [0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 1, 2]);
const DISC_SEGMENTS = 16;
const DISC = (radius) => {
    const pos = [0, 0, 0];
    const idx = [];
    for (let i = 0; i < DISC_SEGMENTS; i++) {
        const t = (i / DISC_SEGMENTS) * Math.PI * 2;
        pos.push(Math.cos(t) * radius, Math.sin(t) * radius, 0);
        idx.push(0, 1 + i, 1 + ((i + 1) % DISC_SEGMENTS));
    }
    return templateMesh("disc", pos, idx);
};

// A thin-instance batch: matrices + dashInfo, written by a fill function.
class TiBatch {
    constructor(mesh, mat, count) {
        this.mesh = mesh;
        this.count = count;
        this.m = new Float32Array(count * 16);
        this.d = new Float32Array(count * 2);
        mesh.material = mat;
        mesh.thinInstanceSetBuffer("matrix", this.m, 16, false);
        mesh.thinInstanceSetBuffer("dashInfo", this.d, 2, false);
    }
    flush() {
        this.mesh.thinInstanceBufferUpdated("matrix");
        this.mesh.thinInstanceBufferUpdated("dashInfo");
    }
    get bytes() {
        return this.count * 18 * 4;
    }
}

// ---------------------------------------------------------------- geometry helpers (CPU, 2D world)
// Rect from a to b (xy), width w: row0 = (b-a), row1 = perp * w, row3 = a.
function rect(m, o, ax, ay, bx, by, w) {
    const dx = bx - ax,
        dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    m[o] = dx;
    m[o + 1] = dy;
    m[o + 2] = 0;
    m[o + 3] = 0;
    m[o + 4] = (-dy / len) * w;
    m[o + 5] = (dx / len) * w;
    m[o + 6] = 0;
    m[o + 7] = 0;
    m[o + 8] = 0;
    m[o + 9] = 0;
    m[o + 10] = 1;
    m[o + 11] = 0;
    m[o + 12] = ax;
    m[o + 13] = ay;
    m[o + 14] = 0;
    m[o + 15] = 1;
}
// 3D screen-space piece: row0 = b-a, row1.x = width, row3 = a.
function seg3(m, o, a, b, w) {
    m.fill(0, o, o + 16);
    m[o] = b[0] - a[0];
    m[o + 1] = b[1] - a[1];
    m[o + 2] = b[2] - a[2];
    m[o + 4] = w;
    m[o + 10] = 1;
    m[o + 12] = a[0];
    m[o + 13] = a[1];
    m[o + 14] = a[2];
    m[o + 15] = 1;
}
function tri(m, o, p0x, p0y, p1x, p1y, p2x, p2y) {
    m[o] = p1x - p0x;
    m[o + 1] = p1y - p0y;
    m[o + 2] = 0;
    m[o + 3] = 0;
    m[o + 4] = p2x - p0x;
    m[o + 5] = p2y - p0y;
    m[o + 6] = 0;
    m[o + 7] = 0;
    m[o + 8] = 0;
    m[o + 9] = 0;
    m[o + 10] = 1;
    m[o + 11] = 0;
    m[o + 12] = p0x;
    m[o + 13] = p0y;
    m[o + 14] = 0;
    m[o + 15] = 1;
}
function point(m, o, x, y, z, s) {
    m.fill(0, o, o + 16);
    m[o] = s;
    m[o + 5] = s;
    m[o + 10] = 1;
    m[o + 4] = 0;
    m[o + 12] = x;
    m[o + 13] = y;
    m[o + 14] = z;
    m[o + 15] = 1;
}
// The join at corner P between pieces (P - dIn) and (P + dOut), half-width hw, in 2D world.
const J = { ox: 0, oy: 0, inX: 0, inY: 0, outX: 0, outY: 0, tx: 0, ty: 0, ratio: 1, inset: 0 };
function join(ax, ay, px, py, bx, by, hw) {
    let ix = px - ax,
        iy = py - ay,
        ux = bx - px,
        uy = by - py;
    const li = Math.sqrt(ix * ix + iy * iy) || 1,
        lu = Math.sqrt(ux * ux + uy * uy) || 1;
    ix /= li;
    iy /= li;
    ux /= lu;
    uy /= lu;
    const cr = ix * uy - iy * ux;
    const outer = cr > 0 ? -1 : 1;
    const sx = -iy - uy,
        sy = ix + ux; // perp(dIn) + perp(dOut)
    const sl = Math.sqrt(sx * sx + sy * sy);
    const cosH = Math.max(sl / 2, 1e-6);
    J.ratio = 1 / cosH;
    J.inset = (hw * Math.sqrt(Math.max(0, 1 - cosH * cosH))) / cosH;
    J.inX = px + outer * -iy * hw;
    J.inY = py + outer * ix * hw; // outer corner of the incoming piece
    J.outX = px + outer * -uy * hw;
    J.outY = py + outer * ux * hw; // outer corner of the outgoing piece
    const mx = sl > 1e-6 ? sx / sl : -iy,
        my = sl > 1e-6 ? sy / sl : ix;
    J.tx = px + outer * mx * hw * J.ratio;
    J.ty = py + outer * my * hw * J.ratio; // miter tip
    J.li = li;
    J.lu = lu;
    return J;
}

// ---------------------------------------------------------------- the edges
// Each edge: { pts: number[] (x,y,z world), w, alpha, focus: [x,y,z] }
function testEdges() {
    const edges = [];
    const rot = (10 * Math.PI) / 180;
    CASES.forEach((a, row) => {
        ALPHAS.forEach((alpha, ai) => {
            WIDTHS.forEach((w, wi) => {
                const col = ai * 4 + wi;
                const cx = col * CELL + CELL / 2,
                    cy = row * CELL + 115;
                let local;
                if (a === "U") {
                    local = [
                        [-8, -70],
                        [-8, 0],
                        [8, 0],
                        [8, -60],
                    ];
                } else {
                    const h = ((a / 2) * Math.PI) / 180;
                    local = [
                        [70 * Math.cos(-Math.PI / 2 - h), 70 * Math.sin(-Math.PI / 2 - h)],
                        [0, 0],
                        [60 * Math.cos(-Math.PI / 2 + h), 60 * Math.sin(-Math.PI / 2 + h)],
                    ];
                }
                const pts = [];
                for (const [x, y] of local) {
                    const rx = x * Math.cos(rot) - y * Math.sin(rot),
                        ry = x * Math.sin(rot) + y * Math.cos(rot);
                    pts.push(cx + rx, -(cy + ry), 0);
                }
                edges.push({ pts, w, alpha, row, col, focus: [cx, -cy, 0] });
            });
        });
    });
    return edges;
}

function rng(seed) {
    let s = seed >>> 0;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
function stressEdges(n) {
    const r = rng(7);
    const edges = [];
    for (let i = 0; i < n; i++) {
        let x = r() * W,
            y = -r() * H,
            z = MODE === "3d" ? (r() - 0.5) * 600 : 0;
        const pts = [x, y, z];
        let ang = r() * Math.PI * 2;
        for (let k = 0; k < 3; k++) {
            ang += (r() - 0.5) * 2.6;
            const len = 15 + r() * 35;
            x += Math.cos(ang) * len;
            y += Math.sin(ang) * len;
            pts.push(x, y, z);
        }
        edges.push({ pts, base: pts.slice(), w: 2, alpha: 1 });
    }
    return edges;
}

const EDGES = STRESS ? stressEdges(STRESS) : testEdges();

// ---------------------------------------------------------------- variants
// Each builder returns { update(), stats } where update() rewrites every instance from EDGES.
function piecesOf(e) {
    return e.pts.length / 3 - 1;
}
function groupByAlpha() {
    const g = new Map();
    for (const e of EDGES) {
        if (!g.has(e.alpha)) g.set(e.alpha, []);
        g.get(e.alpha).push(e);
    }
    return g;
}

function buildTI2D(kind) {
    // kind: A (pieces), B (pieces + miter/bevel tris), C (pieces + discs), F (extended pieces + bevel tri)
    const parts = [];
    for (const [alpha, edges] of groupByAlpha()) {
        const mat = material("ti", alpha);
        const nPieces = edges.reduce((s, e) => s + piecesOf(e), 0);
        const nCorners = nPieces - edges.length;
        const pieces = new TiBatch(RECT(), mat, nPieces);
        const tris =
            kind === "B"
                ? new TiBatch(TRI(), mat, nCorners * 2)
                : kind === "F"
                  ? new TiBatch(TRI(), mat, nCorners)
                  : null;
        const discs = kind === "C" ? new TiBatch(DISC(1), mat, nCorners) : null;
        parts.push({ edges, pieces, tris, discs });
    }
    function update() {
        for (const { edges, pieces, tris, discs } of parts) {
            let pi = 0,
                ti = 0,
                di = 0;
            for (const e of edges) {
                const p = e.pts,
                    n = piecesOf(e),
                    hw = e.w / 2;
                let dist = 0;
                for (let i = 0; i < n; i++) {
                    let ax = p[i * 3],
                        ay = p[i * 3 + 1];
                    let bx = p[i * 3 + 3],
                        by = p[i * 3 + 4];
                    const len = Math.hypot(bx - ax, by - ay);
                    let dStart = kind === "A" ? 0 : dist;
                    if (kind === "F") {
                        const ux = (bx - ax) / len,
                            uy = (by - ay) / len;
                        if (i > 0) {
                            const j = join(p[i * 3 - 3], p[i * 3 - 2], ax, ay, bx, by, hw);
                            if (j.ratio <= MITER_LIMIT) {
                                ax -= ux * j.inset;
                                ay -= uy * j.inset;
                                dStart -= j.inset;
                            }
                        }
                        if (i < n - 1) {
                            const j = join(ax, ay, bx, by, p[i * 3 + 6], p[i * 3 + 7], hw);
                            if (j.ratio <= MITER_LIMIT) {
                                bx += ux * j.inset;
                                by += uy * j.inset;
                            }
                        }
                    }
                    rect(pieces.m, pi * 16, ax, ay, bx, by, e.w);
                    pieces.d[pi * 2] = dStart;
                    pieces.d[pi * 2 + 1] = Math.hypot(bx - ax, by - ay);
                    pi++;
                    dist += len;
                    if (i === n - 1) break;
                    const px = p[i * 3 + 3],
                        py = p[i * 3 + 4];
                    const j = join(p[i * 3], p[i * 3 + 1], px, py, p[i * 3 + 6], p[i * 3 + 7], hw);
                    if (kind === "B") {
                        if (j.ratio <= MITER_LIMIT) {
                            tri(tris.m, ti * 16, px, py, j.inX, j.inY, j.tx, j.ty);
                            tri(tris.m, ti * 16 + 16, px, py, j.tx, j.ty, j.outX, j.outY);
                        } else {
                            tri(tris.m, ti * 16, px, py, j.inX, j.inY, j.outX, j.outY);
                            tris.m.fill(0, ti * 16 + 16, ti * 16 + 32);
                        }
                        tris.d[ti * 2] = dist;
                        tris.d[ti * 2 + 2] = dist;
                        ti += 2;
                    } else if (kind === "F") {
                        if (j.ratio > MITER_LIMIT) tri(tris.m, ti * 16, px, py, j.inX, j.inY, j.outX, j.outY);
                        else tris.m.fill(0, ti * 16, ti * 16 + 16);
                        tris.d[ti * 2] = dist;
                        ti++;
                    } else if (kind === "C") {
                        point(discs.m, di * 16, px, py, 0, hw);
                        discs.d[di * 2] = dist;
                        di++;
                    }
                }
            }
            pieces.flush();
            tris?.flush();
            discs?.flush();
        }
    }
    const per = { A: [1, 0, 0], B: [1, 2, 0], C: [1, 0, 1], F: [1, 1, 0] }[kind];
    const bytes = parts.reduce((s, p) => s + p.pieces.bytes + (p.tris?.bytes ?? 0) + (p.discs?.bytes ?? 0), 0);
    return {
        update,
        info: {
            instancesPerPiece: per[0],
            instancesPerCorner: per[1] + per[2],
            verticesPerInstance: { piece: 4, tri: 3, disc: DISC_SEGMENTS + 1 },
            instanceBytes: bytes,
            floatsPerInstance: 18,
        },
    };
}

function buildSS3D(withDiscs) {
    const parts = [];
    for (const [alpha, edges] of groupByAlpha()) {
        const mat = material("seg3", alpha);
        const nPieces = edges.reduce((s, e) => s + piecesOf(e), 0);
        const pieces = new TiBatch(SEG3(), mat, nPieces);
        let discs = null;
        if (withDiscs) {
            discs = new TiBatch(DISC(1), material("disc3", alpha), nPieces - edges.length);
        }
        parts.push({ edges, pieces, discs });
    }
    const a = [0, 0, 0],
        b = [0, 0, 0];
    function update() {
        for (const { edges, pieces, discs } of parts) {
            let pi = 0,
                di = 0;
            for (const e of edges) {
                const p = e.pts,
                    n = piecesOf(e);
                let dist = 0;
                for (let i = 0; i < n; i++) {
                    a[0] = p[i * 3];
                    a[1] = p[i * 3 + 1];
                    a[2] = p[i * 3 + 2];
                    b[0] = p[i * 3 + 3];
                    b[1] = p[i * 3 + 4];
                    b[2] = p[i * 3 + 5];
                    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
                    seg3(pieces.m, pi * 16, a, b, e.w);
                    pieces.d[pi * 2] = withDiscs ? dist : 0;
                    pieces.d[pi * 2 + 1] = len;
                    pi++;
                    dist += len;
                    if (discs && i < n - 1) {
                        point(discs.m, di * 16, b[0], b[1], b[2], 0);
                        discs.m[di * 16 + 4] = e.w;
                        discs.d[di * 2] = dist;
                        di++;
                    }
                }
            }
            pieces.flush();
            discs?.flush();
        }
    }
    const bytes = parts.reduce((s, p) => s + p.pieces.bytes + (p.discs?.bytes ?? 0), 0);
    return {
        update,
        info: {
            instancesPerPiece: 1,
            instancesPerCorner: withDiscs ? 1 : 0,
            verticesPerInstance: { piece: 4, disc: DISC_SEGMENTS + 1 },
            instanceBytes: bytes,
            floatsPerInstance: 18,
        },
    };
}

const MITER_FLOATS = 14;
function buildMiter() {
    const parts = [];
    for (const [alpha, edges] of groupByAlpha()) {
        const mat = material("miter", alpha, ["pPrev", "pA", "pB", "pNext", "inst"]);
        // Six vertices: (end, side, isMid). Quad + one half-join triangle per end.
        const mesh = templateMesh(
            "miter",
            [0, 1, 0, 0, -1, 0, 0, 0, 1, 1, 1, 0, 1, -1, 0, 1, 0, 1],
            [0, 1, 4, 0, 4, 3, 0, 1, 2, 3, 4, 5],
        );
        mesh.material = mat;
        const n = edges.reduce((s, e) => s + piecesOf(e), 0);
        const data = new Float32Array(n * MITER_FLOATS);
        const buf = new Buffer(engine, data, true, MITER_FLOATS, false, true);
        mesh.setVerticesBuffer(buf.createVertexBuffer("pPrev", 0, 3, MITER_FLOATS, true));
        mesh.setVerticesBuffer(buf.createVertexBuffer("pA", 3, 3, MITER_FLOATS, true));
        mesh.setVerticesBuffer(buf.createVertexBuffer("pB", 6, 3, MITER_FLOATS, true));
        mesh.setVerticesBuffer(buf.createVertexBuffer("pNext", 9, 3, MITER_FLOATS, true));
        mesh.setVerticesBuffer(buf.createVertexBuffer("inst", 12, 2, MITER_FLOATS, true));
        mesh.forcedInstanceCount = n;
        parts.push({ edges, data, buf, n });
    }
    function update() {
        for (const { edges, data, buf } of parts) {
            let o = 0;
            for (const e of edges) {
                const p = e.pts,
                    n = piecesOf(e);
                let dist = 0;
                for (let i = 0; i < n; i++) {
                    const pi = i === 0 ? i : i - 1; // no prev: repeat a (the shader reads that as a free end)
                    const ni = i === n - 1 ? i + 1 : i + 2;
                    data[o] = p[pi * 3];
                    data[o + 1] = p[pi * 3 + 1];
                    data[o + 2] = p[pi * 3 + 2];
                    data[o + 3] = p[i * 3];
                    data[o + 4] = p[i * 3 + 1];
                    data[o + 5] = p[i * 3 + 2];
                    data[o + 6] = p[i * 3 + 3];
                    data[o + 7] = p[i * 3 + 4];
                    data[o + 8] = p[i * 3 + 5];
                    data[o + 9] = p[ni * 3];
                    data[o + 10] = p[ni * 3 + 1];
                    data[o + 11] = p[ni * 3 + 2];
                    data[o + 12] = e.w;
                    data[o + 13] = dist;
                    dist += Math.hypot(
                        p[i * 3 + 3] - p[i * 3],
                        p[i * 3 + 4] - p[i * 3 + 1],
                        p[i * 3 + 5] - p[i * 3 + 2],
                    );
                    o += MITER_FLOATS;
                }
            }
            buf.update(data);
        }
    }
    const bytes = parts.reduce((s, p) => s + p.n * MITER_FLOATS * 4, 0);
    return {
        update,
        info: {
            instancesPerPiece: 1,
            instancesPerCorner: 0,
            verticesPerInstance: { piece: 6 },
            instanceBytes: bytes,
            floatsPerInstance: MITER_FLOATS,
        },
    };
}

function buildGreased() {
    const meshes = [];
    const lineOf = (e) => {
        const out = [];
        for (let i = 0; i < e.pts.length; i++) out.push(e.pts[i]);
        return out;
    };
    const totalLen = (e) => {
        let s = 0;
        for (let i = 0; i + 3 < e.pts.length; i += 3)
            s += Math.hypot(e.pts[i + 3] - e.pts[i], e.pts[i + 4] - e.pts[i + 1], e.pts[i + 5] - e.pts[i + 2]);
        return s;
    };
    if (STRESS) {
        const mesh = CreateGreasedLine(
            "gl",
            { points: EDGES.map(lineOf), updatable: true },
            { width: 2, color: new Color3(...COLOR), sizeAttenuation: false },
            scene,
        );
        mesh.alwaysSelectAsActiveMesh = true;
        meshes.push(mesh);
        return {
            update() {
                mesh.setPoints(EDGES.map(lineOf));
            },
            info: {
                instancesPerPiece: 0,
                instancesPerCorner: 0,
                verticesPerInstance: { point: 2 },
                instanceBytes: estimateGreasedBytes(mesh),
                floatsPerInstance: 0,
            },
        };
    }
    for (const e of EDGES) {
        const len = totalLen(e);
        const mesh = CreateGreasedLine(
            `gl${meshes.length}`,
            { points: lineOf(e), updatable: true },
            {
                width: e.w,
                color: new Color3(...COLOR),
                sizeAttenuation: false,
                useDash: DASH,
                dashCount: len / (DASH_ON + DASH_OFF),
                dashRatio: DASH_OFF / (DASH_ON + DASH_OFF),
            },
            scene,
        );
        mesh.material.alpha = e.alpha;
        mesh.material.backFaceCulling = false;
        mesh.alwaysSelectAsActiveMesh = true;
        meshes.push(mesh);
    }
    return {
        update() {},
        info: {
            verticesPerInstance: { point: 2 },
            instanceBytes: meshes.reduce((s, m) => s + estimateGreasedBytes(m), 0),
        },
    };
}
function estimateGreasedBytes(mesh) {
    let bytes = 0;
    for (const kind of mesh.getVerticesDataKinds()) bytes += (mesh.getVerticesData(kind)?.length ?? 0) * 4;
    bytes += (mesh.getIndices()?.length ?? 0) * 4;
    return bytes;
}

// G: the shader graphty-element ships (src/meshes/edgeJoinShader.ts). World-space width in both
// modes; in 3D the width is converted at each edge's distance so it matches the pixel variants.
Effect.ShadersStore.joinVertexShader = EDGE_JOIN_VERTEX_SHADER;
Effect.ShadersStore.joinFragmentShader = EDGE_JOIN_FRAGMENT_SHADER;
function worldPerPx(e) {
    if (MODE === "2d") return 1;
    const f = e.focus ?? e.pts.slice(0, 3);
    const z = Vector3.Distance(Vector3.FromArray(f), camera.position);
    return (z * 2 * Math.tan(camera.fov / 2)) / H;
}
function buildJoined() {
    const F = JOIN_FLOATS_PER_PIECE;
    const parts = [];
    // One batch per width and opacity: width is a batch uniform in graphty-element.
    const groups = new Map();
    for (const e of EDGES) {
        const k = `${e.w}|${e.alpha}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(e);
    }
    for (const edges of groups.values()) {
        const { w, alpha } = edges[0];
        const s = STRESS ? 1 : worldPerPx(edges[0]);
        const mat = new ShaderMaterial(
            `j${materials.length}`,
            scene,
            { vertex: "join", fragment: "join" },
            {
                attributes: ["position", "pPrev", "pA", "pB", "pNext", "run"],
                uniforms: [
                    "world",
                    "viewProjection",
                    "projection",
                    "resolution",
                    "width",
                    "miterLimit",
                    "color",
                    "opacity",
                    "pattern",
                ],
                defines: STRESS && MODE === "3d" ? [] : ["#define WORLD_WIDTH"],
                needAlphaBlending: alpha < 1,
            },
        );
        mat.backFaceCulling = false;
        mat.setFloat("width", STRESS && MODE === "3d" ? w * 2 * 1500 : w * s);
        mat.setFloat("miterLimit", EDGE_MITER_LIMIT);
        mat.setVector3("color", new Vector3(...COLOR));
        mat.setFloat("opacity", alpha);
        mat.setVector3("pattern", DASH ? new Vector3(DASH_ON * s, 1, (w * s) / 2) : new Vector3(0, 0, 0));
        materials.push(mat);
        const mesh = templateMesh("join", [...JOIN_TEMPLATE_POSITIONS], [...JOIN_TEMPLATE_INDICES]);
        mesh.material = mat;
        const n = edges.reduce((sum, e) => sum + piecesOf(e), 0);

        const data = new Float32Array(n * F);
        const buf = new Buffer(engine, data, true, F, false, true);
        mesh.setVerticesBuffer(buf.createVertexBuffer("pPrev", 0, 3, F, true));
        mesh.setVerticesBuffer(buf.createVertexBuffer("pA", 3, 3, F, true));
        mesh.setVerticesBuffer(buf.createVertexBuffer("pB", 6, 3, F, true));
        mesh.setVerticesBuffer(buf.createVertexBuffer("pNext", 9, 3, F, true));
        mesh.setVerticesBuffer(buf.createVertexBuffer("run", 12, 2, F, true));
        mesh.forcedInstanceCount = n;
        parts.push({ edges, data, buf, n, spacing: DASH ? (DASH_ON + DASH_OFF) * s : 0 });
    }
    function update() {
        for (const { edges, data, buf, spacing } of parts) {
            let o = 0;
            for (const e of edges) {
                const p = e.pts,
                    n = piecesOf(e);
                let dist = 0;
                for (let i = 0; i < n; i++) {
                    const pi = i === 0 ? i : i - 1;
                    const ni = i === n - 1 ? i + 1 : i + 2;
                    data[o] = p[pi * 3];
                    data[o + 1] = p[pi * 3 + 1];
                    data[o + 2] = p[pi * 3 + 2];
                    data[o + 3] = p[i * 3];
                    data[o + 4] = p[i * 3 + 1];
                    data[o + 5] = p[i * 3 + 2];
                    data[o + 6] = p[i * 3 + 3];
                    data[o + 7] = p[i * 3 + 4];
                    data[o + 8] = p[i * 3 + 5];
                    data[o + 9] = p[ni * 3];
                    data[o + 10] = p[ni * 3 + 1];
                    data[o + 11] = p[ni * 3 + 2];
                    data[o + 12] = dist;
                    data[o + 13] = spacing;
                    dist += Math.hypot(
                        p[i * 3 + 3] - p[i * 3],
                        p[i * 3 + 4] - p[i * 3 + 1],
                        p[i * 3 + 5] - p[i * 3 + 2],
                    );
                    o += F;
                }
            }
            buf.update(data);
        }
    }
    return {
        update,
        info: {
            instancesPerPiece: 1,
            instancesPerCorner: 0,
            verticesPerInstance: { piece: 10 },
            instanceBytes: parts.reduce((s2, p) => s2 + p.n * JOIN_FLOATS_PER_PIECE * 4, 0),
            floatsPerInstance: JOIN_FLOATS_PER_PIECE,
        },
    };
}

// H: the same rectangles as A, expanded on the CPU into ONE plain mesh (no instancing). Only for
// the SwiftShader question: is the per-frame cost the instanced draw, or the triangles?
Effect.ShadersStore.plainVertexShader = `precision highp float;
attribute vec3 position; uniform mat4 viewProjection; varying float vDist;
void main() { gl_Position = viewProjection * vec4(position, 1.0); vDist = 0.0; }`;
function buildPlain() {
    const n = EDGES.reduce((sum, e) => sum + piecesOf(e), 0);
    const pos = new Float32Array(n * 12);
    const idx = new Uint32Array(n * 6);
    for (let i = 0; i < n; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    const mesh = new Mesh("plain", scene);
    const mat = new ShaderMaterial(
        "plain",
        scene,
        { vertex: "plain", fragment: "flat" },
        { attributes: ["position"], uniforms: ["viewProjection", "color", "dash"] },
    );
    mat.backFaceCulling = false;
    mat.setColor4("color", new Color4(COLOR[0], COLOR[1], COLOR[2], 1));
    mat.setVector2("dash", { x: 0, y: 0 });
    mesh.material = mat;
    mesh.alwaysSelectAsActiveMesh = true;
    function fill() {
        let o = 0;
        for (const e of EDGES) {
            const p = e.pts,
                hw = e.w / 2;
            for (let i = 0; i < piecesOf(e); i++) {
                const ax = p[i * 3],
                    ay = p[i * 3 + 1],
                    bx = p[i * 3 + 3],
                    by = p[i * 3 + 4];
                const l = Math.hypot(bx - ax, by - ay) || 1,
                    nx = (-(by - ay) / l) * hw,
                    ny = ((bx - ax) / l) * hw;
                pos.set([ax - nx, ay - ny, 0, bx - nx, by - ny, 0, bx + nx, by + ny, 0, ax + nx, ay + ny, 0], o);
                o += 12;
            }
        }
    }
    fill();
    const vd = new VertexData();
    vd.positions = pos;
    vd.indices = idx;
    vd.applyToMesh(mesh, true);
    return {
        update() {
            fill();
            mesh.updateVerticesData("position", pos);
        },
        info: { instancesPerPiece: 0 },
    };
}

// The ideal stroke, drawn by the browser's own 2D canvas (butt caps, miter joins, limit 4): what
// a correct join covers. 2D mode only; the page reads it back with ?ref=1.
function referenceStroke() {
    const c2 = document.createElement("canvas");
    c2.width = W;
    c2.height = H;
    const g = c2.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, W, H);
    g.lineJoin = "miter";
    g.miterLimit = MITER_LIMIT;
    g.lineCap = "butt";
    if (DASH) g.setLineDash([DASH_ON, DASH_OFF]);
    for (const e of EDGES) {
        g.strokeStyle = `rgba(${COLOR.map((c) => Math.round(c * 255)).join(",")},${e.alpha})`;
        g.lineWidth = e.w;
        g.beginPath();
        for (let k = 0; k < e.pts.length; k += 3) g[k ? "lineTo" : "moveTo"](e.pts[k], -e.pts[k + 1]);
        g.stroke();
    }
    return c2.toDataURL("image/png");
}

// ---------------------------------------------------------------- build + measure
const builders = {
    "2d": {
        A: () => buildTI2D("A"),
        B: () => buildTI2D("B"),
        C: () => buildTI2D("C"),
        D: buildMiter,
        E: buildGreased,
        F: () => buildTI2D("F"),
        G: buildJoined,
        H: buildPlain,
    },
    "3d": { A: () => buildSS3D(false), C: () => buildSS3D(true), D: buildMiter, E: buildGreased, G: buildJoined },
};
// MODE and VARIANT come from the URL: only an own entry of the table is a builder.
const modeBuilders = Object.hasOwn(builders, MODE) ? builders[MODE] : {};
const make = Object.hasOwn(modeBuilders, VARIANT) ? modeBuilders[VARIANT] : undefined;
const result = { variant: VARIANT, mode: MODE, dash: DASH, stress: STRESS };
if (!make) {
    result.error = "not applicable in this mode";
    window.__result = result;
    document.title = "done";
} else {
    const built = make();
    built.update();
    result.info = built.info;
    const sceneInstr = new SceneInstrumentation(scene);
    sceneInstr.captureFrameTime = true;
    const engInstr = new EngineInstrumentation(engine);
    engInstr.captureGPUFrameTime = true;
    const gl = engine._gl;
    const px = new Uint8Array(4);
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);

    scene.executeWhenReady(async () => {
        scene.render();
        sync();
        result.foci = EDGES.filter((e) => e.focus).map((e) => {
            const v = Vector3.Project(
                Vector3.FromArray(e.focus),
                Matrix.Identity(),
                scene.getTransformMatrix(),
                camera.viewport.toGlobal(W, H),
            );
            return { row: e.row, col: e.col, w: e.w, alpha: e.alpha, x: v.x, y: v.y };
        });
        result.drawCalls = sceneInstr.drawCallsCounter.current;
        result.renderer = engine.getGlInfo().renderer;
        if (STRESS) {
            const frames = 90;
            const upd = [],
                ren = [],
                still = [],
                gpu = [];
            const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
            // Static frames: nothing moves.
            for (let f = 0; f < 30; f++) {
                await nextFrame();
                const t0 = performance.now();
                for (let k = 0; k < 10; k++) scene.render();
                sync();
                still.push((performance.now() - t0) / 10);
            }
            for (let f = 0; f < frames; f++) {
                await nextFrame();
                const t = f * 0.05;
                for (let i = 0; i < EDGES.length; i++) {
                    const e = EDGES[i];
                    for (let k = 0; k < e.pts.length; k += 3) {
                        e.pts[k] = e.base[k] + Math.sin(t + i * 0.37 + k) * 4;
                        e.pts[k + 1] = e.base[k + 1] + Math.cos(t + i * 0.21 + k) * 4;
                    }
                }
                const t0 = performance.now();
                built.update();
                const t1 = performance.now();
                scene.render();
                sync();
                const t2 = performance.now();
                upd.push(t1 - t0);
                ren.push(t2 - t1);
                if (engInstr.gpuFrameTimeCounter.current) gpu.push(engInstr.gpuFrameTimeCounter.current * 1e-6);
            }
            const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
            result.perf = {
                updateMs: med(upd.slice(10)),
                renderMovingMs: med(ren.slice(10)),
                renderStillMs: med(still.slice(5)),
                gpuMs: med(gpu.slice(10)),
                drawCalls: sceneInstr.drawCallsCounter.current,
                pieces: EDGES.reduce((s, e) => s + piecesOf(e), 0),
                activeIndices: scene.getActiveIndices(),
            };
        }
        if (q.get("ref") === "1" && MODE === "2d") result.reference = referenceStroke();
        window.__result = result;
        document.title = "done";
    });
}
