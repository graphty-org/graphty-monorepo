# Rejected fixes

Fixes the re-walk rejected and reverted. The next triage refixes each in the shared part named below.

## Rejected: chip-row

Unit: a selection does not hide a turn's chip (`chip-row`, graphty). A selection is not a change to the graph, so a turn whose only changes are selections shows its lines and its chip row; the row is the last result that found something, else the last empty one; a selection of nothing draws no line (fix 2e760cfa8e, reverted by baeb532d60). Refix it in the shared part: the rejected fix changed only the app's Conversation.tsx and words.ts, and the cause below is in graphty-element.

- Failed acceptance and regression, T92B success path, fact 2: with 'Selection 1' on, no 7 chip and no Show in table; a bare warning 'No matches.' sits under the right reply 'There are 7 genes ...'. It reproduced on 2 of 2 new walks, and the pilot turn had no found result either. Screenshots: design/ui/studio/tmp/r1-dry1-recheck-chip-row/T92B-success/09.png and design/ui/studio/tmp/r1-dry1-recheck-chip-row/T92B-success-2/09.png; earlier screen: /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T92B/success/12.png
- The unit's diagnosis ('Selected 0 nodes hides the found 7') does not hold on this route: the turn contains no AI_EFFECT_FOUND. A turn bound to a selection stays bound after the model clears it, so where reads narrow to the bound ids and come back empty, which gives the bare 'No matches.' (graphty-element/src/ai/tools/fields.ts settleTarget, graphty-element/src/ai/tools/effects.ts searchedIn).
- Not a regression, for the record: Escape on a focused chip clears the reader's selection, and with it the next message's scope flips to Whole graph with no notice. The chip's key handling is not in this diff, but a selection turn now reaches it. decided.md settles Escape only for the composer. Screenshot: design/ui/studio/tmp/r1-dry1-recheck-chip-row/T92B-success/18.png
