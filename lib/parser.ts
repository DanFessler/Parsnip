import {
  Grammar,
  Rule,
  Token,
  TokenStream,
  ASTNode,
  ASTResult,
} from "./types";
import { defaultLexOptions, lex, type LexOptions } from "./lexer";

/** Optional hooks for `Parser.parse` (LTPB-style lexers, normalization, etc.). */
export type ParserParseOptions = {
  lexOptions?: LexOptions;
  /** Applied to the source string before lexing. Default: identity. */
  normalizeInput?: (source: string) => string;
};

export function collectGrammarKeywords(grammar: Grammar): string[] {
  const keywords = new Set<string>();
  function walkRule(rule: Rule | string) {
    if (typeof rule === "string") {
      keywords.add(rule);
      return;
    }
    if (Array.isArray(rule.sequence))
      rule.sequence.forEach(walkRule);
    if (Array.isArray(rule.options))
      rule.options.forEach(walkRule);
    if (rule.until)
      typeof rule.until === "string"
        ? keywords.add(rule.until)
        : walkRule(rule.until);
  }
  Object.values(grammar).forEach(walkRule);
  return Array.from(keywords);
}

/**
  The general idea behind this parser is it takes a token stream and
  parses it given a rule defined in the grammar. We assume the first
  rule to be a script, and it'll recursively traverse the grammar rule
  graph until we reach a primative. Some rules have special parsing
  logic, like repeat, optional, sequence, and options. These are
  handled by the sub parsers.
*/

// TODO:
// should provide a way to configure ignored tokens (or maybe even whole rules?)
// the lexer should analyze the grammar to extract patterns instead of a separate definition

class ParseError extends Error {
  constructor(
    message: string,
    public token?: Token,
    public expected?: string,
    public exit?: boolean,
  ) {
    super(message);
    this.name = "ParseError";
    this.token = token;
    this.exit = exit;
  }
}

class Parser {
  private tokens: TokenStream;
  private grammar: Grammar;
  private debug: boolean;
  /** Derived from `LexOptions.newlineBridgeBeforeKeywordRules` (lowercased). */
  private newlineBridgeKeywordSet: Set<string> | null = null;

  constructor(grammar: Grammar, debug = false) {
    this.grammar = grammar;
    this.debug = debug;
    this.tokens = lex("");
  }

  parse(
    program: string,
    rule: string = "SCRIPT",
    parseOptions?: ParserParseOptions,
  ): ASTResult {
    const keywords = collectGrammarKeywords(this.grammar);
    const src = parseOptions?.normalizeInput
      ? parseOptions.normalizeInput(program)
      : program;
    const lexOpts = { ...defaultLexOptions, ...parseOptions?.lexOptions };
    const br = lexOpts.newlineBridgeBeforeKeywordRules;
    this.newlineBridgeKeywordSet =
      lexOpts.emitNewlineTokens && br && br.length > 0
        ? new Set(br.map((k) => k.toLowerCase()))
        : null;
    const tokens = lex(src, keywords, lexOpts);
    this.tokens = tokens;
    if (this.debug) console.log("tokens", this.tokens);

    return this.parseWithCurrentStream(rule);
  }

  /** Parse an existing token stream (e.g. after custom lex + filtering). The stream must support `getLinesOfCode` if you rely on error context. */
  parseFromStream(
    stream: TokenStream,
    rule: string = "SCRIPT",
    parseOptions?: ParserParseOptions,
  ): ASTResult {
    const lexOpts = { ...defaultLexOptions, ...parseOptions?.lexOptions };
    const br = lexOpts.newlineBridgeBeforeKeywordRules;
    this.newlineBridgeKeywordSet =
      lexOpts.emitNewlineTokens && br && br.length > 0
        ? new Set(br.map((k) => k.toLowerCase()))
        : null;
    this.tokens = stream;
    if (this.debug) console.log("tokens", this.tokens);
    return this.parseWithCurrentStream(rule);
  }

  /**
   * After a full SCRIPT parse, reject streams that still have significant tokens.
   * Otherwise a failed STMT mid-file can leave the rest of the program unparsed silently.
   */
  assertNoTrailingInput(): void {
    let peek = this.tokens.peek();
    while (
      peek?.type === "comment" ||
      peek?.type === "whitespace" ||
      peek?.type === "newline"
    ) {
      this.tokens.consume();
      peek = this.tokens.peek();
    }
    if (peek) {
      throw new ParseError(
        `Unexpected token after end of script: '${peek.value}'`,
        peek,
      );
    }
  }

