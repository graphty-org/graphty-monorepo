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