import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
// Input from "@tps/ui" was replaced with inline FloatingInput below.
import { useAuthStore } from "@/stores/authStore";
import { ArrowRight, CircleDot, Loader2 } from "lucide-react";

gsap.registerPlugin(useGSAP);

/* ------------------------------------------------------------------ */
/* Background flow paths.  Each path starts off-screen on a random    */
/* edge of the viewport, walks 2-4 right-angle segments across the     */
/* grid, and exits on (potentially) another edge.  Color, length,      */
/* speed, and direction of every walk are randomised on every cycle   */
/* (not just at mount), so the field never repeats.                    */
/* ------------------------------------------------------------------ */
const FLOW_COLORS = [
  "hsl(217 91% 60%)",   // primary blue
  "hsl(217 95% 72%)",   // lighter blue
  "hsl(217 91% 48%)",   // darker blue
  "hsl(195 88% 62%)",   // cyan-blue
  "hsl(235 80% 70%)",   // soft indigo
];

const FLOW_DIRS = [
  [0, -1], // N
  [1, 0],  // E
  [0, 1],  // S
  [-1, 0], // W
] as const;

// Direction to walk INWARD from a given starting edge.
function inwardDir(edge: "N" | "S" | "E" | "W"): 0 | 1 | 2 | 3 {
  if (edge === "N") return 2; // walk south into the viewport
  if (edge === "S") return 0;
  if (edge === "E") return 3;
  return 1;
}

function pointOnEdge(
  edge: "N" | "S" | "E" | "W",
  width: number,
  height: number,
  t: number,
  outside: number,
): [number, number] {
  if (edge === "N") return [t * width, -outside];
  if (edge === "S") return [t * width, height + outside];
  if (edge === "E") return [width + outside, t * height];
  return [-outside, t * height];
}

// Polyline length (sum of straight segments).
function polylineLength(points: Array<[number, number]>): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  }
  return len;
}

function pointsToD(points: Array<[number, number]>): string {
  return points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");
}

type FlowPath = {
  id: number;
  d: string;
  length: number;
  duration: number;
  startTime: number;       // performance.now() when this cycle started
  color: string;
};

// Generate one random path.  Reused on every cycle (not just at mount).
function generateFlowPath(
  width: number,
  height: number,
  grid: number,
  id: number,
  startTime: number,
  rng: () => number = Math.random,
): FlowPath {
  // Pick start and end edges (must be different).
  const edges: Array<"N" | "S" | "E" | "W"> = ["N", "S", "E", "W"];
  const startEdge = edges[Math.floor(rng() * 4)];
  const endEdge = edges[(Math.floor(rng() * 3) + (startEdge === edges[0] ? 1 : 0)) % 4];

  // Points sit slightly off-screen so the line clearly enters/exits.
  const outside = grid * 1.5;
  const startT = 0.12 + rng() * 0.76;
  const endT = 0.12 + rng() * 0.76;
  const start = pointOnEdge(startEdge, width, height, startT, outside);
  const end = pointOnEdge(endEdge, width, height, endT, outside);

  // Walk inward from the start edge, do 2-4 segments with random 90
  // degree turns.  Every step stays axis-aligned: when the walk ends
  // up off-axis from the end point we insert a single right-angle turn
  // before the final leg so no segment is ever diagonal AND never a
  // 180 deg backtrack.  The trick is to always pick the turn point
  // perpendicular to the last interior direction.
  const points: Array<[number, number]> = [start];
  let x = start[0];
  let y = start[1];
  let dir = inwardDir(startEdge);

  const segCount = 2 + Math.floor(rng() * 3); // 2-4 interior segments
  for (let i = 0; i < segCount; i++) {
    const segLen = (3 + Math.floor(rng() * 7)) * grid;
    x += FLOW_DIRS[dir][0] * segLen;
    y += FLOW_DIRS[dir][1] * segLen;
    points.push([x, y]);
    if (i < segCount - 1) {
      dir = (dir + (rng() < 0.5 ? 1 : 3)) % 4;
    }
  }
  // Final: route to the end edge with right-angle segments only, and
  // never produce a 180 deg backtrack at the inserted turn point.
  const last = points[points.length - 1];
  if (last[0] !== end[0] && last[1] !== end[1]) {
    // Off-axis on both axes: insert a single right-angle turn point.
    // Pick the orientation that is perpendicular to `dir` (the last
    // interior direction).  That guarantees the next segment is a
    // 90 deg turn, never 180.
    const lastIsVertical = dir === 0 || dir === 2;
    if (lastIsVertical) {
      // Last interior was vertical; turn horizontal.
      points.push([end[0], last[1]]);
    } else {
      // Last interior was horizontal; turn vertical.
      points.push([last[0], end[1]]);
    }
  }
  points.push(end);

  return {
    id,
    d: pointsToD(points),
    length: polylineLength(points),
    duration: 2.4 + rng() * 2.6, // 2.4 - 5s draw
    startTime,
    color: FLOW_COLORS[Math.floor(rng() * FLOW_COLORS.length)],
  };
}

function generateInitialFlowPaths(
  width: number,
  height: number,
  grid: number,
  count: number,
  startTime: number,
): FlowPath[] {
  const paths: FlowPath[] = [];
  for (let i = 0; i < count; i++) {
    paths.push(generateFlowPath(width, height, grid, i, startTime));
  }
  return paths;
}

