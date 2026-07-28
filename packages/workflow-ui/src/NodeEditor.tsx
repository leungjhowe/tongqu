import { memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Plus } from 'lucide-react';
import type { NodeEditorData } from './WorkflowCanvas';

interface NodeEditorProps extends NodeEditorData {
  nodeType?: string;
}

const ATTRACT_RANGE = 42;
const RELEASE_RANGE = 50;
const FULL_SNAP = 8;

/**
 * 文本节点 — tapNow 风格。
 *
 * 磁吸行为：
 *  - 只有节点 active 时才生效（与 ChatPopover 同源）
 *  - mouse 靠近 → handle 中心平滑向鼠标偏移
 *  - mouse 在正中心 8px 内 → handle 完全对齐
 *  - mouse 远离 → 200ms 平滑归位
 */
function NodeEditorImpl(props: NodeEditorProps) {
  const { title, params } = props;
  const content = (params.content as string | undefined) ?? title ?? '';
  const sourceRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);

  // useRef 存 origin，避免 setState 触发 re-render → effect 重跑 → 死循环
  const originSrc = useRef<{ x: number; y: number } | null>(null);
  const originTgt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!props.active) {
      if (sourceRef.current) sourceRef.current.style.transform = '';
      if (targetRef.current) targetRef.current.style.transform = '';
      originSrc.current = null;
      originTgt.current = null;
      return;
    }

    const elS = sourceRef.current;
    const elT = targetRef.current;
    if (!elS || !elT) return;

    // active 变化时立即 capture 一次
    const rectS0 = elS.getBoundingClientRect();
    const rectT0 = elT.getBoundingClientRect();
    originSrc.current = { x: rectS0.left + rectS0.width / 2, y: rectS0.top + rectS0.height / 2 };
    originTgt.current = { x: rectT0.left + rectT0.width / 2, y: rectT0.top + rectT0.height / 2 };
    console.log('[magnet] active=true, origin=', originSrc.current, originTgt.current);

    const onMove = (e: PointerEvent) => {
      // lazy init if refs still null
      if (!originSrc.current || !originTgt.current) {
        const rS = elS.getBoundingClientRect();
        const rT = elT.getBoundingClientRect();
        originSrc.current = { x: rS.left + rS.width / 2, y: rS.top + rS.height / 2 };
        originTgt.current = { x: rT.left + rT.width / 2, y: rT.top + rT.height / 2 };
      }

      const updateTransform = (el: HTMLElement, origin: { x: number; y: number }) => {
        const dx = e.clientX - origin.x;
        const dy = e.clientY - origin.y;
        const dist = Math.hypot(dx, dy);

        if (dist < RELEASE_RANGE) {
          if (dist <= FULL_SNAP) {
            el.style.transform = `translate(${dx}px, ${dy}px)`;
            el.style.transition = 'none';
            el.style.borderColor = '#ffffff';
          } else {
            const factor = Math.max(0, 1 - dist / RELEASE_RANGE);
            el.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
            el.style.transition = 'transform 60ms ease-out';
            el.style.borderColor = '';
          }
        } else if (el.style.transform !== '') {
          el.style.transform = '';
          el.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0, 1)';
          el.style.borderColor = '';
        }
      };

      updateTransform(elS, originSrc.current);
      updateTransform(elT, originTgt.current);
      console.log('[magnet] move', { dist: Math.hypot(e.clientX - originSrc.current!.x, e.clientY - originSrc.current!.y) });
    };

    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [props.active]);

  return (
    <div
      className={`relative aspect-square bg-card text-card-foreground rounded-xl border transition-all duration-base ${
        props.active
          ? 'border-primary shadow-glow-primary'
          : 'border-border/60 hover:border-border-strong'
      }`}
      style={{ width: '180px' }}
    >
      {/* 端口 — 左右两侧 + 圆圈（仅 active 时磁吸） */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-8 !h-8 !bg-transparent !border-0 !rounded-full !-left-[48px] !flex !items-center !justify-center"
      >
        <span
          ref={targetRef}
          className={`flex items-center justify-center w-7 h-7 rounded-full bg-transparent text-foreground/60 hover:text-primary hover:scale-110 transition-all duration-base pointer-events-none ${
            (props.active || props.hover) ? "opacity-100" : "opacity-0"
          }`}
          style={{ border: '2px solid rgba(180,185,192,0.85)' }}
        >
          <Plus className="w-4 h-4" />
        </span>
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-8 !h-8 !bg-transparent !border-0 !rounded-full !-right-[48px] !flex !items-center !justify-center"
      >
        <span
          ref={sourceRef}
          className={`flex items-center justify-center w-7 h-7 rounded-full bg-transparent text-foreground/60 hover:text-primary hover:scale-110 transition-all duration-base pointer-events-none ${
            (props.active || props.hover) ? "opacity-100" : "opacity-0"
          }`}
          style={{ border: '2px solid rgba(180,185,192,0.85)' }}
        >
          <Plus className="w-4 h-4" />
        </span>
      </Handle>

      {/* 主体文本 — 居中 */}
      <div className="flex items-center justify-center h-full px-4">
        {content.trim() ? (
          <p className="text-body text-foreground text-center whitespace-pre-wrap break-words line-clamp-6">
            {content}
          </p>
        ) : (
          <p className="text-micro text-muted-foreground/50 italic">空</p>
        )}
      </div>
    </div>
  );
}


export default memo(NodeEditorImpl);
