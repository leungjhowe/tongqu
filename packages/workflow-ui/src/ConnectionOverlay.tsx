import { useEffect, useRef, useState } from 'react';
import { useStoreApi } from 'reactflow';
import { Plus } from 'lucide-react';
import type { WorkflowNode } from '@tps/workflow-core';

interface HandlePos {
  nodeId: string;
  side: 'source' | 'target';
  x: number;
  y: number;
}

interface ConnectionOverlayProps {
  nodes: WorkflowNode[];
  onConnect: (connection: {
    source: string | null;
    target: string | null;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => void;
  containerRef: React.RefObject<HTMLElement>;
}

const START_THRESHOLD = 50;
const SNAP_THRESHOLD = 50;

export default function ConnectionOverlay({
  nodes: _nodes,
  onConnect,
  containerRef,
}: ConnectionOverlayProps) {
  const storeApi = useStoreApi();
  const [draw, setDraw] = useState<{
    from: HandlePos;
    cursor: { x: number; y: number };
    snap?: HandlePos;
  } | null>(null);

  const drawRef = useRef(draw);
  drawRef.current = draw;
  const rafRef = useRef(0);

  const computeHandles = (): HandlePos[] => {
    const s: any = storeApi.getState();
    const [tx, ty, zoom] = s.transform as [number, number, number];
    const allNodes: any[] = s.getNodes?.() ?? [];
    const handles: HandlePos[] = [];
    for (const n of allNodes) {
      const pos = n.position ?? { x: 0, y: 0 };
      const measured = n.measured ?? {};
      const w = measured.width ?? 180;
      const h = measured.height ?? 180;
      handles.push({
        nodeId: n.id,
        side: 'target',
        x: pos.x * zoom + tx,
        y: (pos.y + h / 2) * zoom + ty,
      });
      handles.push({
        nodeId: n.id,
        side: 'source',
        x: (pos.x + w) * zoom + tx,
        y: (pos.y + h / 2) * zoom + ty,
      });
    }
    return handles;
  };

  const findSnap = (
    cursor: { x: number; y: number },
    handles: HandlePos[],
    from: HandlePos
  ): HandlePos | null => {
    let best: HandlePos | null = null;
    let bestDist = SNAP_THRESHOLD;
    for (const h of handles) {
      if (h.nodeId === from.nodeId && h.side === from.side) continue;
      const d = Math.hypot(h.x - cursor.x, h.y - cursor.y);
      if (d <= bestDist) {
        best = h;
        bestDist = d;
      }
    }
    return best;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const rect = container.getBoundingClientRect();
      const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const handles = computeHandles();
      let best: HandlePos | null = null;
      let bestDist = START_THRESHOLD;
      for (const h of handles) {
        const d = Math.hypot(h.x - cursor.x, h.y - cursor.y);
        if (d <= bestDist) {
          best = h;
          bestDist = d;
        }
      }
      if (!best) return;
      e.preventDefault();
      e.stopPropagation();
      setDraw({ from: best, cursor });
    };

    // capture 阶段确保我们比 React Flow 的 connectionindicator 先收到
    container.addEventListener('pointerdown', onPointerDown, { capture: true });

    const onPointerMove = (e: PointerEvent) => {
      if (!drawRef.current) return;
      const rect = container.getBoundingClientRect();
      const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (!drawRef.current) return;
        const handles = computeHandles();
        const snap = findSnap(cursor, handles, drawRef.current.from);
        setDraw({ ...drawRef.current!, cursor, snap: snap ?? undefined });
      });
    };

    const onPointerUp = () => {
      const current = drawRef.current;
      if (!current) return;
      if (current.snap) {
        onConnect({
          source: current.from.side === 'source' ? current.from.nodeId : current.snap.nodeId,
          target: current.from.side === 'target' ? current.from.nodeId : current.snap.nodeId,
        });
      }
      setDraw(null);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onConnect, containerRef]);

  if (!draw) return null;

  return (
    <>
      <div
        className="pointer-events-none fixed z-floating"
        style={{
          left: draw.cursor.x - 18,
          top: draw.cursor.y - 18,
          transition: draw.snap ? 'all 100ms cubic-bezier(0.2, 0, 0, 1)' : 'none',
        }}
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-card border-2 border-primary text-primary shadow-elevation-3">
          <Plus className="w-4 h-4" />
        </div>
      </div>

      {draw.snap && (
        <div
          className="pointer-events-none fixed z-floating"
          style={{
            left: draw.snap.x - 20,
            top: draw.snap.y - 20,
            transition: 'all 100ms cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          <div className="w-10 h-10 rounded-full border-2 border-primary animate-pulse" />
        </div>
      )}

      <svg className="pointer-events-none fixed inset-0 z-floating" width="100%" height="100%">
        <line
          x1={draw.from.x}
          y1={draw.from.y}
          x2={draw.snap ? draw.snap.x : draw.cursor.x}
          y2={draw.snap ? draw.snap.y : draw.cursor.y}
          stroke="hsl(217 91% 60%)"
          strokeWidth={2}
        />
      </svg>
    </>
  );
}