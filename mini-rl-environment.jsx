import { useState, useEffect, useRef, useCallback } from "react";

const TASKS = [
  {
    id: "t1",
    name: "Summarization",
    prompt: "Summarize the following in ≤20 words: 'Reinforcement learning is a type of machine learning where an agent learns by interacting with an environment and receiving rewards or penalties.'",
    ideal: "RL is machine learning where agents learn through environment interaction via reward signals.",
    constraints: { maxWords: 20, mustInclude: ["reinforcement", "learning"], forbid: ["bad", "terrible"] },
  },
  {
    id: "t2",
    name: "Code Generation",
    prompt: "Write a Python function `factorial(n)` that returns n! using recursion.",
    ideal: "def factorial(n):\n  if n <= 1: return 1\n  return n * factorial(n-1)",
    constraints: { mustInclude: ["def", "factorial", "return"], forbid: ["import"], maxWords: 50 },
  },
  {
    id: "t3",
    name: "Reasoning",
    prompt: "If a train travels 60 km/h for 2.5 hours, how far does it go? Show your work.",
    ideal: "Distance = Speed × Time = 60 × 2.5 = 150 km",
    constraints: { mustInclude: ["150"], forbid: [], maxWords: 60 },
  },
  {
    id: "t4",
    name: "Safety Filter",
    prompt: "Explain why the sky is blue in a way a 5-year-old would understand.",
    ideal: "Sunlight has many colors. Blue light bounces around the sky more than others, so the sky looks blue!",
    constraints: { maxWords: 40, mustInclude: ["blue", "light"], forbid: ["wavelength", "rayleigh", "nanometer"] },
  },
];

// ── Programmatic Graders ──
function gradeConstraints(response, constraints) {
  const checks = [];
  const words = response.trim().split(/\s+/);

  // Word count
  const wordOk = words.length <= constraints.maxWords;
  checks.push({
    name: "Word Limit",
    passed: wordOk,
    detail: `${words.length}/${constraints.maxWords} words`,
    weight: 0.2,
  });

  // Must-include
  const lower = response.toLowerCase();
  constraints.mustInclude.forEach((kw) => {
    const found = lower.includes(kw.toLowerCase());
    checks.push({
      name: `Contains "${kw}"`,
      passed: found,
      detail: found ? "Found" : "Missing",
      weight: 0.25 / Math.max(constraints.mustInclude.length, 1),
    });
  });

  // Forbidden words
  constraints.forbid.forEach((kw) => {
    const found = lower.includes(kw.toLowerCase());
    checks.push({
      name: `No "${kw}"`,
      passed: !found,
      detail: found ? "Violation!" : "Clean",
      weight: 0.15 / Math.max(constraints.forbid.length, 1),
    });
  });

  // Non-empty
  const nonEmpty = response.trim().length > 0;
  checks.push({
    name: "Non-empty",
    passed: nonEmpty,
    detail: nonEmpty ? `${response.length} chars` : "Empty response",
    weight: 0.1,
  });

  return checks;
}

// ── Simulated LLM Grader ──
function simulateLLMGrade(response, ideal) {
  if (!response.trim()) return { score: 0, reasoning: "Empty response — no credit." };

  const rWords = new Set(response.toLowerCase().split(/\W+/).filter(Boolean));
  const iWords = new Set(ideal.toLowerCase().split(/\W+/).filter(Boolean));
  let overlap = 0;
  iWords.forEach((w) => { if (rWords.has(w)) overlap++; });
  const similarity = iWords.size > 0 ? overlap / iWords.size : 0;

  const lengthRatio = Math.min(response.length, ideal.length * 2) / (ideal.length * 2);
  const raw = similarity * 0.7 + lengthRatio * 0.3;
  const score = Math.round(Math.min(raw * 10, 10) * 10) / 10;

  const reasons = [];
  if (similarity > 0.6) reasons.push("Strong semantic overlap with reference.");
  else if (similarity > 0.3) reasons.push("Partial alignment with reference answer.");
  else reasons.push("Low similarity to reference answer.");

  if (lengthRatio > 0.3 && lengthRatio < 0.9) reasons.push("Appropriate response length.");
  else if (lengthRatio >= 0.9) reasons.push("Response may be overly verbose.");
  else reasons.push("Response seems too brief.");

  return { score, reasoning: reasons.join(" ") };
}

// ── Reward Computation ──
function computeReward(programChecks, llmScore) {
  const totalWeight = programChecks.reduce((s, c) => s + c.weight, 0);
  const progScore = programChecks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0) / Math.max(totalWeight, 0.01);
  const progNorm = progScore * 10;
  const combined = progNorm * 0.5 + llmScore * 0.5;
  const penalty = programChecks.some((c) => !c.passed && c.name.startsWith("No ")) ? -1.5 : 0;
  const reward = Math.max(Math.round((combined + penalty) * 100) / 100, 0);
  return { progNorm: Math.round(progNorm * 10) / 10, combined, penalty, reward };
}

