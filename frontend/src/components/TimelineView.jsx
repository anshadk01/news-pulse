import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInHours } from 'date-fns';
import { Clock, Layers, Calendar, ChevronRight, Sparkles, Filter, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ClusterCard from './ClusterCard';

const SOURCE_COLORS = {
  bbc: '#ef4444',
  npr: '#3b82f6',
  guardian: '#38bdf8',
  aljazeera: '#f59e0b'
};

export default function TimelineView({ 
  timelineData, 
  onSelectCluster, 
  selectedClusterId,
  searchTerm = ''
}) {
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'timeline' | 'cards'
  const [hoveredCluster, setHoveredCluster] = useState(null);

  const rawClusters = timelineData?.clusters || [];

  // Filter clusters based on search term
  const clusters = useMemo(() => {
    if (!searchTerm.trim()) return rawClusters;
    const term = searchTerm.toLowerCase();
    return rawClusters.filter(c => {
      const matchLabel = c.label?.toLowerCase().includes(term);
      const matchHead = c.representativeHeadline?.toLowerCase().includes(term);
      const matchKw = c.keywords?.some(k => k.toLowerCase().includes(term));
      return matchLabel || matchHead || matchKw;
    });
  }, [rawClusters, searchTerm]);

  // Global Time boundaries
  const { globalStartMs, globalEndMs, totalDurationMs } = useMemo(() => {
    if (!rawClusters.length) return { globalStartMs: 0, globalEndMs: 0, totalDurationMs: 0 };
    
    let minT = Infinity;
    let maxT = -Infinity;

    rawClusters.forEach(c => {
      const s = new Date(c.startTime).getTime();
      const e = new Date(c.endTime).getTime();
      if (s < minT) minT = s;
      if (e > maxT) maxT = e;
    });

    // Add padding to axis
    const span = Math.max(maxT - minT, 1000 * 60 * 60 * 6); // at least 6 hours span
    return {
      globalStartMs: minT - (span * 0.02),
      globalEndMs: maxT + (span * 0.02),
      totalDurationMs: span * 1.04
    };
  }, [rawClusters]);

  // Generate 5-6 evenly spaced time tick marks for timeline axis
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

  if (clusters.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center my-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-500">
          <Layers className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Topic Clusters Found</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {searchTerm 
            ? `No clusters match the search "${searchTerm}". Try another keyword or clear search.`
            : 'No articles currently available. Click "Refresh Data" to trigger RSS ingestion and topic clustering.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* 1. VISUAL CONTINUOUS TIMELINE CANVAS (Communicates "Topic was active during this window") */}
      <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/90 shadow-2xl relative overflow-hidden">
        
        {/* Section Header & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-400" />
              <span>Interactive Topic Timeline</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Horizontal blocks show active time spans (earliest → latest article) with visual intensity sizing
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Outlets:</span>
            {Object.entries(SOURCE_COLORS).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1.5 capitalize text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Continuous Time Scale Ticks Bar */}
        <div className="relative w-full h-8 mb-4 border-b border-slate-800 hidden md:block">
          {timeTicks.map((tick, i) => (
            <div
              key={i}
              className="absolute top-0 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${tick.percent}%` }}
            >
              <div className="h-2 w-px bg-slate-700"></div>
              <span className="text-[11px] font-mono text-slate-400 mt-1 whitespace-nowrap">
                {tick.label}
              </span>
            </div>
          ))}
        </div>

        {/* Interactive Cluster Duration Bars (Scrollable Container) */}
        <div className="relative w-full overflow-x-auto pb-4 pt-2">
          <div className="min-w-[700px] md:min-w-full space-y-3">
            {clusters.slice(0, 15).map((cluster, index) => {
              const start = new Date(cluster.startTime).getTime();
              const end = new Date(cluster.endTime).getTime();
              
              // Calculate horizontal placement percentages
              const leftPercent = Math.max(0, Math.min(95, ((start - globalStartMs) / totalDurationMs) * 100));
              const rawWidthPercent = ((Math.max(end - start, 1000 * 60 * 30)) / totalDurationMs) * 100;
              const widthPercent = Math.max(16, Math.min(100 - leftPercent, rawWidthPercent + 14));

              const isSelected = selectedClusterId === cluster.id;
              const isHovered = hoveredCluster === cluster.id;
              const isHighIntensity = cluster.intensityScore >= 2.5;

              return (
                <div key={cluster.id} className="relative group py-1">
                  
                  {/* Visual Timeline Span Bar */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    onClick={() => onSelectCluster(cluster)}
                    onMouseEnter={() => setHoveredCluster(cluster.id)}
                    onMouseLeave={() => setHoveredCluster(null)}
                    style={{
                      marginLeft: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                    className={`relative rounded-xl p-3 cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-sky-950/80 border-sky-400 ring-2 ring-sky-400/50 shadow-lg shadow-sky-500/20'
                        : isHighIntensity
                        ? 'bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border-amber-500/40 hover:border-amber-400 shadow-md'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-600 shadow-sm'
                    }`}
                  >
                    {/* Active span line indicator */}
                    <div 
                      className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${
                        isHighIntensity ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                      }`}
                    />

                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-sky-300 truncate">
                            {cluster.label}
                          </span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 ${
                            isHighIntensity ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                          }`}>
                            {cluster.articleCount}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {cluster.representativeHeadline}
                        </p>
                      </div>

                      {/* Source dots on timeline bar */}
                      <div className="flex items-center gap-1 shrink-0">
                        {Object.keys(cluster.sourceBreakdown || {}).map(src => (
                          <span
                            key={src}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: SOURCE_COLORS[src] || '#94a3b8' }}
                            title={src.toUpperCase()}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Time Window tooltip on hover */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{format(parseISO(cluster.startTime), 'MMM d, HH:mm')}</span>
                      <span>{cluster.durationHours > 0.1 ? `${cluster.durationHours}h span` : 'Single event'}</span>
                    </div>

                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-400 mt-2 font-mono">
          Showing active time-span distribution for latest top clusters
        </div>
      </section>

      {/* 2. TOPIC CLUSTER EXPLORER GRID */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <span>All Topic Clusters</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {clusters.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Click any cluster to inspect its chronological timeline and full articles
            </p>
          </div>
        </div>

        {/* Responsive Grid: 1 col on mobile, 2 on tablet, 3 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {clusters.map((cluster) => (
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
