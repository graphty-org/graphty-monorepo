# Figma as the paved path: principles, ontology, vocabulary and information architecture

This document reverse-engineers the design framework of the Figma design editor (the 2024
"UI3" editor, as it stood in September 2026) so that graphty can reuse what Figma has already
solved. graphty is a graph visualization and analysis app: graphty-element is the web component
that owns every graph capability (data, style layers, algorithms, layouts, selection, the tree
of analysis results, the project file), and the graphty app is the window chrome around it.

The owner's standing rule is that Figma is the paved path: where Figma has solved a problem,
graphty solves it the same way and should end up resembling Figma. Where graphty differs, it is
because graphs are different, and the difference is stated with its reason.

The document has five parts:

1. Figma's design principles, from its own writing and from the product's measured behaviour
2. Figma's ontology: every object type, its relationships and lifecycle, and how Figma keeps
   secondary objects out of the layers tree
3. Figma's vocabulary conventions
4. Figma's information architecture: every surface and the rule behind each placement
5. A verdict for graphty on each finding: transfers unchanged, transfers with adaptation, or
   does not transfer

Every claim cites where it came from. Two kinds of source are used:

- **Figma's public writing** (blog, help center, plugin API documentation), cited by URL.
- **The measured study of the Figma editor** in this repository, `design/ui/figma/`, captured
  from a live Figma session on 2026-09-24 and 2026-09-25. It is cited by path. Its top-level
  documents are `README.md`, `flows.md` and `components.md`; area folders such as
  `left-sidebar/README.md` hold the detail.

Where a principle below is inferred from behaviour rather than stated by Figma, it says so.

---

## 1. Design principles

### 1.1 What Figma says about itself

