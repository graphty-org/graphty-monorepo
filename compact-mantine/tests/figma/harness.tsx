/**
 * The names design/figma-spec.md section 13 gives the harness, for each package's
 * `tests/figma/<package>.browser.test.tsx`. The implementation lives in tests/harness/.
 */
export type { FigmaElement } from "../harness/figma";
export { figmaAvailable, figmaCapture, figmaElement, figmaSpec } from "../harness/figma";
export type { DriveState, MeasureSpec } from "../harness/measure";
export {
    computed,
    drive,
    expectMeasured,
    hex,
    measure,
    normalize,
    part,
    renderThemed as renderFigma,
    resetHarness,
} from "../harness/measure";
