import { test, expect, describe } from "vitest";
import { lex } from "../lexer";

test("expected tokens", () => {
  const tokenStream = lex("1 + 2");
  expect(tokenStream.getTokens()).toMatchObject([
    { type: "number", value: "1", line: 1, column: 1 },
    { type: "whitespace", value: " ", line: 1, column: 2 },
    { type: "operator", value: "+", line: 1, column: 3 },
    { type: "whitespace", value: " ", line: 1, column: 4 },
    { type: "number", value: "2", line: 1, column: 5 },
  ]);
});

test("Reconstruct original text", () => {
  const tokenStream = lex("1 + 2");
  let reconstructed = "";
  for (const token of tokenStream.getTokens()) {
    reconstructed += token.value;
  }
  expect(reconstructed).toEqual("1 + 2");
});

test("Reconstruct original text with newlines", () => {
  const tokenStream = lex("1 + 2\n3 + 4");
  let reconstructed = "";
  for (const token of tokenStream.getTokens()) {
    reconstructed += token.value;
  }
  expect(reconstructed).toEqual("1 + 2\n3 + 4");
});
