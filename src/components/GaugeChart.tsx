"use client";

import { useEffect, useRef } from "react";

interface GaugeChartProps {
  value: number; // 0-100
  max?: number;
  label: string;
  unit?: string;
  size?: number;
}

export default function GaugeChart({ value, max = 100, label, unit = "ms", size = 120 }: GaugeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;
    const lineWidth = 8;

    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.75, Math.PI * 2.25);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Value arc
    const percent = Math.min(value / max, 1);
    const endAngle = Math.PI * 0.75 + (Math.PI * 1.5 * percent);
    
    // Color based on value
    let color = "rgba(16, 185, 129, 0.8)"; // green
    if (value > max * 0.7) color = "rgba(245, 158, 11, 0.8)"; // amber
    if (value > max * 0.9) color = "rgba(239, 68, 68, 0.8)"; // red

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI * 0.75, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

  }, [value, max, size]);

  return (
    <div className="relative inline-block">
      <canvas ref={canvasRef} width={size} height={size} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-light text-zinc-200 tracking-tight">{Math.round(value)}</div>
        <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold">{unit}</div>
      </div>
    </div>
  );
}
