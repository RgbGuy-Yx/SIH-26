import React from 'react';

/**
 * MultiSegmentHealthBar renders a clean, multi-segment status bar
 * representing switch/interlocking sub-components:
 * LO: Lock Operation
 * BL: Block Line Status
 * PM: Point Machine Actuator
 * TR: Track Circuit Sensor
 * FR: Frequency / Relay Response
 */
export function MultiSegmentHealthBar({ status = 'nominal', className = '' }) {
  const segments = [
    { label: 'LO', name: 'Lock Operation', ok: status !== 'critical' },
    { label: 'BL', name: 'Block Line', ok: status !== 'critical' },
    { label: 'PM', name: 'Point Machine', ok: status === 'nominal' },
    { label: 'TR', name: 'Track Circuit', ok: true },
    { label: 'FR', name: 'Frequency Response', ok: status !== 'critical' },
  ];

  return (
    <div className={`flex items-center gap-1 font-mono text-[9px] font-bold ${className}`}>
      {segments.map((seg) => {
        let colorClass = 'bg-[#4ade80] text-emerald-950'; // Bright clear green like reference image
        if (!seg.ok) {
          colorClass = status === 'critical' ? 'bg-[#f87171] text-red-950' : 'bg-[#fbbf24] text-amber-950';
        }
        return (
          <span
            key={seg.label}
            title={`${seg.label}: ${seg.name}`}
            className={`px-1 py-0.5 rounded-[2px] ${colorClass} select-none transition-colors`}
          >
            {seg.label}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Returns string HTML for MapLibre tooltip popup elements
 */
export function renderHealthBarHtml(status = 'nominal') {
  const greenPill = 'px-1 py-0.5 rounded-[2px] bg-[#4ade80] text-emerald-950 font-mono text-[9px] font-bold';
  const amberPill = 'px-1 py-0.5 rounded-[2px] bg-[#fbbf24] text-amber-950 font-mono text-[9px] font-bold';
  const redPill = 'px-1 py-0.5 rounded-[2px] bg-[#f87171] text-red-950 font-mono text-[9px] font-bold';

  const lo = status === 'critical' ? redPill : greenPill;
  const bl = status === 'critical' ? redPill : greenPill;
  const pm = status === 'nominal' ? greenPill : amberPill;
  const tr = greenPill;
  const fr = status === 'critical' ? redPill : greenPill;

  return `
    <div class="pt-0.5 flex items-center gap-1">
      <span class="${lo}">LO</span>
      <span class="${bl}">BL</span>
      <span class="${pm}">PM</span>
      <span class="${tr}">TR</span>
      <span class="${fr}">FR</span>
    </div>
  `;
}

export default MultiSegmentHealthBar;
