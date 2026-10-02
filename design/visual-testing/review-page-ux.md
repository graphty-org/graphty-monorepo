# Visual review: the review page redesign

The review page is where the repository owner looks at every screenshot CI captured that differs
from its approved baseline, and decides each one: Accept (the new image becomes the baseline),
Reject (a regression, with a reason), or Exclude (stop capturing the story). Finish then publishes
every decision of one target -- a pull request, or the default branch when seeding -- as one
commit, one pull request comment and one commit status, approved with the owner's passkey. The
page is plain JavaScript in `visual-review/trusted/page/` (`index.html`, `review.css`,
`review.js`), served by `visual-review/trusted/lib/serve.mjs`.

The owner reviews hundreds of images in a sitting, mostly accepting, on an iPad (Safari, often with
a hardware keyboard) and on a desktop. This document redesigns the page for that: decision buttons
that never move, a wait that always says what it is waiting for, a way from one project or pull
request to the next that does not go back through the top of the page, and a Finish that the
owner's Face ID or security key confirms.

Words used throughout:

- **Target**: one pull request, or the default branch's run being seeded ("master seed").
- **Project**: one Storybook of the target (compact-mantine, graphty-element, ...).
- **Item**: one screenshot of one story in one mode. **Story screen**: the page showing one item.
- **Pass**: the items the grid showed when a story was opened, frozen in that order, which Next
  and Previous walk.
- **Decision bar**: the fixed rows of decision and movement buttons on the story screen.
- **Status row**: the one place the page writes messages, a fixed row at the bottom of the sticky
  stack on every screen.
- **Passkey**: the owner's WebAuthn credential (Face ID, Touch ID or a security key) that approves
  each Finish; the CI gate counts an accept only when its record carries a valid approval.

See `design/visual-testing/design.md` for the tool as a whole; its section 8 specifies the passkey
record, registration and the gate's checks.

## 1. Success criteria

Each one is checked by a test in `visual-review/test/page.test.mjs` (fake gh, results fixture), by
the measuring script that drives the page at 1440 x 900, 1180 x 820 (iPad landscape) and
768 x 1024 (iPad portrait) over a large fixture, or, where marked, by hand on a real iPad
(section 8 lists those checks).

1. **Fixed decision buttons.** Accept, Reject, Exclude and Undo sit above the images, and each
   button's box is identical (to the pixel) on every item of every status (changed, moved, new, no
   baseline yet, removed, unstable, failed), decided or not, in every view and at every zoom, at
   each of the three sizes. The bar never wraps unplanned and never scrolls sideways: at
   768 x 1024 every button's right edge is inside the window. A button that does not apply is shown
   unavailable with its reason; it is never removed and never replaced by another control.
2. **Reachable without scrolling.** On the iPad at both orientations, the decision bar is fully on
   screen when the story screen opens, and stays there while the panes scroll or zoom. While the
   on-screen keyboard is up for the note box it also stays on screen; that clause is checked by
   hand on an iPad, because Playwright's WebKit does not raise Safari's software keyboard.
3. **The images do not move.** The panes' top edge is the same on every item at a given size: badges,
   notes, an error log, messages and the "N of M" count never push them down.
4. **No wait is silent.** Every wait the page can have that lasts over 300 ms shows, within 300 ms,
   what it is waiting for and how far along it is (a count, a step list, or an elapsed time), and
   every failed wait offers Retry. Section 4 lists each one.
5. **No press is dropped silently.** Every press of a decision button or decision key either
   decides, or shows why it did not, in the status row, within 100 ms. The status row is never
   squeezed: at 768 x 1024 the longest message in the copy deck is shown whole.
6. **Next project and next target in one click.** Reaching the end of a pass, deciding its last
   item, or finishing a target shows a card whose first button opens the next project's first
   undecided item (or the next target) in one click, with no full GitHub refresh in between.
7. **Back and Forward are instant.** Browser Back and Forward between targets, grid and story, and
   opening a deep link to a grid or story, make no GitHub call; they read the server's cached list.
   A reload of a story keeps its pass and its position in it.
8. **Every string is true.** Each string in the copy deck (section 5) is checked against what the
   code does: counts are the server's, plurals agree with their number ("1 decision"), the default
   branch's name comes from the server, and the Finish sheet states exactly what will be
   committed, posted and set as the status. Finish refuses to run when the decisions changed after
   the sheet opened.
9. **No job has two controls.** Each job has one on-screen control per screen, plus at most one key.
   Back to the grid, Undo, Finish, finding a story and zoom each have one control (section 3 lists
   what was merged).
10. **Every shortcut is discoverable on an iPad.** Each button shows its key on its face; `?` (and
    a Keys button in the header) lists every key, including the ones that take two steps. No
    information lives only in a hover tooltip; no button has a `title`.
11. **Accept notes are published.** A note typed on an Accept appears in Finish's pull request
    comment (or the seed pull request's description) and in the review record, and Finish's result
    counts it. A note is only ever saved with the item it was typed on.
12. **Keyboard focus survives every decision.** After a decision, an Undo or a move to another item,
    focus is where it was before: on the same decision-bar button if a button had it, otherwise on
    the page, never in the note box. Tab to Accept, press Space twice, and focus is still on Accept;
    press R, type, Enter, then A, and the next item is accepted.
13. **The passkey approves Finish.** Finish's sheet calls the passkey directly from the tap on its
    final button (iPad Safari requires that), signs the record the sheet described, and a cancelled
    Face ID changes nothing. The CI gate refuses an accept whose record has no valid approval
    (design.md section 8).
14. **Every earlier owner request still holds** (section 7): fit-to-screen side by side, a blank
    left pane when there is no baseline, zoom that overflows its panes and scrolls them together,
    Undo and going back, the red changed-pixel overlay with Blink, and the changed-area outline as
    an option.
15. **It survives a sitting.** Five projects of 170 items each, opened one after another in one tab,
    do not make iPad Safari reload the tab (checked by hand; the automated part checks that a grid
    tile loads a thumbnail, not the full image).

## 2. The flows

### Click counts, before and after

Measured on a fake server with 3 pull requests and a master run, 5 projects of 170 items each,
2400 x 1800 images, and GitHub delays standing in for an iPad on Wi-Fi.

| Flow                                  | Today                                                                     | Redesigned                                                              |
| ------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Open the page                         | 0 clicks; 3.3 s of plain "Loading..."                                     | 0 clicks; the cached list at once, or placeholder cards and steps       |
| Captures still downloading            | 4 manual reloads, 14 s; no Review button meanwhile                        | 0 clicks; each row fills in as its download lands                       |
| Targets to a project grid             | 1 click, plus 1 scroll per pull request above it on the iPad              | 1 click; or 2 taps on the header's target and project pickers           |
| Grid to the first undecided image     | 1 click, after scrolling past the error list (480 px)                     | 1 click: "Review 152 undecided", at the top                             |
| Accept                                | 1 tap at the bottom edge, in a spot other items fill with Exclude or Undo | 1 tap, top bar, same spot on every item                                 |
| Accept with a note                    | 2 (type, Accept)                                                          | 2 (type, Accept); keys: type, Escape, A                                 |
| Reject                                | 3 (Reject, type, Enter)                                                   | 3 (Reject, type, Enter), or 2 (type, Reject)                            |
| Exclude                               | 4 (Exclude, type, Enter, confirm)                                         | 4, unchanged: an exclusion stops a story being captured                 |
| Go back and undo                      | 2 (K, U)                                                                  | 2 (K, U)                                                                |
| Last item to the next project         | 3 (Escape, "Visual review", Review) and a 1.3 s refresh                   | 1 ("Next project: layout, 42 undecided" opens its first undecided item) |
| Switch project from a story           | 3 and a refresh                                                           | 2 (project picker, choose)                                              |
| Finish                                | 2 (Finish, confirm)                                                       | 2 (Finish, sign) and Face ID                                            |
| After Finish, the next target         | 3, plus scrolling; the page drops back to the top of the list             | 1 ("Next: #202 (340 undecided)")                                        |
| Browser Back from a story to its grid | 0 clicks; 2.0 s while every pull request is fetched again                 | 0 clicks; instant                                                       |

### Targets

The first screen lists each open pull request with a CI run, and the master seed when the server
was started with `--master-run`.

- It draws the server's cached list at once, with "Updated 40 s ago" and a **Refresh** button.
  `GET /api/prs` returns the cache immediately with its age, whether a refresh is running and the
  refresh's progress. The server starts a refresh only when the page asks (`?refresh=1`, sent by
  Refresh and by the targets screen when the list is over a minute old), and on its own every two
  minutes (section 4, "Loading"). The status row shows the refresh's progress ("Checking GitHub
  for new CI runs", with "Finding CI runs: 5 of 18, 12 s" beside it) and the page redraws the cards
  when it ends. Only the targets screen ever asks for a refresh.
- The first load after the server's very first start has no list: the wait box (section 4) shows
  the server's current step ("Listing pull requests", "Finding CI runs: 3 of 5", "Fetching
  branches") with a bar, the elapsed time and any network retry, over one outlined placeholder
  card. A restarted server shows the list it kept on disk at once.
