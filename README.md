# 🌱 Parsnip

**Parsnip** is a simple yet powerful parser generator for JavaScript allowing you to write custom domain specific languages using an object-based grammar schema.

> NOTE: this is a work in progress and the API is subject to change.

## Motivation

I needed a parser that was simple to understand and easy to extend. It needed to be lightweight, run in the browser, and have little-to-no dependencies. I also wanted to support a JS-first approach to grammar definition rather than yet another DSL to learn which provides typing and IDE support benefits.

I'm using Parsnip for various Domain Specific Languages that all need to run in the browser including a Text-based language that compiles to [Scratch](https://scratch.mit.edu/) blocks.

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

## 🔧 Basic Usage

### **Import Parsnip into your project**

```ts
import { Parser } from "parsnip";
```

### **Define a Grammar**

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

### **Parse Some Code**

Instantiate Parsnip with your grammar and parse some text.

```ts
const parser = new Parser(grammar);
const cst = parser.parse(`print "hello world"`);
```

### **Example Output:**

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

## Grammar Schema

The grammar is an object with named `Rule` objects which can be referenced by other rules. Each rule correlates to a node in the parse tree.

#### Rule Object Attributes

#### **type** _`string`_

A reference to another rule in the grammar object. If `sequence` or `options` attributes are present, then the type will be used as the name of the node itself rather than a reference to another rule.

#### **capture** _`boolean`_

If false (or omitted), the rule will not be captured as a node, allowing you to have abstract rules leveraged by the parser which are not necessary to include in the resulting parse tree.

#### **parse** _`(token: Token) => any`_

A function that transforms a terminal node into the desired value in the resulting parse tree.

#### **sequence** _`(Rule | string)[]`_

An array of elements that must appear in order.

#### **options** _`(Rule | string)[]`_

An array of alternative elements (only one must match).

#### **repeat** _`boolean`_

If true, the rule can appear multiple times.

#### **optional** _`boolean`_

If true, the rule is optional.

#### **separator** _`string`_

A string that separates repeated elements.

### Example Grammar Object:

```ts
{
  FUNCTION_CALL: {             // The name of the rule
    capture: true,             // Whether to include this node in the parse tree
    sequence: [                // The sequence of elements that must appear in order
      { type: "IDENTIFIER" },  // reference to the IDENTIFIER rule
      "(",                     // Opening parenthesis literal token
      {                        // an in-line nested rule (cannot be referenced)
        type: "EXPRESSION",    //    reference to the EXPRESSION rule
        repeat: true,          //    Multiple arguments allowed
        separator: ","         //    Separated by commas
      },
      ")"                      // Closing parenthesis literal token
    ]
  },
  // ...other rules
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
