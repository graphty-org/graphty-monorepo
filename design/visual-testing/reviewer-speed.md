# Visual review: reviewer speed

The review page (`visual-review/trusted/page/`, served by `visual-review/trusted/lib/serve.mjs`)
is where the owner accepts or rejects every screenshot that differs from its baseline, mostly on
an iPad, often with a hardware keyboard, in sittings of hundreds of images. This plan covers six
open issues that make a long sitting slow:

| Issue | What the owner asked for |
| ----- | ------------------------ |
| #855 | Accepting a component's group in the grid ("Accept 6") reloads the grid and jumps to the top |
| #856 | Accept everything the current filter shows (all removed, all new), not only everything |
| #857 | An option to hide the baseline (left) image |
| #858 | A recommended zoom point: at 2x-8x, each item opens framed on where to look |
| #859 | One way to move back and forward between targets, grid, projects and the item screen |
| #860 | A compact control panel, laid out from the controls actually used, that fits an iPad |

Words: a **target** is one pull request (or the default branch's seed run); a **project** is one
Storybook in it (compact-mantine, graphty-element, ...); an **item** is one screenshot; the
**grid** is a project's tiles; the **story screen** shows one item's baseline and new image; a
**pass** is the frozen list of items Next and Previous walk. `design/visual-testing/review-page-ux.md`
holds the page's earlier design and its success criteria; every one of them still holds unless
this document says otherwise.

Nothing here changes what Finish signs or what the gate checks. An accept made in bulk is stored
exactly as Accept all stores one today (`{ decision: "accept", reason: null, bulk: true, hash,
base }`, one entry per item), and Finish signs those entries as it does now.

## 1. Measured control usage

### What was measured

The server writes no request log and the page records no client-side events, so presses of view,
zoom, outline, blink, filter, Next, Previous and keyboard shortcuts were never recorded anywhere.
Two sources exist:

- **Stored decisions**: every `tmp/visual-review/state/<target>.json` in every worktree that ran
  a review server (14 files with decisions, in 6 worktrees; the owner's current server is
  `visual-review-server-v3`). Each entry says accept, reject or exclude, whether it carries a
  note, and `bulk: true` when Accept all or a group's "Accept N" made it and the item was never
  opened afterwards. Matched by image hash against the run's `results.json`, each entry also has
  the item's status.
- **Server output logs** (`~/.servherd/pm2/logs/servherd-visual-review*-out.log`): one line per
  Finish started and done.

Scripts: `tmp/reviewer-speed/count-usage.mjs` and `count-409.mjs` (not committed).

### Decisions

| Decision | Count | Share |
| -------- | ----: | ----: |
| Accept | 1,080 | 97.5% |
| Reject | 28 | 2.5% |
| Exclude | 0 | 0% |
| **Total** | **1,108** | |

- **Notes**: all 28 rejects carry a note (the page requires one); 0 of 1,080 accepts do.
- **Bulk against one at a time**: 559 accepts were made in bulk and never opened; 549 decisions
  were made on the story screen (some of those 549 began as bulk accepts that were opened later,
  which clears the flag, so bulk is a lower bound).
- **By status**: changed 619 accepts (334 bulk), new or no-baseline-yet 147 (92 bulk), removed
  136 (131 bulk), and 178 whose run has since been replaced (recorded as "unchanged" now).
- **Pull request #409**, the session behind #855 and #856: 875 decisions in compact-mantine and
  graphty. All 131 removed items there were accepted in bulk, across 18 components: 18 presses of
  a group's "Accept N", each followed by the jump to the top. 90 new items went the same way
  across 22 components, and 334 changed items across 29.
- **Finish**: 22 Finish runs in the logs, 0 to 361 decisions each.
- **Undo**: cannot be counted. An undone decision is deleted from the state file and nothing logs
  it.

### Where the data is too thin, and what was inferred instead

Nothing records which view (side by side, Flash, Highlight, Spotlight), zoom level, outline,
blink, filter or key the owner uses. For those, the plan relies on what the owner has said in
earlier sessions and in these issues:

- **Zoom 2x-8x is in regular use** (stated in #858).
- **The changed-area outline gets in the way**: "can you please give me a way to remove the
  purple boxes? they are just obstructing my view" -- an option, not a frequent control.
- **The red changed-pixel overlay (Highlight) is wanted** ("similar to what Chromatic does").
- **An iPad with a hardware keyboard** is the main setup, so the letter keys matter as much as the
  buttons, and every control still needs a 44 px touch target.
- **Filters**: the owner asks for "removed" and "new" filters by name (#856), so those are used.

To make the next round of tuning measured rather than inferred, #860 adds a local press counter
(section 7): the page counts presses of each control and key in the browser's own storage and
lists the most used in the Keys overlay. Nothing is sent anywhere.

### Frequency tiers used for the layout

| Tier | Controls | Basis |
| ---- | -------- | ----- |
| Every item | Accept, Next | 97.5% of decisions; accepting moves on |
| Often | Previous, Reject (with its note), zoom, view (Flash, Highlight), a group's or a filter's Accept N | measured (reject, bulk) and stated (zoom, Highlight) |
| Sometimes | Undo, Finish, project and target switch, Grid, Spotlight, Next change, filters | measured (Finish) or required on every target |
| Rare | Exclude, a note on an accept, Outline, Blink, Spotlight flash, Details, Copy link | measured 0 (Exclude, accept notes) or asked to be hidden (Outline) |

## 2. #855: accepting a group reloads the grid and jumps to the top

### Cause

Pressing a component's "Accept N" runs `acceptAll(component)` in `review.js`:

1. `ask()` opens a confirmation dialog. When it closes, the browser gives focus back to the
   "Accept N" button.
2. `POST /api/accept-all`, then `reload()`: a `GET /api/pr/<target>/<project>` that refetches the
   whole project (every item and every decision). This is the "reload" the owner sees.
3. `showGrid()` rebuilds the whole grid: `render()` calls `app.replaceChildren(...)` on `#app`,
   the `<main>` that is the grid's scroll container, with every tile new (thumbnails hidden until
   they load again).

The jump is step 3 combined with step 1. `#app`'s children are removed while the focused "Accept
N" button is among them. Chromium's focus fix-up, run when the focused element is removed, lays
the page out while `#app` is still empty, which clamps `#app.scrollTop` to 0; the new tiles then
arrive with the scroll already at the top. Measured in Chromium with 30 components of 6 items,
scrolled to component 20: `scrollTop` 11,668 before, 0 after. Replacing the same children while
focus is outside `#app` keeps `scrollTop` (11,000 stays 11,000); with focus inside, the same
replacement moved it (11,000 became 5,403 with cloned children, 0 in the real flow). Blurring the
button first keeps it. Turning scroll anchoring off makes no difference, so anchoring is not the
mechanism. Script: `tmp/reviewer-speed/repro-855.mjs`.

WebKit does not start on this host (missing system libraries), so iPad Safari was not measured.
The fix below never replaces `#app`'s children on an accept, so it does not depend on either
engine's behavior.

Undo of one tile and a component's "Undo N" go through the same `reload()` and `showGrid()`, and
have the same bug.

### Change

- **Update in place, no reload.** `POST /api/accept-all` answers with the files it accepted
  (`{ accepted, files, unpublished }`). The page writes those decisions into `state.data`, as
  `decide()` already does for a single item, and patches only what changed: each accepted tile is
  redrawn as decided; under "Needs a decision" the decided tiles are removed, and a story or
  component left empty is removed with them. The component's header buttons, the grid bar's
  counts and the header's Finish count are redrawn. Content above the group does not change, so
  the next group lands where the accepted one was, under the same finger, ready for its own
  "Accept N".
- **Focus.** Before removing anything that holds focus, the page moves focus to the next
  component's "Accept N" (or to `#app`, `preventScroll: true`), so keyboard users can press again.
- **No question for a visible group.** A group's "Accept N" stops asking. Its items are on screen
  as tiles, the decisions are local until Finish, and the status row's message offers Undo. Accept
  all and accept-what-the-filter-shows (#856) still ask, because they cover items off screen.
  Two-way door: if a confirmation is missed, it is one line to restore.
- **Every full redraw keeps the grid's place.** `render()` moves focus out of `#app` before
  replacing its children, and `showGrid()` keeps `#app.scrollTop` when it redraws the same grid
  (same target, project and filter). This covers Undo, "Undo N" and any later caller.

### Files and functions

- `visual-review/trusted/lib/serve.mjs`: `POST /api/accept-all` returns `files`.
- `visual-review/trusted/page/review.js`: `acceptAll`, `undo`, `render`, `showGrid`, and a new
  `patchGrid(files)` beside `showGrid`.

### Tests

- `test/serve.test.mjs`: accept-all's answer lists exactly the files it accepted.
- `test/page.test.mjs`: a fixture of 30 components (built with `withMoved(r, extra)`), a short
  window, scrolled to component 20: its "Accept N" leaves `#app.scrollTop` where it was, the next
  component's top where the accepted one's was, makes no `GET /api/pr/...` request, and focus is
  on the next component's "Accept N". The same for a tile's Undo and a component's "Undo N".
  The existing test "accepts one component's undecided items after asking" changes to "without
  asking".

## 3. #856: accept everything the filter shows

### Cause

The grid has two bulk accepts: "Accept all undecided (N)" (the whole project) and each component's
"Accept N" (`undecided(component)`). Neither looks at the filter or the Find text. Worse, under
the "Removed" filter a component's "Accept N" counts and accepts its changed and new items too,
which the filter is hiding.

### Change

- **One bulk button that follows the grid.** The grid bar's button accepts exactly the undecided,
  acceptable items the grid shows (`visibleItems()`: filter and Find text), and says what that is:
  "Accept all 152 undecided" under "Needs a decision" with no Find text, "Accept 131 removed"
  under Removed, "Accept 90 new", "Accept 12 matching" with Find text. Shift+A does the same. It
  asks first, naming the count and how many removals it deletes, as Accept all does today.
- **A group's "Accept N" follows the filter too**: it accepts the undecided acceptable items of
  that component that the grid shows.
- **Server**: `POST /api/accept-all` takes an optional `files` list. Each listed file is accepted
  only if it is in the project, undecided, and passes the same `decisionProblem` check as today;
  anything else is skipped and counted. Without `files` it behaves as today (the whole project).
  The page always sends `files`, built from what it shows, so a stale page never accepts an item
  it was not showing. The `component` parameter is no longer sent by the page and is removed.
  The run id and attempt check stays.

### Files and functions

- `serve.mjs`: `POST /api/accept-all` (`files`, the `inScope` filter).
- `review.js`: `acceptAll(scope)`, `undecided` (replaced by a filter-aware helper over
  `visibleItems()`), `showGrid` (the button's label), the Shift+A key.
- `README.md`: the grid section and the Keys table.

### Tests

- `serve.test.mjs`: `files` accepts only those files; skips decided, unacceptable (unstable,
  failed) and unknown files; the stored entries are identical in shape to Accept all's; a stale
  run id is refused as today.
- `page.test.mjs`: under Removed, the button reads "Accept 1 removed" and accepts only the removed
  item; a group's "Accept N" under a filter accepts only what is shown; Find text narrows it; with
  nothing shown, the button is unavailable and says why.
- `accept.test.mjs` needs no change: Finish reads the same entries.

## 4. #860: the control panel

Built before #857 and #858 so their two new options go straight into it.

### Today

Measured in Chromium at iPad sizes on the story screen:

| Window | Controls take | Rows of controls | Each pane |
| ------ | ------------- | ---------------- | --------- |
| 820 x 1180 (iPad Air, portrait) | 465 px (39%) | header 2, decision bar 3, status 2 lines, item line 2 lines, view bar 2 | 386 x 683 |
| 1180 x 820 (landscape) | 346 px (42%) | header 1, decision bar 2, status 1, item line 2, view bar 2 | 566 x 443 |
| 744 x 1133 (iPad mini, portrait) | 465 px (41%) | as portrait | 348 x 636 |

The decision bar spends a whole row on the note box (0 accept notes in 1,108 decisions) and gives
Exclude (0 uses) a button as large as Accept. The view bar spends a row on Outline, which the
owner asked to be able to remove.

### Layout

Kept from the earlier design: the decision buttons sit above the images, each in the same place
on every item, never removed (an unavailable one says why); every button shows its key; every
control is at least 44 px tall on a touch screen; nothing scrolls sideways.

Portrait, 744 to 820 px wide, four rows (about 210 px; the panes gain about 250 px):

```
| Visual review > #409 v > compact-mantine (12) v  < >  Grid          Finish #409 (31)  ... |
| < Prev  K   2/6, 6 left   Next > J        Undo U   Exclude E   Reject R   [ Accept  A ] |
| #2 button--primary (dark)  changed   880 px changed in 40 x 40 at (160, 80)          (i) |
| Side  Flash F  Highlight H  Spotlight S    Fit 1x 2x 4x 8x  Z        View ...           |
```

Landscape, 1180 px wide, three rows (about 180 px; the panes gain about 165 px):

```
| Visual review > #409 v > compact-mantine (12) v  < >  Grid                Finish #409 (31)  Keys ?  ... |
| < Prev K   2/6, 6 left   Next > J     Undo U   Exclude E   Reject R   [ Accept  A ]   Note: ______       |
| #2 button--primary (dark)  changed    Side  Flash F  Highlight H  Spotlight S   Fit 1x 2x 4x 8x Z  View |
```

- **Row order and thumb reach.** The decision row stays above the images (the owner's earlier
  rule). Accept is the widest button and sits at the row's right end, the corner nearest the right
  thumb in landscape and the free hand in portrait; Previous and Next sit at the left end, nearest
  the left thumb. Reject is next to Accept with a gap, so a slip lands on nothing rather than on
  the opposite decision. Undo and Exclude, the least used, sit in the middle.
- **The note box** no longer has a row. It opens in the item row, in place of the explanation,
  when Reject or Exclude waits for its reason (focus goes into it, as now), or when the item's
  decision has a note. A note before an Accept (the two-step "type, Escape, A" flow) stays
  available from the View menu's "Add a note" and from the existing key flow; in landscape the box
  also fits at the end of the decision row, so it is shown there.
- **The item row** is one line: number, name, status badge and a short form of what changed,
  truncated; a tap opens the whole explanation (as the item line does today).
- **The view row** keeps the four views and the five zoom steps as visible segmented buttons
  (both "often"), and folds the rare options into one **View** menu (a `<details>` popover, as the
  grid's More menu already is): Outline (B), Blink (L), Spotlight flash, Baseline pane (#857),
  Focus point (#858), Next change (N) with its "1 of 3" count, Add a note, Details. Each still has
  its key, and each menu entry shows it. The view's own option (Blink in Highlight, Spotlight flash
  in Spotlight) also shows as a small toggle after the view buttons while that view is on, as now.
- **The status row** drops from two lines to one on narrow screens; "More" still opens a long
  message.
- **The header** becomes the navigation row of #859: the separate "Grid" button leaves the
  decision row (it is the Grid crumb; Escape still goes to the grid). Keys and Copy link move into
  the header's "..." menu below 1050 px.

### Press counter

`review.js` keeps `{ control: presses }` in local storage (`visual-review:usage`), counting each
button and key by its id (`accept`, `next`, `zoom-4`, `view-highlight`, `key-j`, ...). The Keys
overlay lists the ten most pressed. Nothing leaves the browser. When the owner reports the
counts, the tiers in section 1 can be checked against measured use.

### Files and functions

- `review.js`: `decisionBar`, `itemLine`, `viewBar`, `showStory` (focus rules unchanged),
  `toggleKeys` (the usage list), a `count(id)` call in the shared button helper and the keydown
  handler.
- `review.css`: `.decisionbar`, `.itemline`, `.viewbar`, the narrow-screen blocks, `#status-row`.
- `README.md`: "Opening the review page" and "Keys".

### Tests

- `page.test.mjs`, at 820 x 1180, 744 x 1133 and 1180 x 820 with touch: Accept, Reject, Exclude,
  Undo, Previous, Next, the four views, the five zoom steps and Finish are visible without opening
  a menu; nothing scrolls sideways; the controls above the panes take at most 220 px in portrait
  and 190 px in landscape; every control is at least 44 px tall. The existing "keeps every button
  in one place" test runs over the new bar unchanged. The note opens in place for a reject and
  keeps the decision row still. The usage counter counts a tap and a key and lists them in Keys.

## 5. #859: navigation

### Cause

Moving around takes four different mechanisms: the "Visual review" title (to the targets), two
header `<select>` pickers (target, project), the decision bar's Grid button, and the browser's
Back. There is no way to go forward from the grid back into the item last reviewed, and no way to
step to the next or previous project without opening the picker.

### Change

- **A breadcrumb in the header** on every screen, the same in both orientations:
  `Visual review > #409 v > compact-mantine (12) v > Grid` on the story screen and
  `Visual review > #409 v > compact-mantine (12) v > #2 button--primary` on the grid. Each part
  goes to its screen: "Visual review" to the targets, the target picker to that target's first
  project with undecided items, the project picker to that project's grid, "Grid" to the grid. On
  the grid, the last part goes forward into the item last opened, in its pass, at its place.
- **Previous and next project**: `<` and `>` beside the project picker step to the previous or
  next project of the target that has undecided items; keys `[` and `]`, on the grid and the story
  screen.
- **Escape goes up one level everywhere**: note box, then story to grid (as now), then grid to the
  targets.
- **Browser Back and Forward** keep working as now (`remember()` pushes one history entry per
  screen change).

### Files and functions

- `index.html`: the header's markup.
- `review.js`: `drawHeader`, `toGrid`, `remember`, the keydown handler (`[`, `]`, Escape on the
  grid), a `stepProject(direction)` helper next to `nextTarget`; the decision bar loses Grid.
- `review.css`: header rules.
- `README.md`: navigation and Keys.

### Tests

- `page.test.mjs`: the crumbs on each screen and where each goes; the grid's forward crumb
  reopens the last item in its pass; `]` and `[` and the arrows step projects with undecided items
  and skip the others; Escape on the grid shows the targets; Back and Forward still make no GitHub
  call (the existing test).

## 6. #857: hide the baseline

### Change

A **Baseline pane** option (labeled Baseline, on the views' row until #860's View menu; key `P`;
remembered in this browser with the other options in `visual-review:options`). Off, the stage
shows one pane, as wide as the two were, so at Fit the image is drawn about twice as large:

- side by side: the new image alone;
- Flash and Spotlight flash: unchanged in effect (they already alternate baseline and new in the
  right pane), now in the single wide pane;
- Highlight: the new image with the red overlay;
- Spotlight: the dimmed new image;
- an item with only a baseline (removed) shows its baseline, labelled so; an item with no capture
  (failed) shows its error.

The panes' scroll sync, Next change and the outline work on one pane as on two.

### Files and functions

- `review.js`: `state.onePane` beside `state.showBox`, `saveOptions`, `renderStage` (which panes
  it builds), `fit` (already per pane), the `p` key, the address (`baseline=off`).
- `review.css`: `.stage.one-pane` (one grid column).

### Tests

- `page.test.mjs`: P hides the left pane and the right pane doubles in width; the choice survives
  a reload and the next item; a removed item shows its baseline; Flash still alternates; the
  decision buttons do not move when it toggles.

## 7. #858: a recommended zoom point

### Change

A **Focus point** option (View menu, key `O`, remembered with the other options). On, every item
opens with its panes scrolled so the focus point is in the middle of the pane, at the zoom the
reviewer chose (2x stays 2x from item to item, as zoom already does). After Accept, the next item
appears already framed. At Fit nothing scrolls (the whole image is shown), so the option matters
from 1x up.

The focus point is chosen per item:

- **Changed and moved**: the center of the largest changed area. The page already computes the
  changed areas (`diffOf()` returns `boxes`, largest first); Next change still steps through the
  others, centering each.
- **New, no baseline yet, removed**: there is nothing to compare, so the point is the center of
  the image's content: the bounding box of the pixels that differ from the image's border color
  (a story's background), computed from the one image. A new image that is all background falls
  back to the center.
- **Failed, unstable**: no point; the panes open as today.

So that the next item is framed the moment it appears, `shown()` (which already preloads the next
two items' images) also computes the next item's focus point.

### Files and functions

- `review.js`: `state.focus`, `saveOptions`, a `focusPoint(item)` helper next to `diffOf` (cached
  like the diffs), `contentBox(img)`, `showBox` (center rather than top-left when the option is
  on), `renderStage` (single-image items), `shown` (prefetch), the `o` key, the address
  (`focus=on`).

### Tests

- `page.test.mjs`: with Focus point on at 4x, `button--primary.dark` (changed area at 160, 80,
  40 x 40) opens with that area's center in the middle of both panes; Accept, and the next item
  opens centered on its own point without a press; a new item (`badge--default.light`) opens
  centered on its content; at Fit nothing scrolls; off, the panes open at the top left as today.

## 8. Build order

All six change `review.js`, so they land one after another on one branch,
`feat/visual-review-reviewer-speed`, each in its own commits ("Fixes #N"), the package's tests
and lint passing before each commit:

1. **#855** -- the in-place grid update and the focus and scroll fix. Smallest, and #856 builds on
   its `patchGrid`.
2. **#856** -- accept what the filter shows; reuses step 1's update path and the server's `files`
   answer.
3. **#860** -- the control panel: rewrites `decisionBar`, `itemLine` and `viewBar` and their CSS,
   adds the View menu and the press counter.
4. **#859** -- the header breadcrumb and project stepping; touches the header and the keys, and
   removes Grid from the decision row that step 3 laid out.
5. **#857** -- the Baseline pane option, added to step 3's View menu; touches `renderStage`.
6. **#858** -- the Focus point option, added to the View menu; touches `showBox`, `shown` and
   `renderStage` after step 5 has settled which panes exist.

Steps 1-2 touch the grid and the server; steps 3-4 the screen's chrome; steps 5-6 the stage. Each
pair is contained, so a review comment on one rarely conflicts with the next. Each step updates
`visual-review/README.md` where the page's controls or keys change.