  private parseWithCurrentStream(rule: string): ASTResult {
    try {
      return this.parseRule(this.grammar[rule as keyof Grammar], rule);
    } catch (e) {
      if (!(e instanceof ParseError)) throw e;

      const token = e.token;
      const line = token?.line;
      const location = token ? ` at line ${token.line}:${token.column}` : "";

      let lineOfCode;
      if (line) {
        lineOfCode = this.tokens.getLinesOfCode(line - 2, line);
        const column = lineOfCode.indexOf("|") + 2;
        lineOfCode += "\n" + " ".repeat(column + token?.column - 1) + "^";
      }

      e.message = `${e.message}${location}\n\n${lineOfCode}\n`;

      throw e;
    }
  }

  private parseKeyword(rule: string): ASTResult {
    if (rule === "\n") {
      const token = this.tokens.consume();
      if (token.type !== "newline" || String(token.value) !== "\n") {
        throw new ParseError("Expected newline", token);
      }
      if (!this.debug) return;
      return {
        type: "KEYWORD",
        value: "\n",
        line: token.line,
        column: token.column,
      };
    }

    if (this.newlineBridgeKeywordSet?.has(rule.toLowerCase())) {
      let p = this.tokens.peek();
      while (p?.type === "newline") {
        this.tokens.consume();
        p = this.tokens.peek();
      }
      while (p?.type === "comment" || p?.type === "whitespace") {
        this.tokens.consume();
        p = this.tokens.peek();
      }
      if (!p) throw new ParseError("Unexpected end of input");
    }

    const token = this.tokens.consume();
    const value = token.value as string;

    // regex to test if rule is a alphanumeric string
    // we do this because the parser considers any primitive string a keyword
    // so we need to make sure the rule is actually a keyword
    // TODO: this is a hack and should be fixed
    const isAlphaNumeric = /^[a-zA-Z0-9]+$/.test(rule);
    if (token.type === "keyword" && !isAlphaNumeric) {
      throw new ParseError(`Unexpected keyword '${value}'`, token);
    }

    // if the value is not the same as the rule (case insensitive), throw an error
    if (value.toLowerCase() !== rule.toLowerCase()) {
      throw new ParseError(`Expected '${rule}' but got '${value}'`, token);
    }

    // if we're not in debug mode, we don't need to return keywords as nodes
    // they're mostly just extra noise, however if we wanted to reproduce the
    // source from the AST, we would need every last token represented in the AST.
    if (!this.debug) return;

    return {
      type: "KEYWORD",
      value: token.value,
      line: token.line,
      column: token.column,
    };
  }

  private parsePrimitiveRule(rule: Rule): string | number {
    if (!rule.parse) {
      throw new ParseError("Expected a subparser function for literal");
    }

    const token = this.tokens.consume();

    // try the parse function
    // the supplied parser is responsible for throwing an error if the token is not expected
    try {
      return rule.parse!(token);
    } catch (e) {
      throw new ParseError(e as string, token);
    }
  }

  private parseRepeatingRule(
    rule: Rule,
    currentType: string,
    endToken?: Rule | string,
  ): ASTResult {
    const stopLookahead = rule.until ?? endToken;

    const result: ASTResult = [];
    while (true) {
      // if end of input, break
      if (!this.tokens.peek()) break;

      // First try to parse the endToken / until lookahead
      // even though we're parsing it here, we reset because we'll parse it again
      // as part of the parent "sequence" rule that the endToken originally came from
      if (stopLookahead) {
        const position = this.tokens.position();
        try {
          if (typeof stopLookahead === "string") {
            this.parseRule(stopLookahead, currentType, stopLookahead);
          } else {
            this.parseRule(stopLookahead, currentType);
          }
          // If we successfully parsed the endToken, break the loop
          this.tokens.seek(position);
          break;
        } catch (e) {
          // If parsing endToken fails, restore position and continue with normal parsing
          this.tokens.seek(position);
        }
      }

      const iterationStart = this.tokens.position();
      try {
        const strippedRule = { ...rule, repeat: false };
        const parsed = this.parseRule(strippedRule, currentType, endToken);
        if (parsed) result.push(parsed as ASTNode);
      } catch (e) {
        if (e instanceof ParseError) {
          if (e.exit) throw e;
          this.tokens.seek(iterationStart);
          break;
        }
        throw e;
      }
    }

    return result;
  }

