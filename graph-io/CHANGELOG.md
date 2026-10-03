## 0.3.18 (2026-10-03)

### 🚀 Features

- **graph-io:** keep OBO frames of an unknown type as metadata ([1fb5f317](https://github.com/graphty-org/graphty-monorepo/commit/1fb5f317))
- **graph-io:** read OBO Graphs JSON as the obographs dialect ([305c11bc](https://github.com/graphty-org/graphty-monorepo/commit/305c11bc))
- **graph-io:** read the OBO flat file format of the Gene Ontology ([3e6b0da0](https://github.com/graphty-org/graphty-monorepo/commit/3e6b0da0))

### 🩹 Fixes

- **graph-io:** keep every OBO qualifier and read quotes, comments and language tags as the guides do ([b900d96a](https://github.com/graphty-org/graphty-monorepo/commit/b900d96a))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.17 (2026-10-02)

### 🚀 Features

- **graph-io:** list the graphs of an input and choose one ([00ac9052](https://github.com/graphty-org/graphty-monorepo/commit/00ac9052))
- **graph-io:** decode zip entry names in the shared input module ([29e314fe](https://github.com/graphty-org/graphty-monorepo/commit/29e314fe))
- **graph-io:** shared issue codes for the Cytoscape and OBO importers ([83684a9f](https://github.com/graphty-org/graphty-monorepo/commit/83684a9f))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.16 (2026-10-02)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.6

## 0.3.15 (2026-10-02)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.5

## 0.3.14 (2026-10-01)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.4

## 0.3.13 (2026-10-01)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.3

## 0.3.12 (2026-09-30)

### 🚀 Features

- **graph-io:** read quoted gml flags and keep dot pos as text on request ([743aa6aa](https://github.com/graphty-org/graphty-monorepo/commit/743aa6aa))
- **graph-io:** record a gml file's directed key as written ([dc1ad686](https://github.com/graphty-org/graphty-monorepo/commit/dc1ad686))

### 🩹 Fixes

- **graphty-element:** record how dot, gml and pajek loads differ from 2.x ([b1891017](https://github.com/graphty-org/graphty-monorepo/commit/b1891017))
- **graph-io:** recognise gexf and graphml only in a document that starts as markup ([6e01ce08](https://github.com/graphty-org/graphty-monorepo/commit/6e01ce08))
- **graph-io:** recognise a dot header followed by a quoted id or a comment ([8d1d04ce](https://github.com/graphty-org/graphty-monorepo/commit/8d1d04ce))
- **graphty-element:** detect any delimited table as csv and never space-split text ([044281fd](https://github.com/graphty-org/graphty-monorepo/commit/044281fd))

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.2

### ❤️ Thank You

- Adam Powers @apowers313

## 0.3.11 (2026-09-30)

### 🧱 Updated Dependencies

- Updated graph-format to 1.2.1

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

- ⚠️ **graph-io:** decode any encoding once, and read every graph in a file ([1bb45aac](https://github.com/graphty-org/graphty-monorepo/commit/1bb45aac))

### 🩹 Fixes

- **graph-io:** exporters round-trip -0, DOT line continuations and GEXF 1.2 timestamps ([72292b6c](https://github.com/graphty-org/graphty-monorepo/commit/72292b6c))

### ⚠️ Breaking Changes

- **graph-io:** decode any encoding once, and read every graph in a file ([1bb45aac](https://github.com/graphty-org/graphty-monorepo/commit/1bb45aac))
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
