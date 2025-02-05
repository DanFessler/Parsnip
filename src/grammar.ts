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

import { Token } from "./lexer";

const BLOCK = "BLOCK";
const STRING = "STRING";
const NUMBER = "NUMBER";
const EXPRESSION = "EXPRESSION";
const IDENTIFIER = "IDENTIFIER";
const SCRIPT = "SCRIPT";
// const KEY = "KEY";

// prettier-ignore
export type Rule = {
  type?: string;
  sequence?: RuleOrString[];
  options?: RuleOrString[];
  repeat?: boolean;
  optional?: boolean;
  separator?: string;
  literal?: boolean;
  parse?: (token: Token) => unknown;
};

type RuleOrString = Rule | string;

export type Grammar = Record<string, Rule>;

const grammar: Grammar = {
  // Basic building blocks

  LITERAL: {
    options: [{ type: STRING }, { type: NUMBER }],
  },

  STRING: {
    parse: (token: Token) => {
      if (token.type !== "string") throw "Expected a string literal";
      const value = token.value as string;
      return value.substring(1, value.length - 1);
    },
  },

  NUMBER: {
    parse: (token: Token) => {
      if (token.type !== "number") throw "Expected a number literal";
      return Number(token.value);
    },
  },

  IDENTIFIER: {
    parse: (token: Token) => {
      if (token.type !== "identifier") throw "Expected an identifier";
      return token.value;
    },
  },

  OPERATOR: {
    options: ["+", "-", "*", "/", "%"],
  },

  // Expressions with precedence levels
  EXPRESSION: {
    type: "ADDITIVE_EXPR",
  },

  // Addition and subtraction (lowest precedence)
  ADDITIVE_EXPR: {
    options: [
      {
        sequence: [
          { type: "MULTIPLICATIVE_EXPR" },
          { type: "ADDITIVE_OP" },
          { type: "ADDITIVE_EXPR" },
        ],
      },
      { type: "MULTIPLICATIVE_EXPR" },
    ],
  },

  // Multiplication and division (higher precedence)
  MULTIPLICATIVE_EXPR: {
    options: [
      {
        sequence: [
          { type: "PRIMARY_EXPR" },
          { type: "MULTIPLICATIVE_OP" },
          { type: "MULTIPLICATIVE_EXPR" },
        ],
      },
      { type: "PRIMARY_EXPR" },
    ],
  },

  // Primary expressions (highest precedence)
  PRIMARY_EXPR: {
    options: [
      { type: "LITERAL" },
      { type: IDENTIFIER },
      { type: "FUNCTION_CALL" },
      { type: "GROUPED_EXPRESSION" },
    ],
  },

  // Split operators by precedence
  ADDITIVE_OP: {
    options: ["+", "-"],
  },

  MULTIPLICATIVE_OP: {
    options: ["*", "/", "%"],
  },

  // Grouped expression: e.g., (a + b)
  GROUPED_EXPRESSION: {
    sequence: ["(", { type: EXPRESSION }, ")"],
  },

  // Statements
  whenKeyPressed: {
    sequence: [
      "when",
      {
        options: [
          { type: STRING },
          "space",
          "uparrow",
          "downarrow",
          "leftarrow",
          { sequence: ["right", "arrow"] },
        ],
      },
      "key",
      "pressed",
      { type: BLOCK },
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

  FUNCTION: {
    sequence: [
      "function",
      { type: IDENTIFIER },
      "(",
      { type: EXPRESSION, repeat: true, separator: "," },
      ")",
      { type: BLOCK },
    ],
  },

  // Function call: e.g., foo(a, b)

  CALL: {
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
    options: [
      { type: "STATEMENT" },
      {
        sequence: ["{", { type: SCRIPT }, "}"],
      },
    ],
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
      { type: "CALL" },
      { type: "FUNCTION" },
      { type: "repeat" },
      { type: "whenKeyPressed" },
    ],
  },
};

export default grammar;