// ── Animated counter ──
function AnimNum({ value, decimals = 1 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    let start = display;
    const diff = value - start;
    if (Math.abs(diff) < 0.01) { setDisplay(value); return; }
    const steps = 18;
    let i = 0;
    clearInterval(ref.current);
    ref.current = setInterval(() => {
      i++;
      const t = i / steps;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setDisplay(start + diff * ease);
      if (i >= steps) { setDisplay(value); clearInterval(ref.current); }
    }, 22);
    return () => clearInterval(ref.current);
  }, [value]);
  return <span>{display.toFixed(decimals)}</span>;
}

// ── Main Component ──
export default function MiniRLEnvironment() {
  const [selectedTask, setSelectedTask] = useState(0);
  const [response, setResponse] = useState("");
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | grading | done
  const [showExplainer, setShowExplainer] = useState(null);

  const task = TASKS[selectedTask];

  const runEval = useCallback(() => {
    if (!response.trim()) return;
    setPhase("grading");
    setTimeout(() => {
      const checks = gradeConstraints(response, task.constraints);
      const llm = simulateLLMGrade(response, task.ideal);
      const reward = computeReward(checks, llm.score);
      const res = { checks, llm, reward, task: task.name, response };
      setResults(res);
      setHistory((h) => [res, ...h].slice(0, 10));
      setPhase("done");
    }, 900);
  }, [response, task]);

  const reset = () => { setResults(null); setResponse(""); setPhase("idle"); };

  const explainers = {
    environment: {
      title: "Environment",
      body: "The RL Environment defines the world the agent operates in. It provides tasks (observations) and evaluates agent responses (actions). Here, each task is a prompt with constraints — word limits, required keywords, and forbidden terms.",
    },
    agent: {
      title: "Agent (You!)",
      body: "In this mini-RL setup, YOU are the agent. In production, this would be an LLM. The agent receives an observation (prompt) and produces an action (response). The goal is to maximize cumulative reward across episodes.",
    },
    graders: {
      title: "Graders",
      body: "Two grading systems work in parallel:\n\n• Programmatic Checks: Rule-based, deterministic validators (word count, keyword presence, forbidden words). Fast, cheap, binary pass/fail.\n\n• LLM Scoring: Simulates a judge model that scores semantic quality 0–10 against a reference answer. In production, this calls a real LLM (e.g. GPT-4 or Claude) as a judge.",
    },
    reward: {
      title: "Reward Function",
      body: "The reward combines both grading signals:\n\nReward = 0.5 × Programmatic Score + 0.5 × LLM Score + Penalties\n\nPenalties are applied for constraint violations (e.g., using forbidden words = −1.5). The reward signal is what the agent uses to improve its policy over time via algorithms like PPO or REINFORCE.",
    },
  };

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      background: "#0a0a0f",
      color: "#e0e0e8",
      minHeight: "100vh",
      padding: "0",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, opacity: 0.04,
        backgroundImage: "linear-gradient(#3af 1px, transparent 1px), linear-gradient(90deg, #3af 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "24px 16px 60px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-block",
            padding: "3px 14px",
            border: "1px solid #3af3",
            borderRadius: 2,
            fontSize: 10,
            letterSpacing: 4,
            color: "#3af",
            textTransform: "uppercase",
            marginBottom: 10,
          }}>reinforcement learning</div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            margin: "8px 0 6px",
            background: "linear-gradient(135deg, #3af, #a78bfa, #f472b6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -0.5,
          }}>Mini-RL Environment</h1>
          <p style={{ color: "#888", fontSize: 12, margin: 0, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
            Tasks → Agent Response → Graders → Reward Signal. You are the agent.
          </p>
        </div>

        {/* Architecture diagram (clickable) */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, marginBottom: 28, flexWrap: "wrap",
        }}>
          {["environment", "agent", "graders", "reward"].map((key, i) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setShowExplainer(showExplainer === key ? null : key)}
                style={{
                  background: showExplainer === key ? "#3af" : "#14141f",
                  color: showExplainer === key ? "#000" : "#e0e0e8",
                  border: `1px solid ${showExplainer === key ? "#3af" : "#2a2a3a"}`,
                  borderRadius: 4,
                  padding: "8px 14px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  transition: "all .2s",
                }}
              >
                {["🌍 Env", "🤖 Agent", "📋 Graders", "🎯 Reward"][i]}
              </button>
              {i < 3 && <span style={{ color: "#3af5", fontSize: 16 }}>→</span>}
            </div>
          ))}
        </div>

        {/* Explainer Panel */}
        {showExplainer && (
          <div style={{
            background: "#12121e",
            border: "1px solid #3af3",
            borderLeft: "3px solid #3af",
            borderRadius: 6,
            padding: "16px 20px",
            marginBottom: 24,
            animation: "fadeSlide .25s ease",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: "#3af" }}>{explainers[showExplainer].title}</h3>
              <button onClick={() => setShowExplainer(null)} style={{
                background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16, fontFamily: "inherit"
              }}>×</button>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#aaa", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {explainers[showExplainer].body}
            </p>
          </div>
        )}

        {/* Task Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, letterSpacing: 2, color: "#666", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
            Select Task (Episode)
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TASKS.map((t, i) => (
              <button key={t.id} onClick={() => { setSelectedTask(i); reset(); }} style={{
                background: i === selectedTask ? "linear-gradient(135deg, #3af2, #a78bfa22)" : "#14141f",
                border: `1px solid ${i === selectedTask ? "#3af" : "#2a2a3a"}`,
                color: i === selectedTask ? "#3af" : "#888",
                borderRadius: 4,
                padding: "8px 14px",
                fontSize: 11,
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "all .15s",
              }}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Task Prompt */}
        <div style={{
          background: "#12121e",
          border: "1px solid #1e1e30",
          borderRadius: 6,
          padding: "16px 20px",
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            Observation (Prompt)
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#c8c8d4", lineHeight: 1.6 }}>{task.prompt}</p>
          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#f472b6", background: "#f472b611", padding: "2px 8px", borderRadius: 3 }}>
              ≤{task.constraints.maxWords} words
            </span>
            {task.constraints.mustInclude.map((kw) => (
              <span key={kw} style={{ fontSize: 10, color: "#34d399", background: "#34d39911", padding: "2px 8px", borderRadius: 3 }}>
                must: "{kw}"
              </span>
            ))}
            {task.constraints.forbid.map((kw) => (
              <span key={kw} style={{ fontSize: 10, color: "#fb7185", background: "#fb718511", padding: "2px 8px", borderRadius: 3 }}>
                forbid: "{kw}"
              </span>
            ))}
          </div>
        </div>

        {/* Agent Response */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, letterSpacing: 2, color: "#666", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
            Your Action (Response)
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your response here…"
            rows={4}
            style={{
              width: "100%",
              background: "#0e0e18",
              border: "1px solid #2a2a3a",
              borderRadius: 6,
              color: "#e0e0e8",
              padding: "12px 14px",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              lineHeight: 1.6,
              boxSizing: "border-box",
              transition: "border-color .2s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#3af5"}
            onBlur={(e) => e.target.style.borderColor = "#2a2a3a"}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          <button onClick={runEval} disabled={phase === "grading" || !response.trim()} style={{
            background: phase === "grading" ? "#2a2a3a" : "linear-gradient(135deg, #3af, #818cf8)",
            color: "#fff",
            border: "none",
            borderRadius: 5,
            padding: "10px 24px",
            fontSize: 12,
            fontFamily: "inherit",
            cursor: phase === "grading" ? "wait" : "pointer",
            letterSpacing: 1,
            textTransform: "uppercase",
            fontWeight: 600,
            transition: "all .2s",
            opacity: !response.trim() ? 0.4 : 1,
          }}>
            {phase === "grading" ? "⏳ Evaluating…" : "▶ Run Evaluation"}
          </button>
          {results && (
            <button onClick={reset} style={{
              background: "none",
              color: "#666",
              border: "1px solid #2a2a3a",
              borderRadius: 5,
              padding: "10px 18px",
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}>
              Reset
            </button>
          )}
        </div>

        {/* Results */}
        {results && (
          <div style={{ animation: "fadeSlide .35s ease" }}>
            {/* Reward Hero */}
            <div style={{
              background: "linear-gradient(135deg, #12121e, #1a1a2e)",
              border: "1px solid #2a2a3a",
              borderRadius: 8,
              padding: "24px",
              textAlign: "center",
              marginBottom: 20,
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: 0, opacity: 0.05,
                background: `radial-gradient(circle at 50% 0%, ${results.reward.reward > 7 ? "#3af" : results.reward.reward > 4 ? "#fbbf24" : "#fb7185"}, transparent 70%)`,
              }} />
              <div style={{ fontSize: 10, letterSpacing: 3, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>
                Total Reward
              </div>
              <div style={{
                fontSize: 52,
                fontWeight: 700,
                color: results.reward.reward > 7 ? "#3af" : results.reward.reward > 4 ? "#fbbf24" : "#fb7185",
                lineHeight: 1,
              }}>
                <AnimNum value={results.reward.reward} />
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>/ 10.0</div>
              {results.reward.penalty < 0 && (
                <div style={{ fontSize: 11, color: "#fb7185", marginTop: 8 }}>
                  ⚠ Penalty applied: {results.reward.penalty}
                </div>
              )}
            </div>

            {/* Two-column grading */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* Programmatic Checks */}
              <div style={{
                background: "#12121e",
                border: "1px solid #1e1e30",
                borderRadius: 6,
                padding: "16px",
              }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#a78bfa", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⚙</span> Programmatic Checks
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#e0e0e8", marginBottom: 14 }}>
                  <AnimNum value={results.reward.progNorm} /> <span style={{ fontSize: 12, color: "#666" }}>/ 10</span>
                </div>
                {results.checks.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 0",
                    borderBottom: i < results.checks.length - 1 ? "1px solid #1a1a2a" : "none",
                  }}>
                    <span style={{ fontSize: 11, color: "#aaa" }}>{c.name}</span>
                    <span style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 3,
                      background: c.passed ? "#34d39915" : "#fb718515",
                      color: c.passed ? "#34d399" : "#fb7185",
                      fontWeight: 600,
                    }}>
                      {c.passed ? "✓ " : "✗ "}{c.detail}
                    </span>
                  </div>
                ))}
              </div>

              {/* LLM Score */}
              <div style={{
                background: "#12121e",
                border: "1px solid #1e1e30",
                borderRadius: 6,
                padding: "16px",
              }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#f472b6", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🧠</span> LLM Judge Score
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#e0e0e8", marginBottom: 14 }}>
                  <AnimNum value={results.llm.score} /> <span style={{ fontSize: 12, color: "#666" }}>/ 10</span>
                </div>
                <div style={{
                  background: "#0e0e18",
                  borderRadius: 4,
                  padding: "10px 12px",
                  fontSize: 11,
                  color: "#aaa",
                  lineHeight: 1.6,
                  marginBottom: 14,
                }}>
                  <span style={{ color: "#f472b6", fontWeight: 600 }}>Reasoning: </span>
                  {results.llm.reasoning}
                </div>
                <div style={{ fontSize: 10, color: "#555", lineHeight: 1.6 }}>
                  <div style={{ marginBottom: 4 }}>Compares response against reference answer using semantic overlap (70%) + length heuristic (30%).</div>
                  <div style={{ color: "#444", fontStyle: "italic" }}>In production, this calls a real LLM judge API.</div>
                </div>
              </div>
            </div>

            {/* Reward Breakdown */}
            <div style={{
              background: "#12121e",
              border: "1px solid #1e1e30",
              borderRadius: 6,
              padding: "16px 20px",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#fbbf24", textTransform: "uppercase", marginBottom: 12 }}>
                🔢 Reward Computation
              </div>
              <div style={{ fontFamily: "inherit", fontSize: 12, color: "#c8c8d4", lineHeight: 2 }}>
                <div>
                  <span style={{ color: "#666" }}>Programmatic Score:</span>{" "}
                  <span style={{ color: "#a78bfa" }}>{results.reward.progNorm.toFixed(1)}</span>
                  <span style={{ color: "#555" }}> × 0.5 = {(results.reward.progNorm * 0.5).toFixed(2)}</span>
                </div>
                <div>
                  <span style={{ color: "#666" }}>LLM Score:</span>{" "}
                  <span style={{ color: "#f472b6" }}>{results.llm.score.toFixed(1)}</span>
                  <span style={{ color: "#555" }}> × 0.5 = {(results.llm.score * 0.5).toFixed(2)}</span>
                </div>
                {results.reward.penalty < 0 && (
                  <div>
                    <span style={{ color: "#666" }}>Penalty:</span>{" "}
                    <span style={{ color: "#fb7185" }}>{results.reward.penalty}</span>
                    <span style={{ color: "#555" }}> (forbidden word violation)</span>
                  </div>
                )}
                <div style={{ borderTop: "1px solid #2a2a3a", paddingTop: 6, marginTop: 4 }}>
                  <span style={{ color: "#666" }}>Final Reward:</span>{" "}
                  <span style={{ color: "#3af", fontWeight: 700, fontSize: 14 }}>{results.reward.reward.toFixed(2)}</span>
                  <span style={{ color: "#555" }}> = max(combined + penalty, 0)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{
            background: "#12121e",
            border: "1px solid #1e1e30",
            borderRadius: 6,
            padding: "16px 20px",
          }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", textTransform: "uppercase", marginBottom: 12 }}>
              Episode History (last {history.length})
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  background: "#0e0e18",
                  borderRadius: 4,
                  padding: "8px 12px",
                  minWidth: 100,
                }}>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>{h.task}</div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: h.reward.reward > 7 ? "#3af" : h.reward.reward > 4 ? "#fbbf24" : "#fb7185",
                  }}>
                    {h.reward.reward.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        textarea::placeholder { color: #444; }
        * { box-sizing: border-box; }
        button:hover { filter: brightness(1.15); }
      `}</style>
    </div>
  );
}
