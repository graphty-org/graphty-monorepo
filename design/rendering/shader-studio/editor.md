# A friendlier shader editor

Today the graphty app's shader dialog is one plain text box holding GLSL with a JSON header. An author types JSON to
declare options, gets no highlighting, and opens the dialog fixed to one kind of shader. This design keeps the dialog,
its live preview and its problem list, and changes what surrounds them. No node graph, no IDE. See `editor-research.md`.

```
+----------------------------------------------------------------------------+
| New shader                                                             [x] |
| [ Node | Edge | Background ]                                               |
| Place [ On the node  v]  Name [ My paint   ]  Reach [ 2 ]  Min size [ 12 ] |
| +-------------------------------------------------------+ +-------------+  |
| | 1  vec4 shade(NodeInput n) {                          | |   preview   |  |
| | 2 *    float lit = 0.35 + 0.65 * max(dot(...          | |             |  |
| +-------------------------------------------------------+ +-------------+  |
| [Tab: Indent  Ctrl+M]  [Full text]  [Copy code]          How to write one  |
| Parameters                                                             [+] |
|  [ tint        ] [ Color  v] [ #FF7A00 ]                 [->] [gear] [-]   |
| Problems:  Line 2:5  Does not compile: ...                                 |
|                                                                      [Add] |
+----------------------------------------------------------------------------+
```

The window is Mantine's `Modal` at size `xl` (780 px; `lg` today). Its title stays "New shader", or "Edit shader" for
Duplicate and edit, which hides the switch because it edits one copy of one known shader. The close
button's tooltip reads "Close Esc".

## 1. Options without JSON

**The file format does not change, and the composed text is what the element judges.** The dialog holds a form state
(the header as written, a `ShaderTextDraft`) and a body, and composes the whole text from them. Every check, the preview
and Add use that text, so nothing can differ from a paste.

- Into the form, only when text arrives from outside (a paste, Duplicate and edit, a problem row moving text to another target, leaving Full text): the
  new `splitShaderText(text)` gives the header as written and the body.
- Out of the form, on every change: `formatShaderDraft(draft, body)`.

The app never parses or writes JSON. The split is lenient and the writer does not validate, so a half-typed row (an
empty default, min above max) composes, the check reports it on that row, and it survives every trip through text.
`parseShaderText` cannot fill the form: it returns nothing on any error, moves `shadeFar`, and adds an inferred
`motion`.

The top fields sit inside `<PanelLabelsProvider showLabels>`, as `BindingPopover.tsx` does, so their words are drawn.
Parameter rows stay outside it.

| Field        | Control                                                  | Header key | Behavior                                                                                                                                                                                                                                 |
| ------------ | -------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Place        | today's Place select with diagrams                       | `place`    | First in the row, with `data-autofocus`, below the target switch. Hidden for Background, where the code box takes `data-autofocus`                                                                                                       |
| Name         | `PanelField` text                                        | `name`     | Empty is allowed; the element names it from the id                                                                                                                                                                                       |
| Reach        | `PanelField` number, limits from `SHADER_REACH_RANGE`    | `reach`    | Shown only where `shaderPlaceUsesReach(place)` (replace, around, behind, along). Shows the low limit, 1, when the header has none. Moving edited code to a place whose starter has a Reach, with none set, sets that starter's (2 today) |
| Minimum size | `PanelField` number, limits from `SHADER_MIN_SIZE_RANGE` | `minSize`  | Shown only where `minSizeApplies([place])`. Empty writes no key                                                                                                                                                                          |

The **id is hidden.** It follows the Name through `shaderIdForName` while the current id equals
`shaderIdForName(previous name)` or the starter's id, so no record of the text's origin is needed; any other id stays, a
preset's bare id included. `onTaken: "rename"` resolves a clash. **Keys left to Full text.** `places`, `categories`,
`preview`, `cost`, `thumbnail`, `motion`, `reachParam`, `blend`, `form`, `bloom`, `requires`, `reads` and `webgpu`, and
on a parameter `description`, `primary` and `choices`. They pass through untouched, because the draft is the header as
written.

