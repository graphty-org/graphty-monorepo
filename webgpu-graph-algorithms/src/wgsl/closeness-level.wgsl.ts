/**
 * The `closeness-level` kernel body: one level of the bit-parallel multi-source breadth-first search of closeness, in
 * ONE dispatch, plus the two seed roles of a batch. A batch runs `32 x P.words` sources at once: bit `b` of word `j`
 * of node `v` is source lane `32 j + b`. The `bits` buffer holds five regions of `P.base` words, `P.words` words per
 * node: `visited` at 0, three frontier regions at `P.base`, `2 P.base` and `3 P.base` that rotate by the level
 * (level `L` reads region `1 + L % 3`, writes region `1 + (L + 1) % 3` and zeroes region `1 + (L + 2) % 3`, the
 * frontier of level `L - 1` that nothing reads any more, so no fill runs between levels; a stale bit could never
 * claim anything, since its node's neighbours were claimed the level after, so the clear only keeps a later frontier
 * from re-walking old nodes), then a sampled run's
 * per-node distance sums at `4 P.base`. The `table` buffer holds the per-level claim counts of the submit (row `P.row`
 * at `P.row x 32 P.words`, one word per source lane), then a ring of three control slots of four words at `P.ctrl`
 * (`any` @0: the level claimed something; `arcs` @1: the out-degree of every (node, word) that joined the next
 * frontier; `pull` @2: `arcs` passed `P.pullAt`), then a sampled run's source list at `P.sourcesAt`.
 *
 * Role 0 (one invocation per node and per arc, `max(n, arcs)` in all): a level whose predecessor claimed nothing
 * returns at once (one uniform load per workgroup), so the host can record more levels than the batch needs.
 * Otherwise the level chooses its step from the slot its predecessor filled, the same way for every invocation:
 *   - PUSH (the frontier is cheap to expand): one invocation per out-arc `(u, x)` -- `u` found by a binary search of
 *     `rowPtr` -- claims the sources at `u` that `x` has not seen with `atomicOr` on `x`'s visited word; the bits it
 *     won (`fresh`) join the next frontier;
 *   - PULL (the frontier's arcs pass `P.pullAt`, and `P.pullOk`): one invocation per node not yet reached by every
 *     source walks its IN-arcs, ORs the neighbours' frontier words, and keeps the bits it had not seen; it stops at
 *     the first in-arc after which every source has reached it (the early exit). Only the owner writes a node's
 *     words. The host allows the pull only when no node has more than a few thousand in-arcs, so no
 *     invocation of either step loops more than a few tens of thousands of times (llvmpipe silently ends every loop
 *     of an invocation past 65,535 iterations).
 * Every claimed bit is tallied per source lane in workgroup memory and flushed with one global `atomicAdd` per lane
 * per workgroup into the level's row; the host turns the counts into exact sums (`count x (L + 1)`) and harmonic
 * sums (`count / (L + 1)`). Role 1 (one invocation per word): zeroes the regions, sets every dead lane of a partial
 * batch as already visited (so the early exit and the "reached by every source" test see a full word), and zeroes the
 * control ring. Role 2 (one invocation per lane): seeds lane `b`'s source -- `P.source + b`, or word `P.source + b` of
 * the source list -- into `visited` and level 0's frontier with `atomicOr` (a node listed twice carries both bits),
 * and fills the control slot level 0 reads. Body only; the text is normative: the sabotage rows of
 * test/helpers/sabotage.ts are textual edits of it.
 */
