import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../lib/types';

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, loading, onSend }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const submit = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    onSend(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message message-${msg.role}`}>
            <div className="message-bubble">
              {msg.content.split('\n').map((line, j) => (
                <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message message-assistant">
            <div className="message-bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type what you need to order… e.g. '10 rolls of 3M 3930 white prismatic 762mm' or 'I need some Orafol IIIb yellow'"
          rows={2}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={submit}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>

      <div className="chat-hints">
        <span>Try:</span>
        {[
          '3M white prismatic film',
          'Orafol retroreflective yellow',
          'Spandex application tape',
          'Laws Laser cutting',
        ].map(hint => (
          <button
            key={hint}
            className="hint-chip"
            onClick={() => onSend(hint)}
            disabled={loading}
          >
            {hint}
          </button>
        ))}
      </div>
    </div>
  );
}
