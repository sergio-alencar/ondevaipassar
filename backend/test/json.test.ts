import { describe, expect, it } from "vitest";
import { extractBalancedJsonObject } from "../src/http/json.js";

describe("extractBalancedJsonObject", () => {
  it("extracts a balanced object", () => {
    const source = 'var x = {"a":1,"b":{"c":2}}; var y = "unrelated";';
    const openIndex = source.indexOf("{");
    expect(JSON.parse(extractBalancedJsonObject(source, openIndex))).toEqual({ a: 1, b: { c: 2 } });
  });

  it("extracts a balanced array, ignoring nested objects that contain unrelated brackets in strings", () => {
    const source = 'var x = [{"a":1},{"b":"has [brackets] and {braces} in a string"}]; var y = [1,2,3];';
    const openIndex = source.indexOf("[");
    const result = JSON.parse(extractBalancedJsonObject(source, openIndex));
    expect(result).toEqual([{ a: 1 }, { b: "has [brackets] and {braces} in a string" }]);
  });

  it("doesn't get confused by braces/brackets inside string values", () => {
    const source = '{"text":"a } b ] c { d [ e"}';
    expect(JSON.parse(extractBalancedJsonObject(source, 0))).toEqual({ text: "a } b ] c { d [ e" });
  });

  it("throws when brackets never balance", () => {
    expect(() => extractBalancedJsonObject('{"a":1', 0)).toThrow(/Unbalanced/);
  });
});
