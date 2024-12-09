import grammar, { Rule } from "./grammar";
import { Token, TokenStream } from "./lexer";

type ASTNode = {
  type: string;
  value?: string;
  line?: number;
  column?: number;
};

type ASTResult = ASTNode | ASTNode[] | null;

interface ParserOptions {
  debug?: boolean;
  maxDepth?: number;
}

// --- Error Handling ---
class ParseError extends Error {
  constructor(message: string, public token?: Token, public expected?: string) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Parses a token stream into an Abstract Syntax Tree
 * @param tokens - The input token stream
 * @param options - Optional parsing configuration
 * @returns An array of AST nodes representing the parsed program
 * @throws {ParseError} If the input cannot be parsed according to the grammar
 */
function parse(tokens: TokenStream, options: ParserOptions = {}): ASTNode[] {
  let depth = 0;
  const { debug = false, maxDepth = 1000 } = options;

  function log(message: string) {
    if (debug) {
      console.log(`${" ".repeat(depth * 2)}${message}`);
    }
  }

  /**
   * Parses a single rule, delegating to specific parse functions based on rule type
   */
  function parseRule(rule: Rule): ASTResult {
    if (depth++ > maxDepth) {
      throw new ParseError(
        "Maximum parsing depth exceeded - possible infinite recursion"
      );
    }

    log(`Parsing rule: ${JSON.stringify(rule)}`);
    try {
      if (rule.sequence) {
        return parseSequence(rule.sequence);
      } else if (rule.options) {
        return parseOptions(rule.options);
      } else if (rule.type) {
        return parseType(rule.type, rule);
      } else {
        throw new ParseError(`Invalid rule: ${JSON.stringify(rule)}`);
      }
    } finally {
      depth--;
    }
  }

  function parseSequence(sequence: Rule[]): ASTNode[] {
    log("Parsing sequence");
    const nodes: ASTNode[] = [];
    for (const part of sequence) {
      const node = parseRule(part);
      if (!node) {
        const current = tokens.peek();
        throw new ParseError(
          `Expected sequence part ${JSON.stringify(part)}`,
          current,
          JSON.stringify(part)
        );
      }
      nodes.push(...(Array.isArray(node) ? node : [node]));
    }
    return nodes;
  }

  function parseOptions(options: Rule[]): ASTResult {
    log("Parsing options");
    const startPosition = tokens.position();
    const errors: ParseError[] = [];
    let longestMatch: { result: ASTResult; position: number } | null = null;

    for (const option of options) {
      try {
        tokens.seek(startPosition); // Reset for each attempt
        const result = parseRule(option);
        if (result) {
          const currentPosition = tokens.position();
          // Keep track of the longest matching sequence
          if (!longestMatch || currentPosition > longestMatch.position) {
            longestMatch = { result, position: currentPosition };
          }
        }
      } catch (e) {
        if (e instanceof ParseError) {
          errors.push(e);
        } else {
          throw e;
        }
      }
    }

    if (longestMatch) {
      tokens.seek(longestMatch.position);
      return longestMatch.result;
    }

    const current = tokens.peek();
    throw new ParseError(
      `None of the options matched`,
      current,
      JSON.stringify(options)
    );
  }

  function parseType(type: string, rule: Rule): ASTResult {
    const token = tokens.peek();
    if (!token) return null;

    log(`Parsing type ${type} with token ${JSON.stringify(token)}`);

    if (type === "LITERAL" && ["STRING", "NUMBER"].includes(token.type)) {
      const consumed = tokens.consume();
      return {
        type: "LITERAL",
        value: consumed.value,
        line: consumed.line,
        column: consumed.column,
      };
    }
    if (type === token.type) {
      const consumed = tokens.consume();
      return {
        type: consumed.type,
        value: consumed.value,
        line: consumed.line,
        column: consumed.column,
      };
    }
    if (type === "EXPRESSION") {
      return parseRule(grammar.EXPRESSION);
    }
    if (type === "SCRIPT") {
      const nodes: ASTNode[] = [];
      while (tokens.peek()) {
        const node = parseRule(grammar.STATEMENT);
        if (!node) break;
        nodes.push(...(Array.isArray(node) ? node : [node]));
      }
      return nodes;
    }
    return null;
  }

  try {
    return parseRule(grammar.SCRIPT) as ASTNode[];
  } catch (e) {
    if (e instanceof ParseError) {
      // Add more context to the error
      const token = e.token;
      const location = token
        ? ` at line ${token.line}, column ${token.column}`
        : "";
      e.message = `${e.message}${location}`;
    }
    throw e;
  }
}

export {
  parse,
  ParseError,
  type Token,
  type TokenStream,
  type Rule,
  type ASTNode,
  type ParserOptions,
};
