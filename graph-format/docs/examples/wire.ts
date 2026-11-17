import { fromBytes, fromEdgeArrays, fromWire, GraphFormatError, isGraphSnapshot } from "@graphty/graph-format";

const snapshot = fromEdgeArrays({
    directed: false,
    nodeCount: 3,
    src: new Uint32Array([0, 1]),
    dst: new Uint32Array([1, 2]),
    ids: ["a", "b", "c"],
});

// For postMessage and IndexedDB: a plain object of typed arrays. Pass `wire.buffers` as the
// transfer list to move the memory instead of copying it.
const wire = snapshot.toWire({ transfer: true });
const received = fromWire(wire); // what a Web Worker would do with event.data
console.log(isGraphSnapshot(received), received.ids.idOf(2)); // true c

// For files and the network: one contiguous byte container.
const bytes = snapshot.toBytes();
const loaded = fromBytes(bytes); // checks everything by default: the bytes may come from anywhere
console.log(loaded.nodeCount, loaded.edgeCount); // 3 2

// Damaged input is refused with a stable error code, never half-read.
try {
    fromBytes(bytes.slice(0, 40));
} catch (error) {
    console.log(error instanceof GraphFormatError ? error.code : error); // E_BAD_SERIALIZATION
}
