# VR/AR

Guide to VR and AR immersive experiences.

## Overview

Graphty supports WebXR for immersive graph exploration. View your graphs in virtual reality (VR) or augmented reality (AR) using compatible headsets and browsers.

## Is VR or AR Available?

`element.session.capabilities.xr` says which immersive modes this device can enter, and why not
when it cannot. Read it; never probe `navigator.xr` yourself. The element asks the browser once,
after its first frame, and `capabilities:changed` fires when the answer arrives, when a headset is
plugged in or out, and when a session starts or ends.

```typescript
const { xr } = element.session.capabilities;
xr.vr; // true when VR can be entered
xr.ar; // true when AR can be entered
xr.reasons.vr; // null, or why not: "no-webxr" | "insecure-context" | "unsupported"
//                                   | "webgpu-renderer" | "disabled" | "probing"
xr.active; // "vr" | "ar" | null: the session presenting now
```

`"probing"` lasts until the browser answers, at most 1.5 seconds; a browser that does not answer
in time reads `"unsupported"`. `"disabled"` means `xr.enabled` (or `xr.vr.enabled` /
`xr.ar.enabled`) is `false`. XR is on by default and allocates nothing until a session is entered.

## A Mode Switcher

Enter a mode with the `view.immersive` command; `mode: null` leaves it. From 2D it switches to 3D
first, in the same undo step. A refused entry rejects, and is also reported as an `error` event
with `context: "xr"`.

```html
<select id="mode">
    <option value="3d">3D</option>
    <option value="vr">VR</option>
    <option value="ar">AR</option>
</select>
<graphty-element></graphty-element>

<script type="module">
    import "@graphty/graphty-element";

    const element = document.querySelector("graphty-element");
    const select = document.getElementById("mode");

    function render({ xr }) {
        for (const mode of ["vr", "ar"]) {
            const option = select.querySelector(`[value="${mode}"]`);
            option.disabled = !xr[mode];
            option.title = xr.reasons[mode] ?? "";
        }
        select.value = xr.active ?? "3d";
    }

    render(element.session.capabilities);
    element.session.on("capabilities:changed", ({ capabilities }) => render(capabilities));
    select.onchange = () => {
        const mode = select.value === "3d" ? null : select.value;
        element.session.execute({ op: "view.immersive", mode }).catch(() => {
            render(element.session.capabilities);
        });
    };
</script>
```

`element.setViewMode("vr")` does the same, and `graph.isVRSupported()` / `graph.isARSupported()`
read the same fact. The element can also draw its own VR / AR buttons on the canvas; they are off
unless you ask for them with `element.xr = { ui: { enabled: true } }`.

## XR Configuration

Each mode has its own reference space, the coordinate system the headset tracks the viewer in:

```typescript
element.xr = {
    enabled: true,
    vr: { referenceSpaceType: "bounded-floor" },
    ar: { referenceSpaceType: "local-floor" },
};
```

### Reference Space Options

| Value                   | Description                             |
| ----------------------- | --------------------------------------- |
| `local`                 | Small-scale, seated experience          |
| `local-floor` (default) | Standing experience with floor tracking |
| `bounded-floor`         | Room-scale with boundaries              |
| `unbounded`             | Large-scale, free movement              |

Not every headset offers every reference space. When the device refuses the configured one, the
element tries `local-floor`, then `local`, and uses the first one the device grants. If it refuses
all of them, the session runs in the `viewer` space, lowered to standing height. The
`xr-session-started` event says which one the session got (see "Event Handling in XR" below).

### Session Mode Options

| Value          | Description                      |
| -------------- | -------------------------------- |
| `immersive-vr` | Full VR headset experience       |
| `immersive-ar` | AR with environment pass-through |
| `inline`       | Non-immersive (in-page preview)  |

## Exiting XR

Return to normal 3D view:

```typescript
await graph.exitXR();

// Or set view mode explicitly
graph.setViewMode("3d");
```

## Browser Compatibility

### VR Support

| Browser          | Status             |
| ---------------- | ------------------ |
| Chrome (desktop) | ✅ Full support    |
| Chrome (Android) | ✅ Full support    |
| Edge             | ✅ Full support    |
| Firefox          | ⚠️ Partial support |
| Safari           | ❌ Not supported   |

### AR Support

