## 0.8.1 (2026-09-24)

### 🩹 Fixes

- **graphty-element:** install only the dependencies the published build imports ([ddebbcfb](https://github.com/graphty-org/graphty-monorepo/commit/ddebbcfb))

### 🧱 Updated Dependencies

- Updated compact-mantine to 0.8.4
- Updated graphty-element to 2.0.1

### ❤️ Thank You

- Adam Powers @apowers313

## 0.8.0 (2026-09-24)

### 🚀 Features

- **graphty-element:** load-time algorithms can carry run options ([f75d710f](https://github.com/graphty-org/graphty-monorepo/commit/f75d710f))
- **graphty-element:** an eigenvector run that does not converge fails with E_NOT_CONVERGED ([47b116ac](https://github.com/graphty-org/graphty-monorepo/commit/47b116ac))
- **graphty-element:** overflow policy for groups, and size by a run's metric ([#505050](https://github.com/graphty-org/graphty-monorepo/issues/505050))
- **graphty-element:** publish CHANNEL_DESCRIPTORS so the app stops copying it ([1ee1170d](https://github.com/graphty-org/graphty-monorepo/commit/1ee1170d))
- ⚠️  **graphty:** drive the app through the v2 channel api ([8b872f9c](https://github.com/graphty-org/graphty-monorepo/commit/8b872f9c))
- ⚠️  **graphty:** consume the element's API instead of working around it ([d91d0247](https://github.com/graphty-org/graphty-monorepo/commit/d91d0247))

### 🩹 Fixes

- **graphty-element:** a second registration of the tag warns instead of throwing ([2150334d](https://github.com/graphty-org/graphty-monorepo/commit/2150334d))
- **graphty-element:** each module imports the Babylon augmentations it calls ([c4340504](https://github.com/graphty-org/graphty-monorepo/commit/c4340504))
- **graphty:** the app story defines graphty-element, so its canvas draws ([24986d67](https://github.com/graphty-org/graphty-monorepo/commit/24986d67))
- **graphty-element:** colour the nodes of flow and matching runs, and size encodings ([0d21967b](https://github.com/graphty-org/graphty-monorepo/commit/0d21967b))

### ⚠️  Breaking Changes

- **graphty:** drive the app through the v2 channel api  ([8b872f9c](https://github.com/graphty-org/graphty-monorepo/commit/8b872f9c))
  the app now requires a graphty-element that publishes the v2
  style-channel API.
- **graphty:** consume the element's API instead of working around it  ([d91d0247](https://github.com/graphty-org/graphty-monorepo/commit/d91d0247))
  an unmeasured node is drawn in the element's missing-data colour rather than the
  first anchor of the ramp, which is the same colour a genuine low score would have had.

### 🧱 Updated Dependencies

- Updated compact-mantine to 0.8.3
- Updated graphty-element to 2.0.0

### ❤️ Thank You

- Adam Powers @apowers313

## 0.7.5 (2026-09-23)

### 🧱 Updated Dependencies

- Updated graphty-element to 1.10.5

## 0.7.4 (2026-09-21)

### 🧱 Updated Dependencies

- Updated compact-mantine to 0.8.2
- Updated graphty-element to 1.10.4

## 0.7.3 (2026-09-20)

### 🧱 Updated Dependencies

- Updated graphty-element to 1.10.3

## 0.7.2 (2026-09-20)

### 🧱 Updated Dependencies

- Updated compact-mantine to 0.8.1
- Updated graphty-element to 1.10.2

## 0.7.1 (2026-09-20)

### 🧱 Updated Dependencies

- Updated graphty-element to 1.10.1