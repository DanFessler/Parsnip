import grammar, { Rule } from "./grammar";
import { Token, TokenStream } from "./lexer";

class ParseError extends Error {
  constructor(
    message: string,
    public token?: Token,
    public expected?: string,
    public exit?: boolean
  ) {
    super(message);
    this.name = "ParseError";
    this.token = token;
    this.exit = exit;
  }
}

type ASTNode = {
  type: string;
  value: ASTNode | ASTNode[] | string | number;
  line: number;
  column: number;
};

type ASTResult = ASTNode | ASTNode[] | undefined;

type SubParser = (
  rule: Rule | string,
  currentType: string,
  endToken?: Rule | string
) => ASTResult;

/**
  The general idea behind this parser is it takes a token stream and
  parses it given a rule defined in the grammar. We assume the first
  rule to be a script, and it'll recursively traverse the grammar rule
  graph until we reach a primative. Some rules have special parsing
  logic, like repeat, optional, sequence, and options. These are
  handled by the sub parsers.
*/

// TODO:
// make rules order commutative
// properly report unterminated strings
// report reserved keywords as errors
// parse algebraic expressions (with operator precedence)

function parse(tokens: TokenStream, debug = false): ASTResult {
  const parseKeyword = (
    rule: string,
    currentToken: Token | undefined
  ): ASTResult => {
    if (currentToken?.value !== rule) {
      throw new ParseError(
        `Expected '${rule}' but got '${currentToken?.value}'`,
        currentToken
      );
    }
    const token = tokens.consume();
    return debug
      ? {
          type: "KEYWORD",
          value: token.value,
          line: token.line,
          column: token.column,
        }
      : undefined;
  };

  const parseStringRule = (): ASTResult => {
    // strip quotes from the string
    const token = tokens.consume();

    if (token.type !== "string")
      throw new ParseError("Expected a string literal");

    const value = token.value as string;

    const position = debug
      ? {
          line: token.line,
          column: token.column,
        }
      : {};

    return {
      type: "STRING",
      value: value.substring(1, value.length - 1),
      ...position,
    } as ASTNode;
  };

  const parseNumberRule = (): ASTResult => {
    const token = tokens.consume();

    if (token.type !== "number")
      throw new ParseError("Expected a number literal");

    const position = debug
      ? {
          line: token.line,
          column: token.column,
        }
      : {};

    return {
      type: "NUMBER",
      value: Number(token.value),
      ...position,
    } as ASTNode;
  };

  const parseIdentifierRule = (): ASTResult => {
    const token = tokens.consume();

    if (token.type !== "identifier")
      throw new ParseError("Expected an identifier");

    const position = debug
      ? {
          line: token.line,
          column: token.column,
        }
      : {};

    return {
      type: "IDENTIFIER",
      value: token.value,
      ...position,
    } as ASTNode;
  };

  const parseRepeatingRule: SubParser = (rule, currentType, endToken) => {
    if (typeof rule === "string") {
      throw new ParseError("Expected a rule object for repeat");
    }

    // if the endToken is not a string or undefined we should throw an error
    if (typeof endToken !== "string" && endToken !== undefined) {
      throw new ParseError("Expected a string for endToken");
    }

    const result: ASTResult = [];
    // keep going until we find the endToken or the end of the token stream
    let peek = tokens.peek();
    while (peek && peek?.value !== endToken) {
      try {
        // we strip out the repeat from the rule so we can parse it as normal without a feedback loop
        const newRule = { ...rule, repeat: false };
        const parsed = parseRule(newRule, currentType, endToken);
        if (parsed) result.push(parsed as ASTNode);
      } catch (e) {
        if (e instanceof ParseError) {
          // if the error is from a repeating rule, we want to throw it immediately so we can report the error
          // to the user even if we're in nested script blocks.
          e.exit = true;
          throw e;
        }
      }
      peek = tokens.peek();
    }

    return result;
  };

  const parseOptionalRule: SubParser = (rule, currentType, endToken) => {
    if (typeof rule === "string") {
      throw new ParseError("Expected a rule object for optional");
    }

    if (!rule.optional) {
      throw new ParseError("Expected a optional for rule");
    }

    const position = tokens.position();
    try {
      // Try to parse the rule normally
      // strip optional from the rule so we can parse it as normal without a feedback loop
      const newRule = { ...rule, optional: false };
      const result = parseRule(newRule, currentType, endToken);
      return result;
    } catch (e) {
      if (e instanceof ParseError) {
        // If parsing fails, restore position and return undefined
        tokens.seek(position);
        return;
      }
      throw e; // Re-throw non-ParseErrors
    }
  };

  const parseSequenceRule: SubParser = (rule, currentType) => {
    if (typeof rule === "string") {
      throw new ParseError("Expected a rule object for sequence");
    }

    if (!rule.sequence) {
      throw new ParseError("Expected a sequence for rule");
    }

    // loop through the sequence of rules and parse them. we track the next token to use as the endToken if the current rule is a repeating rule
    const result: ASTResult = [];
    const startToken = tokens.peek();
    for (const currentRule of rule.sequence!) {
      // lets peek at the next item in the rule sequence (if any) to identify an endToken for interrupting any repeating rules
      const nextRule = rule.sequence[rule.sequence.indexOf(currentRule) + 1];
      const parsed = parseRule(currentRule, currentType, nextRule);
      if (parsed) result.push(parsed as ASTNode);
    }

    const position = debug
      ? {
          line: startToken!.line,
          column: startToken!.column,
        }
      : {};

    return {
      type: currentType!,
      value: result,
      ...position,
    } as ASTNode;
  };

  const parseOptionsRule: SubParser = (rule, currentType, endToken) => {
    if (typeof rule === "string") {
      throw new ParseError("Expected a rule object for options");
    }

    if (!rule.options) {
      throw new ParseError("Expected options for rule");
    }

    // Try each option until one succeeds
    let furthestError: ParseError | undefined;

    const position = tokens.position();
    for (const option of rule.options!) {
      try {
        return parseRule(option, currentType, endToken);
      } catch (e) {
        if (e instanceof ParseError) {
          if (!furthestError) {
            furthestError = e;
          } else if (
            e.token &&
            furthestError.token &&
            e.token.index >= furthestError.token.index
          ) {
            furthestError = e;
          }

          // lets exit early if we recieved an error during a repeating rule
          // repeating rules are typically just scripts and instead of letting them
          // gracefully fail, we want to throw immediately so we can report the error
          // to the user even if we're in nested script blocks.
          if (e.exit) {
            throw e;
          }

          tokens.seek(position);
          continue; // Try next option
        }
        throw e; // Re-throw non-ParseErrors
      }
    }

    // If we get here, no options worked
    const currentToken = tokens.peek();
    throw new ParseError(
      `Unrecognized token: ${currentToken?.value}`,
      currentToken
    );
  };

  // this is the main parser function that will recursively parse the grammar rule graph
  const parseRule: SubParser = (rule, currentType, endToken) => {
    const currentToken = tokens.peek();

    // if we've reached the end of the token stream and there's no rule to parse, throw an error
    if (!currentToken) throw new ParseError("Unexpected end of input");

    // ignore comments
    while (tokens.peek()?.type === "comment") {
      tokens.consume();
    }

    // parse primatives
    if (typeof rule === "string") return parseKeyword(rule, currentToken);
    if (rule.type === "STRING") return parseStringRule();
    if (rule.type === "NUMBER") return parseNumberRule();
    if (rule.type === "IDENTIFIER") return parseIdentifierRule();

    // parse non-primatives
    if (rule.repeat) return parseRepeatingRule(rule, currentType, endToken);
    if (rule.optional) return parseOptionalRule(rule, currentType, endToken);
    if (rule.sequence) return parseSequenceRule(rule, currentType);
    if (rule.options) return parseOptionsRule(rule, currentType, endToken);

    // otherwise recursively parse with the new rule definition
    if (rule.type) return parseRule(grammar[rule.type], rule.type, endToken);

    // we should never reach this point
    throw new ParseError("No matching rule found");
  };

  // const parseExpression = (precedence: number) => {
  //   let expression = parseRule(grammar.EXPRESSION, "EXPRESSION");

  //   // lets peek at the next token and if it's an operator, lets continue parsing;
  //   const nextToken = tokens.peek();
  //   const operatorPrecedence = {
  //     "+": 1,
  //     "-": 1,
  //     "*": 2,
  //     "/": 2,
  //     "%": 2,
  //   };

  //   while (nextToken && nextToken.type === "operator") {
  //     let operator = nextToken.value;
  //     let precedence =
  //       operatorPrecedence[operator as keyof typeof operatorPrecedence];

  //     // if (precedence > currentPrecedence) {
  //     // }
  //   }
  // };

  try {
    return parseRule(grammar.SCRIPT, "SCRIPT") as ASTResult;
  } catch (e) {
    if (e instanceof ParseError) {
      const token = e.token;
      const location = token ? ` at line ${token.line}:${token.column}` : "";

      // lets grab the line of code that the error occurred on
      const line = token?.line;
      let lineOfCode;

      if (line) {
        lineOfCode = tokens.getLinesOfCode(line - 2, line);

        // get the column of the first "|" character so we can repeat the spaces for the column
        const column = lineOfCode.indexOf("|") + 2;
        lineOfCode += "\n" + " ".repeat(column + token?.column - 1) + "^"; // repeat spaces for column
      }

      e.message = `${e.message}${location}\n\n${lineOfCode}\n`;
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
};
