type TokenType =
  | "keyword"
  | "number"
  | "operator"
  | "bracket"
  | "comment"
  | "string"
  | "whitespace"
  | "identifier"
  | "separator";

export interface Token {
  type: TokenType;
  value: string | number;
  line: number;
  column: number;
  index: number;
  id?: string;
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
  id?: string;
};

type RuleOrString = Rule | string;

export type Grammar = Record<string, Rule>;

export type ASTNode = {
  type: string;
  value: ASTNode | ASTNode[] | string | number;
  line: number;
  column: number;
  id?: string;
};

export type ASTResult = ASTNode | ASTNode[] | string | number | undefined;