| Browser          | Status                            |
| ---------------- | --------------------------------- |
| Chrome (Android) | ✅ Full support with ARCore       |
| Edge             | ⚠️ Limited support                |
| Safari (iOS)     | ❌ Not supported (use Quick Look) |

### Headsets

| Device                | VR  | AR  |
| --------------------- | --- | --- |
| Meta Quest 2/3        | ✅  | ✅  |
| HTC Vive              | ✅  | ❌  |
| Valve Index           | ✅  | ❌  |
| Windows Mixed Reality | ✅  | ⚠️  |
| Pico                  | ✅  | ✅  |

## Controller Interaction

In VR/AR mode, controllers can interact with the graph:

- **Point**: Highlight nodes
- **Trigger**: Select nodes
- **Grip**: Drag nodes (if enabled)
- **Thumbstick**: Navigate through the graph

Controller bindings depend on the specific headset and browser.

## Performance in XR

XR requires high frame rates (72-120 fps). Tips for smooth performance:

1. **Reduce node count**: Keep under 1000 nodes
2. **Simplify shapes**: Use spheres instead of complex shapes
3. **Limit labels**: Disable or reduce label rendering
4. **Pre-compute layouts**: Use fixed layouts instead of live physics

```typescript
// Optimize for XR
graph.setLayout("fixed");

// Simplify styles
await element.session.styles.add({
    name: "XR - simple nodes",
    target: "node",
    selector: { match: "everything" },
    set: { "node.shape": "sphere" },
});
```

A label is drawn because a layer wrote one. The way not to draw labels in XR is not to add that
layer -- or, when one is already in the stack, to take it out by its id.

## VR-Specific Styling

Adjust styles for VR visibility:

```typescript
// Larger nodes and high contrast, on top of whatever is already in the stack
await element.session.styles.add({
    name: "VR - readable at arm's length",
    target: "node",
    selector: { match: "everything" },
    set: { "node.size": 2, "node.color": "#00FF00" },
});

// Thicker lines, visible in VR
await element.session.styles.add({
    name: "VR - thicker edges",
    target: "edge",
    selector: { match: "everything" },
    set: { "edge.width": 1.5 },
});
```

A layer added later paints over the layers under it, which is what "on top" means here: there is
no priority number, only position in the stack.

## AR Considerations

For AR experiences:

1. **Scale**: Graph may need scaling to fit physical space
2. **Placement**: Consider how the graph anchors in real world
3. **Lighting**: AR lighting affects node visibility
4. **Occlusion**: Real objects can occlude the graph

::: warning Not yet published
Placing and scaling the graph in the room is not something the element publishes an API for. The
`graph.setScale()` and `graph.setPosition()` calls this page used to teach have never existed in
any version, and a reader who copied them got a `TypeError`. Recorded in
`design/element-api/capability-losses.md`.

What IS published for AR and VR today is the mode switch and the XR configuration: set
`element.viewMode` to `"ar"` or `"vr"`, and use `element.xrConfig` for the session options. The
reader's own headset places the scene.
:::

## Event Handling in XR

Two events report the session's life:

```typescript
element.addEventListener("xr-session-started", (event) => {
    const { mode, requestedReferenceSpace, referenceSpace } = event.detail;
    // mode: "vr" or "ar"
    // referenceSpace: the one the headset granted, which differs from
    // requestedReferenceSpace when the headset refused the configured one
});

element.addEventListener("xr-session-ended", (event) => {
    const { mode, cause } = event.detail;
    // cause: "exit" when the page left the session (setViewMode("3d")),
    // "device" when the headset or browser ended it (the system button, taking the headset off)
});
```

However the session ends, the graph goes back to its 3D view, and `setViewMode("vr")` or
`setViewMode("ar")` starts a new session.

While a session is running, `graph.getXRSessionManager()?.getReferenceSpaceType()` returns the
reference space it runs in.

## Testing Without Headset

Use browser developer tools:

1. **Chrome**: DevTools > More tools > Sensors > WebXR
2. **Firefox**: Install WebXR Emulator extension

Or use mobile AR without a headset:

```typescript
// Check mobile AR support
if (arSupported && /Android/.test(navigator.userAgent)) {
    // Mobile AR available
    button.textContent = "View in AR";
}
```

## Interactive Examples

- [XR Examples](https://graphty.app/storybook/graphty-element/?path=/story/xr--default)
