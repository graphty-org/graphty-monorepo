# Rejected fixes

Fixes the re-walk rejected and reverted. The next triage refixes each in the shared part named below.

## U1

Unit: a within-picture Select card's chip counts what it would select (graphty-element VisibilityApi countsNow / countRule; commit 42ce7201c7, reverted).

- Incomplete -- not a regression: this run was ended before the re-walk finished, so not every route has a verdict yet. The app was rebuilt to the fix and replays were started. Finished so far, every step matching the earlier walk made after the fix: T65A-cards (19 of 19 steps), T65A-order (11 of 11; this route is 'T65A success path, the other card order'), T64A-p1-success (7), T64A-table-role-rerun (10) and T64B-rp2-detour-analyze-weight (7). The T66A Data source card replay (pilot walk c1-path) matched its first 8 of 17 steps. Still running or never started: T65A-path, T65A-keys (the chip's spoken count), T65B-path, T65B-order, T65B-detour (Which nodes), T65B-keys-toggle, T65B-keys-sr, T68A-path, T68B-path, the rest of T66A-c1-path, T66B success-4, T66A c4-t68-start and T68B r4-start. These replays write to design/ui/studio/tmp/r1-dry2-recheck-U1/c42ce/ (results in rewalk.json there) and design/ui/studio/tmp/r1-dry2-recheck-U1/c42ce-pilot/ (log at tmp/u1-recheck/t66.log in the worktree). Before any freeze, read those results; for a walk that diverged, look at its stop screenshot, especially the chip's 'X of Y' on the Select card.
- None of the screenshots have been looked at yet, and Enter, Escape, Tab and Shift+Tab have not been checked by hand on the changed chip. The engineer notes (design/ui/studio/notes/engineer.md) have not been updated with this re-walk.
- 2026-10-29, dry run pass 5 (`dry-run-r1-3.md`, unit U1): sent again. Since the revert, the merge of master turned `within`'s default to the picture and bccf8fe47f made an undo or redo sync the picture first, so the refix counts by the same predicate as the selection (`selectsOverGraph`), not the literal `"picture"`, and its re-walk must finish before any freeze.

## Rejected: Select card chip count (sent again in dry run pass 5)

Unit: a within-picture Select card's chip counts what it would select, by the same predicate as the selection (fix 355022569a, docs b35fa3c45e; both reverted). Refix it in the shared part, in graphty-element.

- Incomplete -- not a regression: the re-walk did not finish, so this is not a pass. No regression was found in what did run.
- Build check: graphty/dist was built at 22:34, after the fix commit 355022569a (22:33); its build stamp is 355022569a3b. The docs commit changes no code.
- Only one route finished: T65A success path, replayed from tmp/design-studio/tier4/r1d2/pilot/T65A/b01-T65A-path into design/ui/studio/tmp/r1-dry3-recheck-U1/p/T65A-b01-T65A-path. All 24 steps matched, but its screenshots were not looked at. The replay does not flag a change in a chip's text, so the card's '4 of 14' in 25.png still needs checking by eye.
- Never ran: the 12 other pilot replays (T65A other order, keyboard walk, redo; T65B success path, other order, Which nodes detour, keyboard and screen-reader walk; T66A/T66B Data source card; T68A/T68B starts); the re-walk of the 14 fix-walk routes in design/ui/studio/tmp/r1-dry3-U1/a (expected 'A 4 of 14' and 'B 3 of 5' screens) and of the two hand-extended walks (hand-A-read, hand-B-keys); the Enter / Escape / Tab / Shift+Tab checks on the changed card chips; comparing the results with decided.md.
- A re-walk running 4 browsers at once was started against the one-browser-per-agent rule, then stopped; its sessions (T64A-p1-success, T64B-rp2-detour-analyze-weight) were ended and its partial folder deleted.
- Sessions may still be open from the pilot replays writing under design/ui/studio/tmp/r1-dry3-recheck-U1/p/; each uses --end-on-diverge and an idle session closes itself after 15 minutes.
- The engineer notes (design/ui/studio/notes/engineer.md) were not updated.
- To finish next time, one browser at a time: REAL_DIST=<worktree>/graphty/dist node design/ui/studio/tool/real.mjs --replay <route> <session folder> for each pilot route; then --rewalk design/ui/studio/tmp/r1-dry3-U1/a with REAL_REWALK_PARALLEL=1; then look at each card chip screenshot (A 4 of 14, keep card off 5 of 24; B 3 of 5, after Undo of the depth edit 3 of 6; screen reader 'Node 3 of 5') and press the keys on the changed cards.
- 2026-10-30, dry run pass 6 (`dry-run-r1-4.md`, unit U1): sent again as `git revert 0b1175dabc`, which restores
  355022569a unchanged (nothing under it has changed since). Under the new decided entry "A fix-now unit is taken
  back only for a regression its re-walk shows", an unfinished re-walk is finished, not reverted; close both
  entries above when it is.
