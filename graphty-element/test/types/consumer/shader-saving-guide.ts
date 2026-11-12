/**
 * @file The shader guide's "Saving and opening" examples (docs/guide/shaders.md), compiled against
 * the published declarations with no cast. Nothing here runs; `tsconfig.strict-consumer.json`
 * checks it against `dist/`.
 */

import type { Graphty } from "@graphty/graphty-element";

export async function pick(g: Graphty, layerId: string, catalogId: string): Promise<void> {
    const id = await g.session.shaders.fromCatalog(catalogId); // the id to write in this project
    await g.session.styles.update(layerId, { set: { "node.shaders": [{ shader: id }] } });
}

export function isPicked(g: Graphty, usedId: string, catalogId: string): boolean {
    return g.session.shaders.describe(usedId)?.copyOf === catalogId;
}

export function trustShaders(
    element: Graphty,
    remembered: string[],
    offerToRun: (ids: readonly string[]) => void,
): void {
    element.shaderSettings = { trustedHashes: remembered }; // hashes the reader approved before
    element.session.on("shader:held", ({ ids }) => offerToRun(ids));
    element.session.on("shader:approved", ({ hash }) => remembered.push(hash)); // store it somewhere lasting
}

export async function approve(element: Graphty, id: string): Promise<void> {
    await element.session.shaders.approve(id);
}
