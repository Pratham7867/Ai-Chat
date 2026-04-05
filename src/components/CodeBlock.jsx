import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// ─── Constants ────────────────────────────────────────────────────────────────

const JUDGE0_URL = "https://ce.judge0.com/submissions?wait=true&base64_encoded=false";

// Judge0 CE language IDs — https://ce.judge0.com/languages
const LANGUAGES = [
  { label: "JavaScript",  value: "javascript",  id: 63  },
  { label: "Python",      value: "python",      id: 71  },
  { label: "Java",        value: "java",         id: 62  },
  { label: "C",           value: "c",            id: 50  },
  { label: "C++",         value: "cpp",          id: 54  },
  { label: "TypeScript",  value: "typescript",   id: 74  },
  { label: "Go",          value: "go",           id: 60  },
  { label: "Rust",        value: "rust",         id: 73  },
  { label: "PHP",         value: "php",          id: 68  },
  { label: "Ruby",        value: "ruby",         id: 72  },
  { label: "C#",          value: "csharp",       id: 51  },
  { label: "Swift",       value: "swift",        id: 83  },
  { label: "Kotlin",      value: "kotlin",       id: 78  },
  { label: "Bash",        value: "bash",         id: 46  },
];

// Judge0 status IDs
const STATUS = {
  IN_QUEUE:    1,
  PROCESSING:  2,
  ACCEPTED:    3,
  ERROR:       4,   // compile error
  RUNTIME_ERR: 11,
  TIME_LIMIT:  5,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

async function executeCode(sourceCode, languageId) {
  const res = await fetch(JUDGE0_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const data = await res.json();

  return {
    stdout:    data.stdout    || "",
    stderr:    data.stderr    || "",
    compile:   data.compile_output || "",
    statusId:  data.status?.id,
    statusMsg: data.status?.description || "Unknown",
    time:      data.time     || null,
    memory:    data.memory   || null,
  };
}

// ─── CodeCompiler ─────────────────────────────────────────────────────────────

export default function CodeCompiler({ initialCode = "", initialLanguage = "javascript" }) {

  const defaultLang = LANGUAGES.find((l) => l.value === initialLanguage) || LANGUAGES[0];

  const [code,     setCode]     = useState(initialCode);
  const [lang,     setLang]     = useState(defaultLang);
  const [result,   setResult]   = useState(null);
  const [running,  setRunning]  = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [error,    setError]    = useState("");

  // ── Run ──
  const handleRun = async () => {
    if (!code.trim()) return;
    setRunning(true);
    setResult(null);
    setError("");

    try {
      const res = await executeCode(code, lang.id);
      setResult(res);
    } catch (err) {
      setError(err.message || "Execution failed. Try again.");
    } finally {
      setRunning(false);
    }
  };

  // ── Copy ──
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Clear ──
  const handleClear = () => {
    setCode("");
    setResult(null);
    setError("");
  };

  // ── Tab key → 2 spaces ──
  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd } = e.target;
      const next = code.slice(0, selectionStart) + "  " + code.slice(selectionEnd);
      setCode(next);
      requestAnimationFrame(() => {
        e.target.selectionStart = selectionStart + 2;
        e.target.selectionEnd   = selectionStart + 2;
      });
    }
    // Ctrl/Cmd + Enter → run
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleRun();
  };

  // ── Derive output state ──
  const compileError = result?.compile && result.compile.trim();
  const runtimeError = result?.stderr  && result.stderr.trim();
  const output       = result?.stdout  && result.stdout.trim();
  const isSuccess    = result?.statusId === STATUS.ACCEPTED;
  const isTimeLimit  = result?.statusId === STATUS.TIME_LIMIT;

  return (
    <div className="compiler">

      {/* ── Toolbar ── */}
      <div className="compiler-toolbar">

        <select
          className="compiler-lang-select"
          value={lang.value}
          onChange={(e) => {
            const found = LANGUAGES.find((l) => l.value === e.target.value);
            if (found) setLang(found);
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        <div className="compiler-actions">
          <button className="compiler-btn copy-btn" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </button>

          <button className="compiler-btn clear-btn" onClick={handleClear}>
            Clear
          </button>

          <button
            className="compiler-btn run-btn"
            onClick={handleRun}
            disabled={running || !code.trim()}
          >
            {running ? "Running..." : "▶ Run"}
          </button>
        </div>

      </div>

      {/* ── Editor ── */}
      <div className="compiler-editor">
        <textarea
          className="compiler-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder={`Write ${lang.label} code here...\n\nCtrl + Enter to run`}
        />
      </div>

      {/* ── Fetch/network error ── */}
      {error && (
        <div className="compiler-output">
          <div className="compiler-output-header">
            <span>Error</span>
            <span className="exit-badge exit-err">failed</span>
          </div>
          <pre className="compiler-output-text compiler-output-error">{error}</pre>
        </div>
      )}

      {/* ── Execution result ── */}
      {result && !error && (
        <div className="compiler-output">

          {/* Header row */}
          <div className="compiler-output-header">
            <span>
              {result.statusMsg}
              {result.time   && <span className="meta-chip">⏱ {result.time}s</span>}
              {result.memory && <span className="meta-chip">💾 {result.memory}KB</span>}
            </span>
            <span className={`exit-badge ${isSuccess ? "exit-ok" : "exit-err"}`}>
              {isSuccess ? "OK" : "error"}
            </span>
          </div>

          {/* Compile error */}
          {compileError && (
            <>
              <div className="compiler-output-section-label">Compile error</div>
              <pre className="compiler-output-text compiler-output-error">{compileError}</pre>
            </>
          )}

          {/* Runtime error */}
          {runtimeError && !compileError && (
            <>
              <div className="compiler-output-section-label">Runtime error</div>
              <pre className="compiler-output-text compiler-output-error">{runtimeError}</pre>
            </>
          )}

          {/* Time limit */}
          {isTimeLimit && (
            <pre className="compiler-output-text compiler-output-error">
              Time limit exceeded
            </pre>
          )}

          {/* stdout */}
          {output ? (
            <pre className="compiler-output-text">{output}</pre>
          ) : (
            isSuccess && (
              <pre className="compiler-output-text compiler-output-empty">(no output)</pre>
            )
          )}

        </div>
      )}

    </div>
  );
}