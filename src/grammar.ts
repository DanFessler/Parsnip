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
const ARGUMENTS = "ARGUMENTS";
const PARAMETERS = "PARAMETERS";
// const KEY = "KEY";

type RuleType =
  | "SCRIPT"
  | "STATEMENT"
  | "BLOCK"
  | "EXPRESSION"
  | "ADD"
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
  | "WHEN_KEY_PRESSED"
  | "ARGUMENTS"
  | "PARAMETERS"
  | "ADDITIVE"
  | "MULTIPLICATIVE"
  | "ADD"
  | "SUBTRACT"
  | "MULTIPLY"
  | "DIVIDE"
  | "MODULO"
  | "VALUE";

// prettier-ignore
export type Rule = {
  capture?: boolean;
  type?: RuleType;
  sequence?: RuleOrString[];
  options?: RuleOrString[];
  repeat?: boolean;
  optional?: boolean;
  separator?: string;

  literal?: boolean;
  parse?: (token: Token) => string | number;
};

type RuleOrString = Rule | string;

export type Grammar = Record<RuleType, Rule>;

// prettier-ignore
const grammar: Grammar = {

  LITERAL: {
    options: [{ type: STRING }, { type: NUMBER }],
  },

  STRING: {
    capture: true,
    parse: (token: Token) => {
      if (token.type !== "string") throw "Expected a string literal";
      const value = token.value as string;
      return value.substring(1, value.length - 1);
    },
  },

  NUMBER: {
    capture: true,
    parse: (token: Token) => {
      if (token.type !== "number") throw "Expected a number literal";
      return Number(token.value);
    },
  },

  IDENTIFIER: {
    capture: true,
    parse: (token: Token) => {
      if (token.type !== "identifier") throw "Expected an identifier";
      return token.value;
    },
  },

  EXPRESSION: {
    type: "ADDITIVE",
  },

  ADDITIVE: {
    options: [
      { type: "ADD" },
      { type: "SUBTRACT" },
      { type: "MULTIPLICATIVE" },
    ],
  },

  ADD: {
    type: "ADD",
    capture: true,
    sequence: [
      { type: "MULTIPLICATIVE" },
      "+",
      { type: "ADDITIVE" },
    ],
  },

  SUBTRACT: {
    type: "SUBTRACT",
    capture: true,
    sequence: [
      { type: "MULTIPLICATIVE" },
      "-",
      { type: "ADDITIVE" },
    ],
  },

  MULTIPLICATIVE: {  
    options: [
      { type: "MULTIPLY" },
      { type: "DIVIDE" },
      { type: "MODULO" },
      { type: "VALUE" },
    ],
  },

  MULTIPLY: {
    type: "MULTIPLY",
    capture: true,
    sequence: [
      { type: "VALUE" },
      "*",
      { type: "MULTIPLICATIVE" },
    ],
  },

  DIVIDE: {
    type: "DIVIDE",
    capture: true,
    sequence: [
      { type: "VALUE" },
      "/",
      { type: "MULTIPLICATIVE" },
    ],
  },

  MODULO: {
    type: "MODULO",
    capture: true,
    sequence: [
      { type: "VALUE" },
      "%",
      { type: "MULTIPLICATIVE" },
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
    capture: true,
    sequence: [
      "when",
      { type: STRING },
      "key",
      "pressed",
      { type: BLOCK },
    ],
  },

  IF: {
    capture: true,
    sequence: [
      "if", 
      { type: EXPRESSION }, 
      "then", 
      { type: BLOCK }
    ],
  },

  IF_ELSE: {
    capture: true,
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
    capture: true,
    sequence: [
      "say", 
      { type: EXPRESSION }
    ],
  },

  FUNCTION: {
    capture: true,
    sequence: [
      "function",
      { type: IDENTIFIER },
      { type: PARAMETERS },
      { type: BLOCK },
    ],
  },

  CALL: {
    capture: true,
    sequence: [
      "call",
      { type: IDENTIFIER },
      { type: ARGUMENTS },
      { type: BLOCK },
    ],
  },

  ARGUMENTS: {
    sequence: [
      "(",
      { 
        type: EXPRESSION, 
        repeat: true, 
        separator: "," 
      },
      ")",
    ],
  },

  PARAMETERS: {
    sequence: [
      "(",
      { type: IDENTIFIER, repeat: true, separator: "," },
      ")",
    ],
  },

  SCRIPT: {
    type: "STATEMENT",
    repeat: true,
  },

  BLOCK: {
    // capture: true,
    options: [
      { sequence: [
        "{", 
        { type: SCRIPT }, 
        "}"
      ] },
      { type: "STATEMENT" },
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
