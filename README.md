# 🌱 Parsnip

**Parsnip** is a simple yet powerful parser generator for JavaScript allowing you to write custom domain specific languages using an object-based grammar schema.

> NOTE: this is a work in progress and the API is subject to change.

## 🚀 Features

✅ **JavaScript-first** – No native dependencies, works in the browser and Node.js.  
✅ **Dynamic Grammars** – Object-defined grammars which can be modified at runtime.  
✅ **Flexible Error Handling** – Provides detailed parsing errors with line/column tracking.

## 📦 Installation

You can install Parsnip directly from GitHub using npm:

```sh
npm install danfessler/parsnip
```

Or clone the repository to use it directly:

```sh
git clone https://github.com/danfessler/parsnip.git
cd parsnip
```

## 🔧 Usage Example

### **1️⃣ Import Parsnip into your project**

```ts
import { Parser } from "parsnip";
```

### **2️⃣ Define a Grammar**

Parsnip grammars are defined as **JavaScript objects**, allowing for runtime flexibility. This example defines a grammar for a simple print statement.

```ts
const grammar = {
  SCRIPT: { type: "STATEMENT", repeat: true },

  STATEMENT: {
    options: [
      {
        type: "PRINT",
        capture: true,
        sequence: ["print", { type: "STRING" }],
      },
      // ... other statement rules
    ],
  },

  STRING: {
    type: "STRING",
    capture: true,
    parse: (token) => {
      if (token.type !== "string") throw "Expected a string literal";
      return token.value.substring(1, token.value.length - 1);
    },
  },
};
```

### **3️⃣ Parse Some Code**

Instantiate Parsnip with your grammar and parse some text.

```ts
const parser = new Parser(grammar);
const cst = parser.parse(`print "hello world"`);
```

**Example Output:**

```json
[
  {
    "type": "PRINT",
    "value": {
      "type": "STRING",
      "value": "hello world"
    }
  }
]
```

## **Error Handling**

If the input contains syntax errors, Parsnip provides **detailed error messages**.

```
ParseError: Expected a string literal at line 1:7

1 | print not_a_string
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
      { type: "IDENTIFIER" },  // Function name
      "(",                     // Opening parenthesis
      {
        type: "EXPRESSION",    // Arguments
        repeat: true,          // Multiple arguments allowed
        separator: ","         // Separated by commas
      },
      ")"                      // Closing parenthesis
    ]
  }
}
```

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
