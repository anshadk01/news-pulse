import React from 'react';
import { 
  X, 
  ExternalLink, 
  Clock, 
  Calendar, 
  Layers, 
  Globe, 
  Flame, 
  BookOpen, 
  ArrowLeft 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useCluster } from '../api/client';

const SOURCE_COLORS = {
  bbc: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  npr: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  guardian: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  aljazeera: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' }
};

export default function ClusterDetailDrawer({ clusterId, onClose }) {
  const { data: cluster, isLoading, error } = useCluster(clusterId);

  if (!clusterId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
        
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto z-10 shadow-2xl flex flex-col"
        >
          {/* Drawer Header */}
          <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md p-5 border-b border-slate-800 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {cluster ? `${cluster.articleCount} grouped stories` : 'Loading...'}
                </span>
                {cluster?.intensityScore >= 2.5 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    High Activity
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                {cluster?.label || 'Topic Cluster Details'}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-5 sm:p-6 space-y-6 flex-1">
            
            {isLoading && (
              <div className="space-y-4 py-8">
                <div className="h-6 bg-slate-800 rounded w-1/3 animate-pulse"></div>
                <div className="h-32 bg-slate-800/60 rounded-2xl animate-pulse"></div>
                <div className="h-32 bg-slate-800/60 rounded-2xl animate-pulse"></div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                Failed to load cluster details: {error.message}
              </div>
            )}

            {cluster && (
              <>
                {/* Cluster Metadata Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Time Horizon</span>
                    <span className="font-mono text-slate-200">
                      {format(parseISO(cluster.startTime), 'MMM d, HH:mm')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Active Duration</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {cluster.durationHours > 0.1 ? `${cluster.durationHours} hours` : 'Single snapshot'}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block mb-1">Sources</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(cluster.sourceBreakdown || {}).map(src => (
                        <span key={src} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase text-[10px] font-bold">
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Keywords Cloud */}
                {cluster.keywords?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Key Topic Terms & Entities
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {cluster.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-sky-950/60 text-sky-300 border border-sky-800/50 text-xs font-medium"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chronological Article Progression */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Story Timeline Progression ({cluster.articles?.length || 0} Articles)</span>
                  </h4>

                  <div className="space-y-4 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                    {cluster.articles?.map((article, index) => {
                      const sourceTheme = SOURCE_COLORS[article.sourceId] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
                      const publishedFormatted = format(parseISO(article.publishedAt), 'EEEE, MMM d, yyyy • HH:mm (UTC)');

                      return (
                        <div key={article.id} className="relative pl-8 group">
                          {/* Timeline dot */}
                          <div className="absolute left-1.5 top-3.5 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-900 border-2 border-sky-400 group-hover:scale-125 transition-transform" />

                          {/* Article Card */}
                          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/90 hover:border-slate-700 transition">
                            
                            {/* Source & Timestamp */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                              <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${sourceTheme.bg} ${sourceTheme.text} ${sourceTheme.border}`}>
                                {article.sourceName}
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                {publishedFormatted}
                              </span>
                            </div>

                            {/* Headline */}
                            <h5 className="text-base font-bold text-slate-100 group-hover:text-sky-300 transition-colors mb-2">
                              {article.title}
                            </h5>

                            {/* Summary */}
                            {article.summary && (
                              <p className="text-xs sm:text-sm text-slate-400 mb-3 leading-relaxed">
                                {article.summary}
                              </p>
                            )}

                            {/* Extracted Body snippet */}
                            {article.bodyText && article.bodyText !== article.summary && (
                              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/60 text-xs text-slate-400 leading-relaxed mb-3 max-h-32 overflow-y-auto">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                  Full Text Extract:
                                </span>
                                {article.bodyText.slice(0, 350)}...
                              </div>
                            )}

                            {/* Direct External Link */}
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition mt-1"
                            >
                              <span>Read original on {article.sourceName}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </>
            )}

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
