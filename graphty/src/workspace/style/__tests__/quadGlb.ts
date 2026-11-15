/**
 * @file A tiny GLB the app's model tests hand the real element.
 */

/**
 * A GLB holding one white quad facing the camera, as a 3D program would export it.
 * @returns the file's bytes.
 */
export function quadGlb(): Uint8Array<ArrayBuffer> {
    const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]);
    const bin = new Uint8Array(positions.byteLength + indices.byteLength);
    bin.set(new Uint8Array(positions.buffer), 0);
    bin.set(new Uint8Array(indices.buffer), positions.byteLength);
    const json = new TextEncoder().encode(
        JSON.stringify({
            asset: { version: "2.0" },
            scene: 0,
            scenes: [{ nodes: [0] }],
            nodes: [{ mesh: 0 }],
            meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
            materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] }, doubleSided: true }],
            accessors: [
                { bufferView: 0, componentType: 5126, count: 4, type: "VEC3", min: [-1, -1, 0], max: [1, 1, 0] },
                { bufferView: 1, componentType: 5123, count: 12, type: "SCALAR" },
            ],
            bufferViews: [
                { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
                { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength },
            ],
            buffers: [{ byteLength: bin.byteLength }],
        }),
    );
    const jsonLength = Math.ceil(json.length / 4) * 4;
    const binLength = Math.ceil(bin.length / 4) * 4;
    const out = new Uint8Array(12 + 8 + jsonLength + 8 + binLength);
    const view = new DataView(out.buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, out.length, true);
    view.setUint32(12, jsonLength, true);
    view.setUint32(16, 0x4e4f534a, true);
    out.fill(0x20, 20, 20 + jsonLength);
    out.set(json, 20);
    view.setUint32(20 + jsonLength, binLength, true);
    view.setUint32(24 + jsonLength, 0x004e4942, true);
    out.set(bin, 28 + jsonLength);
    return out;
}

/**
 * A valid 1 x 1 PNG, for a picture (`node.texture`).
 * @returns the file's bytes.
 */
export function dotPng(): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(
        atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
        (c) => c.codePointAt(0) ?? 0,
    );
}