  private parseOptionalRule(
    rule: Rule,
    currentType: string,
    endToken?: Rule | string,
  ): ASTResult {
    if (!rule.optional) throw new ParseError("Expected a optional for rule");

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

  private parseSequenceRule(rule: Rule, currentType: string): ASTResult {
    if (!rule.sequence)
      throw new ParseError("Expected a sequence for rule", this.tokens.peek());

    // loop through the sequence of rules and parse them. we track the next token to use as the endToken if the current rule is a repeating rule
    const result: ASTResult = [];
    const startToken = this.tokens.peek();

    if (!startToken)
      throw new ParseError("Unexpected end of input", startToken);

    // for (const currentRule of rule.sequence!) {
    for (let i = 0; i < rule.sequence.length; i++) {
      const currentRule = rule.sequence[i];
      const nextRule = rule.sequence[i + 1];
      const parsed = this.parseRule(currentRule, currentType, nextRule);
      if (parsed) result.push(parsed as ASTNode);
    }

    // if the result is a single element, return the element, otherwise return the array.
    // we do this because some sequences have tokens that we dont care about in the resulting AST
    // such as keywords, separators, etc. so if there's only one element, we can just return that.
    return result.length === 1 ? result[0] : result;
  }

  private parseOptionsRule(
    rule: Rule,
    currentType: string,
    endToken?: Rule | string,
  ): ASTResult {
    if (!rule.options) throw new ParseError("Expected options for rule");

    // we add the ignore rule to the options so we can ignore comments and whitespace (or whatever else we want)
    const theseOptions = rule.options;
    // const theseOptions = [...rule.options, this.grammar._IGNORE];

    // Try each option until one succeeds
    let furthestError: ParseError | undefined;
    let furthestErrorCount = 0;
    const position = this.tokens.position();
    for (const option of theseOptions) {
      try {
        return this.parseRule(option, currentType, endToken);
      } catch (e) {
        if (e instanceof ParseError) {
          if (!furthestError) {
            furthestError = e;
            furthestErrorCount = 1;
          } else if (
            e.token &&
            furthestError.token &&
            e.token.index >= furthestError.token.index
          ) {
            furthestError = e;

            // if the new error is at the same depth, we increment the count
            if (e.token.index > furthestError.token!.index) {
              furthestErrorCount = 1;
            } else {
              furthestErrorCount++;
            }
          }

          // Check if we should exit early
          if (e.exit) throw e;

          // otherwise, restore position and continue
          this.tokens.seek(position);
          continue;
        }
        throw e;
      }
    }

    // If multiple options failed at the furthest depth, report a single error for the current type we're parsing
    if (furthestErrorCount > 1) {
      throw new ParseError(
        `Expected ${currentType} but got ${furthestError!.token?.value}`,
        furthestError!.token,
      );
    }

    // otherwise we can throw the more specific error that we encountered further down the tree
    throw furthestError!;
  }

  // prettier-ignore
  private parseRule(
    rule: Rule | string,
    currentType: string,
    endToken?: Rule | string
  ): ASTResult {
    if (this.debug) console.log("rule", rule, this.tokens.peek());

    // ignore comments and whitespace
    let peek = this.tokens.peek();
    while (peek?.type === "comment" || peek?.type === "whitespace") {
      this.tokens.consume();
      peek = this.tokens.peek();
    }

    // if the rule is a string, parse it as a keyword
    if (typeof rule === "string") {
      if (!peek) throw new ParseError("Unexpected end of input");
      return this.parseKeyword(rule);
    }

    // if the rule is a capture rule, strip the capture rule and reparse
    if (rule.capture) {
      const strippedRule = { ...rule, capture: false };
      const head = this.tokens.peek();
      const { line, column } = head ?? { line: 0, column: 0 };
      const position = { line, column };
      const parsed = this.parseRule(strippedRule, currentType, endToken);

      return {
        type: rule.type,
        value: parsed,
        ...position,
      } as ASTNode;
    }

    // Optional / repeat may succeed at EOF (optional parts, zero-or-more loops)
    if (rule.optional) {
      return this.parseOptionalRule(rule, currentType, endToken);
    }
    if (rule.repeat) {
      return this.parseRepeatingRule(rule, currentType, endToken);
    }

    if (!this.tokens.peek()) {
      throw new ParseError("Unexpected end of input");
    }

    if (rule.parse) return this.parsePrimitiveRule(rule);
    if (rule.sequence) return this.parseSequenceRule(rule, currentType);
    if (rule.options) return this.parseOptionsRule(rule, currentType, endToken);

    if (rule.type)
      return this.parseRule(this.grammar[rule.type as keyof Grammar], rule.type, endToken);

    throw new ParseError("No matching rule found");
  }
}

export { lex, createTokenStream, type LexOptions } from "./lexer";
export type { Token, TokenStream, Grammar, Rule } from "./types";
export { Parser, ParseError };