**Parameter rows** are a `ControlSection` titled Parameters with a **+** (the app's `AddButton`): `[Name] [Type]
[Default] [insert] [gear] [-]`. A new row goes last; reordering is left to Full text.

| Part        | Control                                                                                 | Notes                                                                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name        | `PanelField` text                                                                       | The name used in the code. A commit calls `renameShaderParam`                                                                                                                                                           |
| Type        | `PanelField` select                                                                     | Number, Integer, Switch, Choice, Color, from `SHADER_PARAM_TYPES`. A change calls `changeShaderParamType`                                                                                                               |
| Default     | `paramControl` from `ShaderParams.tsx`, exported; a number field for number and integer | Number and Color may be bound to a clock in the gear; the cell then shows the binding's `clockWords` text in place of the control                                                                                       |
| insert `->` | icon button                                                                             | Puts the name at the code box's cursor and focuses the box. Marked disabled, with a short tooltip, until the box has held focus since its text was last loaded, because a fresh editor's cursor is before `vec4 shade(` |
| `-`         | icon button                                                                             | Calls `removeShaderParam`; code still using the name shows a compile problem                                                                                                                                            |

The gear, a popout as the style rows use, holds Display name (empty shows `shaderParamPlainName(name)`, and it is
written only if the reader types one) and whatever `shaderParamShape(type).fields` names: Min, Max, Step; Choices, as
rows of a label with its index beside it ("Dots 0", "Rings 1", because the body reads the index), a minus and a +;
Varies. The order on screen is the app's. The label is the stored choice value; renaming the default's label updates the
default. For Number and Color the gear also has **Starts**: a select of `SHADER_CLOCKS` with None first, in the words a
bound value already shows (`CLOCK_WORDS`, exported from `words.ts`), then, once a clock is chosen, From and To seconds.
A pick writes the row's `default` as `{ by, domain: [0, 0.3] }`. Color also needs `range`, so two color controls appear,
both starting at the default color. None puts back `shaderParamShape`'s default (Color: the range's first color).
Integer, Switch and Choice have no Starts, because the element takes a clock binding only on Number and Color. A new row
is `param1` (or the next free number), Number, default from `shaderParamShape`. `changeShaderParamType` sets a valid
default and clears fields that no longer apply; switching to Choice passes the app's seed labels, "One" and "Two", and
the first becomes the default. The app edits rows only through the element's row functions, which also keep
`motion.loop.speedParam`, `reachParam` and `preview.params` naming the right row: those are not form fields, so the
reader could not fix them.

A parameter is a global in the body, so no declaration is written; the name arrives through insert. Renaming a row does
not rewrite the code; the compile problem points at the line.

**The code box holds only the body.** Below it:

- **Full text** switches the same box to the whole shader text, editable, and hides Name, Reach, Minimum size and
  Parameters. Place stays visible and follows the header as today; `check` and `add` receive the visible Place through
  their `place` option when the header names none. Pressing it again splits the text and returns. A header that is not a
  JSON object keeps the reader in Full text with its problems.
- **Copy code** copies the composed text (the row menu's words).

**Pasting full text.** In the body view, a change that makes the box's content a headed text is split: the header goes
into the form and the box is set to the body, or, with no draft, the dialog switches to Full text showing what was
pasted. Control+V on the Shaders section takes the same path.

**Problems** stay in the list, in `pasteProblemWords` words, and also mark where they belong.

| Problem                                                                                                                                        | Goes to                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `line` at or after the body                                                                                                                    | The box, at `line - bodyLine + 1`; Full text shows `line`. The row jumps there                                                                            |
| `line` before the body (only text typed in Full text can put one there: `formatShaderDraft` writes a non-ASCII character as a `\uXXXX` escape) | A list row that switches to Full text and jumps to that line                                                                                              |
| `shader.param-invalid` `{ param, field }`                                                                                                      | That row's field, or its gear for `values` and `varies`. `param` is a name, or `#<index>` for a row with no name; a duplicate marks the last of that name |
| `shader.reserved` `{ param }`                                                                                                                  | That row's Name                                                                                                                                           |
| `shader.header-key` `{ key }`                                                                                                                  | Name, Place, Reach or Minimum size when it is one of those; else a list row that switches to Full text                                                    |
| `shader.place-unsupported`                                                                                                                     | Place                                                                                                                                                     |
| `shader.target-mismatch` `{ found }`                                                                                                           | A list row that is a button: it moves the text to that target's draft                                                                                     |
| Anything else                                                                                                                                  | Plain list row                                                                                                                                            |

List rows for form fields are buttons that focus the field, and a marked field uses its control's error state. The
element checks the header before the body, so a bad row hides body problems until fixed; the preview keeps its last good
picture.

## 2. Syntax highlighting

**Component.** CodeMirror 6, used directly from a `useEffect` with no React wrapper, in one new file,
`graphty/src/workspace/style/ShaderCodeEditor.tsx`. The language is first party: `StreamLanguage.define(shader)` with
`shader` from `@codemirror/legacy-modes/mode/clike`. Exact versions in `graphty/package.json`: `@codemirror/view`
6.43.15, `state` 6.7.6, `language` 6.13.1, `commands` 6.11.1, `lint` 6.9.7, `legacy-modes` 6.5.5, `@lezer/highlight`
1.2.5. Extensions, and only these: `lineNumbers`, `history`, `drawSelection`, `bracketMatching`, `indentOnInput`,
`syntaxHighlighting`, `lintGutter`, and the keymaps `standardKeymap`, `historyKeymap` and those below.

**What is colored.** Keywords (`for`, `return`, `const`, `in`, the sampler types), types (`float`, `vec3`, `mat4`), GLSL
built-ins (`mix`, `dot`, `smoothstep`), `true` and `false`, comments and numbers. Member access (`n.uv`) and calls to
the shader's own functions are not colored, and the mode predates newer GLSL, so `precision`, `layout`, `uvec2` and
`texture` stay plain. **Bundle and size.** The dialog loads that file with a dynamic `import()` the first time it opens:
about 112 KB gzipped, measured with esbuild over the packages above, with no `vite.config.ts` change. As today's box, a
minimum of 12 lines and a maximum of 24 with internal scrolling, set on `.cm-scroller` in the one `EditorView.theme`;
the loading textarea has the same minimum.

**Replacing the text.** Only the reader's own edits use `dispatch`. Anything that replaces the whole text (switching
target, moving text to another target, a paste split, entering or leaving Full text) calls `view.setState` with a fresh
`EditorState` from one function, so undo never crosses into another draft's text. The dialog sends its problems again
afterward.

| Key                           | Does                                                                                                                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab, Shift+Tab                | Indent, outdent (`indentWithTab`)                                                                                                                                                                                                      |
| Ctrl+M (Shift+Alt+M on a Mac) | `toggleTabFocusMode`, bound by the editor because it lives in `defaultKeymap`. Makes Tab move focus instead. The visible toggle button below the box runs the same command, reads "Tab: Indent" or "Tab: Next field" and shows its key |
| Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z  | The code box's undo and redo, always, under `Prec.high` and returning true, so they never reach the project's history behind the dialog. These are the keys any text box has, so they get no button                                    |
| Escape                        | Closes the innermost open thing: a popout, else the dialog, keeping the draft as today                                                                                                                                                 |

Escape is the exit, so there is no keyboard trap. Mantine's Modal hears Escape first, on `window` in the capture phase,
before a Popout it contains. The fix belongs in the shared components and compact-mantine stays unchanged here, so this
is a temporary workaround: the Modal gets `closeOnEscape={false}`, and one capture-phase window listener in the dialog
closes it on Escape unless `usePopoutManager().hasOpenPopouts()` or the target has `data-mantine-stop-propagation`,
Mantine's own opt-out, which its Select lists already set. The listener's comment names the defect (a Modal hears
Escape before a Popout it contains) and says "see issue" with the tracking issue's number, #6488; the listener
goes when that issue is fixed. One attribute source on `EditorView.contentAttributes` sets `aria-invalid` and
`aria-describedby` while there are problems. The content element also needs `tabindex="0"` (Mantine's focus trap does
not count `contenteditable`) and `aria-label="Shader code"`, so its role and name match today's.

**Details.** On iPad `drawSelection` restores selection handles. Light and dark come from one `EditorView.theme` and one
`HighlightStyle.define` on Mantine CSS variables, styling `keyword`, `typeName`, `standard(variableName)`, `atom`,
`comment`, `number` and `meta`. Problems go to `setDiagnostics` as a gutter mark and underline with the message on
hover; the list stays for touch. **Loading or failure.** The plain `Textarea` is the loading state and holds the same
value. When the editor mounts it takes focus and caret if the textarea held them, and the code box's wrapper gets
`data-editor="ready"`. If the chunk fails, the textarea stays and everything works without highlighting; a later opening
retries.

## 3. One window, switch target

**The switch** is compact-mantine's `SegmentedControl`, labeled "Draws on": Node, Edge, Background. **Group stays a
place**, "Around the group" on Node (`decisions-v2.md`, 2.1); choosing it changes the target to group under the same
draft rule, so `shade(GroupInput g)` appears without typing.

**A draft per target.** Per session, in a `WeakMap`, the dialog keeps for each of node, edge, group and background the
form state, the body and whether Full text is on (while it is, the whole text), replacing today's one draft; a draft
never goes back through text. Switching saves the current draft and loads the other's, or its starter, with no confirm.
Within a target, Place keeps today's rule: an untouched starter becomes the new place's starter, and edited code stays.
"Untouched" compares bodies only, `body === splitShaderText(starter).body`, so a typed Name does not count. The swap
replaces the body and the starter's own Reach, and the Name, id and rows only if they are still the starter's.

**What Add writes.** The opening list's `put` is used only while the switch is on that list's tab. Opened from a node
list and switched to Background, the node layer cannot take it, so Add adds to the project only, as the menu does
(section 5), and the button reads **Add to project** beforehand. A list opens on its own tab; the menu opens on the tab
last used this session, else Node.

## 4. Examples for each target

**Every target and place opens on its starter**, the working `shaderTemplate({ target, place })`, so each draft begins
as an example that already checks and draws. A problem row's button for `shader.target-mismatch` moves the text to the
target it is written for: the moved text replaces that target's draft, and the draft it came from is dropped.

**Duplicate and edit** from a shader row's menu calls `session.shaders.source(id, { duplicate: true, derived: "omit" })`
and loads through the normal path, with `copyNameWords`; its header sets Place. `derived: "omit"` leaves out what the
element computes from a body (`reads`, `cost`, a still `motion`), because a declared value beats inference and the form
hides them: a still example that gains `n.time` would otherwise never animate.

**Unchanged copy.** Whether a text is a copy of a known shader is the element's decision (section 7, `asNew`); the app
compares no forms and rewrites no ids. `check` and `add` get `asNew: true` for Duplicate and edit, and once the reader
changes the form other than a parameter's default value. That is one `edited` flag per draft, set by the form's change
handlers and by an edit in Full text, and cleared only when text arrives from a paste, a moved text or Duplicate and
edit. Otherwise the element answers as it does today: from a list, when `check` reports `sameAs`, Add applies that
known shader with `sameAs.params`. The menu has no list, so `add` alone runs and adds nothing for an unchanged copy.

## 5. The "Add Shader..." menu item

`shader.add`, label `Add Shader...`, in `style/commands.ts`, runs `workspace.set({ dialog: "shader-editor" })`. It is
disabled with "No project is open" or "The graph is still loading", has no keys, and lists itself in quick actions under
`Project` with keywords `shader`, `glsl`, `code`, `effect`, `material`. It sits in the Main menu in `frame/menus.tsx`,
above Rename: `[FILE_LIST, ["shader.add", "project.rename"], ["settings.open", "help.shortcuts"]]`, and not on the start
screen. **Add from the menu.** There is no layer to write to, so the button reads **Add to project** and calls
`session.shaders.add(text, options)` with no `apply`: one undo step, no layer changes. A small `ShaderEditorHost` mounts
it next to `ExportDialog` in `Workspace.tsx`.

**Afterward** a notice says `<name> added to This project`. If `added.descriptor.origin` is not `"pasted"`, nothing was
written (the text was an unchanged preset), and it says `<name> is already in the gallery`. Either way the notice has
one action, **Show in Style**, using the existing `Notice.action`:

- For a node, group or edge shader it selects the inspected layer row if it still exists, else `topmostRow(session)`, a
  rule of stack order that names no layer, and never `labelRow` or `EVERYTHING_KEY`, which can create a layer. It opens
  that row's Style tab on the shader's side and asks the Shaders **+** to take focus, through a one-shot store field
  read as `LabelSection` reads `textNext`. With no row in the stack the notice has no action.
- For a background shader it selects `{ kind: "graph" }` and focuses the Background section's **+**.

## 6. Borrowed ideas

In: parameter rows with fields per type (TouchDesigner, Godot); text as the truth with a form over it (ISF); starter
swaps only while untouched (twigl); one window with one mode control (Babylon.js Node Material Editor, three.js editor),
with a draft per target instead of Babylon's lost changes; gutter marks with hover messages (GLSL Sandbox, three.js);
choices with their index (Godot `hint_enum`); examples named for the look (Figma, Paper Shaders).

Left out: a label-first parameter name (the element derives it), an "Empty" starter (an empty body does not check), name
completion (KodeLife, SHADERed; the insert button covers it), a reference panel, sliders and inline widgets on literals,
importing `uniform` lines, dice, AI authoring and parameter groups: covered already or out of scope.

## 7. Additive graphty-element API

New exports of `@graphty/graphty-element/catalog`, none breaking; neutral facts, no words, no order.

```ts
/** A text's header as written, and its body, with no checks of the body. */
function splitShaderText(text: ShaderText): ShaderTextParts;
interface ShaderTextParts {
    readonly headed: boolean; // starts with a `graphty-shader 1` header
    readonly draft?: ShaderTextDraft; // absent only when the header is not a JSON object
    readonly problems: readonly ShaderProblem[]; // why draft is absent, and any value at fault
    readonly body: string; // the text after the header, exactly
    readonly bodyLine: number; // 1-based line of the text the body starts on
}
/** A header's keys as written: nothing is cleaned or filled in, and any value may be wrong. */
interface ShaderTextDraft { readonly params?: readonly ShaderParamDraft[]; readonly [key: string]: unknown }
interface ShaderParamDraft { readonly [key: string]: unknown }
function formatShaderDraft(draft: ShaderTextDraft, body: string): ShaderText;
function shaderIdForName(name: string): string; // "My paint" gives "user/my-paint"; no usable characters, "user/shader"
const SHADER_PARAM_TYPES: readonly ShaderParamDescriptor["type"][];
const SHADER_REACH_RANGE: { readonly min: number; readonly max: number };
function shaderPlaceUsesReach(place: ShaderPlace): boolean;
function shaderParamPlainName(name: string): string; // the display name derived from a name
function shaderParamShape(type: ShaderParamDescriptor["type"]): {
    readonly default: unknown; // a valid default; absent for "enum", which needs choices
    readonly fields: readonly ("min" | "max" | "step" | "values" | "varies")[]; // which apply; no display order
};
function changeShaderParamType(param: ShaderParamDraft, type: ShaderParamDescriptor["type"], labels?: readonly string[]): ShaderParamDraft;
function renameShaderParam(draft: ShaderTextDraft, from: string, to: string): ShaderTextDraft;
function removeShaderParam(draft: ShaderTextDraft, name: string): ShaderTextDraft;
const SHADER_CLOCKS: readonly ShaderClock[]; // already the element's own list, newly exported
function minSizeApplies(places: readonly ShaderPlace[]): boolean; // likewise
const SHADER_MIN_SIZE_RANGE: { readonly min: number; readonly max: number };
// session.shaders.source gains an optional `derived?: "omit"`; absent keeps today's text.
// ShaderAddOptions, so session.shaders.add and check, gains:
/** This text joins the project as a new shader, even when its id or body matches a known one. */
readonly asNew?: boolean;
```

- `splitShaderText` and `parseShaderText` share one private reader of the header's JSON. The split has no ASCII check,
  reads the id without requiring a namespace (so a bare id reaches the form) and reports value problems next to the
  draft. A header whose `params` is not a list of objects counts as not a JSON object. `parseShaderText` keeps its
  order, so a bare id still returns the one `shader.id-invalid` the session's copy handling needs. A text with no header
  returns `headed: false`, a placeholder draft, the whole text as `body`, `bodyLine: 1`.
- `formatShaderDraft` writes the draft's keys in their order, leaving out only what is absent, so `plainName` stays
  absent unless the header wrote it. It and `formatShaderText` write `*/` inside a JSON string as `*\/`, which is valid
  JSON and reads back equal; today a Name holding it breaks the header.
- `changeShaderParamType` seeds an enum's values from `labels`, so the words stay the application's. `renameShaderParam`
  and `removeShaderParam` update the references named in section 1. `readParam`'s label treats an empty name like a
  missing one, `#<index>`, so two empty rows can be told apart.
- `asNew` skips the copy path, so `sameAs` is absent and nothing is decided against a known shader. A preset's bare id
  reads as `user/<id>`, the reading `catalogCopy` already does, and a clash follows `onTaken`. Without the option,
  nothing changes: an unchanged copy still returns `sameAs`.
- Round-trip tests: every preset through `source(id, { duplicate: true })`, every starter, and a fixture writing every
  key in `HEADER_KEYS` and `PARAM_KEYS`: split then format parses equal to the original.
- Defect fixed in passing: `source(id, { params })` and `source(id, { derived })` on a project shader, and every
  `source` of a preset or a registered shader, left out the low-detail body; they now write it as `shadeFar`.
- Defect fixed in passing: `bodyLineOf` in `src/session/shaders.ts` returns 1 for a shader with `shadeFar`
  (`text.endsWith(glsl)` fails once the far body is split out). It takes `bodyLine` from the split.

**Security and undo do not change:** composed text goes through `check` and `add` as the reader's; Add is one undo step.

## 8. Documentation

`graphty-element/docs/guide/shaders.md` is the only user documentation covering the app. In it:

1. In "Three ways to write one shader", delete the paragraph beginning "Shader text is also how a shader goes into the
   graphty app" , and list the new exports.
2. Add `### Writing a shader in the graphty app`: open it from **Add Shader...** or a gallery's **New shader...**;
   **Node, Edge, Background** each keep a draft and open on a starter; **Name, Place, Reach**; **Parameters**,
   with which fields each type has and that the name is used bare in the code; insert; problems; **Full text**, **Copy
   code**, pasting; keys (Tab, Ctrl+M, Escape); and **Add**: from a list it is on that list, from the menu it joins the
   project and **Show in Style** leads on.
3. Add `### Building your own editor`, with this worked example, compiled against the published types by
   `graphty-element/test/types/consumer/shader-editor-guide.ts`, and a sentence saying `asNew` means the text joins the
   project as a new shader even when its id or body matches a known one:

```ts
import { formatShaderDraft, shaderParamShape, splitShaderText } from "@graphty/graphty-element/catalog";

export async function saveEdited(g: HTMLElementTagNameMap["graphty-element"], text: string): Promise<void> {
    const { draft, body } = splitShaderText(text); // fill your form from draft and body
    if (draft === undefined) return;
    const glow = { name: "glow", type: "number", default: shaderParamShape("number").default };
    const edited = formatShaderDraft({ ...draft, name: "My paint", params: [...(draft.params ?? []), glow] }, body);
    const checked = await g.session.shaders.check(edited, { asNew: true, picture: true });
    if (!checked.ok) {
        console.log(checked.problems); // { code, params }: your words, your list
        return;
    }
    await g.session.shaders.add(edited, { asNew: true, onTaken: "rename" });
}
```

## 9. Tests

UI tests use real input against the real element, never `fireEvent.change` or a fake session. New, in
`graphty/src/workspace/style/__tests__/ShaderEditorDialog.real-element.test.tsx` (the renamed
`PasteShader.real-element.test.tsx`):

- A filled row changes the preview, and Add lists its parameters in `session.catalog.shaders()`.
- On a fresh open insert is disabled; after a click in the code it writes the name there. Pasting full text fills the
  form and the box holds the body; so does Copy code's text. A bad default marks its field. An unreadable header lands
  in Full text. Copy code parses equal.
- A row with min above max survives a target switch and a Full text round trip with the form still shown. A non-ASCII
  Name is written as an escape, so the text stays ASCII and adds. An empty Name still adds, under `user/shader`.
- Switching Node to Background shows `BackgroundInput`, and back restores typed code; Around the group shows
  `GroupInput`. From a node list switched to Background: Add to project, no layer changes.
- Type a Name, choose Around: the box holds the ring starter and the Name stays. Copy code's text, renamed, Add: a new
  shader. Edge text moved from the Node tab replaces the Edge tab's draft.
- Main menu, Add Shader..., Add: `session.shaders.list()` holds it, no layer changes, one undo step; Show in Style
  focuses the Shaders +. Copy code's text unchanged: the notice says it is already in the gallery.
- Tab indents; Ctrl+M then Tab moves focus, and the toggle button shows it; the close button's tooltip shows Esc; Escape
  closes and keeps the draft; in the gear or the color picker it closes only that. Type in Node, switch to Edge, Ctrl+Z:
  the Edge body is unchanged. With the chunk blocked by `failRequests`, the textarea still works.
- Place is first and holds focus on opening; on Background the code box does. In Full text Place stays and follows a
  header's place; a header naming none adds at the visible Place.
- A Number row's Starts writes `{ by, domain }` and a Color row's adds `range`; both survive Full text. A Minimum size
  writes `minSize`, and its field is absent at a place that cannot use it.
- Show in Style opens the inspected layer row, and with nothing inspected the topmost row, writing nothing.
- Element, `asNew`: a preset's bare id joins under `user/` with no `sameAs`, in `check` and in `add`, a body matching a
  known shader joins anyway, and without it `sameAs` is reported as before.
- Element, under `graphty-element/test/` (`npm run typecheck:strict-consumer` also compiles
  `test/types/consumer/shader-editor-guide.ts`): renaming a row an example's `speedParam` names carries the reference,
  and removing it drops it; a still example with `n.time` added loops once added; a row renamed from a derived display
  name writes no `plainName`.

Existing tests keep their intent; only how they read the box changes. Every `codeBox` helper, the one in
`ShaderSettings.real-element.test.tsx` included, waits for `data-editor="ready"`, except the chunk-blocked test.

| Test                                       | Change                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `Behind gives the behind template`         | Compare the box with the template's body; read Place from its field                       |
| `a while loop shows one problem row`       | `Line 4:5` (body line); caret via `EditorView.findFromDOM(box).state.selection.main.head` |
| `Duplicate and edit`                       | Name field reads "Aura copy"; the listed shader has the `user/` id                        |
| `Escape closes ... keeps the text`         | Compare the restored body with the pasted text's body                                     |
| `the preview draws the text`               | Change the tint through the row's color control                                           |
| `Copy code puts its text on the clipboard` | Compare `box.value` with the box's text: the copied text's body                           |
| `the live check finds a compile error`     | `aria-invalid` and `aria-describedby` now come from the editor's content element          |

Others, including every gallery and Style panel test, stay as written. Step 3 first proves `userEvent.fill` reaches the
`contenteditable`; if not, `src/stories/real-input.ts` types through the keyboard. Add `shader.add` to
`EXPECTED_COMMAND_IDS.style`.

**Stories**, in `style/ShaderEditorDialog.stories.tsx`, each with a play function: Node, Edge, Background, Around the
group, every parameter type, Problems, Full text.

## 10. Work, in order, on one branch

1. **Element API.** `catalog/shaderText.ts`, `shaders.ts`, `session/shaders.ts` (with `asNew`), tests,
   `test/types/consumer/shader-editor-guide.ts`, and `api/catalog.api.md` from `npm run api:report`.
2. **The form, on the plain box.** Rename `PasteShaderDialog.tsx` to `ShaderEditorDialog.tsx`; new
   `ShaderParamRows.tsx`; export `paramControl`; `words.ts`, `style.css`, `Section.tsx`, `ShaderRow.tsx`.
3. **Highlighting and keys.** `graphty/package.json`, `ShaderCodeEditor.tsx`, the lazy load, the Tab toggle button, the
   Escape workaround with its issue number, tests.
4. **One window and the menu.** The switch, drafts, the `edited` flag, `ShaderEditorHost`;
   `style/commands.ts`, `frame/menus.tsx`, `Workspace.tsx`, `state/store.ts`, tests.
5. **Documentation and stories.**

## Review decisions

- `minSize` beside a `minSize` key is not refused as `shader.reserved`: the draft writer drops nothing, and
  `catalogFacts` already lets such a row stand in for the added one; refusing it would change what parses.
- An empty or unusable Name gives the fixed id `user/shader`, not the id it had: following then needs no memory.
- Escape does not keep open state in the dialog: `CompactColorInput` does not report its panel opening and
  compact-mantine is locked to Figma, so `hasOpenPopouts()`, read at the moment of the key, covers every popout.
- Minimum size hides in Full text with Reach: unlike Place it has no `check` option to reach the text by.
- `asNew` is not passed on every Add: an approved test has an unchanged pasted Copy code apply the preset.
- A Color bound to a clock gets two color controls: the element refuses a Color binding with no `range`.
