/**
 * @file The cost model: what a run would take, and what happens when that is too much.
 *
 * Two things live here. {@link estimateCost} answers "how long would this take?" synchronously,
 * because a user interface has to decide how a button behaves before the click happens and a
 * promise cannot gate a click. {@link gateRun} turns that answer into a decision -- run it
 * exactly, switch to the approximate method and say so, or refuse with a code a consumer
 * switches on rather than a string it has to invent.
 *
 * Both are the element's job rather than the consumer's, and the evidence is on the record: the
 * one consumer carries 449 lines modelling this package's internals, and its own history says
 * the model was wrong by 6.9x at 200,000 nodes, so a graph it estimated at 2.10 seconds locked
 * the frame for 10.4.
 */

export {
    calibrateCost,
    calibrateOnce,
    CostMeasurementLog,
    currentCalibration,
    machineFingerprint,
    resetCalibration,
} from "./calibrate";
export type {
    CostConfidence,
    CostEstimate,
    CostGateDecision,
    CostGateLimits,
    CostInput,
    CostMeasurement,
    MachineCalibration,
} from "./estimate";
export {
    ASSUMED_ITERATION_BOUND,
    DEFAULT_COST_GATE_LIMITS,
    DEFAULT_COST_RATES,
    DEFAULT_EXACT_COMPUTATION_CAP_SECONDS,
    estimateCost,
    gateRun,
    ITERATION_OPTION_NAME,
    MAX_COLUMN_LENGTH,
    MEASUREMENT_EXTRAPOLATION_LIMIT,
    resultBytes,
} from "./estimate";
