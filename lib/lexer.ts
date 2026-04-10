import { Token, TokenStream } from "./types";

const defaultOperators = ["+", "-", "*", "/", ">", "<", "=", "%"];
const defaultBrackets = ["(", ")", "[", "]", "{", "}", ",", ":"];

/** Options for `lex()`. Defaults match original Parsnip behavior. */
export type LexOptions = {
  slashSlashComments?: boolean;
  /** `'` starts a line comment to end of line (typical BASIC). */
  apostropheLineComments?: boolean;
  /** `Rem` at token start, rest of line is comment (case-insensitive). */
  remLineComments?: boolean;
  /** Allow `$` at end of identifiers (e.g. `a$`, `Inkey$`). */
  allowDollarInIdentifier?: boolean;
  /** Recognize `<>`, `<=`, `>=` as single operator tokens. */
  multiCharComparisons?: boolean;
  /** Extra single-character operator tokens (e.g. `;` for BASIC `Print a; b`). */
  additionalOperators?: string[];
  /**
   * Emit each line break as its own `newline` token (value `"\n"`). Horizontal
   * whitespace stays `whitespace`. Lets grammars match `"\\n"` as a primitive.
   */
  emitNewlineTokens?: boolean;
  /**
   * When `emitNewlineTokens` is true, the parser may skip leading `newline`
   * tokens (and following whitespace/comments) immediately before matching these
   * string keyword rules (rule text compared case-insensitively). Empty/omitted:
   * no bridging — use explicit `"\\n"` in the grammar instead.
   *
   * This is not enabled by default so one-line vs multiline constructs that rely
   * on a newline *not* being skipped (e.g. `If c Then` + newline + block) stay
   * unambiguous; each host language opts into the keywords it needs (`until`
   * targets, block closers, etc.).
   */
  newlineBridgeBeforeKeywordRules?: readonly string[] | null;
};

/** Defaults merged with `options` inside `lex()`. Exported for `Parser.parse` / `parseFromStream` option merge. */
export const defaultLexOptions: Required<Omit<LexOptions, "additionalOperators">> & {
  additionalOperators: string[];
} = {
  slashSlashComments: true,
  apostropheLineComments: false,
  remLineComments: false,
  allowDollarInIdentifier: false,
  multiCharComparisons: false,
  additionalOperators: [],
  emitNewlineTokens: false,
  newlineBridgeBeforeKeywordRules: null,
};

