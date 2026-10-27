# Location map prototype: what changes next

Decided 2026-10-22 by the studio director, from four reviews of build 3137c48f2f: interaction and
consistency, visual and accessibility, four user tasks, and a red team. Their screenshots are under
`tmp/location-map-prototype/review/` in the prototype worktree (`interaction-consistency/`,
`visual-a11y/`, `personas/`, `red-team/`).

Every item keeps the architecture rules: map code that knows nothing about graphs goes in
babylonjs-map; anything about nodes, edges, layouts or the camera goes in graphty-element, which
returns `{ code, params }` and never English; the graphty app writes the words and arranges the
controls, using default Mantine and compact-mantine components. Every new name below is a prototype
name and is open until the owner rules (see the last section).

Items are in fix order: things that tell the reader something false come first, then lost data,
then legibility, then polish.

## Do now

### 1. Map that cannot run says why, before and after Apply

- **What:**
    - Before Apply, the layout list greys out Map with a reason when the graph has no location data,
      the same way "Needs groups" works for the grouping layouts.
    - When a run fails anyway, nothing changes: the previous layout stays ticked, the form never says
      "Applied", and the refusal is shown inside the Map form.
- **Why:** On a graph with no location data, or one whose location column was not recognized, Map
  did nothing, showed no message, ticked Map and said "Applied". Three reviews found this, and the
  red team rated it severity 1. It breaks two studio rules: "a problem is one block" and "disabled
  is explained".
- **Owner:**
    - graphty-element:
        - Publish the refusal in the layout's cost estimate, as a new code `layout.needs-location` whose
          params name the columns it saw. The grouping layouts publish `layout.needs-grouping` the same
          way.
        - `LocationMapLayoutEngine.compute` throws no English: an unknown column and the empty bounds
          that `createMapFrame` rejects (every point beyond 85.05 degrees) both become this code.
        - A failed run does not become the active layout, and `inEffect("basemap")` stays false until
          a geographic frame is published.
    - graphty: words for the code in `refusalWords.ts` ("No location columns"); a failed run shows
      the refusal in the form.
- **Done when:** a real-input test in the app opens Florentine families and finds Map disabled
  with its reason; a second test opens a file whose only location column is not recognized,
  applies Map, and finds Force still ticked, the refusal shown, and no "Applied".

### 2. A wrong or half-filled column choice gets feedback

- **What:**
    - When only one of Latitude and Longitude is set, the element fills the other half from
      detection and reports that it did. When detection finds nothing to fill it with, the element
      refuses with `layout.needs-location`, naming the missing half.
    - Every location warning has words, shown under the Latitude and Longitude fields:
      `W_LOCATION_UNPARSED`, `W_LOCATION_OUT_OF_RANGE`, `W_LOCATION_AMBIGUOUS` and
      `W_LOCATION_SWAPPED`.
- **Why:** Setting only Latitude was silently ignored. Pointing Latitude at population put all 49
  nodes in an unlabeled tray under Antarctica, with no notice.
- **Owner:**
    - graphty-element: the `#source()` handling of a half-filled pair.
    - graphty: words for every location warning code in `layoutWarningWords`.
- **Done when:**
    - Applying with only Latitude set places the nodes and shows which column filled Longitude.
    - Latitude set to population shows the out-of-range words under the field.

### 3. Detection accepts a partly readable column, and stops reading ids as geohashes

- **What:**
    - When no column is named like latitude or longitude, auto-detection takes the best column that
      parses at least half its values, and reports the rest with `W_LOCATION_UNPARSED`.
    - Geohash is only auto-detected when values have one length of at least 5 characters and
      contain letters.
- **Why:** The suppliers file had 7 of 10 values readable and was refused outright, because
  detection required 90%. In the other direction, ZIP codes read as 100% geohash and ordinary words
  as 80%, so lowering the bar without tightening geohash would scatter non-location columns over
  the world.
- **Owner:** babylonjs-map (`detectLocationFormat` and the geohash rule); graphty-element (the
  threshold for a column picked by detection).
- **Done when:** unit tests in babylonjs-map cover ZIP codes, short words and real geohashes; a
  graphty-element test opens a suppliers-style file and gets 7 placed nodes plus an unparsed
  warning.

### 4. Values in a mixed column, and text in number columns, are read

- **What:**
    - A value the column's chosen format rejects is tried against the formats whose syntax cannot be
      mistaken for anything else: decimal pair, degrees-minutes-seconds, WKT, GeoJSON and ISO 6709.
      Geohash is never tried per value.
    - `latLonFromColumns` accepts a hemisphere letter before or after the number, and a decimal
      comma when the value holds no other comma.