- Each card: the target's name and title link; one line "Captured d38dbde479 on feature, CI run
  1000 (attempt 1)" with the run as the link; any warning the server sent, in a warning line;
  "12 decisions not yet finished" when decisions wait for Finish; the project table; and Finish.
- The project table's columns are **Project**, **Results** (count per status), **Decided**
  ("12 of 40") and the action. A project still downloading shows **Downloading...** in the action
  column; pressing it opens the wait box, which follows that download (it goes first) and opens
  the grid when it lands. The server marks such a project `downloading: true` (not a problem
  string) and rebuilds that target in its cache the moment the download lands, so the page, which
  asks again every 0.7 s while anything is downloading, fills the row in without a refresh. A
  project with a problem shows the problem and, where one exists, a **Job log** link and a
  **Retry** button.
- Projects with nothing to review collapse into one line ("3 projects unchanged: algorithms,
  layout, graphty"), so the master seed card is not a screen below the pull requests.
- **Passkey line.** At the top of the screen, one line states the passkey: "Finish is approved
  with your passkey (iPad passkey, 2026-10-01), and the CI gate refuses accepts without it.
  Register another device" once one is on the default branch; "Passkey waiting for #650 to
  merge: Finish asks for it already, but the CI gate checks approvals only once it is merged."
  while its pull request is open; otherwise "No passkey registered: accepts are not yet
  protected. Finish commits them without your approval, and the CI gate does not check who
  accepted them until a passkey is on master. Register passkey" (section 2, "Registering the
  passkey").

### A target and a project: the grid

Opening a project shows its grid: every item that needs or had a decision, as numbered thumbnails
grouped by component.

- The grid bar is sticky: it stays at the top while the grid scrolls (section 3 has its layout).
  `html` has `scroll-padding-top` equal to the sticky stack's height at each width, so a tile
  reached with Tab or Find is never under the bars.
- **Review 152 undecided** at the left of the grid bar opens the first undecided item, with the
  pass set to the undecided items. It is the main way into the story screen; a tile opens its own
  item, with the pass set to the grid's current filter.
- Failed captures still come first, but as one collapsed line ("6 failed captures: only Exclude
  applies -- Show"). Opened, the list shows each with its reason and log, as today; the choice is
  remembered in this browser.
- Tile numbers are fixed for the project: an item's number is its place in the full list (the
  "All" filter's order), so it does not change as items are decided. The story screen shows the
  same number on the item line, beside the pass position. (The test "goes to a number" in
  `page.test.mjs` changes with this.)
- **Thumbnails are small images the server makes.** `GET /thumb/<target>/<project>/<kind>/<file>`
  returns the image scaled to 400 px wide (a tile is about 190 CSS px, so it stays sharp at 2x),
  decoded and
  re-encoded with `pngjs`, which the package already depends on, and cached on disk by the
  source image's hash, so each one is made once. A full 2400 x 1800 image decodes to about 17 MB
  in the browser; a thumbnail to about 0.5 MB, so a grid of 170 tiles holds about 80 MB instead of
  about 3 GB. Only one grid is in the page at a time. This changes what the page displays, never
  what is captured or compared.
- A tile shows a placeholder until its thumbnail arrives; a fetch starts only when the tile comes
  near the screen, at most 6 at once; a failed tile reads "Failed -- tap to retry".
- A component's **Accept 4** (its undecided items) stays, as a quiet secondary button; **Undo 3**
  likewise. Both ask in a dialog that names the count; the two-press arming is gone.

### A story

The story screen shows one item: the decision bar, the status row, the item line, the view bar,
then the two panes filling the rest of the window (section 3).

- Both panes and their labels are drawn the moment the item opens, with "Loading baseline..." and
  "Loading new image..." inside them, so nothing on the screen moves when the images arrive.
- In Side by side, each image is shown as soon as it arrives; the changed-pixel analysis fills in
  the outline and the "880 pixels changed" line afterwards.
- The next two items' images are fetched in the background, so J usually shows the next item at
  once.
- **The pass is in the address.** The URL names the pass's filter (`pass=undecided`, or the grid
  filter the tile was opened from) beside the item. The frozen list itself is kept in this tab's
  session storage under that address, so a reload, or Safari restoring a tab it discarded, reopens
  the same pass at the same position with its decided items. When session storage is empty (a new
  tab from a copied link), the page rebuilds the pass from the filter in the address: the items
  that match it now, in grid order, with the opened item in it even if it no longer matches.
- On iPad portrait each pane is about 384 x 288 at Fit, too small to judge a fine change. Side by
  side stays the default (the owner asked for it); the portrait workflow is one tap on **2x**, or
  Spotlight (S), and the Keys overlay says so.

### Deciding

- **Accept** is available once the item's images are on screen. Until then the button reads
  "Accept" with a spinner, and pressing it says "Loading images: Accept waits for them."
- **Accept on a removed item** deletes the baseline. The button still reads "Accept"; the item
  line's explanation says "Removed from the Storybook: Accept deletes its baseline."
- **Reject** with an empty note: the Reject button takes its waiting look (outlined, pressed), the
  note box is focused with the placeholder "Reason to reject, then Enter", and the status row
  says "Type the reason, then press Enter to reject." Enter sends the reject. Typing the note first
  and then pressing Reject sends it at once.
- **Exclude**: the same, then the confirmation dialog (unchanged text, section 5).
- **Notes are drafts of one item.** Text typed in the note box is a draft of the item on screen. It
  is kept with that item while you move away (J, K, the grid, a double Escape) and shown again only
  when that item is back on screen; the box is empty on every other item. A draft is cleared when
  its item's decision is saved. Drafts live in the page's memory, so a reload loses them. Accept
  with a draft publishes it as an accept note.
- **Focus after a decision.** A sent Reject or Exclude, and every change of item, take focus out of
  the note box: focus goes back to the decision-bar button that had it (by its stable id), or else
  to the page. So the next A accepts, and never types an "a". Buttons that are not available use
  `aria-disabled="true"` and a click guard, never `disabled`, so a focused button keeps focus.
- After a decision the page moves to the next item of the pass, as today. The decided item stays in
  the pass, so Previous returns to it.
- **Saving.** The page waits for the server to save each decision before moving on, and the item
  stays on screen meanwhile. If the save takes over 300 ms the status row says "Saving the last
  decision..."; a decision press meanwhile is not queued and says "Still saving the last decision."
  If the save fails, the item stays undecided and on screen, its draft is kept, and the error stays
  in the status row until the next action.
- **The fast-press guard** keeps a double tap from deciding the next item unseen. A decision is
  ignored when it comes within 250 ms of the current item appearing on screen, and the status row
  says "Ignored: this image appeared less than a quarter second ago." Nothing else is guarded: two
  quick A presses on two images you did look at both act. Held keys (`e.repeat`) still decide once.
  Accept is also unavailable until an item's images are shown.
- A decision key on an item already decided says "Already accepted. Undo it to change it." No
  decision ever replaces another without Undo. On an item Accept all took unopened, typing a note
  and pressing Accept says "Accepted without opening. Undo it to add a note."
- **Screen readers** hear one message per item, written once to the status row after the move:
  "Accepted #56. Now #57, 13 of 230: button.dark, changed." The item line is not a live region.

### Undo

- **Undo** (U) is in the decision bar, always in the same place, available only on a decided item
  that no Finish has posted. It keeps you on the item, now undecided. On a reject an earlier Finish
  posted, U and the button both say "Posted by an earlier Finish: it stays." in the status row.
- On the grid, each decided tile keeps its own Undo. A component's **Undo 3** and **More > Undo all
  decisions** ask in a dialog; while they run, a progress bar and "Undoing 120 of 570..." show
  with a **Stop** button. Undo stays one request per item (no new server endpoint).

### Finish

Finish publishes every decision of one target across all its projects, approved with the owner's
passkey. It lives in one place per screen: the header on the grid and story screens ("Finish #201
(12)"), and the target's card on the targets screen. The count is the decisions not yet published,
which the server returns with every `/api/target` and `/api/decide` answer, so the header is
current after each decision without another request. At 0 the button is unavailable, with the
reason "Nothing new to finish" shown beside it as text, except when the last Finish could not set
the commit status: then it stays available, so Finish can post the status again.

1. **Press Finish.** The button shows a spinner. If a decision is still being saved, the page
   waits for it first ("Saving the last decision...") so the counts include it. Then the page asks
   for two things at once. `GET /api/target/<id>?finish=1` answers with what the sheet shows:
   counts by kind (accepts, rejects, exclusions; posted rejects left out), the accept notes and
   reject reasons with their items, the commit status Finish will set (from the same rule
   `finish()` uses, exported from `accept.mjs`, so the page never copies it), and a digest of the
   decisions. `POST /api/finish-prepare` builds and freezes the review record Finish would commit
   (with its `reviewedAt` and every file hash, without `approval`) and answers with whether a
   passkey must approve it and, if so, the record hash as the WebAuthn challenge (design.md
   section 8). Neither makes a GitHub call, so together they take well under a second.
2. **The Finish sheet** opens: a modal dialog (`aria-labelledby` its first line, `aria-describedby`
   its summary; focus on the dialog box itself, so a held Enter does not press its button). It
   states exactly what will happen (section 5 has the strings):
    - what will be committed, and where: "Commit 214 accepts and 1 exclusion to feature.";
    - what will be posted: "Post 3 rejects and 2 accept notes as a comment on #201.", or on the
      master seed "Open one issue for 3 rejects.";
    - the status it will set: "Then set the commit status 'Visual review' to failure (3 rejected).";
    - "Accepted without opening: 40." when Accept all took items unopened;
    - "Still undecided, left for a later round: layout 12, graphty 3.";
    - "Not loaded, so not reviewed: algorithms.";
    - every note to be published, reject reasons and accept notes, each with its item, in a list
      that scrolls inside the sheet; the summary above it and the buttons below it never scroll, so
      Cancel and the final button are on screen however long the list is;
    - the signing key line, and the command to sign as yourself when someone else started the
      server;
    - "Your passkey confirms this Finish (Face ID or a security key)." once a passkey is known, or,
      before one is registered and when the Finish commits anything, "Not yet protected: no passkey
      is registered, so this Finish is not approved by you and the CI gate does not check who
      accepted. Register a passkey on the targets screen and merge its pull request to turn that
      on."
      The buttons are **Cancel** and one button whose label names the effect: "Sign and finish #201"
      once a passkey is known; otherwise "Finish #201", or "Post 3 rejects to #201" for rejects alone.
3. **The passkey.** The final button's click handler calls `navigator.credentials.get` at once,
   with the record hash from step 1 as the challenge and `userVerification: "required"`. Nothing is
   awaited between the tap and that call: iPad Safari refuses WebAuthn outside the user's tap. A
   cancelled or failed Face ID leaves the sheet open, puts focus back on the final button, and says
   "Passkey cancelled: nothing was changed."; the same button tries again, and the sheet never asks
   the Finish question twice. The assertion, the challenge and the digest go to `POST /api/finish`.
   The server refuses with "Decisions changed since this sheet opened: check the summary again."
   when the digest no longer matches (the sheet then reloads its summary and challenge), checks
   the assertion with the gate's own code, and commits exactly the record that was approved. Once
   a passkey is known it approves rejects too, so their reasons are the owner's.
    - **No passkey registered.** Finish runs as it did before passkeys: accepts are committed with
      an unapproved record, and the gate does not check approvals until a passkey is on the default
      branch. The sheet and the targets screen say plainly that accepts are not yet protected. A
      Finish with only rejects never waits for a passkey.
    - **A passkey for another host.** When the passkeys known are all for another host name, the
      final button is unavailable and the sheet says "Finish cannot be approved now: no passkey is
      registered for <host>: serve this page from the host your passkey is for (<host>), or
      register one here".
4. **Finish runs** on the server. The sheet turns into a progress panel: an ordered list of the
   steps, each marked "done", "in progress" or "waiting" in text as well as by its mark, the current
   one with a progress bar for its count and the elapsed time: "Confirming with your passkey",
   "Checking", "Writing 214 files", "Committing", "Uploading images to LFS: 120 of 214",
   "Pushing", "Opening the pull request" (seed), "Posting the comment" or "Opening the issue",
   "Posting the status". Screen readers hear only each step's start and the end, not the counts.
   Closing or reloading the page does not stop it; reopening shows this panel again.
5. **The result** replaces the panel the moment the job ends, without waiting for a refresh, and
   focus moves to its heading: "Finished #201." then "Committed 3f2a9c1e04 to feature" (a link to
   the commit), "Posted 3 rejects and 2 accept notes as a comment" (a link to the pull request),
   "Commit status: failure -- 214 accepted, 3 rejected, 1 excluded, 15 undecided.", and every
   warning the server reported. The targets list refreshes in the background.

### Registering the passkey

Once per device family, from the targets screen's passkey line (design.md section 8 has the
credential's settings and the file it goes into):

1. **Register passkey** fetches the server's registration challenge, then opens a sheet: "Register
   a passkey for dev.ato.ms". Its **Create the passkey** button calls
   `navigator.credentials.create` directly from the tap. Face ID.
2. The server checks the new passkey, pushes a branch adding it to `visual-review/passkeys.json`
   and opens a pull request. The page says "Passkey registered (iPad passkey, 2026-10-01),
   credential id <id>. Opened <pull request>: check it names this id, then merge it to make the
   CI gate require your approval." The key is named by the kind of device that made it and the
   day, never "this device", since the file is read on every device.
3. Until that pull request merges, the passkey line reads "Passkey waiting for #650 to merge" and
   Finish already asks for the passkey. A cancelled Face ID says "Passkey not created: nothing was
   changed."

### Moving on: next project and next target

- **End of a pass.** J (or Next) on the last item of the pass does not wrap to the first. It shows
  the end card in place of the panes, with the decision bar's buttons unavailable. The card is not
  a screen of its own: the address stays on the last item, so K and Back both return to it. Opening
  the card asks the server for the target's current counts (`/api/target/:id`, no GitHub call).
  "End of graphty-element: 164 of 170 decided, 6 undecided." Buttons, in order:
  **Next project: layout (42 undecided)**, **Review the 6 undecided**, **Back to the grid**,
  **Finish #201 (12)**. The first is focused, and is described by the card's heading so a screen
  reader says why focus moved; Enter takes it.
- **Next project** opens that project's first undecided item, with the pass set to its undecided
  items: one click from the end of one project to deciding the next. It is the next project of the
  same target, in the targets screen's order, that has undecided items and has finished
  downloading; a project still downloading is listed under the buttons as "layout: downloading
  (42 items)" and is offered once it lands. When no project is left, the card offers
  **Finish #201** first and then the next target.
- **The last decision of a pass** (deciding its last item) shows the same end card.
- **After Finish**, the result card offers **Next: #202 (340 undecided)**, the next target in the
  list that has undecided items, and **Back to #201**.
- **Anywhere**, the header's target and project pickers (native `<select>` menus, labeled
  "Target" and "Project") jump straight to any target and project, and say how many are undecided
  in each ("layout (42)").

## 3. Screen layout

Sizes are in `em` with minimum widths, so enlarged text grows the bars instead of clipping them;
the pixel figures below are at the default text size. The sticky stack (header, then the screen's
own bar, then the status row) has one fixed height per screen and window width, so what is below it
starts at the same place on every item.

### Header (every screen)

One row, sticky at the top, 44 px tall:

`Visual review` (home) | `Target` picker | `Project` picker | `Finish #201 (12)` | `Keys  ?` | `Copy link`

- The pickers replace today's plain-text breadcrumbs. They shrink first when the window is narrow
  (a native menu truncates its own label). On the targets screen they are empty.
- At 768 px: Visual review about 110 px, two pickers at their 150 px minimum, Finish about 130 px,
  Keys about 70 px and Copy link about 90 px fit with their gaps; the measuring script checks it.
- On the targets screen the header has no Finish (each card has its own).

### Status row (every screen)

The status row is the last row of the sticky stack: under the header on the targets screen, under
the grid bar on the grid, under the decision bar on the story screen. It is always present, one
line tall at 1050 px and wider and two lines below, so a message never moves anything.

- It is `role="status"`. Errors are written to a separate `role="alert"` element in the same row.
- A message stays until the next one replaces it; nothing fades.
- Every message in the copy deck fits whole at 768 px (about 180 characters in two lines). A
  longer message, such as a server error, is clamped with "More"; the Keys overlay's "Recent
  messages" lists the last 20 in full.

### The story screen

From the top: header, decision bar, status row, item line, view bar, panes. The page itself does
not scroll on the story screen: `body` is `100dvh` with `overflow: hidden`, and only the panes
scroll. Nothing can push the bars off screen, including iPad Safari scrolling the layout when its
on-screen keyboard opens. The bars use the safe-area insets.

**Decision bar** (buttons at least 44 px tall). Button labels are short and never change; a
button's state is shown by its look (spinner, pressed, waiting outline, unavailable), and its
explanation is in the item line and the status row.

At 1280 px and wider, one row, 52 px:

`Grid` | `< K` | `12 of 230 -- 18 left in this pass` | `J >` || `Accept  A` | `Reject  R` | `Exclude  E` | `Undo  U` || note box

Widths at the default text size: Grid 60, Previous 64, the count 230, Next 64, Accept 100, Reject
100, Exclude 110, Undo 90: about 820 px plus gaps, which leaves the note box at least 160 px at
1180 px.

Below 1280 px, two rows, 100 px, the cells sharing the width in six equal columns:

1. `Grid` | `Accept  A` | `Reject  R` | `Exclude  E` | `Undo  U`
2. `< K` | `12 of 230 -- 18 left in this pass` | `J >` | note box (two columns)

On an iPad held upright, and below 900 px (Split View, a zoomed page), three rows, 150 px, in five
equal columns: the decisions, then `< K` | the count | `J >`, then the note box on a row of its own.
Below 600 px, four columns (`Accept` `Reject` `Exclude` `Undo`, then `Grid` `< K` the count `J >`,
then the note), without the key chips, which the Keys list still names. The cells never add up to
more than the window, so Undo and the note box are always reachable. While the images load,
Accept's spinner sits in its left padding, so its label and key chip are never cut.

- Every button is always present, at a fixed minimum width, so neighbors never shift.
- Buttons have stable ids; after every render, focus returns to the id that had it.
- Unavailable buttons are `aria-disabled="true"` with a click guard, drawn in `--muted` text at
  4.5:1 (no opacity), and `aria-describedby` points at the item line's explanation. A pressed
  "Accepted" or "Rejected" state keeps full contrast and `aria-pressed="true"`.
- What a button does when it does not apply (the status row says the reason on a press):

| Item                                 | Accept                                         | Reject                                | Exclude                  | Undo                                       |
| ------------------------------------ | ---------------------------------------------- | ------------------------------------- | ------------------------ | ------------------------------------------ |
| changed, moved, new, no baseline yet | available once images show                     | available                             | available                | unavailable: "Nothing to undo"             |
| removed                              | available; deletes the baseline                | available                             | available                | unavailable                                |
| unstable, failed                     | unavailable: "Can only be excluded"            | unavailable, same reason              | available                | unavailable                                |
| a project not seeded from master     | unavailable: "Accept on a pull request"        | available                             | unavailable, same reason | unavailable                                |
| decided                              | pressed "Accept" if accepted, else unavailable | pressed if rejected, else unavailable | unavailable              | available                                  |
| a reject an earlier Finish posted    | unavailable                                    | pressed                               | unavailable              | unavailable: "Posted by an earlier Finish" |
| local preview                        | unavailable: "Local preview: look only"        | unavailable                           | unavailable              | unavailable                                |
| end-of-pass card                     | unavailable                                    | unavailable                           | unavailable              | unavailable                                |

- The note box ("Note", a real `<label>`) holds the draft for the item on screen. On a decided item
  it shows that decision's note, read-only.
- Previous and Next are in the same bar, so deciding and moving are within one thumb's reach.

**Item line** (two lines tall; text clamped at two lines, tap to show it all, which is the reader's
own choice to move the panes):

1. The item number on the grid ("#57"), the story name and mode, then badges: status, "moved from
   ...", the decision ("Accepted: new spacing is intended"), "size changed 2400 x 1800 -> 2400 x
   1920", "flaky", "re-review".
2. One explanation, the first that applies: why a decision button is unavailable or what it will do
   ("Removed from the Storybook: Accept deletes its baseline."), the item's status note
   ("Unstable: two captures of the same commit differed, so it cannot be accepted or rejected. Fix
   the story, or exclude it."), or the change summary ("880 pixels changed, in a 40 x 40 area at
   (160, 80). Threshold 0.063.").

**View bar** (one row, `role="toolbar"` labeled "View"; on a narrow screen it scrolls sideways
instead of wrapping, and scrolls a focused control into view):

- The view, one segmented control (`role="group"`, "View"): `Side by side` | `Flash  F` |
  `Highlight  H` | `Spotlight  S`.
- Next to it, only when it applies (never shown grayed out): `Blink  L` while Highlight is on;
  `Spotlight flash  F` while Spotlight is on.
- `Outline  B` (the purple box around the changed area; on or off, remembered in this browser).
- `Next change  N` with "1 of 3".
- Zoom, one segmented control (`role="group"`, "Zoom"): `Fit` | `1x` | `2x` | `4x` | `8x` (Z
  cycles it).
- `Details`: a popover with the threshold, the anti-aliasing setting, the capture scale ("2 image
  pixels per CSS pixel") and, when there is one, the console output (a failed capture's log shows
  in its empty right pane instead, so it never shrinks the panes).
- Flash, Blink and Spotlight flash alternate every 333 ms. A page load or a deep link opens them
  stopped (press the key or the button to start); once the reader starts one, it keeps running on
  the next item. Under `prefers-reduced-motion`, they also open stopped on each item, and the
  placeholders and spinners do not animate.

**Panes**: unchanged in behavior (section 7). The end-of-pass card and load errors (with Retry)
are drawn inside the pane area, never above or below it.

### The grid

The grid bar is sticky under the header, above the status row. One row at desktop width, two at
iPad widths, the same height on every project:

`18 of 170 decided` | `Review 152 undecided` || Show: `Needs a decision (152)` `All (170)` `[More filters v]` || `Find story` || `Accept all undecided (148)` | `More v`

- **More filters** is a native `<select>` with every status and decision filter, each counted:
  "Changed (40)", "Moved (2)", "New (8)", "No baseline yet (3)", "Removed (1)", "Unstable (2)",
  "Failed captures (6)", "Accepted (12)", "Rejected (3)", "Excluded (1)".
- **Find story** (a labeled box) replaces the two boxes "Filter by story id" and "Go to". Typing
  narrows the grid (after a 200 ms pause, by hiding tiles rather than rebuilding them); Enter opens
  the first match; a number and Enter opens the item with that number.
- **More** holds **Undo all decisions** (asks in a dialog) and **Copy link to this grid**.
- Finish is in the header.
- Focus is drawn with one `:focus-visible` outline in `--accent` (#1c64d8 on #f6f7f9, about 5:1;
  #6ea4ff on #1f2227, about 6:1) with a 3 px offset, so it differs from the `.current` tile's
  outline, which sits flush.

### What moved where

| Today                                                          | Redesigned                                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Accept, Reject, Exclude, reason box at the bottom of the story | Decision bar above the images                                                                               |
| "Back to the grid" button, story breadcrumb button, Escape     | `Grid` in the decision bar, and Escape                                                                      |
| "Finish #201" on grid and story toolbars, and on the card      | Header (grid and story), card (targets)                                                                     |
| Status messages in the header                                  | The status row, with its own fixed height                                                                   |
| "Filter by story id" and "Go to" boxes                         | One "Find story" box                                                                                        |
| 9 to 11 filter buttons                                         | Two buttons and a "More filters" menu                                                                       |
| Blink and Spotlight flash always shown, grayed out             | Shown only in Highlight and Spotlight                                                                       |
| "Box"                                                          | "Outline"                                                                                                   |
| Changed-pixel and scale line above the images                  | Item line (summary) and Details popover (the rest)                                                          |
| Error log under the panes                                      | In the empty right pane of a failed item                                                                    |
| "Undo all decisions" beside Accept all and Finish              | More menu, with a dialog                                                                                    |
| Shift+A on the story screen                                    | Grid only                                                                                                   |
| Finish result and signer card above every target card          | Result card on top, compact, dismissible; signer as one line (full card only when another user's key signs) |

## 4. Loading and progress

Counts that change many times a second are shown in a `<progress>` element and a plain (not live)
label; only the start, each step change and the end are announced.

| Wait                                                                                             | Today                                                            | Redesigned                                                                                                                                                                                                                             | Needs the server                                                            |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| First page load (2.6 to 3.3 s, 21 gh calls)                                                      | "Loading..."                                                     | The wait box: the server's step with a bar and the elapsed time ("Listing pull requests", "Finding CI runs: 3 of 5", "Fetching branches"); a restarted server shows its kept list at once                                              | A progress field for the refresh                                            |
| Every return to targets, Back, Forward, deep link, after Finish (1.7 to 2.3 s, 16 gh calls each) | A header line; the old screen stays live                         | No wait: the cached list. `route()` no longer awaits the target list for grid and story screens; `GET /api/pr` already carries its target. The targets screen refreshes in the background when the list is over a minute old           | Serve the cached list; refresh only on request                              |
| A deep link to an unknown target on a cold server                                                | "Loading..."                                                     | The server must refresh for that one; the page shows the refresh's progress                                                                                                                                                            | The progress field                                                          |
| Captures downloading (14 s here; tens of seconds per large artifact on GitHub)                   | "reload in a moment"; no Review button; "captured none", "0 / 0" | "Downloading: 2 of 5 artifacts, 41 MB of 120 MB" on the card; "Downloading..." per row opens the wait box; the page checks every 0.7 s and fills rows in                                                                               | `downloading: true` per project; rebuild the target when its download lands |
| GitHub retrying (2, 5, then 15 s)                                                                | Nothing; only the server log says so                             | The wait box (or the status row) says which call waits to retry and when; a failed target gets Retry                                                                                                                                   | No                                                                          |
| Opening a project (0.1 to 0.2 s)                                                                 | "Loading..."                                                     | The grid bar and placeholder tiles drawn at once                                                                                                                                                                                       | No                                                                          |
| Grid thumbnails (full-size images; one fast scroll fetched 570)                                  | Checkerboard and alt text; a failed tile only changes its alt    | Server-made thumbnails (section 2); a placeholder per tile; a fetch starts only when a tile is near the screen; at most 6 at once; "Failed -- tap to retry"                                                                            | `GET /thumb/...`, cached on disk                                            |
| A story's images (0.25 to 1 s per item)                                                          | Empty stage; Accept grayed with no reason                        | Both panes drawn at once with "Loading baseline..." and "Loading new image..."; Side by side shows each image as it lands; Accept shows a spinner; the next two items prefetched; a failure shows its error with Retry inside the pane | No                                                                          |
| Saving a decision (30 to 85 ms; seconds on poor Wi-Fi)                                           | Nothing; presses are ignored                                     | "Saving the last decision..." after 300 ms; a press meanwhile says "Still saving the last decision."                                                                                                                                   | No                                                                          |
| Bulk Undo (10 to 15 s for 570 items over Wi-Fi)                                                  | Nothing until the end                                            | A progress bar, "Undoing 120 of 570..." and Stop                                                                                                                                                                                       | No                                                                          |
| Accept all (0.24 s)                                                                              | Fine                                                             | The result uses the server's count                                                                                                                                                                                                     | No                                                                          |
| Finish prepare before the sheet (under 1 s)                                                      | "Checking #201 before Finish..."                                 | A spinner on the Finish button                                                                                                                                                                                                         | `POST /api/finish-prepare`                                                  |
| The passkey                                                                                      | -                                                                | Safari's own Face ID sheet; then "Confirming with your passkey" as the first step                                                                                                                                                      | Assertion check in `/api/finish`                                            |
| Finish running (seconds to minutes)                                                              | One header line; then a 2.3 s refresh with a blank line          | The wait box: the step list, a progress bar for the current count, the elapsed time; the result at once                                                                                                                                | No (the steps exist)                                                        |

### The wait box

A wait that blocks what the reader can do is a box in the middle of the screen, over the page (a
modal `<dialog>`, so the page under it takes no taps or keys): the first list, opening a project,
a project whose captures are still downloading, and Finish. It shows, in fixed places so nothing
moves as they change: a title ("Downloading graphty-element captures for #519"), one sentence of
what is happening, a bar with its count ("1 of 2 artifacts, 41 MB of 120 MB"; Finish's step
list), the time spent, a network retry ("GitHub did not answer (Could not resolve host:
api.github.com). Trying again in 4 s, try 2 of 4."), and **Cancel** where there is a screen to go
back to (not for the first list, not for Finish, which runs on the server whatever the page
does). A failure turns the same box into the error, in red, with **Retry** and **Close**. The box
appears only after 300 ms, so a quick wait never flashes. A refresh or a download in the
background never opens it: the status row says it, written only over an empty row or its own
earlier line.

### Loading: where the time went, and what changed

Measured on 2026-10-01 against the live repository: 14 and 15 open pull requests, five projects
each, 125 MB of captures in 43 to 51 artifacts, the largest project (#409 compact-mantine) with
1298 items to decide. gh 2.4 on this machine, whose load average was 30 to 46 from other work, so
single numbers vary by a factor of two; each before and after pair ran back to back
(`tmp/visual-review-loading/measure.mjs` and `grid.mjs` in the branch's worktree).

Where the time went before:

- **A refresh asks GitHub three things per pull request, one after another**: its newest CI run
  (0.5 to 0.7 s), that run's jobs (0.8 to 1.0 s) and its artifacts (0.35 s). With every pull
  request in parallel that is 3 to 4 s per refresh, and a restarted server showed nothing until
  it ended. A target rebuilt after its download landed asked for the jobs and artifacts again.
- **Downloads**: about 1 s each even for a few kilobytes (gh's start and GitHub's redirect),
  4 to 5 s for the 40 to 60 MB ones. A run's five projects downloaded one after another.
- **Thumbnails**: 87 to 92 ms of CPU per capture, made on the server's only thread when a tile
  asked. The first screen of the largest grid (36 tiles) took 3.9 to 7.5 s, and every other
  request waited behind them (up to 0.5 s).
- **gh itself**: a `gh api` call costs about 250 ms where a plain HTTPS request costs about
  155 ms. Not changed: the calls run in parallel, so the saving would not show, and the server
  would have to hold gh's token (gh 2.4 has no `gh auth token`).
- **Unzip and hashing** are not visible: extraction is inside `gh run download`, and hashing a
  capture takes under 0.1 ms.

| Wait                                             | Before                                                                       | After                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Server restarted, captures on disk               | Nothing listed for 3.8 to 8.1 s                                              | The kept list at 0.2 s; the check with GitHub ends behind it at 3.7 to 4.0 s             |
| GitHub calls per refresh (14 pull requests)      | 1 + 14 + 14 + 14 = 43, and 2 more per target rebuilt after its download      | 1 + 14, plus 2 per run not finished yet (5 in the measurement): 25                       |
| Cold start, nothing on disk                      | List at 4.1 to 4.2 s, every capture on disk at 18.4 to 18.5 s                | List at 3.9 to 5.1 s, every capture on disk at 14.2 to 14.4 s                            |
| A CI run that finished while the page was closed | Downloaded when the page next refreshed (over a minute old), then waited for | Downloaded within two minutes by the server's own check, before the owner opens it       |
| Opening a project still downloading              | Not possible: the button was disabled                                        | The box; that project's download goes ahead of the queue                                 |
| Largest grid, first 36 thumbnails                | 3.9 to 7.5 s; other requests waited up to 0.55 s                             | 55 to 63 ms once made in advance; 1.6 to 2.0 s if not yet made; other requests 1 to 8 ms |

What was built:

- **The list is kept on disk** (`<tmp>/state/list.json`, without the results, which are read again
  from each capture), so a restarted server answers with it at once and refreshes behind it.
- **The server checks GitHub every two minutes** and downloads the captures of every run that
  finished, so a pull request is ready before it is opened.
- **A finished run's jobs and artifacts are asked once** and kept beside its downloads (and
  pruned with them); a refresh then asks only for the pull requests and their newest runs.
- **A run's projects download at once**, at most eight `gh run download` across the server (each
  download is mostly latency, so eight beat four by 3.5 s on a cold start); a project being opened
  moves to the front of the queue.
- **Thumbnails are made in advance**, as each capture lands, in up to four child processes, and
  a tile on screen goes ahead of them. Child processes, not worker threads: threads share the
  server's memory, which grew past 500 MB while scaling, and every git the server then started
  took 20 ms instead of 2 to 3, because the fork copies the parent's page tables; that made the
  check of the baselines after a refresh 7 s instead of 1.3 s. The advance thumbnails also skip
  reading a file they just found missing, which with a thousand at once filled Node's file thread
  pool and stalled every other read.
- **Network retries are shown**: the server's newest gh call waiting to retry (its error, which
  try, and when) is in `GET /api/prs` and in the 202 of a project still downloading, and the box
  says it.
- Not done: serving a thumbnail before the full image on the story screen. The full images come
  from this machine (23 to 120 KB) in well under 0.1 s, and the next two items are prefetched.

## 5. Copy deck

Old strings are as the page shows them today; `review.js` line numbers are given where useful.
`<branch>` is the default branch's name as the server reports it ("master" in this repository).
No string lives only in a tooltip.

### Targets

| Where                 | Old                                                               | New                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| First load            | "Loading..." / "Loading pull requests and captures..."            | "Loading pull requests:" and the server's step, with "12 s"                                                                                    |
| Cached list           | -                                                                 | "Updated 40 s ago" and "Refresh"; while refreshing, "Checking pull requests: 5 of 18, 12 s"                                                    |
| Empty list (345)      | "No open pull request has a CI run, and no master run was given." | "No open pull requests. To seed baselines, start the server with --master-run <run id>."                                                       |
| Card heading, seed    | "master (seed)"                                                   | "<branch> seed"                                                                                                                                |
| Card meta (408)       | "CI run 1000, attempt 1; captured d38dbde479 on feature run"      | "Captured d38dbde479 on feature, CI run 1000 (attempt 1)" (the run is the link)                                                                |
| Card meta, no run     | "CI run none, attempt -; captured none"                           | The target's problem, e.g. "Waiting for CI"                                                                                                    |
| Card warnings         | (never shown)                                                     | Each warning the server sends, e.g. "Could not refresh: <message>. Retry", "The saved decisions were unreadable; the file was moved to <path>" |
| Unfinished decisions  | -                                                                 | "12 decisions not yet finished"                                                                                                                |
| Table headers (428)   | "Project", "Found", "Reviewed"                                    | "Project", "Results", "Decided"                                                                                                                |
| Decided cell          | "2 / 6"                                                           | "2 of 6"                                                                                                                                       |
| Problem and log (444) | "no capture job log"                                              | "No capture -- Job log"                                                                                                                        |
| Downloading           | "downloading the captures: reload in a moment"; "captured none"   | Button "Downloading..." (disabled); card line "Downloading (2 of 5 projects)"                                                                  |
| Not seeded (437)      | "not seeded from master"                                          | "Reject only here: accept on a pull request"                                                                                                   |
| Retry hint            | "reload the page to retry"                                        | A "Retry" button                                                                                                                               |
| Unchanged projects    | (each its own row)                                                | "3 projects unchanged: algorithms, layout, graphty"                                                                                            |
| Finish button (477)   | "Finish #201 (2 decisions)", "Finish seed (N decisions)"          | "Finish #201 (2)", "Finish <branch> seed (2)"                                                                                                  |
| Finish button at 0    | "Finish #201 (0 decisions)" or enabled with only posted rejects   | Unavailable, with "Nothing new to finish" beside it                                                                                            |
| Passkey line, none    | -                                                                 | "No passkey registered: accepts are not yet protected. ..." and "Register passkey"                                                             |
| Passkey line, waiting | -                                                                 | "Passkey waiting for #650 to merge: Finish asks for it already, ..."                                                                           |
| Passkey created       | -                                                                 | "Passkey registered (iPad passkey, 2026-10-01), credential id <id>. Opened <pull request>: check it names this id, then merge it ..."          |
| Passkey not created   | -                                                                 | "Passkey not created: nothing was changed."                                                                                                    |

### Grid

| Where                     | Old                                                                                      | New                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Progress (275)            | "2 / 6 reviewed"                                                                         | "2 of 6 decided"                                                                                                    |
| Start                     | -                                                                                        | "Review 4 undecided"                                                                                                |
| Filters (809)             | "changed (2)", "failed (1)", "no baseline yet (1)", "Accepted (0)"                       | "Changed (2)", "Failed captures (1)", "No baseline yet (1)", "Accepted (0)"                                         |
| Shown line (843)          | "Showing 6: 1 error (listed first, never accepted) and 5 images to compare."             | Removed: the filter counts and the failed-captures line say it                                                      |
| Errors heading (855)      | "Errors: 1 story failed to capture"                                                      | "1 failed capture: only Exclude applies -- Show"                                                                    |
| Errors note               | "An error is never accepted. Fix the story, re-run the visual job ..."                   | Unchanged                                                                                                           |
| Find (776, 790)           | "Filter by story id"; "Go to: number or story id"                                        | Label "Find story", placeholder "Id or number; Enter opens"                                                         |
| Go to, out of range (886) | "There is no item 170: the list has 166."                                                | "No item 170: items are numbered 1 to 170 in All." (numbers are fixed now)                                          |
| Component accept (754)    | "Accept 4 undecided"                                                                     | "Accept 4"; dialog "Accept the 4 undecided items of <component> without opening them?" / "Accept 4"                 |
| Component undo            | "Undo 3 decisions"; armed "Confirm: undo 3 decisions"                                    | "Undo 3"; dialog "Undo the 3 decisions of <component>?" / "Undo 3"                                                  |
| Accept all (826)          | "Accept all"                                                                             | "Accept all undecided (4)"                                                                                          |
| Accept all dialog (1557)  | "Accept 4 undecided items of <p> without opening them?"                                  | Same, plus "2 more (failed, unstable) can only be excluded and stay undecided." when so; button "Accept 4"          |
| Accept all result (1573)  | "Accepted 4 items in <p>." (the page's own count)                                        | "Accepted 4 items in <p>." (the server's count)                                                                     |
| Undo all                  | "Undo all decisions"; "Press Confirm to undo the decisions of <p>, or Escape to cancel." | More > "Undo all decisions..."; dialog "Undo all 12 decisions of <p>?" / "Undo 12"                                  |
| Bulk undo progress        | -                                                                                        | "Undoing 120 of 570..." and "Stop"; at the end "Undid 570 decisions."                                               |
| Tile decision (585)       | "Accepted", "Accepted (not opened)", "Rejected: <reason>", "Posted by Finish: stays"     | Same, except "Posted by an earlier Finish: it stays."                                                               |
| Empty (866)               | "Nothing here."                                                                          | Under Needs a decision: "Everything is decided. Finish #201 when ready."; otherwise "No stories match this filter." |
| Thumbnail                 | (alt text only)                                                                          | "Failed -- tap to retry"                                                                                            |

### Story

| Where                               | Old                                                                                                                                   | New                                                                                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Position (1059)                     | "12 of 230"                                                                                                                           | "12 of 230 -- 18 left in this pass"                                                                                                                                                                                                   |
| Accept, loading                     | (disabled, tooltip "A")                                                                                                               | "Accept" with a spinner; on press "Loading images: Accept waits for them."                                                                                                                                                            |
| Accept, removed                     | "Accept"                                                                                                                              | "Accept"; item line "Removed from the Storybook: Accept deletes its baseline."                                                                                                                                                        |
| Accept unavailable, unstable/failed | (button absent)                                                                                                                       | Item line and on press: "Unstable: two captures of the same commit differed, so it cannot be accepted or rejected. Fix the story, or exclude it." / "Failed: the story did not render. Fix it, re-run the visual job, or exclude it." |
| Accept unavailable, not seeded      | (button absent)                                                                                                                       | "Accept on a pull request: <project> is not seeded from <branch>."                                                                                                                                                                    |
| Exclude                             | tooltip "E: stop capturing every mode of this story"                                                                                  | Item line on a waiting Exclude: "Exclude stops capturing every mode of this story."                                                                                                                                                   |
| Note box (1193)                     | "Reason (needed to reject or exclude); Enter rejects"                                                                                 | Label "Note"; placeholder "Needed to Reject or Exclude" (short enough to show whole at every width)                                                                                                                                   |
| Reject waiting                      | "A reject needs a reason: type it, then press Enter."                                                                                 | Placeholder "Reason to reject, then Enter"; status "Type the reason, then press Enter to reject."                                                                                                                                     |
| Decided row (1008)                  | "Decided: accept. To change it, undo it first."                                                                                       | Removed: the pressed button and the item line badge say it                                                                                                                                                                            |
| Decision badge (1074)               | "accept: new spacing is intended"                                                                                                     | "Accepted: new spacing is intended"                                                                                                                                                                                                   |
| After deciding (1653)               | "<item>: reject" / "<item>: undone, undecided again"                                                                                  | "Rejected #56. Now #57, 13 of 230: <story>, <status>." / "Undid #56: undecided again."                                                                                                                                                |
| Already decided (1603)              | "<item> is already accepted. Press U (Undo) first to change it."                                                                      | "Already accepted. Undo it to change it."                                                                                                                                                                                             |
| Note on a bulk accept               | (409 from the server)                                                                                                                 | "Accepted without opening. Undo it to add a note."                                                                                                                                                                                    |
| Accept too early (1607)             | "<item>: wait for both images before accepting."                                                                                      | "Loading images: Accept waits for them."                                                                                                                                                                                              |
| Fast press                          | (nothing)                                                                                                                             | "Ignored: this image appeared less than a quarter second ago."                                                                                                                                                                        |
| Saving                              | (nothing; presses ignored)                                                                                                            | "Saving the last decision..." / "Still saving the last decision."                                                                                                                                                                     |
| Save failed                         | "<message>"                                                                                                                           | "Not saved: <message>. #56 is still undecided." (stays until the next action)                                                                                                                                                         |
| Undo on a posted reject             | (button absent)                                                                                                                       | "Posted by an earlier Finish: it stays."                                                                                                                                                                                              |
| Single image (916)                  | "New story, no baseline: there is only the new image." (for every no-baseline item)                                                   | new: "New story: no baseline yet." / no baseline yet: "No baseline yet, and this pull request does not change it." / removed: unchanged / failed: unchanged                                                                           |
| No-baseline note (1181)             | "No baseline yet, and this pull request does not change it: it looks as on master. Accepting it makes this image its first baseline." | Same, with "<branch>" for "master"                                                                                                                                                                                                    |
| Change line (1089)                  | "880 changed image pixels in [160, 80, 40, 40] at threshold 0.063; captured at 1 image pixels per CSS pixel"                          | "880 pixels changed, in a 40 x 40 area at (160, 80). Threshold 0.063." The scale moves to Details: "Captured at 2 image pixels per CSS pixel"                                                                                         |
| No change at threshold (1425)       | "no changed box at this threshold"                                                                                                    | "No changed area at this threshold"                                                                                                                                                                                                   |
| Box (1108)                          | "Box", tooltip "B: outline the changed box"                                                                                           | "Outline"                                                                                                                                                                                                                             |
| Next box (1150)                     | "Next changed box", "box 1 of 3"                                                                                                      | "Next change", "1 of 3"                                                                                                                                                                                                               |
| Pane labels (1356, 1203)            | "New", "capture of <file>" in errors and alt text                                                                                     | "Baseline", "New", and "new image of <file>" everywhere                                                                                                                                                                               |
| Pane loading                        | (empty)                                                                                                                               | "Loading baseline...", "Loading new image..."                                                                                                                                                                                         |
| Load error (1436)                   | "<message>"                                                                                                                           | "<message>" and "Retry"                                                                                                                                                                                                               |
| End of pass                         | (wraps to item 1 silently)                                                                                                            | "End of <project>: 164 of 170 decided, 6 undecided." / "Next project: layout (42 undecided)" / "Review the 6 undecided" / "Back to the grid" / "Finish #201 (12)" / "layout: downloading (42 items)"                                  |
| Last project done                   | -                                                                                                                                     | "Every project of #201 is decided." / "Finish #201 (240)" / "Next: #202 (340 undecided)"                                                                                                                                              |
| Escape from a note                  | (went back to the grid, losing the typed text)                                                                                        | Leaves the note box (the draft stays with its item); a second Escape goes to the grid                                                                                                                                                 |
| Exclude dialog (1624)               | "Exclude <id>? Every mode of this story stops being captured, ..."                                                                    | Unchanged; button "Exclude"                                                                                                                                                                                                           |

### Finish

| Where                        | Old                                                                                     | New                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                         | "Finish seed", "Finish master", "the master seed", "Finishing the master seed"          | "Finish <branch> seed" everywhere; "Finishing <branch> seed"                                                                                         |
| Grid/story button            | "Finish #201"                                                                           | "Finish #201 (12)"                                                                                                                                   |
| Checking (1701)              | "Checking #201 before Finish..."                                                        | (spinner on the button); "Saving the last decision..." when one is in flight                                                                         |
| Waiting on the dialog (1727) | "Finish #201? Answer in the box."                                                       | Removed (the sheet is modal)                                                                                                                         |
| Sheet, first line (1709)     | "Finish #201: commit and push to feature, across every project?"                        | "Finish #201, every project:"                                                                                                                        |
| Sheet, commit                | -                                                                                       | "Commit 214 accepts and 1 exclusion to feature." (zero counts left out); seed: "Push visual/seed-<date> with 214 accepts and open its pull request." |
| Sheet, posts                 | -                                                                                       | "Post 3 rejects and 2 accept notes as a comment on #201."; seed: "Open one issue for 3 rejects."                                                     |
| Sheet, nothing to commit     | -                                                                                       | "Nothing is committed: only rejects."                                                                                                                |
| Sheet, status (1726)         | "One commit status is posted when Finish completes."                                    | "Then set the commit status 'Visual review' to failure (3 rejected)." / "pending (15 undecided)" / "success" (the server's prediction)               |
| Sheet, unopened (1712)       | "40 accepted without being opened."                                                     | "Accepted without opening: 40."                                                                                                                      |
| Sheet, undecided (1717)      | "Warning: still undecided, left for a later round: layout: 12 undecided"                | "Still undecided, left for a later round: layout 12, graphty 3."                                                                                     |
| Sheet, not loaded            | (missing)                                                                               | "Not loaded, so not reviewed: algorithms."                                                                                                           |
| Sheet, notes                 | (missing)                                                                               | "Notes to publish:" then one line per note: "Rejected graphty-element/x.light.png: <reason>", "Accepted ...: <note>"                                 |
| Sheet, signer                | unchanged signer line and start command                                                 | Unchanged                                                                                                                                            |
| Sheet, passkey               | -                                                                                       | "Your passkey confirms this Finish (Face ID or a security key)."                                                                                     |
| Sheet, no passkey            | -                                                                                       | "Not yet protected: no passkey is registered, so this Finish is not approved by you and the CI gate does not check who accepted. ..."                |
| Sheet button                 | "Finish #201"                                                                           | "Sign and finish #201" once a passkey is known; otherwise "Finish #201", or "Post 3 rejects to #201" for rejects alone                               |
| Cancelled                    | "Finish cancelled: nothing was changed."                                                | Unchanged                                                                                                                                            |
| Passkey cancelled            | -                                                                                       | "Passkey cancelled: nothing was changed."                                                                                                            |
| Decisions changed            | -                                                                                       | "Decisions changed since this sheet opened: check the summary again."                                                                                |
| Running (1752)               | "Finishing #201: committing..."                                                         | The step list (section 2), e.g. "Uploading images to LFS: 120 of 214", with "1 min 12 s"; each step "done", "in progress" or "waiting"               |
| Lost contact (1769)          | "Lost contact with the server (...); Finish goes on there. Retrying..."                 | Unchanged                                                                                                                                            |
| Done (1844)                  | "Finish of #201 done. Committed 3f2a9c1e04 to feature."                                 | "Finished #201. Committed 3f2a9c1e04 to feature." (the commit is a link)                                                                             |
| No commit (1830)             | "No commit (nothing accepted)."                                                         | "No commit: nothing was accepted or excluded."                                                                                                       |
| Rejects posted (1832)        | "2 rejects posted."                                                                     | "Posted 2 rejects and 1 accept note as a comment." / "Posted 1 reject as a comment." / seed: "Filed 2 rejects as issue #640." (a link)               |
| Status (1840)                | "Status: Reviewed: 9 accepted, 2 rejected, ..."                                         | "Commit status: failure -- 9 accepted, 2 rejected, 0 excluded, 5 undecided."                                                                         |
| Seed pull request (1838)     | "Pull request: <url>"                                                                   | "Opened pull request #641." (a link)                                                                                                                 |
| Warnings                     | (never shown)                                                                           | Each: e.g. "Pushed and posted, but the decisions could not be cleared: <message>"                                                                    |
| Failed (1824, 1743)          | "Finish of #201 failed; your decisions are kept. Fix the cause and press Finish again." | "Finish of #201 failed. Decisions not yet published are kept; anything pushed is listed below."                                                      |
| Interrupted (1791, 1812)     | page: "the server restarted ... kept no record"; server: "the server stopped while ..." | The server's text only                                                                                                                               |
| Next                         | -                                                                                       | "Next: #202 (340 undecided)" / "Back to #201"                                                                                                        |

### Header and general

| Where     | Old           | New                                                                                                 |
| --------- | ------------- | --------------------------------------------------------------------------------------------------- |
| Keys      | (README only) | "Keys" button and `?`: the key overlay, with "Recent messages" and "Single-key shortcuts: on / off" |
| Copy link | unchanged     | Unchanged                                                                                           |
| No token  | unchanged     | Unchanged                                                                                           |

### What Finish publishes for an accept note

Today a note typed on an Accept is kept by the server and written into the review record, but the
pull request comment (`rejectComment` in `accept.mjs`) lists only rejects, a Finish with accepts
alone posts no comment, and the seed pull request's description (`seedBody`) lists only rejects.
The redesign publishes them:

- The comment's first line counts both: "**Visual review: 3 rejected, 2 accepted with a note**".
  Accept notes follow the rejects under "Accepted, with the reviewer's note (quoted as data):".
- A Finish whose only publishable text is accept notes posts the comment too.
- The seed pull request's description gets the same "Accepted, with a note" list.
- The machine-readable `<!-- visual-review-rejects ... -->` block is unchanged: it stays the
  rejects only, so agents that read it see the same data.
- Finish's result gains a count of accept notes posted, which the page shows.

This is a change to what Finish reports, not to what it accepts, and it lives in `accept.mjs`.

## 6. Keyboard and touch

### Keys

Every key works only on the screen named, never while a dialog, the Finish sheet or the overlay is
open, never in a text box except where listed, and never with Ctrl, Cmd or Alt held. Keys are
shown on the buttons themselves and in the `?` overlay. The overlay's **Single-key shortcuts:
on / off** switch (remembered in this browser) turns off every letter key, for speech input or a
stray press; the buttons still work. The overlay opens with focus on its own box, never on the
switch, so a Space or Enter typed as it opens changes nothing. Turning the letters off says
"Single-key shortcuts are off: letters do nothing until you turn them on again in Keys (?).", and
every letter typed while they are off says it again.

| Key               | Screen                 | Action                                                                                             | Change                   |
| ----------------- | ---------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ |
| J / K             | story                  | Next / previous item of the pass; J on the last item shows the end card                            | No wrap                  |
| A                 | story                  | Accept, once the images are shown                                                                  | -                        |
| (type), Escape, A | story                  | Accept with a note: type in the note box, Escape leaves it, A accepts with the note                | Listed                   |
| R                 | story                  | Reject; with an empty note, focuses it for the reason                                              | -                        |
| E                 | story                  | Exclude; with an empty note, focuses it; then the confirmation                                     | -                        |
| U                 | story                  | Undo the item's decision; you stay on the item                                                     | -                        |
| Enter             | note box               | Sends the Reject or Exclude that is waiting for its reason, then leaves the box; nothing otherwise | No hidden default reject |
| F                 | story                  | Flash, or back to side by side; in Spotlight, Spotlight flash on or off                            | -                        |
| Space (hold)      | story                  | Flash while held                                                                                   | -                        |
| H                 | story                  | Highlight, or back to side by side                                                                 | -                        |
| L                 | story                  | In Highlight: Blink on or off                                                                      | -                        |
| S                 | story                  | Spotlight, or back to side by side (on iPad portrait, the way to see a change large)               | -                        |
| B                 | story                  | Outline on or off                                                                                  | -                        |
| N                 | story                  | Next change                                                                                        | -                        |
| Z                 | story                  | Next zoom: fit, 1x, 2x, 4x, 8x, fit (from fit, 2x is two presses)                                  | -                        |
| Shift+A           | grid                   | Accept all undecided (asks first)                                                                  | Grid only                |
| /                 | grid                   | Focus Find story                                                                                   | New                      |
| ?                 | every screen           | Show or hide the key overlay                                                                       | New                      |
| Escape            | story                  | Back to the grid; in the note box, first leaves the box (the draft stays with its item)            | Changed                  |
| Escape            | dialog, sheet, overlay | Cancel or close                                                                                    | -                        |
| Enter             | end card               | Takes the focused offer (Next project first)                                                       | New                      |

Held decision keys still decide once. No key reverses a decision; Undo is explicit.

### iPad

- **Placement.** The decision bar is at the top of a page that does not scroll (section 3), so
  Safari's on-screen keyboard can cover only the bottom of the panes. The story screen uses the
  dynamic viewport height (`100dvh`) and the safe-area insets, so Safari's toolbars never cover a
  button.
- **Touch.** Buttons are at least 44 x 44 px, with `touch-action: manipulation` so a quick second
  tap is a tap, not a double-tap zoom, and Safari adds no tap delay.
- **No hover.** Nothing is only in a tooltip: keys are on the buttons, reasons are in the item line
  and the status row, and the Keys button opens the overlay.
- **Hardware keyboard.** The page keeps focus on itself whenever nothing else holds it (Safari sends
  keys only to a focused element), as today, and a decision or a change of item always takes focus
  out of the note box.
- **Pickers.** Target, project and More filters are native `<select>` menus, which Safari shows as
  its own wheel or list.
- **Zoom.** Pinching zooms the whole page, as Safari does; the zoom control zooms the images. Panes
  scroll with one finger and stay in step, as today.
- **Swipe.** Not added: a swipe to the next item would fight the panes' own scrolling when zoomed.
- **Passkey.** Face ID is called straight from the tap on the sheet's final button and on Register
  passkey (section 2).
- **Memory.** Grid tiles use server-made thumbnails (section 2), so a long sitting does not make
  Safari reload the tab.

## 7. What does not change

- **Capture**: what CI screenshots, at what size and scale, in which browser setup; story
  parameters; nothing under `visual-baselines/`.
- **Comparison**: pixelmatch, its thresholds, anti-aliasing handling, and the statuses (changed,
  moved, new, no baseline yet, removed, unstable, failed). The page's own diff for Highlight and
  Spotlight is drawn the same way. Thumbnails are for the grid's display only.
- **The gate**, except the passkey check the owner asked for (design.md section 8): what blocks a
  pull request, and how review records are otherwise checked.
- **Decision rules**: what can be accepted, rejected or excluded on each status; a reject or an
  exclusion needs a reason; a decision applies only to the image it was taken on; Undo is the only
  way to change a decision; rejects posted by Finish stay.
- **Finish's effects**: one commit with the accepted images, exclusion files and the review record;
  one comment (or, for a seed, one issue); one commit status with the same rule; one Finish at a
  time; it runs on the server and survives a reload. What changes: Finish reports accept notes
  (section 5), the record carries the passkey approval (design.md section 8), and Finish refuses
  when the decisions changed after its sheet opened.
- **Owner requests kept**: fit-to-screen side by side at one scale for both images; the blank left
  pane labeled "No baseline" when there is no baseline (and the empty right pane for a removed or
  failed story); zoom from fit to 8x that overflows the panes, which scroll together; Undo and
  Previous back to a decided item; the red changed-pixel overlay (Highlight) with Blink; the purple
  outline as an option remembered in this browser; Spotlight and Spotlight flash; Flash and
  hold-Space flash; deep links that name every screen, view and option; the signer line and the
  command to sign as yourself.
- **The page stays plain JavaScript** with no framework and no new dependency.

## 8. Checked by hand on a real iPad

Playwright's WebKit does not raise Safari's software keyboard, run Face ID, or reproduce Safari's
memory limit, so these are checked on the owner's iPad before the redesign is called done:

1. With the software keyboard up in the note box, at both orientations, the whole decision bar and
   the status row stay on screen, and Enter sends a waiting reject.
2. Five projects of 170 items each, each grid scrolled end to end and 20 items of each opened, in
   one tab, without Safari reloading the tab.
3. Finish with Face ID; Finish with Face ID cancelled ("Passkey cancelled: nothing was changed.");
   Register passkey.
4. Safari discards the tab in the background (open many other tabs); returning reopens the same
   item at the same pass position.
5. VoiceOver: after Accept, the next item is announced once; an unavailable button reads its
   reason.

## Files this redesign touches

- `visual-review/trusted/page/index.html`, `review.css`, `review.js`: everything in sections 2 to 6.
- `visual-review/trusted/lib/serve.mjs`: the cached target list with its age, refresh only on
  request, a progress field for the refresh, a per-project `downloading` flag and a rebuild of the
  target when its download lands, the default branch's name, each target's unpublished count in
  `/api/target` and `/api/decide`, `GET /thumb/...` with its disk cache, the Finish preview on
  `GET /api/target/<id>?finish=1` (the counts, notes, predicted status and a digest of the
  decisions), and the digest on `POST /api/finish`. The passkey routes (`/api/finish-prepare`,
  `/api/passkey-challenge`, `/api/register`, `/api/passkeys`) are design.md section 8's.
- `visual-review/trusted/lib/accept.mjs`: publishing accept notes (section 5), the exported status
  rule, and `finish()` taking a ready-made record.
- The passkey: registration, the record's approval and the gate's checks, as design.md section 8
  specifies (`gate.mjs`, `approval.mjs`, `visual-review/passkeys.json`) and
  `design/visual-testing/passkey-plan.md` builds. The owner asked for this, which is what allows
  the gate change.
- `visual-review/README.md`: the page guide ("Opening the review page", "The screens", "Keys",
  "Finish", the passkey), and its errors: Accept is also allowed on "no baseline yet"; the targets
  table's real columns; a seed's rejects go into an issue, not a comment; the component order is
  failed, changed, moved, new, unstable, removed, no baseline yet.
- `visual-review/test/page.test.mjs`: the success criteria of section 1, including: the decision
  bar's buttons inside the window at 768 x 1024; the longest status message whole at 768 x 1024;
  type a note, J, A, and the note is not on the second item; R, type, Enter, A accepts the next
  item; Tab to Accept, Space twice, focus still on Accept; a focused tile's top below the grid bar;
  a tile's image is a thumbnail; Finish refuses a changed hash; a reload keeps the pass.

## Review changes

Three reviews of the earlier draft -- the owner's iPad use, accessibility, and implementation --
found real problems. What changed:

- **The decision bar fits at 768 px.** Labels are short and fixed ("Accept", "Reject", "Exclude",
  "Undo"); "removal" and "type a reason" moved to the item line, the status row and the note box's
  placeholder. Below 1050 px the bar has two fixed rows (decisions; movement and the note). The
  earlier fixed widths summed to about 930 px. The breakpoint is 1050, not 900, because the
  one-row bar needs about 1000 px with a usable note box.
- **The status row has its own fixed row on every screen**, instead of the header's leftover width,
  which was about zero at 768 px. Messages no longer fade; errors use `role="alert"`; the Keys
  overlay keeps the last 20.
- **Notes are drafts of one item**, cleared when its decision is saved, so a note can no longer be
  published on the wrong item; the drafts also make a double Escape safe.
- **Focus is specified**: a sent Reject or Exclude and every change of item leave the note box;
  bar buttons keep stable ids and use `aria-disabled`, so focus survives a decision.
- **Grid thumbnails are made by the server** with `pngjs` and cached on disk, about 35 times less
  memory per tile.
- **The fast-press guard** is now 250 ms from the item appearing, not 500 ms per button, so quick
  accepts of two images you did see both count.
- **Saving is visible** ("Saving the last decision..."), a failed save keeps the item undecided
  with its draft, and Finish waits for a save in flight.
- **Next project opens its first undecided item** and skips projects still downloading; the end
  card is not a route and refetches counts.
- **The pass survives a reload** (its filter in the address, its list in session storage).
- **The count says "18 left in this pass"**.
- **The server side is complete**: `/api/prs` serves the cache and refreshes only on request,
  `route()` stops awaiting it, a finished download rebuilds its target, and Finish gets a prepare
  call that freezes the record and returns everything the sheet states, including the predicted
  status from the exported rule. The record hash doubles as the "decisions changed" check, so there
  is one mechanism, not a digest now and a hash later.
- **The passkey is designed, not just given a place.** The owner's request is to add the Face ID
  or security-key Finish and enforce it in CI; the earlier note "built on a stacked branch, do not
  build" contradicted that and is gone. The Finish sheet, Register passkey, the no-passkey case
  (rejects still post; accepts are refused because the gate would refuse them) and the hand checks
  are specified here; the record and gate checks stay in design.md section 8.
- **Accessibility wiring**: one combined announcement per item, `scroll-padding-top`, a page that
  does not scroll on the story screen (so the keyboard cannot push the bar away), `em` sizing,
  quiet progress counts, dialog labels and focus, contrast for unavailable buttons, a
  `:focus-visible` ring distinct from `.current`, toolbar and group roles, labeled pickers and Find,
  a single-key shortcuts switch, no tooltips.
- **The portrait workflow (2x or Spotlight), Accept with a note by keys, and Undo keeping you on
  the item** are stated and listed in the Keys overlay.
- **A list of hand checks on a real iPad** (section 8) for what CI cannot test.
- Finish stays available at 0 when the last Finish could not set the status; a note on a bulk
  accept says to undo first.

What was rejected, and why:

- **Releasing tile images when they scroll away.** With thumbnails at about 0.5 MB and one grid in
  the page at a time, a grid holds about 80 MB; the hand check in section 8 confirms it.
- **"Retrying in 5 s" from GitHub.** It needs a callback in `github.mjs`; the step's elapsed time
  already shows a slow step, and a failed one gets Retry.
- **Stopping Flash on every item.** Flash and Blink open stopped on a page load or deep link and
  under reduced motion, as asked; but once the owner starts Flash in a sitting it keeps running on
  the next item, because restarting it on each of hundreds of items would cost a press per item.
- **Keeping drafts across a reload.** They live in memory; the decisions themselves are on the
  server, and a lost half-typed note costs one retype.
- **Queuing decisions while one saves.** Advancing before the server answers would show the next
  item while the last one might still fail; a visible "Saving..." is simpler and honest.
