import gexf from "./corpus/gexf/lesmiserables.gexf?raw";

/** Les Miserables as plain arrays: node ids (the characters' names) and the edges by node index. */
export interface LesMiserables {
    ids: string[];
    src: number[];
    dst: number[];
    /** How many chapters the two characters share. */
    weights: number[];
}

/**
 * Les Miserables (77 characters, 254 co-appearances) from the test corpus, with no network:
 * `@graphty/graph-samples` now downloads its datasets on demand.
 * @returns the graph.
 */
export function lesMiserables(): LesMiserables {
    const index = new Map<string, number>();
    const ids: string[] = [];
    for (const [, id, label] of gexf.matchAll(/<node id="([^"]+)" label="([^"]+)"/g)) {
        index.set(id, ids.length);
        ids.push(label);
    }
    const out: LesMiserables = { ids, src: [], dst: [], weights: [] };
    for (const [, source, target, weight] of gexf.matchAll(
        /<edge [^>]*source="([^"]+)" target="([^"]+)" weight="([^"]+)"/g,
    )) {
        out.src.push(index.get(source) ?? -1);
        out.dst.push(index.get(target) ?? -1);
        out.weights.push(Number(weight));
    }
    return out;
}
