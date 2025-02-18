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

type ASTResult = ASTNode | ASTNode[] | string | number | undefined;

/**
  The general idea behind this parser is it takes a token stream and
  parses it given a rule defined in the grammar. We assume the first
  rule to be a script, and it'll recursively traverse the grammar rule
  graph until we reach a primative. Some rules have special parsing
  logic, like repeat, optional, sequence, and options. These are
  handled by the sub parsers.
*/

// TODO:
// Add unit tests
// the lexer should analyze the grammar to extract patterns instead of a separate definition
// BUG: the last statement in a script isn't parsed

class Parser {
  private tokens: TokenStream;
  private grammar: Grammar;
  private debug: boolean;

  constructor(grammar: Grammar, debug = false) {
    this.grammar = grammar;
    this.debug = debug;
    this.tokens = lex("");
  }

  parse(program: string): ASTResult {
    const keywords = this.findKeywords(this.grammar);
    const tokens = lex(program, keywords);
    this.tokens = tokens;

    try {
      return this.parseRule(this.grammar.SCRIPT, "SCRIPT");
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

  // function to find all keywords in the grammar
  // it walks the tree till it finds a string instead of a rule object
  // and adds it to an array.
  private findKeywords(grammar: Grammar): string[] {
    const keywords = new Set<string>();

    // Helper function to recursively walk through rules
    function walkRule(rule: Rule | string) {
      if (typeof rule === "string") {
        return keywords.add(rule);
      }
      rule.sequence?.forEach(walkRule);
      rule.options?.forEach(walkRule);
    }

    // Walk through all rules in the grammar
    Object.values(grammar).forEach(walkRule);

    return Array.from(keywords);
  }

  private parseKeyword(rule: string): ASTResult {
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
    endToken?: Rule | string
  ): ASTResult {
    // The endToken must be a primitive string, not a rule, since we don't parse the endToken
    // this means any repeating rule must have an endToken that is a primitive string in the
    // grammar or have one loaned to it from a parent rule.
    if (typeof endToken !== "string" && endToken !== undefined) {
      throw new ParseError("Expected a string for endToken");
    }

    // keep going until we find the endToken or the end of the token stream
    const result: ASTResult = [];
    while (
      this.tokens.peek() && // prettier-ignore
      this.tokens.peek()?.value !== endToken
    ) {
      try {
        // we strip out the repeat from the rule so we can parse it as normal without a feedback loop
        const strippedRule = { ...rule, repeat: false };
        const parsed = this.parseRule(strippedRule, currentType, endToken);
        if (parsed) result.push(parsed as ASTNode);
      } catch (e) {
        // if the error is from a repeating rule, we want to exit entirely so we can report the error
        // to the user even if we're in nested script blocks. Otherwise reported errors won't be accurate.
        if (e instanceof ParseError) {
          e.exit = true;
          throw e;
        }
      }
    }

    return result;
  }

  private parseOptionalRule(
    rule: Rule,
    currentType: string,
    endToken?: Rule | string
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
    endToken?: Rule | string
  ): ASTResult {
    if (!rule.options) throw new ParseError("Expected options for rule");

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

          // Check if we should exit early
          if (e.exit) throw e;

          // otherwise, restore position and continue
          this.tokens.seek(position);
          continue;
        }
        throw e;
      }
    }

    // TODO: Error reporting for this could be improved
    // right now it always reports a singular furthest error
    // but if there were multiple at the same depth, then we should report
    // a special error that's more general.

    // If no options succeeded, throw the furthest error
    throw furthestError;
  }

  // prettier-ignore
  private parseRule(
    rule: Rule | string,
    currentType: string,
    endToken?: Rule | string
  ): ASTResult {

    // if we've reached the end of the token stream and there's no rule to parse, throw an error
    if (!this.tokens.peek()) throw new ParseError("Unexpected end of input");

    // ignore comments
    while (this.tokens.peek()?.type === "comment") {
      this.tokens.consume();
    }

    // if the rule is a string, parse it as a keyword
    if (typeof rule === "string") return this.parseKeyword(rule);

    // if the rule is a capture rule, strip the capture rule and reparse
    if (rule.capture) {
      const strippedRule = { ...rule, capture: false };
      const parsed = this.parseRule(strippedRule, currentType, endToken);
      const {line, column} = this.tokens.peek()!;
      const position = this.debug ? {line, column} : {};
      return {
        type: currentType,
        value: parsed,
        ...position,
      } as ASTNode;
    }
    
    // otherwise parse with the appropriate subparser based on the rule's properties
    if (rule.parse)    return this.parsePrimitiveRule(rule);
    if (rule.sequence) return this.parseSequenceRule(rule, currentType);
    if (rule.repeat)   return this.parseRepeatingRule(rule, currentType, endToken);
    if (rule.optional) return this.parseOptionalRule(rule, currentType, endToken);
    if (rule.options)  return this.parseOptionsRule(rule, currentType, endToken);

    // if we made it this far, then we need to recursively parse with the referenced rule
    if (rule.type) return this.parseRule(this.grammar[rule.type], rule.type, endToken);
    
    // if we didn't find a matching rule, throw an error
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