- **Why:** In a column mixing formats, every row in a less common format was dropped. "51.5074 N"
  and "48,8566" left nodes unplaced. Detecting the format per column was decided to avoid reading
  geohash-like ids one value at a time; leaving geohash out of the per-value retry keeps that
  reason intact.
- **Owner:** babylonjs-map.
- **Done when:** unit tests read the red team's `mixed.graphml` values and the text-column values
  in `data/textcols.graphml`.

### 5. Longitude-first pairs are flagged

- **What:** `detectLocationFormat` reports `lon-lat` as an alternative whenever it reads as many
  values as `decimal`. graphty-element emits `W_LOCATION_AMBIGUOUS`. The app's words for it point
  at Format under Advanced, which already offers longitude-first.
- **Why:** European capitals written longitude first landed around Somalia, with no warning. The
  design promised this warning for exactly this case.
- **Owner:** babylonjs-map, graphty-element, graphty.
- **Done when:** the red team's `lonlat-europe.graphml` shows the ambiguity notice; choosing
  longitude-first under Format places Paris in France.

### 6. Data across the 180-degree line stays together

- **What:**
    - `boundsOf` finds the largest gap between longitudes and returns a box that may wrap past 180
      degrees.
    - The layout shifts longitudes by 360 degrees into that box before projecting.
- **Why:** Fiji, Samoa and Tonga sat on opposite edges of a world map, and an 800 km edge crossed
  the whole map. The design already specified the gap rule.
- **Owner:** babylonjs-map (`boundsOf`); graphty-element (the shift).
- **Done when:** a unit test frames the red team's `pacific.graphml` in a box narrower than 60
  degrees; a browser test draws the Suva to Apia edge shorter than a tenth of the map's width.

### 7. Points beyond Web Mercator's reach are not moved silently

- **What:** On a flat Web Mercator map, a point beyond +/-85.05 degrees goes to the tray and is
  counted in `W_LOCATION_OUT_OF_RANGE`. The automatic projection stays Web Mercator, so it still
  matches the tiles.
- **Why:** The North and South Poles were drawn on the map's top and bottom edges with no word.
- **Owner:** graphty-element.
- **Done when:** `polar.graphml` puts the polar nodes in the tray and shows the out-of-range
  notice.

### 8. Unplaced nodes are countable, findable and labeled once

- **What:**
    - graphty-element publishes the results the design promised: `results.location-map.lat`,
      `results.location-map.lon` and `results.location-map.status`.
    - The warning carries one total of unplaced nodes, out-of-range ones included.
    - A layout's warnings are not emitted while the data is being replaced, and the app ignores a
      warning from a layout that is no longer active.
    - In the tray, an edge with an unplaced end takes the straight route, and the tray is one row.
- **App's part:**
    - The notice names its whole ("6 of 14 nodes unplaced").
    - The notice has one Select action, which selects the nodes it counts.
    - The notice appears once for each change of data or settings. A 2D/3D switch or reopening a
      project does not repeat it.
- **Why:** The notice said 5 when 6 nodes were in the tray. It came back on every view switch. It
  carried over into the next project. Nothing could find the unplaced nodes. Their edges made a
  tangle of arcs over the tray. A count that stands for nodes must be able to select them (studio
  criterion).
- **Owner:** graphty-element, graphty.
- **Done when:**
    - A real-input test on mixed data clicks Select and gets exactly the tray's nodes selected.
    - Switching 2D and 3D shows no second notice.
    - New project and load shows no notice from the old project.

### 9. Undo of a map layout restores the map

- **What:** Restoring a layout through history publishes the geographic frame again: the basemap,
  the edge routes and the camera facing. "Applied" is true only while the frame the form describes
  is drawn.
- **Why:** Ctrl+Z after a second Apply removed the map and the arcs, left Map ticked, and greyed
  out Apply, so the reader could not recover.
- **Owner:** graphty-element.
- **Done when:** a real-input test applies Map twice with different settings, presses Ctrl+Z, and
  finds the map drawn and the form's state matching the first settings.

### 10. The camera always faces the map and frames all of it

- **What:**
    - Every run that publishes a frame sets the camera facing, and it frames the map, the tray and
      the view insets the app already passes through `setViewInsets`.
    - On the globe:
        - Fit frames the whole sphere and centers the globe itself.
        - World data opens facing the data's center longitude at the equator, north up.
        - The zoom floor is the globe's radius times 1.02, for the wheel and for pinch.
    - While a geographic frame is active, the preset views follow its facing:
        - Top looks straight down on the map.
        - Side is a low view from the south.
        - Isometric is an oblique view from the front.
