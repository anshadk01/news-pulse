import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInHours, isAfter, subHours, subDays } from 'date-fns';
import { 
  Clock, 
  Layers, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  Filter, 
  SlidersHorizontal,
  Flame,
  ZoomIn,
  TrendingUp,
  LayoutGrid,
  GitCommit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ClusterCard from './ClusterCard';

const SOURCE_COLORS = {
  bbc: { name: 'BBC', color: '#ef4444', bg: 'bg-red-500/15', text: 'text-red-400' },
  npr: { name: 'NPR', color: '#3b82f6', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  guardian: { name: 'Guardian', color: '#38bdf8', bg: 'bg-sky-500/15', text: 'text-sky-300' },
  aljazeera: { name: 'Al Jazeera', color: '#f59e0b', bg: 'bg-amber-500/15', text: 'text-amber-400' }
};

export default function TimelineView({ 
  timelineData, 
  onSelectCluster, 
  selectedClusterId,
  searchTerm = ''
}) {
  const [timeFilter, setTimeFilter] = useState('24h'); // '24h' | '48h' | 'all'
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'grid'
  const [hoveredCluster, setHoveredCluster] = useState(null);

  const rawClusters = timelineData?.clusters || [];

  // Filter clusters by search term and time window
  const filteredClusters = useMemo(() => {
    let result = rawClusters;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => {
        const matchLabel = c.label?.toLowerCase().includes(term);
        const matchHead = c.representativeHeadline?.toLowerCase().includes(term);
        const matchKw = c.keywords?.some(k => k.toLowerCase().includes(term));
        return matchLabel || matchHead || matchKw;
      });
    }

    // Time window filter
    if (timeFilter !== 'all' && result.length > 0) {
      // Find latest date in dataset
      const latestTimestamp = Math.max(...result.map(c => new Date(c.endTime).getTime()));
      const cutoffMs = timeFilter === '24h' 
        ? latestTimestamp - (1000 * 60 * 60 * 24) 
        : latestTimestamp - (1000 * 60 * 60 * 48);

      const timeFiltered = result.filter(c => new Date(c.endTime).getTime() >= cutoffMs);
      // Fallback if window is too narrow
      if (timeFiltered.length >= 4) {
        result = timeFiltered;
      }
    }

    return result;
  }, [rawClusters, searchTerm, timeFilter]);

  // Compute adaptive time scale boundaries based on active window (eliminates empty left void!)
  const { globalStartMs, globalEndMs, totalDurationMs } = useMemo(() => {
    if (!filteredClusters.length) return { globalStartMs: 0, globalEndMs: 0, totalDurationMs: 0 };
    
    let minT = Infinity;
    let maxT = -Infinity;

    filteredClusters.forEach(c => {
      const s = new Date(c.startTime).getTime();
      const e = new Date(c.endTime).getTime();
      if (s < minT) minT = s;
      if (e > maxT) maxT = e;
    });

    // Add slight 2% margin on edges so bars never touch boundary lines
    const span = Math.max(maxT - minT, 1000 * 60 * 60 * 4);
    const startPadded = minT - (span * 0.015);
    const endPadded = maxT + (span * 0.015);

    return {
      globalStartMs: startPadded,
      globalEndMs: endPadded,
      totalDurationMs: endPadded - startPadded
    };
  }, [filteredClusters]);

  // Generate 5 evenly spaced time markers
  const timeTicks = useMemo(() => {
    if (!totalDurationMs) return [];
    const ticks = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const tMs = globalStartMs + (totalDurationMs * (i / count));
      ticks.push({
        timeMs: tMs,
        label: format(new Date(tMs), 'MMM d, HH:mm'),
        percent: (i / count) * 100
      });
    }
    return ticks;
  }, [globalStartMs, totalDurationMs]);

  if (filteredClusters.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center my-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
          <Layers className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Topic Clusters in Selected Window</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
          Try switching to "All History" time window or clear your search query.
        </p>
        <button
          onClick={() => { setTimeFilter('all'); }}
          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition"
        >
          View All History
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* 1. VISUAL TOPIC TIMELINE CANVAS */}
      <section className="glass-panel rounded-3xl p-5 sm:p-7 border border-slate-800/90 shadow-2xl relative overflow-hidden">
        
        {/* Header with Title, Time Window Controls & Outlets Legend */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Calendar className="w-4 h-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Interactive Topic Timeline
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/25">
                {filteredClusters.length} Active Topics
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Horizontal blocks show active time spans with dynamic intensity sizing and outlet badges
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Window Buttons (Fixes empty space on left) */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setTimeFilter('24h')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  timeFilter === '24h' 
                    ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                24 Hours
              </button>
              <button
                onClick={() => setTimeFilter('48h')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  timeFilter === '48h' 
                    ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                48 Hours
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  timeFilter === 'all' 
                    ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All History
              </button>
            </div>

            {/* Outlets Legend */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs text-slate-300">
              {Object.entries(SOURCE_COLORS).map(([id, meta]) => (
                <span key={id} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span>{meta.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Continuous Time Scale Ticks Bar */}
        <div className="relative w-full h-8 mb-5 border-b border-slate-800/90 hidden md:block">
          {timeTicks.map((tick, i) => (
            <div
              key={i}
              className="absolute top-0 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${tick.percent}%` }}
            >
              <div className="h-2.5 w-px bg-slate-700"></div>
              <span className="text-[11px] font-mono text-slate-400 mt-1 font-semibold whitespace-nowrap">
                {tick.label}
              </span>
            </div>
          ))}
        </div>

        {/* Interactive Topic Timeline Bars */}
        <div className="relative w-full overflow-x-auto pb-4 pt-1">
          <div className="min-w-[650px] md:min-w-full space-y-3.5">
            {filteredClusters.slice(0, 20).map((cluster, index) => {
              const start = new Date(cluster.startTime).getTime();
              const end = new Date(cluster.endTime).getTime();
              
              // Smart horizontal position & width calculation
              const leftPercent = Math.max(0, Math.min(90, ((start - globalStartMs) / totalDurationMs) * 100));
              const rawWidthPercent = ((Math.max(end - start, 1000 * 60 * 45)) / totalDurationMs) * 100;
              // Ensure crisp readable card width
              const widthPercent = Math.max(22, Math.min(100 - leftPercent, rawWidthPercent + 18));

              const isSelected = selectedClusterId === cluster.id;
              const isHovered = hoveredCluster === cluster.id;
              const isHighIntensity = cluster.intensityScore >= 2.5;

              return (
                <div key={cluster.id} className="relative group">
                  
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    onClick={() => onSelectCluster(cluster)}
                    onMouseEnter={() => setHoveredCluster(cluster.id)}
                    onMouseLeave={() => setHoveredCluster(null)}
                    style={{
                      marginLeft: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                    className={`relative rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-slate-900 border-sky-400 ring-2 ring-sky-400/50 shadow-xl shadow-sky-500/25'
                        : isHighIntensity
                        ? 'bg-gradient-to-r from-slate-900 via-amber-950/25 to-slate-900 border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-600 hover:bg-slate-900 shadow-md'
                    }`}
                  >
                    {/* Top gradient glow line */}
                    <div 
                      className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${
                        isHighIntensity 
                          ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-amber-500' 
                          : 'bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-500'
                      }`}
                    />

                    {/* Card Content */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        
                        {/* Title & Count Badge */}
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm text-slate-100 group-hover:text-sky-300 truncate">
                            {cluster.label}
                          </h4>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                            isHighIntensity 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}>
                            {cluster.articleCount} {cluster.articleCount === 1 ? 'story' : 'stories'}
                          </span>
                        </div>

                        {/* Representative Headline Preview */}
                        <p className="text-xs text-slate-400 truncate leading-relaxed">
                          "{cluster.representativeHeadline}"
                        </p>
                      </div>

                      {/* Outlet Badges on the right */}
                      <div className="flex items-center gap-1 shrink-0">
                        {Object.keys(cluster.sourceBreakdown || {}).map(src => {
                          const meta = SOURCE_COLORS[src] || { color: '#94a3b8', name: src };
                          return (
                            <span
                              key={src}
                              className="w-2.5 h-2.5 rounded-full border border-slate-900 shadow-sm"
                              style={{ backgroundColor: meta.color }}
                              title={`${src.toUpperCase()}: ${cluster.sourceBreakdown[src]} article(s)`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Metadata: Timestamp & Duration */}
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {format(parseISO(cluster.startTime), 'MMM d, HH:mm')}
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        {cluster.durationHours > 0.1 ? `${cluster.durationHours}h active span` : 'Single snapshot'}
                      </span>
                    </div>

                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60 mt-2">
          <span>Click any topic bar to open the full story reader</span>
          <span className="font-mono text-[11px]">
            {filteredClusters.length} topics spanning {format(new Date(globalStartMs), 'MMM d')} → {format(new Date(globalEndMs), 'MMM d')}
          </span>
        </div>
      </section>

      {/* 2. TOPIC CLUSTERS GRID EXPLORER */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <span>All Topic Clusters</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                {filteredClusters.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Browse individual topic cards, keywords, and sources
            </p>
          </div>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredClusters.map((cluster) => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                isSelected={selectedClusterId === cluster.id}
                onSelect={onSelectCluster}
              />
            ))}
          </AnimatePresence>
        </div>
      </section>

    </div>
  );
}
