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

import { Token, Grammar } from "../lib/types";

// prettier-ignore
const grammar: Grammar = {

  _IGNORE: {
    options: [
      { type: "COMMENT", repeat: true },
      { type: "WHITESPACE", repeat: true },
    ],
  },

  LITERAL: {
    options: [{ type: "STRING" }, { type: "NUMBER" }],
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
    type: "COMPARISON",
  },

  LOGICAL: {
    options: [
      {
        type: "AND",
        capture: true,
        sequence: [
          { type: "LOGICAL" }, "and", { type: "LOGICAL" },
        ],
      },
      {
        type: "OR",
        capture: true,
        sequence: [
          { type: "LOGICAL" }, "or", { type: "LOGICAL" },
        ],
      },
      { type: "COMPARISON" },
    ],
  },

  COMPARISON: {
    options: [
      {
        type: "EQUALS",
        capture: true,
        sequence: [
          { type: "ADDITIVE" }, "==", { type: "COMPARISON" },
        ],
      },    
      {
        type: "NOT_EQUALS",
        capture: true,
        sequence: [
          { type: "ADDITIVE" }, "!=", { type: "COMPARISON" },
        ],
      },    
      {
        type: "LESS_THAN",
        capture: true,
        sequence: [
          { type: "ADDITIVE" }, "<", { type: "COMPARISON" },
        ],
      },    
      {
        type: "GREATER_THAN",
        capture: true,
        sequence: [
          { type: "ADDITIVE" }, ">", { type: "COMPARISON" },
        ],
      },
      { type: "ADDITIVE" },
    ],
  },  

  ADDITIVE: {
    options: [
      {
        type: "ADD",
        capture: true,
        sequence: [
          { type: "MULTIPLICATIVE" }, "+", { type: "ADDITIVE" },
        ],
      },
      {
        type: "SUBTRACT",
        capture: true,
        sequence: [
          { type: "MULTIPLICATIVE" }, "-", { type: "ADDITIVE" },
        ],
      },
      { type: "MULTIPLICATIVE" },
    ],
  },

  MULTIPLICATIVE: {  
    options: [
      {
        type: "MULTIPLY",
        capture: true,
        sequence: [
          { type: "VALUE" }, "*", { type: "MULTIPLICATIVE" },
        ],
      },
      {
        type: "DIVIDE",
        capture: true,
        sequence: [
          { type: "VALUE" }, "/", { type: "MULTIPLICATIVE" },
        ],
      },
      {
        type: "MODULO",
        capture: true,
        sequence: [
          { type: "VALUE" }, "%", { type: "MULTIPLICATIVE" },
        ],
      },
      { type: "VALUE" },
    ],
  },

  VALUE: {
    options: [
      { type: "LITERAL" },
      { type: "IDENTIFIER" },
      { type: "CALL" },
      { type: "GROUP" },
    ],
  },

  GROUP: {
    sequence: [
      "(", 
      { type: "EXPRESSION" }, 
      ")"
    ],
  },

  ARGUMENTS: {
    sequence: [
      "(",
      { 
        type: "EXPRESSION", 
        repeat: true, 
        separator: "," 
      },
      ")",
    ],
  },

  PARAMETERS: {
    sequence: [
      "(",
      { 
        type: "IDENTIFIER",
        repeat: true,
        separator: ",",
      },
      ")",
    ],
  },

  SCRIPT: {
    type: "STATEMENT",
    repeat: true,
  },

  BLOCK: {
    options: [
      {
        sequence: [
          "{", { type: "SCRIPT" }, "}"
        ]
      },
      { type: "STATEMENT" },
    ],
  },

  STATEMENT: {
    options: [
      { type: "SAY" },
      { type: "IF_ELSE" },
      { type: "IF" },
      { type: "CALL" },
      { type: "FUNCTION" },
      { type: "REPEAT" },
      { type: "WHEN_KEY_PRESSED" },
      { type: "SET" },
    ],
  },

  SAY: {
    type: "SAY",    
    capture: true,
    sequence: [
      "say", 
      { type: "EXPRESSION" }
    ],
  },

  IF_ELSE: {
    type: "IF_ELSE",
    capture: true,
    sequence: [
      "if", 
      { type: "EXPRESSION" }, 
      "then",
      { type: "BLOCK" },
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

  IF: {
    type: "IF",    
    capture: true,
    sequence: [
      "if", 
      { type: "EXPRESSION" }, 
      "then", 
      { type: "BLOCK" }
    ],
  },

  CALL: {
    type: "CALL",    
    capture: true,
    sequence: [
      "call",
      { type: "IDENTIFIER" },
      { type: "ARGUMENTS" },
      { type: "BLOCK" },
    ],
  },

  FUNCTION: {
    type: "FUNCTION",    
    capture: true,
    sequence: [
      "function",
      { type: "IDENTIFIER" },
      { type: "PARAMETERS" },
      { type: "BLOCK" },
    ],
  },

  REPEAT: {
    type: "REPEAT",    
    capture: true,
    sequence: [
      "repeat", 
      { type: "EXPRESSION" }, 
      { type: "SCRIPT" }
    ],
  },

  WHEN_KEY_PRESSED: {
    type: "WHEN_KEY_PRESSED",    
    capture: true,
    sequence: [
      "when",
      { type: "STRING" },
      "key",
      "pressed",
      { type: "BLOCK" },
    ],
  },

  SET: {
    type: "SET",    
    capture: true,
    sequence: [
      "set",
      { type: "IDENTIFIER" },
      "to",
      { type: "EXPRESSION" },
    ],
  },
};

export default grammar;
