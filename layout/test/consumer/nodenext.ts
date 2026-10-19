// Compile-only: a Node ESM consumer of the published typings. tsconfig.consumer.json compiles this file with
// moduleResolution nodenext and skipLibCheck off, resolving "@graphty/layout" through package.json "exports" to
// dist/, so an extensionless relative import in any emitted .d.ts fails here (issue #958).
import { circular, type LayoutAccelerator, type LayoutResult, type SimulationType } from "@graphty/layout";

export const layout: typeof circular = circular;
export type Accelerator = LayoutAccelerator;
export type Result = LayoutResult;
export type Simulation = SimulationType;
