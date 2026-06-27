import { memo, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Plus } from 'lucide-react';
import type { NodeEditorData } from './WorkflowCanvas';

interface NodeEditorProps extends NodeEditorData {
  nodeType?: string;
}

const ATTRACT_RANGE = 55; // px — 进入此范围开始跟随
const RELEASE_RANGE = 60; // px — 超出此范围归位（+5 hysteresis 防抖）

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

        if (dist < RELEASE_RANGE) {
          // 磁吸跟随：鼠标靠近 → handle 平滑偏移
          // dist=RELEASE_RANGE 时 factor=0（不偏移）
          // dist=0 时 factor 接近 0.95（几乎对齐鼠标）
          const factor = Math.max(0, Math.min(0.95, 1 - dist / RELEASE_RANGE));
          const ox = dx * factor;
          const oy = dy * factor;
          el.style.transform = `translate(${ox}px, ${oy}px)`;
          el.style.transition = dist < 8 ? 'none' : 'transform 60ms ease-out';
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
        className="!w-8 !h-8 !bg-transparent !border-0 !rounded-full !-left-[30px] !flex !items-center !justify-center"
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
        className="!w-8 !h-8 !bg-transparent !border-0 !rounded-full !-right-[30px] !flex !items-center !justify-center"
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