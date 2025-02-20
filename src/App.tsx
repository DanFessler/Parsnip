import "./App.css";
import test from "./example/expressions.txt?raw";
import { Parser } from "../lib/parser";
import grammar from "./grammar";

const parser = new Parser(grammar, false);
try {
  const parsed = parser.parse(test);
  console.log(JSON.stringify(parsed, null, 2));
} catch (e) {
  console.error(e);
}

// console.log(parsed);

// Update App component to display parsed grammar

function App() {
  return <div>hello world!</div>;
}

export default App;
