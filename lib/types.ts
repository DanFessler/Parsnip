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
