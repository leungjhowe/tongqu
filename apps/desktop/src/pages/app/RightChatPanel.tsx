import { useState, type ReactNode } from "react";
import { useUIStore } from "@/stores/uiStore";
import { ChatPanel, Button, Card } from "@tps/ui";
import { Check, Pencil } from "lucide-react";

type ChatMsg = {
  id: string;
  role: "user" | "ai";
  content: string;
  rich?: ReactNode;
};

const INITIAL_MESSAGES: ChatMsg[] = [
  {
    id: "init-1",
    role: "user",
    content: "用OD数据画东莞流向图",
  },
  {
    id: "init-2",
    role: "ai",
    content: "已为你生成以下工作流：",
    rich: (
      <Card padding="sm" glow>
        <div className="font-mono text-sm text-foreground whitespace-pre-wrap break-words">
          OD数据 → 区域聚合 → 流向计算 → OpenLayers地图
        </div>
      </Card>
    ),
  },
  {
    id: "init-3",
    role: "ai",
    content: "请确认是否生成工作流？",
    rich: (
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => console.log("confirm workflow")}>
          <Check className="w-3.5 h-3.5" />
          确认
        </Button>
        <Button size="sm" variant="ghost" onClick={() => console.log("edit workflow")}>
          <Pencil className="w-3.5 h-3.5" />
          修改
        </Button>
      </div>
    ),
  },
];

let __msgId = 0;
const nextId = () => `msg-${++__msgId}`;

export default function RightChatPanel() {
  const chatPanelCollapsed = useUIStore((s) => s.chatPanelCollapsed);
  const toggleChatPanel = useUIStore((s) => s.toggleChatPanel);

  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_MESSAGES);

  const handleSend = (text: string) => {
    const userMsg: ChatMsg = {
      id: nextId(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Mock AI reply after a short delay
    window.setTimeout(() => {
      const aiMsg: ChatMsg = {
        id: nextId(),
        role: "ai",
        content: "我已记录，正在生成工作流…",
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  return (
    <ChatPanel
      title="Chat AI"
      subtitle="工作流编译器"
      messages={messages}
      onSend={handleSend}
      placeholder="描述你的工作流…"
      collapsed={chatPanelCollapsed}
      onCollapsedChange={(c) => {
        if (c !== chatPanelCollapsed) toggleChatPanel();
      }}
    />
  );
}
