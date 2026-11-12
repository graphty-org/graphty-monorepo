# Owner feedback on the tier 3 decisions (2026-10-12)

Quoted from the owner, with the question each raises.

1. "'An empty field means "not set here"' -- since stacked layers override the ones below them, how does a user 'unset' a field to prevent it from overriding lower layers?"
   The design says a minus, shown only once a field is set, clears it. Make unsetting obvious, consistent and keyboard-reachable for every kind of field (number, color, select, binding, label entry), show at rest which fields this layer sets versus inherits, and say how the reader sees what they will get back (the value from the layers beneath) before and after unsetting.

2. "'it's a layer, a split parent' -- that's a new type of layer, right? are we just using that for communities? or are we using it for other things too? consistency in layers is going to mean consistency in user interaction and ease of use. we shouldn't add a 'split parent' layer unless it has a reusable purpose."
   Re-decide decision 1.7. Either show that split is one reusable mechanism every layer has (any categorical or binned value, data columns included, not only communities), with the parent behaving like any other layer, or replace it with a design that adds no new row type (for example per-category overrides inside an ordinary layer's binding, or splitting into ordinary layers with ordinary rules inside an ordinary folder, with scheme changes applied by editing several rows at once). Judge by consistency of interaction: every row a reader meets should behave like a layer or like a folder, nothing in between, unless the in-between type is reused widely.

3. "are we maintaining consistency with Figma? any patterns or components or insights we should pick up from its right-hand panel?"
   Run a Figma consistency pass over every decision and the panel structure, from Figma's documented right sidebar (help center) and the repository's capture of the Figma editor (design/ui/figma/, compact-mantine/design/figma-spec.md): what to adopt, adapt or reject, and why (for example Figma's "mixed" values, detach/bind chips for styles and variables, "+" and "-" on repeatable lists, the eye per entry, settings icon per row, section headers with actions, the selection colors section, the "apply variable" picker). Follow Figma where it solved the problem; graphty's model where it differs.
