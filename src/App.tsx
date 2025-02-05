import "./App.css";
import test from "./example/test.txt?raw";
import { Parser } from "./parser";
import grammar from "./grammar";

const parser = new Parser(grammar);
const parsed = parser.parse(test);
console.log(JSON.stringify(parsed, null, 2));
console.log(parser, parsed);

// console.log(parsed);

// Update App component to display parsed grammar

function App() {
  return <div></div>;
}

export default App;
