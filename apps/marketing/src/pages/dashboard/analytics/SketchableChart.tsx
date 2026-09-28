import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface PricePoint {
  day: number;
  price: number;
}

type Stroke = { x: number; y: number }[];

function storageKey(pairSymbol: string): string {
  return `nouveau:sketch:${pairSymbol}`;
}

/** Sketches are a per-viewer convenience, not account data — localStorage
 *  is the right fit (see the artifact/frontend guidance on this project:
 *  never trust it for state that must persist reliably or sync across
 *  devices, which doesn't apply here since these are just scratch
 *  annotations on a demo chart). Reads/writes are wrapped since a private
 *  window or blocked storage can throw. */
function loadStrokes(pairSymbol: string): Stroke[] {
  try {
    const raw = localStorage.getItem(storageKey(pairSymbol));
    return raw ? (JSON.parse(raw) as Stroke[]) : [];
  } catch {
    return [];
  }
}

function saveStrokes(pairSymbol: string, strokes: Stroke[]): void {
  try {
    localStorage.setItem(storageKey(pairSymbol), JSON.stringify(strokes));
  } catch {
    // best-effort only
  }
}

function ChartTooltip({ active, payload, decimals }: { active?: boolean; payload?: { value: number }[]; decimals: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-navy-line bg-navy px-3 py-2 text-caption text-paper shadow-lg">
      {payload[0]!.value.toFixed(decimals)}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-1.5 text-caption transition-colors duration-200 ${
        active ? "border-gold bg-gold text-navy-deep" : "border-navy-line text-slate-light hover:border-gold hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

/** A price chart (recharts) with a freehand sketch layer on top — traders
 *  can mark up a pair's chart (trend lines, notes-to-self) the way they
 *  would on a real charting platform. Sketches are stored in raw pixel
 *  coordinates relative to the chart container, not tied to the chart's
 *  actual price/time scale — this is a lightweight annotation tool for a
 *  preview feature, not a production-grade charting library, so a window
 *  resize can shift old sketches rather than perfectly rescaling them.
 *  That's an accepted, deliberate simplification here. */
export default function SketchableChart({
  pairSymbol,
  data,
  decimals,
}: {
  pairSymbol: string;
  data: PricePoint[];
  decimals: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [strokes, setStrokes] = useState<Stroke[]>(() => loadStrokes(pairSymbol));
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [sketchVisible, setSketchVisible] = useState(true);
  const [drawMode, setDrawMode] = useState(false);

  // Switching pairs loads that pair's own saved sketches instead of
  // carrying the previous pair's strokes over.
  useEffect(() => {
    setStrokes(loadStrokes(pairSymbol));
    setCurrentStroke(null);
  }, [pairSymbol]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pointFromEvent = useCallback((e: ReactPointerEvent): { x: number; y: number } => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drawMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCurrentStroke([pointFromEvent(e)]);
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drawMode || !currentStroke) return;
    setCurrentStroke((prev) => (prev ? [...prev, pointFromEvent(e)] : prev));
  }

  function onPointerUp() {
    if (!drawMode || !currentStroke) return;
    if (currentStroke.length > 1) {
      const next = [...strokes, currentStroke];
      setStrokes(next);
      saveStrokes(pairSymbol, next);
    }
    setCurrentStroke(null);
  }

  function clearSketches() {
    setStrokes([]);
    saveStrokes(pairSymbol, []);
  }

  function toPoints(stroke: Stroke): string {
    return stroke.map((p) => `${p.x},${p.y}`).join(" ");
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-slate-light">Sketch trend lines or notes directly on the chart.</p>
        <div className="flex gap-2">
          <ToolButton active={drawMode} onClick={() => setDrawMode((v) => !v)}>
            {drawMode ? "Done sketching" : "Sketch"}
          </ToolButton>
          <ToolButton active={!sketchVisible} onClick={() => setSketchVisible((v) => !v)}>
            {sketchVisible ? "Hide sketch" : "Unhide sketch"}
          </ToolButton>
          <ToolButton onClick={clearSketches}>Clear</ToolButton>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative h-72 border border-navy-line/50 bg-navy p-4"
        style={{ touchAction: drawMode ? "none" : "auto" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1D3E5C" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(d: number) => `Day ${d}`}
              stroke="#1D3E5C"
              tick={{ fontSize: 12, fill: "#8B98A2" }}
              tickLine={false}
              axisLine={{ stroke: "#1D3E5C" }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => v.toFixed(decimals >= 4 ? 3 : 1)}
              stroke="#1D3E5C"
              tick={{ fontSize: 12, fill: "#8B98A2" }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip content={<ChartTooltip decimals={decimals} />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#C9A227"
              strokeWidth={2}
              fill="url(#priceFill)"
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>

        {sketchVisible && size.width > 0 && (
          <svg
            className="absolute inset-0"
            width={size.width}
            height={size.height}
            style={{ pointerEvents: drawMode ? "auto" : "none", cursor: drawMode ? "crosshair" : "default" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            aria-hidden="true"
          >
            {strokes.map((stroke, i) => (
              <polyline
                key={i}
                points={toPoints(stroke)}
                fill="none"
                stroke="#FAFAF7"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentStroke && (
              <polyline
                points={toPoints(currentStroke)}
                fill="none"
                stroke="#FAFAF7"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
