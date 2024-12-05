import "./App.css";
import test from "./example/test.txt?raw";

console.log(test);

const tokens = lex(test);

function lex(text: string) {
  // naively split by spaces
  const split = text
    .split("\n")
    .map((line) => line.trim().split(" "))
    .flat();

  // now lets connect tokens which are strings
  // if a token starts with a quote, combine until
  // a token ends with a quote. this could be the same token
  const result: string[] = [];
  let currentString = "";
  let inString = false;

  for (const token of split) {
    if (token.startsWith('"') && token.endsWith('"')) {
      // Single token string
      result.push(token);
    } else if (token.startsWith('"')) {
      // Start of multi-token string
      inString = true;
      currentString = token;
    } else if (token.endsWith('"')) {
      // End of multi-token string
      inString = false;
      currentString += " " + token;
      result.push(currentString);
      currentString = "";
    } else if (inString) {
      // Middle of multi-token string
      currentString += " " + token;
    } else {
      // Regular token
      result.push(token);
    }
  }

  return result;
}

const STRING = {
  type: "string",
};

const grammar = {
  whenFlagClicked: ["when", "flag", "clicked"],
  whenSpaceKeyPressed: [
    "when",
    ["space", "up arrow", "down arrow", "left arrow", "right arrow"],
    "key",
    "pressed",
  ],
  whenBackdropSwitchesTo: ["when", "backdrop", "switches", "to", STRING],
};

function parse(tokens: string[]) {
  return tokens.map((token) => {
    return {
      type: token,
    };
  });
}

function App() {
  return (
    <div>
      <pre>{JSON.stringify(tokens, null, 2)}</pre>
    </div>
  );
}

export default App;
