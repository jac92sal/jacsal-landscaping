import { useEffect, useRef, useState } from 'react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { screenStep, QA, ScreenAnalysis } from '../../lib/screening';

interface ScreeningChatProps {
  contact: Record<string, unknown>;
  onComplete: (history: QA[], analysis: ScreenAnalysis | null) => void;
}

const MAX_QUESTIONS = 5;

export function ScreeningChat({ contact, onComplete }: ScreeningChatProps) {
  const [history, setHistory] = useState<QA[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const started = useRef(false);

  // Fetch the first question once on mount.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const turn = await screenStep(contact, []);
        if (turn.done) {
          onComplete([], turn.analysis);
          return;
        }
        setQuestion(turn.question);
      } catch (err) {
        console.warn('[screening-chat] could not start screening, skipping:', err);
        onComplete([], null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAnswer = async () => {
    if (!question || !answer.trim()) return;
    const nextHistory = [...history, { question, answer: answer.trim() }];
    setHistory(nextHistory);
    setAnswer('');
    setQuestion(null);
    setLoading(true);
    try {
      const turn = await screenStep(contact, nextHistory);
      if (turn.done) {
        onComplete(nextHistory, turn.analysis);
        return;
      }
      setQuestion(turn.question);
    } catch (err) {
      console.warn('[screening-chat] screening step failed, finishing:', err);
      onComplete(nextHistory, null);
    } finally {
      setLoading(false);
    }
  };

  const questionNumber = Math.min(history.length + 1, MAX_QUESTIONS);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="mb-1">A Few Quick Questions</h2>
          <p className="text-muted-foreground">
            Our assistant will ask a couple of tailored questions so we can prepare for your
            consultation.
          </p>
        </div>
      </div>

      {/* Answered so far (compact recap) */}
      {history.length > 0 && (
        <div className="space-y-3">
          {history.map((h, i) => (
            <div key={i} className="bg-muted/40 border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">{h.question}</div>
              <div className="text-foreground">{h.answer}</div>
            </div>
          ))}
        </div>
      )}

      {/* Current question card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-3 text-muted-foreground py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            Thinking about the best question to ask…
          </div>
        ) : question ? (
          <>
            <div className="text-xs font-mono text-muted-foreground mb-2">
              Question {questionNumber}
            </div>
            <p className="text-foreground mb-4">{question}</p>
            <textarea
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitAnswer();
              }}
              rows={4}
              className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
              placeholder="Type your answer…"
            />
            <button
              onClick={submitAnswer}
              disabled={!answer.trim()}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