**Work is the centre of the screen, not the UI.** The UI3 write-up names the first goal as
"Center your ideas, not Figma's UI" and to "focus the canvas less on our UI and more on your
work" ([Inside the redesigned Figma](https://www.figma.com/blog/behind-our-redesign-ui3/)).
The companion post restates it as the north star: "keep designers in the flow by minimizing
distractions and placing their work center stage", and "The idea that work should be the center
of the canvas will remain true" (Ryhan Hassan, in
[Figma on Figma: our approach to designing UI3](https://www.figma.com/blog/our-approach-to-designing-ui3/)).

**Simplify the tool without shrinking what it can do.** "simplifying Figma, without simplifying
what you can do with Figma", and "Balance the needs of new users and professional designers"
([Inside the redesigned Figma](https://www.figma.com/blog/behind-our-redesign-ui3/)).

**Serve learners with optional help, not permanent help.** "We introduced optional labels to
guide new users and aid discoverability, while preserving speed and control for experts", and
"Turn on labels to quickly understand what each control does, or turn them off to focus on your
work" (same source). The migration guide repeats it: "Turn them on for additional clarity when
you're learning the new UI, then toggle them off when you're ready"
([Making the move to UI3](https://www.figma.com/blog/making-the-move-to-ui3-a-guide-to-figmas-next-chapter/)).
The switch lives in the zoom/view menu and in the main menu under View
([same source](https://www.figma.com/blog/making-the-move-to-ui3-a-guide-to-figmas-next-chapter/)).

**Speed is a feature, and it beat a prettier idea.** UI3 first shipped with floating panels and
then reverted them: "The nail in the coffin was learning that they slowed people down", and "We
want Figma to be fast. Speed is a feature." (KC Oh). The floating panels cramped the canvas on
small screens and moved rulers away from the work
([Figma on Figma](https://www.figma.com/blog/our-approach-to-designing-ui3/)).

**Usability over decoration.** "An interface for usability, not decoration": UI3 added
backgrounds on inputs, borders around dropdowns and rounded corners so controls read as
controls ([Inside the redesigned Figma](https://www.figma.com/blog/behind-our-redesign-ui3/)).

**Preserve muscle memory.** Designs were adapted to "preserve muscle memory for power users"
(same source). The bottom toolbar was justified as one that "standardizes that muscle memory
across all Figma products"
([Making the move to UI3](https://www.figma.com/blog/making-the-move-to-ui3-a-guide-to-figmas-next-chapter/)).

**The most specific controls for a selection come first.** "component controls like variants
and instances deserved top billing above attributes like color and size", and "All
layout-related options, including width, height, and Auto Layout, are now merged into a single
panel" ([Inside the redesigned Figma](https://www.figma.com/blog/behind-our-redesign-ui3/)).
Put another way: the inspector is ordered by what makes this object this kind of object, then
by generic attributes, and related controls live in one section rather than being split by
implementation.

**Everything is an object with properties.** "Every Figma document is a tree of objects,
similar to the HTML DOM", conceptually "a two-level map: `Map<ObjectID, Map<Property, Value>>`",
so "adding new features to Figma usually just means adding new properties to objects"
([How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)).
This is the architectural root of the object-first UI: a new feature is a new row in an existing
object's inspector, not a new place in the app.

**Undo must never surprise.** The guiding rule for undo: "if you undo a lot, copy something,
and redo back to the present (a common operation), the document should not change" (same
source). Undo is the product's safety net, so its behaviour is designed as carefully as any
feature.

**A published principle set.** A set of nine principles attributed to Figma is reproduced at
[principles.design](https://principles.design/examples/figma-design-principles): Powerful,
Precise, Systematic ("Leverage reusable blocks to build something new and more complex"),
Predictable ("Respect the system, building on users trust and prior experience"), Biased toward
simplicity ("Keep the simple things simple, and make the complex things possible"), Natural
mental models ("Solutions based on how humans think, rather than how computers work"),
Responsible, Detail-oriented and Respectful ("Guard users from unnecessary interruptions through
research and testing"). Caveat: that page names a Figma Community file as its source, and the
file (figma.com/community/file/817913152610525667) could not be retrieved, so treat this set as
attributed rather than confirmed.

### 1.2 Principles the product enforces (inferred from measured behaviour)

These are not written down by Figma; they are what the editor consistently does, measured in
`design/ui/figma/`. Each is stated as a rule with its evidence.

| Rule                                                                                                                                                                                                                                                      | Evidence                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Selection drives the inspector.** The right panel has two identities only: the selected thing, or the page when nothing is selected                                                                                                                     | `design/ui/figma/header-and-modes/README.md` section 5 (nothing selected shows Page, Styles, Export); `right-sidebar-selection/README.md` section 4 (a selection type row per kind); `tmp/ux-review/graphty-vs-figma-ux.md` "Selection-driven UI" |
| **The inspector's section order is fixed.** Type row, Position, Layout, Appearance, Typography, Fill, Stroke, Effects, Selection colors, Layout guide, Export; sections that do not apply are absent, not disabled                                        | `right-sidebar-selection/README.md` section 24; `canvas-selection/README.md` section 14                                                                                                                                                           |
| **An empty section is one title row with a "+".** Clicking "+" (or the empty title) adds a sensible default at once, with no dialog; undo reverses it                                                                                                     | `right-sidebar-selection/README.md` section 5; `flows.md` section 6 "Add and remove"                                                                                                                                                              |
| **Add first, configure after.** New items appear immediately with defaults and at the TOP of their list; settings open afterwards in a popover                                                                                                            | `flows.md` section 6                                                                                                                                                                                                                              |
| **Undo is the safety net, and it is silent.** Undo and redo give no feedback of their own; the canvas, panel values and selection revert. Deletes need no confirmation (the one confirm seen is deleting a comment thread, which is someone else's words) | `flows.md` section 3; `header-and-modes/README.md` section 9                                                                                                                                                                                      |
| **One overlay at a time.** Opening a menu, popover or picker closes whatever was open; Escape closes only the top-most thing                                                                                                                              | `flows.md` section 1 rule 2                                                                                                                                                                                                                       |
| **Almost nothing animates.** Menus, popovers, tooltips, tabs open and close in one frame                                                                                                                                                                  | `flows.md` section 1 rule 1 and section 10                                                                                                                                                                                                        |
| **Edits commit on Enter, Tab or blur, never while typing**, and bad input silently reverts                                                                                                                                                                | `flows.md` section 1 rule 6 and section 6                                                                                                                                                                                                         |
| **Keyboard focus lives on the canvas.** Almost every commit or Escape returns focus to a hidden canvas focus target that announces "N items selected"                                                                                                     | `flows.md` section 1 rule 5 and section 8                                                                                                                                                                                                         |
| **Blue means selected; one filled primary button.** At rest the only filled accent button is Share; elsewhere the accent marks selection, focus and open state                                                                                            | `tmp/ux-review/graphty-vs-figma-ux.md` "Visual hierarchy"; `header-and-modes/README.md` section 1                                                                                                                                                 |
| **Kind is shown by colour, consistently.** Components and instances are purple everywhere (canvas outline, handles, size badge, layer row text); Dev Mode is green (Share button, selected tool, mode icon)                                               | `canvas-selection/README.md` section 10; `left-sidebar/README.md` section 4 "Row states"; `bottom-toolbar/README.md` section 10                                                                                                                   |
| **Hover is instant, help is slow.** Hover fills change in one frame; tooltips wait 1000 ms (rail 500 ms) and carry the name plus the shortcut                                                                                                             | `flows.md` sections 1 and 10; `left-sidebar/README.md` section 1                                                                                                                                                                                  |
| **The canvas and the tree are one thing seen twice.** Hovering a layer row outlines the object on the canvas and the reverse; selecting on the canvas expands and scrolls the tree to the row                                                             | `canvas-selection/README.md` section 14; `flows.md` section 2                                                                                                                                                                                     |
| **Words on screen are the user's content.** At rest the right panel holds about 25 words; most visible words are layer names and values, not the app explaining itself                                                                                    | `tmp/ux-review/graphty-vs-figma-ux.md` "What the words are"                                                                                                                                                                                       |
| **One home per capability; other entries are shortcuts to it.** Each function has one place in the panels; the context menu, the main menu and Actions (Ctrl+K) are routes to the same commands, not second implementations                               | `tmp/ux-review/graphty-vs-figma-ux.md` "How many homes a feature has"; `popovers-and-menus/README.md` section 2 "Menu inventory"                                                                                                                  |
| **Creation is the only task-first place, and it is tiny.** Tools create; once the object exists the tool snaps back to Move and everything else is done by selecting and editing                                                                          | `tmp/ux-review/graphty-vs-figma-ux.md` "Follow-up: how Figma handles tasks"; `bottom-toolbar/README.md` section 9 ("Selecting objects does not change the toolbar at all")                                                                        |
| **Panels hold their width; the canvas gives way.** At narrow windows both side panels stay 241 px, only the canvas shrinks; the toolbar stays centred on the window and overlaps panels rather than reflowing                                             | `header-and-modes/README.md` section 2                                                                                                                                                                                                            |
| **The app never acts unasked.** Opening a file shows the file; nothing is computed, suggested or switched on the reader's behalf. The exception is promotional cards, which are marketing, not design                                                     | `tmp/ux-review/graphty-vs-figma-ux.md` "Right after opening a file"; promo cards in `header-and-modes/README.md` sections 5 and 6                                                                                                                 |

### 1.3 Where Figma falls short of its own principles

A paved path is not a perfect one. The study measured these weaknesses, and graphty should not
copy them:

- The layers tree has no ARIA roles and no keyboard model of its own; context menus are
  reachable only by right-click; tooltips are hidden from assistive technology; the shortcuts
  panel ignores Escape (`flows.md` section 9).
- A second Escape after closing an overlay deselects, so Escape is "not harmless"
  (`flows.md` section 1 rule 2).
- Mouse-down (not click) activates tabs, "+" buttons and layer toggles, so a press-and-drag-away
  still fires them (`flows.md` section 1 rule 3). This enables drag-to-toggle many eyes, which is
  worth keeping, but it is surprising on "+" buttons.
- The rail is not uniform: Variables replaces the whole editor with a table instead of opening a
  side panel, and the Agents panel is wider (280 px) than the others (240 px)
  (`left-sidebar/README.md` sections 1 and 7).
- Some words carry two meanings: "Layout" is a section and "Layout guide" another; "Actions" is
  both the Ctrl+K palette and a prototype interaction's "Action" field
  (`right-sidebar-selection/README.md` section 24; `header-and-modes/README.md` section 6).
- Dev Mode is a persona-specific mode (for developers), with its own panel width, colour and
  tools (`header-and-modes/README.md` section 7).

---

## 2. Ontology

### 2.1 The object types

Figma's objects fall into seven families. The table lists each type, where it lives in the
containment hierarchy, and where the reader meets it in the UI. "Tree" means the Layers section
of the left panel.

**Containers of the workspace (outside the editor)**

| Object                                               | Contains                                                           | Lives in                                                | Source                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Organization, team                                   | folders, files                                                     | the file browser                                        | [Guide to the file browser](https://help.figma.com/hc/en-us/articles/14381406380183-Guide-to-the-file-browser) |
| Folder (formerly "project"; renamed from 2026-08-03) | files                                                              | the file browser                                        | same source                                                                                                    |
| Drafts                                               | files not yet in a folder                                          | the file browser; the "Drafts" link under the file name | same source; `left-sidebar/README.md` section 2                                                                |
| File                                                 | pages; also owns styles, variables, components, comments, versions | one browser tab; its name heads the left panel          | `left-sidebar/README.md` section 2                                                                             |

**Scene objects (the tree)**. The plugin API says "the Node is the basis for representing
layers"; `BaseNode` covers `DocumentNode`, `PageNode` and `SceneNode`, and a `SceneNode` is
anything inside a page ([Plugin API: node types](https://developers.figma.com/docs/plugins/api/nodes/)).

| Object                                                 | Rule                                                                                                                                                                                                     | Tree                                               | Source                                                                                                                                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                                                   | "Each page has its own canvas"; a file has as many as you need                                                                                                                                           | the Pages list above the tree, not the tree itself | [Explore the navigation bar and left sidebar](https://help.figma.com/hc/en-us/articles/360039831974-View-layers-and-pages-in-the-left-sidebar); `left-sidebar/README.md` section 3 |
| Section                                                | "a top-level element on the canvas by default"; "can contain all layer types, including other sections, but cannot be contained within frames or groups"; has a title, fill and a "Ready for dev" status | yes                                                | [Organize your canvas with sections](https://help.figma.com/hc/en-us/articles/9771500257687-Organize-your-canvas-with-sections)                                                    |
| Frame                                                  | "a layer whose size is explicitly set by you"; carries layout (auto layout, constraints), fills, clipping; top-level frames are the "screens"                                                            | yes, bold when top-level                           | [The difference between frames and groups](https://help.figma.com/hc/en-us/articles/360039832054-The-difference-between-frames-and-groups); `left-sidebar/README.md` section 4     |
| Group                                                  | "groups take on the combined dimensions of their children"; "As the layers within a group are moved around, the bounds of the group will adjust"; no fills of its own                                    | yes                                                | same source                                                                                                                                                                        |
| Shape, text, image, vector, boolean group, slice, slot | leaf layers (a boolean group has operand children)                                                                                                                                                       | yes, each with a type icon                         | `left-sidebar/README.md` section 4 "Layer type icons"                                                                                                                              |

**Definition and reuse objects**

| Object                                     | Rule                                                                                                                                             | Where it appears                                                                                                                                                       | Source                                                                                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Component (main component)                 | "Defines the properties of the component"; it is itself a layer on the canvas                                                                    | tree (purple) and Assets panel                                                                                                                                         | [Guide to components](https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma); `canvas-selection/README.md` section 10                                                                                         |
| Instance                                   | "A copy of the component you can reuse in your designs. Instances are linked to the main component and receive any updates"; can be detached     | tree (purple); inspector leads with the component name and its properties                                                                                              | same; `right-sidebar-selection/README.md` section 4                                                                                                                                                                                        |
| Component set and variants                 | variants of one component held in one container, chosen by variant properties                                                                    | tree; inspector "Properties"                                                                                                                                           | same; `right-sidebar-selection/README.md` section 4                                                                                                                                                                                        |
| Component property                         | variant, text, boolean, instance swap, slot                                                                                                      | inspector of the main component and of each instance                                                                                                                   | `right-sidebar-selection/README.md` "Components and states the first pass did not reach" section 4                                                                                                                                         |
| Library                                    | a published file whose components, styles and variables other files use                                                                          | Assets panel; Manage libraries dialog                                                                                                                                  | `left-sidebar/README.md` sections 6 and 5 of the follow-up                                                                                                                                                                                 |
| Style (colour, text, effect, layout guide) | a named bundle of values; "Styles are built to hold a combination of values, where all values get expressed all at once"                         | NOT in the tree. Listed in the inspector's Styles section when nothing is selected; applied from a property row, which then shows the style name instead of raw values | [The difference between variables and styles](https://help.figma.com/hc/en-us/articles/15871097384471-The-difference-between-variables-and-styles); `header-and-modes/README.md` section 5; `right-sidebar-selection/README.md` section 15 |
| Variable                                   | "a single design token that defines values for each of the modes in its VariableCollection"; bound to node properties; not part of the node tree | NOT in the tree. A full-screen Variables view from the rail; bound from a property row's "Apply variable" icon                                                         | [Plugin API: Variable](https://developers.figma.com/docs/plugins/api/Variable/); `left-sidebar/README.md` section 7 and follow-up section 6                                                                                                |
| Collection and mode                        | a collection is a set of variables; a mode is one column of values ("light", "dark"); a variable expresses one mode at a time                    | Variables view; "Apply variable mode" on the page or a frame                                                                                                           | [Guide to variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma); `header-and-modes/README.md` section 5                                                                                          |

**Behaviour objects**

| Object                 | Rule                                                                                                                                              | Where it appears                                                                                                                         | Source                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Interaction (reaction) | "A prototyping Reaction ... contains a list of Action objects ("what happens?") and a Trigger ("how do you make it happen?")"; stored on the node | NOT in the tree. The inspector's Prototype tab for the selected layer; a curved connector on the canvas, drawn only in the Prototype tab | [Plugin API: Reaction](https://developers.figma.com/docs/plugins/api/Reaction/); `header-and-modes/README.md` section 6 |
| Flow                   | a named starting point on a top-level frame; auto-created as "Flow 1" by the first connection                                                     | Prototype tab (nothing selected lists flows); a small tab on the frame's corner on the canvas                                            | `header-and-modes/README.md` section 6                                                                                  |

**Commentary objects**

| Object         | Rule                                                                                                                                                                                                                                                      | Where it appears                                                                                                                                      | Source                                                                                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comment thread | "Figma will attach your comment to frames when you pin a comment or select a region inside a top-level frame, component, or group. If those frames are moved around the canvas, their comments move with them." Only top-level containers anchor comments | NOT in the tree. Pins on the canvas, clustered when zoomed out; a Comments panel that replaces the inspector in Comment mode (C); hidden with Shift+C | [Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files); [Guide to comments](https://help.figma.com/hc/en-us/articles/360039825314-Guide-to-comments-in-Figma); `header-and-modes/README.md` section 9 |
| Annotation     | "notes and pin[ned] properties" stored in a node's `annotations` property; a label, optional markdown and optional pinned properties; created with the Annotation tool in Dev Mode                                                                        | NOT in the tree. Drawn on the canvas attached to the layer; "any property or measurement will change as designs change"                               | [Plugin API: Annotation](https://developers.figma.com/docs/plugins/api/Annotation/); [Add measurements and annotate designs](https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs)                         |

**Time objects**

| Object       | Rule                                                                                                             | Where it appears                                                                                                                                                                                      | Source                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Undo history | per user in multiplayer; redo back to the present must not change the document; what it covers is in section 2.8 | Ctrl+Z only; no visible list                                                                                                                                                                          | [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/); `flows.md` section 3                    |
| Version      | autosave checkpoints (grouped) plus named versions with a title and description; restorable                      | Opened from the File menu (Show version history); the list then replaces the inspector in the right sidebar and the canvas shows the chosen version as a read-only snapshot you can pan and copy from | [View a file's version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history); `left-sidebar/README.md` section 2 |
| Branch       | a copy of the file to merge back                                                                                 | File menu > Create branch                                                                                                                                                                             | `left-sidebar/README.md` section 2                                                                                                                       |

**Output and presence objects**

| Object                                  | Where it appears                                                       | Source                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Export setting (scale, format, suffix)  | a property of a layer or the page: the Export section of the inspector | `header-and-modes/README.md` section 5; `right-sidebar-selection/README.md` "Export section" |
| Prototype view (Present, Preview)       | opens in a new tab                                                     | `header-and-modes/README.md` section 3                                                       |
| Collaborator, cursor, follow, spotlight | avatars in the header; cursors on the canvas                           | `header-and-modes/README.md` sections 3 and 10                                               |

### 2.2 Relationships

Figma uses only a handful of relationship kinds, and each has one visual form:

| Relationship                        | Meaning                                                                 | How it is shown                                                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contains (parent, child)            | a single-parent tree; tree order is paint order                         | indentation in the tree; Enter selects children, Shift+Enter the parent (`flows.md` section 3)                                                                            |
| Instance of                         | an instance follows its main component                                  | purple colour; "Go to main component" row; the component name as the inspector title (`right-sidebar-selection/README.md` section 4)                                      |
| Bound to (a style or variable)      | a property takes its value from a shared definition                     | the property row shows the definition's name instead of a raw value; "detach" returns it to a value (`right-sidebar-selection/README.md` section 15; follow-up section 5) |
| Reacts to (an interaction)          | a layer navigates to a frame                                            | a connector on the canvas, only in the Prototype tab                                                                                                                      |
| Pinned to (a comment)               | a comment moves with its top-level frame, or stays at a canvas position | a pin, only while comments are shown; section 2.7 covers what happens when the frame goes away                                                                            |
| Member of (a collection or library) | a variable belongs to a collection; an asset to a library               | the Variables view's left list; the Assets panel's breadcrumb                                                                                                             |

Only containment is drawn in the tree. Every other relationship is drawn as a property row in
the inspector, as a colour, or as a canvas overlay that appears in one mode. Every row above is
drawn from the user's side (the instance names its component, the property names its style).
The reverse direction, from a definition to everything that uses it, is covered in section 2.6.

### 2.3 Lifecycles

| Step                    | How Figma does it                                                                                                                                    | Source                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Create a scene object   | pick a tool, draw; the tool snaps back to Move; the object gets an automatic name ("Frame 1", "Rectangle 2")                                         | `tmp/ux-review/graphty-vs-figma-ux.md` follow-up; `interaction-flows/README.md` section 3                            |
| Create from a selection | a command on the selection: Group selection (Ctrl+G), Frame selection, Wrap in new section, Create component (Ctrl+Alt+K), Add auto layout (Shift+A) | `flows.md` section 3; `popovers-and-menus/README.md` section 2                                                       |
| Create a property item  | "+" on a section adds a default at the top; settings open next                                                                                       | `flows.md` section 6                                                                                                 |
| Name                    | automatic on creation; rename in place with a double-click or Ctrl+R; Enter commits                                                                  | `flows.md` section 6 "Rename"                                                                                        |
| Change                  | edit a property row; many selected objects edit together, differing values show "Mixed"                                                              | `flows.md` section 2; `right-sidebar-selection/README.md` sections 6 and 18                                          |
| Hide, lock              | eye and lock toggles on the row; hidden rows dim, locked rows cannot be selected on the canvas                                                       | `flows.md` section 7                                                                                                 |
| Detach                  | an instance or a bound property can be detached back to plain values                                                                                 | `right-sidebar-selection/README.md` section 4 and follow-up section 5                                                |
| Delete                  | Delete key or row "-"; no confirmation; undo restores                                                                                                | `flows.md` section 6                                                                                                 |
| Record                  | autosaved versions; named versions on request                                                                                                        | [View a file's version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history) |

### 2.4 Primary versus secondary, and how Figma keeps them apart

**Primary objects** are the things the user points at on the canvas: sections, frames, groups
and layers. They have a body on the canvas, a row in the tree, a selection box, and an
inspector.

**Secondary objects** are everything that describes, reuses, connects, annotates or records the
primary objects: styles, variables, collections, modes, interactions, flows, comments,
annotations, versions and export settings.

Figma keeps the secondary objects out of the tree with six consistent rules:

1. **The tree holds only things with a body on the canvas.** The test is "can you draw a
   selection box around it?" A main component passes the test and is therefore a layer (marked
   purple); a style, a variable or a comment fails it and never appears as a row.
2. **Shared definitions live in their own place and are applied from a property row.** Styles
   are listed in the inspector when nothing is selected and applied from the Fill or Text row;
   variables have a full-screen view and are applied from the "Apply variable" icon on any
   bindable row; library components are in the Assets panel and inserted onto the canvas.
3. **Behaviour is a property of the object, shown in a second inspector tab.** Interactions are
   stored on the node (the `reactions` property) and edited in the Prototype tab of the same
   selection; their canvas connectors appear only in that tab.
4. **Commentary is a mode with its own panel.** Comments have their own tool (C), their own
   panel (which replaces the inspector) and pins on the canvas that can be hidden (Shift+C).
   Annotations are stored on the node and drawn next to it. Neither is a row.
5. **History is off the working screen until asked for.** Versions and branches are opened from
   the File menu; the version list then borrows the right sidebar while it is open. Undo has no
   visible list at all.
6. **Output is a property.** Export settings are the last section of the inspector for a layer
   or the page, not a separate place.

The result: the tree answers one question ("what is on this page?"), the inspector answers one
question ("what is this and how do I change it?"), and secondary objects are reached through the
primary object they belong to.

### 2.5 Where lists of secondary definitions appear, and whether any list is ordered

**Which Figma lists show styles and variables as rows.**

| Surface                                                                      | What it lists as rows                                                                                 | Styles or variables?                                                                    | Source                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layers tree (left panel)                                                     | scene objects only                                                                                    | never                                                                                   | section 2.4 rule 1                                                                                                                                                                                                                                                  |
| Assets panel (rail button, left panel)                                       | libraries as cards ("72 components"), then components as a tile grid; its search covers all libraries | no. In the measured editor the Assets panel is components only                          | `left-sidebar/README.md` section 6                                                                                                                                                                                                                                  |
| Inspector, nothing selected, Design tab                                      | the Page section, then a "Styles" section listing the file's local styles, then Export                | yes, local styles, as rows with a "+" (Create style: Text, Color, Effect, Layout guide) | [right sidebar help](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar) ("styles and variables that are local to the file" when nothing is selected); `header-and-modes/README.md` section 5 |
| Inspector, nothing selected, Prototype tab                                   | the file's flows, each row with hover actions (select frame, copy flow link, preview)                 | no; flows are the Prototype tab's named starting points                                 | `header-and-modes/README.md` section 6                                                                                                                                                                                                                              |
| Variables view (rail button, full screen, can minimise to a floating window) | collections on the left, a table of variables by mode                                                 | yes, variables, and only here                                                           | `left-sidebar/README.md` section 7                                                                                                                                                                                                                                  |
| Style and variable pickers (popovers from a property row)                    | styles and variables that can be bound to that row                                                    | yes, as choices, not as a managed list                                                  | `right-sidebar-selection/README.md` follow-up sections 5 and 6                                                                                                                                                                                                      |
| Manage libraries dialog                                                      | libraries, and at the foot the missing libraries with counts of missing assets                        | as counts per library                                                                   | [Swap libraries](https://help.figma.com/hc/en-us/articles/4404856784663-Swap-style-and-component-libraries); `left-sidebar/README.md` section 6                                                                                                                     |

So Figma gives reusable definitions a rail button and a left-panel list in three cases:
things you **insert onto the canvas** (components, in Assets), a **large catalogue of things you
run** (plugins, widgets and AI tools, in the Tools panel, section 4.10), and a collection whose
shape is a **table too wide for a panel** (variables, full screen). Styles, which are applied rather than
inserted, have no rail button and no left-panel list: they are rows in the nothing-selected
inspector and choices in a picker. Flows, the nearest thing Figma has to a saved view, are rows in
the nothing-selected Prototype inspector. Comments are a mode with a panel that replaces the
inspector (section 2.4 rule 4). Versions borrow the right sidebar on request (section 2.1).

**Ordered lists of rules.** Figma has ordered lists, and they are all drawn the same way: rows
top to bottom, the top row wins or paints in front, each row with an eye and (for fills and
exports) a drag grabber. But every ordered list Figma has is scoped to one object:

- the layers tree, whose order is paint order within a parent (`left-sidebar/README.md` section 4)
- the fill, stroke and effect lists of one layer, newest on top (`flows.md` section 6)
- the export rows of one layer or page (`header-and-modes/README.md` section 5, "drag grabber")
- the interactions of one layer (`header-and-modes/README.md` section 6)

There is **no Figma surface that shows an ordered list of rules applying across many objects**.
Styles are unordered (a layer binds at most one style per property, so styles never compete);
variable modes resolve by nesting (a frame's mode overrides the page's), and that precedence is
never drawn as a list. A global ordered style stack is therefore not on the paved path. Figma
supplies its row shape (the fill list) and, by the rule above, its likely home (the
nothing-selected inspector, where local styles live), but the stack itself is a departure that
graphty must state and justify.

### 2.6 Reverse relationships: from a shared definition to the things that use it

Figma shows the forward direction (this instance uses that component; this fill uses that style)
as a named row on the user of the definition. The reverse direction appears in five places:

| Pattern                                                                                             | What it produces                                                                                                                                                                                                           | Where it appears                                                                                                                                   | Source                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Go to main component**                                                                            | navigates from an instance to its definition (selects the main component; for a library component, "Go to main component in library" opens the library file). Shortcut Ctrl+Alt+Shift+K                                    | a 224 x 24 secondary-text row directly under the instance's type row in the inspector; the context menu; the context menu of an Assets tile        | [Make changes to components and instances](https://help.figma.com/hc/en-us/articles/360038665934); `right-sidebar-selection/README.md` section 4; `left-sidebar/README.md` section 6                                                      |
| **Select matching layers**                                                                          | a selection of layers identical to the selected one, across frames (not within one frame). Ctrl+Alt+A                                                                                                                      | a 24 px icon on the inspector's type row                                                                                                           | [Select layers and objects](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects); `right-sidebar-selection/README.md` section 4                                                                               |
| **Edit > Select all with same** (properties, fill, stroke, effect, text properties, font, instance) | a selection of every layer in the file sharing that attribute with the current selection                                                                                                                                   | the Edit menu only                                                                                                                                 | same help article                                                                                                                                                                                                                         |
| **Selection colors**                                                                                | lists each distinct colour in a mixed selection once, grouped as variables, styles and plain fills; each row can be edited (changing every layer using it) and has a target icon that selects all layers using that colour | an inspector section, present only when the selection has mixed fills; collapsed it shows three swatches and "+N"                                  | [View and adjust colors in a mixed selection](https://help.figma.com/hc/en-us/articles/360042553434-View-and-adjust-colors-in-a-mixed-selection); `right-sidebar-selection/README.md` section 22; `interaction-flows/README.md` section 6 |
| **Usage counts**                                                                                    | instances, inserts and detaches per component, style and variable over 30 days; teams and files using it                                                                                                                   | NOT in the editor. Library analytics, opened from the file menu of a library file or from the file browser; Organization and Enterprise plans only | [View and explore library analytics](https://help.figma.com/hc/en-us/articles/360039238353-View-and-explore-library-analytics)                                                                                                            |

Three observations settle the pattern:

1. **Reverse relationships produce a selection, never a list of users.** Every in-editor reverse
   route ends with the users selected on the canvas (and therefore listed in the tree and edited
   together in the inspector). No Figma panel lists "the 14 layers using brand/primary".
2. **A style has no reverse route of its own.** The local styles list (nothing-selected
   inspector) offers no "select users" command in the measured editor, and the help's selection
   article lists none. The route to "everything using this style" is indirect: select a wide
   scope, then use the style's target icon in Selection colors (an inference from the two help
   articles above, not a documented recipe). The plugin API does know the users
   (`getStyleConsumersAsync()` on a style, `getInstancesAsync()` on a component:
   [BaseStyle](https://developers.figma.com/docs/plugins/api/BaseStyle/),
   [ComponentNode](https://developers.figma.com/docs/plugins/api/ComponentNode/)), so the gap
   is a UI choice, not a data limit.
3. **Counts of users are an administrator's metric, outside the editor.** The editor shows
   counts of definitions ("72 components") but never counts of uses.

**Selection colors is the closest precedent for a many-to-many "belongs to" row.** It is a list,
in the inspector of the current selection, of shared things the selection uses; one row per
shared thing; each row with a select-everything-using-this icon. That is the shape of a node
inspector's membership rows in graphty (one row per set the node is in, each with a way to
select the set's members), and of the "Go to main component" row when the node is in one set.

### 2.7 References whose definition is gone, and what comments anchor to

**Missing definitions are kept, not silently removed, but repair is weak.**

| Case                                                       | What Figma does                                                                                                                                                                                                                                                                                                                       | Source                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A library is unpublished, deprecated or moved out of reach | styles and instances stay in the file, disconnected, rendering their last state and no longer updating. The Manage libraries dialog lists "missing libraries" at its foot, grouped by origin library with a count of missing assets. Repair is Swap library, which matches assets by name only; you cannot pick a replacement by hand | [Swap libraries](https://help.figma.com/hc/en-us/articles/4404856784663-Swap-style-and-component-libraries)        |
| A variable collection is deleted                           | its variables are deleted; "Any properties that were using the variables will no longer be connected to the variable and any existing modes"; they "can only be restored by immediately undo-ing the action or by restoring an earlier version of the file"                                                                           | [Create and manage variables](https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables) |
| An instance is detached                                    | it becomes a plain frame; the node keeps a record of what it was detached from (`detachedInfo`)                                                                                                                                                                                                                                       | [ComponentNode](https://developers.figma.com/docs/plugins/api/ComponentNode/)                                      |

**Editing a property whose value comes from a style or variable.** A bound row is not an
editable value, so there is no edit that could silently mean either "change it for everyone" or
"change it here". The measured editor offers two separate, named routes:

| Route                                                                                                                 | What it changes                                                                                                     | What the row shows afterwards                                                     | Source                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Click the bound row (or its swatch)                                                                                   | nothing yet: it reopens the style and variable picker, with the current style's row carrying an "Edit style" button | unchanged                                                                         | `right-sidebar-selection/README.md` follow-up section 5b; capture `fill-style-row-click-edit-style`                            |
| "Edit style" (in the picker, or right-click a style in the nothing-selected Styles list, or its adjust icon on hover) | the definition: "Any changes you make to the style here will update any objects in the file that use this style"    | the style's name, now showing the new value everywhere                            | [Manage and share styles](https://help.figma.com/hc/en-us/articles/360039820134)                                               |
| "Detach style" or "Detach variable" (a 24 px icon that appears on hovering the bound row)                             | this layer only: the link is cut and the resolved value is written to the layer                                     | a plain hex and opacity field (or a plain number), as if the value had been typed | `right-sidebar-selection/README.md` follow-up sections 5a, 5b and 6a; captures `fill-style-detached`, `fill-variable-detached` |

Typing into the plain hex field of an unbound row offers the matching styles and variables as
autocomplete, so the route back from a local value to a shared one is also on the row
(`right-sidebar-selection/README.md` follow-up section 5b).

**What remains after the definition is deleted.** Figma treats the two reuse objects
differently, and the difference is the useful part:

| Deleted                                      | What the dependents show                                                                                                                                                                                                                                                                                                                               | Can it come back?                                                                            | Source                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A local style                                | "Any objects using that style will keep their properties, but are detached from the style." The row therefore shows the raw value with no mark that a style was ever there                                                                                                                                                                             | only by undo or version history; nothing on the layer offers a restore                       | [Manage and share styles](https://help.figma.com/hc/en-us/articles/360039820134)                                                     |
| A variable collection (and so its variables) | "Any properties that were using the variables will no longer be connected to the variable and any existing modes"                                                                                                                                                                                                                                      | "only ... by immediately undo-ing the action or by restoring an earlier version of the file" | [Create and manage variables](https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables)                   |
| A single variable                            | not stated by the help; not measured                                                                                                                                                                                                                                                                                                                   | --                                                                                           | --                                                                                                                                   |
| A local main component                       | "Deleting a main component does not remove instances of that component from your files." The instance keeps its link: selecting it shows **Restore Component** in the right sidebar (in the file that held the component; elsewhere "Go to main component in library" leads to a restore button), and its context menu offers "Restore main component" | yes, from any surviving instance                                                             | [Create components to reuse in designs](https://help.figma.com/hc/en-us/articles/360038663154-Create-components-to-reuse-in-designs) |

So Figma has two policies. For a **value definition** (style, variable) the dependent keeps the
value and loses the link, silently. For an **object definition** (component) the dependent keeps
both its look and a dangling link, says so on its own inspector, and can rebuild the definition.
In neither case is a dependent deleted with its definition.

**Comments anchor to a frame or to a point.** "Comments can be pinned to a specific frame or
layer, or specific co-ordinates on the canvas"
([Move or edit comments](https://help.figma.com/hc/en-us/articles/360041547853-Move-or-edit-comments)).
In practice only top-level frames, components and groups take an anchor: "Comments won't attach
to any nested frames, components, groups, or other layers"
([Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files)).
An anchored comment moves with its frame, and Move to page carries it along. Cut and paste
"disconnects the comment from that layer"; the comment stays in the Comments panel at its old
canvas position. Users report that deleting or moving a frame leaves "unattached" comments that
cannot be reattached; the request to reattach them has no staff answer
([forum thread, 2021](https://forum.figma.com/suggest-a-feature-11/make-it-possible-to-reattach-unattached-comments-33090)).

The rule Figma follows: **a reference outlives its target**. The dependent thing is kept,
keeps its last value or position, and is never deleted with its target. Whether the broken link
is still visible depends on the kind: an instance says so and offers Restore Component; a missing
library is reported at the file level with counts; a layer whose local style was deleted shows
nothing at all. Figma's weakness is the repair: missing library assets cannot be re-pointed by
hand, a detached style leaves no trace to repair from, and orphaned comments cannot be
re-anchored.

### 2.8 What undo covers

| Action                                                                  | In Figma's undo?                                                                                                                                                                                                                                                                                           | Source                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document edits (create, change, delete, rename, group, reorder)         | yes, per user; other people's edits are never undone                                                                                                                                                                                                                                                       | [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/); `interaction-flows/README.md` section 9                               |
| Hide and lock                                                           | yes, by inference: visibility and lock are properties of the node in the document (the plugin API's `visible` and `locked`), so they are document edits. The study measured that they give no toast, not their undo                                                                                        | [Plugin API: node types](https://developers.figma.com/docs/plugins/api/nodes/); `flows.md` section 3                                                                                   |
| Selection                                                               | the selection is restored with each undo step ("The selection is restored to what it was at that step"). Users also report that selection changes are themselves steps ("it goes the whole way back though all the selections and edits") and asked, without a staff answer, for an option to exclude them | `interaction-flows/README.md` section 9; [forum request, 2021-2022](https://forum.figma.com/suggest-a-feature-11/user-preference-to-include-or-exclude-object-selection-in-undo-17503) |
| Zoom and viewport                                                       | not documented as undoable; zoom is per browser tab ("Any changes you make to zoom only apply in the current tab for that file"). The study did not test it                                                                                                                                                | [Adjust your zoom and view options](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options)                                                           |
| Panel, tab and mode changes (Design / Prototype, Dev Mode, rail panels) | not documented and not measured; they are not document state                                                                                                                                                                                                                                               | --                                                                                                                                                                                     |
| A plugin run                                                            | one step by default: "By default, plugin actions are not committed to undo history" until the run ends, so the whole run undoes at once; a plugin may call `commitUndo()` to split it into several steps                                                                                                   | [Plugin API: commitUndo](https://developers.figma.com/docs/plugins/api/properties/figma-commitundo/)                                                                                   |

The rule: **undo covers the document, carries the selection with it, and treats a long
operation as one step**. The complaint Figma never answered is selection changes counted as
steps of their own, which make users press Ctrl+Z through clicks to reach an edit.

### 2.9 Overrides: a property of the instance, never an object of their own

An override is a change made on an instance to something its main component supplies (a
fill, a text, a nested instance).

- **Storage.** The plugin API exposes overrides as one read-only property of the instance:
  `overrides: { id: string; overriddenFields: NodeChangeProperty[] }[]`, "all fields directly
  overridden on an instance", where `id` names the layer inside the instance and
  `overriddenFields` the properties changed on it
  ([Plugin API: InstanceNode](https://developers.figma.com/docs/plugins/api/InstanceNode/)).
  So an override has no id, no name and no node of its own: it is a field list collected on
  the instance, keyed by the inner layer it changes.
- **Reset is on the instance, at two grains.** "Reset > Reset [property]" resets one property,
  "Reset > Reset all changes" resets every property of that layer, and the menu "only lists
  properties that have changes applied"
  ([Apply overrides to instances](https://help.figma.com/hc/en-us/articles/360039150733-Apply-overrides-to-instances)).
  The API offers the whole-instance form, `removeOverrides()`, "Removes all direct overrides on
  this instance" (InstanceNode, above).
- **There is no surface that lists overrides across instances.** Neither the help nor the
  plugin API describes one; the only reach across instances is the opposite direction, "push
  your changes back to the main component, which updates any other instances", available only
  when the main component is in the same file (Apply overrides, above).
- **The override is the most specific value and wins**: the instance keeps it while the main
  component keeps supplying everything that is not overridden (the instance "receive[s] any
  updates", [Guide to components](https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma)).

The rule: **overrides are collected per target, shown and reset from the target, and never
listed as entities.** Section 5.5 turns this into graphty's override layer.

### 2.10 How Figma evolves its document format and its API

- **One schema-based binary format, read forward.** Figma's documents are serialised with Kiwi,
  written by Evan Wallace: "It uses the kiwi binary serialization format, which I developed
  while implementing Figma's multiplayer syncing", and "Figma uses the same
  serialization format for both multiplayer syncing and snapshot storage"
  ([Evan Wallace, Figma](https://madebyevan.com/figma/)). Kiwi's own guarantees: "New versions
  of the schema can still read old data"; "Old versions of the schema can optionally read new
  data if a copy of the new schema is bundled with the data"; and "Presence of optional fields
  is detectable" ([kiwi README](https://github.com/evanw/kiwi)). Combined with the document
  model in which "adding new features to Figma usually just means adding new properties to
  objects" (section 1.1), the paved path is **additive evolution: new optional fields, old
  documents read by new code, and absence of a field meaning "not set"**. No document version
  number and no migration step is described in any Figma source read for these notes (the
  document format itself is not public).
- **The plugin API carries a version the plugin declares, and Figma never upgrades it
  silently.** The manifest's `api` field is "The version of the Figma API used by the plugin";
  "we don't auto-upgrade the api version of plugins to give you the chance to test your plugin
  against the new version" ([Plugin manifest](https://developers.figma.com/docs/plugins/manifest/)).
  Releases are numbered "Version 1, Update N" and are additive
  ([Plugin API updates](https://developers.figma.com/docs/plugins/updates/)); a replaced method
  is marked deprecated and kept (`resetOverrides()`, "DEPRECATED: Use `removeOverrides`
  instead", InstanceNode, above).
- **Restoring a version appends; it does not branch.** "Figma will add two autosave checkpoints
  to the file's version history": one saving the current state "up until you clicked Restore
  This Version", and one "at the same timestamp for the version you just restored". A version
  can also be duplicated into a new file. While an old version is shown the canvas is
  read-only; "Edit current version" leaves history
  ([View a file's version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history)).
  Branches exist, but only as an explicit File menu command (section 2.1), never as a side
  effect of restoring.

The rule: **history is linear and nothing is lost by going back; formats grow by optional
fields; a consumer declares the contract version it was written for.**

---

## 3. Vocabulary conventions

| Convention                                                                                                                                                                                                                                                                                            | Evidence                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Objects are short, concrete nouns taken from the trade**: Page, Section, Frame, Group, Layer, Component, Instance, Variant, Style, Variable, Collection, Mode, Flow, Comment, Annotation, Version, Branch, Library. No invented friendly synonyms; the professional term is the UI term             | `left-sidebar/README.md` section 4 "Layer type icons"; the help articles cited in section 2.1                               |
| **Established technical terms are kept, including jargon**: Auto layout, Constraints, Fill, Stroke, Effects, Blend mode, Boolean operations (Union, Subtract, Intersect, Exclude), Mask, Flatten, Outline stroke. They are taught on hover (tooltips, optional property labels) rather than renamed   | `right-sidebar-selection/README.md` sections 4, 16-18; `canvas-selection/README.md` section 15                              |
| **Inspector sections are nouns naming what they edit**: Position, Layout, Appearance, Typography, Fill, Stroke, Effects, Selection colors, Layout guide, Export. Never a verb or an activity                                                                                                          | `right-sidebar-selection/README.md` section 24                                                                              |
| **Commands are verb plus object**: Group selection, Frame selection, Create component, Detach instance, Select matching layers, Go to main component, Add auto layout, Copy link to page, Move to page. Adding is always "Add X" on a "+" tooltip ("Add fill", "Add export settings", "Add new page") | `popovers-and-menus/README.md` section 2; `right-sidebar-selection/README.md` section 5; `left-sidebar/README.md` section 3 |
| **Automatic names are the type plus a counter**: "Frame 1", "Rectangle 2", "Flow 1", "Page 1"                                                                                                                                                                                                         | `header-and-modes/README.md` section 6; `left-sidebar/README.md` section 3                                                  |
| **The inspector title is the kind or the object's own name**: "Frame", "Text", the component name for instances; "3 selected" for several; "Page" when nothing is selected                                                                                                                            | `canvas-selection/README.md` section 14; `right-sidebar-selection/README.md` section 4                                      |
| **"Mixed" is the one word for differing values** across a multi-selection; "Click + to replace mixed content" for differing paints                                                                                                                                                                    | `right-sidebar-selection/README.md` sections 6 and 15                                                                       |
| **Tooltips are the control's name plus its shortcut**, never a sentence: "Assets Alt+2", "Find Ctrl+F", "Present Ctrl+Alt+Enter"                                                                                                                                                                      | `left-sidebar/README.md` sections 1 and 3; `header-and-modes/README.md` section 3                                           |
| **Modes and tabs are single nouns**: Design, Prototype, Draw, Motion, Dev Mode, Inspect, Comments                                                                                                                                                                                                     | `header-and-modes/README.md` section 4; `bottom-toolbar/README.md` section 7                                                |
| **Counts are plain**: "13 results", "72 components", "3 selected"                                                                                                                                                                                                                                     | `left-sidebar/README.md` sections 5 and 6                                                                                   |
| **Terms are revised toward the industry standard** when they drift: "projects" became "folders" in 2026                                                                                                                                                                                               | [Guide to the file browser](https://help.figma.com/hc/en-us/articles/14381406380183-Guide-to-the-file-browser)              |

---

## 4. Information architecture

### 4.1 Every surface and the rule behind it

Measurements are from `header-and-modes/README.md` section 2 (1600 x 1000 window).

| Surface                                                                                 | Holds                                                                                                                                              | Placement rule                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Navigation rail** (far left, 57 px)                                                   | Main menu, then File, Agents, Assets, Tools, then Variables; Library updates at the foot. Labelled 56 px buttons; the active one has a tinted pill | Chooses what the left panel lists. Each button is a _collection of things in or available to the file_ (the file's contents, reusable assets, plugins, variables), not an activity. Order is by frequency; a separator splits panels from a full-screen view (`left-sidebar/README.md` section 1; [left sidebar help](https://help.figma.com/hc/en-us/articles/360039831974-View-layers-and-pages-in-the-left-sidebar)) |
| **Left panel** (240 px)                                                                 | File header (name, file menu, Minimize UI); Pages; Layers tree. Find (Ctrl+F) temporarily replaces Pages and Layers                                | Answers "what exists?" It lists nouns: the user's own content. Search replaces the list rather than adding a second one (`left-sidebar/README.md` sections 2-5)                                                                                                                                                                                                                                                         |
| **Canvas**                                                                              | the work; selection boxes, hover outlines, size badges, measurements, frame labels, comment pins, other people's cursors                           | Nothing floats on it at rest except the toolbar and the Help button; overlays belong to the selection or to an explicit mode (`canvas-selection/README.md`)                                                                                                                                                                                                                                                             |
| **Right header, row 1**                                                                 | avatars, Present, Share (the single primary button)                                                                                                | Collaboration and output of the whole file: things you do with the file, not to an object (`header-and-modes/README.md` section 3)                                                                                                                                                                                                                                                                                      |
| **Right header, row 2**                                                                 | mode tabs (Design / Prototype, or the mode's own tabs) and the zoom / view menu                                                                    | Lenses on the same selection; the view menu holds display toggles (rulers, outlines, pixel grid, comments, multiplayer cursors, property labels) so they never clutter the canvas (`header-and-modes/README.md` section 4)                                                                                                                                                                                              |
| **Right panel, the inspector** (240 px)                                                 | the selection's properties in fixed order; or the page's when nothing is selected                                                                  | Answers "what is this and how do I change it?" Its identity is decided by the selection, never by what was touched last (`right-sidebar-selection/README.md`)                                                                                                                                                                                                                                                           |
| **Popovers** (240 px, opening to the LEFT of the inspector, top-aligned with the row)   | detail editors for one property: colour picker, effect settings, export settings, interaction details                                              | Depth for one row without leaving the inspector; one at a time (`flows.md` section 5; `right-sidebar-selection/README.md` section 24)                                                                                                                                                                                                                                                                                   |
| **Bottom toolbar** (floating, centred on the window, 48 px high, 529 px wide in Design) | creation tool groups with flyouts (Move, Frame, Shape, Pen, Text, Comment), Actions, and the mode switch                                           | Creation verbs and mode. Small by design; it does not change with the selection (`bottom-toolbar/README.md` sections 1, 9, 10)                                                                                                                                                                                                                                                                                          |
| **Secondary bar** (stacks 8 px above the toolbar)                                       | the options of an armed tool or an edit mode (vector edit, image crop, draw tools)                                                                 | Appears only while a tool or edit mode needs options; gone otherwise (`bottom-toolbar/README.md` section 9)                                                                                                                                                                                                                                                                                                             |
| **Actions** (Ctrl+K, docked above the toolbar)                                          | a searchable list of every command, asset and plugin, with recents                                                                                 | A route to everything, suggesting by selection; never a home of its own ([Making the move to UI3](https://www.figma.com/blog/making-the-move-to-ui3-a-guide-to-figmas-next-chapter/); `bottom-toolbar/README.md` section 8)                                                                                                                                                                                             |
| **Context menu** (right-click)                                                          | the commands that apply to what was clicked; the empty-canvas menu has only view-level items                                                       | Actions on the thing under the pointer (`canvas-selection/README.md` section 15)                                                                                                                                                                                                                                                                                                                                        |
| **Main menu**                                                                           | the full command inventory: File, Edit, View, Object, Text, Arrange, Vector, Plugins, Widgets, Preferences, Libraries, Help                        | The complete, organised list; the place a feature is documented to live (`popovers-and-menus/README.md` section 2)                                                                                                                                                                                                                                                                                                      |
| **File menu** (chevron beside the file name)                                            | version history, publish library, export, duplicate, rename, move, delete                                                                          | Operations on the file as a whole, including its history (`left-sidebar/README.md` section 2)                                                                                                                                                                                                                                                                                                                           |
| **Full-screen views**                                                                   | the Variables table (can minimise to a floating window); Present in a new tab                                                                      | Work whose shape is a table or a playback, too big for a 240 px panel (`flows.md` section 11; `left-sidebar/README.md` section 7)                                                                                                                                                                                                                                                                                       |
| **Bottom dock**                                                                         | the keyboard shortcuts panel; the Motion timeline                                                                                                  | Wide, short tools that need the canvas visible above them (`flows.md` section 11; `header-and-modes/README.md` section 8)                                                                                                                                                                                                                                                                                               |
| **Modal dialog**                                                                        | rare: Manage libraries, delete-thread confirmation, create-style dialogs                                                                           | Only for decisions that leave the canvas or cannot be undone (`popovers-and-menus/README.md` section 11)                                                                                                                                                                                                                                                                                                                |
| **Toast**                                                                               | short feedback ("visual bell"), sometimes with an action                                                                                           | Confirms something that happened elsewhere; replaces the previous toast (`flows.md` section 10)                                                                                                                                                                                                                                                                                                                         |
| **Help button** (32 px circle, bottom right)                                            | help, shortcuts, resources                                                                                                                         | Always reachable, never in the way (`header-and-modes/README.md` section 2)                                                                                                                                                                                                                                                                                                                                             |
| **Minimize UI** (Ctrl+Shift+\)                                                          | collapses both panels into two floating pills                                                                                                      | The canvas can have the whole window at any time (`left-sidebar/README.md` section 2)                                                                                                                                                                                                                                                                                                                                   |

### 4.2 The rules behind the placements

1. **Each surface answers one fixed question.** Left: what exists. Right: what is this. Toolbar:
   what can I make. Header: what do I do with the whole file. A surface never changes its
   question with the user's activity.
2. **Nouns on the left, properties on the right, verbs at the bottom.** The rail is a set of
   noun collections, not a list of activities.
3. **Placement follows stability.** Things that never change position (the rail, the file name,
   Share, the toolbar) are at the edges; things that change with the selection are in the
   inspector; things that exist only during a task are transient (secondary bar, popovers,
   toasts).
4. **One home, many routes.** A capability has one home surface; menus, the context menu,
   Actions and shortcuts are routes to it.
5. **Progressive disclosure by structure, not by prose.** Empty sections collapse to a title and
   "+", flyouts hide tool variants, popovers hide detail, optional property labels teach. The
   UI does not explain itself in sentences.
6. **Modes re-skin the same selection.** Design, Prototype and Dev Mode change what the
   inspector and toolbar show for the same selected object; the tree and the selection stay
   (`tmp/ux-review/graphty-vs-figma-ux.md` follow-up).
7. **Whole-work readings live with "nothing selected".** When nothing is selected, the inspector
   is about the page: its colour, its styles, its export.

### 4.3 Find produces a selection, not a saved result

Find (Ctrl+F, or the search button in the Pages header) replaces Pages and Layers in the left
panel with a search field, a filter button (layer types such as text, frame, shape, plus
"Other"), a result count with a scope menu ("This page" or all pages), previous and next
buttons, and one row per matching layer naming its parent frame. Escape closes it and restores
Pages and Layers (`left-sidebar/README.md` section 5).

- **Results are selectable as a batch.** "Click to select a layer"; Ctrl+click adds results and
  Shift+click selects a range. The chosen results become the canvas selection, so every command
  and every inspector edit then applies to them together
  ([Find and replace in Figma](https://help.figma.com/hc/en-us/articles/9141292269847-Find-and-replace-in-Figma)).
- **Replace is text-only**: Replace (the selected results) or Replace all (the page)
  (same source).
- **Nothing is saved.** The help describes no way to save or name a search, and the panel is
  gone on Escape. Figma's own account of the feature frames it as text search, navigation to
  pages and frames, and layer-name search
  ([Behind the feature: find and replace](https://www.figma.com/blog/behind-the-feature-find-and-replace/)).

So Find is a transient, filtered replacement of the tree whose output is the ordinary
selection. Making something lasting from a selection is always a separate command (Group
selection, Create component); section 4.12 lists where each of those commands sits. No Figma
search, "Select matching layers" or "Select all with same" result is ever stored as a rule: all
of them end as a selection, and a selection is not saved.

### 4.4 Comparing two states

Figma has two comparison surfaces, and neither is part of normal editing:

| Surface                        | Compares                                                                                                                      | Placement and layout                                                                                                                                                                                                                                                                                                                                                                                                   | Source                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Branch review**              | a branch against the main file, before a merge                                                                                | its own window (a modal). A left sidebar summarises the branch and lists changed components, instances and layers, grouped by page and collapsible. The main area shows one change **side by side** (before on the left, after on the right) or as an **overlay** with an opacity slider; details list the properties that changed; arrows step through changes. All or nothing: changes cannot be approved one by one | [Review branch changes](https://help.figma.com/hc/en-us/articles/5693123873687-Review-branch-changes)              |
| **Compare changes (Dev Mode)** | one frame or component against an earlier version of itself, or two selected components against each other (Shift+click both) | opened from the Inspect tab of the right sidebar for the selection, or "Compare to latest version" on a version in focus view. Side by side, overlay, a layers list marking each layer edited, added or deleted, a properties list with previous and current values, and a code diff                                                                                                                                   | [Compare changes in Dev Mode](https://help.figma.com/hc/en-us/articles/15023193382935-Compare-changes-in-Dev-Mode) |

Version history in the Design mode does not compare: it shows one version at a time as a
read-only canvas ([View a file's version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history)).

The paved path is therefore: **comparing two whole states is a focused view of its own** (a
list of differences on the left, the two states side by side or overlaid, a properties diff),
and **comparing two things you have selected is reached from the selection's inspector**. Both
offer the same two layouts, side by side and overlay.

### 4.5 Inspector tabs: what they hide and whether they stick

The inspector's tab pair (Design / Prototype in Design mode; Inspect / Plugins in Dev Mode)
switches what is shown for the same selection (`header-and-modes/README.md` section 4).

- **The tab holds across selection changes.** The study captured the Prototype tab with nothing
  selected, then a top-level frame, then a nested layer, and the tab stayed on Prototype
  throughout (`header-and-modes/README.md` section 6). Whether the choice survives closing and
  reopening a file is not documented and was not measured.
- **Tabs do hide capabilities.** Interactions, flow starting points, scroll behaviour and the
  prototype device settings exist only in the Prototype tab, and so do the canvas connectors;
  dragging a connection between objects is exclusive to it
  ([right sidebar help](https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar)).
  Compare changes and code exist only in Dev Mode's Inspect tab (section 4.4).
- **But each tab is a whole domain, never a split of one domain.** Prototype holds everything
  about behaviour and nothing about appearance; Design holds everything about appearance and
  nothing about behaviour. No property has a home in two tabs, and no tab is a bucket for
  "more detail" about the other tab's properties. The tab switch is always visible at the top
  of the inspector, so a hidden capability is one click from anywhere.

### 4.6 One selection: containers, their children, Enter and Shift+Enter

Figma has exactly one selection, and a container is a thing you can select as itself.

- **Clicking a group or frame row in the layers tree (or the group on the canvas) selects the
  container.** The canvas draws one selection box with four handles and a size badge around the
  container's bounds; the children get no outline and no handles of their own (the capture shows
  only a faint marker at each child's centre). The inspector title is the container's kind
  ("Group", "Frame"). Hovering a child while the group is selected draws that child's hover
  outline; it does not select it (`canvas-selection/README.md` sections 11 and 14; captures
  `65-group-selected`, `66-group-child-hover-while-group-selected`).
- **In the tree**, the selected container's row takes the selected fill; when the container is
  expanded, its children's rows take a fainter tint (`--color-bg-selected-secondary`, #f2f9ff)
  that marks them as "inside the selection" without selecting them
  (`left-sidebar/README.md` section 4, "Row states").
- **Enter replaces the selection with the container's children.** Each child gets its own
  outline, there is no union box, and the inspector title reads "Mixed". Tab then steps to the
  first child alone. On a shape that is not a container, Enter opens vector edit instead; on
  text, text edit; on an image, crop (`canvas-selection/README.md` section 5 and "Keyboard
  behaviour"; `flows.md` section 3).
- **Shift+Enter replaces the selection with the parent.** From a child it selects the
  containing group or frame; from a group it selects the group's parent frame
  (`canvas-selection/README.md` section 11 and "Keyboard behaviour").
- **Double-click drills in one level; the drill does not persist.** After double-clicking into a
  group child, a single click on a sibling selects the group again
  (`canvas-selection/README.md` section 11).

Every command therefore has one unambiguous target, the current selection: with a group
selected, Delete, Copy, Export and every inspector edit act on the group; after Enter they act on
the children. There is no second, "outlined but also targeted" state.

### 4.7 A selection that mixes kinds

Measured with a text layer, an image rectangle and a line selected together, and compared with
selections of several frames, several texts and several shapes
(`right-sidebar-selection/README.md` captures `multi-mixed-types-*`, `s-multi-*`):

- **Title**: "3 selected". The kinds are not named and not counted by kind. ("Mixed" is used only
  for the children selected with Enter, section 4.6.)
- **Type row commands**: only those valid for every member. For text + rectangle + line: Select
  matching layers, Use as mask, Boolean operations, More actions. For several frames the row adds
  Create component; for a mix without frames it does not.
- **Sections, in the fixed order**: Position (with the alignment row), Layout (Resizing and
  Dimensions; the auto layout block only when every member is a frame), Appearance, Typography,
  Fill, Stroke, Effects, Selection colors, Export.
- **A kind-specific section appears when at least one member has it.** Typography was shown for
  the mixed selection although only one of the three layers was text, carrying that layer's text
  style. Layout guide (frames only) was absent because no member was a frame. Whether Layout
  guide appears when one member of three is a frame was not measured, so "at least one" is
  established only for Typography.
- **Differing values**: numeric fields read "Mixed"; differing paint lists collapse to "Click +
  to replace mixed content"; a value that every member shares (here one stroke colour) is shown
  as a normal row.
- **Selection colors** appears whenever the members use more than one colour, listing each shared
  colour or style once with "Select N items using this style" on its row.
- **Export** offers "Export N layers" for the selection.
- The exact case of a frame, a text layer and an instance together was not measured. What the
  measured cases imply: the instance's component row ("Go to main component", component
  properties) would not appear, because those belong to the type row, which shows only commands
  common to every member.

### 4.8 The nothing-selected inspector and its ceiling

Measured in a file with no local styles (`header-and-modes/README.md` sections 5 and 6):

| Tab       | Sections, top to bottom                                                                                                                                                                                                                                                                                                | Rows at rest                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Design    | **Page** (header with "Apply variable mode"; a colour row; a "Show in exports" checkbox), **Styles** (header with "+" Create style; then one row per local style), **Export** (header with "+"; one row per export setting; an "Export <file name>" button; a Preview disclosure), then a dismissible promotional card | 3 section headers and about 5 fixed rows; only the Styles and Export lists grow |
| Prototype | a promotional card, **Prototype settings** (device select; background colour row), **Flows** (one row per flow, with hover actions select frame, copy link, preview)                                                                                                                                                   | 2 section headers and 2 fixed rows; only Flows grows                            |

- **Three sections is the ceiling in either tab**, and at most two fixed rows under any header.
  Everything else is a list of the file's own definitions (styles, export settings, flows).
- **Local styles are grouped by type** ("text, color, effect, and layout guides"), can be shown
  as a list or a grid, and can be put in folders ([Manage and share styles](https://help.figma.com/hc/en-us/articles/360039820134)).
  Whether folders collapse in this list is not stated by the help and was not measured.
- **The inspector scrolls rather than collapsing.** One scroll container holds everything under
  the tab row; section headers are not sticky; a thin overlay scrollbar appears while the
  pointer is over the panel. The study measured this with a frame selected (content 1,868 px
  tall in a 919 px panel); a nothing-selected panel with many local styles uses the same
  container, so it scrolls the same way (an inference). No section header in the Design tab
  collapses its section: an empty section is a single header row with "+", and a section with
  content is open (`right-sidebar-selection/README.md` follow-up section 8). Two disclosures
  exist INSIDE sections, and section 4.15 covers them: Selection colors opens as a summary
  line (up to three swatches and "+N") that expands to one row per colour, and Export ends in
  a collapsible "Preview" row (`right-sidebar-selection/README.md` section 22). Dev Mode's
  Inspect tab goes further, with a collapsible section and "N more" expanders
  (`header-and-modes/README.md` section 7).
- The nothing-selected inspector holds **no commands** other than the "+" that adds an item to
  one of its own lists and the Export button. Creating things from the whole page is not done
  here.

### 4.9 Long operations: where progress is shown

| Operation                        | What the user sees                                                                                                                                    | Cancel                                                                                                                                           | Source                                                                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A plugin run                     | a single toast at the bottom of the screen, "Running [plugin name]", for as long as the run lasts                                                     | yes: "the user can cancel the plugin at any point by using the UI that Figma displays while the plugin is running"; Figma then closes the plugin | [How plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/); [Use plugins in files](https://help.figma.com/hc/en-us/articles/360042532714-Use-plugins-in-files) |
| A plugin's own messages          | toasts from `figma.notify`, "on the bottom of the screen", 3 s by default, queued, optionally with one action button or shown until the plugin closes | --                                                                                                                                               | [figma.notify](https://developers.figma.com/docs/plugins/api/properties/figma-notify/)                                                                                            |
| Library publish                  | "A notification will appear confirming your library has been successfully published." Progress during publishing is not described                     | not described                                                                                                                                    | [Publish a library](https://help.figma.com/hc/en-us/articles/360025508373-Publish-a-library)                                                                                      |
| Copy as PNG of a large selection | a toast "Large PNG ready for copy" with a "Copy to clipboard" button, which stays until used or replaced                                              | --                                                                                                                                               | `popovers-and-menus/README.md` follow-up section 3                                                                                                                                |
| Export from the Export section   | not described by the help and not measured                                                                                                            | --                                                                                                                                               | --                                                                                                                                                                                |

- **There is no status bar and no progress drawn on an object.** Every long operation reports
  through the one toast position above the toolbar; there is only ever one toast, and a new one
  replaces the old (`popovers-and-menus/README.md` sections 12 and follow-up 3).
- **Only one plugin runs at a time, and plugins "can't perform actions in the background"**
  ([Use plugins in files](https://help.figma.com/hc/en-us/articles/360042532714-Use-plugins-in-files)).
  Whether the user can keep editing while a plugin runs is not documented; plugin code runs on
  the editor's main thread ([How plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/)).
- **A run is one undo step** (section 2.8).

Figma can use a single global toast because it has at most one long operation at a time and
never a queue. Its states for a long operation are therefore only running, done (a confirmation
or an action toast) and cancelled.

### 4.10 Large catalogues: Assets, Tools and Actions

| Surface                                             | Presents                                                                                                                                                      | Search                                                                                                                                                             | Insert or run                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Assets** (rail button, Alt+2)                     | libraries as cards with a count ("72 components"); inside a library, a two-column grid of 96 px tiles, switchable to a list, with sub-folders shown or hidden | one field searching all libraries (or the open one); results are a flat grid, each tile naming its source file                                                     | drag a tile to the canvas; Enter or Space on a focused tile; or open the component's details and "Insert instance" |
| **Tools** (rail button: plugins, widgets, AI tools) | a list of 56 px rows (thumbnail, name, author or run count), a "Create" menu                                                                                  | "Search all tools" plus Source and Category filters (twelve categories)                                                                                            | run from the row                                                                                                   |
| **Actions** (Ctrl+K, docked above the toolbar)      | tabs All, Assets, Plugins & widgets; the All tab opens on Recents and groups such as "Image editing" and "Design tools"                                       | typing filters; in All, commands and plugins appear inline, and assets appear as a hand-off row ("Search "frame" in <team> / Community") that opens the Assets tab | Enter runs the highlighted row; Shift+I opens Actions straight on assets ("quick insert")                          |

Sources: `left-sidebar/README.md` sections 6 and 7; `bottom-toolbar/README.md` section 8
(captures `actions-tab-All`, `actions-search-frame`, `actions-tab-Assets`);
[Create and insert component instances](https://help.figma.com/hc/en-us/articles/360039150173-Create-and-insert-component-instances);
[Use the actions menu in Figma Design](https://help.figma.com/hc/en-us/articles/23570416033943-Use-the-actions-menu-in-Figma-Design).

- **Every large insertable or runnable catalogue has both a browsable rail panel and a palette
  route.** Components are in Assets and in Actions; plugins are in Tools and in Actions. Nothing
  insertable or runnable was found that is offered only through the palette.
- **What is palette-only is commands**: view and navigation verbs ("Toggle keyframe timeline",
  "Zoom to next frame") and AI actions have no panel; they are also in the main menu, which is
  the complete inventory (section 4.1).
- **The inspector never hosts a catalogue.** The nearest thing, a property row's picker (styles
  and variables for one row), lists only definitions that fit that row.

### 4.11 Comments: reading, adding and anchoring

- **Pins are visible in Design mode.** "Comments are always visible on the canvas by default,
  whether or not you're in comment mode"; Shift+C shows or hides them. Clicking a pin opens the
  thread in a popover over the canvas ("Click the pin to open the comment modal, where you can
  reply") ([View and manage comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments)).
- **The list of all comments is a mode.** Pressing C (or the toolbar's Comment tool) replaces
  the inspector with a single "Comments" tab: search, sort and filter (date, unread, resolved,
  only yours, only this page) over thread cards (`header-and-modes/README.md` section 9). The
  Design inspector never shows comments, and a selected layer's inspector has no comment section.
- **Commenting is by position, not by selection.** The route is: C, click (or drag a region) on
  the canvas, type, Enter; at least two actions plus typing. There is no "comment on selection"
  command in the context menu or the inspector. The comment attaches to the top-level frame,
  component or group under the click, never to the selected layer: "Comments won't attach to any
  nested frames, components, groups, or other layers"
  ([Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files)).
- **A comment has a canvas position of its own**, and a frame only when it was dropped on one
  ("pinned to a specific frame or layer, or specific co-ordinates on the canvas",
  [Move or edit comments](https://help.figma.com/hc/en-us/articles/360041547853-Move-or-edit-comments)).
  When the frame is deleted, users report the comment stays at its position, unattached, and
  cannot be re-anchored (section 2.7).
- **The object-attached note is the annotation, not the comment.** Dev Mode annotations are
  stored on the node itself (`annotations` property) and drawn beside it (section 2.1), so they
  travel and die with the node.
- **A node can carry several annotations, but no inspector lists them.** The plugin API types
  the property as an array (`annotations: ReadonlyArray<Annotation>`) and its example assigns
  two annotations with different categories to one node
  ([Plugin API: Annotation](https://developers.figma.com/docs/plugins/api/Annotation/)).
  Categories are preset (Development, Interaction, Accessibility, Content) or custom, and can
  be filtered; annotations are hidden from the main menu, View > Annotations
  ([Add measurements and annotate designs](https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs)),
  or with Shift+Y from the zoom / view menu (`header-and-modes/README.md` section 4). Neither
  that article nor the Dev Mode guide
  ([Guide to Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode))
  describes an annotation list in the Inspect tab, and none of the ten sections in the measured
  Inspect tab of a selected frame is one (Layer properties, Layout, Style, Modes, Colors,
  Background colors, Selection colors, Motion, Assets, Export: `header-and-modes/README.md`
  section 7; that frame carried no annotations, so an empty section could have been hidden).
  The finding: **no Figma inspector has a per-object list of commentary**. Annotations are read
  on the canvas beside their node; comments are read in the Comments mode panel. A Notes
  section in a graphty target's inspector is therefore a departure, justified in section 5.5.

### 4.12 Commands that make something lasting from a selection

"Depth zero" below means visible on screen without opening a menu, popover or dialog.

| Command                                                  | Depth zero?                                                                                                                        | Where it is                                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Create component (Ctrl+Alt+K)                            | **yes, for frames**: an icon on the inspector's type row, also for several frames at once                                          | type row; for text and shapes, inside the type row's More actions menu (depth one); context menu; main menu; Actions    |
| Boolean operations (Union, Subtract, Intersect, Exclude) | **yes**: a split button on the type row, also for a mixed selection                                                                | type row; context menu; main menu                                                                                       |
| Use as mask (Ctrl+Alt+M)                                 | **yes**: a toggle icon on the type row                                                                                             | type row; context menu                                                                                                  |
| Add auto layout (Shift+A)                                | **yes**: the "Use auto layout" toggle in the Layout section; with several layers selected it wraps them in a new auto layout frame | inspector; context menu                                                                                                 |
| Group selection (Ctrl+G)                                 | no                                                                                                                                 | context menu, main menu, shortcut, Actions                                                                              |
| Frame selection (Ctrl+Alt+G)                             | no                                                                                                                                 | context menu, main menu, shortcut, Actions                                                                              |
| Wrap in new section                                      | no                                                                                                                                 | context menu of a multi-selection, main menu, Actions                                                                   |
| Create style                                             | **only with nothing selected**: "+" on the Styles header                                                                           | with a selection: open the Fill (or Text, Effect) picker, then its "+" New style or variable, then a dialog (depth two) |

Sources: `right-sidebar-selection/README.md` section 4 and follow-up section 6;
`popovers-and-menus/README.md` section 2 (context menus `ctx-canvas-frame`, `ctx-canvas-multi`,
and `selection-more-actions-menu`); `canvas-selection/README.md` section 15.

The pattern: a lasting command earns a depth-zero control on the type row when it turns the
selection into a new **kind** of object (component, boolean group, mask) that the type row would
then describe. Commands that only wrap the selection in a container (group, frame, section) live
in the context menu and on a shortcut. None of them keeps a rule: each stores the layers selected
at that moment.

### 4.13 Clicking and hovering a definition's row

A definition row is a row for something shared that is not a layer: a local style, a variable,
a library component in Assets.

| Row                                      | Click                                                                                                                                                                                                                             | Canvas selection                                                                                                                                                                                  | Hover                                                                 | Source                                                                                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local style (nothing-selected inspector) | hovering reveals an adjust icon; clicking it opens the Edit style panel (a popover). Right-click offers Edit style, Go to style definition (for a library style), duplicate, copy, and "Add new folder" for a multi-row selection | there is none to lose: the Styles list exists only while nothing is selected, and the style never becomes the selection. The inspector keeps the "Page" identity                                  | reveals the adjust icon; nothing documented or measured on the canvas | [Manage and share styles](https://help.figma.com/hc/en-us/articles/360039820134); `header-and-modes/README.md` section 5                                                  |
| Variable (Variables view)                | clicking the name selects the ROW inside the table (every cell tinted #e5f4ff); the "Edit variable" icon on hover opens a floating edit panel (Details and Scope tabs) that Escape or X closes                                    | the canvas is hidden in the full view; in the minimised floating form "the canvas, rail and right panel stay usable behind it". The help says nothing about the row selection reaching the canvas | no row tint; reveals the opacity field and the Edit variable icon     | `left-sidebar/README.md` follow-up section 6.4 to 6.8; [Create and manage variables](https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables) |
| Component tile (Assets)                  | "select it to open the component details modal"; dragging inserts an instance; Enter or Space inserts                                                                                                                             | unchanged by a click. The tile's context menu offers "Go to main component", which navigates to the main component and selects it                                                                 | a #f5f5f5 tile fill and a tooltip with the full name                  | [Create and insert component instances](https://help.figma.com/hc/en-us/articles/360039150173-Create-and-insert-component-instances); `left-sidebar/README.md` section 6  |

Three rules follow:

1. **A definition row opens an editor; it never becomes the selection.** The editor is a
   popover (style), a floating panel (variable) or a modal (component details). The inspector
   never takes a style's or a variable's identity: the inspector has only two identities, the
   selection and the page (section 1.2).
2. **Only a definition with a body on the canvas can be selected, and then through a named
   "Go to" command** (Go to main component). This is section 2.4's first rule again: the main
   component is a layer, so selecting it is ordinary selection.
3. **Hovering a definition row never outlines its users on the canvas.** The one hover link in
   Figma is between a layer row and that layer's own body (section 1.2, "The canvas and the
   tree are one thing seen twice"). No source read describes hover-to-users for a style,
   variable or component, which fits section 2.6: Figma has no in-editor list of a style's
   users at all.

### 4.14 Long lists that belong to the file or to an object

| List                                           | Typical length                         | Where it lives                                                                                                                   | How it copes with length                                                                                                                                                                                                                                   | Source                                                                                                                                                           |
| ---------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local styles                                   | tens to hundreds in a library file     | the nothing-selected inspector                                                                                                   | grouped by type (text, colour, effect, layout guide), list or grid view, folders made by naming ("Once created, the styles in the folder will be renamed according to their new hierarchy"); the panel scrolls. Whether folders collapse is not documented | [Manage and share styles](https://help.figma.com/hc/en-us/articles/360039820134); section 4.8                                                                    |
| Variables                                      | "up to 5,000 variables" per collection | a full-window view from the rail, minimisable to a resizable floating window ("Click and drag the corner or sides of the modal") | collections, then nested groups in a sidebar that filter the table; search "by variable name, variable value, or group name"; a type filter. Collections sort A to Z; the table has no column sort                                                         | [Create and manage variables](https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables); `left-sidebar/README.md` follow-up section 6 |
| Components in a library                        | hundreds                               | Assets panel (left)                                                                                                              | library cards, sub-folders, a two-column tile grid or a list, search across libraries                                                                                                                                                                      | section 4.10                                                                                                                                                     |
| Export settings of one layer                   | a handful                              | the layer's inspector                                                                                                            | none needed                                                                                                                                                                                                                                                | section 4.8                                                                                                                                                      |
| Children of a layer                            | any number                             | the layers tree                                                                                                                  | expand and collapse per parent; the tree scrolls                                                                                                                                                                                                           | `left-sidebar/README.md` section 4                                                                                                                               |
| Usage of library assets                        | hundreds of rows, sortable             | library analytics, a modal outside the editor                                                                                    | sortable columns ("Click the name of each column to sort"), a duration filter; clicking a row opens a detail view of teams and files                                                                                                                       | [View and explore library analytics](https://help.figma.com/hc/en-us/articles/360039238353-View-and-explore-library-analytics)                                   |
| Many items inside a Dev Mode inspector section | tens                                   | Inspect tab                                                                                                                      | three or four items shown, then an "N more" expander ("27 more" colours after four; "33 more" icons after three)                                                                                                                                           | `header-and-modes/README.md` section 7; capture `devmode-inspect-frame-*`                                                                                        |

The rules:

- **A single-column list of the file's own definitions may stay in the inspector** and grows
  by scrolling and folders (local styles).
- **A list with several value columns moves out of the side panels**: variables (one column per
  mode) to a full-window view that can float over the canvas; sortable usage tables to a modal
  outside the editor. No Figma inspector hosts a multi-column or column-sortable table.
- **Inside an object's inspector, a list is cut to three or four items and an "N more"
  expander**, or to a summary line that expands (Selection colors, section 4.8).
- **No Figma list offers "select these" over hundreds of rows except Find**, whose results
  are the tree's replacement (section 4.3), not an inspector section.

### 4.15 Dense read-only status, and state that stays visible

**Dense read-only status for a whole object.**

| Surface                              | Readouts                                                                                                                                                                                         | Disclosure                                                                                 | Source                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Dev Mode Inspect, a selected frame   | ten sections in one scrolling panel; the first is a box-model figure that packs size, padding, border and corner radii into one 288 x 184 diagram, every value a click-to-copy label             | lists inside a section show three or four items, then "N more"; the MCP section collapses  | `header-and-modes/README.md` section 7                                                                                         |
| Selection measurements on the canvas | the size badge (W x H) under every selection; holding Alt shows red distances to the hovered object                                                                                              | none; one or two numbers                                                                   | `flows.md` section 1; `canvas-selection/README.md`                                                                             |
| Library analytics                    | an overview of five or six totals ("Total teams", "Teams with libraries", "Total libraries", "Total components", "Total styles", "Total variables"), then an Analytics tab with a sortable table | a second tab, and a row click for per-asset detail; a 30, 60, 90 day or last-year duration | [View and explore library analytics](https://help.figma.com/hc/en-us/articles/360039238353-View-and-explore-library-analytics) |
| Nothing-selected inspector           | three sections at most                                                                                                                                                                           | none needed                                                                                | section 4.8                                                                                                                    |

So: **dense status is shown under a selection, not with nothing selected** (Dev Mode's
nothing-selected panel is a page header and Code settings, `header-and-modes/README.md`
section 7). A whole-object summary leads with five or six headline totals, packs related
numbers into one compact figure, cuts every list to three or four items plus "N more", and
moves anything tabular to a second tab or a separate surface.

**State that stays visible whatever is selected.**

| State                          | Indicator                                                                                         | Where                                                                                                       | Source                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zoom level                     | the percentage ("2%"), which is also the zoom / view menu button                                  | the right header's second row, beside the inspector tabs, above the inspector; independent of the selection | [Adjust your zoom and view options](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options) ("in the top-right corner of the right sidebar"); `header-and-modes/README.md` section 4 |
| Dev Mode                       | green accent on Share, the selected tool and the mode icon; a wider right panel                   | the whole chrome                                                                                            | `header-and-modes/README.md` section 7                                                                                                                                                                                |
| Following a collaborator       | a 5 px border in their colour round the window and a banner hanging from the top centre with Stop | the window edge and the top of the canvas                                                                   | `canvas-selection/README.md` (follow-mode border and banner)                                                                                                                                                          |
| An old version is open         | the version list replaces the inspector; the canvas is read-only; "Edit current version" returns  | the right sidebar                                                                                           | [View a file's version history](https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history)                                                                                                  |
| Hidden comments or annotations | only the check mark in the view menu                                                              | inside the zoom / view menu                                                                                 | `header-and-modes/README.md` section 4                                                                                                                                                                                |

So: **a state that changes what the reader sees of the whole canvas is shown outside the
inspector**, in the header row above it (zoom), in the chrome's colour (a mode), or on the
window edge with its own exit (follow). None of them lives in the nothing-selected inspector,
which would hide it the moment something is selected. Figma's weakness is the last row: a
display toggle that hides content is visible only by opening the menu.

### 4.16 The bottom dock: how it opens, closes and sizes

| Dock               | Opens                                                                                                  | Closes                                                                                                                                                                                         | Height                                                | Source                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Keyboard shortcuts | Ctrl+Shift+?; Help and account > Keyboard shortcuts; Preferences > Keyboard layout (on its Layout tab) | the X; Escape according to `popovers-and-menus/README.md` section 10, but `flows.md` section 9 and `accessibility/README.md` section 6.5 record that Escape did not close it (see section 5.6) | 241 px at a 1000 px window; no resize handle recorded | `popovers-and-menus/README.md` section 10                                                                     |
| Motion timeline    | entering Motion mode from the toolbar's mode switch; the command "Toggle keyframe timeline" in Actions | the same command; leaving the mode (inferred: the dock belongs to the mode, and was not seen outside it)                                                                                       | 200 px; the toolbar moves up to sit above it          | `header-and-modes/README.md` section 8; `bottom-toolbar/README.md` section 10; capture `actions-search-frame` |

Neither dock has a rail button or a toolbar tool slot. They are opened by a mode, a menu, a
shortcut or the palette, and they push the canvas up rather than cover it. Whether either
remembers a height is not documented and was not measured; no resize handle was recorded for
either.

---

## 5. Verdict for graphty

Three verdicts are used:

- **Transfers unchanged**: adopt Figma's solution as it is.
- **Transfers with adaptation**: keep Figma's rule, change its content for graphs, with the
  reason.
- **Does not transfer**: Figma's solution answers a problem graphty does not have, or conflicts
  with a decision the owner has made.

The underlying reason for most adaptations: Figma edits objects the user drew; graphty analyses
objects the user did not draw. Nodes and edges arrive as data, in thousands, with no hierarchy
and with computed positions; appearance is mostly a mapping from data; and the app produces new
facts (algorithm results) that need provenance
(`tmp/ux-review/graphty-vs-figma-ux.md` "Where graphty necessarily differs").

### 5.1 Principles

| Figma principle                                                      | Verdict                         | Reason and what it becomes                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The work is the centre of the screen                                 | Transfers unchanged             | The graph is the work. Nothing floats on the canvas at rest except the toolbar and Help; no suggestion cards, no automatic minimap                                                                                                                                |
| Simplify without shrinking capability; optional labels for learners  | Transfers unchanged             | This is the owner's rule for novices: undo, defaults, (i) info icons, tooltips, the command palette. Figma's optional property labels are the same idea as an (i) icon: help that is present on request and absent otherwise                                      |
| Speed is a feature                                                   | Transfers unchanged             | Instant overlays and no chrome animation. It also argues against extra confirmation steps before cheap, undoable analyses                                                                                                                                         |
| Usability over decoration                                            | Transfers unchanged             | Controls look like controls; one row shape, one accent meaning                                                                                                                                                                                                    |
| Preserve muscle memory                                               | Transfers unchanged             | Figma's shortcuts and gestures (V, Ctrl+K, Ctrl+F, Enter / Shift+Enter, Shift+click, marquee, Escape) are graphty's, so a Figma user already knows them                                                                                                           |
| The most specific controls come first                                | Transfers unchanged             | A selected object's inspector leads with what makes it that kind of object (for an algorithm result, what produced it and its parameters) and ends with generic appearance and export                                                                             |
| Everything is an object with properties; a feature is a new property | Transfers with adaptation       | The same shape suits graphty-element's session: every capability should appear as properties of an object the element owns. Adaptation: some properties are computed (algorithm values) and have provenance and a staleness state that a Figma property never has |
| Undo must never surprise; undo is the safety net                     | Transfers unchanged             | It is already the owner's rule that safe exploration comes from undo. Since graphty-element owns the analysis tree, it owns the undo history too                                                                                                                  |
| One overlay at a time; commit on Enter; nothing animates             | Transfers unchanged, for chrome | Does not apply to the graph itself: a force layout moves by nature                                                                                                                                                                                                |
| Selection drives the inspector; "nothing selected" is the whole      | Transfers with adaptation       | In Figma, "nothing selected" is about the page's colour and export. In graphty it is about the whole graph, which the owner calls a key task: node and edge counts, degree distribution, density, components                                                      |
| Add first, configure after; no confirmations; undo reverses          | Transfers unchanged             | Running an algorithm, adding a style or a note happens at once with defaults; settings are edited afterwards on the object                                                                                                                                        |
| Kind is shown by colour, consistently                                | Transfers with adaptation       | graphty's canvas is full of data colour (community colours, gradients). Any UI colour that means "selected" or marks a kind must be kept out of the data palettes, or it will collide with them                                                                   |
| The app never acts unasked                                           | Transfers unchanged             | No automatic degree runs, suggestion cards or panel switching after a load (these are the gaps named in `tmp/ux-review/graphty-vs-figma-ux.md`)                                                                                                                   |
| Persona modes (Dev Mode)                                             | Does not transfer               | The owner's rule is no persona-specific features. Figma's "mode re-skins the same selection" mechanism is still useful, but not for a persona                                                                                                                     |

### 5.2 Ontology

| Figma pattern                                                                                                                                                 | Verdict                                                                        | Reason and what it becomes                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A small set of primary objects that have a body on the canvas, each with a tree row, a selection box and an inspector                                         | Transfers with adaptation                                                      | The primary objects are graph objects: node, edge, and the named graph objects built from them (a group of nodes, a path, a subgraph). The test "can you draw a selection box around it on the canvas?" separates them from secondary objects                                                                                                                                                                                               |
| The tree is a single-parent containment hierarchy that is also the paint order                                                                                | Transfers with adaptation                                                      | Graph membership is many-to-many: a node can be in a community, on a path and in a filtered set at once. A tree of named graph objects can still work, but a node row cannot appear under a single parent, and nodes (thousands) need a virtualised list or a table rather than tree rows. What "order" means in the tree (style precedence, as the style-layer stack) is for graphty's own ontology to decide                              |
| Frame (explicit bounds) versus group (bounds derived from its children)                                                                                       | Transfers with adaptation, as an analogy                                       | graphty has the same split in its sets: a set picked by hand (explicit, like a frame) and a set defined by a rule or produced by an algorithm, whose membership follows the data (derived, like a group whose bounds follow its children). The distinction deserves a name in graphty's vocabulary                                                                                                                                          |
| Sections as top-level organisers that cannot be nested inside frames                                                                                          | Does not transfer as such                                                      | Graphs have no 2D regions to organise; the nearest analogue, grouping named objects in the tree, is a folder-like organiser, and should be added only if the tree grows long enough to need it                                                                                                                                                                                                                                              |
| Pages, each with its own canvas                                                                                                                               | Does not transfer as such                                                      | A graphty project holds one graph. Several canvases of the same graph are views or comparisons, which are not containers of objects. Whether a project holds several datasets is for graphty's ontology to decide                                                                                                                                                                                                                           |
| Components and instances (reusable drawn objects with overrides)                                                                                              | Does not transfer                                                              | graphty does not re-use drawn objects; nodes come from data. The nearest need, reusing a look across projects, is a style template, which is a secondary definition object                                                                                                                                                                                                                                                                  |
| Styles and variables live outside the tree and are applied from a property row, which then shows the definition's name                                        | Transfers with adaptation                                                      | graphty's appearance is stored as style layers owned by graphty-element (the owner's rule: never by editing a node or mesh). The Figma pattern supplies the interaction: the user changes appearance from the selected object's Fill or Colour row; the change is recorded as a style layer; the row shows that layer. Adaptation: graphty's style layers are rules with selectors, closer to CSS rules than to Figma's named value bundles |
| A list of fills that stack, each with an eye, the newest on top                                                                                               | Transfers with adaptation                                                      | This is the Figma precedent for the owner's decision that highlights stack as edge style layers rather than replacing each other. Several paints on one object, each toggleable, top one wins, maps directly onto stacked style layers                                                                                                                                                                                                      |
| Variable modes (one value per mode, switched per page or frame)                                                                                               | Does not transfer                                                              | No graphty requirement has named value sets switched by context. Theme switching (light and dark) is an app preference, not a graph object                                                                                                                                                                                                                                                                                                  |
| Behaviour stored as properties of the object and edited in a second inspector tab (Prototype); its canvas overlay drawn only in that tab                      | Transfers with adaptation, as a mechanism, under the conditions in section 5.5 | A second tab is valid only for a whole domain with its own verbs and canvas overlay, and it must stick across selections; a tab that holds "secondary detail" of the first tab's objects does not follow Figma. Prototyping itself does not transfer: the owner has said export and present are the same thing                                                                                                                              |
| Comments are secondary: pinned to a top-level object and moving with it, shown as canvas pins, managed in their own panel and mode, hideable, never tree rows | Transfers with adaptation                                                      | This is the model for graphty's notes, which the owner wants to be a common task. Adaptation: a graphty note attaches to a graph object (a node, an edge, a group, a path) rather than to a top-level frame, and a single-user tool needs no threads, mentions or resolve. Figma's Dev Mode annotations (a note stored on a node, drawn beside it) are the closer precedent for attaching to a specific object                              |
| Annotations as a property of the node                                                                                                                         | Transfers with adaptation                                                      | Same as above: a note is data about an object, so it can travel in the project file with that object                                                                                                                                                                                                                                                                                                                                        |
| Versions and branches off the working screen, in the file menu; undo with no visible list                                                                     | Transfers with adaptation                                                      | Versions belong with the project file (owned by graphty-element). Undo transfers unchanged. A visible history list is optional; Figma shows none                                                                                                                                                                                                                                                                                            |
| Export settings as the last section of the inspector                                                                                                          | Transfers unchanged                                                            | Export belongs to the object being exported (the whole graph when nothing is selected, or the selected object)                                                                                                                                                                                                                                                                                                                              |
| Collaborators, cursors, follow and spotlight                                                                                                                  | Does not transfer now                                                          | graphty has no multiplayer. If it arrives, Figma's placement (avatars beside Share) transfers                                                                                                                                                                                                                                                                                                                                               |

### 5.3 Vocabulary

| Figma convention                                                       | Verdict                                                   | Reason and what it becomes                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use the trade's own nouns; no friendly substitutes                     | Transfers unchanged                                       | The owner's rule: keep node, edge, degree, betweenness, PageRank, components (connected components), density. Where graph tools already agree on a term, graphty uses it; where they disagree, Cytoscape and Gephi are the references to borrow from |
| Teach jargon on hover (tooltip, optional labels), never by renaming it | Transfers unchanged                                       | The (i) info icon beside a technical term is the graphty form                                                                                                                                                                                        |
| Inspector sections are nouns naming what they edit                     | Transfers unchanged                                       | Sections named for properties (Appearance, Members, Values, Export), never for activities ("Analyze", "Explore")                                                                                                                                     |
| Commands are verb plus object; "+" tooltips read "Add X"               | Transfers unchanged                                       | For example "Find shortest path", "Select neighbors", "Add note"                                                                                                                                                                                     |
| Automatic names are the kind plus a counter                            | Transfers with adaptation                                 | Algorithm results can carry a more useful automatic name (the algorithm and its target), but the rule "every object gets a name at birth and can be renamed in place" transfers                                                                      |
| Boolean operations named Union, Subtract, Intersect, Exclude           | Transfers unchanged                                       | They are the set-theory terms, so they are also the right terms for combining node or edge sets                                                                                                                                                      |
| "Mixed" for differing values; "N selected" as the inspector title      | Transfers unchanged                                       | Same meaning for a multi-selection of nodes                                                                                                                                                                                                          |
| Tooltips are a name plus a shortcut                                    | Transfers unchanged                                       | A short name; a longer explanation belongs behind the (i) icon, not in the tooltip                                                                                                                                                                   |
| Modes are single nouns                                                 | Transfers unchanged                                       | Applies to the 2D / 3D / VR / AR button the owner has decided on                                                                                                                                                                                     |
| One word, one meaning                                                  | Transfers unchanged, with Figma's own lapses as a warning | Figma overloads "Layout" and "Actions"; graphty already overloads "Views" (saved views and camera presets) and must not                                                                                                                              |

### 5.4 Information architecture

| Figma surface                                                                                            | Verdict                                                                                                                                                                                   | Reason and what it becomes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nav rail that chooses what the left panel lists; each button a collection of nouns                       | Transfers with adaptation                                                                                                                                                                 | The owner has decided on a rail. Figma's rule decides what it holds: each button must be a collection of things (the graph's objects, reusable definitions such as style templates and saved views, notes, data) and never an activity such as "Analyze" or "Style". The exact buttons follow from graphty's own information architecture                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Left panel answers "what exists?"; Find replaces it                                                      | Transfers with adaptation                                                                                                                                                                 | The left panel lists graphty's primary graph objects. Find must also accept a query (attribute values, degree), not only names, because nodes are found by their data. Its output is a selection, as in Figma (section 5.5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Right inspector answers "what is this?"; "nothing selected" means the page                               | Transfers with adaptation                                                                                                                                                                 | The owner has decided on a right inspector. With nothing selected it shows the whole graph (counts, degree distribution, density, components), which is richer than Figma's page section                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Mode tabs above the inspector as lenses on one selection                                                 | Transfers with adaptation                                                                                                                                                                 | Useful for a small number of lenses on the same selection. Not for personas, and not for activities                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Zoom / view menu holding display toggles                                                                 | Transfers unchanged                                                                                                                                                                       | Graph display toggles (labels, arrows, the legend, the minimap) live there, not on the canvas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Floating bottom-centre toolbar: creation verbs, Actions, mode switch; does not change with the selection | Transfers with adaptation                                                                                                                                                                 | The owner has decided on a small floating toolbar. graphty's "creation" is analysis (running an algorithm or a filter produces an object), so the toolbar holds the verbs that make graph objects, plus the single 2D / 3D / VR / AR button the owner has decided on. It must stay small: Figma's has six tool groups                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Secondary bar above the toolbar while a tool is armed                                                    | Transfers unchanged                                                                                                                                                                       | The home for an armed tool's options (for example picking the two ends of a path), gone when the tool finishes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Actions / command palette (Ctrl+K) as a route to everything                                              | Transfers unchanged                                                                                                                                                                       | The owner has decided on a command palette; it is a route, never a home                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Context menu with only what applies to the clicked thing                                                 | Transfers unchanged                                                                                                                                                                       | Plus a keyboard route, which Figma lacks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Popovers opening to the left of the inspector for one property's detail                                  | Transfers unchanged                                                                                                                                                                       | Colour pickers, algorithm parameters, export settings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Header row with the one primary button (Share) and Present                                               | Transfers with adaptation                                                                                                                                                                 | The owner has said export and present are one thing, so Export (or Share, if sharing exists) is the one filled primary button; there is no Present                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Full-screen or floating table view (Variables)                                                           | Transfers with adaptation                                                                                                                                                                 | The Figma precedent for graphty's data table: a table too wide for a side panel, able to float or dock. Adaptation: the table must stay linked to the canvas selection (Figma's Variables view has no canvas link)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Bottom dock (shortcuts panel, Motion timeline)                                                           | Transfers with adaptation. _The table's placement here is an input to the information architecture, which checks it against the rank of the tasks it serves (`principles.md` 0, Decides)_ | The Motion timeline is the precedent for a time slider that pushes the canvas up. The owner has said watching a graph over time is key for them but not for the average user, so the dock appears only when the data has time and the reader opens it. The node and edge table also lives in the bottom dock, because it must keep the canvas visible and linked. By Figma's rules (section 4.16) it gets no toolbar slot (the toolbar holds creation verbs) and no rail button (the rail chooses what the left panel lists; Figma's one exception, Variables, is listed in section 1.3 as a weakness). It opens from a view-menu toggle, a shortcut, the palette, and from any "N more" or "Show in table" row in an inspector, which opens the dock scoped to that object. Figma records no remembered height; graphty remembers the dock's height per reader as a preference, which is cheap to change later |
| Comment mode with its own tool, panel and canvas pins                                                    | Transfers with adaptation                                                                                                                                                                 | The review surface for notes: a tool that attaches a note to the object under the pointer, a panel that lists all notes while the mode is on, markers that can be hidden. Notes must not appear as rows among the graph objects. The everyday route to a note is its target's inspector (section 5.5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| File menu for file-level operations and version history                                                  | Transfers unchanged                                                                                                                                                                       | Save, open, versions, export of the whole project                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Help button bottom right                                                                                 | Transfers unchanged                                                                                                                                                                       | Help, shortcuts, samples and docs, the owner's novice aids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Minimize UI                                                                                              | Transfers unchanged                                                                                                                                                                       | The canvas gets the whole window; also the natural state for VR and AR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Panels hold width, canvas shrinks; toolbar centred on the window                                         | Transfers unchanged                                                                                                                                                                       | The same measured behaviour; graphty's panels should be 240 px like Figma's                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Modal dialogs only for decisions that leave the canvas                                                   | _Superseded by `conceptual-model.md` 2.2: transfers unchanged._ Original verdict: transfers with adaptation                                                                               | Original: import is the one place a guided dialog earns its keep, because loading data involves decisions (which column is the source, target, id) that Figma never faces. Now: loading commits at once with detected defaults, the import report is read in its Version history entry, reached from the graph's Statistics (a Last import row and the import-count mark rows) and the load toast's Details, and every correction is one undo step, which is Figma's add-first, configure-after rule; no departures row is needed because graphty follows Figma here                                                                                                                                                                                                                                                                                                                                            |

### 5.5 Verdicts on use-sites, find, definition lists, comparison, tabs, broken references and undo

| Figma finding                                                                                                                                                                                                                                                                                                        | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | What it becomes in graphty                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Forward relationships are a named row on the user, with a go-to action ("Go to main component") (section 2.6)                                                                                                                                                                                                        | Transfers with adaptation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | A node's inspector has a "belongs to" section with one row per set the node is a member of. Adaptation: membership is many-to-many, so it is a list of rows, not one row, and the list takes the shape of Selection colors: one row per shared thing, a swatch where the set has a colour, the set's name, and a hover icon that selects the set's members. Clicking the row's name selects the set itself (Figma's go-to)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Reverse relationships produce a selection, never a list of users (section 2.6)                                                                                                                                                                                                                                       | Transfers unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | A set's "Select members" command replaces the selection with the members, so the tree, canvas and inspector all show them and every command acts on them. The set's inspector does not grow a member list of its own; the tree and the data table already list a selection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Counts of users exist only in library analytics, outside the editor (section 2.6)                                                                                                                                                                                                                                    | Does not transfer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | In graphty the member count is analysis data, not an administrator's metric: a set's size and a node's number of memberships are read in the inspector ("412 members"). Figma's plain count style ("72 components") is kept                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| A style has no reverse route of its own (section 2.6)                                                                                                                                                                                                                                                                | Does not transfer; Figma's gap, not a rule. _Confirmed by `information-architecture.md` 4: a set's Select members, a style layer's Select painted, the Overrides row's Select overridden; a result reaches its elements through its automatic layer's Select painted and its item rows_                                                                                                                                                                                                                                                 | Every graphty definition (a set, a style layer, a run's result) gets "Select members" or its equivalent directly on its row, because graphty's users ask "which nodes does this touch?" constantly. Figma's own users request exactly this                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Find is transient and its output is the ordinary selection; making something lasting is a separate command (section 4.3)                                                                                                                                                                                             | Transfers unchanged. _Vocabulary superseded by `glossary.md` 9: the command is Create set_                                                                                                                                                                                                                                                                                                                                                                                                                                              | A query in Find returns a selection. "Save as set" (verb plus object) is a separate command on the selection, as Group selection and Create component are in Figma. Adaptation: because a query is worth keeping, the saved set may keep its query and re-evaluate when the data changes (a derived set, the frame-versus-group analogy in section 5.2); Figma has no equivalent. This agrees with `graph-analysis.md`, which classes a search query as transient with a selection as its result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Reusable definitions get a rail button only if they are inserted (Assets), a large runnable catalogue (Tools) or table-shaped (Variables); applied definitions (styles) are rows in the nothing-selected inspector; flows are rows in the nothing-selected Prototype inspector; comments are a mode (section 2.5)    | Transfers unchanged, as the rule for secondary collections. _Placements superseded: where notes, views and the result tree appear is the information architecture's decision (`principles.md`, "Decided elsewhere"). Catalogue placement superseded by `information-architecture.md` 3: the catalogue shares the Results panel in the shape of Figma's Assets panel (the file's own items above, the library below), because running an algorithm fills the file's own list; layouts are methods of the Layout row, not catalogue rows_ | Notes: a mode with its own panel and canvas markers, no rail button, plus a Notes section in each target's inspector. The algorithm and layout catalogue: a rail button, by the runnable-catalogue test. Saved views: rows in the nothing-selected inspector, as flows are. Style layers: rows in the nothing-selected inspector, as local styles are. Analysis history: borrows the right sidebar on request, as version history does, unless graphty's own ontology makes runs primary objects, in which case they are tree rows. A secondary collection earns a rail button only by meeting one of Figma's three tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| No Figma surface draws an ordered list of rules across many objects (section 2.5)                                                                                                                                                                                                                                    | Does not transfer; documented departure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | graphty's global style-layer stack is its own. It borrows Figma's fill-list row shape (top wins, eye per row, drag to reorder, newest added at the top) and the local-styles home (the nothing-selected inspector). Reason for the departure: graphty's appearance is rules with selectors that overlap on the same nodes, so precedence exists and must be visible; Figma's styles never overlap, so Figma never needed to draw it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Comparison is a focused view of its own for two whole states, and a selection-level action for two selected things; both offer side by side and overlay (section 4.4)                                                                                                                                                | Transfers with adaptation. _Superseded in part by `conceptual-model.md` 7.5 and `principles.md` (worked conflict on the result editor): results are never selected, so two runs are compared with "Compare with..." from one result's editor_                                                                                                                                                                                                                                                                                           | "Compare two graphs" (or two datasets) follows branch review: a focused view with a list of differences (nodes and edges added, removed, changed) beside the two states, side by side or overlaid. "Compare two runs" follows Dev Mode's compare: select two results, compare from their inspector, with a properties table of previous and current values. Adaptation: graphty's overlay needs aligned node positions to mean anything, which is a layout decision Figma never faces                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Inspector tabs stick across selections and each is a whole domain; they do hide capabilities (section 4.5)                                                                                                                                                                                                           | Transfers with conditions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | A data-versus-appearance lens tab is valid only if (a) the default tab alone covers the common path, (b) no property has a home in both tabs, (c) the tab sticks across selections, and (d) the tab switch is always visible. A tab used to hold "more detail" about the first tab's properties breaks the one-home rule and does not follow Figma; that detail belongs in a popover from its row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| A reference outlives its target. A value definition (style, variable) leaves its users with the value and no link, silently; an object definition (main component) leaves its instances linked, says so on their inspector and offers Restore Component (section 2.7)                                                | Transfers with adaptation: the component policy, not the style policy. _Confirmed: `glossary.md` 10 gives Detached the verb Restore run. Restore report confirmed by `information-architecture.md` 4: it is the Open entry in Version history. Re-pointing by hand superseded: each reported row selects the item, whose Detached mark offers Restore_                                                                                                                                                                                  | Deleting a run never deletes the style layers, sets, notes or views made from it. Each dependent keeps painting or holding its last values (frozen) and is marked disconnected on its own row, naming what it lost ("Source run deleted"), with Restore run as its first action, the way an instance offers Restore Component. Restore reinstates the run from the journal's cached result, so nothing is recomputed. Reason for choosing the component policy: a style layer made by a run is an object with a name, a position in the layer stack and a legend, like an instance; silently turning it into an anonymous fixed rule, as Figma does to a detached style, would leave the reader unable to tell a measure's encoding from a hand-set colour. Opening a project file produces a restore report listing what could not be reconnected, grouped by what it lost, with counts (Figma's missing-libraries list); each item can be selected from the report and re-pointed by hand, not only by name matching, which fixes Figma's weakest point                                                                                                                                                                                                                                                                                                                                              |
| Comments anchor to a top-level object or to a canvas point; they move with the object; they are orphaned but kept when the object goes (sections 2.7 and 4.11)                                                                                                                                                       | Transfers with adaptation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | A note targets one or more graph objects (node, edge, set, run) and stores no canvas position. Reason: Figma's positions are authored and stay meaningful, while graphty's positions are computed by a layout and mean nothing after the next re-layout, so a stored point would pin the note to empty space. The note instead keeps its own copy of what it was about (the ids and a label of each target at the time of writing). When a target is deleted the note is kept, marked unattached, listed with that copy, and can be re-anchored (Figma cannot). Any object can take a note, not only top-level ones, because graphty has no nesting                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| A bound property row is a named button, not a value: clicking it reopens the picker, "Edit style" changes the definition for every user, and "Detach" writes a local value to this layer only; the two routes are separate and named (section 2.7)                                                                   | Transfers with adaptation. _Click superseded by `information-architecture.md` 4 (Appearance): clicking the row reopens the picker over the whole stack, as Figma's does; the picker's Edit opens the layer's editor, Override writes to the Overrides row, and Reset returns the channel_                                                                                                                                                                                                                                               | A node's Colour (or Size) row whose value comes from an encoding style layer shows that layer's name and swatch, not a raw value, so no edit can silently mean "everyone" or "just this node". Clicking the row opens the encoding layer's own editor (the rule: palette, mapping, range), which changes every node it paints. A hover action on the row, "Override" (the detach equivalent), records the selected nodes' new value in the graph's single override layer, above the encoding layer; the row then shows the override's value and the encoding layer stays intact beneath it. The row's reset returns that property to the encoding. Adaptation: Figma's detach rewrites the layer's own property; graphty may never write to a node or a mesh (the style-layer rule in the project's CLAUDE.md), so the "local value" lives in a style layer. How overrides are collected into that one layer is the next row                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Overrides are a field list stored on the instance, keyed by the inner layer, reset per property or all at once from the instance; no surface lists them across instances; the override wins over what the definition supplies (section 2.9)                                                                          | Transfers with adaptation. _Confirmed by `information-architecture.md` 4: Reset on an overridden Appearance row, Reset all changes in the type row's overflow, Select overridden and Clear all on the Overrides row_                                                                                                                                                                                                                                                                                                                    | **One collected override layer, not a layer per override.** graphty-element keeps a single override layer per graph: a map from element id to the channels overridden and their values, which is exactly Figma's `{ id, overriddenFields }[]` moved from the instance to the one place graphty allows appearance to live. It is one row in the style-layer stack, with a count ("Overrides 14"), created at the top of the stack because an override is the most specific value (Figma's rule) and movable like any row. Each element's inspector shows its overridden rows marked, with "Reset" per property and "Reset all changes" for the element, Figma's two grains. Adaptation, and a documented departure: the override layer's row also offers "Select overridden" and "Clear all", which Figma lacks. Reason: Cytoscape's per-element bypass, visible only through the selection, is the known cause of "my mapping does not work" (`graph-tools.md` section 20.4), and a graph has thousands of targets where Figma has a handful of instances. Storage consequence for `StyleDocument` and the project file: overrides are one layer entry whose selector is the id list and whose bindings are per id, not N layers; this is a published format and so a one-way door, and it is additive to the present `StyleDocument` version 1 if written as a new optional layer kind (section 2.10) |
| One selection. Selecting a container selects it as an object; its children get no outline or handles and only a faint tint in the tree; Enter replaces the selection with the children, Shift+Enter with the parent; every command targets whatever is selected (section 4.6)                                        | Transfers with adaptation. _Commands superseded: "hide" and "Keep" are not commands on a set; the eye applies only to what a row draws (`principles.md`, departures table) and Keep is Create set (`glossary.md` 9)_                                                                                                                                                                                                                                                                                                                    | graphty has one selection. Clicking a set row (a kept set, a community, a path) selects the set as an object: the inspector shows the set; its members are drawn with a faint member outline, not as selected, and are not the target of commands. Enter replaces the selection with the members ("Select members"); Shift+Enter from a member returns to the set it was entered from, and does nothing when the member was not reached from a set, because membership is many-to-many and there is no single parent. Commands on the set (colour, hide, export, run a measure scoped to it, Keep) take the set itself as their target, so a set larger than the selection cap is never truncated; only Enter, which really produces a selection, is subject to the cap and says so when it truncates                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| A mixed selection is titled "N selected"; the type row shows only commands valid for every member; sections keep the fixed order; a kind-specific section appears when at least one member has it; differing values read "Mixed" (section 4.7)                                                                       | Transfers with adaptation. _Commands superseded: the type row carries Create set, Filter to, Filter out, Delete and Export; Keep and Hide are not graphty commands (`glossary.md` 9, 13)_                                                                                                                                                                                                                                                                                                                                               | For nodes, edges and sets selected together: title "N selected" (kinds not spelled out in the title, as in Figma); the type row carries only commands valid for all members (Keep, Hide, Delete, Export). Sections follow the fixed order and a section appears when at least one member has it, as Typography does; an edit in a kind-specific section (Node shape, Edge arrow) applies to the members of that kind only. Adaptation: because a graph selection is often thousands of nodes and a few edges, each kind-specific section header carries the count it applies to ("Nodes 412", "Edges 3"), which Figma never needs with a handful of layers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| With nothing selected Figma shows at most three sections, at most two fixed rows under any header, lists only of the file's own definitions, no commands except "+" on its own lists; the panel scrolls and never collapses (section 4.8)                                                                            | Transfers unchanged, as a ceiling graphty must meet. _Superseded by `principles.md` 5 and the departures table: at most four sections at rest, one of them Statistics as a recorded departure; which three others is the information architecture's decision_                                                                                                                                                                                                                                                                           | graphty's nothing-selected inspector must be split to fit: **Graph** (node and edge counts, density, components, the degree histogram, and the weight and direction declarations as property rows, the equivalent of Figma's Page section), **Style layers** (the ordered stack, the equivalent of local styles), **Views** (saved views, the equivalent of Flows, but in the one tab), **Export**. Four sections, one more than Figma, justified by the style stack and views both being lists of the reader's own definitions. Measure commands are not rows here: they are verbs, so they go where Figma puts verbs (the catalogue panel, the palette and "+" on a list header), and the Graph section offers each unrun whole-graph reading as a single "+"-style action on its own row, not as a command list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Long operations report through one global toast with a Cancel control; there is no status bar and no progress on an object; only one runs at a time (section 4.9)                                                                                                                                                    | Superseded by `principles.md` principle 2, which keeps Figma's toast with Cancel and puts only a run's state (such as Queued) on its row. Original verdict: does not transfer as the home for progress; transfers for completion                                                                                                                                                                                                                                                                                                        | graphty runs can queue and run side by side while the reader keeps working, which Figma never allows, so a single toast cannot carry their state. Progress lives on the result's own row (in the tree and in its inspector): queued, running with a determinate bar or an indeterminate one, done, failed with its reason, cancelled; Cancel is on the running row. The toast keeps Figma's job: one line on completion or failure of a run the reader is no longer looking at, with one action ("Show result"), replacing any earlier toast. This also follows the rule elsewhere in these notes that status is shown on the object wherever it is read, never only in a distant indicator                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Every large catalogue of insertable or runnable things has a browsable rail panel with search and category filters, and the palette as a second route; nothing insertable or runnable is palette-only; commands can be palette-only (section 4.10)                                                                   | Transfers unchanged as the rule that nothing runnable is palette-only. _Placement superseded by `information-architecture.md` 3: the catalogue is the lower part of the Results panel, in the shape of Figma's Assets panel, each row's description in its (i) and a cost word only for 10 s or more; layouts are chosen in the Layout row's popover, a browsable list_                                                                                                                                                                 | The algorithm and layout catalogue (over 100 entries) earns a rail panel on Figma's Tools precedent: search, category filters, one row per algorithm with a one-line description and a cost hint, run (or drag onto a set) from the row. The palette (Ctrl+K) lists the same entries as a second route, and "+" on an inspector list header offers the few entries relevant to that object as a third. The inspector never hosts the full catalogue, as Figma's never does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Comment pins are visible in Design mode; the full list is a mode that replaces the inspector; commenting is by canvas position (C, click, type), never on the selection; the object-attached note is the annotation, stored on the node (section 4.11)                                                               | Transfers with adaptation. _Confirmed by `conceptual-model.md` 6.2: note markers are drawn by default, as Figma draws comment pins, and Shift+C hides them_                                                                                                                                                                                                                                                                                                                                                                             | Notes follow the annotation model for storage (on their targets, in the project file) and the comment model for reading (a marker on the canvas beside each target, visible by default, hidden from the view menu). Adding a note to the selection is a depth-zero action in the selected object's inspector: a Notes section, empty as one header row with "+", listing that object's notes. The list of all notes keeps Figma's comment mode: a note tool (C, Figma's comment key) whose panel replaces the inspector with search and filters, entered only to review or tidy notes. Because a note is read from its marker and written from its target's inspector, the everyday path never enters the mode, so the mode hiding the inspector costs nothing. The Notes section is a **documented departure**: no Figma inspector lists commentary for an object, and annotations, though stored on the node and possibly several per node, are read only on the canvas (section 4.11). Reason for the Notes section: graphty notes are the analyst's findings about particular objects, read beside those objects' values, whereas Figma's comments are a conversation about a region of a design, which is why Figma can leave the selection out of its route                                                                                                                                      |
| A lasting command earns a depth-zero type-row control when it makes the selection a new kind of object (Create component, Boolean, Mask); wrapping commands (group, frame, section) live in the context menu and shortcuts; nothing Figma makes stores a rule, and no search result persists (sections 4.3 and 4.12) | Transfers with adaptation. _Vocabulary superseded by `glossary.md` 9: the command is Create set, and "Keep" is not a verb_                                                                                                                                                                                                                                                                                                                                                                                                              | Keep is graphty's Create component: a depth-zero icon on the type row of any selection, of a result group (a community, a path) and of a query. Adaptation, and a documented departure: Figma only ever keeps the layers selected at that moment; graphty's Keep on a query or a result group stores the rule (the query, or the run and its group), so the kept set follows the data and is built from the rule, never by first selecting its members, and so is never cut to the selection cap. Keep on a hand-made selection stores the members by id                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Undo covers the document, carries the selection with it, treats a long operation as one step; zoom is per tab and not documented as undoable (section 2.8)                                                                                                                                                           | Transfers with adaptation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | graphty-element's journal records document state: data edits, style layers, runs and their removal, visibility, pinning, and layout positions once kept. Each step restores the selection it was taken with, but a selection change alone is not a step (the change Figma's users asked for). Camera, zoom, panels, tabs and modes are not in the journal. A run is one step; undoing it removes its result without recomputing, and redoing it reinstates the cached result without running again, so an expensive run is never paid for twice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A definition row opens an editor and never becomes the selection; only a definition with a body on the canvas is selectable, through "Go to"; hovering a definition row outlines nothing (section 4.13)                                                                                                              | Transfers with adaptation, sorted by the body test. _Confirmed by `principles.md` (worked conflict on the result editor): a result's row opens its editor in a popover and a result is never selected. Select painted confirmed by `information-architecture.md` 4_                                                                                                                                                                                                                                                                     | graphty's rows split by section 2.4's test, "can you draw a selection box around it?". **A set, a community or a path has a body** (its members on the canvas), so it is a primary object: clicking its row selects it, the inspector shows it, Escape clears it, and hovering the row outlines its members, which is Figma's layer-row hover applied to an object whose body is its members (on the paved path). **A measure and a style layer have no body**: clicking the row opens its editor in a popover to the left of the inspector, the canvas selection stays, and Escape closes the popover only (Figma's style row). They get no inspector identity of their own. Hovering a style-layer or measure row outlines the elements it paints or covers: a **documented departure**, because Figma's styles never overlap while graphty's selectors do, so "which nodes does this touch?" is a constant question (section 2.6); the explicit route is the row's "Select painted" icon, which produces an ordinary selection                                                                                                                                                                                                                                                                                                                                                                      |
| A single-column list of the file's definitions stays in the inspector and scrolls; multi-column and sortable tables leave the side panels; an object's inspector cuts a list to three or four items and "N more" (section 4.14)                                                                                      | Transfers with adaptation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **The style-layer stack stays in the nothing-selected inspector**, as local styles do: one column, tens of rows, scrolling, with folders only if real files need them. **A partition's community table, a path family's path list and a set's member list do not live in the inspector**: they have several value columns, sort and a select action, so by Figma's rule they belong outside the side panels, which in graphty is the table dock (the canvas-linked analogue of the floating Variables window). The object's inspector shows its count and the first three or four rows (largest communities, shortest paths) and an "N more" row that opens the table dock scoped to that object. Adaptation: Figma's "N more" expands inline; graphty's lists run to hundreds, so "N more" hands off to the dock instead                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Dense status sits under a selection, leads with five or six totals, packs related numbers into one figure and cuts lists to "N more"; state that changes the whole canvas is shown outside the inspector (section 4.15)                                                                                              | Transfers with adaptation. _Superseded in part by `principles.md` 1 and 5: the six headline readings are nodes, edges, density, weakly and strongly connected components and the degree distribution (direction folds into the edges row's name and the weight into its "weight: unknown" mark row); only edges carry "of", because the filter chip states the node count_                                                                                                                                                              | **The whole-graph summary keeps the nothing-selected ceiling by packing, not by adding sections.** The Graph section leads with six headline readings in a compact two-column figure (nodes, edges, density, components, direction, weight), each loaded-versus-visible pair written as one value ("412 of 5,000"), as Dev Mode's box model packs a dozen numbers into one figure; the degree histogram follows; further readings sit behind one "N more" row. Adaptation: Figma shows dense status only under a selection; graphty's whole-graph reading is a top task, so the density moves to the nothing-selected state and is contained by Figma's own disclosure devices. **Filter status is not in the inspector at all**: it is a persistent chip in the header's second row beside the zoom control ("Filtered: 412 of 5,000 nodes"), visible whatever is selected, opening the filter on click, as Figma's zoom percentage is. This avoids Figma's weakness of a content-hiding toggle visible only inside a menu                                                                                                                                                                                                                                                                                                                                                                            |
| Figma evolves its format additively (optional fields, new code reads old documents), versions its plugin API by a declared number it never upgrades silently, and restores a version by appending, never by branching (section 2.10)                                                                                 | Transfers unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | The project file and `StyleDocument` carry a version number (as `StyleDocument` version 1 already does, `graphty-today.md`) and a reader that tolerates and preserves unknown optional fields. With that in place, a later field is an additive change: keeping a run's values, adding fields to a note, adding a time key. Those become two-way doors once the tolerant reader ships, so the owner decides now only (a) the tolerant-reader rule itself and (b) anything whose meaning an old reader would get wrong by ignoring it, which must bump the version. Restoring an earlier saved version of the project appends a new version; a branch arises only from an explicit act, as Figma's Create branch is an explicit command (see section 5.6 on the analysis tree)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### 5.6 Contradictions between this note and others, resolved

1. **Where version history appears.** The measured study finds version history in the File menu
   (`left-sidebar/README.md` section 2); Figma's help says "Figma will show the file's version
   history in the right sidebar." Both are true: the File menu is the entry, the right sidebar is
   the surface while it is open, as sections 2.1 and 2.4 state.
2. **Who owns undo.** `graphty-today.md` records that the element API design gives the undo
   stack to the consumer and the journal to the element, while an earlier object-first decision
   gives undo to the element. Figma's evidence sides with the element: Figma's undo is defined
   over the document model, per user, carries the document's selection, and bundles an
   operation such as a plugin run into one step. Those rules can only be kept by whatever owns
   the document and the runs, which in graphty is graphty-element; a consumer-side stack would
   have to reimplement them, which the architectural principles forbid. The app shows undo and
   redo; the element owns the stack.
3. **Whether a lens tab is a valid home.** "A second lens on the same selection" (section 5.2)
   holds only with conditions: Figma's tabs hide whole domains (section 4.5), so a graphty lens
   tab follows the paved path only under the four conditions in section 5.5.
4. **Search results.** `graph-analysis.md` classes a search query as transient with a selection
   as its result; `graph-tools.md` treats selection as transient state rather than an object.
   Figma's Find agrees with both (section 4.3), so no contradiction remains: Find returns a
   selection, and a set is made from it by a separate command.
5. **What a style layer does when the run it paints is deleted.** `design-method.md` says a style
   layer is a live rule that follows whatever its input does, which could be read as "the layer
   goes when its run goes". Figma's evidence (section 2.7) is that no dependent is ever deleted
   with its definition. Both hold: following means re-evaluating when the run's values change;
   deletion leaves nothing to follow, so the layer freezes at its last values, says so on its row,
   and offers Restore run, as an instance offers Restore Component (section 5.5).
6. **Keep and the selection cap.** `graphty-today.md` records that the element's selection caps at
   5,000 elements and that `promote(name)` turns the selection into a saved scope. Keep built only
   on promote would silently cut a rule-made set to 5,000 members. Figma never faces this because
   it keeps only what is selected (section 4.12). The resolution is in graphty-element, not in
   the app: Keep must accept a query or a run's result group directly and store the rule, and
   promote stays the route for a hand-made selection only. Until the element offers that, Keep on
   a query is missing, not something the app may assemble from a truncated selection.
7. **Where run progress is shown.** Figma shows long operations only in a global toast
   (section 4.9); `design-method.md` places status on the value wherever it is read, with one
   aggregate line in the whole-graph summary. They agree once the reason for Figma's choice is
   seen: Figma has one operation at a time. graphty has a queue, so progress is on the result's
   row, and the toast keeps only Figma's completion role.
8. **Notes anchored to objects or placed on the canvas.** `graph-tools.md` records that
   Cytoscape's annotations are view elements placed at canvas positions, not attached to nodes.
   Figma has both kinds: comments at positions and annotations on nodes (sections 2.1 and 4.11).
   graphty notes are object-targeted, because a computed layout makes positions meaningless
   after the next re-layout; free text placed on a picture of the graph (a title on an exported
   image) is part of a view or an export, not a note.
9. **One override layer or a layer per override.** `graph-tools.md` section 20.4 recommends
   one visible override layer collecting every one-off change. Reading Figma's "Detach" as the
   model (section 2.7) could suggest a new style layer per override instead. Figma's own
   storage settles it for the single layer: an override is a field list on the instance keyed
   by the inner layer, never an object, and it is reset from the thing it changes (section
   2.9). The two notes now agree: one collected layer, reset per property and per element from
   the element's inspector, plus a count, "Select overridden" and "Clear all" on the layer's row,
   which is graphty's addition for the reason `graph-tools.md` gives.
10. **Whether Escape closes Figma's bottom dock.** The measured study disagrees with itself:
    `popovers-and-menus/README.md` section 10 says "Escape or the X closes it";
    `flows.md` section 9 and `accessibility/README.md` section 6.5 record that Escape did not.
    The accessibility pass walked the keyboard explicitly, so its reading is taken as Figma's
    behaviour, and section 1.3 already lists it as a weakness. graphty's dock closes on Escape
    when focus is inside it, and Escape on the canvas keeps its selection meaning.
11. **A linear version history against a branching analysis tree.** Figma restores a version by
    appending, never by branching (section 2.10), while `design-method.md` section 3.5 models
    the analysis as a tree of graph states that branches. Both hold because they are different
    objects: saved versions of the project file are Figma's versions and stay linear; the
    analysis tree branches only when the reader explicitly works from an earlier state, which
    is the counterpart of Figma's explicit Create branch, not of Restore.
12. _Overruled by `principles.md` 1 ("The chip alone marks the filtered node count")._ **Filter status in a distant indicator.** `design-method.md` warns that a mark shown only
    away from the value (Excel's status bar) goes unread, and section 5.5 above keeps run status
    on the result's own row for that reason. The header chip for filter status (section 5.5,
    dense status row) is therefore not the only mark: every count in the whole-graph summary
    also reads as "visible of loaded" on the value itself. The chip answers "is anything
    hidden?" whatever is selected; the pair answers it where the number is read.
13. **Whether Figma's inspector ever collapses.** Section 4.8 records that no section header
    collapses its section, and section 4.15 relies on Figma's in-section disclosures (Selection
    colors' summary line, Dev Mode's "N more"). Both are true: Figma never folds a whole section
    away, but it does cut a long list inside a section to a summary. graphty follows the same
    split.

### 5.7 What can be reverse-engineered from Figma, and what is graphty's own

**Taken from Figma** (the rules are settled by the paved path; only the content is graphty's):

- the frame: rail, left list, canvas, right inspector, floating toolbar, command palette
- selection mechanics: click, Shift+click, marquee, Escape, Enter / Shift+Enter, two-way hover
  link, "N selected", "Mixed"
- editing mechanics: add first with defaults, configure in a popover, commit on Enter, silent
  undo, no confirmations
- disclosure: empty sections as one row with "+", optional labels, tooltips with shortcuts,
  flyouts
- the placement rules in section 4.2
- the vocabulary conventions in section 3
- the rule that keeps secondary objects out of the tree (section 2.4), and the placement of
  each secondary kind: definitions in their own place applied from a property row, commentary in
  a mode with pins, history in the file menu, output as a property

**graphty's own** (Figma has no answer; graphty must decide, borrowing from graph tools):

- the ontology of graph objects: what counts as a primary object beyond node and edge, and
  how many-to-many membership is shown in a tree built for single parents
- derived objects: algorithm results that have provenance, parameters, staleness and cost
  (progress, cancel, CPU or GPU), and measures that are a value on every node rather than a set
- appearance as a mapping from data (colour by community, size by PageRank) stored as stacked,
  rule-based style layers
- whole-graph reading as the "nothing selected" state (counts, degree distribution, density,
  components)
- finding by data (queries over attributes and structure), not only by name
- a layout as a running process (running, paused, settled) and pinning a node against it
- time as an optional dimension of the data
- camera controls for 3D, VR and AR
- the import flow

For all of these, Cytoscape and Gephi are the first places to look for established terms and
solutions before inventing new ones.

---

## Sources

Figma's own writing:

- Inside the redesigned Figma: https://www.figma.com/blog/behind-our-redesign-ui3/
- Figma on Figma, our approach to designing UI3: https://www.figma.com/blog/our-approach-to-designing-ui3/
- Making the move to UI3: https://www.figma.com/blog/making-the-move-to-ui3-a-guide-to-figmas-next-chapter/
- How Figma's multiplayer technology works: https://www.figma.com/blog/how-figmas-multiplayer-technology-works/
- Building accessibility into a canvas-based product: https://www.figma.com/blog/building-accessibility-into-a-canvas-based-product/
- Inside Figma, the product design team's process: https://www.figma.com/blog/inside-figma-the-product-design-teams-process/
- Explore the navigation bar and left sidebar: https://help.figma.com/hc/en-us/articles/360039831974-View-layers-and-pages-in-the-left-sidebar
- Design, prototype, and explore layer properties in the right sidebar: https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar
- The difference between frames and groups: https://help.figma.com/hc/en-us/articles/360039832054-The-difference-between-frames-and-groups
- Organize your canvas with sections: https://help.figma.com/hc/en-us/articles/9771500257687-Organize-your-canvas-with-sections
- Guide to components in Figma: https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma
- Guide to variables in Figma: https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma
- The difference between variables and styles: https://help.figma.com/hc/en-us/articles/15871097384471-The-difference-between-variables-and-styles
- Add comments to files: https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files
- Guide to comments in Figma: https://help.figma.com/hc/en-us/articles/360039825314-Guide-to-comments-in-Figma
- Add measurements and annotate designs: https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotate-designs
- View a file's version history: https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history
- Select layers and objects: https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects
- Guide to the file browser: https://help.figma.com/hc/en-us/articles/14381406380183-Guide-to-the-file-browser
- Plugin API, node types: https://developers.figma.com/docs/plugins/api/nodes/
- Plugin API, Variable: https://developers.figma.com/docs/plugins/api/Variable/
- Plugin API, Reaction: https://developers.figma.com/docs/plugins/api/Reaction/
- Plugin API, Annotation: https://developers.figma.com/docs/plugins/api/Annotation/
- Plugin API, PaintStyle: https://developers.figma.com/docs/plugins/api/PaintStyle/
- Plugin API, BaseStyle: https://developers.figma.com/docs/plugins/api/BaseStyle/
- Plugin API, ComponentNode: https://developers.figma.com/docs/plugins/api/ComponentNode/
- Plugin API, commitUndo: https://developers.figma.com/docs/plugins/api/properties/figma-commitundo/
- Find and replace in Figma: https://help.figma.com/hc/en-us/articles/9141292269847-Find-and-replace-in-Figma
- Behind the feature, find and replace: https://www.figma.com/blog/behind-the-feature-find-and-replace/
- View and adjust colors in a mixed selection: https://help.figma.com/hc/en-us/articles/360042553434-View-and-adjust-colors-in-a-mixed-selection
- Make changes to components and instances: https://help.figma.com/hc/en-us/articles/360038665934
- View and explore library analytics: https://help.figma.com/hc/en-us/articles/360039238353-View-and-explore-library-analytics
- Swap libraries: https://help.figma.com/hc/en-us/articles/4404856784663-Swap-style-and-component-libraries
- Create and manage variables: https://help.figma.com/hc/en-us/articles/15145852043927-Create-and-manage-variables
- Move or edit comments: https://help.figma.com/hc/en-us/articles/360041547853-Move-or-edit-comments
- Review branch changes: https://help.figma.com/hc/en-us/articles/5693123873687-Review-branch-changes
- Compare changes in Dev Mode: https://help.figma.com/hc/en-us/articles/15023193382935-Compare-changes-in-Dev-Mode
- Adjust your zoom and view options: https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options
- Manage and share styles: https://help.figma.com/hc/en-us/articles/360039820134
- Create components to reuse in designs: https://help.figma.com/hc/en-us/articles/360038663154-Create-components-to-reuse-in-designs
- Detach instances from components: https://help.figma.com/hc/en-us/articles/360038665754
- Create and insert component instances: https://help.figma.com/hc/en-us/articles/360039150173-Create-and-insert-component-instances
- Use the actions menu in Figma Design: https://help.figma.com/hc/en-us/articles/23570416033943-Use-the-actions-menu-in-Figma-Design
- Use plugins in files: https://help.figma.com/hc/en-us/articles/360042532714-Use-plugins-in-files
- Publish a library: https://help.figma.com/hc/en-us/articles/360025508373-Publish-a-library
- View and manage comments: https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments
- Plugin API, how plugins run: https://developers.figma.com/docs/plugins/how-plugins-run/
- Plugin API, figma.notify: https://developers.figma.com/docs/plugins/api/properties/figma-notify/
- Plugin API, InstanceNode: https://developers.figma.com/docs/plugins/api/InstanceNode/
- Apply overrides to instances: https://help.figma.com/hc/en-us/articles/360039150733-Apply-overrides-to-instances
- Guide to Dev Mode: https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode
- Plugin manifest: https://developers.figma.com/docs/plugins/manifest/
- Plugin API updates: https://developers.figma.com/docs/plugins/updates/

Figma's document format, from the engineer who wrote its serializer:

- Evan Wallace, Figma (notes on his work there): https://madebyevan.com/figma/
- The kiwi serialization format: https://github.com/evanw/kiwi

Figma community forum (user reports; no staff answer in either thread):

- Reattaching unattached comments: https://forum.figma.com/suggest-a-feature-11/make-it-possible-to-reattach-unattached-comments-33090
- Excluding selection from undo: https://forum.figma.com/suggest-a-feature-11/user-preference-to-include-or-exclude-object-selection-in-undo-17503

Secondary (attributed to Figma, original not retrievable):

- Figma design principles as reproduced at https://principles.design/examples/figma-design-principles

Measured study in this repository:

- `design/ui/figma/README.md`, `flows.md`, `components.md`
- `design/ui/figma/left-sidebar/README.md`, `header-and-modes/README.md`,
  `right-sidebar-selection/README.md`, `bottom-toolbar/README.md`,
  `canvas-selection/README.md`, `popovers-and-menus/README.md`
- `tmp/ux-review/graphty-vs-figma-ux.md` (a comparison of the graphty app and Figma built on the
  same study)

## Follow-up: How Figma reads existing objects

This follow-up reads Figma as a practitioner would, from this note and the measured study in
`design/ui/figma/`. The question: does Figma have a pattern for
inspecting or querying objects that already exist, as opposed to its tools for making things?
Most of graphty's top tasks are questions about objects that already exist (which nodes matter,
how two nodes connect, what a community contains), so the answer decides how much of Figma's
information architecture carries over.

**Yes. Figma separates reading from making by mode, and every reading pattern is anchored on a
selection.** The evidence, pattern by pattern:

| Pattern                                                                               | What it reads                                                                                                                                                                                                                | Where it lives                                                                            | Anchored on                                                                      | Source                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dev Mode**                                                                          | the whole mode exists to read a finished design: the tool set shrinks to Move, Copy colors, Measurement, Annotation and Comment (no drawing tools), the right panel widens to 321 px and its tabs become Inspect and Plugins | the mode switch at the right end of the bottom toolbar, Shift+D; the chrome turns green   | the file                                                                         | `design/ui/figma/header-and-modes/README.md` section 7; [Guide to Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode): "The inspect panel displays design specs and relevant component information needed to understand a design" |
| **Inspect panel**                                                                     | ten dense read-only sections for the selection: a box-model figure, layout and style code, modes, colours, selection colours, assets, export; lists cut to three or four rows plus "N more"; every value copies on click     | the right panel in Dev Mode                                                               | the selection                                                                    | `header-and-modes/README.md` section 7; section 4.15 above                                                                                                                                                                                                         |
| **Inspect with nothing selected**                                                     | almost nothing: a page header and Code settings (language, unit)                                                                                                                                                             | the right panel in Dev Mode                                                               | nothing                                                                          | `header-and-modes/README.md` section 7                                                                                                                                                                                                                             |
| **Design inspector with nothing selected**                                            | the file's own definition lists (page colour, local styles, export settings; in Prototype, flows); three sections at most, no status                                                                                         | the right panel in Design mode                                                            | the page                                                                         | section 4.8 above                                                                                                                                                                                                                                                  |
| **Ready for dev view**                                                                | a filtered list of every design in the file marked ready; "You can filter and see all your designs that are marked ready for dev"                                                                                            | Dev Mode's left panel                                                                     | a status on frames                                                               | [Guide to Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode); `header-and-modes/README.md` section 7                                                                                                                             |
| **Focus view**                                                                        | "only one design that's ready for dev at a time", with its layers and an annotated version history                                                                                                                           | opened from Ready for dev                                                                 | one frame                                                                        | same help article                                                                                                                                                                                                                                                  |
| **Measurement between two objects**                                                   | the distance from the selection to the hovered object, drawn as red redlines; Alt in Design mode, always on in Dev Mode                                                                                                      | the canvas                                                                                | a selection plus a hover                                                         | `design/ui/figma/flows.md` section 1; `header-and-modes/README.md` section 7                                                                                                                                                                                       |
| **Find, Select matching layers, Select all with same, Selection colors' target icon** | every layer matching a text, an identical layer, or a shared property                                                                                                                                                        | Find replaces the layer tree; the others sit on the inspector's type row or the Edit menu | a selection or a typed string; the output is a new selection, never a saved list | sections 2.6 and 4.3 above                                                                                                                                                                                                                                         |
| **Compare changes**                                                                   | one frame against an earlier version, or two selected components against each other                                                                                                                                          | the Inspect tab                                                                           | the selection                                                                    | section 4.4 above                                                                                                                                                                                                                                                  |
| **Usage counts**                                                                      | how often each component, style or variable is used                                                                                                                                                                          | outside the editor, in Library analytics                                                  | the library                                                                      | section 2.6 above                                                                                                                                                                                                                                                  |

What a Figma practitioner takes from this, stated as rules:

1. **Reading has its own posture, not its own panel.** Dev Mode keeps the same canvas, tree and
   right panel and changes what they emphasise: fewer tools, denser read-only values, click to
   copy. graphty's analysts are in this posture most of the time, so the reading posture should
   be graphty's default, not a mode to switch into. Figma needs a mode only because its main
   users make things.
2. **Dense status appears under a selection, never with nothing selected.** The nothing-selected
   panel in both Figma modes is deliberately thin. A whole-graph summary therefore needs a
   selectable object to sit under -- the graph itself, selected like any other object -- rather
   than filling the empty inspector. _Superseded by `principles.md`, departures table, first row:
   the graph is never selected; its Statistics sit in the nothing-selected inspector as a recorded
   departure, within a four-section cap._
3. **A query ends as a selection.** Every Figma route that answers "which objects" (Find, select
   matching, select all with same, a Selection colors target) produces a selection that the
   inspector then reads and every command then acts on. Nothing is saved unless a separate
   command makes it lasting. This is the precedent for graphty's find and for the results of a
   question about existing nodes.
4. **A relation between two existing objects is read from one selection and one pointer.**
   Measurement answers "how far is this from that" with select plus hover and no dialog. The
   nearest graphty analogue is a path from the selected node to the hovered or second-selected
   node, reached from the node rather than from a separate path tool.
5. **The only browse-by-status list is small and purpose-built.** Ready for dev lists frames by
   one status flag. Figma has no general query language and no saved queries; a practitioner
   would not expect one in graphty's first design either, and would put a list of results by
   status (for example, the runs in the analysis tree) in the left panel, where Ready for dev
   lives.

Where the practitioner's advice stops: Figma's objects are made by the user, so "which of my
objects matter" is never a computation. In graphty the answer to most reading questions is an
algorithm result, which Figma has no counterpart for. The reading patterns above transfer; what
produces the thing to read does not, and section 5.7 already marks that as graphty's own.

## Follow-up: whether Figma has a precedent for reading a derived or scoped value

Question: graphty's inspector will show values that are computed (a centrality) or that depend on
a scope (a count over a restricted graph). Does Figma show a value that is derived from somewhere
else, or that depends on its context, and if so how? Where does the paved path stop?

**Figma has three precedents, all for values resolved from a definition, none for values
computed from the content.**

| Precedent                          | What is derived or scoped                                                                                                                                                                                                                                                                                                                                                                                                                              | How it is read                                                                                                    | Source                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Variable modes                     | a variable's value depends on the mode of the layer's container: "Objects with variables have their modes set to Auto by default. This means they take on the mode of their parent container. If their parent container is also set to Auto, objects continue up their layer hierarchy until they reach a container with a specified mode. If no parent containers have a mode specified, then the objects fallback to the collection's default mode." | the mode is set with "Apply variable mode" on the page or a frame; the resolved value appears in the property row | https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables; `design/ui/figma/header-and-modes/README.md` section 5                                                                                                                                      |
| Variable details in Dev Mode       | the value a layer actually receives, with where it came from: the details list "The name of the variable", "The name of the variable collection", "The variable's mode", "The variable's value and, if relevant, the chain of aliases to a raw value", "The scope of the variable (where it can be used)"                                                                                                                                              | the Inspect panel for the selection, opening a Variable details view                                              | https://help.figma.com/hc/en-us/articles/27882809912471-Variables-in-Dev-Mode; https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode ("View styles and variables applied to the selected layer. Additionally, you can view details about variables") |
| Component properties and overrides | an instance's value is the main component's unless overridden; Dev Mode shows "variant information, and component properties" for a selected component                                                                                                                                                                                                                                                                                                 | the Inspect panel                                                                                                 | Guide to Dev Mode (above); https://help.figma.com/hc/en-us/articles/360039150733-Apply-overrides-to-instances                                                                                                                                                            |
| Mixed selection                    | a value derived over a set: many selected objects with differing values show "Mixed"; Selection colors lists the colours used across the selection                                                                                                                                                                                                                                                                                                     | the Design inspector                                                                                              | `design/ui/figma/right-sidebar-selection/README.md` sections 6 and 18                                                                                                                                                                                                    |

**The pattern these share, and what transfers.**

1. **A value is shown with its name and its resolution context.** Dev Mode never shows a bare
   resolved number when a variable is involved: it shows the name, the collection, the mode that
   applied, and the alias chain to the raw value. For graphty: a computed value in the inspector
   shows the measure name, the scope it was computed over, and the run it came from, the same way.
2. **Scope is inherited from the container, and the nearest explicit setting wins.** Modes
   cascade down the layer tree with a fallback default. This is the closest Figma precedent for
   "which graph was this number computed over": the scope is a property of the context, stated
   once, inherited, and visible on inspection.
3. **A set is summarised in place.** "Mixed" and Selection colors are Figma's only aggregates over
   a selection, and they are reads of stored values, not statistics.

**Where the paved path stops.** Every Figma value is authored: a variable's mode values, a
component's defaults and an instance's overrides are all typed in by a person, and resolution is
a lookup. Figma's expressions ("Perform basic math operations with number values", "Generate
dynamic string values") run only inside prototype actions
(https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma), not as a
live computed property of a layer. Figma therefore has no precedent for:

- a value computed from the content itself (a centrality depends on the other nodes and edges,
  not on a definition);
- a value that goes stale when the content changes and needs recomputing;
- a parameterised computation whose inputs (algorithm, weight, resolution, seed) are part of the
  value's identity;
- a statistic over a set beyond "Mixed".
  The inspection pattern (name, context, chain to the source) transfers; freshness, parameters and
  the run that produced the value are graphty's own, and the precedent for them comes from Gephi's
  and Cytoscape's result columns (`graph-tools.md`), not from Figma.

## Follow-up: how many words of app text Figma shows for one selected object

Question: how much interface text (labels and headings, not values) does Figma's right panel
carry for a selected object? This sets graphty's word budget for a selected object from
measurement rather than a guess between 25 and 40.

**Method.** The whole-panel captures in `design/ui/figma/right-sidebar-selection/` (the
`<target>-panel.png` files, Design tab) were read and every visible word of app text below the
tabs was counted by hand. Counted: section headings, field labels, the single-letter field
prefixes (X, Y, W, H, each one word), checkbox labels and hint text. Not counted: the layer name,
numbers, colours, style and font names, the current value of a dropdown ("Inside", "Hug",
"Mixed", "Drop shadow"), user-defined component property names, and the header chrome above the
panel (Share, Design, Prototype, zoom). Screen-reader-only labels (1 x 1 px boxes in the
`.styles.json` files) are not visible and not counted.

| Capture                          | Selection                                                             | Headings | Field labels | X Y W H | Hints | Total  |
| -------------------------------- | --------------------------------------------------------------------- | -------- | ------------ | ------- | ----- | ------ |
| `ellipse-effect-panel`           | ellipse with one effect                                               | 7        | 7            | 4       | 0     | **18** |
| `text-panel`                     | text with a text style                                                | 8        | 9            | 4       | 0     | **21** |
| `instance-variant-panel`         | library button instance (Export heading below the capture edge added) | 11       | 9            | 4       | 0     | **24** |
| `component-panel`                | main component, auto layout                                           | 14       | 14           | 4       | 0     | **32** |
| `frame-autolayout-effects-panel` | auto layout frame, stroke, 3 shadows                                  | 13       | 16           | 4       | 0     | **33** |
| `multi-mixed-types-panel`        | 3 layers of mixed types                                               | 10       | 15           | 4       | 5     | **34** |
| `s-al-full-panel`                | auto layout frame with every section filled                           | 13       | 21           | 4       | 0     | **38** |

**Readings.**

- Range 18 to 38 words, median 32, mean 29. The simplest selection carries 18 and a fully
  populated one 38; nothing exceeds 40.
- Headings are a third to a half of it (7 to 14), always one or two nouns ("Position",
  "Auto layout", "Selection colors").
- Labels average 1.2 words. The longest app string in any capture is the empty-state hint
  "Click + to replace mixed content" (5 words); every other string is 1 to 3 words. There are no
  sentences, and no line carries more than one label.
- Values outnumber labels: most rows are a one-word label over one or two values.

**Budget.** Measured: about 30 words of app text for a selected object's whole panel, 40 as the
ceiling for a fully populated one, and at most 3 words per label (5 for a one-off empty-state
hint).

## Follow-up: the worst-case result row counted against that budget

The worst case combines every qualifier the model allows on one computed result: an estimated
(sampled) value, out of date, computed on a filtered scope, with its full record line (scope,
engine, weight role and conversion, sampler, Details; `glossary.md`, "record line"). Only one
state line is shown, and "Out of date" outranks the scope line (`conceptual-model.md` 7.1), so the
scope moves to the record line.

```
Betweenness                       estimated     Out of date   Re-run
on: filtered graph, 1,204 of 50,000 nodes. Engine: CPU. Weight: distance (cost).
Sampled: 100 of 1,204 sources, seed 42. Details
```

|             | Total words | App text (as counted above)                                                                                       |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Row line    | 6           | 5 ("estimated", "Out of date", "Re-run")                                                                          |
| Record line | 21          | 12 ("on:", "filtered graph", "of", "nodes", "Engine:", "Weight:", "Sampled:", "of", "sources", "seed", "Details") |
| **Row**     | **27**      | **17**                                                                                                            |

With the GPU named as the glossary spells it ("Engine: WebGPU (NVIDIA GeForce RTX 4070 SUPER)") the
record line gains 5 more words of value.

**Against the budget.** One worst-case row is 17 words of app text: more than half of Figma's
median panel (32) and nearly all of the simplest one (18). Its record line is 12 app words on one
line where Figma's longest string is 5. Two such rows in one inspector exceed the 40-word ceiling.

**What fits.** A record line that shows only clauses that differ from the default, with the rest
under Details:

```
Betweenness                       estimated     Out of date   Re-run
on: 1,204 filtered nodes. Sampled. Details
```

App text 10 (5 on the row, 5 on the record line: "on:", "filtered", "nodes", "Sampled",
"Details"), 12 words in all. Engine, weight role, sample size and seed move to Details unless they
are not the default (a weight of unknown role, a GPU run whose digits differ from the CPU's).
That is a third of the budget for the worst case, and the ordinary current, exact, whole-graph
row is its name alone.

## Follow-up: the heaviest inspector for a selected result, counted against 30 and 40 words

Question: write out the inspector for a selected result in its heaviest ordinary state -- values
from a sample, out of date, computed on a filtered scope, a result that writes two measures -- with
a record line that shows only the clauses that differ from the defaults. Count the app text by the
method of the follow-up above ("how many words of app text Figma shows for one selected object":
headings, labels, state words and verbs count; values, counts and names do not) and test it against
the rule that a number never misstates what it describes (`key-insights.md` 3.1, with 3.2 "a caveat
is data" and 3.3 "status is shown on the value"). No principles document exists yet, so that rule is
taken as the first principle here.

The two measures are shaped like HITS, which writes a hub score and an authority score. One run
produced both, so they share one state line and one record line (`conceptual-model.md` 7.1 allows
one state line beside a value; the record belongs to the run, section 3.2).

```
Metric                                        Re-run  ...
HITS
~ Estimated   Out of date
on: 1,204 of 5,310 nodes, filtered. Sampled. Details

Attributes
  Hub score          ~0.000 to 0.412
  Authority score    ~0.000 to 0.387
Appearance
  Color              Hub score
Used by
  2 style layers, 1 set
```

| Part              | App words | Which                                                                                        |
| ----------------- | --------- | -------------------------------------------------------------------------------------------- |
| Type row and verb | 2         | "Metric", "Re-run"                                                                           |
| State line        | 4         | "Estimated", "Out of date"                                                                   |
| Record line       | 6         | "on:", "of", "nodes", "filtered", "Sampled", "Details"                                       |
| Attributes        | 7         | heading; "Hub score" and "Authority score", counted as labels to be strict; "to" on each row |
| Appearance        | 2         | heading, "Color"                                                                             |
| Used by           | 5         | heading (2), "style layers", "set"                                                           |
| **Total**         | **26**    |                                                                                              |

26 words: under 30 and well under 40. Drawing each range as a small bar instead of "a to b"
brings it to 24.

**What principle 1 forces onto the surface, and what it does not.**

- Must stay visible: the estimate mark "~" at every value, "Out of date", the scope as a fact, and
  how many elements the numbers leave out. "Missing is not zero" (`conceptual-model.md` 3.1) asks
  that the exclusion be counted where the number is shown; writing "1,204 of 5,310 nodes" once on
  the shared record line covers both measures for 1 extra word. Repeating "4,106 not computed" on
  each row instead costs 3 more words net (29, just under the target).
- Must surface when it applies: a weight of unknown role, because reading a distance as a
  similarity inverts what a path-based measure means. "Weight: cost (role unknown)" adds 4 app
  words, 30 in total -- on the target.
- May go under Details without misstating anything: the sample size and seed (they change the
  error of the number, not what it describes, and "~" already says it is an estimate), the engine,
  the sampler, the parameters.

**Where the budget breaks.**

- The full record line instead of the differences only ("on: filtered graph, 1,204 of 5,310
  nodes. Engine: CPU. Weight: distance (cost). Sampled: 100 of 1,204 sources, seed 42. Details"):
  12 app words instead of 6, so 32 -- over the 30 target, under the 40 ceiling.
- A state line and a record line per measure: 10 more words, 36, and 40 with the weight role -- at the ceiling. So the
  budget survives principle 1 only if the state and record lines belong to the run and are shown
  once, however many measures the run wrote.
- Three measures or more: each adds about 3 words (its name and "to"). The ceiling is reached
  near eight measures, which no built-in algorithm writes.

**Caveat for the element.** No built-in algorithm in graphty-element declares an approximate
method today (`approximable` is declared in `graphty-element/src/catalog/types.ts` line 524 and
set by no descriptor in `catalog/algorithms.ts`), so the "Estimated" and "Sampled" words cannot
yet appear on a real result. The count above is the budget for when one does.

## Follow-up: app words and sections in Figma's nothing-selected state

Question: how many words of app text, and how many sections, do Figma's panels show when nothing
is selected? This checks the budget of about 25 words and at most three sections for graphty's
nothing-selected state.

Counted by the same method as the selected-object count above, from the captures:

| Capture                                                                    | Panel                | App text                                                                                                                                                   | Words                                                          | Sections                                                                               |
| -------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `design/ui/figma/right-sidebar-selection/nothing-panel.png`                | right, Design tab    | Page; Show in exports; Styles; Export; Export (button, before the file name); Preview                                                                      | **8**                                                          | 3 (Page, Styles, Export), then a dismissible card of plugin icons                      |
| `design/ui/figma/right-sidebar-selection/right-panel-nothing-selected.png` | right, Design tab    | the same, plus MCP and "No connections" on a connections row                                                                                               | **11**                                                         | 3, plus the connections row                                                            |
| `design/ui/figma/right-sidebar-selection/nothing-prototype-panel.png`      | right, Prototype tab | a promotional card ("Add interactivity with Make", a 13-word sentence, "Try Figma Make"), then Prototype settings                                          | **22**, of which 20 are the dismissible card; **2** without it | 1 in the capture (Prototype settings); Flows sits below the capture edge (section 4.8) |
| `design/ui/figma/left-sidebar/00-left-default.png`                         | left                 | the rail labels File, Agents, Assets, Tools, Variables; Drafts; Pages; Layers (the file, page and layer names are content; a hover tooltip is not counted) | **8**                                                          | 2 (Pages, Layers) under the file header                                                |

**Readings.**

- The right panel with nothing selected carries 8 to 11 words of app text, about a third of the
  median for a selected object (32). Counting every visible token instead -- tabs, the zoom value,
  the colour, percentage and export values -- the Design tab of
  `right-panel-nothing-selected.png` shows 23. That is where "about 25 words" at rest comes from
  (`tmp/ux-review/graphty-vs-figma-ux.md`, "What the words are"): it counts everything on the
  panel, not app text alone.
- Three sections is the ceiling in the Design tab, and the Prototype tab stays under it. The only
  thing that exceeds the word count is a promotional card the user can close.
- The left panel adds 8 words, 5 of them the rail's labels, with 2 sections.

**For graphty's budget.** The budget holds as a ceiling: about 25 words counting everything
visible, or about 10 words of app text, and at most three sections. The measurement argues for
the lower figure as the target when app text alone is counted, because Figma's app text with
nothing selected is almost entirely section headings.

## Follow-up: Figma evidence for the information architecture -- the nothing-selected panel, header commands, popover capacity, note values and word counts

Five questions, answered from the Figma study in `design/ui/figma/` and the budgets in
`principles.md` principle 5 (app text counted as there: headings, labels, state words and verbs
count; names, values and counts do not; each visible (i) counts one).

### What Figma's right panel shows with nothing selected

Read from `design/ui/figma/right-sidebar-selection/dump-nothing-selected.txt`,
`right-panel-nothing-selected.html` and `design/ui/figma/header-and-modes/README.md` sections 5
and 6:

- **Design tab.** Three sections. **Page**: an "Apply variable mode" icon in the header, the page
  colour row with its eye, and a "Show in exports" checkbox. **Styles**: in a file with no local
  styles, a single header with "+" (Create style, a small menu of Text, Color, Effect, Layout
  guide); with local styles, one row per style, grouped by type and optionally foldered
  ([Manage and share styles](https://help.figma.com/hc/en-us/articles/360039820134)).
  **Export**: a "+" header, one 32 px row per export setting (scale, format, advanced "...",
  remove), an "Export <page name>" button 208 px wide, and a collapsible Preview. Below them a
  dismissible promotional card.
- **Prototype tab.** Prototype settings (device, background) and **Flows**, one row per flow
  with hover actions (select the starting frame, copy link, preview).
- **Not there:** local variables are not listed in the panel. With nothing selected the only
  variable control is the Page header's "Apply variable mode" menu; the variables themselves live
  behind the left rail's Variables button (`design/ui/figma/left-sidebar/00-left-default.png`).
  No command in the panel acts on the whole page except Export; every other control is a "+"
  that adds to the panel's own lists (section 4.8 above).

So Figma's nothing-selected panel is the file's applied definitions (styles), its outputs
(export settings) and, in the other tab, its saved walkthroughs (flows). A saved view in graphty
matches flows (a named starting point that is opened and presented) more closely than it matches
export settings.

### Is there a header icon precedent for a command like Run layout?

Only a partial one. Figma's right header holds the avatar stack, **Present** and **Share**, then
the mode tabs and the zoom menu (`header-and-modes/README.md` sections 3 and 4). Present is a
split button: a 32 px play icon that runs the prototype, and a 16 px chevron that chooses what
the icon runs (Present or Preview). That is the precedent for "one icon that runs, one chevron
that picks the variant". But no header control in Figma changes the document: Present opens a new
tab, Share opens a dialog, zoom changes the viewport. Figma's own command that rewrites positions,
**Tidy up**, lives in the selected object's alignment row under "More actions" and as a hover
icon on a multi-selection on the canvas (`right-sidebar-selection/README.md` line 274,
`canvas-selection/README.md` line 152), never in the header. A Run layout icon in the header
therefore borrows Present's form for a command whose effect (moving every node) Figma always
keeps next to the selection or the object it changes.

### Can a 240 px result-editor popover hold a histogram, the top 5 values and "N more"?

Yes, on width, words and height at the study's 1000 px panel height; it is tight on a short
screen.

- **Width.** Figma's popovers are 240 wide with 16 px side padding, so 208 px of content; rows
  are 32 px apart with 24 px controls; the label column runs from x+16 to x+96
  (`popovers-and-menus/README.md` lines 229 to 240). The colour picker already puts a 208 x 208
  saturation field and 180 x 24 sliders in the same 240 px shell and stands 537 px tall
  (`flows.md` section 5; `header-and-modes/README.md` section 5). A 208 x 64 histogram is well
  inside that precedent. Five top-value rows fit as a label (about 120 px, roughly 20 characters
  of 11 px text, truncated with an ellipsis as Figma truncates layer names) and a right-aligned
  value (about 80 px).
- **Words.** The heaviest result editor counts 21 words of app text (`principles.md`, "The
  heaviest result editor"). A histogram whose axis is the attribute's name adds nothing; a
  "Highest" caption 1; "N more" 1; a Highest/Lowest switch 1: **24**. A tie at rank 5 (degree has
  many) needs "N tied" so that the list does not misstate rank: 1 more, **25**. A result that
  writes two measures (HITS, 26 words before) with one histogram and a measure switch reaches
  about **29**. All under 30.
- **Height.** About 40 (header) + 10 rows x 32 (the editor's own rows) + 80 (histogram and its
  gap) + 5 x 24 (top values) + 24 ("N more") = about 590 px. Figma pushes a tall popover up to
  fit and the colour picker is 537 px, so it fits a 1000 px panel; at the study's 800 px viewport
  capture it would not fit without scrolling (whether Figma scrolls a popover was not measured).

So the budget does not force the run to open the table. Opening the table on its own after every
run would also be an interface appearing unasked, which `principles.md` principle 5 limits to a
closed list. The route the evidence supports: "N more" in the popover opens the table sorted by
the new value.

### Does a reviewer in note mode need the target's values, and has Figma solved it?

The study confirms that Figma's comment mode replaces the inspector with a Comments panel
(`flows.md` section on comment mode; section 4.11 above). Figma's other commentary object, the
Dev Mode **annotation**, solves the value question inside the note: "You can annotate a layer's
defined properties, like alignment direction or sizing, or provide additional details with free
text", and "Even if designs are later updated, annotation properties stay up-to-date and
accurate" ([Add measurements and annotate designs](https://help.figma.com/hc/en-us/articles/20774752502935-Add-measurements-and-annotations-in-Dev-Mode)).
The walk through the two investigation workflows is in `design-method.md`, follow-up on workflow
counts for the information architecture; its result is that every review step needs a few
values of the note's target. Figma's precedent is to carry the chosen properties in the note,
not to keep the inspector open beside the comments. For graphty that means a note can pin
attributes of its target; because a graphty note stores its own copy (`key-insights.md` 1.12)
and evidence must hold as written, a pinned value shows the value at writing and marks it when
the live value differs.

### Word count of the resting graph inspector, and of the worst-case result row

The resting graph inspector may carry 32 words, 25 of them the Statistics, leaving **7** for
everything else (`principles.md`, "The graph's inspector at rest"). Counting a Layout row inside
Statistics and three more sections (Style layers, Notes, Export with view rows); a layout's
name, a layer's attribute and a view's name are names and do not count:

| Part                  | Empty (icons only) | Ordinary                                     | Heavy                                                                          |
| --------------------- | ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------ |
| Layout row            | "Layout" 1         | "Layout", Run as a word: 2                   | "Layout", "Running", "Stop": 3                                                 |
| Style layers          | heading 2          | heading 2, one automatic "Color by" row 2: 4 | heading 2; "Color by" 2, "Size by" 2, "3 covered" 1, "2 more" 1: 8             |
| Notes                 | heading 1          | heading 1 (note rows are the analyst's text) | 1                                                                              |
| Export with views     | heading 1          | heading 1, view rows 0, "Export" button 1: 2 | heading 1, a view's "Changed since applied" 3 and "Update view" 2, button 1: 7 |
| **Beyond Statistics** | **5**              | **9**                                        | **19**                                                                         |
| **Inspector**         | **30**             | **34**                                       | **44**                                                                         |

The empty case fits the 7; the ordinary case is 2 over the 32 target and inside the 40 ceiling;
the heavy case is over the ceiling before any principle-1 mark row is added (those can add up to
5 more). What breaks the budget is not the headings but live rows with states: an automatic
layer's "Color by", a covered count, a view's state line.

The worst case for one result row with every mark on (a sampled betweenness, out of date, on a
narrower scope, costly, with elements outside its scope and its automatic layer covered):

| Mark                                                                                | App words    |
| ----------------------------------------------------------------------------------- | ------------ |
| "(sampled)" variant word and the name's (i)                                         | 2            |
| state line "Out of date - on: 1,204 nodes", Re-run, Details                         | 7            |
| cost band beside Re-run, "under an hour"                                            | 3            |
| "~" and "to" in the value range                                                     | 2            |
| "4,106 not computed"                                                                | 2            |
| "3 covered" in the layer list, or "covered by Color by degree" on its own layer row | 1 to 4       |
| **One row**                                                                         | **17 to 20** |

One such row is two to three times the 7 words the resting inspector has left. A list of results
with marks therefore cannot sit in the resting graph inspector; at rest it fits only as a heading
with a count, with the marks read in the result's editor, where the heaviest case is 21 words.

## Follow-up: the resting graph inspector recounted, the result editor at 800 px, the view editor's words, and comment mode's filters

Counted by the method in the follow-up on words for one selected object: headings, labels, state
words and verbs count; attribute names, layer and view names, values and counts do not; each (i)
at rest is one word.

### The resting graph inspector, heavy case, with views moved out

The inspector keeps four sections: Statistics (with a Layout row), Style layers, Notes, Export.
Views no longer sit in it. Each row carries at most one mark. The style-layer list shows at most
3 rows, then "N more", with covered automatic layers folded into one "N covered" row
(`conceptual-model.md` 6.1). The heaviest real stack is the one "Gene List to Interaction
Network with Expression Overlay" builds in its Encode phase: fill color by logFC, size by a
second column, label by display name, thicker borders for a few driver genes, over the automatic
layer of the connected-components run used to "select the largest connected component", which
the logFC fill covers.

| Part                                                                                   | Rows at rest                                                           | App words |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------- |
| Statistics, heaviest ordinary graph (`principles.md`, "The graph's inspector at rest") | as worked there, including "weight: unknown"                           | 25        |
| Layout row, running                                                                    | "Layout", "Running", "Stop"                                            | 3         |
| Style layers heading                                                                   | "Style layers"                                                         | 2         |
| Color by logFC, with its one mark                                                      | "Color by", "38 no value"                                              | 4         |
| Size by <column>                                                                       | "Size by"                                                              | 2         |
| Label by display name                                                                  | "Label by"                                                             | 2         |
| "1 more" (the driver-gene border layer)                                                | "more"                                                                 | 1         |
| "1 covered" (the components layer)                                                     | "covered"                                                              | 1         |
| Notes                                                                                  | heading only; note rows are the analyst's text                         | 1         |
| Export                                                                                 | heading and the "Export" button (Figma adds a collapsed "Preview": +1) | 2         |
| **Total**                                                                              |                                                                        | **43**    |

**Over the 40 ceiling by 3**, before any principle-1 import mark row (up to 5 more). With the
Layout row idle ("Layout" and a run icon, 1 word) it is 41. Two cuts bring it under without
losing a fact, because each removes a fact said twice:

- The Layout row drops "Running" and "Stop" while a layout runs: the run toast (name, progress,
  Cancel or Stop) is already on principle 5's closed list of things that appear unasked, so the
  row would say the toast's words a second time. -2.
- The logFC layer's "38 no value" mark moves off the layer row: the Attributes row already carries
  a mark when a join leaves values missing, which is the same 38 nodes. The layer draws them in its
  no-value color, which the legend states. -2.

With both: **39**. For the workflow's own graph (undirected, the largest component as the working
set, one component, a join that left 38 genes without values) Statistics count about 18, and the
inspector comes to about **36** running and **34** idle, or **34** and **32** with the no-value
mark said once. So the realistic heavy case is at the 32 target once views move out; only the synthetic worst case (the heaviest Statistics and the
heaviest style stack at once) needs the two cuts. The 3-row cap is what makes this work: an
uncapped list of the same stack is 4 layer rows plus a covered row, 2 words more, and each further
analyst layer adds 2.

### The result editor popover at an 800 px viewport

Figma's light popover: 240 wide, 40 px header, body rows 32 px apart, about 12 px body padding top
and bottom, "Height fits content", placed beside the row that opened it and "moved up to stay on
screen" (`design/ui/figma/popovers-and-menus/README.md` section 5). It is fixed-position and
clamped to the viewport, not the panel (the colour picker for a Fill row at y=575 opened at y=447
because it is 537 px tall). Menus that are too tall clamp to the viewport minus 6 px and scroll
with 24 px chevrons (`design/ui/figma/flows.md` section 4); whether a light popover scrolls was
not captured. Space at 800 px: about 788 px.

| Part                        | Ordinary heaviest (the sampled, out-of-date betweenness in `principles.md`) | Worst (a result writing two measures, state line wrapping, a tie at rank 5, elements outside the scope) |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Header and body padding     | 40 + 24                                                                     | 40 + 24                                                                                                 |
| Name, state line            | 32 + 32                                                                     | 32 + 48 (two lines of 11 px text in 208 px)                                                             |
| Attributes heading and rows | 32 + 32                                                                     | 32 + 64, plus a measure switch 32                                                                       |
| Histogram with its gap      | 80                                                                          | 80                                                                                                      |
| Highest / Lowest switch     | 32                                                                          | 32                                                                                                      |
| Top 5 values                | 120                                                                         | 120                                                                                                     |
| "N more" (and "N tied")     | 24                                                                          | 24                                                                                                      |
| "not computed" count        | --                                                                          | 32                                                                                                      |
| Appearance heading and row  | 64                                                                          | 64                                                                                                      |
| Used by heading and row     | 64                                                                          | 64                                                                                                      |
| Notes                       | 32                                                                          | 32                                                                                                      |
| **Height**                  | **about 608**                                                               | **about 720**                                                                                           |

**It does not overflow at 800 px**: 180 px spare for the ordinary case, about 68 for the worst. It
overflows below a viewport of about 620 px (ordinary) or 732 px (worst); a 1366 x 768 laptop
screen leaves about 650 px of browser viewport, so the worst case overflows there by about 70 px.
The order in which parts give way, from the evidence:

1. **The top values list shrinks from 5 to 3** (-48 px). Principle 5 already sets a list at three
   or four rows before "N more", and "N more" opens the table sorted by the value, which holds the
   same information in full.
2. **The histogram folds to a one-row toggle** (-48 px). It is a reading, not a mark, and the value
   range row above it states the extent.
3. **The body scrolls under a fixed header**, Figma's menu behaviour. Never collapsed: the name,
   the state line and every principle-1 mark, since those are what the popover exists to say.

### Words in a view's editor popover

A view's editor holds its title, caption, the notes it shows and its export settings
(`conceptual-model.md` 6.3). Figma's export row counts no words for its values (scale "2x", format
"PNG"), only the "Export" heading, the "Export <name>" button and "Preview" (see the follow-up on
the nothing-selected state).

| Part                                                                                 | Ordinary | Heavy        |
| ------------------------------------------------------------------------------------ | -------- | ------------ |
| Type row "View" and an "Apply" command                                               | 2        | 2            |
| "Title" and "Caption" labels (the text is the analyst's)                             | 2        | 2            |
| State line: "Data changed since applied", Update, Revert                             | 0        | 6            |
| "Notes shown" heading; note rows are note text; "N more" past three                  | 2        | 3            |
| Export heading, "Legend" toggle, "Export" button, "Preview"                          | 4        | 4            |
| Legend placement, if its choice words are counted (Figma's format and scale are not) | 0        | 2            |
| **Total**                                                                            | **10**   | **17 to 19** |

Well under the 30-word target and the 40-word ceiling. The heaviest part is the state line, which
principle 1 requires.

### Comment mode: filtering by target, and what clicking a comment does

- **No filter by target.** The Comments panel has a search field and a Sort/Filter menu with Sort
  by date, Sort by unread, Show resolved comments, Only your threads and Only current page
  (`design/ui/figma/header-and-modes/README.md` section 9). Figma's help lists the same five and no
  filter by frame, layer or author
  ([View and manage comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments)).
  The nearest scoping filter is by page.
- **Clicking a comment navigates; it does not select.** Selecting a comment in the list takes you
  to "that page and the location of the comment" and opens its thread (same article). Neither that
  article nor [Add comments to files](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files)
  says the attached frame is selected, and the study's captures do not record the click. A
  comment attaches only to a top-level frame, component or group ("Comments won't attach to any
  nested frames, components, groups, or other layers"), and moves with it; the layer a comment is
  about is never recorded, so Figma has nothing to select.
- **For graphty.** A note records its targets (`conceptual-model.md` 6.2), so both a target
  filter and "click selects the targets" are possible, and both are departures from Figma. The
  target filter is already covered without the mode: the Notes section of a target's inspector
  lists that object's notes (section 5.5 above). Clicking a note card in note mode can follow
  Figma exactly (frame the camera on the targets and open the note) without changing the selection;
  selecting the targets on click is the departure, and it is the one that gives the reader the
  target's live values, which the note-reading walk found three of four review steps need
  (`design-method.md`, follow-up on reading notes from their pinned values alone).

## Follow-up: Find's scope options and default, and whether undo restores the selection

**Find scope.** Figma's help confirms two scopes: "You can display results by your current page
or see results for all pages"
([Find and replace in Figma](https://help.figma.com/hc/en-us/articles/9141292269847-Find-and-replace-in-Figma)).
The article does not name a default. The editor study shows the default: every one of seven
captures of the open Find panel, taken in separate sessions and in both themes, reads "Search
scope set to This page" on the scope button (`interaction-flows/A4-find-results-IF`, `A4b`, `A5`,
`A6`, `left-sidebar/scratch-find-results`, `dark-theme/light-find-panel-results`,
`dark-find-panel-results`, all `.styles.json`; `interaction-flows/README.md` section 14 and
`left-sidebar/README.md` line 355). The scope dropdown itself was never opened, so the exact
label of the other option (written "All pages" elsewhere in these notes) is unverified; the help
text says "all pages". Whether Figma remembers a changed scope between searches was not tested.
Conclusion: two scopes, **current page by default**, confirmed.

**Undo restores the selection.** Confirmed by observation and by users, not by Figma's
documentation. The editor study observed that after Ctrl+Z "the canvas, panel values and
selection simply revert. The selection is restored to what it was at that step"
(`interaction-flows/README.md` section 9). A feature-request thread (July 2021 to May 2022)
shows users experience selection changes as undo steps of their own: "When I undo, I want undo
only changes that I've made to a document, not what I've selected" (July 2021), and one user
needed "to hit undo 8 times to undo an action ... because i needed to select thru 7 nested
autolayouts" (July 2021). No Figma staff reply appears in the thread
([forum request](https://forum.figma.com/suggest-a-feature-11/user-preference-to-include-or-exclude-object-selection-in-undo-17503)).
The help article on Find says nothing about undo. So section 2.8's rule stands -- undo carries
the selection back with each document step -- with one caveat worth designing against: Figma
appears to record selection-only changes as steps, which is the part users complain about. The
study observed the restore; it did not isolate whether a pure selection change with no edit
between undos is its own step.
