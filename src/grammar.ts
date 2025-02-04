/**
 * Grammar definition for a simple programming language parser.
 *
 * The grammar is defined as a collection of rules, where each rule can be:
 * - A sequence of elements that must appear in order
 * - A set of alternative options
 * - A repeatable element (with optional separator)
 *
 * Rule properties:
 * - type: References another rule by name
 * - sequence: Array of elements that must appear in order
 * - options: Array of alternative elements (only one must match)
 * - repeat: Boolean indicating if the rule can appear multiple times
 * - optional: Boolean indicating if the rule is optional
 * - separator: String used between repeated elements (e.g., comma in function args)
 */

const BLOCK = "BLOCK";
const STRING = "STRING";
const NUMBER = "NUMBER";
const OPERATOR = "OPERATOR";
const EXPRESSION = "EXPRESSION";
const IDENTIFIER = "IDENTIFIER";
const SCRIPT = "SCRIPT";
const KEY = "KEY";

// prettier-ignore
export type Rule = {
  type?: string;
  sequence?: RuleOrString[];
  options?: RuleOrString[];
  repeat?: boolean;
  optional?: boolean;
  separator?: string;
};

type RuleOrString = Rule | string;

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
      { type: "FUNCTION_CALL" }, // Function call
      { type: "GROUPED_EXPRESSION" }, // Grouped expression (parentheses)
      { type: "OPERATION" }, // Arithmetic expression
    ],
  },

  // Grouped expression: e.g., (a + b)
  GROUPED_EXPRESSION: {
    sequence: ["(", { type: EXPRESSION }, ")"],
  },

  // Arithmetic expression: e.g., (a + b)
  OPERATION: {
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
    sequence: ["if", { type: EXPRESSION }, "then", { type: BLOCK }],
  },

  // prettier-ignore
  ifElse: {
    sequence: [
      "if", { type: EXPRESSION }, "then",
      { type: BLOCK },
      "else",
      {
        options: [{ type: "ifElse" }, { type: "if" }, { type: "BLOCK" }],
      },
    ],
  },

  repeat: {
    sequence: ["repeat", { type: EXPRESSION }, { type: SCRIPT }],
  },

  say: {
    sequence: ["say", { type: EXPRESSION }],
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

  BLOCK: {
    sequence: ["{", { type: SCRIPT }, "}"],
  },

  // Statements: These are top-level grammar constructs
  // NOTE: options should be ordered from most specific to least specific
  // otherwise the parser will get confused and think it's a different rule.
  // e.g. if and ifElse are similar but ifElse is more specific because it
  // has an else clause. this is less than ideal and should be fixed in the
  // future. the grammar shouldn't care about the order of rules.

  // prettier-ignore
  STATEMENT: {
    options: [
      { type: "say" },
      { type: "ifElse" },
      { type: "if" },
    ],
  },
};

export default grammar;
