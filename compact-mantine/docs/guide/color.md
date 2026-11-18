# Colors and CompactColorInput

[Overview](https://graphty.app/storybook/compact-mantine/?path=/docs/components-color-overview--docs)

| Component                                                                                                                 | Reach for it when                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`CompactColorInput`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-color-compactcolorinput--docs) | a color and its opacity, on one 24px line, with Figma's picker in a pop-out. Needs a [`PopoutManager`](./popouts).                                               |
| [`ColorPickerPanel`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-color-colorpickerpanel--docs)   | you want Figma's picker itself on a surface of your own: paint type, saturation field, hue and alpha, eyedropper, swatches.                                      |
| [`GradientEditor`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-color-gradienteditor--docs)       | a multi-stop linear gradient: a bar with stop handles, one picker for the selected stop, positions and angle. Alone, or in `ColorPickerPanel`'s `gradient` slot. |
| [`RampRow`](https://graphty.app/storybook/compact-mantine/?path=/docs/components-color-ramprow--docs)                     | a range is better drawn than described: a size wedge or a color ramp with its two endpoints.                                                                     |

## A color field

`CompactColorInput` is a color and its opacity on one line. Leave `color` and `opacity`
`undefined` while the reader has chosen nothing, and the field shows `defaultColor` and
`defaultOpacity`; each change arrives through `onColorChange` and `onOpacityChange`. The picker
opens in a pop-out, so the field must be inside a [`PopoutManager`](./popouts).

<<< ../examples/color-input.tsx

## The palettes and the color tokens

Every color the components paint is a `--cm-*` CSS custom property that follows the light and
dark scheme, listed by role in [`PANEL_INK`](./panel-grid). The Mantine palettes behind the theme
are exported for a theme of your own: `compactColors` holds every color the theme sets, built
from `compactDarkColors` (Mantine's `dark` ramp pointed at Figma's neutral grays),
`compactBrandColors` (the default accent, Figma's blue) and `compactGraphtyColors` (the graphty
accent, see [the theme](./theme#the-graphty-accent)). `SWATCH_COLORS_HEXA` is the row of swatches the picker offers.

The helpers that read and write `#RRGGBBAA` colors (`parseHexaColor`, `toHexaColor`,
`opacityToAlphaHex`, `mixHex`, `colorWord` and the rest) are listed in
[Hooks, helpers and constants](./helpers).
