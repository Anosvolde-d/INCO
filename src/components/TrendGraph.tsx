"use client";

import { useEffect, useRef } from "react";

interface TrendPoint {
  date: string;
  value: number;
}

interface TrendGraphProps {
  data: TrendPoint[];
  label: string;
  color?: string;
  height?: number;
}

export default function TrendGraph({ data, label, color = "#3b82f6", height = 120 }: TrendGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const canvasHeight = rect.height;
    const padding = { top: 10, right: 10, bottom: 25, left: 40 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = canvasHeight - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    if (data.length === 0) return;

    // Find min and max values
    const values = data.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const valueRange = maxValue - minValue || 1;

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + graphWidth, y);
      ctx.stroke();
    }

    // Draw Y-axis labels
    ctx.fillStyle = "rgba(161, 161, 170, 0.6)";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    
    for (let i = 0; i <= 4; i++) {
      const value = maxValue - (valueRange / 4) * i;
      const y = padding.top + (graphHeight / 4) * i;
      ctx.fillText(formatValue(value), padding.left - 5, y + 3);
    }

    // Draw line graph
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding.left + (graphWidth / (data.length - 1 || 1)) * index;
      const normalizedValue = (point.value - minValue) / valueRange;
      const y = padding.top + graphHeight - normalizedValue * graphHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw gradient fill under line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + graphHeight);
    gradient.addColorStop(0, color + "40");
    gradient.addColorStop(1, color + "00");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    data.forEach((point, index) => {
      const x = padding.left + (graphWidth / (data.length - 1 || 1)) * index;
      const normalizedValue = (point.value - minValue) / valueRange;
      const y = padding.top + graphHeight - normalizedValue * graphHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(padding.left + graphWidth, padding.top + graphHeight);
    ctx.lineTo(padding.left, padding.top + graphHeight);
    ctx.closePath();
    ctx.fill();

    // Draw points
    ctx.fillStyle = color;
    data.forEach((point, index) => {
      const x = padding.left + (graphWidth / (data.length - 1 || 1)) * index;
      const normalizedValue = (point.value - minValue) / valueRange;
      const y = padding.top + graphHeight - normalizedValue * graphHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw X-axis labels (dates)
    ctx.fillStyle = "rgba(161, 161, 170, 0.6)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    
    const labelInterval = Math.ceil(data.length / 5);
    data.forEach((point, index) => {
      if (index % labelInterval === 0 || index === data.length - 1) {
        const x = padding.left + (graphWidth / (data.length - 1 || 1)) * index;
        const date = new Date(point.date);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        ctx.fillText(label, x, padding.top + graphHeight + 15);
      }
    });

  }, [data, color]);

  const formatValue = (value: number): string => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
    if (value >= 1000) return (value / 1000).toFixed(1) + "k";
    return Math.round(value).toString();
  };

  return (
    <div className="w-full">
      <div className="text-xs text-zinc-400 mb-2 font-medium">{label}</div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="rounded-lg"
      />
    </div>
  );
}