/* ------------------------------------------------------------------ */
/* Domain-specific visualization: a stylized transportation network.  */
/* A few intersection nodes are wired together with curved paths, and */
/* a scan light rides each path on a slow loop. Status rings on the  */
/* major nodes pulse to suggest live traffic data.                    */
/* ------------------------------------------------------------------ */
const NETWORK_NODES = [
  { id: "n1", x: 80, y: 90, size: 8, label: "A1" },
  { id: "n2", x: 240, y: 60, size: 6, label: "B2" },
  { id: "n3", x: 360, y: 140, size: 10, label: "HUB" },
  { id: "n4", x: 130, y: 220, size: 7, label: "C3" },
  { id: "n5", x: 290, y: 260, size: 9, label: "J4" },
  { id: "n6", x: 200, y: 340, size: 6, label: "D5" },
  { id: "n7", x: 60, y: 320, size: 5, label: "E6" },
] as const;

const NETWORK_PATHS: ReadonlyArray<readonly [string, string]> = [
  ["n1", "n2"],
  ["n2", "n3"],
  ["n1", "n4"],
  ["n3", "n5"],
  ["n4", "n5"],
  ["n4", "n6"],
  ["n5", "n6"],
  ["n4", "n7"],
  ["n6", "n7"],
];

/* Clock used in the live data strip. We update it on a slow interval  */
/* so it reads as a "live" indicator without crossing into dashboard   */
/* territory (a real dashboard widget would have real data).           */
function useLiveTimestamp() {
  const [stamp, setStamp] = useState(() => formatStamp(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setStamp(formatStamp(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);
  return stamp;
}

function formatStamp(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* Tiny metric card.  Shows a label, a big number, and a thin accent  */
/* bar on top.  Used 3-up in the branding column to convey a "live"   */
/* feel without being a real dashboard widget.                        */
type MetricCardProps = {
  label: string;
  value: number;
  format?: "plain" | "compact" | "ms";
  accent?: "primary";
};

function MetricCard({ label, value, format = "plain", accent = "primary" }: MetricCardProps) {
  let display: string;
  if (format === "compact") {
    if (value >= 1000) display = (value / 1000).toFixed(1) + "K";
    else display = String(value);
  } else if (format === "ms") {
    display = String(value) + "ms";
  } else {
    display = String(value);
  }
  const accentClass =
    accent === "primary"
      ? "from-primary/80 to-primary/30"
      : "from-foreground/50 to-foreground/10";

  // Force every label to break after the first word so the three cards
  // stay vertically aligned regardless of how short any single label is.
  const [firstWord, ...rest] = label.split(" ");
  const restLabel = rest.join(" ");

  return (
    <div className="relative px-3 py-2.5 rounded-md border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      <span
        aria-hidden
        className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${accentClass}`}
      />
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70 leading-tight mb-2 min-h-[28px]">
        {firstWord}
        {restLabel && (
          <>
            <br />
            {restLabel}
          </>
        )}
      </div>
      <div className="text-lg font-mono tabular-nums text-foreground leading-none font-medium">
        {display}
      </div>
    </div>
  );
}

/* Inline input with a floating label and an animated bottom rule.     */
/* Drives everything from React state so the floating state matches   */
/* the controlled value precisely (no peer/:placeholder-shown tricks). */
type FloatingInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "placeholder"
> & {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
};

function FloatingInput({
  label,
  value,
  onChange,
  error,
  ...rest
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  const floating = focused || filled;
  const showError = Boolean(error);
  const id = useId();

  return (
    <div className="relative pt-5">
      <input
        {...rest}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholder=" "
        className={
          "peer w-full bg-transparent border-0 border-b outline-none pt-2 pb-2 text-sm text-foreground " +
          "transition-colors duration-200 " +
          (showError
            ? "border-destructive/70 focus:border-destructive "
            : "border-border/60 focus:border-primary ") +
          "focus:ring-0"
        }
      />
      <label
        htmlFor={id}
        className={
          "pointer-events-none absolute left-0 origin-left transition-all duration-200 ease-out " +
          (floating
            ? "top-0 text-[11px] tracking-wider uppercase font-medium " +
              (showError ? "text-destructive" : "text-primary")
            : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground")
        }
      >
        {label}
      </label>
      {/* Animated underline that fills in on focus. */}
      <span
        aria-hidden
        className={
          "pointer-events-none absolute left-0 right-0 bottom-0 h-px origin-left transition-transform duration-300 ease-out " +
          (focused
            ? "scale-x-100 " + (showError ? "bg-destructive" : "bg-primary")
            : "scale-x-0 bg-transparent")
        }
        style={{ transform: focused ? "scaleX(1)" : "scaleX(0)" }}
      />
      {/* Tiny inline error text. */}
      {showError && (
        <span className="mt-1 text-[11px] text-destructive/90 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-destructive animate-pulse" />
          {error}
        </span>
      )}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  /* Live network metrics shown in the branding column.  These tick up   */
  /* on a slow interval so the panel reads as a live system, not a     */
  /* static marketing page.                                            */
  const [streams, setStreams] = useState(12);
  const [processed, setProcessed] = useState(1247);
  const [latency, setLatency] = useState(42);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setStreams((s) => Math.max(8, Math.min(22, s + Math.round((Math.random() - 0.5) * 2))));
      setProcessed((p) => p + Math.floor(Math.random() * 14) + 3);
      setLatency((l) => Math.max(18, Math.min(85, l + Math.round((Math.random() - 0.5) * 8))));
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  /* Random background flow paths.  Regenerated on viewport resize so  */
  /* the grid count and aspect stay correct, and the user gets a new  */
  /* layout each time the window changes.                             */
  const [flowPaths, setFlowPaths] = useState<FlowPath[]>([]);
  const [flowDims, setFlowDims] = useState({ width: 1920, height: 1080 });

  const rootRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const gridFlowRef = useRef<SVGSVGElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const stamp = useLiveTimestamp();
  const displayError = localError ?? error ?? undefined;

  /* Generate flow paths on mount and on resize.  Debounced so a      */
  /* drag-resize doesn't generate hundreds of layouts.                */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // In reduce-motion mode, paths still draw, just once and stay.
      const w = window.innerWidth;
      const h = window.innerHeight;
      const t0 = performance.now();
      setFlowDims({ width: w, height: h });
      const count = Math.max(5, Math.min(14, Math.round((w * h) / 140000)));
      setFlowPaths(generateInitialFlowPaths(w, h, 32, count, t0));
      return;
    }

    const generate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const t0 = performance.now();
      setFlowDims({ width: w, height: h });
      // Density scales with viewport area.  ~14 paths on a 1920x1080 screen.
      const area = w * h;
      const count = Math.max(5, Math.min(14, Math.round(area / 140000)));
      setFlowPaths(generateInitialFlowPaths(w, h, 32, count, t0));
    };

    generate();
    let timer: number | null = null;
    const onResize = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(generate, 220);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (timer != null) window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* ---------------------------------------------------------- */
  /* Entrance timeline.  Honours prefers-reduced-motion through  */
  /* gsap.matchMedia: the reduce branch collapses to a static   */
  /* render with no orchestration.                              */
  /* ---------------------------------------------------------- */
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) {
        gsap.set(
          [
            "[data-anim='header']",
            "[data-anim='brand-logo']",
            "[data-anim='brand-headline']",
            "[data-anim='brand-sub']",
            "[data-anim='brand-meta']",
            "[data-anim='network']",
            "[data-anim='status-strip']",
            "[data-anim='metrics']",
            "[data-anim='form-card']",
            "[data-anim='form-foot']",
          ],
          { autoAlpha: 1, y: 0, x: 0, scale: 1 },
        );
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Background layer fades in first so the form sits on something.
      tl.from(
        "[data-anim='bg-grid'], [data-anim='bg-flow']",
        {
          autoAlpha: 0,
          duration: 0.6,
        },
      )
        .from(
          "[data-anim='orb']",
          {
            autoAlpha: 0,
            scale: 0.6,
            duration: 1.2,
            ease: "power2.out",
          },
          "-=0.3",
        )
        .from(
          "[data-anim='header']",
          { autoAlpha: 0, y: -12, duration: 0.5 },
          "-=0.7",
        )

        // Left column: brand block + visualization.
        .from(
          "[data-anim='brand-logo']",
          { autoAlpha: 0, y: 16, duration: 0.6 },
          "-=0.2",
        )
        .from(
          "[data-anim='brand-headline']",
          { autoAlpha: 0, y: 18, duration: 0.7 },
          "-=0.4",
        )
        .from(
          "[data-anim='brand-sub']",
          { autoAlpha: 0, y: 12, duration: 0.6 },
          "-=0.5",
        )
        .from(
          "[data-anim='metrics'] > *",
          {
            autoAlpha: 0,
            y: 12,
            duration: 0.5,
            stagger: 0.08,
            ease: "power2.out",
          },
          "-=0.4",
        )
        .from(
          "[data-anim='network']",
          { autoAlpha: 0, y: 24, duration: 0.9, ease: "power2.out" },
          "-=0.4",
        )
        .from(
          "[data-anim='status-strip'] > *",
          { autoAlpha: 0, y: 8, duration: 0.4, stagger: 0.06 },
          "-=0.5",
        )
        .from(
          "[data-anim='brand-meta']",
          { autoAlpha: 0, duration: 0.5 },
          "-=0.3",
        )

        // Right column: form.
        .from(
          "[data-anim='form-card']",
          { autoAlpha: 0, x: 24, duration: 0.7 },
          "-=1.1",
        )
        .from(
          "[data-anim='form-card'] [data-anim='form-child']",
          {
            autoAlpha: 0,
            y: 10,
            duration: 0.45,
            stagger: 0.08,
            ease: "power2.out",
          },
          "-=0.4",
        )
        .from(
          "[data-anim='form-foot']",
          { autoAlpha: 0, duration: 0.5 },
          "-=0.3",
        );

      /* Network path draw-in.  We animate stroke-dashoffset on the  */
      /* active path layer so the base layer is always present.       */
      tl.add(() => {
        gsap.fromTo(
          "[data-anim='path']",
          { strokeDashoffset: 240 },
          {
            strokeDashoffset: 0,
            duration: 1.4,
            ease: "power2.inOut",
            stagger: { each: 0.06, from: "start" },
          },
        );

        /* After the draw-in, the paths read as a finished network.  */
        /* We then switch their dash pattern to a short visible      */
        /* segment with a long gap and keep animating the offset, so */
        /* the segments travel along each path like data packets.    */
        gsap.to("[data-anim='path']", {
          strokeDasharray: "6 234",
          strokeDashoffset: 0,
          duration: 0.6,
          delay: 1.5,
          ease: "power2.inOut",
        });

        gsap.to("[data-anim='path']", {
          strokeDashoffset: -240,
          duration: 5,
          repeat: -1,
          ease: "none",
          delay: 2.1,
          stagger: { each: 0.18, from: "start" },
        });

        /* Background flow lines.  The motion itself is driven by CSS  */
        /* keyframes defined inside the SVG (see <style> above), so   */
        /* stroke-dashoffset animates in viewBox units directly.  We   */
        /* don't run a GSAP tween for these because GSAP was treating */
        /* stroke-dashoffset as a CSS property and appending `px`,     */
        /* which collapsed the motion to a few user units.            */
      }, "-=1.4");

      return () => {
        tl.kill();
      };
    },
    { scope: rootRef, dependencies: [] },
  );

  /* ---------------------------------------------------------- */
  /* Mouse-following gradient orb.  We use gsap.quickTo so the  */
  /* tween lives outside React state and we never trigger a     */
  /* re-render on mousemove.                                    */
  /* ---------------------------------------------------------- */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const orb = orbRef.current;
    const root = rootRef.current;
    if (!orb || !root) return;

    const setX = gsap.quickTo(orb, "x", { duration: 1.2, ease: "power3.out" });
    const setY = gsap.quickTo(orb, "y", { duration: 1.2, ease: "power3.out" });

    const onMove = (e: globalThis.MouseEvent) => {
      const rect = root.getBoundingClientRect();
      setX(e.clientX - rect.left - rect.width * 0.5);
      setY(e.clientY - rect.top - rect.height * 0.5);
    };
    const onLeave = () => {
      setX(0);
      setY(0);
    };

    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  /* ---------------------------------------------------------- */
  /* Network visualization: data packets riding the paths and   */
  /* a horizontal scan beam sweeping top-to-bottom.  The packet */
  /* positions are recomputed each rAF tick from the polyline   */
  /* geometry so they follow the curves exactly.                 */
  /* ---------------------------------------------------------- */
  const networkRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const svg = networkRef.current;
    if (!svg) return;

    const packets = Array.from(
      svg.querySelectorAll<SVGCircleElement>('circle[data-anim="packet"]'),
    );
    const scanBeam = svg.querySelector<SVGLineElement>('[data-anim="scan-beam"]');

    // Pre-parse each path so we can resolve position by distance.
    const parsedPaths = pathStrings.map((d) => {
      const pts: Array<[number, number]> = [];
      const re = /([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(d))) {
        pts.push([parseFloat(m[2]), parseFloat(m[3])]);
      }
      let len = 0;
      const segs: Array<[number, number]> = [];
      for (let i = 1; i < pts.length; i++) {
        segs.push([pts[i - 1][0], pts[i - 1][1]]);
        len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      }
      return { pts, segs, len };
    });

    const positionAt = (
      path: (typeof parsedPaths)[number],
      dist: number,
    ): [number, number] => {
      let cum = 0;
      for (let i = 0; i < path.segs.length; i++) {
        const [sx, sy] = path.segs[i];
        const [ex, ey] = path.pts[i + 1];
        const segLen = Math.hypot(ex - sx, ey - sy);
        if (cum + segLen >= dist) {
          const t = segLen === 0 ? 0 : (dist - cum) / segLen;
          return [sx + (ex - sx) * t, sy + (ey - sy) * t];
        }
        cum += segLen;
      }
      return path.pts[path.pts.length - 1] ?? [0, 0];
    };

    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - t0) / 1000; // seconds

      // Data packets ride their path with a staggered phase so the
      // network never looks synchronized.
      packets.forEach((el, i) => {
        const path = parsedPaths[i % parsedPaths.length];
        if (!path) return;
        const period = 4.5 + (i % 3) * 1.2; // 4.5 - 7.1s per loop
        const phase = ((t + i * 0.7) % period) / period; // 0-1
        const dist = path.len * phase;
        const [px, py] = positionAt(path, dist);
        el.setAttribute("cx", String(px));
        el.setAttribute("cy", String(py));
        // Pulse opacity so each packet breathes.
        const op = 0.55 + 0.35 * Math.sin((t + i) * 2.4);
        el.setAttribute("opacity", String(op));
      });

      // Scan beam: a horizontal line that sweeps top to bottom over 5s
      // and fades at both ends so it doesn't pop on reset.
      if (scanBeam) {
        const beamPeriod = 5;
        const phase = (t % beamPeriod) / beamPeriod;
        const beamY = -10 + phase * 420;
        scanBeam.setAttribute("y1", String(beamY));
        scanBeam.setAttribute("y2", String(beamY));
        // Fade out near the end so the reset is hidden.
        const fade = phase < 0.1 ? phase / 0.1 : phase > 0.9 ? (1 - phase) / 0.1 : 1;
        scanBeam.setAttribute("opacity", String(fade * 0.5));
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------------------------------------------------------- */
  /* Background flow paths: a single rAF loop drives every path. */
  /* SMIL's stroke-dashoffset animation turned out to be silently */
  /* ignored by Chromium (only the opacity animate fired), so we  */
  /* drive dashoffset manually via setAttribute.  The mutable     */
  /* path table lives in a ref so we can reroll each path the    */
  /* moment its cycle completes (without touching React state).   */
  /* ---------------------------------------------------------- */
  const flowStateRef = useRef<{
    paths: FlowPath[];
    lastCycleIdx: number[];
    dims: { width: number; height: number };
  }>({ paths: [], lastCycleIdx: [], dims: { width: 1920, height: 1080 } });

  useEffect(() => {
    if (flowPaths.length === 0) return;
    flowStateRef.current.paths = flowPaths.slice();
    flowStateRef.current.dims = flowDims;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Reduced motion: paint the paths once and stop.
      const svg = gridFlowRef.current;
      if (!svg) return;
      const els = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
      els.forEach((p) => p.setAttribute("stroke-dashoffset", "0"));
      return;
    }

    const svg = gridFlowRef.current;
    if (!svg) return;
    const pathEls = Array.from(
      svg.querySelectorAll<SVGPathElement>("path"),
    );
    const headEls = Array.from(
      svg.querySelectorAll<SVGCircleElement>("circle[data-flow='head']"),
    );

    // Set initial attributes on path/head elements from the state table.
    const syncAttrs = (
      el: SVGPathElement | SVGCircleElement,
      idx: number,
    ) => {
      const def = flowStateRef.current.paths[idx];
      if (!def) return;
      if (el instanceof SVGPathElement) {
        el.setAttribute("d", def.d);
        el.setAttribute("stroke", def.color);
        el.setAttribute(
          "stroke-dasharray",
          String(def.length),
        );
      }
    };
    pathEls.forEach(syncAttrs);

    let raf = 0;

    // Parse the polyline out of an "M x y L x y ..." path string so we
    // can derive the head position from the current draw progress.
    const parsePoints = (d: string): Array<[number, number]> => {
      const pts: Array<[number, number]> = [];
      const re = /([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(d))) {
        pts.push([parseFloat(m[2]), parseFloat(m[3])]);
      }
      return pts;
    };

    // Given current dashoffset (= amount of UN-drawn length at the tail),
    // find the (x, y) of the leading edge.
    const headPosition = (
      points: Array<[number, number]>,
      totalLength: number,
      dashoffset: number,
    ): [number, number] => {
      // Visible portion runs from path-x = 0 to path-x = totalLength - dashoffset.
      const headDist = Math.max(0, totalLength - dashoffset);
      let cum = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        const segLen = Math.hypot(dx, dy);
        if (cum + segLen >= headDist) {
          const t = segLen === 0 ? 0 : (headDist - cum) / segLen;
          return [
            points[i - 1][0] + dx * t,
            points[i - 1][1] + dy * t,
          ];
        }
        cum += segLen;
      }
      return points[points.length - 1] ?? [0, 0];
    };

    const tick = (now: number) => {
      const w = flowStateRef.current.dims.width;
      const h = flowStateRef.current.dims.height;
      for (let i = 0; i < pathEls.length; i++) {
        const def = flowStateRef.current.paths[i];
        if (!def) continue;
        const cycle = def.duration + 1.6; // draw + hold + fade + brief gap
        const elapsed = (now - def.startTime) / 1000;
        const progress = ((elapsed % cycle) + cycle) % cycle / cycle; // 0-1

        // Roll over: reroll a fresh random path so the field never repeats.
        if (progress < 0.005) {
          flowStateRef.current.paths[i] = generateFlowPath(
            w,
            h,
            32,
            i,
            now - 0.005 * cycle * 1000, // preserve phase continuity
          );
          const fresh = flowStateRef.current.paths[i];
          pathEls[i].setAttribute("d", fresh.d);
          pathEls[i].setAttribute("stroke", fresh.color);
          pathEls[i].setAttribute(
            "stroke-dasharray",
            String(fresh.length),
          );
          pathEls[i].setAttribute("stroke-dashoffset", String(fresh.length));
          headEls[i].setAttribute("opacity", "0");
          continue;
        }

        // Reveal (0 -> 0.5): dashoffset goes from full length to 0.
        let dashoffset: number;
        if (progress < 0.5) {
          dashoffset = def.length * (1 - progress / 0.5);
        } else {
          dashoffset = 0;
        }

        // Opacity envelope:
        //   0 - 0.06   fade in
        //   0.06 - 0.5 hold at 0.85
        //   0.5 - 0.95 long fade out (the trail feeling)
        //   0.95 - 1   0
        let opacity: number;
        if (progress < 0.06) opacity = (progress / 0.06) * 0.85;
        else if (progress < 0.5) opacity = 0.85;
        else if (progress < 0.95) opacity = 0.85 * (1 - (progress - 0.5) / 0.45);
        else opacity = 0;

        pathEls[i].setAttribute("stroke-dashoffset", String(dashoffset));
        pathEls[i].setAttribute("opacity", String(opacity));

        // Head circle rides the leading edge.  It only renders during the
        // draw + brief hold (it fades with the path during the long
        // fade-out for the "dying comet" feel).
        const head = headEls[i];
        if (head) {
          if (opacity > 0 && dashoffset >= 0) {
            const pts = parsePoints(def.d);
            const [hx, hy] = headPosition(pts, def.length, dashoffset);
            head.setAttribute("cx", String(hx));
            head.setAttribute("cy", String(hy));
            head.setAttribute("opacity", String(opacity));
            // Scale the head slightly larger while it's actively drawing,
            // shrinks as the line sits and fades.
            const headScale =
              progress < 0.5 ? 1 + (0.5 - progress) * 0.6 : 1;
            head.setAttribute("r", String(3.2 * headScale));
          } else {
            head.setAttribute("opacity", "0");
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flowPaths, flowDims]);

  /* ---------------------------------------------------------- */
  /* Submit button: subtle magnetic pull + elastic press.        */
  /* ---------------------------------------------------------- */
  const onSubmitMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const btn = submitRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.18;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.18;
    gsap.to(btn, { x: dx, y: dy, duration: 0.4, ease: "power3.out" });
  };
  const onSubmitLeave = () => {
    if (isLoading) return;
    gsap.to(submitRef.current, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.45)" });
  };
  const onSubmitDown = () => {
    if (isLoading) return;
    gsap.to(submitRef.current, { scale: 0.97, duration: 0.12, ease: "power2.out" });
  };
  const onSubmitUp = () => {
    if (isLoading) return;
    gsap.to(submitRef.current, { scale: 1, duration: 0.35, ease: "elastic.out(1.2, 0.5)" });
  };

  const onSubmit = async (e?: FormEvent | KeyboardEvent) => {
    e?.preventDefault?.();
    setLocalError(null);
    if (!username.trim() || !password.trim()) {
      setLocalError("请填写用户名和密码");
      // A small shake on the form so the empty-field error feels physical.
      gsap.fromTo(
        "[data-anim='form-card']",
        { x: -6 },
        { x: 0, duration: 0.5, ease: "elastic.out(1.2, 0.4)" },
      );
      return;
    }
    await login(username, password);
    navigate("/app", { replace: true });
  };

  const nodeMap = new Map<string, (typeof NETWORK_NODES)[number]>(
    NETWORK_NODES.map((n) => [n.id, n]),
  );
  const pathStrings = NETWORK_PATHS.map(([a, b]) => {
    const na = nodeMap.get(a)!;
    const nb = nodeMap.get(b)!;
    // Quadratic curve with a perpendicular control point for an organic arc.
    const mx = (na.x + nb.x) / 2;
    const my = (na.y + nb.y) / 2;
    const dx = nb.x - na.x;
    const dy = nb.y - na.y;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx + (-dy / len) * 14;
    const cy = my + (dx / len) * 14;
    return `M ${na.x} ${na.y} Q ${cx} ${cy} ${nb.x} ${nb.y}`;
  });

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none"
    >
      {/* Background grid (static CSS) */}
      <div
        data-anim="bg-grid"
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* Background flow paths.  Each path is a random polyline that      */}
      {/* starts off-screen on one viewport edge and walks 2-4 right-     */}
      {/* angle segments across the grid before exiting on another edge. */}
      {/* Per-path gradient (transparent at the start, bright at the     */}
      {/* end) plus a glowing head circle combine for a comet-trail feel. */}
      <svg
        ref={gridFlowRef}
        data-anim="bg-flow"
        aria-hidden
        className="pointer-events-none absolute inset-0 w-full h-full"
        viewBox={`0 0 ${flowDims.width} ${flowDims.height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="flow-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
          {flowPaths.map((p) => (
            <linearGradient
              key={`grad-${p.id}`}
              id={`flow-grad-${p.id}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor={p.color} stopOpacity="0" />
              <stop offset="55%" stopColor={p.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={p.color} stopOpacity="1" />
            </linearGradient>
          ))}
        </defs>
        {flowPaths.map((p) => (
          <g key={p.id}>
            <path
              d={p.d}
              stroke={`url(#flow-grad-${p.id})`}
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={p.length}
              strokeDashoffset={p.length}
              opacity="0"
              filter="url(#flow-glow)"
            />
            <circle
              data-flow="head"
              cx="0"
              cy="0"
              r="3.2"
              fill={p.color}
              filter="url(#flow-glow)"
              opacity="0"
            />
          </g>
        ))}
      </svg>

      {/* Mouse-following gradient orb */}
      <div
        ref={orbRef}
        data-anim="orb"
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] will-change-transform"
        style={{
          background:
            "radial-gradient(circle at center, hsl(217 91% 60% / 0.18) 0%, hsl(217 91% 60% / 0.06) 35%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Top status bar.  On narrow viewports the long brand label      */}
      {/* and the live clock collapse to just the logo + status dot so   */}
      {/* the header doesn't wrap.                                        */}
      <header
        data-anim="header"
        className="relative z-10 h-12 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-border/60 bg-card/30 backdrop-blur"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold tracking-wider shrink-0">
            TP
          </div>
          <div className="text-sm text-foreground/90 truncate hidden sm:inline">
            交通规划AI工作流系统
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 shrink-0">
          <CircleDot className="w-3 h-3 text-emerald-500" />
          <span className="hidden sm:inline">系统就绪</span>
          <span className="hidden md:inline mx-2 h-3 w-px bg-border" />
          <span className="hidden md:inline font-mono tabular-nums text-muted-foreground/60">
            {stamp}
          </span>
        </div>
      </header>

      {/* Main split layout */}
      <main className="relative z-10 flex-1 flex min-h-0">
        {/* LEFT: Branding column */}
        <section className="hidden md:flex flex-col flex-1 max-w-[55%] p-12 lg:p-16 border-r border-border/60 overflow-hidden">
          <div className="flex flex-col gap-8 flex-1 justify-center max-w-2xl">
            {/* Top row: logo + version + system status */}
            <div
              data-anim="brand-logo"
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="relative w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-base font-bold tracking-wider shadow-[0_0_24px_-4px] shadow-primary/40"
                  aria-hidden
                >
                  TP
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-lg opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg, transparent 50%, hsl(217 91% 75% / 0.6))",
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
                    智能工作流平台
                  </span>
                  <span className="text-xs font-mono text-foreground/80">
                    TPS <span className="text-muted-foreground/60">v0.1.0</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-500">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span>system online</span>
              </div>
            </div>

            {/* Headline block: eyebrow + big gradient title + sub */}
            <div className="flex flex-col gap-4">
              <div
                data-anim="brand-headline"
                className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>AI · GIS · Workflow</span>
              </div>
              <h1
                className="text-3xl lg:text-5xl font-semibold tracking-tight leading-[1.1]"
                style={{ textWrap: "balance" }}
              >
                <span
                  data-anim="brand-headline"
                  className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent"
                >
                  交通规划
                </span>
                <br />
                <span
                  data-anim="brand-headline"
                  className="bg-gradient-to-r from-primary via-primary to-cyan-300 bg-clip-text text-transparent"
                >
                  AI 工作流系统
                </span>
              </h1>
              <p
                data-anim="brand-sub"
                className="text-sm lg:text-base text-muted-foreground leading-relaxed max-w-md"
              >
                面向交通规划行业的 AI 驱动操作系统，将可视化工作流、自然语言生成与 GIS 数据分析整合在一个工作台中。
              </p>
            </div>

            {/* Live metric cards.  Three small stats in a row, each with */}
            {/* an animated value that ticks up on a slow interval.        */}
            <div
              data-anim="metrics"
              className="grid grid-cols-3 gap-2 max-w-md"
            >
              <MetricCard label="Active Streams" value={streams} format="plain" accent="primary" />
              <MetricCard
                label="Processed Today"
                value={processed}
                format="compact"
                accent="primary"
              />
              <MetricCard label="Latency p50" value={latency} format="ms" accent="primary" />
            </div>

            {/* Domain-specific visualization with data packets and scan beam */}
            <div
              data-anim="network"
              className="relative w-full max-w-md aspect-square rounded-lg border border-border/40 bg-card/30 overflow-hidden"
            >
              <svg
                ref={networkRef}
                viewBox="0 0 420 400"
                className="absolute inset-0 w-full h-full"
                aria-hidden
              >
                <defs>
                  <linearGradient id="net-stroke" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(217 91% 60% / 0.85)" />
                    <stop offset="100%" stopColor="hsl(217 91% 60% / 0.35)" />
                  </linearGradient>
                  <radialGradient id="node-glow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="hsl(217 91% 70%)" />
                    <stop offset="100%" stopColor="hsl(217 91% 60% / 0)" />
                  </radialGradient>
                  <linearGradient id="beam-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(217 95% 70% / 0)" />
                    <stop offset="50%" stopColor="hsl(217 95% 80% / 0.8)" />
                    <stop offset="100%" stopColor="hsl(217 95% 70% / 0)" />
                  </linearGradient>
                </defs>

                {/* Hairline cross guides. Real guides that frame the data. */}
                <line
                  x1="0"
                  y1="200"
                  x2="420"
                  y2="200"
                  stroke="hsl(var(--border))"
                  strokeOpacity="0.35"
                  strokeDasharray="2 6"
                />
                <line
                  x1="210"
                  y1="0"
                  x2="210"
                  y2="400"
                  stroke="hsl(var(--border))"
                  strokeOpacity="0.35"
                  strokeDasharray="2 6"
                />

                {/* Base path layer. Always visible. */}
                <g>
                  {pathStrings.map((d, i) => (
                    <path
                      key={`base-${i}`}
                      d={d}
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeOpacity="0.5"
                      strokeWidth="1"
                    />
                  ))}
                </g>

                {/* Active path layer with dasharray for the draw-in. */}
                <g>
                  {pathStrings.map((d, i) => (
                    <path
                      key={`active-${i}`}
                      data-anim="path"
                      d={d}
                      fill="none"
                      stroke="url(#net-stroke)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeDasharray="240"
                      strokeDashoffset="240"
                    />
                  ))}
                </g>

                {/* Nodes */}
                <g>
                  {NETWORK_NODES.map((n) => (
                    <g key={n.id}>
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.size * 1.8}
                        fill="url(#node-glow)"
                        opacity="0.55"
                      />
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.size}
                        fill="hsl(217 91% 60%)"
                        stroke="hsl(var(--background))"
                        strokeWidth="2"
                      />
                    </g>
                  ))}
                </g>

                {/* Scan beam: a horizontal line that sweeps top to bottom. */}
                <line
                  data-anim="scan-beam"
                  x1="0"
                  y1="0"
                  x2="420"
                  y2="0"
                  stroke="url(#beam-grad)"
                  strokeWidth="28"
                  strokeOpacity="0.5"
                  style={{ filter: "blur(2px)" }}
                />

                {/* Data packets: small glowing circles that travel along */}
                {/* each network path on a staggered phase.                  */}
                <g>
                  {NETWORK_PATHS.map((_, i) => (
                    <circle
                      key={`packet-${i}`}
                      data-anim="packet"
                      cx="0"
                      cy="0"
                      r="3"
                      fill="hsl(217 95% 80%)"
                      style={{ filter: "blur(0.6px)" }}
                      opacity="0"
                    />
                  ))}
                </g>
              </svg>

              {/* Live data strip */}
              <div
                data-anim="status-strip"
                className="absolute left-3 right-3 bottom-3 flex items-center gap-3 px-3 py-2 rounded-md bg-background/60 backdrop-blur border border-border/50 text-[10px] font-mono tabular-nums text-muted-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-foreground/80">LIVE</span>
                </span>
                <span className="text-border">|</span>
                <span>NODES 07</span>
                <span className="text-border">|</span>
                <span>EDGES 09</span>
                <span className="text-border">|</span>
                <span>SYNC OK</span>
              </div>
            </div>

            <div
              data-anim="brand-meta"
              className="flex items-center justify-between gap-4 text-[11px] font-mono uppercase tracking-wider text-muted-foreground/50 max-w-md"
            >
              <span>build a1f2c8 · {stamp}</span>
              <span>local</span>
            </div>
          </div>
        </section>

        {/* RIGHT: Login form column.  Glass-style card with floating labels, */}
        {/* magnetic submit button, and a scan beam during the loading state. */}
        <section className="flex-1 flex items-center justify-center p-5 sm:p-8 md:p-12">
          <form
            onSubmit={onSubmit}
            data-anim="form-card"
            className="group/form relative w-full max-w-sm p-7 sm:p-8 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm flex flex-col gap-6"
          >
            {/* Top accent gradient line — a subtle "premium" detail. */}
            <div
              aria-hidden
              className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            />
            {/* Hover halo around the card border. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-px rounded-xl opacity-0 group-hover/form:opacity-100 transition-opacity duration-500"
              style={{
                background:
                  "linear-gradient(135deg, hsl(217 91% 60% / 0.3), transparent 40%, hsl(195 88% 62% / 0.2))",
                mask: "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
                WebkitMask:
                  "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                padding: "1px",
              }}
            />

            {/* Header */}
            <div data-anim="form-child" className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span>安全会话</span>
                <span className="text-border">/</span>
                <span className="text-muted-foreground/60">TLS 1.3</span>
              </div>
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                登录系统
              </h2>
              <p className="text-sm text-muted-foreground">
                输入账号以进入工作区
              </p>
            </div>

            {/* Floating-label inputs.  Inline so we can drive the floating */}
            {/* state from controlled component value (no peer selector).    */}
            <div data-anim="form-child" className="flex flex-col gap-1">
              <FloatingInput
                label="用户名"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(v) => {
                  setUsername(v);
                  if (localError) setLocalError(null);
                }}
              />
            </div>

            <div data-anim="form-child" className="flex flex-col gap-1">
              <FloatingInput
                label="密码"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  if (localError) setLocalError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSubmit(e);
                }}
                error={displayError}
              />
            </div>

            {/* Submit button.  Magnetic + elastic press + scan beam during */}
            {/* loading + checkmark on success.                            */}
            <button
              ref={submitRef}
              data-anim="form-child"
              type="submit"
              disabled={isLoading}
              onMouseMove={onSubmitMove}
              onMouseLeave={onSubmitLeave}
              onMouseDown={onSubmitDown}
              onMouseUp={onSubmitUp}
              className="group/submit relative mt-2 flex items-center justify-center gap-2 w-full h-11 rounded-md border border-primary/50 bg-primary/15 hover:bg-primary/25 hover:border-primary focus-visible:border-primary focus-visible:bg-primary/25 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card text-primary text-sm font-medium transition-colors duration-150 disabled:opacity-80 disabled:cursor-not-allowed will-change-transform overflow-hidden outline-none"
            >
              {/* Top inner highlight */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-px rounded-[5px]"
                style={{
                  background:
                    "linear-gradient(to bottom, hsl(217 91% 75% / 0.14), transparent 60%)",
                }}
              />
              {/* Scanning beam during the loading state.  The mask keeps */}
              {/* the beam inside the button so it doesn't bleed out.     */}
              {isLoading && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
                >
                  <span
                    className="absolute top-0 bottom-0 w-1/3 animate-[flow-scan_1.1s_linear_infinite]"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, hsl(217 95% 80% / 0.55), transparent)",
                    }}
                  />
                </span>
              )}
              <style>
                {`@keyframes flow-scan {
                  from { transform: translateX(-120%); }
                  to { transform: translateX(380%); }
                }`}
              </style>
              <span className="relative flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>进入中</span>
                  </>
                ) : (
                  <>
                    <span>进入系统</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/submit:translate-x-1" />
                  </>
                )}
              </span>
            </button>

            {/* Footer trust line */}
            <div
              data-anim="form-foot"
              className="flex items-center justify-between text-[11px] text-muted-foreground/60"
            >
              <span className="flex items-center gap-1.5">
                <CircleDot className="w-3 h-3 text-emerald-500/80" />
                本地模式
              </span>
              <span className="font-mono tabular-nums">v0.1.0</span>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
