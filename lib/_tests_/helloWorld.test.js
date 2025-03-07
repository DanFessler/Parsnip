import { test, expect, describe } from "vitest";
import { Parser, ParseObject } from "../parser";

const grammar = {
  _IGNORE: { type: "WHITESPACE" },
  hello: {
    type: "hello",
    capture: true,
    sequence: ["hello", { type: "noun" }],
  },
  noun: {
    type: "noun",
    capture: true,
    parse: (token) => {
      return token.value;
    },
  },
};

describe("Simple Hello World Grammar", () => {
  const parser = new Parser(grammar);

  test("Hello World", () => {
    const result = parser.parse("hello world", "hello");
    console.log("result", result);
    expect(result).toEqual({
      type: "hello",
      value: { type: "noun", value: "world" },
    });
  });

  test("Hello Someone", () => {
    expect(parser.parse("hello someone", "hello")).toEqual({
      type: "hello",
      value: { type: "noun", value: "someone" },
    });
  });

  // the grammar doesn't support multiple words as nouns
  test("Hello Someone Else", () => {
    expect(parser.parse("hello someone else", "hello")).not.toEqual({
      type: "hello",
      value: { type: "noun", value: "someone" },
      value: { type: "noun", value: "else" },
    });
  });
});

describe("reconstruct original text", () => {
  const parser = new Parser(grammar, true);

  // make sure the parser can reconstruct the original text from the CST
  test("hello world", () => {
    const result = parser.parse("hello world", "hello");
    const parseObject = new ParseObject(result);
    expect(parseObject.reconstruct(result)).toEqual("hello world");
  });
});
