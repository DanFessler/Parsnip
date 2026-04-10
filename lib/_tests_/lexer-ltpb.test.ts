import { test, expect } from "vitest";
import { lex } from "../lexer";

function values(input: string) {
  const toks = lex(input, [], {
    apostropheLineComments: true,
    remLineComments: true,
    allowDollarInIdentifier: true,
    multiCharComparisons: true,
  });
  const out: { type: string; value: string | number }[] = [];
  while (toks.peek()) {
    const t = toks.consume();
    if (t.type === "whitespace" || t.type === "comment") continue;
    out.push({ type: t.type, value: t.value });
  }
  return out;
}

test("LTPB: apostrophe line comment", () => {
  const v = values("x = 1 ' cmt\ny = 2");
  expect(v.map((t) => t.value)).toEqual(["x", "=", "1", "y", "=", "2"]);
});

test("LTPB: rem comment", () => {
  const v = values("Rem hello\nPrint 3");
  expect(v.map((t) => t.value)).toEqual(["Print", "3"]);
});

test("LTPB: identifier with dollar", () => {
  const v = values('a$ = "z"');
  expect(v.map((t) => t.value)).toEqual(["a$", "=", '"z"']);
});

test("LTPB: Inkey$", () => {
  const v = values("A$ = Inkey$");
  expect(v.map((t) => t.value)).toEqual(["A$", "=", "Inkey$"]);
});

test("LTPB: comparisons", () => {
  const v = values("a <> b\nx <= 1\ny >= 2");
  expect(v.map((t) => t.value)).toEqual([
    "a",
    "<>",
    "b",
    "x",
    "<=",
    "1",
    "y",
    ">=",
    "2",
  ]);
});

test("LTPB: colon and comma", () => {
  const v = values("foo: Print 1, 2");
  expect(v.map((t) => t.value)).toEqual(["foo", ":", "Print", "1", ",", "2"]);
});
