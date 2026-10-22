# Tier 3: cosmetic backlog

Problems that neither block a task nor mislead a reader: spacing, alignment, a clipped label whose
meaning still reads, a working but inconsistent component. They are fixed later in batches, each
with a test, never inside a dry-run loop. Newest first.

## From the dry run pass 3 on build 758b8e8081 (2026-10-21)

Every entry passed the session-ready bar: a participant gets past it. Kinds: friction, wording, cosmetic,
accessibility (accessibility entries also go to the accessibility expert's walkthrough). Screens are under
`rounds/r1d2/pilot/<task>/`; each entry's full list of rows is its section in `dry-run-r1-3.md`. Most-walked
first. The first entry has its mechanism in `dry-run-r1-3.md` ("Why the lines that sounded like (a) are
not") and its target behavior in `decided.md` (2026-10-21).

- The drawing moves without the reader asking (friction). Seen on T37A (fx2-hasvalue-b/15.png), T38A (r5-find-edit/14-15.png), T38B (e-email/15.png), T39A (m-detours1/10-11.png), T39A (m-detours1/13-14.png), T39B (n-findbox-condition/11-12.png), T40A (r3-email-fromselection/15.png), T40B (s3-find-layer-edit/17-18.png), T41A (p3-detour-find-phone/14-15.png), T41B (q4-findlayer-replace/09.png), T42A (r3-detour-start/21.png), T42B (p4-find-edit/14.png), T43A (w3-novalue-phone/13-14.png), T43B (z-email-layer/16-17.png), T44B (p2-t41b-email/15-17.png), T44B (p2-color-replace-undo/19.png), T46A (w4-email-layer/17-18.png), T47A (r3-route1-email/14-15.png), T49A (f1-t41b-email-layer/16.png), T49B (z1-t41b-email-layer/13-15.png), T50B (t3-email-onrecord/16-17.png), T51A (rs-find-edit/16-17.png), T51B (r4-email-layer/19.png).
- "Which nodes" with no condition opens without its attribute list (friction). Seen on T38B (e-pointer/07.png), T45B (y-pointer/09.png), T47A (r3-route4-plus-layer/07.png), T49A (f4-t41a-plus-layer/05.png), T50A (s5-plus-layer/06.png), T51B (r4-plus-layer/08.png).
- Layers made the same way are named differently (wording). Seen on T38B (e-email/13.png), T44B (p2-t41b-email/13.png), T46A (w4-email-layer/13.png), T48B (q-email/12.png), T50B (t2-phone-trained/16.png), T51A (rs-find-edit/10.png).
- F6 misses the top bar and stops on resize handles (accessibility). Seen on T37A (keyboard/), T41A (p3-keys/85.png), T42A (r3-keyboard/18.png to 23.png), T42A (r3-keyboard/20.png), T43A (w3-keyboard).
- A layer made from a find-box rule shows the raw rule and cannot be edited (fix before T42 runs in round 2) (friction, wording). Seen on T37A (fx2-hasvalue-b/08.png), T37B (p-findlayer/08.png), T37B (p-findlayer/10.png), T42A (r3-fix-find-edit/08.png), T42B (p4-find-edit/08.png).
- Enter on the start page's Samples leaves focus behind (accessibility). Seen on T37B (p-keyboard/21.png to 38.png), T39A (m-keys/22.png), T44A (s3-keyboard/18.png), T45B (y-keyboard/22.png), T46B (t3-keyboard/06.png).
- After Replace the drawing is framed right of center (friction). Seen on T41A (p3-detour-rule-replace/12.png), T43B (z-findlayer-replace/13.png), T47A (r3-route6-color-replace-undo/12-14.png), T49A (f6-findlayer-replace-undo/10.png), T51A (rs-replace-undo/13.png).
- Two controls share a name (accessibility). Seen on T37B (p-success/03.png), T44A (s3-replace-undo/15.png), T46A (w4-pointer/02.png).
- A focused heading draws no ring (accessibility). Seen on T40B (s3-keyboard/17.png), T49B (y-keys/44.png), T50A (s10-keyboard/18.png).
- Reopening an exported GraphML adds the file's own style groups (friction, cosmetic). Seen on T46B (t3-findlayer-replace-undo/13.png), T46B (t3-label-replace-undo/19.png), T46B (t3-label-replace-undo/21.png).
- Escape on the inspector and in dialogs (friction). Seen on T37A (fx1-hasvalue/17.png), T37B (p-findlayer/14.png).
- Find-box rows: right-click does nothing, and a click keeps or clears the text (friction). Seen on T38B (e-phone/06.png), T38B (e-email/06.png).
- A pick glides to a point right of the canvas center, or zooms (friction). Seen on T39A (m-detours1/17-18.png), T41B (q4-pointer/17.png).
- "Style nodes" or "Style edges" drawn dimmed with no reason (friction). Seen on T41A (p3-detour-find-phone/07.png), T45B (y-detour-find-newlayer/08.png).
- Selected and styled things are hard to read (cosmetic). Seen on T42A (r3-detour-start/19.png), T45B (y-detour-find-newlayer/14.png).
- The picker says "together none" when one condition alone leaves none (wording). Seen on T43A (w3-novalue-hours/12.png), T50A (s2-findbox-hasnovalue/09.png).
- Escape in a popover's or the picker's box reverts silently (accessibility). Seen on T49A (d-a-typeback/15.png), T49B (y-detour-color/18.png).
- A tooltip and the control's name differ (accessibility). Seen on T49A (d-b-reopen/23.png), T49B (y-keys/124.png).
- The analysis filter: Tab lands on a disabled button, Escape on Back does nothing (accessibility). Seen on T37A (keyboard/).
- Two analyses named Degree after a run (wording). Seen on T37A (detours/34.png).
- The private-window notice on every open (accessibility). Seen on T37A (pointer/04.png).
- After Load of a second file the breadcrumb names that file (wording). Seen on T37A (fx6-findlayer-open-undo/11.png).
- '34 selected' reads as a count (wording). Seen on T37B (p-success/14.png).
- Removing a line slides the next one under the pointer (friction). Seen on T39A (m-detours1/23.png).
- Undo's words for a load or a setting (wording). Seen on T39A (m-detours1/07.png).
- A node is named by its id, not its label (wording). Seen on T39B (n-findbox-condition/05.png).
- Replace takes two pages and two clicks (friction). Seen on T40B (s3-find-replace-undo/09.png).
- The Data place's 'Filter to...' leaves focus on the tree row (friction). Seen on T42A (r3-detour-start/11.png).
- Tab in a list with letters typed takes nothing (friction). Seen on T43A (w3-keyboard/43.png).
- A card with no value shows a count of its own (friction). Seen on T45B (y-pointer/11.png).
- A tooltip covers the next control (cosmetic). Seen on T45B (y-pointer/18.png).
- "Has no value" and number hints in find (wording). Seen on T45B (y-detour-find/05.png).
- Escape in a condition card closes the picker (friction). Seen on T46B (t3-find-edit-before-look/14.png).
- The find list's heading counts rows it does not list (friction). Seen on T46B (t3-findlayer-condition2/06.png).
- Control+O while a picker is open drops the half-made line (friction). Seen on T48B (q-label-replace-undo/09.png).
- A click into the picker's hex box does not select its value (friction). Seen on T49A (d-a-typeback/15.png).
- After a line is removed focus goes to another section's '+' (accessibility). Seen on T49A (d-a-typeback/18.png).
- Tab does nothing in an open '+' menu (accessibility). Seen on T50A (s10-keyboard/56.png to 64.png).
- After Discard focus once landed on the canvas (accessibility). Seen on T50A (s7-color-reopen-undo/10.png).
- Escape on a member opened from a layer's list closes the layer (friction). Seen on T50A (s1-pointer/06.png).
- An unset line does not take its value on Enter (friction). Seen on T50B (t8-edge-layer-replace/10.png).

## From the dry run pass 2 on build 6de5f95d12 (2026-10-20)

Every entry passed the session-ready bar: a participant gets past it. Kinds: friction, wording, cosmetic,
accessibility (accessibility entries also go to the accessibility expert's walkthrough). Screens are under
`rounds/r1d1/pilot/<task>/`; each entry's full list of rows is its section in `dry-run-r1-2.md`. An entry
named as on 7d87760756 was seen again on this build. Most-walked first.

- Sample thumbnails are broken images (cosmetic). Seen on T37A (6de-r2/pointer/02.png), T37B (g-success/05.png), T39A (i-pointer/03.png), T39B (v2-pointer/03.png), T40A (rp-pointer/03.png), T43A (r3-pointer/session.log), T43B (rp-pointer/01.png), T44A (r2-pointer/03.png), T44B (walk-pointer/02.png), T45B (w-pointer/03.png), T46A (r2-pointer/05.png), T47A (p3-pointer/02.png), T47B (rp3-pointer/03.png), T48A (6de5c-detour-start/05.png), T48B (x-detours/03.png), T49A (p3-pointer/03.png), T49B (n-pointer/03.png), T51B (rp-pointer/02.png).
- F6 misses the top bar and stops on resize handles (accessibility). Seen on T37A (6de-r2/keyboard), T37B (g-t50a-keys), T38A (w7-keyboard), T41B (w3-keys), T42A (6de2-keyboard/21-26.png), T42B (rp-keys/27-38.png), T43A (r3-keyboard/20-33.png), T44A (r2-keyboard/63-77.png), T46A (r2-keyboard), T46B (b-keyboard/42-46.png), T47A (p3-keyboard/73-78.png), T48A (6de5c-keys/69-72.png), T49B (n-keys/100-113.png), T50A (w4-keyboard/88-94.png), T50B (g3-keyboard/20.png), T51B (rp-keyboard/38-39.png).
- The drawing moves without the reader asking (friction). Seen on T38A (w7-find-replace/08-09.png), T38B (r3-find-replace/09-10.png), T39A (i-detours/12-14.png), T39B (v2-detours/16-18.png), T40A (rp-detour-find/08-10.png), T41A (r1d1-detour-start/13-15.png), T41B (w3-findlayer-replace/07-09.png), T42A (6de2-detour-start/22-23.png), T42B (rp-detour-find/06.png), T43A (r3-detours/14-15.png), T43B (rp-find-replace/11.png), T47A (p3-detours/47-49.png), T51A (q3-findbox-replace/05.png).
- Enter on the start page's Samples leaves focus behind (accessibility). Seen on T39A (i-keys/21.png), T39B (v2-keys/20.png), T40A (rp-keyboard/18-19.png), T44A (r2-keyboard/24-25.png), T46A (r2-keyboard/22.png), T46B (b-keyboard/22.png), T47A (p3-keyboard/18-19.png), T49A (p3-keyboard/22.png).
- A focused heading draws no ring (accessibility). Seen on T38A (w7-keyboard/17.png), T40B (6de3-keyboard/17.png), T41B (w3-keys/19.png), T46A (r2-keyboard/122.png), T49A (p3-keyboard/43.png), T49B (n-keys/41.png), T51A (q4-keys/20.png).
- "Which nodes" with no condition opens without its attribute list (friction). Seen on T38B (r3-pointer/07.png), T40B (6de3-pointer/07.png), T41B (w3-pointer/06.png), T42A (6de2-success-pointer/07.png), T42B (rp-pointer/06.png), T45B (w-pointer/08.png), T48A (6de5c-detour-start/45.png).
- A node is named by its id, not its label (wording). Seen on T38B (r3-find-replace/04.png), T39B (v2-detours/14.png), T43A (r3-detours/12.png), T44A (r2-detours/07.png), T44B (walk-keys/83.png), T46B (b-pointer/10.png), T50A (w1-pointer/04.png).
- The private-window notice on every open (accessibility, friction). Seen on T37A (6de-r2/keyboard), T37B (g-success/06.png), T39B (v2-pointer/04.png), T40B (6de3-keyboard), T41B (w3-pointer/03.png).
- After Replace the drawing is framed right of center (friction). Seen on T38B (r3-find-replace/13.png), T40B (6de3-detour-find/15.png), T41A (r1d1-detour-start/23.png), T41B (w3-pointer/19.png), T51B (rp-find-replace/13.png).
- Escape on a member opened from a layer's list closes the layer (friction). Seen on T37B (g-t50a-keys/59.png), T43B (rp-t50a-keys/52.png), T50A (w4-keyboard/74.png), T50B (g3-keyboard/77-78.png).
- Reopening an exported GraphML adds the file's own style groups (friction, cosmetic). Seen on T37B (g-findlayer/28-29.png), T37B (g-findlayer/28.png), T37B (g-findlayer/26.png), T37B (g-findlayer/26.png).
- A pick glides to a point right of the canvas center, or zooms (friction). Seen on T38A (w7-find-replace/17.png), T41B (w3-pointer/16.png), T43A (r3-detours/17-25.png), T48B (x-table/10.png).
- Escape in a popover's or the picker's box reverts silently (accessibility). Seen on T39A (i-keys/82.png), T49A (p3-detours-a/12.png), T49B (n-detour-color/07-08.png).
- Selected and styled things are hard to read (friction). Seen on T41A (r1d1-detour-start/20.png), T43A (r3-detours/25.png), T45B (w-detour-find/12-13.png).
- Two controls share a name (accessibility). Seen on T37B (g-success/03.png), T47A (p3-keyboard/03.png).
- Opening the table re-frames the drawing (friction). Seen on T37B (g-handpicked/17.png), T41B (w3-keys/89.png).
- A find-box pick after Replace draws no selection ring (friction). Seen on T38A (w7-find-replace/18.png), T43B (rp-find-replace/15-16.png).
- Undo's words for a load or a setting (wording). Seen on T38A (w7-detour-newdata/14.png), T47A (p3-keyboard/122.png).
- Replace takes two pages and two clicks (friction). Seen on T38B (r3-find-replace/11-12.png), T43A (r3-detours/28-29.png).
- Removing a line slides the next one under the pointer (friction). Seen on T39A (i-detours/22.png), T39B (v2-detours/13.png).
- A sample card's name leaves out its visible title (accessibility). Seen on T40A (rp-keyboard), T49A (p3-keyboard/22.png).
- A tooltip and the control's name differ (accessibility). Seen on T40B (6de3-detour-filter/16.png), T44A (r2-pointer/11.png).
- "Has no value" and number hints in find (wording). Seen on T41A (r1d1-detour-start/07.png), T45B (w-detour-find/04.png).
- "Style nodes" or "Style edges" drawn dimmed with no reason (friction). Seen on T41A (r1d1-detour-start/13.png), T41B (w3-findlayer-replace/07.png).
- The start page's demo comes before "Open a file" in Tab order (accessibility). Seen on T41A (r1d1-keys), T50A (w4-keyboard/02-15.png).
- Escape on the inspector and in dialogs (friction). Seen on T43A (r3-detours/26.png), T46A (r2-keyboard/111.png).
- "Open network data" is a dead end for a local file (friction). Seen on T43A (r3-file-in/03.png), T47A (p3-detours/55.png).
- An icon or truncated control has no tooltip (accessibility). Seen on T44A (r2-detours/20.png), T50A (w1-pointer/07.png).
- The right-click menu stays where the node was (friction). Seen on T44B (walk-detours/27.png), T47A (p3-detours/45.png).
- A tooltip covers the next control (cosmetic). Seen on T45B (w-pointer/18.png), T47A (p3-pointer/17.png).
- The analysis filter: Tab lands on a disabled button, Escape on Back does nothing (accessibility). Seen on T37A (6de-r2/keyboard/64-66.png).
- Two analyses named Degree after a run (wording). Seen on T37A (6de-r2/detours/33.png).
- A layer made from a selection is named and shown as its count (wording). Seen on T37B (g-findlayer/10.png).
- Degree colors too close to tell apart (cosmetic). Seen on T37B (g-success/11.png).
- Enter on a condition's checkbox closes the picker without ticking (accessibility). Seen on T38A (w7-keyboard/48.png).
- A click on the layers '+' while the find list is open is lost (friction). Seen on T40A (rp-detour-useselected/05-06.png).
- Dropping an unfinished card leaves the layer (friction). Seen on T41A (r1d1-detour-picker/13.png).
- Escape on a page or form does the wrong thing (friction). Seen on T41B (w3-findlayer-replace/11-12.png).
- Tab in a list with letters typed takes nothing (friction). Seen on T43A (r3-keyboard (size popover)).
- The table names a column differently from the file (wording). Seen on T43A (r3-pointer/11.png).
- An unset line does not take its value on Enter (friction). Seen on T43B (rp-find-replace/09.png).
- Escape in a condition card closes the picker (friction). Seen on T43B (rp-t50b-keys/40.png).
- With the table open, a find pick does not scroll the table (friction). Seen on T43B (rp-t46b-table/07-08.png).
- Tab in a box that writes keeps focus in the box (friction). Seen on T44A (r2-detours/25.png).
- The read-the-file page's column-role boxes look like menus and do nothing (friction). Seen on T44B (walk-detours/07-08.png).
- New project names the work "Untitled" (wording). Seen on T44B (walk-detours/09.png).
- "Edit discarded" squeezes its row (cosmetic). Seen on T44B (walk-pointer/15.png).
- After Undo an unset line stays drawn (cosmetic). Seen on T45B (w-detour-nodetab/15.png).
- Analysis popover cosmetics (cosmetic). Seen on T45B (w-detour-everything/07.png).
- A list closed with unmatched letters reopens stale (friction). Seen on T47A (p3-keyboard/111.png).
- The shape list's highlight (friction). Seen on T47A (p3-pointer/11.png).
- The folder and run look (accessibility). Seen on T47A (p3-keyboard/92.png).
- The start page demo (friction). Seen on T47A (p3-detours/05-07.png).
- Open layer from Why this look focuses another line (friction). Seen on T47A (p3-detours/26.png).
- The restore card names the work differently (wording). Seen on T47A (p3-detours/52.png).
- The library search: Enter, a spoken count, the chips (friction). Seen on T47A (p3-detours2/03.png).
- The key covers nodes, scrolls, or shows a range its nodes do not hold (friction). Seen on T48A (6de5c-pointer/06.png).
- Escape on a just-added line or card says nothing, or takes back typed text (friction). Seen on T49B (n-detour-remove/08-09.png).
- Tab never leaves the color picker (accessibility). Seen on T49B (n-keys/116-131.png).
- Leaving and discarding (wording). Seen on T50A (w2-detours/10.png).

## From the dry run on build 7d87760756 (2026-10-20)

Every entry passed the session-ready bar: a participant gets past it. Kinds: friction, wording, cosmetic,
accessibility (accessibility entries also go to the accessibility expert's walkthrough). Screens are under
`rounds/r1/pilot/<task>/`; each entry's full list of rows and screens is its section in `dry-run-r1-1.md`.
Entries against a settled behavior name it there. Most-walked first.

- Sample thumbnails are broken images (cosmetic). Seen on T37A (g-pointer/04.png), T37B (p4-success/03.png), T38A (v-success step), T38B (g-detour-open-find/06.png), T39A (r-pointer/03.png), T39B (7d8c-pointer/03.png), T40A (h-pointer/05.png), T40B (7d8-pointer step), T41B (i-pointer/02.png), T42B (w4-detour-card/03.png), T43A (f-detours/07.png), T44A (g-pointer/03.png), T44B (h-detours), T45B (g-pointer/04.png), T46A (7d8c-pointer/02-04.png), T46B (x4-detours/05.png), T47A (7d8-pointer/04.png), T47B (p4-pointer/03.png), T48B (r4-detours/09.png), T49A (h-pointer/05.png), T49B (k-pointer/03.png), T50A (v2-detours-b/02.png), T51A (7d8c-1-pointer/02.png), T51B (v3-success/02.png).
- The drawing moves without the reader asking (friction). Seen on T37A (g-pointer/09-10.png), T37B (p4-success/24.png), T38A (v-detour-newdata/17-19.png), T38B (g-detour-open-find/13-16.png), T39A (r-detours2/14.png), T39B (7d8c-detours/08-12.png), T40A (h-detour-find/13-15.png), T40B (7d8-detour-find/10.png), T41A (r1-detour-start/18-19.png), T41B (i-detours/23-25.png), T42A (7d8c-detour-start/33-34.png), T42B (w4-detour-find/06.png), T43B (r1-detour-node/10-12.png), T47A (7d8-detours/51-53.png), T48B (r4-detours/23.png), T51A (7d8c-2-detours/12-13.png), T51B (v3-detours/17-18.png).
- Opening the table re-frames the drawing (friction). Seen on T37A (g-pointer/11.png), T38A (v-detour-data/14.png), T38B (g-detour-data-rclick/17.png), T41B (i-keys/91.png), T46A (7d8c-detours/51.png).
- A pick glides to a point right of the canvas center, or zooms (friction). Seen on T38A (v-keyboard/97.png), T38B (g-detour-data-rclick/06-07.png), T41A (r1-pointer/19-21.png), T41B (i-pointer/18-22.png), T41B (i-pointer/23-26.png), T43B (r1-detour-find/05.png), T46B (x4-pointer/10.png), T48A (7d8c-detour-start/16.png), T51B (v3-detours/15.png).
- The right-click menu stays where the node was (friction). Seen on T37A (g-detours/19.png), T37B (p4-detours/24.png), T38A (v-detour-data/04.png), T38B (g-detour-data-rclick/04.png), T41A (r1-detour-start/25.png), T41B (i-detours/44.png), T43B (r1-detour-data/06.png), T47A (7d8-detours/49.png).
- "Which nodes" with no condition opens without its attribute list (friction). Seen on T38A (v-success/08.png), T38B (g-pointer/07.png), T40A (h-pointer/09.png), T40B (7d8-pointer/08.png), T41A (r1-pointer/07.png), T41B (i-pointer/08.png), T42A (7d8c-success-pointer/07.png), T42B (w4-pointer/07.png), T45A (f-pointer/07.png), T45B (g-pointer/10.png), T48A (7d8c-detour-cards/35.png), T48B (r4-detours/46.png), T50A (v2-detours-b/11.png), T51B (v3-detours/23.png).
- F6 misses the top bar and stops on resize handles (accessibility). Seen on T37A (g-keyboard/58-67.png), T37B (keyboard walk, no screenshot named), T38A (keyboard walk, no screenshot named), T38B (keyboard walk, no screenshot named), T39A (r-keys steps), T39B (7d8c-keys/65-72.png), T40A (h-keyboard after), T41A (r1-keys 76-85), T41B (i-keys/83.png), T42A (7d8c-keyboard), T43A (f-keys/18-23.png), T43A (f-keys/36.png), T43B (r1-keys/33-36.png), T44A (g-keyboard), T44B (h-keys after), T46A (7d8c-keyboard/77-82.png), T46B (x4-keyboard 43-51), T47A (7d8-keyboard/72-76.png), T48A (7d8c-keys/61-68.png), T48B (r4-keyboard/48-56.png), T49A (h-keyboard), T50A (v2-keyboard), T50B (f3-keyboard 26-30), T50B (f3-keyboard 38-44).
- A focused heading draws no ring (accessibility). Seen on T37B (p4-keyboard/39.png), T38A (v-keyboard/21.png), T39B (7d8c-keys/48.png), T40B (7d8-keyboard/25.png), T41B (i-keys/20.png), T46B (x4-keyboard/81.png), T49B (k-keys/38.png), T50B (f3-keyboard/19.png), T51B (v3-keyboard/21.png).
- The start page's demo comes before "Open a file" in Tab order (accessibility). Seen on T37A (keyboard walk, no screenshot named), T38A (v-keyboard start), T38B (g-keys), T40B (7d8-keyboard/08-14.png), T41A (r1-keys 02-16), T41B (i-keys), T42A (7d8c-keyboard), T42B (w4-keys), T43A (f-keys/02-15.png), T43B (r1-keys/02-16.png), T44A (g-keyboard/09-14.png), T44B (h-keys), T45A (f-keyboard), T45B (g-keyboard), T47B (keyboard walk, no screenshot named), T48B (r4-keyboard/02-17.png), T49A (h-keyboard Tabs), T49B (k-keys/09-17.png), T50B (f3-keyboard/15.png), T51A (7d8c-3-keys), T51B (v3-keyboard/02-17.png).
- Enter on the start page's Samples leaves focus behind (accessibility). Seen on T37B (p4-keyboard/110.png), T39A (r-keys/18.png), T39B (7d8c-keys/22-26.png), T40A (h-keyboard/43.png), T44A (g-keyboard/21-24.png), T45B (g-keyboard/24.png), T46A (7d8c-keyboard/20-24.png), T46B (x4-keyboard/24.png), T47A (7d8-keyboard/22.png), T47B (p4-keyboard/22.png), T49A (h-keyboard-samples/02-05.png), T49B (k-keys/20.png).
- The library search: Enter, a spoken count, the chips (friction, accessibility). Seen on T37A (g-detours/06.png), T37A (g-keyboard/22.png), T37B (p4-detours/05.png), T39A (r-detours2/05.png), T39B (7d8c-keys/33-46.png), T40A (h-keyboard), T47A (7d8-detours2/04.png), T49B (k-detours-c/08.png).
- A sample card's name leaves out its visible title (accessibility). Seen on T37A (g-keyboard/35.png), T39A (r-keys), T46A (7d8c-keyboard/39-41.png), T47B (p4-pointer/03.png), T49A (h-keyboard Tab).
- Two controls share a name (accessibility). Seen on T37B (p4-success/02.png), T39A (r-detours1/06.png), T39B (7d8c-pointer/02.png), T40A (h-pointer/03.png), T42A (keyboard walk, no screenshot named), T46A (7d8c-pointer/03.png), T47A (7d8-pointer/03.png), T48A (7d8c-detour-cards/53.png).
- The start page's live region arrives already filled (accessibility). Seen on T37A (g-keyboard/01.png), T38B (g-keys start), T42A (7d8c-keyboard/01.png), T50B (f3-keyboard/01.png), T51A (7d8c-3-keys start).
- The private-window notice on every open (friction). Seen on T37B (p4-success/04.png), T38A (v-success/04.png), T38B (g-pointer/03.png), T41B (i-pointer/04.png), T42A (7d8c-success-pointer/03.png), T45A (f-pointer/03.png), T49B (k-pointer/04.png).
- "Open network data" is a dead end for a local file (friction). Seen on T38A (v-detour-newdata/02-04.png), T38B (g-detour-open-find/02-03.png), T39B (7d8c-detours2/03.png), T40B (7d8-detour-other/02-03.png), T41A (r1-detour-start/02-03.png), T41B (i-detours/02-03.png), T42A (7d8c-detour-start/02-03.png), T42B (w4-detour-card/04.png), T43A (f-detours/02-03.png), T44B (h-detours/02-03.png), T45A (f-detour-start/02-03.png), T45B (g-detour-find/02.png), T47A (7d8-detours/58-59.png), T48A (7d8c-detour-start/02-03.png), T48B (r4-detours/03.png), T49B (k-detours-c/02-03.png), T49B (k-detours-c/04.png), T51A (7d8c-2-detours/03.png), T51B (v3-detours/03-04.png).
- A node is named by its id, not its label (wording). Seen on T38A (v-detour-newdata/11.png), T38B (g-detour-open-find/09.png), T40A (h-detour-find/05.png), T41A (r1-keys 116), T44A (g-detours/08.png), T44B (h-keys/85.png), T44B (h-detours/15.png), T46B (x4-keyboard/70.png), T46B (x4-detours/30-31.png), T47B (p4-detours/15.png), T51A (7d8c-2-detours/09.png), T51B (v3-detours/14.png).
- Escape on the inspector and in dialogs (friction). Seen on T37A (g-keyboard/83.png), T37B (p4-detours/28.png), T37B (p4-detours/48.png), T43A (f-detours/18.png).
- Escape in a condition card closes the picker (friction). Seen on T38A (v-keyboard/67.png), T38B (g-keys/58.png), T48B (r4-detours/39-40.png).
- Escape on a just-added line or card says nothing, or takes back typed text (friction). Seen on T41A (r1-pointer/17.png), T41B (i-detours/35.png), T43B (r1-detour-node/13.png), T49B (k-detours-b/09.png).
- Escape in a popover's or the picker's box reverts silently (accessibility). Seen on T39A (r-keys/83.png), T43A (f-keys/65.png), T49A (h-detours-a/19.png), T49B (k-detours-a/22.png).
- A refused value survives Escape with no way out said (friction). Seen on T42A (7d8c-detour-card/13-15.png), T42B (w4-detour-card/12.png), T42B (w4-keys/75.png).
- Escape on a page or form does the wrong thing (friction). Seen on T41A (r1-detour-picker/26.png), T45A (f-detour-find/18.png), T46A (7d8c-keyboard/74.png), T51A (7d8c-3-keys/92-93.png).
- Tab in a list with letters typed takes nothing (friction). Seen on T43A (f-detours/20-22.png), T43B (r1-keys/188.png).
- A tooltip and the control's name differ (accessibility). Seen on T37B (p4-detours/37.png), T40B (7d8-detour-filter/16.png), T43B (r1-tooltip/05.png), T43B (r1-detour-node/07.png), T44A (g-pointer/21-22.png), T44B (h-pointer/16.png), T46A (7d8c-detours/42-43.png), T46B (x4-detours/35-36.png), T49A (h-detours-a/23.png), T51B (v3-success/10.png).
- An icon or truncated control has no tooltip (accessibility). Seen on T44A (g-pointer/26.png), T44A (g-detours/21-22.png), T44B (h-detours/23-24.png), T46A (7d8c-detours/06.png), T47B (p4-pointer/07.png), T50A (v2-detours/19-20.png), T50B (f1-pointer/05.png).
- A tooltip covers the next control (cosmetic). Seen on T44B (h-detours/38.png), T45B (g-pointer/20.png), T47A (7d8-pointer/19.png), T51A (7d8c-1-pointer/11.png), T51B (v3-success/09.png).
- "Edit discarded" squeezes its row (cosmetic). Seen on T43B (r1-pointer/12.png), T44A (g-pointer/24.png), T44B (h-pointer/19.png).
- Selected and styled things are hard to read (friction). Seen on T40B (7d8-detour-find/05.png), T41A (r1-detour-start/23.png), T42A (7d8c-detour-start/31.png), T45A (f-detour-find/11.png), T45A (f-pointer/14.png), T45B (g-detour-find/19-20.png).
- "Style nodes" or "Style edges" drawn dimmed with no reason (friction). Seen on T41A (r1-detour-start/18-23.png), T41B (i-detours/17.png), T45A (f-detour-nodetab/24.png), T46B (x4-pointer/13.png).
- A layer made from a selection is named and shown as its count (wording). Seen on T39A (r-detours2/16.png), T39B (7d8c-detours/10-11.png), T39B (7d8c-detours/33-34.png), T45A (f-detour-find/11.png), T45B (g-detour-nodetab/11.png).
- The shape list's highlight (friction). Seen on T47A (7d8-pointer/14.png), T47B (p4-pointer/12.png), T40A (h-pointer/12.png).
- The key covers nodes, scrolls, or shows a range its nodes do not hold (friction). Seen on T43B (r1-detour-node/11.png), T46A (7d8c-pointer/10.png), T46B (x4-detours/30.png), T47B (p4-pointer/08.png), T48A (7d8c-pointer/08.png), T48B (r4-pointer/09.png), T51A (7d8c-1-pointer/05.png), T51B (v3-success/08.png).
- The folder and run look (friction, wording, cosmetic). Seen on T46A (7d8c-detours/26.png), T46A (7d8c-detours/36.png), T46B (x4-detours/44-45.png), T46B (x4-detours/38.png), T47A (7d8-keyboard/99.png), T47A (7d8-detours/27.png), T47A (7d8-keyboard/131.png), T47B (p4-detours/38.png), T47B (p4-detours/34.png), T48A (7d8c-detour-cards/29.png), T48A (7d8c-detour-cards/21.png), T48B (r4-detours/39.png).
- Select layers mode (accessibility). Seen on T48A (7d8c-detour-cards/49.png), T48B (r4-detours/65.png).
- Filters and the selection (friction, wording). Seen on T41B (i-detours/42.png), T48A (7d8c-detour-start/32.png), T42A (7d8c-detour-start/14-15.png), T42A (7d8c-detour-start/16.png), T48B (r4-detours/27.png).
- The number card (friction, wording). Seen on T42A (7d8c-detour-card/18.png), T42B (w4-pointer/10.png), T42B (w4-detour-card/22.png), T43B (r1-detour-node/14.png), T43B (r1-keys/176.png).
- "Has no value" and number hints in find (wording). Seen on T41A (r1-detour-start/11.png), T41B (i-detours/09.png), T45B (g-detour-find/07.png).
- New project names the work "Untitled" (wording). Seen on T41A (r1-detour-start/10.png), T42A (7d8c-detour-start/10.png), T45A (f-detour-start/08.png), T48B (r4-detours/13.png), T51A (7d8c-2-detours/08.png).
- Leaving and discarding (wording, friction). Seen on T37B (p4-detours/47.png), T37B (keyboard walk, no screenshot named), T46B (x4-detours/09.png), T49A (h-detours-b/16.png), T49B (k-detours-b/15.png), T49B (k-detours-b/20.png).
- A partial open says what did not come back (wording). Seen on T50A (v2-pointer/04.png), T50A (keyboard walk, no screenshot named), T50A (v2-pointer/17-18.png), T50B (f1-pointer/08.png).
- Analysis popover cosmetics (cosmetic). Seen on T39A (r-keys/93.png), T45B (g-detour-everything/06.png), T46A (7d8c-detours/12-14.png), T46B (x4-pointer/05.png), T51A (7d8c-2-detours/36.png).
- Control+A off the canvas (friction). Seen on T39B (7d8c-detours/07.png), T42A (7d8c-detour-card/19-20.png), T43B (keyboard walk, no screenshot named).
- Zoom steps about 1 percent (friction). Seen on T44A (g-pointer/10-20.png), T44B (h-pointer/09-15.png).
- Add label line (friction). Seen on T44A (g-detours/29-31.png), T44B (h-detours/32.png).
- The start page demo (friction, cosmetic). Seen on T46A (7d8c-detours/05.png), T46B (x4-detours/03-04.png), T47A (7d8-detours/02.png), T47B (p4-detour-landing/03.png).
- Reset Palette (accessibility, wording). Seen on T51A (7d8c-3-keys step), T51B (v3-success/11.png).
- Color by grid cell names (accessibility). Seen on T51A (7d8c-3-keys 84-90), T51B (keyboard walk, no screenshot named).
- "Degree 36" opens the neighborhood; its name does not say so (accessibility). T37A, screen g-keyboard/71.png.
- "34 selected" for one node with id 34, beside "34 nodes selected" (accessibility). T37B, screen p4-success/29.png.
- "Degree finished" names no node; "Degree 17, #1 of 34" is not a Tab stop (accessibility). T37B, no screenshot named.
- "Edit discarded; this stays 006400." reads the hex, the box says "dark green" (accessibility). T39A, no screenshot named.
- the same with FF0000 (accessibility). T41B, screen i-keys/76.png.
- "Filter to..." leaves focus on the tree row (accessibility). T42B, screen w4-detour-find/14-15.png.
- the size dialog reads 20 histogram rows with counts twice before its first control (accessibility). T43A, screen f-keys/58.png.
- Tab commits "Size from" but stays in it (accessibility). T43B, screen r1-keys/176.png.
- the Label settings close button is "Close panel" (accessibility). T44A, no screenshot named.
- committing the label Size announces nothing (accessibility). T44B, screen h-keys before.
- "Color by kind" names two of three groups (accessibility). T45A, screen f-detour-nodetab/19.png.
- the focus ring on "Pick edge color" is hard to tell from the box (accessibility). T45B, screen g-keyboard/94.png.
- the value box is named "trained: how to match" while it holds Yes (accessibility). T48A, screen 7d8c-keys/87.png.
- Tab cycles inside the color picker; Escape and "Close panel" leave it (accessibility). T49A, no screenshot named.
- the focus ring on the green start buttons is thin and the same green (accessibility). T49B, screen k-keys/16-17.png.
- after "Remove node color" focus goes to Effects "+", against `decided.md` "After a line is removed, focus goes to its own section's +" (accessibility). T49B, screen k-detours-b/07.png.
- Enter on "Graph volunteers.graphml" does nothing visible (accessibility). T50B, screen f3-keyboard/55-56.png.
- the attribute list's "Data" and "Structure" headings are not exposed (accessibility). T51B, no screenshot named.
- Tab inside the Text "+" menu stays on Label (accessibility). T51B, no screenshot named.
- Shift+Tab from the bound Color line skips "Pick node color" (accessibility). T51B, no screenshot named.
- after "Remove edge color" the Width line slides under the pointer (friction). T39A, screen r-detours1/18.png.
- Enter in a text card keeps "phone contains missing, 0 nodes" with no warning (friction). T41A, screen r1-detour-picker/13.png.
- a click on the drawing that drops an unfinished card also moves the inspector to the Graph (friction). T41A, screen r1-detour-picker/16.png.
- on a layer made by "New layer from selection", Has no value is refused (friction). T41B, screen i-detours/20.png.
- a red dot behind a blue node gives the click to the blue one (friction). T41B, screen i-pointer/21.png.
- a click on the link icon while the "Edit discarded" hint shows opens nothing (friction). T43A, screen f-detours/16-17.png.
- the Control+O page is titled "Add to volunteers" with "Replace volunteers.graphml" first (friction). T43A, screen f-detours/32.png.
- labels cut by the side panel while the count says "0 hidden" (cosmetic). T44B, screen h-detours/26.png.
- the swatch strip's order differs from the key's (cosmetic). T45A, screen f-detour-nodetab/21.png.
- "Clear color: back to the layer's" cut mid-phrase (cosmetic). T45A, screen f-detour-nodetab/22.png.
- a tie's From/To values drawn light gray (cosmetic). T45A, screen f-detour-find/05.png.
- Which edges collapsed by pointer, open by keyboard (friction). T45A, screen f-pointer/06.png.
- Replace leads to a second page that asks again, against `decided.md` "with no confirmation" (friction). T45A, screen f-detour-find/19.png.
- the restore card calls the work "An untitled project (friction). T47A, screen 7d8-detours/56.png.
- a file dropped on a new, empty project's canvas is not taken (friction). T48A, screen 7d8c-detour-start/09.png.
- the layers "+" is named "Add a layer or a folder" but holds "Select layers..." and "Analyze..." (friction). T39B, screen 7d8c-detours/41.png.

## From the dry run on build e3c5bca8e6 (2026-10-19)

- A tooltip shown on hover or focus covers a neighboring control or line: Effects "+" over
  "Remove node color" (T38B), "Add to node visibility" over Shape "+" (T43A), "Edge width by
  attribute" over Arrowheads "+" (T45B), "Label settings" over "Show all labels" and "Node label
  size by attribute" over the label count (T44B), "Node shape by attribute" over the "Not set
  yet" hint (T47B), a color square's tooltip over the square to its left (T51B), the key's
  "green" over "6 of 24 nodes" (T50B), the size chip's "donations 1 to 6" over the Size label
  (T43B). Place a tooltip on the side away from the next control in reading order.
- A cover layer's row in the layer tree shows no swatch, unlike group rows (T48A).
- A filter step's count reads "24 to 24 nodes" before it changes anything (T42A).
- A "Color by" grid cell's spoken name has a stray space before the comma: "company , 6 nodes"
  (T51B).
- After Done, the Effects heading is drawn brighter, as if hovered (T51B).
- The Memberships "Group 4" button looks like plain text (T46B).