- **Why:**
    - Applying Map after moving the camera showed the map from behind.
    - After Apply, the map ran under the right panel.
    - On the globe:
        - Fit overflowed the canvas.
        - World data opened looking at the Arctic, off center.
        - Five wheel notches went inside the globe and showed a mirrored world.
    - Top and Side showed a flat map edge-on, and Isometric showed it from behind.
- **Decided here, not for the owner:** the preset views change only while a map layout is active,
  which is a state that does not exist outside this prototype. Nothing existing changes. This
  settles the open Isometric item.
- **Owner:** graphty-element.
- **Done when:** real-input tests:
    - Orbit to the back, apply Map, and the map's front faces the camera.
    - Wheel 20 notches toward the globe, and the camera stays outside it.
    - Pick Top, Side and Isometric on a flat map, and each shows the map's face.

### 11. Tiles load to one level and recover from failures

- **What:**
    - Choose the tile level from the size of a texel on screen.
    - Request children that never arrive again; drop a parent once its children cover it.
    - Never leave a scaled parent beside loaded siblings once loading settles.
    - Load the ring of tiles at a clipped edge at the same level.
    - Never mix levels more than one apart in one area of the screen.
    - Retry failed tiles with a backoff, and again when the browser comes back online.
    - Keep the base layer's texture across `setSources`.
    - Fill the poles from the tile source's own coarsest tile. Use the bundled image there only when
      the bundled image is the chosen map.
- **Why:**
    - Huge "Los Angeles" and "Piombino Dese" labels sat beside small ones, with stray glyphs at the
      edge.
    - A hard band showed where detail changed on the globe.
    - A pale blue disk sat at the pole on satellite imagery.
    - After a network drop the map was blank, with not even the bundled image.
- **Owner:** babylonjs-map.
- **Done when:**
    - babylonjs-map's tests drive the tile scheduler with a fake loader that drops and delays tiles,
      and assert that no parent is drawn beside loaded siblings, that failed tiles are retried, and
      that the base texture survives `setSources`.
    - A screenshot of Venice on OpenStreetMap shows one label size.

### 12. The element reports the basemap's state, and the credits name only what is drawn

- **What:**
    - Emit the `basemap-status` event and `E_BASEMAP_UNREACHABLE` with `{ source, status }`, and set
      `basemapStatus` to `fallback` when tiles fail.
    - The credit lists only the sources that actually drew a tile. This also fixes the known Natural
      Earth credit shown over a tile service.
    - Each provider's credit is a link.
    - The credit stays on one line; when it does not fit, it collapses to a "(c)" button that opens
      the full credit.
    - A new option sets a bottom offset for the credit, so it can sit above a consumer's floating
      controls.
- **App's part:**
    - Show the error beside the Address field of a custom source.
    - Announce changes of `basemapStatus` once, politely: the map is shown, and when it falls back.
    - Set the credit offset to the toolbar's height.
- **Why:**
    - A bad custom address looked like a working map while credits named "Bad Tiles Co".
    - At iPad portrait width the credit wrapped under the toolbar, and only "N", "co" and "BY-SA)"
      could be seen. The licenses require the credit to be visible.
    - OpenStreetMap asks for a link to its copyright page on interactive maps.
- **Owner:** graphty-element, graphty.
- **Done when:**
    - A browser test with an unreachable address gets the event and the fallback state, and the
      credit no longer names the bad source.
    - At 820 x 1180 the credit or its button can be seen in full.
    - The OpenStreetMap credit is a link.

### 13. The map continues past the data

- **What:**
    - For tile services, `basemap.beyond` defaults to `"continue"`; the bundled image shows the whole
      world.
    - Fit with Data frames the camera on the data. It never crops the picture.
- **Why:** Gray bands appeared above and below the map, place names were cut ("BERM"), and panning
  or pinching ran off the picture. Three reviews found this.
- **Owner:** babylonjs-map (drawing beyond the extent), graphty-element (the default).
- **Done when:** after panning half a screen away from Contiguous USA on OpenStreetMap, the map
  covers the whole canvas.

### 14. Surface is not offered where it does nothing

- **What:**
    - graphty-element reports that `surface` is not in effect in the 2D view, as a coded fact. The
      graph settings already report `setting.needsMapLayout` this way.
    - The app shows Surface disabled in 2D, with its reason.
- **Why:** In 2D, choosing Globe and Apply changed nothing, and Shape 2D sat beside Surface Globe
  with no word.
- **Owner:** graphty-element, graphty.
- **Done when:** a real-input test in 2D finds Surface disabled with a reason in its tooltip.

