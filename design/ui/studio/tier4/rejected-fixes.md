# Rejected fixes

Fixes the re-walk rejected and reverted. The next triage refixes each in the shared part named below.

## U1

Unit: a within-picture Select card's chip counts what it would select (graphty-element VisibilityApi countsNow / countRule; commit 42ce7201c7, reverted).

- Incomplete -- not a regression: this run was ended before the re-walk finished, so not every route has a verdict yet. The app was rebuilt to the fix and replays were started. Finished so far, every step matching the earlier walk made after the fix: T65A-cards (19 of 19 steps), T65A-order (11 of 11; this route is 'T65A success path, the other card order'), T64A-p1-success (7), T64A-table-role-rerun (10) and T64B-rp2-detour-analyze-weight (7). The T66A Data source card replay (pilot walk c1-path) matched its first 8 of 17 steps. Still running or never started: T65A-path, T65A-keys (the chip's spoken count), T65B-path, T65B-order, T65B-detour (Which nodes), T65B-keys-toggle, T65B-keys-sr, T68A-path, T68B-path, the rest of T66A-c1-path, T66B success-4, T66A c4-t68-start and T68B r4-start. These replays write to design/ui/studio/tmp/r1-dry2-recheck-U1/c42ce/ (results in rewalk.json there) and design/ui/studio/tmp/r1-dry2-recheck-U1/c42ce-pilot/ (log at tmp/u1-recheck/t66.log in the worktree). Before any freeze, read those results; for a walk that diverged, look at its stop screenshot, especially the chip's 'X of Y' on the Select card.
- None of the screenshots have been looked at yet, and Enter, Escape, Tab and Shift+Tab have not been checked by hand on the changed chip. The engineer notes (design/ui/studio/notes/engineer.md) have not been updated with this re-walk.
- 2026-10-29, dry run pass 5 (`dry-run-r1-3.md`, unit U1): sent again. Since the revert, the merge of master turned `within`'s default to the picture and bccf8fe47f made an undo or redo sync the picture first, so the refix counts by the same predicate as the selection (`selectsOverGraph`), not the literal `"picture"`, and its re-walk must finish before any freeze.
