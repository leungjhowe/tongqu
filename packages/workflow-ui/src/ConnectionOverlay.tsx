import { useEffect, useRef, useState } from 'react';
import { useStoreApi } from 'reactflow';
import { Plus } from 'lucide-react';
import type { WorkflowNode } from '@tps/workflow-core';

/**
 * 端口磁吸连接浮层
 *
 * 监听画布 pointerdown：
 *  - 起点距任一 Handle 中心 < 30px → 启动 ghost
 *  - ghost 跟随鼠标（rAF 节流）
 *  - ghost 中心距另一 Handle 中心 < 40px → 磁吸对齐
 *  - mouseup → 吸附则触发 onConnect；否则取消
 *
 * 端口信息通过 React Flow store 获取（nodeInternals + transform）
 * 比 useNode 订阅更稳。
 */

interface HandlePos {
  nodeId: string;
  /** 'source' 在右 / 'target' 在左 */
  side: 'source' | 'target';
  /** 屏幕坐标（含 transform） */
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
  /** 容器 DOM（通常 = ReactFlow 节点 wrapper） */
  containerRef: React.RefObject<HTMLElement>;
}

const SNAP_THRESHOLD = 50; // ghost 中心距另一端口的吸附阈值
const START_THRESHOLD = 50; // pointerdown 起点距端口的触发阈值

export default function ConnectionOverlay({
  nodes,
  onConnect,
  containerRef,
}: ConnectionOverlayProps) {
  const storeApi = useStoreApi();
  const [ghost, setGhost] = useState<{
    from: HandlePos;
    cursor: { x: number; y: number };
    snap?: HandlePos; // 吸附到的目标
  } | null>(null);

  const rafRef = useRef<number>(0);
  const lastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /** 从 store 实时算所有 Handle 屏幕坐标 */
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
      // target 在节点左边（与 NodeEditor 一致）
      handles.push({
        nodeId: n.id,
        side: 'target',
        x: pos.x * zoom + tx,
        y: (pos.y + h / 2) * zoom + ty,
      });
      // source 在节点右边
      handles.push({
        nodeId: n.id,
        side: 'source',
        x: (pos.x + w) * zoom + tx,
        y: (pos.y + h / 2) * zoom + ty,
      });
    }
    return handles;
  };

  /** pointerdown 是否命中某个 Handle（container 坐标系） */
  const findHit = (clientX: number, clientY: number, handles: HandlePos[]): HandlePos | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: HandlePos | null = null;
    let bestDist = START_THRESHOLD;
    for (const h of handles) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d <= bestDist) {
        best = h;
        bestDist = d;
      }
    }
    return best;
  };

  /** mouseup 时距离最近 Handle 阈值内则 snap */
  const findSnap = (cursor: { x: number; y: number }, handles: HandlePos[], from: HandlePos): HandlePos | null => {
    let best: HandlePos | null = null;
    let bestDist = SNAP_THRESHOLD;
    for (const h of handles) {
      // 不能连接到同一节点的同一侧
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
      // 只响应左键
      if (e.button !== 0) return;
      const handles = computeHandles();
      const hit = findHit(e.clientX, e.clientY, handles);
      console.log('[connect-debug] pointerdown', { client: [e.clientX, e.clientY], handles: handles.length, hit: hit?.nodeId });
      if (!hit) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setGhost({ from: hit, cursor: lastPos.current });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!ghost) return;
      const rect = container.getBoundingClientRect();
      lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const handles = computeHandles();
        const snap = findSnap(lastPos.current, handles, ghost.from);
        setGhost((prev) =>
          prev ? { ...prev, cursor: lastPos.current, snap: snap ?? undefined } : prev
        );
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!ghost) return;
      e.preventDefault();
      if (ghost.snap) {
        onConnect({
          source: ghost.from.side === 'source' ? ghost.from.nodeId : ghost.snap.nodeId,
          target: ghost.from.side === 'target' ? ghost.from.nodeId : ghost.snap.nodeId,
        });
      }
      setGhost(null);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };

    // 用 window 监听 move/up，避免鼠标移出画布
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ghost, containerRef, onConnect]);

  if (!ghost) return null;

  return (
    <>
      {/* ghost 圆圈 — 跟随鼠标 */}
      <div
        className="pointer-events-none fixed z-floating"
        style={{
          left: ghost.cursor.x - 16,
          top: ghost.cursor.y - 16,
          transition: ghost.snap ? 'all 100ms cubic-bezier(0.2, 0, 0, 1)' : 'none',
        }}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-card border-2 border-primary text-primary shadow-elevation-3">
          <Plus className="w-4 h-4" />
        </div>
      </div>

      {/* 吸附目标高亮 */}
      {ghost.snap && (
        <div
          className="pointer-events-none fixed z-floating"
          style={{
            left: ghost.snap.x - 18,
            top: ghost.snap.y - 18,
            transition: 'all 100ms cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          <div className="w-9 h-9 rounded-full border-2 border-primary animate-pulse" />
        </div>
      )}

      {/* 连接线 — 从起点到光标（吸附时终点是对端端口） */}
      <svg
        className="pointer-events-none fixed inset-0 z-floating"
        width="100%"
        height="100%"
      >
        <line
          x1={ghost.from.x}
          y1={ghost.from.y}
          x2={ghost.snap ? ghost.snap.x : ghost.cursor.x}
          y2={ghost.snap ? ghost.snap.y : ghost.cursor.y}
          stroke="hsl(217 91% 60%)"
          strokeWidth={2}
        />
      </svg>
    </>
  );
}