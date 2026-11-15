// Every test runs the GitHub client's retries without waiting (src/collector/github.ts, RETRY).
import { RETRY } from "../src/collector/github.js";

RETRY.delaysMs = [0, 0];
