import { useRef, useEffect } from "react";

function CodeEditor({
  value,
  transform,
  onChange,
}: {
  value: string;
  transform: (text: string) => string;
  onChange?: (text: string) => void;
}) {
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
    saveCaretPosition();
    onChange?.(e.currentTarget.innerText);
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
      onChange?.(content);
    }
  };

  useEffect(() => {
    restoreCaretPosition();
  }, [value]);

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        flexGrow: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        // backgroundColor: "white",
        overflow: "auto",
        padding: "0.75rem",
        fontWeight: "500",
      }}
    >
      <pre
        ref={editRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        spellCheck={false}
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
        dangerouslySetInnerHTML={{ __html: transform(value) }}
      ></pre>
    </div>
  );
}

export default CodeEditor;
