# Sending and saving

A snapshot is made of typed arrays, so it moves between threads and to disk without being taken
apart. There are two forms:

- the **wire form** (`toWire()` and `fromWire()`), a plain object of typed arrays for
  `postMessage`, a Web Worker or IndexedDB;
- the **byte form** (`toBytes()` and `fromBytes()`), one `Uint8Array` for a file or the network.

<<< ../examples/wire.ts

## To and from a Web Worker

```ts
// main thread
const wire = snapshot.toWire({ transfer: true });
worker.postMessage(wire, wire.buffers);

// worker
import { fromWire } from "@graphty/graph-format";
self.onmessage = (event) => {
    const snapshot = fromWire(event.data);
};
```

With `transfer: true`, the buffers the snapshot owns alone are moved to the worker instead of
copied, and the ones it shares with another snapshot are copied. Without it nothing is moved and
the sender keeps a working snapshot.

## Checking what you read

`fromWire()` and `fromBytes()` check what they read before returning, and how much they check is
the `validate` option:

| Level         | Checks                                                             | Default for   |
| ------------- | ------------------------------------------------------------------ | ------------- |
| `"none"`      | nothing; only for data you made yourself in this process           |               |
| `"structure"` | that the sizes and offsets fit together                            | `fromWire()`  |
| `"full"`      | every rule a snapshot must follow (see [Invariants](./invariants)) | `fromBytes()` |

Bytes from a file or a server can be anything, so keep the `"full"` default for them. Input that
fails a check is refused with `E_BAD_SERIALIZATION` or `E_INVALID_SNAPSHOT`.

`fromByteChunks(chunks)` reads the byte form from a list of chunks, as a streamed download
delivers it, without first joining them into one array.

## A snapshot another package made

graph-io, graph-samples, algorithms and layout all return and accept the same `GraphSnapshot`, so
a snapshot from one passes straight to another. When a value's origin is unknown (a message, a
plugin), `isGraphSnapshot(value)` checks that it is a snapshot of a compatible version of this
format.

Three version numbers are involved: the npm package version; `FORMAT_VERSION`, the version of the
data model, which `isGraphSnapshot()` and the readers compare; and the version written in the byte
form, so that a newer reader can still read older bytes.
