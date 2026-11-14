# @graphty/gazetteer

Place names with coordinates, for looking places up offline: countries, first-level regions (states,
provinces) and cities of 15,000 people or more. Each layer is its own ES module, so you load only the
layers you use.

```sh
npm install @graphty/gazetteer
```

[graphty-element](https://www.npmjs.com/package/@graphty/graphty-element)'s location map layout uses
this package to place nodes by a column of country, region or city names. Install it next to
graphty-element and the layout finds it on its own.

## Use

```js
import { loadLayer } from "@graphty/gazetteer";

const cities = await loadLayer("city"); // or "country", "region"
const paris = cities.places.find(([name, , country]) => name === "Paris" && country === "FR");
const [, , , , latitude, longitude] = paris; // 48.8534, 2.3488
```

`loadLayer` loads a layer on first use with a dynamic `import()`, so a bundler splits each layer into
its own chunk. To import one layer statically instead:

```js
import { countries } from "@graphty/gazetteer/countries";
import { regions } from "@graphty/gazetteer/regions";
import { cities } from "@graphty/gazetteer/cities";
```

## The layers

| Layer     | Module                         | Places | Size   | Source                                        |
| --------- | ------------------------------ | ------ | ------ | --------------------------------------------- |
| `country` | `@graphty/gazetteer/countries` | 245    | 61 KB  | Natural Earth 1:10m admin 0 countries         |
| `region`  | `@graphty/gazetteer/regions`   | 4,577  | 660 KB | Natural Earth 1:10m admin 1 states, provinces |
| `city`    | `@graphty/gazetteer/cities`    | 34,179 | 5.9 MB | GeoNames cities15000                          |

Each layer is an object:

```ts
{
    format: "graphty-gazetteer",
    version: 1,
    layer: "country" | "region" | "city",
    attribution: { text: string, url: string } | null, // the credit to show while its places are shown
    source: string,   // the source files (and, for cities, the date they were read)
    license: string,
    fields: ["name", "alternates", "country", "region", "latitude", "longitude", "population"],
    places: [name, alternates, country, region, latitude, longitude, population][], // most populous first
    regions?: Record<string, string[]>, // city layer only: the names of each region key, { "US.TX": ["Texas"] }
}
```

- `alternates`: other names and codes. Countries list ISO 3166-1 alpha-3 codes and names in other
  languages; regions list postal and ISO 3166-2 codes; cities list Latin-script names only.
- `country`: the ISO 3166-1 alpha-2 code (`"FR"`).
- `region`: the GeoNames first-level region key (`"US.TX"`), or `null`. A region carries it only when
  GeoNames names that key the same way.
- `population`: 0 where the source gives none (every region).

The types are exported: `GazetteerLayerFile`, `GazetteerPlace`, `PlaceRole`, `PlaceCredit`.

## Data, license and attribution

The code is MIT licensed. The data keeps its sources' terms:

- **Countries and regions**: [Natural Earth](https://www.naturalearthdata.com/), public domain
  ([terms of use](https://www.naturalearthdata.com/about/terms-of-use/)).
- **Cities**: [GeoNames](https://www.geonames.org/), licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit "GeoNames" wherever city places
  are shown (the city layer's `attribution` says so). Changed: trimmed to each city's name, Latin-script
  other names, country, first-level region, point and population, with the names of those regions.

Every layer records its `source` and `license` in the data itself. NOTICE lists the source files.
