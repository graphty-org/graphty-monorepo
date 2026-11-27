# Data for the round 6 data clips (clips/r6-3-data)

- `les-miserables-links-messy.csv`: `../les-miserables-links.csv` (made from the app's Les Miserables
  sample by `../make-data.mjs`) with `shared_chapters` set to `n/a` on three rows (lines 20, 77 and
  150), so the app finds 3 values that are not numbers. Made with awk; nothing else changed.
- `europe-borders.json`: 27 European countries and 45 land borders between them, written by hand
  from common knowledge. Each node has an id (C01 ...) and a `country` name, and no coordinates: the
  map places them by name alone.
