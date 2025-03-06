import "./App.css";
import testScript from "./example/test.txt?raw";
import { Parser } from "../lib/parser";
import grammar from "./grammar";
import { useState } from "react";
import CodeEditor from "./components/CodeEditor";

const parser = new Parser(grammar, false);
try {
  const parsed = parser.parse(testScript);
  // console.log("tokens", parser);
  console.log(JSON.stringify(parsed, null, 2));
} catch (e) {
  console.error(e);
}

// console.log(parsed);

// Update App component to display parsed grammar

function splitPreserveWhitespace(str: string) {
  // Split on word boundaries while preserving the whitespace
  return str.split(/(\s+)/);
}

function App() {
  const [text, setText] = useState(testScript);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        height: "100%",
        gap: "1rem",
      }}
    >
      <CodeEditor value={text} transform={styleText} onChange={setText} />
      <CodeEditor value={text} transform={styleText} />
    </div>
  );
}

function styleText(text: string) {
  const words = splitPreserveWhitespace(text);
  const styles = [
    "color: rgb(219, 27, 85)",
    "color: rgb(238, 126, 34)",
    "color: rgb(223, 188, 34)",
    "color: rgb(0, 206, 79)",
    "color: rgb(0, 189, 202)",
    "color: rgb(47, 127, 255)",
    "color: rgb(140, 22, 218)",
  ];
  return words
    .map(
      (word: string, index: number) =>
        // we divide by 2 because there's whitespace between words
        `<span style="${styles[(index / 2) % styles.length]}">${word}</span>`
    )
    .join("");
}

export default App;
