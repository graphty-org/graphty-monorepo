# Rejected fixes

Fixes the re-walk rejected and reverted. The next triage refixes each in the shared part named below.

## cancel-new-card

Unit: Cancel on a new filter card takes the card away (commit 0ec56d2f3b, reverted).

- REGRESSION (focus return, keyboard route: new filter card opened from Quick actions -- Ctrl+K, type 'filter', Enter -- then Tab to Cancel and Enter, or Escape on its empty value picker): focus now lands on 'Main menu' (Cancel) or on the toolbar's 'Quick actions' (Escape). The frozen build baac78342b sent it to 'Add filter' in both cases. The rule in decided.md is that focus returns to what opened the workspace, else 'Add filter'. Screenshot: design/ui/studio/tmp/r1-dry1-recheck-cancel-new-card/keyboard-sr/16.png (focus ring on Main menu; tool printed 'focus: button "Main menu"', live 'Filter not added'). Frozen-build comparison: design/ui/studio/tmp/r1-dry1-recheck-cancel-new-card/keyboard-sr-frozen/ ('focus: button "Add filter"'). Mechanism: FiltersSection.open in graphty/src/workspace/data-place/Filters.tsx records document.activeElement when the card is made. When the card comes from the palette, that element is the body or whatever control the palette handed focus back to, never a filter control. backToOpener then focuses any connected element outside .dp-filter: body.focus() does nothing, so focus falls to the first stop. Suggested fix: fall back to 'Add filter' when the recorded opener is the body or is not a control that opens filters.
