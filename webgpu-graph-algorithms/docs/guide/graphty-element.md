# With graphty-element

[graphty-element](../../graphty-element/) uses this package as an optional accelerator. You do not call it yourself:
install it, add one import, and the element runs its layouts and algorithms on the GPU when the machine has one.

```bash
npm install @graphty/graphty-element @graphty/webgpu-graph-algorithms
```

```javascript
import "@graphty/graphty-element";
import "@graphty/graphty-element/webgpu";
```

The element finds the device, checks it, attaches it, and recovers when the device is lost. Its `acceleration`
attribute (`auto`, `off` or `required`) says whether to use it, and
`element.session.capabilities.acceleration` says where the work ran and why.

See graphty-element's [Acceleration guide](../../graphty-element/guide/acceleration.md) for the policies, what is
accelerated today, and how to read where the work ran.

## With @graphty/algorithms and @graphty/layout

The CPU packages accept the object `createAccelerator(ctx)` (or `acquireAccelerator`) returns. Pass it, and the same
call runs on the GPU; pass nothing, and it runs on the CPU:

```ts
import { accelerated } from "@graphty/algorithms";
import { acquireAccelerator } from "@graphty/webgpu-graph-algorithms/acquire";

const gpu = acquireAccelerator();
const result = await gpu.current();
const ranks = await accelerated(result.ok ? result.accelerator : null).pageRank(snapshot);
```

`@graphty/layout`'s `createSimulation(type, options, accelerator)` takes the same object and runs the simulation on
the GPU when the accelerator implements it.
