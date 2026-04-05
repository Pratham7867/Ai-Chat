import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeCompiler from "./CodeBlock";
import TypingText from "../utils/TypingText";
// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL    = "https://genai-backend-wnqt.onrender.com/ask";
const TYPING_SPEED = 18;

// ─── Helper ───────────────────────────────────────────────────────────────────

async function fetchAIResponse(question) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  const data = await res.json();
  return data.answer || "No response from AI";
}

// ─── CodeBlock ────────────────────────────────────────────────────────────────
// Renders inside markdown — shows syntax-highlighted code + an embedded
// CodeCompiler pre-filled with the snippet so the user can edit & run it.

function CodeBlock({ code, language }) {
  const [showCompiler, setShowCompiler] = useState(false);

  return (
    <div className="code-wrapper">

      {/* Syntax-highlighted read-only preview */}
      <SyntaxHighlighter style={vscDarkPlus} language={language} PreTag="div">
        {code}
      </SyntaxHighlighter>

      {/* Toggle compiler */}
      <button
        className="run-btn"
        onClick={() => setShowCompiler((prev) => !prev)}
      >
        {showCompiler ? "Hide Compiler" : "▶ Run Code"}
      </button>

      {/* Inline compiler pre-filled with this code snippet */}
      {showCompiler && (
        <CodeCompiler initialCode={code} initialLanguage={language} />
      )}

    </div>
  );
}

// ─── Markdown config ──────────────────────────────────────────────────────────

const markdownComponents = {
  p({ children }) {
    return <>{children}</>;
  },
  code({ inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");

    if (!inline) {
      return (
        <CodeBlock
          code={String(children).replace(/\n$/, "")}
          language={match ? match[1] : "javascript"}
        />
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

// ─── ThinkingDots ─────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="msg ai thinking">
      <span className="dot-flashing" />
    </div>
  );
}

// ─── Message ──────────────────────────────────────────────────────────────────

function Message({ msg, index, typingIndex, typingDone, onTypingDone }) {
  const isAI     = msg.type === "ai";
  const isTyping = isAI && index === typingIndex;
  const isDone   = isAI && typingDone[index];

  return (
    <div className={`msg ${msg.type}`}>
      {!isAI || isDone ? (
        <ReactMarkdown components={markdownComponents}>
          {msg.text}
        </ReactMarkdown>
      ) : isTyping ? (
        <TypingText
          text={msg.text}
          speed={TYPING_SPEED}
          onDone={() => onTypingDone(index)}
        />
      ) : (
        <ReactMarkdown components={markdownComponents}>
          {msg.text}
        </ReactMarkdown>
      )}
    </div>
  );
}

// ─── AIChat ───────────────────────────────────────────────────────────────────

export default function AIChat() {
  const [messages,    setMessages]    = useState([]);
  const [question,    setQuestion]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [typingIndex, setTypingIndex] = useState(null);
  const [typingDone,  setTypingDone]  = useState({});

  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingDone]);

  const addMessage = (text, type) => {
    setMessages((prev) => {
      const updated = [...prev, { text, type }];
      if (type === "ai") setTypingIndex(updated.length - 1);
      return updated;
    });
  };

  const handleSend = async () => {
    if (!question.trim()) return;

    const userQuestion = question.trim();
    addMessage(userQuestion, "user");
    setQuestion("");
    setLoading(true);

    try {
      const answer = await fetchAIResponse(userQuestion);
      addMessage(answer, "ai");
    } catch {
      addMessage("Error connecting to AI", "ai");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const handleTypingDone = (index) => {
    setTypingDone((prev) => ({ ...prev, [index]: true }));
    setTypingIndex(null);
  };

  return (
    <div className="chat-page">
      <div className="chat-container">

        <div className="chat-header">
          <h2>AI Assistant</h2>
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <Message
              key={index}
              msg={msg}
              index={index}
              typingIndex={typingIndex}
              typingDone={typingDone}
              onTypingDone={handleTypingDone}
            />
          ))}

          {loading && <ThinkingDots />}

          <div ref={bottomRef} />
        </div>

        <div className="chat-input">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
          />
          <button onClick={handleSend}>Send</button>
        </div>

      </div>
    </div>
  );
}