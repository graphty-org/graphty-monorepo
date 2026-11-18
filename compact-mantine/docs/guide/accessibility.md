# Accessibility

The library targets WCAG 2.2 AA, and the work is done for you rather than left
as a set of props you must remember:

- **Every control is a real control.** Fields are inputs, toggles are checkboxes
  or switches, segmented options are radios, the advanced button is a button, so
  keyboard behavior, focus order and disabled semantics come from the platform.
- **Keyboard focus is always visible**, and pointer focus is not, so a dense
  surface stays quiet under the mouse without giving up the focus indicator.
- **Exact Figma by default, AA on request.** Figma's own contrast falls short
  of AA in a few places (secondary text, field and checkbox edges); pass
  `createCompactTheme({ highContrast: true })` to raise exactly those. See
  [the WCAG AA option](./theme#createcompacttheme-and-the-wcag-aa-option).
- **Accessibility kept beyond Figma.** Tooltips stay linked with
  `aria-describedby`; the toolbar, the rail and the shortcuts sheet are real
  toolbars and tab lists with arrow-key movement; the quick actions palette is a
  named dialog with a combobox and a list box; the shortcuts sheet closes with
  Escape.
- **State is announced, not only drawn.** Expanded, checked, selected, disabled,
  busy and current are all exposed as ARIA in addition to color.
- **Charts are one named image with a hidden table behind them**, so a screen
  reader announces the chart and can then read every value, rather than
  announcing a run of anonymous bars. Give every chart a `label`.
- **Results that arrive late are announced.** Give a row `busy` and it becomes a
  polite live region; while `busy` is true the announcement is held back, so the
  reader hears the finished result once rather than every frame of it. A row
  that is never given `busy` stays silent, because most rows hold a value the
  reader set themselves.
- **Hover-revealed controls also appear on focus**, stay in the document, and
  stay in the tab order.
- **Color is never the only signal.** An advanced button whose settings have
  changed says so in its accessible name; a section with non-default values does
  the same.

Storybook runs axe-core against every story, so a regression shows up in the
Accessibility panel before it is published.
