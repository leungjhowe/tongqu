import { Button } from "@tps/ui";
import { LAYOUT, NAV_ITEMS } from "@tps/shared";
import type { WorkflowGraph } from "@tps/workflow-core";

// Pre-computed "node graph" connection points (as percentages of canvas).
// 4-6 thin dashed lines evoking connections between nodes.
const CONNECTIONS: Array<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}> = [
  { x1: 18, y1: 22, x2: 42, y2: 38 },
  { x1: 42, y1: 38, x2: 64, y2: 30 },
  { x1: 64, y1: 30, x2: 82, y2: 52 },
  { x1: 30, y1: 68, x2: 52, y2: 58 },
  { x1: 52, y1: 58, x2: 72, y2: 72 },
  { x1: 22, y1: 44, x2: 30, y2: 68 },
];

// Small "node" markers at the endpoints of connections
const NODES: Array<{ x: number; y: number }> = [
  { x: 18, y: 22 },
  { x: 42, y: 38 },
  { x: 64, y: 30 },
  { x: 82, y: 52 },
  { x: 30, y: 68 },
  { x: 52, y: 58 },
  { x: 72, y: 72 },
  { x: 22, y: 44 },
];

// Type-only demonstration that @tps/workflow-core is wired in.
// The graph is not rendered — it exists so the type import is exercised
// at compile time and a future MVP will have something to fill in.
const placeholderGraph: WorkflowGraph = {
  id: "p1",
  name: "Empty",
  nodes: [],
  edges: [],
};

export default function CenterCanvas() {
  return (
    <main className="relative flex-1 min-w-0 h-full bg-background overflow-hidden">
      {/* Faint node-graph background grid + connection lines */}
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0 opacity-40 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="canvas-dots"
            x="0"
            y="0"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="hsl(var(--border))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#canvas-dots)" />

        {/* Connection lines */}
        {CONNECTIONS.map((c, i) => (
          <line
            key={`line-${i}`}
            x1={`${c.x1}%`}
            y1={`${c.y1}%`}
            x2={`${c.x2}%`}
            y2={`${c.y2}%`}
            stroke="hsl(var(--border))"
            strokeOpacity={0.8}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}

        {/* Node markers */}
        {NODES.map((n, i) => (
          <g key={`node-${i}`}>
            <circle
              cx={`${n.x}%`}
              cy={`${n.y}%`}
              r={4}
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth={1.5}
            />
          </g>
        ))}
      </svg>

      {/* Top-left floating zoom toolbar */}
      <div className="absolute top-3 left-3 flex gap-1 bg-card border border-border rounded-md p-1 z-10">
        <Button variant="ghost" size="icon" title="放大" aria-label="放大">
          +
        </Button>
        <Button variant="ghost" size="icon" title="缩小" aria-label="缩小">
          −
        </Button>
        <Button variant="ghost" size="icon" title="适应屏幕" aria-label="适应屏幕">
          ⤢
        </Button>
      </div>

      {/* Centered placeholder text stack */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
        <div className="text-2xl font-semibold text-muted-foreground tracking-wide">
          工作流画布
        </div>
        <div className="text-sm text-muted-foreground">
          Workflow Canvas · 拖拽节点以构建工作流
        </div>
        <div className="pointer-events-auto">
          <Button variant="ghost" size="sm" disabled>
            即将支持 React Flow
          </Button>
        </div>
      </div>

      {/* Footer overlay — proves @tps/shared is wired into the app.
          Renders LAYOUT header dims + the shared NAV_ITEMS list. */}
      <footer
        data-testid="tps-shared-footer"
        className="absolute left-3 right-3 bottom-2 flex items-center justify-between gap-3 text-xs text-muted-foreground bg-card border border-border rounded-md px-3 py-1.5 pointer-events-none"
      >
        <span>
          header {LAYOUT.HEADER_HEIGHT}px · sidebar {LAYOUT.SIDEBAR_WIDTH}
          px · chat {LAYOUT.CHAT_PANEL_WIDTH}px
        </span>
        <span className="flex gap-2">
          {NAV_ITEMS.map((item) => (
            <span key={item.key}>
              {item.icon} {item.label}
            </span>
          ))}
        </span>
      </footer>
    </main>
  );
}
