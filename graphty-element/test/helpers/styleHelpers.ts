/**
 * @file The colour, size, opacity and label helper namespace, rebuilt for the tests that cover it.
 *
 * `StyleHelpers` used to be a published namespace object whose only job was to be in scope for a
 * `calculatedStyle` expression -- `StyleHelpers.color.sequential.viridis(arguments[0])` and its
 * kind. The expression evaluator is gone, so the namespace has no caller and is no longer
 * exported from the package.
 *
 * THE FUNCTIONS THEMSELVES ARE NOT GONE. They live where they always did, in
 * `src/utils/styleHelpers/`, and the 2.0 palettes and scales read the same colour maths. This
 * file gathers them back into the shape the unit tests below `test/style-helpers/` are written
 * against, so that coverage of the maths survives the deletion of the namespace.
 *
 * MEMBER BY MEMBER RATHER THAN BY NAMESPACE, so that every function it covers is a named
 * reference: a `import * as size` would leave the dead-code check unable to see which members are
 * reached, and it would report every one of them as unused.
 */

import {
    delayedStart,
    easeIn,
    easeInCubic,
    easeInOut,
    easeInOutCubic,
    easeOut,
    easeOutBounce,
    easeOutCubic,
    easeOutElastic,
    interpolate,
    linear as animationLinear,
    pulse,
    spring,
    stagger,
    stepped as animationStepped,
    wave,
} from "../../src/utils/styleHelpers/animation";
import { blueHighlight, custom, greenSuccess, orangeWarning } from "../../src/utils/styleHelpers/color/binary";
import { carbon, okabeIto, pastel, tolMuted, tolVibrant } from "../../src/utils/styleHelpers/color/categorical";
import { blueOrange, purpleGreen, redBlue } from "../../src/utils/styleHelpers/color/diverging";
import { blues, greens, inferno, oranges, plasma, viridis } from "../../src/utils/styleHelpers/color/sequential";
import {
    categoryAndImportance,
    colorAndOpacity,
    colorAndSize,
    divergingWithSize,
    edgeFlow,
    edgeFlowFull,
    fullSpectrum,
    sizeAndOpacity,
} from "../../src/utils/styleHelpers/combined";
import {
    binary as edgeWidthBinary,
    linear as edgeWidthLinear,
    log as edgeWidthLog,
    stepped as edgeWidthStepped,
} from "../../src/utils/styleHelpers/edgeWidth";
import {
    communityLabel,
    compact,
    conditional,
    fixed,
    ifAbove,
    integer,
    levelLabel,
    percentage,
    rankLabel,
    scientific,
    scoreLabel,
    substitute,
    topN,
} from "../../src/utils/styleHelpers/label";
import {
    binary as opacityBinary,
    inverse,
    linear as opacityLinear,
    threshold,
} from "../../src/utils/styleHelpers/opacity";
import {
    bins,
    cubic,
    exp,
    fiveTiers,
    linear as sizeLinear,
    linearClipped,
    log as sizeLog,
    logSafe,
    smallMediumLarge,
    square,
} from "../../src/utils/styleHelpers/size";

/** The helper namespace, as the tests below `test/style-helpers/` address it. */
export const StyleHelpers = {
    color: {
        sequential: { viridis, plasma, inferno, blues, greens, oranges },
        categorical: { okabeIto, tolVibrant, tolMuted, carbon, pastel },
        diverging: { purpleGreen, blueOrange, redBlue },
        binary: { blueHighlight, greenSuccess, orangeWarning, custom },
    },
    size: {
        linear: sizeLinear,
        linearClipped,
        log: sizeLog,
        logSafe,
        exp,
        square,
        cubic,
        bins,
        smallMediumLarge,
        fiveTiers,
    },
    opacity: { linear: opacityLinear, threshold, binary: opacityBinary, inverse },
    label: {
        percentage,
        fixed,
        scientific,
        compact,
        integer,
        substitute,
        rankLabel,
        scoreLabel,
        communityLabel,
        levelLabel,
        ifAbove,
        topN,
        conditional,
    },
    edgeWidth: {
        linear: edgeWidthLinear,
        log: edgeWidthLog,
        binary: edgeWidthBinary,
        stepped: edgeWidthStepped,
    },
    combined: {
        colorAndSize,
        colorAndOpacity,
        sizeAndOpacity,
        fullSpectrum,
        categoryAndImportance,
        divergingWithSize,
        edgeFlow,
        edgeFlowFull,
    },
    animation: {
        linear: animationLinear,
        easeIn,
        easeOut,
        easeInOut,
        easeInCubic,
        easeOutCubic,
        easeInOutCubic,
        easeOutElastic,
        easeOutBounce,
        interpolate,
        stepped: animationStepped,
        pulse,
        wave,
        delayedStart,
        stagger,
        spring,
    },
};
