import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from './Button';
import { Input } from './Input';

export interface ChatPanelMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  /** Optional rich content rendered below the text (e.g., workflow preview card). */
  rich?: React.ReactNode;
}

export interface ChatPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  messages?: ChatPanelMessage[];
  onSend?: (text: string) => void;
  placeholder?: string;
  /** Controlled collapsed state. When true, panel renders nothing. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const ChatPanel = React.forwardRef<HTMLDivElement, ChatPanelProps>(
  (
    {
      className,
      title = 'Chat AI',
      subtitle = '工作流编译器',
      messages = [],
      onSend,
      placeholder = '描述你的工作流…',
      collapsed = false,
      onCollapsedChange,
      ...props
    },
    ref
  ) => {
    const [draft, setDraft] = React.useState('');
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages.length]);

    if (collapsed) return null;

    const submit = () => {
      const text = draft.trim();
      if (!text || !onSend) return;
      onSend(text);
      setDraft('');
    };

    return (
      <aside
        ref={ref}
        className={cn(
          'flex h-full w-full flex-col border-l border-border bg-card text-card-foreground',
          className
        )}
        {...props}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <div>
            <div className="text-h3 text-foreground">{title}</div>
            <div className="text-caption text-muted-foreground">{subtitle}</div>
          </div>
          {onCollapsedChange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCollapsedChange(true)}
              aria-label="折叠"
              className="h-7 w-7 p-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 15 15"
                fill="none"
                aria-hidden
              >
                <path
                  d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z"
                  fill="currentColor"
                />
              </svg>
            </Button>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-auto p-3 flex flex-col gap-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'flex flex-col gap-1 max-w-[85%]',
                m.role === 'user' ? 'self-end items-end' : 'self-start items-start'
              )}
            >
              <div
                className={cn(
                  'rounded-md px-3 py-2 text-body whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-transparent text-foreground'
                )}
              >
                {m.content}
              </div>
              {m.rich}
            </div>
          ))}
        </div>

        <footer className="border-t border-border p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2"
          >
            <Input
              block
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              className="flex-1"
              label={undefined}
            />
            <Button type="submit" variant="default" size="md" disabled={!draft.trim()}>
              发送
            </Button>
          </form>
        </footer>
      </aside>
    );
  }
);
ChatPanel.displayName = 'ChatPanel';