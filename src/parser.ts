import { Grammar, Rule } from "./grammar";
import { lex, Token, TokenStream } from "./lexer";

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

/**
  The general idea behind this parser is it takes a token stream and
  parses it given a rule defined in the grammar. We assume the first
  rule to be a script, and it'll recursively traverse the grammar rule
  graph until we reach a primative. Some rules have special parsing
  logic, like repeat, optional, sequence, and options. These are
  handled by the sub parsers.
*/

// TODO:
// properly report unterminated strings
// report reserved keywords as errors
// I should probably have an explicit way to specify if a rule should be "captured" instead of assumed

class Parser {
  private tokens: TokenStream;
  private grammar: Grammar;
  private debug: boolean;

  constructor(grammar: Grammar, debug = false) {
    this.grammar = grammar;
    this.debug = debug;
  }

  parse(program: string): ASTResult {
    const tokens = lex(program);
    this.tokens = tokens;

    try {
      return this.parseRule(this.grammar.SCRIPT, "SCRIPT");
    } catch (e) {
      if (e instanceof ParseError) {
        const token = e.token;
        const location = token ? ` at line ${token.line}:${token.column}` : "";
        const line = token?.line;
        let lineOfCode;

        if (line) {
          lineOfCode = this.tokens.getLinesOfCode(line - 2, line);
          const column = lineOfCode.indexOf("|") + 2;
          lineOfCode += "\n" + " ".repeat(column + token?.column - 1) + "^";
        }

        e.message = `${e.message}${location}\n\n${lineOfCode}\n`;
      }
      throw e;
    }
  }

  private parseKeyword(
    rule: string,
    currentToken: Token | undefined
  ): ASTResult {
    if (currentToken?.value !== rule) {
      throw new ParseError(
        `Expected '${rule}' but got '${currentToken?.value}'`,
        currentToken
      );
    }
    const token = this.tokens.consume();
    return this.debug
      ? {
          type: "KEYWORD",
          value: token.value,
          line: token.line,
          column: token.column,
        }
      : undefined;
  }

  private parsePrimitiveRule(rule: Rule): ASTResult {
    if (!rule.parse) {
      throw new ParseError("Expected a subparser function for literal");
    }

    const token = this.tokens.consume();

    const position = this.debug
      ? {
          line: token.line,
          column: token.column,
        }
      : {};

    try {
      return {
        type: token.type,
        value: rule.parse!(token),
        ...position,
      } as ASTNode;
    } catch (e) {
      throw new ParseError(e as string, token);
    }
  }

  private parseRepeatingRule(
    rule: Rule | string,
    currentType: string,
    endToken?: Rule | string
  ): ASTResult {
    if (typeof rule === "string") {
      throw new ParseError("Expected a rule object for repeat");
    }

    // if the endToken is not a string or undefined we should throw an error
    if (typeof endToken !== "string" && endToken !== undefined) {
      throw new ParseError("Expected a string for endToken");
    }

    const result: ASTResult = [];
    // keep going until we find the endToken or the end of the token stream
    let peek = this.tokens.peek();
    while (peek && peek?.value !== endToken) {
      try {
        // we strip out the repeat from the rule so we can parse it as normal without a feedback loop
        const newRule = { ...rule, repeat: false };
        const parsed = this.parseRule(newRule, currentType, endToken);
        if (parsed) result.push(parsed as ASTNode);
      } catch (e) {
        if (e instanceof ParseError) {
          // if the error is from a repeating rule, we want to throw it immediately so we can report the error
          // to the user even if we're in nested script blocks.
          e.exit = true;
          throw e;
        }
      }
      peek = this.tokens.peek();
    }

    return result;
  }

  private parseOptionalRule(
    rule: Rule | string,
    currentType: string,
    endToken?: Rule | string
  ): ASTResult {
    if (typeof rule === "string") {
      throw new ParseError("Expected a rule object for optional");
    }

    if (!rule.optional) {
      throw new ParseError("Expected a optional for rule");
    }

    const position = this.tokens.position();
    try {
      // Try to parse the rule normally
      // strip optional from the rule so we can parse it as normal without a feedback loop
      const newRule = { ...rule, optional: false };
      const result = this.parseRule(newRule, currentType, endToken);
      return result;
    } catch (e) {
      if (e instanceof ParseError) {
        // If parsing fails, restore position and return undefined
        this.tokens.seek(position);
        return;
      }
      throw e;
    }
  }

  private parseSequenceRule(
    rule: Rule | string,
    currentType: string
  ): ASTResult {
    if (typeof rule === "string") {
      throw new ParseError("Expected a rule object for sequence");
    }

    if (!rule.sequence) {
      throw new ParseError("Expected a sequence for rule");
    }

    // loop through the sequence of rules and parse them. we track the next token to use as the endToken if the current rule is a repeating rule
    const result: ASTResult = [];
    const startToken = this.tokens.peek();
    for (const currentRule of rule.sequence!) {
      // lets peek at the next item in the rule sequence (if any) to identify an endToken for interrupting any repeating rules
      const nextRule = rule.sequence[rule.sequence.indexOf(currentRule) + 1];
      const parsed = this.parseRule(currentRule, currentType, nextRule);
      if (parsed) result.push(parsed as ASTNode);
    }

    const position = this.debug
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
  }

  private parseOptionsRule(
    rule: Rule | string,
    currentType: string,
    endToken?: Rule | string
  ): ASTResult {
    if (typeof rule === "string") {
      throw new ParseError("Expected a rule object for options");
    }

    if (!rule.options) {
      throw new ParseError("Expected options for rule");
    }

    // Try each option until one succeeds
    let furthestError: ParseError | undefined;

    const position = this.tokens.position();
    for (const option of rule.options!) {
      try {
        return this.parseRule(option, currentType, endToken);
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

          this.tokens.seek(position);
          continue;
        }
        throw e;
      }
    }

    throw furthestError;
  }

  private parseRule(
    rule: Rule | string,
    currentType: string,
    endToken?: Rule | string
  ): ASTResult {
    const currentToken = this.tokens.peek();

    // if we've reached the end of the token stream and there's no rule to parse, throw an error
    if (!currentToken) throw new ParseError("Unexpected end of input");

    // ignore comments
    while (this.tokens.peek()?.type === "comment") {
      this.tokens.consume();
    }

    // parse primatives
    if (typeof rule === "string") return this.parseKeyword(rule, currentToken);
    if (rule.parse) return this.parsePrimitiveRule(rule);
    if (rule.repeat)
      return this.parseRepeatingRule(rule, currentType, endToken);
    if (rule.optional)
      return this.parseOptionalRule(rule, currentType, endToken);
    if (rule.sequence) return this.parseSequenceRule(rule, currentType);
    if (rule.options) return this.parseOptionsRule(rule, currentType, endToken);
    if (rule.type)
      return this.parseRule(this.grammar[rule.type], rule.type, endToken);

    throw new ParseError("No matching rule found");
  }
}

export {
  Parser,
  ParseError,
  type Token,
  type TokenStream,
  type Rule,
  type ASTNode,
};
