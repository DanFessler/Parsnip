type TokenType =
  | "keyword"
  | "number"
  | "operator"
  | "bracket"
  | "comment"
  | "string"
  | "whitespace"
  | "identifier";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const keywords = [
  "when",
  "flag",
  "clicked",
  "key",
  "pressed",
  "backdrop",
  "switches",
  "to",
];
const operators = ["+", "-", "*", "/", ">", "<", "="];
const brackets = ["(", ")", "[", "]", "{", "}"];

export function lex(input: string): TokenStream {
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
      tokens.push({ type: "whitespace", value, line, column: startColumn });
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
      tokens.push({ type: "comment", value, line, column: startColumn });
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
      tokens.push({ type: "number", value, line, column: startColumn });
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
      value += input[current];
      current++;
      column++;
      tokens.push({ type: "string", value, line, column: startColumn });
      continue;
    }

    // Handle operators
    if (operators.includes(char)) {
      tokens.push({ type: "operator", value: char, line, column });
      current++;
      column++;
      continue;
    }

    // Handle brackets
    if (brackets.includes(char)) {
      tokens.push({ type: "bracket", value: char, line, column });
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
      tokens.push({ type, value, line, column: startColumn });
      continue;
    }

    // Skip unknown characters
    current++;
    column++;
  }

  return createTokenStream(
    tokens.filter((token) => token.type !== "whitespace")
  );
}

interface TokenStream {
  peek: () => Token | undefined;
  consume: () => Token;
  position: () => number;
  seek: (position: number) => void;
}

class TokenStreamImpl implements TokenStream {
  private position_: number = 0;

  constructor(private tokens: Token[]) {}

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
}

export function createTokenStream(tokens: Token[]): TokenStream {
  return new TokenStreamImpl(tokens);
}