### 15. Say which columns "Automatic" used, and order the lists by fit

- **What:**
    - After a run, graphty-element publishes the location source it resolved: the kind, the latitude
      and longitude columns or the location column, and the format.
    - It also publishes, for each column, whether that column fits as latitude, longitude or
      location, with a refusal code when it does not.
- **App's part:**
    - An empty field reads "Automatic (latitude)", naming the column used.
    - The lists show fitting columns first and the others disabled with the element's reason. This
      is the studio's existing field-picker rule.
    - Latitude and Longitude share one row, as X and Y do in Figma, and Location sits apart from
      them.
- **Why:**
    - All four reviews saw "Automatic" never say what was chosen, while the Weight line names its
      column.
    - The Latitude list offered id and label with the same weight as latitude.
- **Owner:** graphty-element, graphty.
- **Done when:**
    - On Contiguous USA after Apply, the fields read "Automatic (latitude)" and "Automatic
      (longitude)".
    - The Latitude list shows latitude before id, with id disabled and given a reason.

### 16. Map settings have one home, and nothing is called "Map" three times

- **What:**
    - Superseded by the owner on 2026-10-22: the map is the Map layout's own option (`map`), chosen
      in the Map layout form, not in Graph settings, because a map means nothing without the map
      layout. The form's select is labeled "Map"; on the applied map it swaps the picture at once,
      with no node moved.
- **Why:**
    - Three reviews found the map's settings split across two places.
    - A screen reader heard group "Map", heading "Map" and combobox "Map".
    - Studio rule: no two reachable controls share an accessible name.
- **Owner:** graphty.
- **Done when:** the inspector's accessibility tree shows the select named "Source"; a real-input
  test clicks the row in the layout form and lands focus on that select.

### 17. Nodes and edges stand off any map

- **What:**
    - While a basemap is drawn, edges and arcs get a thin light casing and nodes get a 1 to 1.5 px
      light outline, through a basemap option `casing` that is on by default.
    - While a geographic frame is active, nodes are drawn after edges, so an arc passing above a hub
      never hides it.
    - Find out why an Outline width of 1 draws nothing visible on the map, and fix it.
- **Why:** The default gray edge measured 1.51:1 against Natural Earth's land, and the default
  indigo node about 1.2:1 against its ocean. WCAG 1.4.11 asks 3:1. On OpenFlights in 3D the arcs
  hid the busiest airports, which was the answer to the task.
- **Owner:** graphty-element.
- **Done when:** sampled pixels at a node's edge and along an edge reach 3:1 against Natural Earth
  ocean and land; on OpenFlights in 3D after Degree, the top 5 hubs are visible.

### 18. Node size means the same on any map and any surface

- **What:**
    - Build the planned layout option `nodeScale: "screen"`. The default stays `"scene"`, so no
      consumer's drawing changes unasked.
    - The app offers it under Map > Advanced.
    - On the globe, set the globe's size so the data's extent fills the same share of the view as
      on the flat map.
- **Why:**
    - Venice's 1,874 nodes became one solid ball on the globe and covered the streets on the flat
      map.
    - Contiguous USA nodes were about 60 px on the globe against 16 px flat.
    - Only a Size of 0.2, found in another panel, made the network readable.
- **Owner:** graphty-element, graphty.
- **Done when:**
    - Venice with `nodeScale: "screen"` keeps node pixel size within 10% across 5 zoom steps.
    - Contiguous USA nodes measure within 20% of each other on the flat map and on the globe.

### 19. Pointer gestures on a map behave like a map

- **What:**
    - In 2D, a drag on empty canvas pans whether or not something is selected, in every layout.
    - While a geographic frame is active, wheel zoom centers on the pointer.
    - Dragging the globe keeps the grabbed point under the pointer, using a ray-to-sphere helper in
      babylonjs-map.
- **Why:**
    - With Nebraska selected, a drag did nothing.
    - Chicago drifted 45 px under the pointer while zooming.
    - A 400 px drag spun the globe about 130 degrees.
- **Decided here:** pointer-centered zoom changes nothing outside a map frame, so no existing
  default moves. Whether every layout should zoom this way is backlog.
- **Owner:** graphty-element, babylonjs-map.
- **Done when:** real-input tests check each of the three gestures on the map, plus a drag with a
  selection held on Force.

### 20. Camera glides respect reduced motion

- **What:**
    - graphty-element adds a camera transition time option.
    - The app sets it to 0 when the reader prefers reduced motion, as `HeroGraph` already checks.
