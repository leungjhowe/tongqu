import { memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Plus } from 'lucide-react';
import type { NodeEditorData } from './WorkflowCanvas';

interface NodeEditorProps extends NodeEditorData {
  nodeType?: string;
}

const ATTRACT_RANGE = 42; // px — 进入此范围开始跟随
const RELEASE_RANGE = 50; // px — 超出此范围归位
const FULL_SNAP = 8; // px — 此距离内完全对齐鼠标

/**
 * 文本节点 — tapNow 风格。
 *
 * 左右 Handle 圆圈在鼠标靠近时产生磁吸跟随效果，
 * 在节点边缘可以拉出连线范围时释放回原位。
 */
function NodeEditorImpl(props: NodeEditorProps) {
  const { title, params } = props;
  const content = (params.content as string | undefined) ?? title ?? '';
  const sourceRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);

  // 磁吸跟随：在窗口级别监听 pointermove
  // 用 useState 存 handle 原始中心坐标（mount 时取一次后不再更新，
  // 避免 transform 偏移 → 坐标变化 → 再偏移 的反馈闭环）
  const originSrc = useRef<{ x: number; y: number } | null>(null);
  const originTgt = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const elS = sourceRef.current;
    const elT = targetRef.current;
    if (!elS || !elT) {
      console.warn('[magnet] refs not ready');
      return;
    }

    // lazy init on first pointermove
    const onMove = (e: PointerEvent) => {
      if (!originSrc.current || !originTgt.current) {
        const rectS = elS.getBoundingClientRect();
        const rectT = elT.getBoundingClientRect();
        originSrc.current = { x: rectS.left + rectS.width / 2, y: rectS.top + rectS.height / 2 };
        originTgt.current = { x: rectT.left + rectT.width / 2, y: rectT.top + rectT.height / 2 };
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

      if (originSrc.current) updateTransform(elS, originSrc.current);
      if (originTgt.current) updateTransform(elT, originTgt.current);
    };

    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div
      className={`relative aspect-square w-[180px] bg-card text-card-foreground rounded-xl border transition-all duration-base ${
        props.active
          ? 'border-primary shadow-glow-primary'
          : 'border-border/60 hover:border-border-strong'
      }`}
    >
      {/* 端口 — 左右两侧 + 圆圈 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-8 !h-8 !bg-transparent !border-0 !rounded-full !-left-[48px] !flex !items-center !justify-center"
      >
        <span
          ref={targetRef}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-transparent text-foreground/60 hover:text-primary hover:scale-110 transition-all duration-base pointer-events-none"
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
          className="flex items-center justify-center w-7 h-7 rounded-full bg-transparent text-foreground/60 hover:text-primary hover:scale-110 transition-all duration-base pointer-events-none"
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