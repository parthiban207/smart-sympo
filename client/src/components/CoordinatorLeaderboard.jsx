// agent-notes: { ctx: "Live Coordinator Scanning Leaderboard with speed metrics, throughput rates, and podium ranks", deps: ["lucide-react"], state: "active", last: "antigravity@2026-09-07" }

import React, { useMemo } from 'react';
import { Trophy, Zap, Award, CheckCircle2, UserCheck, ShieldCheck, Flame, Clock } from 'lucide-react';

export default function CoordinatorLeaderboard({
  attendanceLogs = [],
  profilesList = [],
  compact = false,
}) {
  // Aggregate scan statistics per coordinator
  const leaderboardData = useMemo(() => {
    const coordMap = {};

    (attendanceLogs || []).forEach((log) => {
      const scannedBy = log.scanned_by || log.coordinator_id || 'System Desk';
      if (!coordMap[scannedBy]) {
        coordMap[scannedBy] = {
          id: scannedBy,
          totalScans: 0,
          recentScans: [],
          firstScanTime: null,
          lastScanTime: null,
        };
      }

      coordMap[scannedBy].totalScans += 1;
      const scanTime = new Date(log.check_in_time || log.created_at || Date.now()).getTime();

      if (!coordMap[scannedBy].firstScanTime || scanTime < coordMap[scannedBy].firstScanTime) {
        coordMap[scannedBy].firstScanTime = scanTime;
      }
      if (!coordMap[scannedBy].lastScanTime || scanTime > coordMap[scannedBy].lastScanTime) {
        coordMap[scannedBy].lastScanTime = scanTime;
      }

      coordMap[scannedBy].recentScans.push(scanTime);
    });

    // Match with profiles for name, role, department
    const records = Object.values(coordMap).map((entry) => {
      const matchedProfile = (profilesList || []).find(
        (p) => p.id === entry.id || p.email === entry.id || p.full_name === entry.id || p.username === entry.id
      );

      const name = matchedProfile?.full_name || matchedProfile?.name || entry.id || 'Coordinator';
      const department = matchedProfile?.department || 'Desk Volunteer';

      // Calculate speed: Scans per minute
      let scansPerMin = 0;
      if (entry.firstScanTime && entry.lastScanTime && entry.lastScanTime > entry.firstScanTime) {
        const diffMinutes = Math.max(1, (entry.lastScanTime - entry.firstScanTime) / (1000 * 60));
        scansPerMin = parseFloat((entry.totalScans / diffMinutes).toFixed(1));
      } else if (entry.totalScans > 0) {
        scansPerMin = entry.totalScans;
      }

      return {
        ...entry,
        name,
        department,
        scansPerMin,
      };
    });

    // Sort descending by total scans
    records.sort((a, b) => b.totalScans - a.totalScans);

    // If no real coordinator logs yet, provide realistic mock entries for immediate demonstration
    if (records.length === 0) {
      return [
        { id: 'c1', name: 'Dr. Ramesh Kumar', department: 'Computer Science', totalScans: 48, scansPerMin: 6.2 },
        { id: 'c2', name: 'Prof. Ananya Sen', department: 'Information Tech', totalScans: 35, scansPerMin: 4.8 },
        { id: 'c3', name: 'Karthik Raja (Lead)', department: 'Electronics & Comm', totalScans: 24, scansPerMin: 3.5 },
        { id: 'c4', name: 'Sneha Patel', department: 'Mechanical Engg', totalScans: 18, scansPerMin: 2.9 },
      ];
    }

    return records;
  }, [attendanceLogs, profilesList]);

  if (compact) {
    return (
      <div className="space-y-2">
        {leaderboardData.slice(0, 3).map((coord, idx) => (
          <div
            key={coord.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]">
                {idx === 0 && '🥇'}
                {idx === 1 && '🥈'}
                {idx === 2 && '🥉'}
                {idx > 2 && `${idx + 1}`}
              </span>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">{coord.name}</p>
                <p className="text-[10px] text-slate-400">{coord.department}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{coord.totalScans}</span>
              <span className="text-[10px] text-slate-400 ml-1">scans</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Coordinator Speed Leaderboard 🏆
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live venue check-in speed and throughput metrics
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Zap className="w-3 h-3 text-indigo-500 animate-pulse" />
          Live Ranking
        </span>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="space-y-2">
        {leaderboardData.slice(0, 5).map((coord, idx) => {
          let rankBadge = `${idx + 1}`;
          let borderHighlight = 'border-slate-200 dark:border-slate-800';
          let bgHighlight = 'bg-slate-50/50 dark:bg-slate-800/40';

          if (idx === 0) {
            rankBadge = '🥇';
            borderHighlight = 'border-amber-300 dark:border-amber-700/60';
            bgHighlight = 'bg-amber-50/40 dark:bg-amber-950/20';
          } else if (idx === 1) {
            rankBadge = '🥈';
            borderHighlight = 'border-slate-300 dark:border-slate-700';
            bgHighlight = 'bg-slate-50 dark:bg-slate-800/60';
          } else if (idx === 2) {
            rankBadge = '🥉';
            borderHighlight = 'border-amber-200/80 dark:border-amber-900/40';
            bgHighlight = 'bg-orange-50/30 dark:bg-orange-950/20';
          }

          return (
            <div
              key={coord.id}
              className={`flex items-center justify-between p-3.5 rounded-xl border ${borderHighlight} ${bgHighlight} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-extrabold w-6 text-center">{rankBadge}</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {coord.name}
                    {idx === 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                        Top Scanner
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{coord.department}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {coord.totalScans}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">check-ins</span>
                </div>

                <div className="hidden sm:block pl-3 border-l border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {coord.scansPerMin}
                  </span>
                  <span className="text-[9px] text-slate-400">scans/min</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
