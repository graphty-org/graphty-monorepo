import { describe, expect, it } from "vitest";

import { getValueAtPath, keyPathToJMESPath } from "../pathUtils";

describe("keyPathToJMESPath", () => {
    it("converts simple object key paths", () => {
        expect(keyPathToJMESPath(["name"])).toBe("name");
    });

    it("converts nested object key paths", () => {
        expect(keyPathToJMESPath(["metadata", "created"])).toBe("metadata.created");
    });

    it("converts array index paths", () => {
        expect(keyPathToJMESPath([0, "name"])).toBe("[0].name");
    });

    it("converts numeric string array indices", () => {
        expect(keyPathToJMESPath(["0", "name"])).toBe("[0].name");
    });

    it("handles mixed paths with objects and arrays", () => {
        expect(keyPathToJMESPath(["users", 0, "profile"])).toBe("users[0].profile");
    });

    it("handles numeric string mixed paths", () => {
        expect(keyPathToJMESPath(["users", "0", "profile"])).toBe("users[0].profile");
    });

    it("handles deeply nested paths", () => {
        expect(keyPathToJMESPath(["data", "nodes", 0, "metadata", "position", "x"])).toBe(
            "data.nodes[0].metadata.position.x",
        );
    });

    it("handles multiple consecutive array indices", () => {
        expect(keyPathToJMESPath([0, 1, 2])).toBe("[0][1][2]");
    });

    it("returns empty string for empty path", () => {
        expect(keyPathToJMESPath([])).toBe("");
    });

    it("handles keys with special characters by quoting them", () => {
        expect(keyPathToJMESPath(["my-key", "value"])).toBe('"my-key".value');
    });

    it("handles keys that start with numbers but are not pure indices", () => {
        expect(keyPathToJMESPath(["0abc", "value"])).toBe('"0abc".value');
    });

    it("handles array keyPathNode types (flattens them)", () => {
        // keyPathNode can be string | string[] | number | number[]
        expect(keyPathToJMESPath([["users"], [0], "name"])).toBe("users[0].name");
    });
});

describe("getValueAtPath", () => {
    it("gets value at simple key path", () => {
        const data = { name: "test" };
        expect(getValueAtPath(data, ["name"])).toBe("test");
    });

    it("gets value at nested key path", () => {
        const data = { user: { profile: { name: "John" } } };
        expect(getValueAtPath(data, ["user", "profile", "name"])).toBe("John");
    });

    it("gets value at array index path", () => {
        const data = [{ id: 1 }, { id: 2 }];
        expect(getValueAtPath(data, [0, "id"])).toBe(1);
    });

    it("gets value at numeric string array index path", () => {
        const data = [{ id: 1 }, { id: 2 }];
        expect(getValueAtPath(data, ["1", "id"])).toBe(2);
    });

    it("gets value at mixed path", () => {
        const data = { users: [{ name: "Alice" }, { name: "Bob" }] };
        expect(getValueAtPath(data, ["users", 1, "name"])).toBe("Bob");
    });

    it("returns undefined for non-existent path", () => {
        const data = { name: "test" };
        expect(getValueAtPath(data, ["nonexistent"])).toBeUndefined();
    });

    it("returns undefined for path beyond data structure", () => {
        const data = { name: "test" };
        expect(getValueAtPath(data, ["name", "nested"])).toBeUndefined();
    });

    it("returns the root object for empty path", () => {
        const data = { name: "test" };
        expect(getValueAtPath(data, [])).toEqual({ name: "test" });
    });

    it("handles array keyPathNode types (flattens them)", () => {
        const data = { users: [{ name: "Alice" }] };
        expect(getValueAtPath(data, [["users"], [0], "name"])).toBe("Alice");
    });

    it("gets entire nested object", () => {
        const data = { user: { profile: { name: "John", age: 30 } } };
        expect(getValueAtPath(data, ["user", "profile"])).toEqual({ name: "John", age: 30 });
    });

    it("gets entire array", () => {
        const data = { items: [1, 2, 3] };
        expect(getValueAtPath(data, ["items"])).toEqual([1, 2, 3]);
    });
});
