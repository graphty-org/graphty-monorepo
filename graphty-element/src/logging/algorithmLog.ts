import { GraphtyLogger, type Logger } from "./GraphtyLogger.js";

/**
 * What the algorithms did, for whoever reads the log afterwards: each run requested, started and
 * settled, where its work ran and why, and the style layers it painted or did not. Silent unless a
 * consumer turns on the `algorithm` module.
 */
export const algorithmLog: Logger = GraphtyLogger.getLogger(["graphty", "algorithm"]);
