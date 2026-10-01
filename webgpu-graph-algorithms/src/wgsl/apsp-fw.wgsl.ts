/**
 * The `apsp-fw` kernel body (design 8.7): one phase of one round of blocked Floyd-Warshall over `APSP_TILE x
 * APSP_TILE` blocks of the row-major `n x n` matrix `dist`. Round `r` (`P.round`) runs three dispatches in order,
 * the `PHASE` override choosing which:
 *
 * - PHASE 0, one workgroup: the pivot block `(r, r)`, staged in `tileA` and updated in place.
 * - PHASE 1, `2 (B - 1)` workgroups (`B` = `P.blocks`): every other block of block row `r` (the first `B - 1`
 *   workgroups) and of block column `r` (the rest). The pivot block is staged in `tileA`, the block itself in
 *   `tileB`, updated in place.
 * - PHASE 2, `(B - 1)^2` workgroups: every block `(i, j)` off the pivot row and column. Its two operands are the
 *   pivot-COLUMN block `(i, r)` in `tileA` and the pivot-ROW block `(r, j)` in `tileB`; its own cells are read,
 *   minimised over the 32 steps and written by one lane each, never shared, so they stay in registers.
 *
 * In-place updates are race-free because a cell is written only when the candidate is STRICTLY smaller: the cells
 * every lane reads in step `k` (column `k` and row `k` of the tile) would be updated with `d + d[k][k]`, and the
 * diagonal is `0` (weights are non-negative, which the driver checks) or `+Infinity` outside the matrix, so they are
 * never written in step `k`. Every barrier is reached in uniform control flow: the early return keys on the workgroup
 * id and uniforms only, the per-lane loops hold no barrier, and the lanes of an edge tile load `+Infinity` for a cell
 * outside `n x n` (it offers no path; read from `P.infBits` because Tint refuses `+Infinity` as a constant) and
 * store nothing there -- the matrix is exactly `n * n`, never padded, so the
 * ceiling is `floor(sqrt(maxStorageBufferBindingSize / 4))`. Body only (spec 3.5, D9); the text is normative: the
 * sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const apspFwWgsl = /* wgsl */ `
var<workgroup> tileA: array<f32, APSP_TILE * APSP_TILE>;
var<workgroup> tileB: array<f32, APSP_TILE * APSP_TILE>;

fn tile_row(block: vec2<u32>, c: u32) -> u32 { return block.x * APSP_TILE + c / APSP_TILE; }
fn tile_col(block: vec2<u32>, c: u32) -> u32 { return block.y * APSP_TILE + c % APSP_TILE; }

fn load_cell(block: vec2<u32>, c: u32) -> f32 {
    let i = tile_row(block, c);
    let j = tile_col(block, c);
    if (i < P.n && j < P.n) { return dist[i * P.n + j]; }
    return bitcast<f32>(P.infBits);                                   // outside the matrix: no path through it
}

fn store_cell(block: vec2<u32>, c: u32, v: f32) {
    let i = tile_row(block, c);
    let j = tile_col(block, c);
    if (i >= P.n || j >= P.n) { return; }                            // an edge tile stores nothing outside n x n
    dist[i * P.n + j] = v;
}

@compute @workgroup_size(WG)
fn apsp_fw(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let r = P.round;
    let others = max(P.blocks, 2u) - 1u;                             // the blocks of a strip, the pivot excluded
    let cells = APSP_TILE * APSP_TILE;
    var count = 1u;
    var own = vec2<u32>(r, r);                                        // the block this workgroup updates
    var a = vec2<u32>(r, r);                                          // staged in tileA
    var b = vec2<u32>(r, r);                                          // staged in tileB
    if (PHASE == 1u) {
        count = 2u * others;
        let s = g % others;
        let o = select(s, s + 1u, s >= r);                            // a strip skips the pivot block
        own = select(vec2<u32>(o, r), vec2<u32>(r, o), g < others);   // block row r first, then block column r
        b = own;
    }
    if (PHASE == 2u) {
        count = others * others;
        let i = g / others;
        let j = g % others;
        own = vec2<u32>(select(i, i + 1u, i >= r), select(j, j + 1u, j >= r));
        a = vec2<u32>(own.x, r);                                      // the pivot-column block (i, r)
        b = vec2<u32>(r, own.y);                                      // the pivot-row block (r, j)
    }
    if (g >= count) { return; }                                       // uniform: the workgroup id and uniforms only

    for (var c = lid.x; c < cells; c = c + WG) {
        tileA[c] = load_cell(a, c);
        if (PHASE != 0u) { tileB[c] = load_cell(b, c); }
    }
    workgroupBarrier();                                               // every staged cell is visible

    if (PHASE == 2u) {
        for (var c = lid.x; c < cells; c = c + WG) {
            let x = c / APSP_TILE;
            let y = c % APSP_TILE;
            var v = load_cell(own, c);
            for (var kr = 0u; kr < APSP_TILE; kr = kr + 1u) {
                v = min(v, tileA[x * APSP_TILE + kr] + tileB[kr * APSP_TILE + y]);
            }
            store_cell(own, c, v);
        }
        return;
    }

    let pivotRow = PHASE == 1u && own.x == r;                          // block row r reads d[x][k] from the pivot
    for (var k = 0u; k < APSP_TILE; k = k + 1u) {
        for (var c = lid.x; c < cells; c = c + WG) {
            let x = c / APSP_TILE;
            let y = c % APSP_TILE;
            if (PHASE == 0u) {
                let via = tileA[x * APSP_TILE + k] + tileA[k * APSP_TILE + y];
                if (via < tileA[c]) { tileA[c] = via; }
            } else {
                let left = select(tileB[x * APSP_TILE + k], tileA[x * APSP_TILE + k], pivotRow);
                let right = select(tileA[k * APSP_TILE + y], tileB[k * APSP_TILE + y], pivotRow);
                let via = left + right;
                if (via < tileB[c]) { tileB[c] = via; }
            }
        }
        workgroupBarrier();                                           // step k is complete before step k + 1 reads
    }
    for (var c = lid.x; c < cells; c = c + WG) {
        store_cell(own, c, select(tileB[c], tileA[c], PHASE == 0u));
    }
}
`;
