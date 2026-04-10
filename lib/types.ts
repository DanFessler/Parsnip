type TokenType =
  | "keyword"
  | "number"
  | "operator"
  | "bracket"
  | "comment"
  | "string"
  | "whitespace"
  | "newline"
  | "identifier";

export interface Token {
  type: TokenType;
  value: string | number;
  line: number;
  column: number;
  index: number;
}

export interface TokenStream {
  peek: () => Token | undefined;
  consume: () => Token;
  position: () => number;
  seek: (position: number) => void;
  getLinesOfCode: (start: number, end?: number) => string;
}

export type Rule = {
  capture?: boolean;
  type?: string;
  sequence?: RuleOrString[];
  options?: RuleOrString[];
  repeat?: boolean;
  /**
   * When `repeat` is true, before each body attempt try this rule as lookahead: if it
   * parses successfully, rewind and stop the loop (Typical: `else` / `endif`).
   */
  until?: Rule | string;
  optional?: boolean;
  separator?: string;
  parse?: (token: Token) => string | number;
};

type RuleOrString = Rule | string;

export type Grammar = Record<string, Rule>;

export type ASTNode = {
  type: string;
  value: ASTNode | ASTNode[] | string | number;
  line: number;
  column: number;
};

export type ASTResult = ASTNode | ASTNode[] | string | number | undefined;
