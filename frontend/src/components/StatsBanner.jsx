import React from 'react';
import { Layers, Globe, Clock, Flame, Zap } from 'lucide-react';
import { formatDistanceStrict, parseISO } from 'date-fns';

export default function StatsBanner({ timelineData, isPending }) {
  if (isPending || !timelineData) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-panel rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const clusters = timelineData.clusters || [];
  const totalClusters = timelineData.totalClusters || clusters.length;
  
  // Calculate total articles
  const totalArticles = clusters.reduce((acc, c) => acc + (c.articleCount || 0), 0);
  
  // Calculate multi-source clusters
  const multiSourceClusters = clusters.filter(c => Object.keys(c.sourceBreakdown || {}).length > 1).length;

  // Format time span
  let timeSpanLabel = 'Recent 24h';
  if (timelineData.timeRange?.globalStart && timelineData.timeRange?.globalEnd) {
    try {
      const start = parseISO(timelineData.timeRange.globalStart);
      const end = parseISO(timelineData.timeRange.globalEnd);
      timeSpanLabel = formatDistanceStrict(start, end);
    } catch (e) {
      timeSpanLabel = 'Active Horizon';
    }
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      
      {/* Metric 1 */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Topic Clusters</span>
          <Layers className="w-4 h-4 text-sky-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white">{totalClusters}</span>
          <span className="text-xs text-slate-400">across 4 feeds</span>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Total Articles</span>
          <Globe className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white">{totalArticles}</span>
          <span className="text-xs text-emerald-400 font-medium">Deduplicated</span>
        </div>
      </div>

      {/* Metric 3 */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Cross-Outlet Stories</span>
          <Flame className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">{multiSourceClusters}</span>
          <span className="text-xs text-slate-400">high convergence</span>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-medium uppercase tracking-wider">Time Window</span>
          <Clock className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-400">{timeSpanLabel}</span>
          <span className="text-xs text-slate-400">timeline depth</span>
        </div>
      </div>

    </div>
  );
}
