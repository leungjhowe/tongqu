import { memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Plus } from 'lucide-react';
import type { NodeEditorData } from './WorkflowCanvas';

interface NodeEditorProps extends NodeEditorData {
  nodeType?: string;
}

const ATTRACT_RANGE = 50; // px — 鼠标进入此范围后 handle 开始跟随
const MAX_OFFSET = 12; // px — handle 最大偏移量

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

  // 磁吸跟随：在窗口级别监听 pointermove，不依赖 React Flow 内部
  useEffect(() => {
    const elS = sourceRef.current;
    const elT = targetRef.current;
    if (!elS || !elT) return;

    const onMove = (e: PointerEvent) => {
      const updateTransform = (el: HTMLElement, cx: number, cy: number) => {
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < ATTRACT_RANGE) {
          // 按距离比例偏移，最大 MAX_OFFSET
          const factor = Math.min(1, (ATTRACT_RANGE - dist) / ATTRACT_RANGE);
          const ox = dx * factor * (MAX_OFFSET / Math.max(dist, 1));
          const oy = dy * factor * (MAX_OFFSET / Math.max(dist, 1));
          el.style.transform = `translate(${ox}px, ${oy}px)`;
          el.style.transition = 'none';
        } else if (el.style.transform !== '') {
          el.style.transform = '';
          el.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0, 1)';
        }
      };

      const rectS = elS.getBoundingClientRect();
      updateTransform(elS, rectS.left + rectS.width / 2, rectS.top + rectS.height / 2);
      const rectT = elT.getBoundingClientRect();
      updateTransform(elT, rectT.left + rectT.width / 2, rectT.top + rectT.height / 2);
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
        className="!w-10 !h-10 !bg-transparent !border-0 !rounded-full !-left-[34px] !flex !items-center !justify-center"
      >
        <span
          ref={targetRef}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-2 border-foreground/60 text-foreground/70 hover:border-primary hover:text-primary hover:scale-110 transition-all duration-base pointer-events-none"
        >
          <Plus className="w-4 h-4" />
        </span>
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !bg-transparent !border-0 !rounded-full !-right-[34px] !flex !items-center !justify-center"
      >
        <span
          ref={sourceRef}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-2 border-foreground/60 text-foreground/70 hover:border-primary hover:text-primary hover:scale-110 transition-all duration-base pointer-events-none"
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