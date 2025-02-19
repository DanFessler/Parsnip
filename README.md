# 🌱 Parsnip - A Lightweight JavaScript Parser Generator

**Parsnip** is a JavaScript-native parser library designed to parse and construct **Concrete Syntax Trees (CSTs)** dynamically using **runtime-defined grammars**. Unlike traditional parsers, Parsnip allows **custom DSLs** to be defined and parsed with ease, making it perfect for scripting languages, interpreters, and domain-specific language development.

## 🚀 Features

✅ **JavaScript-first** – No native dependencies, works in the browser and Node.js.  
✅ **Dynamic Grammars** – Define and modify parsing rules at runtime.  
✅ **CST-Based Parsing** – Preserves full syntactic structure, including keywords and expressions.  
✅ **Flexible Error Handling** – Provides detailed parsing errors with line/column tracking.

## 📦 Installation

Currently, Parsnip is not published as an NPM package. You can clone the repository and use it directly.

```sh
git clone https://github.com/danfessler/parsnip.git
cd parsnip
```

Or import it into your project:

```ts
import { Parser } from "./parser";
import grammar from "./grammar";
```

## 🔧 Usage Example

### **1️⃣ Define a Grammar**

Parsnip grammars are defined as **JavaScript objects**, allowing for runtime flexibility.

```ts
const grammar = {
  SCRIPT: { type: "STATEMENT", repeat: true },

  STATEMENT: {
    options: [
      {
        type: "PRINT",
        capture: true,
        sequence: ["print", { type: "EXPRESSION" }],
      },
      {
        type: "ASSIGNMENT",
        capture: true,
        sequence: [{ type: "IDENTIFIER" }, "=", { type: "EXPRESSION" }],
      },
    ],
  },

  EXPRESSION: {
    options: [{ type: "IDENTIFIER" }, { type: "NUMBER" }],
  },

  IDENTIFIER: {
    capture: true,
    parse: (token) => {
      if (token.type !== "identifier") throw "Expected an identifier";
      return token.value;
    },
  },

  NUMBER: {
    capture: true,
    parse: (token) => {
      if (token.type !== "number") throw "Expected a number";
      return Number(token.value);
    },
  },
};
```

### **2️⃣ Parse Some Code**

Use Parsnip to parse a script into a **CST (Concrete Syntax Tree).**

```ts
import { Parser } from "./parser";
import grammar from "./grammar";

const parser = new Parser(grammar);
const sourceCode = `print 42`;
const cst = parser.parse(sourceCode);

console.log(JSON.stringify(cst, null, 2));
```

🔹 **Example Output (CST)**

```json
{
  "type": "PRINT",
  "value": {
    "type": "NUMBER",
    "value": 42
  }
}
```

### **3️⃣ Error Handling**

If the input contains syntax errors, Parsnip provides **detailed error messages**.

```ts
try {
  parser.parse("print");
} catch (error) {
  console.error(error.message);
}
```

🔹 **Example Error Message**

```
Expected 'EXPRESSION' but got end of input at line 1:6

print
     ^
```

## 📐 Grammar Schema

Each rule in a Parsnip grammar is defined using the following properties:

### Core Properties

- **type**: `string` - References another rule by name
- **capture**: `boolean` - When true, includes this node in the CST
- **parse**: `(token: Token) => string | number` - Custom token parsing function

### Rule Structure

- **sequence**: `(Rule | string)[]` - Array of elements that must appear in order
- **options**: `(Rule | string)[]` - Array of alternative elements (only one must match)

### Modifiers

- **repeat**: `boolean` - Rule can appear multiple times
- **optional**: `boolean` - Rule is optional
- **separator**: `string` - String used between repeated elements (e.g., commas in lists)
- **literal**: `boolean` - Matches exact string value

### Example Rule

```ts
{
  FUNCTION_CALL: {
    capture: true,
    sequence: [
      { type: "IDENTIFIER" },           // Function name
      "(",                             // Opening parenthesis
      {
        type: "EXPRESSION",            // Arguments
        repeat: true,                  // Multiple arguments allowed
        separator: ","                 // Separated by commas
      },
      ")"                             // Closing parenthesis
    ]
  }
}
```

## 🎯 Why Use Parsnip?

Parsnip is **different from other parsers** like PEG.js, Chevrotain, or Tree-Sitter because:

- **It allows runtime-defined grammars** (Tree-Sitter requires precompiled grammars).
- **It produces a full CST**, not just an AST.
- **It is lightweight and easy to use** for scripting and custom DSLs.

## 📌 Future Plans

🔹 **Incremental Parsing** – Improve performance for live-editing scenarios.  
🔹 **Syntax Highlighting Support** – Allow partial parsing for efficient code coloring.  
🔹 **Customizable AST Transformations** – Provide utility functions for converting CST → AST.

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report issues
- Suggest features
- Submit pull requests

## 📜 License

MIT License

🌱 **Parsnip – A Simple Yet Powerful Parser for JavaScript**
