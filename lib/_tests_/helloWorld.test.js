import { test, expect } from "vitest";
import { Parser } from "../parser";

const parser = new Parser({
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
});

test("Hello World", () => {
  expect(parser.parse("hello world", "hello")).toEqual({
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
