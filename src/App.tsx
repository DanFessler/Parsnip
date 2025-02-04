import "./App.css";
import { lex } from "./lexer";
import test from "./example/test.txt?raw";
import { parse } from "./parser";

const stream = lex(test);
console.log(stream);
const parsed = parse(stream);
console.log(JSON.stringify(parsed, null, 2));
console.log(parsed);

// console.log(parsed);

// Update App component to display parsed grammar
function App() {
  return <div></div>;
}

export default App;
