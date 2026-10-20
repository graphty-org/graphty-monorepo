# Rejected fixes

Fixes the re-walk rejected and reverted. The next triage refixes each in the shared part named below.

## color-word-crimson

Unit: compact-mantine colorWord -- call a crimson red (commit 50ecd91e4, reverted).

- REGRESSION (compact-mantine colorWord, commit 50ecd91e4): the red band now begins at hue 340, and colorWord tests `hue * 60 < end`, so a color at exactly 340 drops out of pink and becomes red. Kelly's purplish pink E68FAC has a hue of exactly 340.0 and is now spoken "red"; before the change it was "pink". Route: College football, then Analyze, then Louvain, then Run, then the Louvain folder's Style tab, then Fill Color (the Color from each layer dialog). Group 8 is a plainly pink swatch, and the screen reader now says "red" for it in three places: the row "Group 8, red, 9 nodes" (design/ui/studio/tmp/r1-dry1-recheck-color-word-crimson/walk/11.png and 12.png), the swatch button "Layer Group 8 color, red", and the picker swatch "red E68FAC, the color before this edit" (design/ui/studio/tmp/r1-dry1-recheck-color-word-crimson/walk/14.png). Fix direction (not made): put the boundary between 340 and 344, for example 342, or also judge by lightness so a light 340 stays pink. Add E68FAC to the colorWord test.
- Acceptance holds for the targeted color: BE0032 (Group 5) is spoken "red" in the row, the swatch button and the picker (design/ui/studio/tmp/r1-dry1-recheck-color-word-crimson/walk/18.png). The folder Color button reads "... Group 5 red and 5 more". Enter, Escape, Tab and Shift+Tab on the swatches and the picker behave as before: Escape closes the picker and puts focus back on its swatch (20.png), Enter reopens it (21.png), and Escape closes the dialog with focus on the Color button (26.png). Nothing else got worse.
