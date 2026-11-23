# Bringing Back a Cleared Selection

A reader who presses Escape or clicks empty canvas by mistake loses what they had selected. The
selection keeps what the last clear took away, so you can offer to bring it back.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { selection } = element.session;

element.session.on("selection:changed", () => {
    // Offer "Bring it back" while nothing is selected and something was before.
    const canRestore = selection.size === 0 && selection.previous() !== null;
    document.querySelector("#bring-back")!.toggleAttribute("hidden", !canRestore);
});

document.querySelector("#bring-back")!.addEventListener("click", () => {
    selection.restore({ cause: "user" });
});
```

- `previous()` returns the nodes and edges selected before the last change that left nothing
  selected: `clear()`, a click on empty canvas, or a selection of nothing. Selecting something new
  does not change it; the next clear does.
- It holds only elements still in the graph. Removing a node drops it (and its edges) from
  `previous()`; once none is left it returns `null`.
- `restore()` selects `previous()` in place of whatever is selected now. With nothing to bring back
  it changes nothing.
- Neither is an undo step: like every selection change, a restore is not in the history.