- **Why:** With `prefers-reduced-motion: reduce`, Fit still glided over about 500 ms. The map makes
  these glides long ones: flat to globe, and Fit across the world.
- **Owner:** graphty-element, graphty.
- **Done when:** with reduced motion emulated, Fit draws one frame of change.

### 21. Map is recommended for data with locations

- **What:** The layout recommendation gains a code for `location-map` when location columns are
  detected. The app's existing Recommended tag then shows on Map.
- **Why:** Force stayed "Recommended" on OpenFlights, Venice and Contiguous USA, and Map sat below
  the fold of the list.
- **Owner:** graphty-element (a new `recommend.*` code), graphty (its words).
- **Done when:** on Contiguous USA the Layout list tags Map Recommended.

### 22. A plain gray backdrop

- **What:** Add a keyless gray source made by desaturating the bundled Natural Earth image in the
  material. No new image file.
- **Why:** Relief and satellite maps competed with node colors on dense data. OpenStreetMap's place
  names sat under nodes. The design lists `light` as a kind of map, and none was offered.
- **Owner:** babylonjs-map (the source and the material), graphty-element (the catalog entry).
- **Done when:** the Map source list has the gray entry, and it draws with no network request.

### 23. Smaller fixes

- **Advanced popover:** Escape closes only the popover, innermost first, and the gear gets the
  tooltip "Advanced". Owner: graphty (OptionsForm). Done when a real-input test opens Advanced,
  presses Escape once, and is still in the Map form.
- **One-point data:** when every node is at one point, the minimum extent is 1 degree across,
  instead of 1 km. Owner: babylonjs-map. Done when `onepoint.graphml` shows Paris in its region.
- **Venice sample card:** stronger node and edge contrast in `venice-transit.webp`. Only the image
  changes, because the Samples dialog is owner-approved. Owner: graph-samples. Done when the
  card's nodes measure at least 3:1 against its background.

## Rejected or deferred

- **Clicking a node should not move the map.** Rejected: the owner decided on 2026-10-20 that the
  camera glides to a picked node (graphty-element's `camera.pivotOnSelection`), and the map follows
  the same rule as every layout.
- **One combined Location picker listing detected pairs.** Rejected for now: it would bring a new
  kind of option entry (a pair of columns) into the generic options form. Items 2, 3 and 15 remove
  the failures it was proposed for. Revisit if walks still show confusion.
- **Location, Latitude and Longitude as column roles in the open dialog.** Rejected: weight, the
  model for designating a column for a role, is chosen in the form that uses it, not at import. A
  second place to set the same thing breaks "one home per feature".
- **Show an option with three or fewer values as a segmented switch.** Deferred to the tier 3
  backlog: it changes every layout and algorithm form, which are approved tier 3 surfaces, and is
  not a map defect.
- **Collapse a side panel below about 1,000 px wide.** Deferred to the backlog: a change to the
  approved app shell for every layout, not a map defect.
- **Point the reader to a street map when the data covers a city.** Rejected: it adds a suggestion
  concept the product does not have. The frame's extent is already readable, and item 18 fixes the
  legibility problem behind it.
- **A unit or a slider for Size.** Rejected: Size is in scene units, which have no unit a reader
  knows, and it sits behind Advanced. Item 18's `nodeScale` is the control readers need.
- **Fade between tile levels.** Deferred: item 11 removes the band; a fade is polish for later.

## Open for the owner (one-way doors)

Each is a public name or a default that saved projects or consumers will depend on. The prototype
uses the proposed name. Nothing here is published yet.

1. From the design (section 15.1), still open:
    - the layout id `location-map`
    - the shape of the layout's `map` option (where the map is set is decided: the layout option
      `map`, 2026-10-22)
    - the option names
    - the named source ids
    - the bundled Natural Earth image as the default map
    - where the gazetteer is hosted
    - the public API of babylonjs-map
2. Added by these decisions:
    - the refusal code `layout.needs-location`
    - the new `recommend.*` code
    - the result fields `results.location-map.lat`, `.lon` and `.status`
    - the published resolved source and the per-column fit facts, with their shapes
    - the layout option `nodeScale` with values `"scene"` and `"screen"`
    - the basemap options `beyond` (default `"continue"` for tile services) and `casing` (default
      on)
    - the credit's bottom-offset option
    - the camera transition time option
    - the `basemap-status` event and `E_BASEMAP_UNREACHABLE`
    - the gray source's id
3. Two defaults to confirm: casing on by default (item 17), and the map continuing past the data
   by default (item 13). Both are legibility and licensing needs that any map consumer would have.
   But they are defaults, and the owner rules on defaults.
