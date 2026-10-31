## 0.9.36 (2026-10-31)

### 🩹 Fixes

- **compact-mantine:** keep a submenu open while the mouse travels to it ([#4631](https://github.com/graphty-org/graphty-monorepo/issues/4631))
- **compact-mantine:** select a committed number again once its owner draws it ([#3385](https://github.com/graphty-org/graphty-monorepo/issues/3385), [#3545](https://github.com/graphty-org/graphty-monorepo/issues/3545), [#3534](https://github.com/graphty-org/graphty-monorepo/issues/3534))
- **compact-mantine:** read keys by when they were typed; select a value before the next key ([#3381](https://github.com/graphty-org/graphty-monorepo/issues/3381), [#3534](https://github.com/graphty-org/graphty-monorepo/issues/3534), [#3545](https://github.com/graphty-org/graphty-monorepo/issues/3545))
- **cytoscape-extensions:** keep the script-tag bundle's lazy file formats under Vite 8 ([#4230](https://github.com/graphty-org/graphty-monorepo/issues/4230))
- **compact-mantine:** cap every dropdown at the visual viewport's height ([f3dbeb5303](https://github.com/graphty-org/graphty-monorepo/commit/f3dbeb5303))
- **graphty:** shader settings as property rows; motion, undo words, outline and key follow the panel ([3c31ca0ea1](https://github.com/graphty-org/graphty-monorepo/commit/3c31ca0ea1))

### 🧱 Updated Dependencies

- Updated visual-review to 0.2.38

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.35 (2026-10-29)

### 🧱 Updated Dependencies

- Updated visual-review to 0.2.37

## 0.9.34 (2026-10-28)

### 🚀 Features

- **compact-mantine:** the file source row shows the address in effect through defaultValue ([a5c0ffbd5c](https://github.com/graphty-org/graphty-monorepo/commit/a5c0ffbd5c))
- **compact-mantine:** a shared file source input, file drop hook, picker and status bar ([ed237f6855](https://github.com/graphty-org/graphty-monorepo/commit/ed237f6855))
- **graphty:** table header words, rows with issues, Ignore all ([#3298](https://github.com/graphty-org/graphty-monorepo/issues/3298))
- **compact-mantine:** a range brush on HistogramRow, and slider value text, contrast and touch size ([#300](https://github.com/graphty-org/graphty-monorepo/issues/300))
- **compact-mantine:** a DataTable column's minWidth, a floor under content sizing ([dd5d5a3a28](https://github.com/graphty-org/graphty-monorepo/commit/dd5d5a3a28))
- **compact-mantine:** a data table header's end controls, outside its sort button ([94ef71335f](https://github.com/graphty-org/graphty-monorepo/commit/94ef71335f))
- **compact-mantine:** a node and edge chip with fixed colors and icons ([c1c3713f58](https://github.com/graphty-org/graphty-monorepo/commit/c1c3713f58))
- **graphty:** one bound field for one layer and for several, color sets from 2 to dozens ([b3f7efee11](https://github.com/graphty-org/graphty-monorepo/commit/b3f7efee11))
- **graphty:** vary by layer lists the layers with Louvain's own group rows ([d35f67b7f8](https://github.com/graphty-org/graphty-monorepo/commit/d35f67b7f8))
- **compact-mantine:** select several tree rows by Shift+Arrow and by touch ([9b8abd3e70](https://github.com/graphty-org/graphty-monorepo/commit/9b8abd3e70))
- **compact-mantine:** a compact data table density for a short list in a popover ([ebccbe1500](https://github.com/graphty-org/graphty-monorepo/commit/ebccbe1500))
- **graphty:** + makes a real Layer N at once, offers Analyze, and names a layer's kind ([f772c50676](https://github.com/graphty-org/graphty-monorepo/commit/f772c50676))
- **compact-mantine:** a tree row action marked data-at-rest shows without hover ([ff0d322cfa](https://github.com/graphty-org/graphty-monorepo/commit/ff0d322cfa))
- **graphty:** one line per property, Clear and Undo you can trust ([984ce2c95f](https://github.com/graphty-org/graphty-monorepo/commit/984ce2c95f))
- **graphty:** popovers name values as the key does, open beside the panel, give focus back ([9ef9c72efd](https://github.com/graphty-org/graphty-monorepo/commit/9ef9c72efd))
- **graphty:** property rows keep their width, vary on every bindable field, one Clear ([33bd0bf168](https://github.com/graphty-org/graphty-monorepo/commit/33bd0bf168))
- **compact-mantine:** move tree rows into and out of folders from the keyboard and a row menu ([159bba0f53](https://github.com/graphty-org/graphty-monorepo/commit/159bba0f53))
- **graphty:** effects lists with a picker per effect, and arrow end colors that read "Line color" ([6d62f3d65f](https://github.com/graphty-org/graphty-monorepo/commit/6d62f3d65f))
- **graphty:** the Style tab's property rows, with Clear on a minus ([df3311e438](https://github.com/graphty-org/graphty-monorepo/commit/df3311e438))
- **compact-mantine:** a ramp editor on the value's own axis, and painted histogram bars ([6fbb89e631](https://github.com/graphty-org/graphty-monorepo/commit/6fbb89e631))
- **compact-mantine:** glyphs and a grid layout in StyleSelect, and a heading level on ControlSection ([e0c0b0f5c3](https://github.com/graphty-org/graphty-monorepo/commit/e0c0b0f5c3))
- **graphty:** move a table column left or right from its header menu ([30fbf32d9d](https://github.com/graphty-org/graphty-monorepo/commit/30fbf32d9d))
- **graphty:** open the Style tab's shape, bind, binding and label lists in titled pop-outs ([624468b4b1](https://github.com/graphty-org/graphty-monorepo/commit/624468b4b1))
- **graphty:** name the view mode on the View tool and offer VR and AR from its menu ([9549ceb7ab](https://github.com/graphty-org/graphty-monorepo/commit/9549ceb7ab))
- **graphty:** open a context menu on the canvas by right-click, Shift+F10 or touch-and-hold ([f1f51faedc](https://github.com/graphty-org/graphty-monorepo/commit/f1f51faedc))
- **graphty:** give each paint-tree row one command list with Rename and Delete ([1623c25b4b](https://github.com/graphty-org/graphty-monorepo/commit/1623c25b4b))
- **graphty:** save projects in this browser and add Save local copy ([8df4aab964](https://github.com/graphty-org/graphty-monorepo/commit/8df4aab964))
- **compact-mantine:** add swatches and onChangeEnd to CompactColorInput ([131b207bcc](https://github.com/graphty-org/graphty-monorepo/commit/131b207bcc))
- **compact-mantine:** keep the lift that ends a touch hold from choosing a context-menu row ([4780d19372](https://github.com/graphty-org/graphty-monorepo/commit/4780d19372))
- **compact-mantine:** open ContextMenu on a touch-and-hold ([6fb2cec171](https://github.com/graphty-org/graphty-monorepo/commit/6fb2cec171))
- **compact-mantine:** drag tree rows by touch and give each row a context menu ([100ea2fa9a](https://github.com/graphty-org/graphty-monorepo/commit/100ea2fa9a))

### 🩹 Fixes

- **ci:** preset FC_FONTATIONS for every Chromium launch; one shared vitest base ([#3787](https://github.com/graphty-org/graphty-monorepo/issues/3787))
- clear the SonarQube findings on the data management changes ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **compact-mantine:** the variable pill sets the contrast mode of the theme in use ([#3472](https://github.com/graphty-org/graphty-monorepo/issues/3472))
- **compact-mantine:** hold a focus-opened tooltip only when it mounts ([#3472](https://github.com/graphty-org/graphty-monorepo/issues/3472))
- **compact-mantine:** data table content widths independent of font load ([#3520](https://github.com/graphty-org/graphty-monorepo/issues/3520))
- **compact-mantine:** restore Figma's #0d99ff slider bar ([#0](https://github.com/graphty-org/graphty-monorepo/issues/0), [#007](https://github.com/graphty-org/graphty-monorepo/issues/007), [#3480](https://github.com/graphty-org/graphty-monorepo/issues/3480))
- **compact-mantine:** a hidden tooltip no longer takes the page's Escape ([#3380](https://github.com/graphty-org/graphty-monorepo/issues/3380))
- **compact-mantine:** keep shiftRange private to the histogram brush ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **compact-mantine:** a select's typed letters and Enter take their option on a busy page ([#3328](https://github.com/graphty-org/graphty-monorepo/issues/3328))
- **compact-mantine:** ring the color picker's value field round the opacity part too ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **compact-mantine:** tests and stories follow the Figma defaults ([bccb3fe11e](https://github.com/graphty-org/graphty-monorepo/commit/bccb3fe11e))
- **compact-mantine:** draw and behave as Figma does where the components had drifted ([f8372344a8](https://github.com/graphty-org/graphty-monorepo/commit/f8372344a8))
- **compact-mantine:** the default theme draws Figma's colors; contrast values move to the AA option ([#00000080](https://github.com/graphty-org/graphty-monorepo/issues/00000080), [#0000008](https://github.com/graphty-org/graphty-monorepo/issues/0000008), [#8](https://github.com/graphty-org/graphty-monorepo/issues/8), [#009951](https://github.com/graphty-org/graphty-monorepo/issues/009951), [#008043](https://github.com/graphty-org/graphty-monorepo/issues/008043))
- **compact-mantine:** a disabled select keeps its dimmed caret, as Figma draws it ([bd2aefa7b8](https://github.com/graphty-org/graphty-monorepo/commit/bd2aefa7b8))
- **compact-mantine:** drag a histogram brush's range from between its thumbs, and to the left ([61de4d4480](https://github.com/graphty-org/graphty-monorepo/commit/61de4d4480))
- make four tier 3 stories draw the same picture on every capture ([63d86ff772](https://github.com/graphty-org/graphty-monorepo/commit/63d86ff772))
- **compact-mantine:** a tooltip beside a heading no longer throws where ranges have no box ([04472f9007](https://github.com/graphty-org/graphty-monorepo/commit/04472f9007))
- **compact-mantine:** a reset button says what it does in a tooltip; tests follow tier 3 ([140c95d15d](https://github.com/graphty-org/graphty-monorepo/commit/140c95d15d))
- **compact-mantine:** a click on a toggle icon button keeps focus on the button ([6abb5cd2b9](https://github.com/graphty-org/graphty-monorepo/commit/6abb5cd2b9))
- **compact-mantine:** name DataTable header icons and darken the yellow Alert title ([fa75231d41](https://github.com/graphty-org/graphty-monorepo/commit/fa75231d41))
- **compact-mantine:** keep a color field that fills its row from collapsing ([202061c95b](https://github.com/graphty-org/graphty-monorepo/commit/202061c95b))
- **graphty,compact-mantine:** label settings fields fit their column and say a discard ([1940276eb8](https://github.com/graphty-org/graphty-monorepo/commit/1940276eb8))
- **compact-mantine:** let a field row's field give way in a narrow panel ([c88c4ce8bc](https://github.com/graphty-org/graphty-monorepo/commit/c88c4ce8bc))
- **graphty,compact-mantine:** a style box's Tab moves on, remove lands on +, Escape says so ([d897c4b4ac](https://github.com/graphty-org/graphty-monorepo/commit/d897c4b4ac))
- **compact-mantine,graphty:** a grid is one Tab stop; Escape on a group's actions closes Color by ([b426f1d05b](https://github.com/graphty-org/graphty-monorepo/commit/b426f1d05b))
- **compact-mantine,graphty:** a heading focused by script draws its focus ring ([65c1c08e73](https://github.com/graphty-org/graphty-monorepo/commit/65c1c08e73))
- **compact-mantine,graphty:** an open inspector shows what Undo put back ([52681cd9e0](https://github.com/graphty-org/graphty-monorepo/commit/52681cd9e0))
- **graphty,compact-mantine:** mark the column Show in table asks for; start a sort at the top ([9a5a230c73](https://github.com/graphty-org/graphty-monorepo/commit/9a5a230c73))
- **graphty,compact-mantine:** one name per control, and names that say the value ([c9eb6f6225](https://github.com/graphty-org/graphty-monorepo/commit/c9eb6f6225))
- **graphty,compact-mantine:** condition cards keep typing on Escape and take focus after a match ([a18493275c](https://github.com/graphty-org/graphty-monorepo/commit/a18493275c))
- **compact-mantine:** the color picker says why it refuses text, and Tab reaches every control ([8f49cc1338](https://github.com/graphty-org/graphty-monorepo/commit/8f49cc1338))
- **compact-mantine:** a list says when typed letters match nothing, and fits its field ([a340d0c6f8](https://github.com/graphty-org/graphty-monorepo/commit/a340d0c6f8))
- **compact-mantine:** a tooltip stays shut over its own pop-up and finds its text field ([423fb38cc1](https://github.com/graphty-org/graphty-monorepo/commit/423fb38cc1))
- **compact-mantine:** call a crimson red in colorWord ([50ecd91e49](https://github.com/graphty-org/graphty-monorepo/commit/50ecd91e49))
- **compact-mantine,graphty:** undo names its change and says why it is dimmed ([43f055cfec](https://github.com/graphty-org/graphty-monorepo/commit/43f055cfec))
- **graphty,graphty-element,compact-mantine:** find names columns as the screen does ([3c27003a63](https://github.com/graphty-org/graphty-monorepo/commit/3c27003a63))
- **compact-mantine,graphty:** an unset field takes the value it shows ([#6366](https://github.com/graphty-org/graphty-monorepo/issues/6366))
- **graphty,compact-mantine:** no dead Tab stops, and Escape always does its job ([a90c4d40c0](https://github.com/graphty-org/graphty-monorepo/commit/a90c4d40c0))
- **compact-mantine,graphty:** screen readers hear each analysis, load count, misfit and color ([d714c85307](https://github.com/graphty-org/graphty-monorepo/commit/d714c85307))
- **graphty,compact-mantine:** condition cards keep their rule on a stray key and show Undo ([9f8c35c765](https://github.com/graphty-org/graphty-monorepo/commit/9f8c35c765))
- **compact-mantine:** a tooltip opens off its own section's title ([04bf6203fb](https://github.com/graphty-org/graphty-monorepo/commit/04bf6203fb))
- **compact-mantine:** a type-ahead that matches nothing highlights nothing ([bdd01700ef](https://github.com/graphty-org/graphty-monorepo/commit/bdd01700ef))
- **compact-mantine,graphty:** the picker holds the color before the edit, and Enter closes it ([273e236a4e](https://github.com/graphty-org/graphty-monorepo/commit/273e236a4e))
- **graphty:** find keeps the reader's words, shows no structure path, and lets Escape leave ([6dd0b00bd7](https://github.com/graphty-org/graphty-monorepo/commit/6dd0b00bd7))
- **compact-mantine,graphty:** one name per control, and history that says what changed ([6fbf1615b1](https://github.com/graphty-org/graphty-monorepo/commit/6fbf1615b1))
- **compact-mantine,graphty:** focus lands on the opened graph's heading, which says its size ([777a605103](https://github.com/graphty-org/graphty-monorepo/commit/777a605103))
- **compact-mantine,graphty:** lists close when focus leaves; table and tree say their state ([e6e1d16166](https://github.com/graphty-org/graphty-monorepo/commit/e6e1d16166))
- **compact-mantine:** true color words, keywords typed as words, a full-width refusal ([bffcbc76d4](https://github.com/graphty-org/graphty-monorepo/commit/bffcbc76d4))
- **graphty:** inspector summaries list every value, empty columns and degree ([806f842f2b](https://github.com/graphty-org/graphty-monorepo/commit/806f842f2b))
- **compact-mantine:** popouts keep off the window bottom; paint reset stays beside its field ([c0199136c2](https://github.com/graphty-org/graphty-monorepo/commit/c0199136c2))
- **compact-mantine:** a list opened under a still pointer takes a click or a tap at once ([3650da1d89](https://github.com/graphty-org/graphty-monorepo/commit/3650da1d89))
- **compact-mantine:** tooltips open off the controls around them and stay shut after a press ([babb23528b](https://github.com/graphty-org/graphty-monorepo/commit/babb23528b))
- **graphty,compact-mantine,graphty-element:** cells read with their row; summaries count columns ([5cf1552b96](https://github.com/graphty-org/graphty-monorepo/commit/5cf1552b96))
- **graphty:** lists start with nothing active and rank names that start with the typed text first ([97462184c5](https://github.com/graphty-org/graphty-monorepo/commit/97462184c5))
- **graphty:** name each control for what it does, once, in the words it means ([fa3b1b8fd8](https://github.com/graphty-org/graphty-monorepo/commit/fa3b1b8fd8))
- **graphty:** focus stays on a control and lands where the reader goes next ([ae2a7f2184](https://github.com/graphty-org/graphty-monorepo/commit/ae2a7f2184))
- **graphty:** number card boxes commit on Enter or leaving; Escape reverts ([928404e6ab](https://github.com/graphty-org/graphty-monorepo/commit/928404e6ab))
- **compact-mantine:** a color box that replaces its value, a refusal under the row, named swatches ([85d4a40593](https://github.com/graphty-org/graphty-monorepo/commit/85d4a40593))
- **compact-mantine:** drop the swatches prop the merge declared twice ([13960dfb0e](https://github.com/graphty-org/graphty-monorepo/commit/13960dfb0e))
- **graphty,compact-mantine:** label text size, Escape past tooltips, lists open on the value ([611619ee7f](https://github.com/graphty-org/graphty-monorepo/commit/611619ee7f))
- **compact-mantine,graphty:** table columns sized to content, sort state spoken, empty cells named ([aac8f123e0](https://github.com/graphty-org/graphty-monorepo/commit/aac8f123e0))
- **graphty,compact-mantine:** a run setting runs on Enter; a grouping run says what it made ([fa3c6be168](https://github.com/graphty-org/graphty-monorepo/commit/fa3c6be168))
- **graphty,compact-mantine:** style panel keeps the base layer whole and reads picked nodes as such ([d15b70889f](https://github.com/graphty-org/graphty-monorepo/commit/d15b70889f))
- **compact-mantine:** draw an unchosen segment's glyph in Figma's icon-secondary ([c8a07c1cd6](https://github.com/graphty-org/graphty-monorepo/commit/c8a07c1cd6))
- **compact-mantine:** clear a search field on Escape at its clear button ([81b72a9413](https://github.com/graphty-org/graphty-monorepo/commit/81b72a9413))
- **graphty:** name each control for what it is, one word per meaning ([ed4b8fdb27](https://github.com/graphty-org/graphty-monorepo/commit/ed4b8fdb27))
- **graphty:** focus never falls to the page; F6 moves between panels ([098534fc71](https://github.com/graphty-org/graphty-monorepo/commit/098534fc71))
- **graphty:** speak each status message once from a standing line ([7a23b98f99](https://github.com/graphty-org/graphty-monorepo/commit/7a23b98f99))
- **graphty:** focus lands where the next keystroke belongs after an add ([bdedd851ee](https://github.com/graphty-org/graphty-monorepo/commit/bdedd851ee))
- **compact-mantine:** color box keeps focus on Escape, says why it refused ([2363bef2cd](https://github.com/graphty-org/graphty-monorepo/commit/2363bef2cd))
- **compact-mantine:** give the selected pill tab the selected segment's inset edge ([1a9eea6ce0](https://github.com/graphty-org/graphty-monorepo/commit/1a9eea6ce0))
- **compact-mantine:** a pop-out leaves an Escape something inside already used up ([21a6edc8ce](https://github.com/graphty-org/graphty-monorepo/commit/21a6edc8ce))
- **compact-mantine:** a menu opened by a click starts on its first enabled row, so Enter picks it ([64955e3200](https://github.com/graphty-org/graphty-monorepo/commit/64955e3200))
- **compact-mantine:** a Mixed color has a swatch and takes names; a folder checkbox reads partly ([eb366d1683](https://github.com/graphty-org/graphty-monorepo/commit/eb366d1683))
- **graphty-element:** stop the first-import check copying the whole history on every step ([a070e32a2c](https://github.com/graphty-org/graphty-monorepo/commit/a070e32a2c))
- **compact-mantine:** a data table with no anchor yet extends from its one selected row ([0704fea50b](https://github.com/graphty-org/graphty-monorepo/commit/0704fea50b))
- **compact-mantine:** a data table's Enter opens a multi-row selection without collapsing it ([f74fa06e92](https://github.com/graphty-org/graphty-monorepo/commit/f74fa06e92))
- **compact-mantine:** tree type-ahead leaves Shift+letter shortcuts to the page ([d516596a1e](https://github.com/graphty-org/graphty-monorepo/commit/d516596a1e))
- **graphty:** a narrowed ramp end can be dragged back out ([be99f06a85](https://github.com/graphty-org/graphty-monorepo/commit/be99f06a85))
- **compact-mantine:** a color field's reset works after a color was typed at the default ([0fcada9ac4](https://github.com/graphty-org/graphty-monorepo/commit/0fcada9ac4))
- **compact-mantine:** an open pop-out keeps its place as its content grows ([8eba193112](https://github.com/graphty-org/graphty-monorepo/commit/8eba193112))
- **compact-mantine:** a select's glyph keeps its slot; an unset chip and ramp select show no value ([d1e3db8ffb](https://github.com/graphty-org/graphty-monorepo/commit/d1e3db8ffb))
- **compact-mantine:** a color picker opens with focus in its value box, so a typed hex sets it ([d8b7b7e0ac](https://github.com/graphty-org/graphty-monorepo/commit/d8b7b7e0ac))
- **compact-mantine:** one minus for Clear, one-line quick actions, a ramp that fits 240 px ([f2a63266e0](https://github.com/graphty-org/graphty-monorepo/commit/f2a63266e0))
- **compact-mantine:** tree is one Tab stop, right-click selects, pop-outs open upward ([84f144774a](https://github.com/graphty-org/graphty-monorepo/commit/84f144774a))
- **compact-mantine:** one not-set look for every style field, a chip-only color, Escape in a pop-out ([8b7d23ae10](https://github.com/graphty-org/graphty-monorepo/commit/8b7d23ae10))
- **graphty:** a canvas key that leaves room, one Summary per Values tab, Graph settings on the grid ([fca5d0f96c](https://github.com/graphty-org/graphty-monorepo/commit/fca5d0f96c))
- **compact-mantine:** one look for not set, set, mixed and disabled across every style field ([e75d87ad92](https://github.com/graphty-org/graphty-monorepo/commit/e75d87ad92))
- **compact-mantine:** glyph grid shows whole names; ramp editor gets labels, steps and a dark ring ([bd7dcb0273](https://github.com/graphty-org/graphty-monorepo/commit/bd7dcb0273))
- **compact-mantine:** pop-outs fit the window and return focus to a Tooltip-wrapped trigger ([5715ad935f](https://github.com/graphty-org/graphty-monorepo/commit/5715ad935f))
- **graphty:** a filter step over an edge column names both its node and edge counts ([c9f2ceed37](https://github.com/graphty-org/graphty-monorepo/commit/c9f2ceed37))
- **compact-mantine:** restore Figma's face on the chosen segment ([#2](https://github.com/graphty-org/graphty-monorepo/issues/2), [#444](https://github.com/graphty-org/graphty-monorepo/issues/444), [#383838](https://github.com/graphty-org/graphty-monorepo/issues/383838))
- **compact-mantine:** keep the navigation rail inside its container's height ([73d2f19cb8](https://github.com/graphty-org/graphty-monorepo/commit/73d2f19cb8))
- clear the last SonarQube findings (NaN-safe comparisons, readonly props, vector normalising) ([703577afbc](https://github.com/graphty-org/graphty-monorepo/commit/703577afbc))
- **compact-mantine:** give the extra-small checkbox a 24 px target; scroll find rows into view ([1212d8c642](https://github.com/graphty-org/graphty-monorepo/commit/1212d8c642))
- clear the SonarQube findings on the studio branch's changed lines ([9de6080dbd](https://github.com/graphty-org/graphty-monorepo/commit/9de6080dbd))
- **graphty:** open the neighbor list at the reach of the filter that is on, and wrap its heading ([711948b7eb](https://github.com/graphty-org/graphty-monorepo/commit/711948b7eb))
- **compact-mantine:** a menu opened by a click highlights no row, whatever its first row is ([f6178594ec](https://github.com/graphty-org/graphty-monorepo/commit/f6178594ec))
- **compact-mantine:** show a cut section title whole in the shared tooltip ([ee2a7c3424](https://github.com/graphty-org/graphty-monorepo/commit/ee2a7c3424))
- **graphty:** open the graph from its title; mark the open step; no reset at a default ([ac31472822](https://github.com/graphty-org/graphty-monorepo/commit/ac31472822))
- **compact-mantine:** fill the chosen segment and show one cursor on every control ([c826a0c0dd](https://github.com/graphty-org/graphty-monorepo/commit/c826a0c0dd))
- **compact-mantine:** tint a parent row only while it is selected, and check each scheme's stat row ([66cb53386e](https://github.com/graphty-org/graphty-monorepo/commit/66cb53386e))
- repair what merging master broke on the studio branch ([#1636](https://github.com/graphty-org/graphty-monorepo/issues/1636))
- **compact-mantine:** open a short list whole beside a field at the window's edge ([ca3f105151](https://github.com/graphty-org/graphty-monorepo/commit/ca3f105151))
- **compact-mantine:** end long find results in "..." with no sideways scroll ([1fc173a120](https://github.com/graphty-org/graphty-monorepo/commit/1fc173a120))
- **graphty:** give the focused inspector title no mark and keep focus after Rerun and Back ([7f61a2ab24](https://github.com/graphty-org/graphty-monorepo/commit/7f61a2ab24))
- **compact-mantine:** keep a clicked control's tooltip closed and a pointer-opened menu unhighlighted ([fb03bf95ac](https://github.com/graphty-org/graphty-monorepo/commit/fb03bf95ac))
- **graphty:** find list counts each kind, shows its scrollbar and rests only on a whole row ([a930cc3df4](https://github.com/graphty-org/graphty-monorepo/commit/a930cc3df4))
- **graphty:** mark the inspector title's focus with an underline, name its actions button, focus Hops in a neighborhood and say how far past one hop ([69fcfef7f8](https://github.com/graphty-org/graphty-monorepo/commit/69fcfef7f8))
- **compact-mantine:** keep tree and menu keys and highlights where the reader expects them ([03a444fdfe](https://github.com/graphty-org/graphty-monorepo/commit/03a444fdfe))
- **compact-mantine:** open a tooltip on hover only after the pointer moves onto its target ([30d6496eae](https://github.com/graphty-org/graphty-monorepo/commit/30d6496eae))
- **graphty:** one Escape closes only an open list, Made with's weight as a short value, run times ([2f903d67d9](https://github.com/graphty-org/graphty-monorepo/commit/2f903d67d9))
- **graphty:** filter steps show on and off and what they keep; saving a step turns it on ([ae4ace1b0c](https://github.com/graphty-org/graphty-monorepo/commit/ae4ace1b0c))
- **graphty:** truthful import checks, child source rows, and a replace drawn as an open is ([3c6b76c7f4](https://github.com/graphty-org/graphty-monorepo/commit/3c6b76c7f4))
- **compact-mantine:** keep a row's name, mark the selected parent, consume a list's Escape ([63e5e8fc1f](https://github.com/graphty-org/graphty-monorepo/commit/63e5e8fc1f))
- **graphty:** find an edge by its name and keep a typed rule in the box ([8c3bdf125e](https://github.com/graphty-org/graphty-monorepo/commit/8c3bdf125e))
- **graphty:** make the inspector's facts read as facts and give its views a way back ([00706cae52](https://github.com/graphty-org/graphty-monorepo/commit/00706cae52))
- **graphty:** word the import page for readers and follow the reader's action ([f57379faf0](https://github.com/graphty-org/graphty-monorepo/commit/f57379faf0))
- **compact-mantine:** keep segmented labels whole, draw one focus ring on a bound field, and show find hints at hint size ([414681362d](https://github.com/graphty-org/graphty-monorepo/commit/414681362d))
- **compact-mantine:** fit row text when there is room and carry the whole row in a cut row's tooltip ([f00992b26a](https://github.com/graphty-org/graphty-monorepo/commit/f00992b26a))
- **compact-mantine:** shut a cut name's tooltip when its row is pressed ([a2bbb2248c](https://github.com/graphty-org/graphty-monorepo/commit/a2bbb2248c))
- **compact-mantine:** a tree row's checkbox keeps its size beside a count ([1c723b4158](https://github.com/graphty-org/graphty-monorepo/commit/1c723b4158))
- **compact-mantine:** a bare Input.Wrapper draws its description at the fields' 11px ([aaf5ef737d](https://github.com/graphty-org/graphty-monorepo/commit/aaf5ef737d))
- **compact-mantine:** a tree row's pinned text gives way before its name ([3ea9171e3c](https://github.com/graphty-org/graphty-monorepo/commit/3ea9171e3c))
- **compact-mantine:** keep a long stat value inside its row and its name readable ([a8dae1930a](https://github.com/graphty-org/graphty-monorepo/commit/a8dae1930a))
- **compact-mantine:** a cut row name shows its whole text from anywhere on its row ([2084adbdf6](https://github.com/graphty-org/graphty-monorepo/commit/2084adbdf6))
- **compact-mantine:** keep a search field's joined control on the field's line ([88749291ad](https://github.com/graphty-org/graphty-monorepo/commit/88749291ad))
- **compact-mantine:** turn touch emulation off after a test's touch drag ([b40f264a9b](https://github.com/graphty-org/graphty-monorepo/commit/b40f264a9b))
- **compact-mantine:** keep focus in the tree when its focused row is deleted ([befd9c37dd](https://github.com/graphty-org/graphty-monorepo/commit/befd9c37dd))
- **compact-mantine:** raise gray helper text to 4.5:1 in both schemes ([#8](https://github.com/graphty-org/graphty-monorepo/issues/8), [#2](https://github.com/graphty-org/graphty-monorepo/issues/2), [#868](https://github.com/graphty-org/graphty-monorepo/issues/868), [#6](https://github.com/graphty-org/graphty-monorepo/issues/6), [#0000008](https://github.com/graphty-org/graphty-monorepo/issues/0000008))
- **graphty:** make a clickable row's trailing glyph part of the row ([794674a635](https://github.com/graphty-org/graphty-monorepo/commit/794674a635))
- **graphty:** keep focus in a dialog opened from a menu ([b7db5da7d9](https://github.com/graphty-org/graphty-monorepo/commit/b7db5da7d9))
- **graphty:** resize the classic shell's panels and table with the shared resize handle ([38789b7f44](https://github.com/graphty-org/graphty-monorepo/commit/38789b7f44))
- **graphty:** keep a grown neighborhood's list current and give its actions button a full touch target ([7eb70e0171](https://github.com/graphty-org/graphty-monorepo/commit/7eb70e0171))
- **compact-mantine:** ring a focusable control the theme gave no ring class ([28bcb71a0e](https://github.com/graphty-org/graphty-monorepo/commit/28bcb71a0e))
- **compact-mantine:** draw no Open list arrow on a ComboInput with no choices ([b7bc18953b](https://github.com/graphty-org/graphty-monorepo/commit/b7bc18953b))
- **compact-mantine:** stop pointer drags from selecting page text and widen touch targets ([9ce31435cf](https://github.com/graphty-org/graphty-monorepo/commit/9ce31435cf))
- **compact-mantine:** give the modal footer touch-sized insets and let a wide shortcut tab scroll to its start ([a625b9a839](https://github.com/graphty-org/graphty-monorepo/commit/a625b9a839))
- **compact-mantine:** open a submenu on click or tap instead of closing the menu ([6db47aaead](https://github.com/graphty-org/graphty-monorepo/commit/6db47aaead))
- **graphty:** name the chrome's controls once and give cut names and icon menus tooltips ([f60a817111](https://github.com/graphty-org/graphty-monorepo/commit/f60a817111))
- **graphty:** make the Export dialog modal and name its two kinds as tabs ([557713b819](https://github.com/graphty-org/graphty-monorepo/commit/557713b819))

### 🧱 Updated Dependencies

- Updated visual-review to 0.2.36

### ❤️ Thank You

- Adam Powers @apowers313
- graphty-agent @graphty-agent

## 0.9.33 (2026-10-21)

### 🚀 Features

- **compact-mantine:** menus follow the page theme, with an opt-in inverse variant ([#1](https://github.com/graphty-org/graphty-monorepo/issues/1), [#0768](https://github.com/graphty-org/graphty-monorepo/issues/0768), [#0](https://github.com/graphty-org/graphty-monorepo/issues/0))
- **compact-mantine:** deprecate ControlSubGroup ([077224b5d](https://github.com/graphty-org/graphty-monorepo/commit/077224b5d))
- **compact-mantine:** add danger and warning text inks to PANEL_INK ([#2981](https://github.com/graphty-org/graphty-monorepo/issues/2981))

### 🩹 Fixes

- **compact-mantine:** a full-width button cuts a long label with an ellipsis ([fc39f7141](https://github.com/graphty-org/graphty-monorepo/commit/fc39f7141))
- **compact-mantine:** resolve a menu surface in the same scheme as its rows ([#008043](https://github.com/graphty-org/graphty-monorepo/issues/008043), [#79](https://github.com/graphty-org/graphty-monorepo/issues/79), [#3057](https://github.com/graphty-org/graphty-monorepo/issues/3057))
- **compact-mantine:** read a click as a pointer when it has a click count or a pointer type ([#1515](https://github.com/graphty-org/graphty-monorepo/issues/1515))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.32 (2026-10-20)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.31 (2026-10-18)

### 🚀 Features

- **compact-mantine:** add the graphty brand accent theme option ([#97](https://github.com/graphty-org/graphty-monorepo/issues/97), [#588300](https://github.com/graphty-org/graphty-monorepo/issues/588300), [#3117](https://github.com/graphty-org/graphty-monorepo/issues/3117))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.30 (2026-10-18)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.29 (2026-10-18)

### 🩹 Fixes

- **graphty:** use CompactColorInput for the Style tab's color lines ([#3052](https://github.com/graphty-org/graphty-monorepo/issues/3052))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.28 (2026-10-17)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.27 (2026-10-17)

### 🚀 Features

- **compact-mantine:** replace legacy number, select and fold controls with Figma rows ([968d8fd6b](https://github.com/graphty-org/graphty-monorepo/commit/968d8fd6b))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.26 (2026-10-16)

### 🩹 Fixes

- **compact-mantine:** start a vertical pill tab's label at its leading edge ([#2905](https://github.com/graphty-org/graphty-monorepo/issues/2905))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.25 (2026-10-16)

### 🩹 Fixes

- **compact-mantine:** report one segmented control change per click ([#2944](https://github.com/graphty-org/graphty-monorepo/issues/2944))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.24 (2026-10-15)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.23 (2026-10-14)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.22 (2026-10-13)

### 🩹 Fixes

- **graphty-element:** free each test file's page under v8 coverage in browser tests ([#2247](https://github.com/graphty-org/graphty-monorepo/issues/2247))
- **compact-mantine:** stop the size glyphs reading as a magnifying glass ([#2101](https://github.com/graphty-org/graphty-monorepo/issues/2101))
- **compact-mantine:** dim disabled field placeholders and disabled toggle icons ([#2102](https://github.com/graphty-org/graphty-monorepo/issues/2102))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.21 (2026-10-13)

### 🩹 Fixes

- **compact-mantine:** name the departure note by its severity word and its own text ([#2103](https://github.com/graphty-org/graphty-monorepo/issues/2103))
- **tools:** cap each test slot's Node workers at its share of the cores ([9daf98f16](https://github.com/graphty-org/graphty-monorepo/commit/9daf98f16))
- **compact-mantine:** make a Tree one Tab stop, with row toggles reached by the arrow keys ([#2099](https://github.com/graphty-org/graphty-monorepo/issues/2099))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.20 (2026-10-12)

### 🩹 Fixes

- **compact-mantine:** document an empty section as its 40px header and rule ([8a7d8fcbc](https://github.com/graphty-org/graphty-monorepo/commit/8a7d8fcbc))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.19 (2026-10-12)

### 🩹 Fixes

- **compact-mantine:** name the color input's controls from its label ([#2100](https://github.com/graphty-org/graphty-monorepo/issues/2100))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.18 (2026-10-12)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.17 (2026-10-11)

### 🩹 Fixes

- **compact-mantine:** end the Toolbar Keyboard story after Move's tooltip opens ([#1997](https://github.com/graphty-org/graphty-monorepo/issues/1997))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.16 (2026-10-11)

### 🚀 Features

- **tools:** fail a CI test that uses more than 25% of its time limit ([#1602](https://github.com/graphty-org/graphty-monorepo/issues/1602))

### 🩹 Fixes

- **compact-mantine:** keep a dragged pop-out where it was put when its sidebar anchor changes ([#1971](https://github.com/graphty-org/graphty-monorepo/issues/1971))
- **compact-mantine:** make the focusable ScrollArea viewport opt-in ([#1599](https://github.com/graphty-org/graphty-monorepo/issues/1599))
- **compact-mantine:** name unlabeled controls and make ScrollArea keyboard scrollable ([a95b241e0](https://github.com/graphty-org/graphty-monorepo/commit/a95b241e0))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.15 (2026-10-10)

### 🩹 Fixes

- **compact-mantine:** mark a queued popout reposition so settled-layout waits for it ([#1825](https://github.com/graphty-org/graphty-monorepo/issues/1825))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.14 (2026-10-09)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.13 (2026-10-09)

### 🩹 Fixes

- **compact-mantine:** register the browser commands for the storybook test project ([#1566](https://github.com/graphty-org/graphty-monorepo/issues/1566), [#1480](https://github.com/graphty-org/graphty-monorepo/issues/1480))
- **compact-mantine:** theme Input.Wrapper labels like every field label ([#877](https://github.com/graphty-org/graphty-monorepo/issues/877))
- **compact-mantine:** make dimmed text meet AA under the high-contrast tokens ([#2](https://github.com/graphty-org/graphty-monorepo/issues/2), [#1405](https://github.com/graphty-org/graphty-monorepo/issues/1405))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.12 (2026-10-08)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.11 (2026-10-08)

### 🩹 Fixes

- **compact-mantine:** anchor pop-out panels inside transformed ancestors ([#433](https://github.com/graphty-org/graphty-monorepo/issues/433))

### 🔥 Performance

- **compact-mantine:** skip the pop-out scale probe when there is no layout ([#433](https://github.com/graphty-org/graphty-monorepo/issues/433))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.10 (2026-10-08)

### 🩹 Fixes

- **compact-mantine:** a key press warms only a focus that moves after it ([76d3b0636](https://github.com/graphty-org/graphty-monorepo/commit/76d3b0636))
- **compact-mantine:** announce QuickActions' empty result in an output element ([aeab315b6](https://github.com/graphty-org/graphty-monorepo/commit/aeab315b6))
- **compact-mantine:** clear the ARIA violations axe reports on ten components' stories ([#430](https://github.com/graphty-org/graphty-monorepo/issues/430))
- **compact-mantine:** the accent follows the theme's primaryColor ([#0](https://github.com/graphty-org/graphty-monorepo/issues/0), [#437](https://github.com/graphty-org/graphty-monorepo/issues/437))
- **compact-mantine:** settle the SplitButton keyboard story before capture ([#1305](https://github.com/graphty-org/graphty-monorepo/issues/1305), [#1317](https://github.com/graphty-org/graphty-monorepo/issues/1317))
- **compact-mantine:** hide a tooltip until its hold is decided ([#1294](https://github.com/graphty-org/graphty-monorepo/issues/1294))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.9 (2026-10-07)

### 🩹 Fixes

- **compact-mantine:** keep the Tab tooltip hand-off warm when rendering is slow ([192dbaa74](https://github.com/graphty-org/graphty-monorepo/commit/192dbaa74))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.8 (2026-10-07)

### 🩹 Fixes

- **compact-mantine:** report change-end for eyedropper and swatch picks ([#435](https://github.com/graphty-org/graphty-monorepo/issues/435))
- **compact-mantine:** forward aria-expanded and aria-controls in toggle rows ([#138](https://github.com/graphty-org/graphty-monorepo/issues/138))
- **compact-mantine:** merge caller comboboxProps over list defaults ([#434](https://github.com/graphty-org/graphty-monorepo/issues/434))
- **compact-mantine:** tree rows take an accessible name and description ([f0b15c18f](https://github.com/graphty-org/graphty-monorepo/commit/f0b15c18f))
- **compact-mantine:** a ToolButton can be disabled with its reason ([97c2db6ab](https://github.com/graphty-org/graphty-monorepo/commit/97c2db6ab))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.7 (2026-10-06)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.6 (2026-10-05)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.5 (2026-10-05)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.4 (2026-10-04)

### 🚀 Features

- **compact-mantine:** add pinned columns and header glyphs, tooltips and menus to DataTable ([#924](https://github.com/graphty-org/graphty-monorepo/pull/924))
- **compact-mantine:** add descriptions, a search threshold and middle cuts to QuickActions ([#934](https://github.com/graphty-org/graphty-monorepo/pull/934))
- **compact-mantine:** give PageList rows a second line, a trailing value and a row menu ([#920](https://github.com/graphty-org/graphty-monorepo/pull/920))
- **compact-mantine:** add swatch, count, progress, description and row keys to Tree rows ([#908](https://github.com/graphty-org/graphty-monorepo/pull/908))
- **compact-mantine:** let a collapsed ControlSection show a one-line summary ([#916](https://github.com/graphty-org/graphty-monorepo/pull/916))

### 🩹 Fixes

- **compact-mantine:** clear the SonarQube findings on the quick actions and page list ([2c8016669](https://github.com/graphty-org/graphty-monorepo/commit/2c8016669))
- **compact-mantine:** always show the quick actions search field and keep focus there ([4f9c1a0c9](https://github.com/graphty-org/graphty-monorepo/commit/4f9c1a0c9))
- **compact-mantine:** leave Space on the QuickActions list alone ([#934](https://github.com/graphty-org/graphty-monorepo/pull/934))
- **compact-mantine:** keep a Pill's remove button reachable when a caller passes attributes ([#925](https://github.com/graphty-org/graphty-monorepo/pull/925))
- **compact-mantine:** keep header names clear of the menu caret; make columnMenu optional ([#924](https://github.com/graphty-org/graphty-monorepo/pull/924))
- **compact-mantine:** keep a PageList row menu out of the Tab order ([#920](https://github.com/graphty-org/graphty-monorepo/pull/920))
- **compact-mantine:** keep a DataTable header menu open when opened from the keyboard ([#924](https://github.com/graphty-org/graphty-monorepo/pull/924))
- **compact-mantine:** make a removable Pill's remove button reachable and named ([#925](https://github.com/graphty-org/graphty-monorepo/pull/925))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.9.3 (2026-10-04)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.2 (2026-10-04)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.1 (2026-10-04)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.9.0 (2026-10-03)

### 🚀 Features

- ⚠️ **compact-mantine:** stop theming Mantine's ColorInput and ColorPicker ([#672](https://github.com/graphty-org/graphty-monorepo/issues/672))
- ⚠️ **compact-mantine:** remove icon group row, narrow data row, add tree helpers ([1e463501](https://github.com/graphty-org/graphty-monorepo/commit/1e463501))
- ⚠️ **compact-mantine:** match the figma editor's components in light and dark ([#0](https://github.com/graphty-org/graphty-monorepo/issues/0))

### 🩹 Fixes

- **compact-mantine:** keep a focused tree row action's ring off its neighbor ([9c9c8acf](https://github.com/graphty-org/graphty-monorepo/commit/9c9c8acf))
- **compact-mantine:** draw a pressable row's ring inside its pill so its sides are not clipped ([438fc60b](https://github.com/graphty-org/graphty-monorepo/commit/438fc60b))
- **compact-mantine:** add a stat mode to DataRow ([#140](https://github.com/graphty-org/graphty-monorepo/issues/140))
- **compact-mantine:** settle the focused control's tooltip before two stories end ([1255563c](https://github.com/graphty-org/graphty-monorepo/commit/1255563c))
- **compact-mantine:** end the pick-from-flyout story once the face's tooltip shows ([24e02d33](https://github.com/graphty-org/graphty-monorepo/commit/24e02d33))
- **compact-mantine:** let focus and hover tooltips finish before a story is captured ([16bd9dcc](https://github.com/graphty-org/graphty-monorepo/commit/16bd9dcc))
- **compact-mantine:** make five overlay stories capture the same way every time ([b1aee374](https://github.com/graphty-org/graphty-monorepo/commit/b1aee374))
- **compact-mantine:** match figma rings, gaps and row pitch; honor reduced motion ([4f2e1912](https://github.com/graphty-org/graphty-monorepo/commit/4f2e1912))
- **compact-mantine:** keep the checked option on the field when a list overflows ([63ef41aa](https://github.com/graphty-org/graphty-monorepo/commit/63ef41aa))
- **compact-mantine:** match figma quick actions, submenus, shortcut sheet; fix story plays ([dded3759](https://github.com/graphty-org/graphty-monorepo/commit/dded3759))

### ⚠️ Breaking Changes

- **compact-mantine:** stop theming Mantine's ColorInput and ColorPicker ([#672](https://github.com/graphty-org/graphty-monorepo/issues/672))
  the theme no longer styles Mantine's ColorInput or
  ColorPicker; both render as plain Mantine. Migration: use
  CompactColorInput (ColorPickerPanel for the picker on its own surface).
  Refs #672
- **compact-mantine:** remove icon group row, narrow data row, add tree helpers ([1e463501](https://github.com/graphty-org/graphty-monorepo/commit/1e463501))
  IconGroupRow, IconGroupRowProps and IconGroupOption are
  removed. DataRow loses role, tabIndex, onDoubleClick and onContextMenu, and
  the DataRowRole type is removed. CHANGELOG-figma.md has the migrations.
- **compact-mantine:** match the figma editor's components in light and dark ([#0](https://github.com/graphty-org/graphty-monorepo/issues/0))
  51 breaking changes, listed in compact-mantine/CHANGELOG-figma.md; the largest
  are the 240 px panel with 88 px fields, Select and Autocomplete as combobox roles, pill Tabs by
  default, one root popout at a time, and the restyled ControlSection.

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.19 (2026-10-02)

### 🩹 Fixes

- **compact-mantine:** accent text contrast, labelled segmented controls, one colour callback ([#135](https://github.com/graphty-org/graphty-monorepo/issues/135), [#136](https://github.com/graphty-org/graphty-monorepo/issues/136), [#141](https://github.com/graphty-org/graphty-monorepo/issues/141))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.18 (2026-10-02)

### 🚀 Features

- **compact-mantine:** let DataTable draw a window of a larger list ([0284b3ad](https://github.com/graphty-org/graphty-monorepo/commit/0284b3ad))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.17 (2026-10-02)

### 🩹 Fixes

- **compact-mantine:** type the CompoundRow warning spy so the test type-check passes ([42b0086e](https://github.com/graphty-org/graphty-monorepo/commit/42b0086e))
- **compact-mantine:** inputs follow the size scale and the password toggle has a name ([#7](https://github.com/graphty-org/graphty-monorepo/issues/7), [#137](https://github.com/graphty-org/graphty-monorepo/issues/137), [#82](https://github.com/graphty-org/graphty-monorepo/issues/82))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.16 (2026-10-01)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.15 (2026-10-01)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.14 (2026-09-30)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.13 (2026-09-30)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.12 (2026-09-29)

### 🩹 Fixes

- **compact-mantine:** draw the attribute glyph's dot as a filled disc ([c617d5e4](https://github.com/graphty-org/graphty-monorepo/commit/c617d5e4))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.11 (2026-09-28)

### 🚀 Features

- **workspace:** capture like chromatic and make the review page easier to judge ([a8f4ad8c](https://github.com/graphty-org/graphty-monorepo/commit/a8f4ad8c))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.10 (2026-09-28)

### 🩹 Fixes

- **tools:** run knip per package and build only projects with a build target ([1292b67a](https://github.com/graphty-org/graphty-monorepo/commit/1292b67a))
- **compact-mantine:** draw the indicator story's avatar without the network ([21399ea2](https://github.com/graphty-org/graphty-monorepo/commit/21399ea2))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.9 (2026-09-28)

### 🩹 Fixes

- **compact-mantine:** name modal close buttons and drop the menu focus placeholder ([01615522](https://github.com/graphty-org/graphty-monorepo/commit/01615522))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.8 (2026-09-27)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.7 (2026-09-26)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.6 (2026-09-25)

### 🩹 Fixes

- **graphty:** overlays close pop-outs, layer drags move one layer, runs keep their layers ([#184](https://github.com/graphty-org/graphty-monorepo/issues/184), [#164](https://github.com/graphty-org/graphty-monorepo/issues/164), [#163](https://github.com/graphty-org/graphty-monorepo/issues/163), [#6](https://github.com/graphty-org/graphty-monorepo/issues/6), [#4](https://github.com/graphty-org/graphty-monorepo/issues/4))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.5 (2026-09-24)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.4 (2026-09-24)

### 🩹 Fixes

- **compact-mantine:** ship the CommonJS type declarations ([a18984e6](https://github.com/graphty-org/graphty-monorepo/commit/a18984e6))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.3 (2026-09-24)

### 🩹 Fixes

- **compact-mantine:** lint stories and tests and fix what surfaced ([20c20faa](https://github.com/graphty-org/graphty-monorepo/commit/20c20faa))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.2 (2026-09-21)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.

## 0.8.1 (2026-09-20)

This was a version bump only for compact-mantine to align it with other projects, there were no code changes.
