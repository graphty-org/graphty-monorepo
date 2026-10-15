# Fonts

The logo files need no font: every letter in them is an outline. A font is needed only to set new
text in the brand's type, such as a slide title or a poster.

## Outfit (the wordmark)

- **Where to get it:** [Google Fonts](https://fonts.google.com/specimen/Outfit), or the source
  repository [Outfitio/Outfit-Fonts](https://github.com/Outfitio/Outfit-Fonts).
- **Used for:** the word "graphty" at weight 500 with stylistic set 1 (`ss01`) switched on, and
  package names in child-brand lockups at weight 400 with no stylistic set.
- **License:** SIL Open Font License 1.1, copyright 2021 The Outfit Project Authors. It may be used,
  embedded in documents and apps, and redistributed with software, but not sold on its own. The
  license text ships with the font.

In CSS:

```css
font-family: "Outfit", sans-serif;
font-weight: 500;
font-feature-settings: "ss01" 1;
```

## Inter (text in the app and documentation)

Body and interface text uses Inter, the graphty app's UI font, falling back to the system UI font.
It is available from [Google Fonts](https://fonts.google.com/specimen/Inter) under the SIL Open Font
License 1.1.
