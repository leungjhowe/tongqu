import { useEffect, useRef, useState } from 'react';
import { useStoreApi } from 'reactflow';
import { Plus } from 'lucide-react';
import type { WorkflowNode } from '@tps/workflow-core';

const DBG = (tag: string, data: any) =>
  console.log(`[conn][${tag}]`, JSON.stringify(data));

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
    // 容器 viewport 偏移
    const rect = containerRef.current?.getBoundingClientRect();
    const ox = rect?.left ?? 0;
    const oy = rect?.top ?? 0;
    const handles: HandlePos[] = [];
    for (const n of allNodes) {
      const pos = n.position ?? { x: 0, y: 0 };
      const measured = n.measured ?? {};
      const w = measured.width ?? 180;
      const h = measured.height ?? 180;
      handles.push({
        nodeId: n.id,
        side: 'target',
        x: pos.x * zoom + tx + ox,
        y: (pos.y + h / 2) * zoom + ty + oy,
      });
      handles.push({
        nodeId: n.id,
        side: 'source',
        x: (pos.x + w) * zoom + tx + ox,
        y: (pos.y + h / 2) * zoom + ty + oy,
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
    console.log('[conn] useEffect mount, container:', container);
    if (!container) return;

    DBG('init', {
      containerFound: !!container,
      tag: container.tagName,
      rect: container.getBoundingClientRect(),
    });

    const onPointerDown = (e: PointerEvent) => {
      const containerRect = container.getBoundingClientRect();
      DBG('pointerdown', {
        client: [e.clientX, e.clientY],
        button: e.button,
        target: (e.target as Element).tagName + '.' + (e.target as Element).className,
        containerRect: {
          x: containerRect.x,
          y: containerRect.y,
          width: containerRect.width,
          height: containerRect.height,
        },
      });

      if (e.button !== 0) return;

      const handles = computeHandles();
      const cursor = { x: e.clientX, y: e.clientY };
      DBG('handles', {
        count: handles.length,
        sample: handles.slice(0, 2),
        cursor,
        threshold: START_THRESHOLD,
      });

      let best: HandlePos | null = null;
      let bestDist = START_THRESHOLD;
      const distances: Array<{ h: HandlePos; d: number }> = [];
      for (const h of handles) {
        const d = Math.hypot(h.x - cursor.x, h.y - cursor.y);
        distances.push({ h, d });
        if (d <= bestDist) {
          best = h;
          bestDist = d;
        }
      }
      distances.sort((a, b) => a.d - b.d);
      DBG('distances', distances.slice(0, 4));
      DBG('hit', best);

      if (!best) {
        DBG('no_hit', 'abort');
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      DBG('start_draw', { from: best, cursor });
      // 起点 cursor 也要用视口坐标（clientX/Y）
      setDraw({ from: best, cursor: { x: e.clientX, y: e.clientY } });
    };

    container.addEventListener('pointerdown', onPointerDown, { capture: true });

    const onPointerMove = (e: PointerEvent) => {
      const d = drawRef.current;
      if (!d) return;
      const containerRect = container.getBoundingClientRect();
      // 容器坐标用于 distance 计算（与 computeHandles 一致）
      const cursor = { x: e.clientX - containerRect.left, y: e.clientY - containerRect.top };
      // 视口坐标用于 ghost 渲染（position: fixed）
      const viewportCursor = { x: e.clientX, y: e.clientY };

      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const cur = drawRef.current;
        if (!cur) return;
        const handles = computeHandles();
        const snap = findSnap(cursor, handles, cur.from);
        DBG('move', { cursor, snap: snap ?? null });
        setDraw({ ...cur, cursor: viewportCursor, snap: snap ?? undefined });
      });
    };

    const onPointerUp = () => {
      const current = drawRef.current;
      DBG('pointerup', { draw: current });
      if (!current) return;
      if (current.snap) {
        const conn = {
          source: current.from.side === 'source' ? current.from.nodeId : current.snap.nodeId,
          target: current.from.side === 'target' ? current.from.nodeId : current.snap.nodeId,
        };
        DBG('connect_fired', conn);
        onConnect(conn);
      } else {
        DBG('connect_skipped', 'no_snap');
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

  console.log('[conn] render ghost', { draw, container: containerRef.current });

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