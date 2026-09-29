#!/bin/sh
# Derives the colour-by-value legend drawings from the kit's ppi-modules drawings:
# Other (Unassigned) in light grey, and a second copy where the reader picked light blue for Proteasome.
cd "$(dirname "$0")/.."
for t in light dark; do
  sed -e 's/#505050/#BDBDBD/g' \
      -e 's/aria-label="[^"]*"/aria-label="Protein interactions colored by module, Other in light gray, sized by degree, TP53 selected"/' \
      kit/canvas/ppi-modules-$t.svg > screens/img/ppi-modules-lightother-$t.svg
  sed -e 's/#505050/#BDBDBD/g' -e 's/#E69F00/#4AA3DF/g' \
      -e 's/aria-label="[^"]*"/aria-label="Protein interactions colored by module, Proteasome in a picked light blue beside Ribosome sky blue, TP53 selected"/' \
      kit/canvas/ppi-modules-$t.svg > screens/img/ppi-modules-picked-$t.svg
done
# The Louvain run's color layer after the reader recolored Community 8 from yellow to dark gold.
for t in light dark; do
  sed -e 's/#F0E442/#B8860B/g' \
      -e 's/aria-label="[^"]*"/aria-label="Proteins colored by Louvain community, Community 8 in a picked dark gold, sized by degree"/' \
      screens/img/results-panel-louvain-$t.svg > screens/img/ppi-louvain-picked-$t.svg
done
