// The adapter facts a position comparison needs: Dawn's adapter.info (every field), the device's subgroup sizes,
// and the NVIDIA driver from nvidia-smi.
// Usage: node adapter-info.mjs <adapter substring> <out.json>
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const req = createRequire(`${ROOT}/cytoscape-extensions/package.json`);
const { createNodeGpu, createNodeGpuContext } = await import(req.resolve("@graphty/webgpu-graph-algorithms/node"));
const [adapter, out] = process.argv.slice(2);
const handle = await createNodeGpu({ adapter });
const a = await handle.gpu.requestAdapter();
const info = {};
for (const k in a.info) if (typeof a.info[k] !== "function") info[k] = a.info[k];
const ctx = await createNodeGpuContext({ adapter, rejectSoftware: false });
let smi;
try {
    smi = execFileSync(
        "nvidia-smi",
        ["--query-gpu=name,driver_version,vbios_version,compute_cap", "--format=csv,noheader"],
        { encoding: "utf8" },
    ).trim();
} catch (e) {
    smi = `unavailable: ${e.message.split("\n")[0]}`;
}
const icd = ["/usr/share/vulkan/icd.d/nvidia_icd.json", "/etc/vulkan/icd.d/nvidia_icd.json"].find((f) => existsSync(f));
const report = {
    adapterInfo: info,
    // Dawn's adapter.info carries no backend field in Node; on Linux Dawn's default (no backend= flag) is Vulkan
    backend: info.backendType ?? info.backend ?? "vulkan (Dawn's Linux default; no backend= flag passed)",
    adapterFeatures: [...a.features].sort(),
    subgroups: ctx.caps.features.has("subgroups"),
    subgroupMinSize: ctx.caps.subgroupMinSize,
    subgroupMaxSize: ctx.caps.subgroupMaxSize,
    nvidiaSmi: smi,
    vulkanIcdApiVersion: icd ? JSON.parse(readFileSync(icd, "utf8")).ICD?.api_version : "no NVIDIA ICD json",
    webgpuModule: req(req.resolve("webgpu/package.json", { paths: [`${ROOT}/webgpu-graph-algorithms`] })).version,
    node: process.version,
};
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
ctx.dispose();
process.exit(0);
