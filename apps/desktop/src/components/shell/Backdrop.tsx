import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

import { useUIStore, type BackdropVariant } from "@/stores/uiStore";

const FLOW_COLORS = [
  "hsl(217 91% 60%)",
  "hsl(217 95% 72%)",
  "hsl(217 91% 48%)",
  "hsl(195 88% 62%)",
  "hsl(235 80% 70%)",
] as const;

const FLOW_DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, -1], // N
  [1, 0], // E
  [0, 1], // S
  [-1, 0], // W
] as const;

type Edge = "N" | "S" | "E" | "W";

function inwardDir(edge: Edge): 0 | 1 | 2 | 3 {
  if (edge === "N") return 2;
  if (edge === "S") return 0;
  if (edge === "E") return 3;
  return 1;
}

function pointOnEdge(edge: Edge, w: number, h: number, t: number, outside: number): [number, number] {
  if (edge === "N") return [t * w, -outside];
  if (edge === "S") return [t * w, h + outside];
  if (edge === "E") return [w + outside, t * h];
  return [-outside, t * h];
}

function pointsToD(points: Array<[number, number]>): string {
  return points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
}

const EDGES: Edge[] = ["N", "S", "E", "W"];

function randomEdgeAndInward(): { start: Edge; dir: 0 | 1 | 2 | 3 } {
  const start = EDGES[Math.floor(Math.random() * EDGES.length)] as Edge;
  return { start, dir: inwardDir(start) };
}

function buildPath(width: number, height: number, outside: number): {
  d: string;
  length: number;
  end: { edge: Edge; t: number };
} {
  const startT = 0.1 + Math.random() * 0.8;
  const { start, dir } = randomEdgeAndInward();
  const startPt = pointOnEdge(start, width, height, startT, outside);

  // Walk 2-4 right-angle segments inward
  const segmentCount = 2 + Math.floor(Math.random() * 3);
  const points: Array<[number, number]> = [startPt];
  let cur: [number, number] = startPt;
  let curDir = dir;

  for (let i = 0; i < segmentCount; i++) {
    const len = 80 + Math.random() * 200;
    // 70% 概率继续同向，30% 概率拐弯
    if (Math.random() < 0.3 && i > 0) {
      const nextIdx = (curDir + 1 + Math.floor(Math.random() * 3)) % 4;
      curDir = nextIdx as 0 | 1 | 2 | 3;
    }
    const step = FLOW_DIRS[curDir]!;
    cur = [cur[0] + step[0] * len, cur[1] + step[1] * len];
    points.push(cur);
  }

  // Continue to exit on a random edge
  const exitEdge = EDGES[Math.floor(Math.random() * EDGES.length)] as Edge;
  const exitT = 0.1 + Math.random() * 0.8;
  points.push(pointOnEdge(exitEdge, width, height, exitT, outside));

  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return { d: pointsToD(points), length, end: { edge: exitEdge, t: exitT } };
}

interface FlowPath {
  id: number;
  d: string;
  length: number;
  duration: number;
  delay: number;
  color: string;
}

function FlowField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState<FlowPath[]>([]);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);

  // Track size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Regenerate path geometry when size changes
  useEffect(() => {
    if (size.w === 0 || size.h === 0) return;
    const next: FlowPath[] = Array.from({ length: 6 }, (_, i) => {
      const { d, length } = buildPath(size.w, size.h, 100);
      return {
        id: i,
        d,
        length,
        duration: 6 + Math.random() * 6,
        delay: Math.random() * 4,
        color: FLOW_COLORS[Math.floor(Math.random() * FLOW_COLORS.length)]!,
      };
    });
    setPaths(next);
  }, [size.w, size.h]);

  // Animate strokes via GSAP
  useGSAP(
    () => {
      pathRefs.current.forEach((p, i) => {
        if (!p) return;
        const meta = paths[i];
        if (!meta) return;
        gsap.fromTo(
          p,
          { strokeDashoffset: meta.length, opacity: 0 },
          {
            strokeDashoffset: 0,
            opacity: 0.55,
            duration: meta.duration * 0.45,
            delay: meta.delay,
            ease: "power1.inOut",
            repeat: -1,
            repeatDelay: 0,
            yoyo: true,
          },
        );
      });
    },
    { dependencies: [paths], scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {/* Static dot grid */}
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-30">
        <defs>
          <pattern id="shell-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="hsl(var(--border))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#shell-dots)" />
      </svg>

      {/* Flow paths */}
      {size.w > 0 && (
        <svg
          width={size.w}
          height={size.h}
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
        >
          {paths.map((p, i) => (
            <path
              key={p.id}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={p.length}
              opacity={0}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

function GridBackdrop() {
  // 静态网格 + 节点图样（参考原 CenterCanvas 的 SVG 背景）
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 opacity-40">
        <defs>
          <pattern id="shell-grid-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="hsl(var(--border))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#shell-grid-dots)" />
        {/* Few faint connection lines */}
        <g stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.6}>
          <line x1="18%" y1="22%" x2="42%" y2="38%" />
          <line x1="42%" y1="38%" x2="64%" y2="30%" />
          <line x1="64%" y1="30%" x2="82%" y2="52%" />
          <line x1="30%" y1="68%" x2="52%" y2="58%" />
          <line x1="52%" y1="58%" x2="72%" y2="72%" />
        </g>
        <g fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1.5}>
          <circle cx="18%" cy="22%" r={4} />
          <circle cx="42%" cy="38%" r={4} />
          <circle cx="64%" cy="30%" r={4} />
          <circle cx="82%" cy="52%" r={4} />
          <circle cx="30%" cy="68%" r={4} />
          <circle cx="52%" cy="58%" r={4} />
          <circle cx="72%" cy="72%" r={4} />
        </g>
      </svg>
    </div>
  );
}

export default function Backdrop() {
  const variant: BackdropVariant = useUIStore((s) => s.backdropVariant);
  if (variant === "plain") {
    return <div aria-hidden="true" className="absolute inset-0 bg-background" />;
  }
  if (variant === "grid") return <GridBackdrop />;
  return <FlowField />;
}
