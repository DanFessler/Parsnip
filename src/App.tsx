import "./App.css";
import { lex } from "./lexer";
import test from "./example/test.txt?raw";
import { parse } from "./parser";

const stream = lex(`when space key pressed`);
console.log(stream);
const parsed = parse(stream, { debug: true });

console.log(parsed);

// Update App component to display parsed grammar
function App() {
  return <div></div>;
}

export default App;
