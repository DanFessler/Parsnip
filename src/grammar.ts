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

type RuleType =
  | "SCRIPT"
  | "STATEMENT"
  | "BLOCK"
  | "EXPRESSION"
  | "ADD"
  | "MUL"
  | "VALUE"
  | "LITERAL"
  | "STRING"
  | "NUMBER"
  | "IDENTIFIER"
  | "GROUP"
  | "FUNCTION"
  | "CALL"
  | "SAY"
  | "IF"
  | "IF_ELSE"
  | "REPEAT"
  | "WHEN_KEY_PRESSED";

// prettier-ignore
export type Rule = {
  type?: RuleType;
  sequence?: RuleOrString[];
  options?: RuleOrString[];
  repeat?: boolean;
  optional?: boolean;
  separator?: string;

  literal?: boolean;
  parse?: (token: Token) => unknown;
};

type RuleOrString = Rule | string;

export type Grammar = Record<RuleType, Rule>;

// prettier-ignore
const grammar: Grammar = {

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

  EXPRESSION: {
    type: "ADD",
  },

  ADD: {
    options: [
      {
        sequence: [
          { type: "MUL" },
          { options: ["+", "-"] },
          { type: "ADD" },
        ],
      },
      { type: "MUL" },
    ],
  },

  MUL: {
    options: [
      {
        sequence: [
          { type: "VALUE" },
          { options: ["*", "/", "%"] },
          { type: "MUL" },
        ],
      },
      { type: "VALUE" },
    ],
  },

  VALUE: {
    options: [
      { type: "LITERAL" },
      { type: IDENTIFIER },
      { type: "CALL" },
      { type: "GROUP" },
    ],
  },

  GROUP: {
    sequence: [
      "(", 
      { type: EXPRESSION }, 
      ")"
    ],
  },

  // Statements
  WHEN_KEY_PRESSED: {
    sequence: [
      "when",
      { type: STRING },
      "key",
      "pressed",
      { type: BLOCK },
    ],
  },

  IF: {
    sequence: [
      "if", 
      { type: EXPRESSION }, 
      "then", 
      { type: BLOCK }
    ],
  },

  IF_ELSE: {
    sequence: [
      "if", 
      { type: EXPRESSION }, 
      "then",
      { type: BLOCK },
      "else",
      {
        options: [
          { type: "IF_ELSE" },
          { type: "IF" },
          { type: "BLOCK" },
        ],
      },
    ],
  },

  REPEAT: {
    sequence: [
      "repeat", 
      { type: EXPRESSION }, 
      { type: SCRIPT }
    ],
  },

  SAY: {
    sequence: [
      "say", 
      { type: EXPRESSION }
    ],
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

  CALL: {
    sequence: [
      { type: IDENTIFIER },
      "(",
      { type: EXPRESSION, repeat: true, separator: "," },
      ")",
    ],
  },

  SCRIPT: {
    type: "STATEMENT",
    repeat: true,
  },

  BLOCK: {
    options: [
      { type: "STATEMENT" },
      { sequence: [
        "{", 
        { type: SCRIPT }, 
        "}"
      ] },
    ],
  },

  // Statements: These are top-level grammar constructs
  // NOTE: options should be ordered from most specific to least specific
  // otherwise the parser will get confused and think it's a different rule.
  // e.g. if and ifElse are similar but ifElse is more specific because it
  // has an else clause. this is less than ideal and should be fixed in the
  // future. the grammar shouldn't care about the order of rules.
  STATEMENT: {
    options: [
      { type: "SAY" },
      { type: "IF_ELSE" },
      { type: "IF" },
      { type: "CALL" },
      { type: "FUNCTION" },
      { type: "REPEAT" },
      { type: "WHEN_KEY_PRESSED" },
    ],
  },
};

export default grammar;
