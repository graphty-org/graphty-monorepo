# Reduced Motion

Some readers find moving pictures uncomfortable and ask their system for less motion. Set
`reducedMotion` and the graph stops moving on its own:

```html
<graphty-element id="graph" reduced-motion="auto"></graphty-element>

<script type="module">
    import "@graphty/graphty-element";

    const element = document.getElementById("graph");
    element.nodeData = [{ id: "a" }, { id: "b" }, { id: "c" }];
    element.edgeData = [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ];
</script>
```

## The setting

| Value             | What it does                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `false` (default) | Nothing changes: cameras glide and layouts move into place.                                                                   |
| `true`            | Motion is always reduced.                                                                                                     |
| `"auto"`          | Motion is reduced while the system asks for it (`prefers-reduced-motion`), and follows the system when the reader changes it. |

Set it as the `reduced-motion` attribute (`reduced-motion` alone or `"true"` is `true`,
`"auto"` is `"auto"`) or as the `reducedMotion` property:

```javascript
element.reducedMotion = true;
```

The default is `false`, so a page that never sets it behaves as before. Choose `"auto"` to follow
the reader's system setting.

## What reduced motion changes

- **Camera moves jump to their end.** Fitting the graph, a preset view, `setCameraState(state, {
animate: true })` and the glide to a picked node all land in one frame.
- **`autoRotate` holds still.**
- **A layout appears settled.** A force layout runs out of sight and is drawn once it has
  settled, instead of moving into place. A layout that never settles is still drawn now and then,
  in jumps.
- **A layout transition is skipped**: nodes are drawn in their new places at once.

It is a preference of the view: setting it records no undo step and is not saved in a project
file. Shader motion has its own setting, `shaderSettings.motion` (see [Shaders](./shaders.md)), and
a timeline play its own `motion` option (see [Timeline](./timeline.md)); both already follow the
system preference by default.
