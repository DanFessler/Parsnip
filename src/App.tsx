import "./App.css";
import test from "./example/expressions.txt?raw";
import { Parser } from "../lib/parser";
import grammar from "./grammar";
import { useState, useRef, useEffect } from "react";

const parser = new Parser(grammar, false);
try {
  const parsed = parser.parse(test);
  console.log(JSON.stringify(parsed, null, 2));
} catch (e) {
  console.error(e);
}

// console.log(parsed);

// Update App component to display parsed grammar

function splitPreserveWhitespace(str) {
  // Split on word boundaries while preserving the whitespace
  return str.split(/(\s+)/);
}

function App() {
  const [text, setText] = useState(`// this is a comment
// this is another comment
// and another comment

set i to 10
set j to 20

call myfunction(a, b) {
  say "poop"
}

function myfunction(a, b) {
  when "right arrow" key pressed {
    say "a was pressed"
  }
  if a then {
    say "a is greater than b"
  } else {
    say "b is greater than a"
  }
}

say "poop"`);
  const displayRef = useRef<HTMLPreElement>(null);
  const editRef = useRef<HTMLPreElement>(null);
  const caretPositionRef = useRef<number>(0);

  const saveCaretPosition = () => {
    const element = editRef.current;
    if (!element) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(element);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    caretPositionRef.current = preSelectionRange.toString().length;
  };

  const restoreCaretPosition = () => {
    const element = editRef.current;
    if (!element) return;

    const selection = window.getSelection();
    if (!selection) return;

    // Find the text node and offset that corresponds to our caret position
    let charIndex = 0;
    let foundNode: Node | null = null;
    let foundOffset = 0;

    function traverseNodes(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nodeLength = node.textContent?.length || 0;
        if (charIndex + nodeLength >= caretPositionRef.current) {
          foundNode = node;
          foundOffset = caretPositionRef.current - charIndex;
          return true;
        }
        charIndex += nodeLength;
      } else {
        for (const child of Array.from(node.childNodes)) {
          if (traverseNodes(child)) return true;
        }
      }
      return false;
    }

    traverseNodes(element);

    if (!foundNode) {
      foundNode = element;
      foundOffset = 0;
    }

    const range = document.createRange();
    range.setStart(foundNode, foundOffset);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
  };

  function handleInput(e: React.FormEvent<HTMLPreElement>) {
    const content = e.currentTarget.innerText;
    saveCaretPosition();
    console.log("Raw text:", content);

    setText(content);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLPreElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();

      const element = editRef.current;
      if (!element) return;

      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);

      if (e.shiftKey) {
        // Handle shift+tab (remove tab)
        const startNode = range.startContainer;
        const startOffset = range.startOffset;

        // Check if there's a tab character before the cursor
        if (startNode.nodeType === Node.TEXT_NODE) {
          const text = startNode.textContent || "";
          if (startOffset > 0 && text.charAt(startOffset - 1) === "\t") {
            // Remove the tab character
            range.setStart(startNode, startOffset - 1);
            range.setEnd(startNode, startOffset);
            range.deleteContents();
          }
        }
      } else {
        // Handle regular tab (insert tab)
        const tabNode = document.createTextNode("\t");
        range.insertNode(tabNode);
        range.setStartAfter(tabNode);
        range.setEndAfter(tabNode);
      }

      selection.removeAllRanges();
      selection.addRange(range);

      // Trigger the input handler to update the state
      const content = element.innerText;
      saveCaretPosition();
      setText(content);
    }
  };

  useEffect(() => {
    restoreCaretPosition();
  }, [text]);

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        // backgroundColor: "rgba(0, 0, 0, 0.5)",
        backgroundColor: "white",
        overflow: "auto",
        padding: "0.75rem",
        fontWeight: "500",
      }}
    >
      <pre
        ref={displayRef}
        style={{
          display: "block",
          position: "absolute",
          padding: "inherit",
          top: 0,
          left: 0,
          minHeight: "100%",
          width: "100%",
          margin: 0,
          border: "none",
          // padding: 0,
          fontSize: "14px",
          lineHeight: "1.5",
          overflow: "hidden",
          verticalAlign: "top",
          backgroundColor: "transparent",
          pointerEvents: "none",
          whiteSpace: "pre-wrap",
          paddingLeft: "1rem",
        }}
        dangerouslySetInnerHTML={{ __html: styleText(text) }}
      />
      <pre
        ref={editRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        style={{
          display: "block",
          position: "absolute",
          padding: "inherit",
          top: 0,
          left: 0,
          minHeight: "100%",
          width: "100%",
          margin: 0,
          border: "none",
          // padding: 0,
          fontSize: "14px",
          lineHeight: "1.5",
          overflow: "hidden",
          verticalAlign: "top",
          backgroundColor: "transparent",
          color: "transparent",
          // color: "rgba(255, 255, 255, 0.5)",
          outline: "none",
          whiteSpace: "pre-wrap",
          WebkitUserModify: "read-write-plaintext-only",
          paddingLeft: "1rem",
        }}
      >
        {text}
      </pre>
    </div>
  );
}

function styleText(text: string) {
  const words = splitPreserveWhitespace(text);
  console.log("Words:", text, words);
  return words
    .map(
      (word, index) =>
        // we devide by 2 because there's whitespace between words
        `<span style="color: ${randomColor(index / 2)}">${word}</span>`
    )
    .join("");
}

function randomColor(index: number) {
  console.log("Index:", index);
  const choices = [
    "rgb(255, 71, 71)", // bright red
    "rgb(66, 135, 245)", // bright blue
    "rgb(82, 255, 82)", // bright green
    "rgb(255, 255, 82)", // bright yellow
    "rgb(198, 82, 255)", // bright purple
    "rgb(255, 160, 36)", // bright orange
  ];
  const choicesDark = [
    "rgb(140, 22, 218)", // bright red
    "rgb(47, 127, 255)", // bright blue
    "rgb(0, 189, 202)", // bright green
    "rgb(0, 206, 79)", // bright yellow
    "rgb(238, 126, 34)", // bright purple
    "rgb(219, 27, 85)", // bright orange
  ];
  return choicesDark[index % choicesDark.length];
}

export default App;
