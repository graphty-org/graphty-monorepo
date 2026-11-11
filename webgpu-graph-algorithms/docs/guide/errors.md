# Errors

Every condition the package detects is a `WebGpuGraphError` with a stable `code` and frozen `details`. Check for one
with `isWebGpuGraphError(error)` or `hasErrorCode(error, code)`; both work across two copies of the package.

<<< ../examples/errors.ts

## No silent fallback

The package never catches a GPU failure and finishes the work on the CPU. Deciding before any work runs that there is
no usable GPU, and then running a CPU implementation, is detection and is fine: that is what `acquireAccelerator`'s
declined result is for. Finishing a failed GPU run on the CPU would hide the failure, so the package does not do it.

## The codes

| Code                 | When                                                                                | What to do                                                  |
| -------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `E_NO_WEBGPU`        | the runtime has no WebGPU; in Node, the `webgpu` package is not installed           | install `webgpu`, or serve the page over https              |
| `E_NO_ADAPTER`       | WebGPU exists but no adapter answered                                               | check the GPU driver; in Node try `{ adapter: "llvmpipe" }` |
| `E_NO_DEVICE`        | the adapter refused a device, or lacks a required feature                           | drop the `requiredFeatures` it lacks                        |
| `E_SOFTWARE_ONLY`    | only a software adapter exists and software was rejected                            | accept software, or run on the CPU                          |
| `E_DEVICE_INCORRECT` | the device failed the self-check: it computes wrong answers                         | use another adapter, or run on the CPU                      |
| `E_DEVICE_LOST`      | the device was lost (driver reset, GPU removed); every simulation on it is disposed | open a new context and load again                           |
| `E_DISPOSED`         | the context, accelerator or simulation was already disposed                         | create a new one                                            |
| `E_VALIDATION`       | WebGPU rejected a command: a bug in the package or a device limit                   | report it                                                   |
| `E_SHADER_COMPILE`   | a shader failed to compile on this device                                           | report it, with the adapter                                 |
| `E_OUT_OF_MEMORY`    | the device ran out of memory; `details` has the requested and resident bytes        | release snapshots you no longer need                        |
| `E_TOO_LARGE`        | the graph exceeds a device limit; `details.path` says which                         | use a smaller graph or a larger device                      |
| `E_UNSUPPORTED`      | an option the GPU implementation does not support; `details.feature` names it       | drop the option, or run on the CPU                          |
| `E_INVALID_ARGUMENT` | an option or argument is out of range; `details.argument` names it                  | fix the argument                                            |
| `E_SNAPSHOT`         | the snapshot cannot be used, such as a directed snapshot given to a layout          | pass `toUndirected().snapshot`                              |
| `E_RELEASED`         | the snapshot was released while a simulation still used it                          | `load()` again                                              |
| `E_NOT_LOADED`       | a simulation was stepped before `load()`                                            | call `load()` first                                         |
| `E_ABORTED`          | the `signal` you passed was aborted                                                 | nothing: you asked for it                                   |

The graph-format codes `E_GPU_INELIGIBLE`, `E_UNKNOWN_NODE`, `E_UNKNOWN_COLUMN` and `E_COLUMN_LENGTH` pass through
unchanged (`PASSTHROUGH_FORMAT_CODES`).

## Graphs too large for the device

A graph the device cannot hold is refused before any GPU work, with `E_TOO_LARGE`:

- `path: "windowed"`: the edge arrays need more than one storage binding
- `path: "dispatch"`: the node count does not fit the device's dispatch grid
- `path: "positions"`: a layout's position buffer exceeds the device's largest buffer
