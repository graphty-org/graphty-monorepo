import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadGraphData, exportGraphData, loadGraphFromJSON, validateGraphData } from "../graphLoader";

describe("graphLoader", () => {
    describe("validateGraphData", () => {
        it("validates correct graph data", () => {
            const validData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [{ source: "1", target: "2" }],
            };

            const result = validateGraphData(validData);

            expect(result).toEqual(validData);
        });

        it("throws error for null data", () => {
            expect(() => validateGraphData(null)).toThrow("Invalid graph data format");
        });

        it("throws error for non-object data", () => {
            expect(() => validateGraphData("string")).toThrow("Invalid graph data format");
            expect(() => validateGraphData(123)).toThrow("Invalid graph data format");
        });

        it("throws error when nodes is not an array", () => {
            const invalidData = {
                nodes: "not an array",
                edges: [],
            };

            expect(() => validateGraphData(invalidData)).toThrow("Invalid graph data format");
        });

        it("throws error when edges is not an array", () => {
            const invalidData = {
                nodes: [],
                edges: "not an array",
            };

            expect(() => validateGraphData(invalidData)).toThrow("Invalid graph data format");
        });

        it("throws error when node is missing id", () => {
            const invalidData = {
                nodes: [{ name: "node1" }], // missing id
                edges: [],
            };

            expect(() => validateGraphData(invalidData)).toThrow("Invalid graph data format");
        });

        it("throws error when node is null", () => {
            const invalidData = {
                nodes: [null],
                edges: [],
            };

            expect(() => validateGraphData(invalidData)).toThrow("Invalid graph data format");
        });

        it("throws error when node is not an object", () => {
            const invalidData = {
                nodes: ["not an object"],
                edges: [],
            };

            expect(() => validateGraphData(invalidData)).toThrow("Invalid graph data format");
        });

        it("throws error when edge is missing source", () => {
            const invalidData = {
                nodes: [{ id: "1" }],
                edges: [{ target: "1" }], // missing source
            };

            expect(() => validateGraphData(invalidData)).toThrow("Invalid graph data format");
        });

        it("throws error when edge is missing target", () => {
            const invalidData = {
                nodes: [{ id: "1" }],
                edges: [{ source: "1" }], // missing target
            };

            expect(() => validateGraphData(invalidData)).toThrow("Invalid graph data format");
        });

        it("throws error when edge is null", () => {
            const invalidData = {
                nodes: [{ id: "1" }],
                edges: [null],
            };

            expect(() => validateGraphData(invalidData)).toThrow("Invalid graph data format");
        });

        it("throws error when edge is not an object", () => {
            const invalidData = {
                nodes: [{ id: "1" }],
                edges: ["not an object"],
            };

            expect(() => validateGraphData(invalidData)).toThrow("Invalid graph data format");
        });

        it("accepts nodes with additional properties", () => {
            const validData = {
                nodes: [{ id: "1", label: "Node 1", weight: 5 }],
                edges: [],
            };

            const result = validateGraphData(validData);

            expect(result).toEqual(validData);
        });

        it("accepts edges with additional properties", () => {
            const validData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [{ source: "1", target: "2", weight: 10, label: "edge1" }],
            };

            const result = validateGraphData(validData);

            expect(result).toEqual(validData);
        });
    });

    describe("exportGraphData", () => {
        it("exports graph data as formatted JSON string", () => {
            const data = {
                nodes: [{ id: "1" }],
                edges: [],
            };

            const result = exportGraphData(data);

            expect(result).toBe(JSON.stringify(data, null, 2));
        });

        it("handles empty graph", () => {
            const data = {
                nodes: [],
                edges: [],
            };

            const result = exportGraphData(data);

            expect(result).toContain('"nodes": []');
            expect(result).toContain('"edges": []');
        });
    });

    describe("loadGraphFromJSON", () => {
        const originalFetch = globalThis.fetch;

        beforeEach(() => {
            vi.clearAllMocks();
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
        });

        it("loads and validates graph data from URL", async () => {
            const mockData = {
                nodes: [{ id: "1" }],
                edges: [],
            };

            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockData),
            });

            const result = await loadGraphFromJSON("https://example.com/graph.json");

            expect(fetch).toHaveBeenCalledWith("https://example.com/graph.json");
            expect(result).toEqual(mockData);
        });

        it("throws error when fetch fails", async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: false,
                statusText: "Not Found",
            });

            await expect(loadGraphFromJSON("https://example.com/missing.json")).rejects.toThrow(
                "Failed to load graph data: Not Found",
            );
        });

        it("throws error when data is invalid", async () => {
            globalThis.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ invalid: "data" }),
            });

            await expect(loadGraphFromJSON("https://example.com/invalid.json")).rejects.toThrow(
                "Invalid graph data format",
            );
        });
    });

    describe("downloadGraphData", () => {
        let mockLink: HTMLAnchorElement;

        beforeEach(() => {
            mockLink = {
                href: "",
                download: "",
                click: vi.fn(),
            } as unknown as HTMLAnchorElement;

            vi.spyOn(document, "createElement").mockReturnValue(mockLink);
            vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-url");
            vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
            vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink);
            vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("downloads graph data with default filename", () => {
            const data = {
                nodes: [{ id: "1" }],
                edges: [],
            };

            downloadGraphData(data);

            expect(document.createElement).toHaveBeenCalledWith("a");
            expect(URL.createObjectURL).toHaveBeenCalled();
            expect(mockLink.href).toBe("blob:test-url");
            expect(mockLink.download).toBe("graph.json");
            expect(mockLink.click).toHaveBeenCalled();
            expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
            expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
            expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
        });

        it("downloads graph data with custom filename", () => {
            const data = {
                nodes: [{ id: "1" }],
                edges: [],
            };

            downloadGraphData(data, "my-graph.json");

            expect(mockLink.download).toBe("my-graph.json");
        });

        it("creates blob with correct content type", () => {
            const data = {
                nodes: [{ id: "1" }],
                edges: [],
            };

            downloadGraphData(data);

            // Verify Blob was created with JSON content
            const createObjectURLMock = URL.createObjectURL as ReturnType<typeof vi.fn>;
            const blobCall = createObjectURLMock.mock.calls[0][0] as Blob;
            expect(blobCall).toBeInstanceOf(Blob);
            expect(blobCall.type).toBe("application/json");
        });
    });
});
