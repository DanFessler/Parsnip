import { Token, TokenStream } from "./types";

const operators = ["+", "-", "*", "/", ">", "<", "=", "%"];
const brackets = ["(", ")", "[", "]", "{", "}"];

export function lex(input: string, keywords: string[] = []): TokenStream {
  const tokens: Token[] = [];
  let current = 0;
  let line = 1;
  let column = 1;

  while (current < input.length) {
    const char = input[current];

    // Handle whitespace
    if (/\s/.test(char)) {
      let value = "";
      const startColumn = column;
      while (current < input.length && /\s/.test(input[current])) {
        if (input[current] === "\n") {
          line++;
          column = 1;
        } else {
          column++;
        }
        value += input[current];
        current++;
      }
      tokens.push({
        type: "whitespace",
        value,
        line,
        column: startColumn,
        index: current,
      });
      continue;
    }

    // Handle comments
    if (char === "/" && input[current + 1] === "/") {
      let value = "";
      const startColumn = column;
      while (current < input.length && input[current] !== "\n") {
        value += input[current];
        current++;
        column++;
      }
      tokens.push({
        type: "comment",
        value,
        line,
        column: startColumn,
        index: current,
      });
      continue;
    }

    // Handle numbers (including signed numbers)
    if (
      /[0-9]/.test(char) ||
      ((char === "+" || char === "-") && /[0-9]/.test(input[current + 1]))
    ) {
      let value = "";
      const startColumn = column;

      // Handle sign if present
      if (char === "+" || char === "-") {
        value += char;
        current++;
        column++;
      }

      while (current < input.length && /[0-9.]/.test(input[current])) {
        value += input[current];
        current++;
        column++;
      }
      tokens.push({
        type: "number",
        value,
        line,
        column: startColumn,
        index: current,
      });
      continue;
    }

    // Handle strings
    if (char === '"') {
      let value = char;
      const startColumn = column;
      current++;
      column++;
      while (current < input.length && input[current] !== '"') {
        if (input[current] === "\n") {
          line++;
          column = 1;
        } else {
          column++;
        }
        value += input[current];
        current++;
      }

      if (current >= input.length) {
        const error = new Error(
          `Unterminated string literal at line ${line}:${startColumn}`
        );
        error.name = "LexerError";
        throw error;
      }

      value += input[current];
      current++;
      column++;
      tokens.push({
        type: "string",
        value,
        line,
        column: startColumn,
        index: current,
      });
      continue;
    }

    // Handle operators
    if (operators.includes(char)) {
      tokens.push({
        type: "operator",
        value: char,
        line,
        column,
        index: current,
      });
      current++;
      column++;
      continue;
    }

    // Handle brackets
    if (brackets.includes(char)) {
      tokens.push({
        type: "bracket",
        value: char,
        line,
        column,
        index: current,
      });
      current++;
      column++;
      continue;
    }

    // Handle keywords and identifiers
    if (/[a-zA-Z]/.test(char)) {
      let value = "";
      const startColumn = column;
      while (current < input.length && /[a-zA-Z0-9]/.test(input[current])) {
        value += input[current];
        current++;
        column++;
      }
      const type = keywords.includes(value) ? "keyword" : "identifier";
      tokens.push({
        type,
        value,
        line,
        column: startColumn,
        index: current,
      });
      continue;
    }

    // Skip unknown characters
    current++;
    column++;
  }

  return createTokenStream(
    tokens.filter((token) => token.type !== "whitespace"),
    input
  );
}

class TokenStreamImpl implements TokenStream {
  private position_: number = 0;

  constructor(private tokens: Token[], private text: string) {}

  peek(): Token | undefined {
    return this.tokens[this.position_];
  }

  consume(): Token {
    if (this.position_ >= this.tokens.length) {
      throw new Error("Unexpected end of input");
    }
    return this.tokens[this.position_++];
  }

  position(): number {
    return this.position_;
  }

  seek(position: number): void {
    if (position < 0 || position > this.tokens.length) {
      throw new Error("Invalid seek position");
    }
    this.position_ = position;
  }

  getTokens(): Token[] {
    return this.tokens;
  }

  getLinesOfCode(start: number, end?: number): string {
    if (start < 1) start = 1;
    if (!end) end = start;
    return this.text
      .split("\n")
      .map((line, i) => {
        // take the end line number and count its digits
        const endDigits = end ? end.toString().length : 0;

        // prefix line number with spaces to match the end line number
        let repeatCount = endDigits - (i + 1).toString().length;
        if (repeatCount < 0) repeatCount = 0; // TODO: I need to think through why this is needed
        const prefix = " ".repeat(repeatCount);

        // format the line
        return `${prefix}${i + 1} | ${line}`;
      })
      .slice(start - 1, end)
      .join("\n");
  }
}

export function createTokenStream(tokens: Token[], text: string): TokenStream {
  return new TokenStreamImpl(tokens, text);
}
