// agent-notes: { ctx: "Live Seat Capacity Heatmap and Occupancy visual indicator with color tiers and remaining seat badges", deps: ["lucide-react"], state: "active", last: "antigravity@2026-09-07" }

import React from 'react';
import { Users, AlertTriangle, Flame, CheckCircle2 } from 'lucide-react';

/**
 * SeatCapacityHeatmap component
 * @param {Object} props
 * @param {number} props.registeredCount - Current number of registered attendees
 * @param {number} props.maxCapacity - Maximum venue/event capacity
 * @param {boolean} [props.compact=false] - Compact single-line mode
 * @param {boolean} [props.showDetails=true] - Show numerical count & status text
 */
export default function SeatCapacityHeatmap({
  registeredCount = 0,
  maxCapacity = 100,
  compact = false,
  showDetails = true,
}) {
  const cap = Math.max(1, maxCapacity || 100);
  const reg = Math.max(0, registeredCount || 0);
  const percentage = Math.min(100, Math.round((reg / cap) * 100));
  const remaining = Math.max(0, cap - reg);

  // Determine Heatmap Tier
  let tier = 'green'; // 'green' | 'amber' | 'red'
  let tierLabel = 'High Availability';
  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
  let progressColor = 'from-emerald-500 to-teal-400';

  if (percentage >= 90) {
    tier = 'red';
    tierLabel = remaining === 0 ? 'Fully Booked 🔥' : 'Almost Full 🔥';
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
    progressColor = 'from-rose-500 to-amber-500';
  } else if (percentage >= 60) {
    tier = 'amber';
    tierLabel = 'Filling Fast ⚡';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
    progressColor = 'from-amber-400 to-orange-500';
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
          <div
            className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-500 rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
          {percentage}%
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full">
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Capacity: <span className="text-slate-900 dark:text-white font-bold">{reg}</span> / {cap}
            </span>
          </div>

          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {tier === 'red' && <Flame className="w-3 h-3 text-rose-500" />}
            {tier === 'amber' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            {tier === 'green' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            {tierLabel} ({percentage}%)
          </span>
        </div>
      )}

      {/* Progress Bar with Heat gradient */}
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
        <div
          className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500 shadow-xs`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showDetails && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>{remaining} seats left</span>
          <span className="font-mono text-[10px]">{percentage}% filled</span>
        </div>
      )}
    </div>
  );
}