export const closenessLevelWgsl = /* wgsl */ `
const max_words: u32 = 8u;
var<workgroup> tally: array<atomic<u32>, 32u * max_words>;   // 32 x max_words: this workgroup's claims per source lane
var<workgroup> wlive: u32;
var<workgroup> wpull: u32;
var<workgroup> wany: atomic<u32>;
var<workgroup> warcs: atomic<u32>;
var<workgroup> wover: atomic<u32>;

fn dead_lanes(j: u32) -> u32 {                        // the lanes of word j at or past the batch's source count
    let first = 32u * j;
    if (P.count >= first + 32u) { return 0u; }
    if (P.count <= first) { return U32_MAX; }
    return ~((1u << (P.count - first)) - 1u);
}

fn add_arcs(slot: u32, value: u32) {                  // the arcs total of a control slot; pull once it passes P.pullAt
    if (value == 0u) { return; }
    let before = atomicAdd(&table[slot + 1u], value);
    if (value > P.pullAt || before + value > P.pullAt || before + value < before) {
        atomicStore(&table[slot + 2u], 1u);
    }
}

fn record(j: u32, node: u32, fresh: u32, dist: u32) {   // the claims of one word: tallied per lane, a sampled run's sums
    if (P.perNode == 1u) { atomicAdd(&bits[4u * P.base + node], countOneBits(fresh) * dist); }
    var b = fresh;
    loop {
        if (b == 0u) { break; }
        atomicAdd(&tally[32u * j + firstTrailingBit(b)], 1u);
        b = b & (b - 1u);
    }
}

@compute @workgroup_size(WG)
fn closeness_level(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    let W = P.words;
    if (P.role == 1u) {                                              // seed, part 1: one invocation per word
        if (i == 0u) {
            for (var k = 0u; k < 12u; k = k + 1u) { atomicStore(&table[P.ctrl + k], 0u); }
        }
        if (i < P.total) { atomicStore(&bits[i], select(0u, dead_lanes(i % W), i < P.base)); }
        return;                                                      // uniform: P.role is
    }
    if (P.role == 2u) {                                              // seed, part 2: one invocation per source lane
        if (i < P.count) {
            var v = P.source + i;
            if (P.sourcesAt != 0u) { v = atomicLoad(&table[P.sourcesAt + P.source + i]); }
            let w = v * W + i / 32u;
            let bit = 1u << (i % 32u);
            atomicOr(&bits[w], bit);                                 // visited
            let before = atomicOr(&bits[P.base + w], bit);           // level 0's frontier (region 1)
            let slot = P.ctrl + 8u;                                  // the slot of "level -1", which level 0 reads
            atomicStore(&table[slot], 1u);
            if (before == 0u) { add_arcs(slot, rowPtr[v + 1u] - rowPtr[v]); }
        }
        return;
    }

    // role 0: one level
    let L = P.level;
    let prev = P.ctrl + 4u * ((L + 2u) % 3u);
    let cur = P.ctrl + 4u * (L % 3u);
    if (lid.x == 0u) {
        wlive = atomicLoad(&table[prev]);
        wpull = select(0u, atomicLoad(&table[prev + 2u]), P.pullOk == 1u);
        atomicStore(&wany, 0u);
        atomicStore(&warcs, 0u);
        atomicStore(&wover, 0u);
    }
    for (var k = lid.x; k < 32u * W; k = k + WG) { atomicStore(&tally[k], 0u); }
    let live = workgroupUniformLoad(&wlive);                         // uniform; includes a barrier
    if (live == 0u) { return; }                                      // the previous level claimed nothing
    let pull = workgroupUniformLoad(&wpull) == 1u;
    if (i == 0u) {                                                   // the slot of level L + 1 held level L - 2's
        let nxt = P.ctrl + 4u * ((L + 1u) % 3u);
        atomicStore(&table[nxt], 0u);
        atomicStore(&table[nxt + 1u], 0u);
        atomicStore(&table[nxt + 2u], 0u);
    }
    let frontierBase = P.base * (1u + L % 3u);
    let nextBase = P.base * (1u + (L + 1u) % 3u);
    let staleBase = P.base * (1u + (L + 2u) % 3u);
    let dist = L + 1u;
    var arcs = 0u;
    if (i < P.n) {
        for (var j = 0u; j < W; j = j + 1u) { atomicStore(&bits[staleBase + i * W + j], 0u); }
    }
    if (pull) {
        if (i < P.n) {                                               // one invocation per node: its in-arcs
            var vis: array<u32, max_words>;
            var unseen = 0u;
            for (var j = 0u; j < W; j = j + 1u) {
                vis[j] = atomicLoad(&bits[i * W + j]);
                unseen = unseen | ~vis[j];
            }
            if (unseen != 0u) {                                      // some source has not reached this node yet
                var acc: array<u32, max_words>;
                let end = inRowPtr[i + 1u];
                for (var a = inRowPtr[i]; a < end; a = a + 1u) {
                    let u = inColIdx[a];
                    var missing = 0u;
                    for (var j = 0u; j < W; j = j + 1u) {
                        acc[j] = acc[j] | atomicLoad(&bits[frontierBase + u * W + j]);
                        missing = missing | ~(acc[j] | vis[j]);
                    }
                    if (missing == 0u) { break; }                    // every source has reached it: the early exit
                }
                let degree = rowPtr[i + 1u] - rowPtr[i];
                for (var j = 0u; j < W; j = j + 1u) {
                    let fresh = acc[j] & ~vis[j];
                    if (fresh != 0u) {
                        atomicStore(&bits[i * W + j], vis[j] | fresh);
                        atomicStore(&bits[nextBase + i * W + j], fresh);
                        arcs = arcs + degree;
                        record(j, i, fresh, dist);
                    }
                }
            }
        }
    } else if (i < P.arcCount) {                                     // one invocation per arc: no row is walked whole
        var lo = 0u;                                                 // the arc's source: the last row starting at or before it
        var hi = P.n - 1u;
        loop {
            if (lo >= hi) { break; }
            let mid = (lo + hi + 1u) / 2u;
            if (rowPtr[mid] <= i) { lo = mid; } else { hi = mid - 1u; }
        }
        let u = lo;
        let x = colIdx[i];
        for (var j = 0u; j < W; j = j + 1u) {
            let mask = atomicLoad(&bits[frontierBase + u * W + j]) & ~atomicLoad(&bits[x * W + j]);   // at u, not yet at x
            if (mask == 0u) { continue; }
            let fresh = mask & ~atomicOr(&bits[x * W + j], mask);    // the claims this invocation won
            if (fresh == 0u) { continue; }
            if (atomicOr(&bits[nextBase + x * W + j], fresh) == 0u) {
                arcs = arcs + (rowPtr[x + 1u] - rowPtr[x]);
            }
            record(j, x, fresh, dist);
        }
    }
    if (arcs > P.pullAt) {
        atomicStore(&wover, 1u);
    } else if (arcs != 0u) {
        let before = atomicAdd(&warcs, arcs);
        if (before + arcs > P.pullAt || before + arcs < before) { atomicStore(&wover, 1u); }
    }
    workgroupBarrier();
    let row = P.row * 32u * W;
    for (var k = lid.x; k < 32u * W; k = k + WG) {                   // ONE global atomic per source lane per workgroup
        let c = atomicLoad(&tally[k]);
        if (c != 0u) {
            atomicAdd(&table[row + k], c);
            atomicStore(&wany, 1u);
        }
    }
    workgroupBarrier();
    if (lid.x == 0u) {
        if (atomicLoad(&wany) != 0u) { atomicStore(&table[cur], 1u); }
        if (atomicLoad(&wover) != 0u) {
            atomicStore(&table[cur + 2u], 1u);
        } else {
            add_arcs(cur, atomicLoad(&warcs));
        }
    }
}
`;
