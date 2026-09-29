## 0.3.10 (2026-09-29)

### 🚀 Features

- **graph-io:** keep open GEXF spell bounds and the defaultedgetype the file wrote ([8a4a34d8](https://github.com/graphty-org/graphty-monorepo/commit/8a4a34d8))
- **graph-io:** read json node and edge arrays through dotted paths ([d9870e67](https://github.com/graphty-org/graphty-monorepo/commit/d9870e67))
- **graph-io:** read and write csv adjacency tables and number node rows without ids ([9ac6f760](https://github.com/graphty-org/graphty-monorepo/commit/9ac6f760))
- **graph-io:** read yfiles graphics into columns and key name and type ([1ad6ecb5](https://github.com/graphty-org/graphty-monorepo/commit/1ad6ecb5))
- **graph-io:** keep string gml node ids with one warning ([21cf0082](https://github.com/graphty-org/graphty-monorepo/commit/21cf0082))

### 🩹 Fixes

- **graph-io:** read gexf edge type keywords in any case ([0c7be1e1](https://github.com/graphty-org/graphty-monorepo/commit/0c7be1e1))
- **graph-io:** read a graphml key id declared once for each kind of element ([7c7307cd](https://github.com/graphty-org/graphty-monorepo/commit/7c7307cd))
- **graph-io:** keep csv quote errors fatal and scope rowNumberIds to the node table ([d9a6b1dc](https://github.com/graphty-org/graphty-monorepo/commit/d9a6b1dc))
- **graph-io:** check yfiles graphics against every tree and document gaps ([77534e52](https://github.com/graphty-org/graphty-monorepo/commit/77534e52))
- **graph-io:** make csv adjacency exports re-import and json edge paths read every dialect ([7bb78f9b](https://github.com/graphty-org/graphty-monorepo/commit/7bb78f9b))
- **graph-io:** report edited yfiles graphics columns as an export loss ([89c9cc5d](https://github.com/graphty-org/graphty-monorepo/commit/89c9cc5d))
- **graph-io:** resolve gml endpoints by the id rule under every nodeIdFrom ([5c2b1d39](https://github.com/graphty-org/graphty-monorepo/commit/5c2b1d39))

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.9 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.2

## 0.3.8 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.1

## 0.3.7 (2026-09-28)

### 🧱 Updated Dependencies

- Updated graph-format to 1.1.0

## 0.3.6 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.7

## 0.3.5 (2026-09-27)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.6

## 0.3.4 (2026-09-26)

### 🩹 Fixes

- **graph-io:** neo4j import keeps nodes from different id spaces apart ([#305](https://github.com/graphty-org/graphty-monorepo/issues/305))
- **graph-io:** pajek import reads partitions, vectors, two-mode matrices and more forms ([#103](https://github.com/graphty-org/graphty-monorepo/issues/103), [#104](https://github.com/graphty-org/graphty-monorepo/issues/104), [#105](https://github.com/graphty-org/graphty-monorepo/issues/105), [#106](https://github.com/graphty-org/graphty-monorepo/issues/106))
- **graph-io:** json import reads NaN, big ids, and networkx adjacency and tree data ([#66](https://github.com/graphty-org/graphty-monorepo/issues/66), [#67](https://github.com/graphty-org/graphty-monorepo/issues/67), [#68](https://github.com/graphty-org/graphty-monorepo/issues/68))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.3 (2026-09-26)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.5

## 0.3.2 (2026-09-25)

### 🩹 Fixes

- **graph-io:** importers report what they drop instead of losing it silently ([#62](https://github.com/graphty-org/graphty-monorepo/issues/62), [#63](https://github.com/graphty-org/graphty-monorepo/issues/63), [#64](https://github.com/graphty-org/graphty-monorepo/issues/64), [#65](https://github.com/graphty-org/graphty-monorepo/issues/65))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.1 (2026-09-24)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.4

## 0.3.0 (2026-09-24)

### 🚀 Features

- ⚠️  **graph-io:** decode any encoding once, and read every graph in a file ([1bb45aac](https://github.com/graphty-org/graphty-monorepo/commit/1bb45aac))

### 🩹 Fixes

- **graph-io:** exporters round-trip -0, DOT line continuations and GEXF 1.2 timestamps ([72292b6c](https://github.com/graphty-org/graphty-monorepo/commit/72292b6c))

### ⚠️  Breaking Changes

- **graph-io:** decode any encoding once, and read every graph in a file  ([1bb45aac](https://github.com/graphty-org/graphty-monorepo/commit/1bb45aac))
  GML_ISSUE.SECOND_GRAPH is now MULTIPLE_GRAPHS and
  PAJEK_ISSUE.MULTIPLE_NETWORKS is now MULTIPLE_GRAPHS; both carry the new
  W_MULTIPLE_GRAPHS warning code, since a second graph is no longer an error.

### ❤️ Thank You

- Adam Powers @apowers313

## 0.2.5 (2026-09-24)

### 🩹 Fixes

- **deps:** stop publishing build caches and test configuration ([b7537fef](https://github.com/graphty-org/graphty-monorepo/commit/b7537fef))

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.3

### ❤️ Thank You

- Adam Powers @apowers313

## 0.2.4 (2026-09-21)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.2

## 0.2.3 (2026-09-20)

### 🧱 Updated Dependencies

- Updated graph-format to 1.0.1