export function lex(
  input: string,
  keywords: string[] = [],
  options: LexOptions = {}
): TokenStream {
  const opts = { ...defaultLexOptions, ...options };
  const operators = [...defaultOperators, ...opts.additionalOperators];
  const keywordSet = new Set(keywords.map((k) => k.toLowerCase()));
  const tokens: Token[] = [];
  let current = 0;
  let line = 1;
  let column = 1;

  const pushComment = (value: string, startColumn: number) => {
    tokens.push({
      type: "comment",
      value,
      line,
      column: startColumn,
      index: current,
    });
  };

  while (current < input.length) {
    const char = input[current];

    if (/\s/.test(char)) {
      if (opts.emitNewlineTokens) {
        const lineBreak = () => {
          const startColumn = column;
          if (char === "\r" && input[current + 1] === "\n") {
            tokens.push({
              type: "newline",
              value: "\n",
              line,
              column: startColumn,
              index: current + 2,
            });
            current += 2;
          } else {
            tokens.push({
              type: "newline",
              value: "\n",
              line,
              column: startColumn,
              index: current + 1,
            });
            current += 1;
          }
          line++;
          column = 1;
        };

        if (char === "\r" || char === "\n") {
          lineBreak();
          continue;
        }
        let value = "";
        const startColumn = column;
        while (current < input.length) {
          const c0 = input[current];
          if (c0 === "\n" || c0 === "\r") break;
          if (!/\s/.test(c0)) break;
          value += c0;
          current++;
          column++;
        }
        if (value) {
          tokens.push({
            type: "whitespace",
            value,
            line,
            column: startColumn,
            index: current,
          });
        }
        continue;
      }

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

    if (opts.apostropheLineComments && char === "'") {
      let value = "";
      const startColumn = column;
      while (current < input.length && input[current] !== "\n") {
        value += input[current];
        current++;
        column++;
      }
      pushComment(value, startColumn);
      continue;
    }

    if (
      opts.slashSlashComments &&
      char === "/" &&
      input[current + 1] === "/"
    ) {
      let value = "";
      const startColumn = column;
      while (current < input.length && input[current] !== "\n") {
        value += input[current];
        current++;
        column++;
      }
      pushComment(value, startColumn);
      continue;
    }

    const lastSig = [...tokens]
      .reverse()
      .find(
        (t) =>
          t.type !== "whitespace" &&
          t.type !== "comment" &&
          t.type !== "newline",
      );
    const allowSignedNumber =
      !lastSig ||
      lastSig.type === "operator" ||
      lastSig.type === "keyword" ||
      lastSig.type === "newline" ||
      (lastSig.type === "bracket" &&
        [",", "(", "[", "{"].includes(String(lastSig.value)));

    if (
      /[0-9]/.test(char) ||
      ((char === "+" || char === "-") &&
        /[0-9]/.test(input[current + 1]) &&
        allowSignedNumber)
    ) {
      let value = "";
      const startColumn = column;

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

    if (opts.multiCharComparisons) {
      if (input[current] === "<" && input[current + 1] === ">") {
        tokens.push({
          type: "operator",
          value: "<>",
          line,
          column,
          index: current + 2,
        });
        current += 2;
        column += 2;
        continue;
      }
      if (input[current] === "<" && input[current + 1] === "=") {
        tokens.push({
          type: "operator",
          value: "<=",
          line,
          column,
          index: current + 2,
        });
        current += 2;
        column += 2;
        continue;
      }
      if (input[current] === ">" && input[current + 1] === "=") {
        tokens.push({
          type: "operator",
          value: ">=",
          line,
          column,
          index: current + 2,
        });
        current += 2;
        column += 2;
        continue;
      }
    }

    if (operators.includes(char)) {
      tokens.push({
        type: "operator",
        value: char,
        line,
        column,
        index: current + 1,
      });
      current++;
      column++;
      continue;
    }

    if (defaultBrackets.includes(char)) {
      tokens.push({
        type: "bracket",
        value: char,
        line,
        column,
        index: current + 1,
      });
      current++;
      column++;
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let value = "";
      const startColumn = column;
      while (
        current < input.length &&
        /[a-zA-Z0-9]/.test(input[current])
      ) {
        value += input[current];
        current++;
        column++;
      }
      if (
        opts.allowDollarInIdentifier &&
        current < input.length &&
        input[current] === "$"
      ) {
        value += "$";
        current++;
        column++;
      }

      if (opts.remLineComments && value.toLowerCase() === "rem") {
        let remVal = value;
        while (current < input.length && input[current] !== "\n") {
          remVal += input[current];
          current++;
          column++;
        }
        pushComment(remVal, startColumn);
        continue;
      }

      const isKw = keywordSet.has(value.toLowerCase());
      tokens.push({
        type: isKw ? "keyword" : "identifier",
        value,
        line,
        column: startColumn,
        index: current,
      });
      continue;
    }

    current++;
    column++;
  }

  return createTokenStream(tokens, input);
}

class TokenStreamImpl implements TokenStream {
  private position_: number = 0;

  constructor(
    private tokens: Token[],
    private text: string
  ) {}

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
        const endDigits = end ? end.toString().length : 0;
        let repeatCount = endDigits - (i + 1).toString().length;
        if (repeatCount < 0) repeatCount = 0;
        const prefix = " ".repeat(repeatCount);
        return `${prefix}${i + 1} | ${line}`;
      })
      .slice(start - 1, end)
      .join("\n");
  }
}

export function createTokenStream(tokens: Token[], text: string): TokenStream {
  return new TokenStreamImpl(tokens, text);
}
