import { useState } from "react";
import type { ReactElement } from "react";
import type { QueryResponse } from "../types";

interface ChatPanelProps {
  onSubmit: (question: string) => Promise<void>;
  latestResult: QueryResponse | null;
  loading: boolean;
}

export function ChatPanel(props: ChatPanelProps): ReactElement {
  const { onSubmit, latestResult, loading } = props;
  const [question, setQuestion] = useState(
    "Which products are associated with the highest number of billing documents?"
  );

  return (
    <section className="chat-panel">
      <h2>Ask O2C Questions</h2>
      <p className="panel-subtitle">
        Answers are grounded in graph query results from this dataset.
      </p>

      <textarea
        className="question-input"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={4}
      />

      <button
        className="submit-button"
        onClick={() => void onSubmit(question)}
        disabled={loading || question.trim().length === 0}
      >
        {loading ? "Running query..." : "Run Query"}
      </button>

      <div className="response-box">
        {!latestResult ? (
          <p>No query executed yet.</p>
        ) : (
          <>
            <h3>Answer</h3>
            <p>{latestResult.answer}</p>

            <h3>Guardrail</h3>
            <p>
              {latestResult.guardrail.allowed
                ? "allowed"
                : `blocked: ${latestResult.guardrail.reason}`}
            </p>

            <h3>Generated Cypher</h3>
            <pre>{latestResult.generatedQuery || "(none)"}</pre>

            <h3>Rows ({latestResult.rows.length})</h3>
            <pre>{JSON.stringify(latestResult.rows.slice(0, 10), null, 2)}</pre>
          </>
        )}
      </div>
    </section>
  );
}
