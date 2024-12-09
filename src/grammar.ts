const STRING = "STRING";
const NUMBER = "NUMBER";
const OPERATOR = "OPERATOR";
const EXPRESSION = "EXPRESSION";
const IDENTIFIER = "IDENTIFIER";
const SCRIPT = "SCRIPT";
const KEY = "KEY";

// prettier-ignore
export type Rule = string | {
  sequence?: Rule[];
  options?: Rule[];
  type?: string;
  repeat?: boolean;
  separator?: string;
};

const grammar: Record<string, Rule> = {
  // Basic building blocks
  LITERAL: {
    options: [{ type: STRING }, { type: NUMBER }],
  },

  OPERATOR: {
    options: ["+", "-", "*", "/", "%"],
  },

  // Expressions
  EXPRESSION: {
    options: [
      { type: "LITERAL" }, // A literal value
      { type: IDENTIFIER }, // A variable or identifier
      { type: "ARITHMETIC" }, // Arithmetic expression
      { type: "FUNCTION_CALL" }, // Function call
      { type: "GROUPED_EXPRESSION" }, // Grouped expression (parentheses)
    ],
  },

  // Grouped expression: e.g., (a + b)
  GROUPED_EXPRESSION: {
    sequence: ["(", { type: EXPRESSION }, ")"],
  },

  // Arithmetic expression: e.g., (a + b)
  ARITHMETIC: {
    sequence: [{ type: EXPRESSION }, { type: OPERATOR }, { type: EXPRESSION }],
  },

  // Statements
  whenKeyPressed: {
    sequence: [
      "when",
      {
        type: KEY,
        options: [
          "space",
          "up arrow",
          "down arrow",
          "left arrow",
          "right arrow",
        ],
      },
      "key pressed",
    ],
  },

  if: {
    sequence: ["if", { type: EXPRESSION }, "then", { type: SCRIPT }],
  },

  ifElse: {
    sequence: [
      "if",
      { type: EXPRESSION },
      "then",
      { type: SCRIPT },
      "else",
      { type: SCRIPT },
    ],
  },

  repeat: {
    sequence: ["repeat", { type: EXPRESSION }, { type: SCRIPT }],
  },

  // Function call: e.g., foo(a, b)
  FUNCTION_CALL: {
    sequence: [
      { type: IDENTIFIER },
      "(",
      { type: EXPRESSION, repeat: true, separator: "," },
      ")",
    ],
  },

  // Scripts (block of statements)
  SCRIPT: {
    type: "STATEMENT",
    repeat: true,
  },

  // Statements: These are top-level grammar constructs
  STATEMENT: {
    options: [
      { type: "if" },
      { type: "ifElse" },
      { type: "repeat" },
      { type: "whenKeyPressed" },
    ],
  },
};

export default grammar;
