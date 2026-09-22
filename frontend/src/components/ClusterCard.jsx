import React from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, Flame, ArrowUpRight, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const SOURCE_COLORS = {
  bbc: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  npr: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  guardian: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  aljazeera: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' }
};

export default function ClusterCard({ cluster, onSelect, isSelected }) {
  const {
    id,
    label,
    keywords = [],
    representativeHeadline,
    articleCount = 1,
    startTime,
    endTime,
    durationHours = 0,
    intensityScore = 1,
    sourceBreakdown = {}
  } = cluster;

  const startFormatted = startTime ? format(parseISO(startTime), 'MMM d, HH:mm') : '';
  const endFormatted = endTime ? format(parseISO(endTime), 'MMM d, HH:mm') : '';
  const isMultiArticle = articleCount > 1;
  const isHighIntensity = intensityScore >= 2.5;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      onClick={() => onSelect(cluster)}
      className={`glass-panel rounded-2xl p-4 sm:p-5 cursor-pointer border transition-all relative overflow-hidden group ${
        isSelected
          ? 'border-sky-500 ring-2 ring-sky-500/40 bg-slate-900/90 shadow-xl shadow-sky-500/15'
          : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 shadow-md'
      }`}
    >
      {/* Top row: Intensity Badge & Active Duration */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          {/* Article Count & Visual Sizing Pill */}
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
            isHighIntensity 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
              : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
          }`}>
            <Layers className="w-3 h-3" />
            {articleCount} {articleCount === 1 ? 'article' : 'articles'}
          </span>

          {/* High intensity badge */}
          {isHighIntensity && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <Flame className="w-3 h-3" />
              High Volume
            </span>
          )}
        </div>

        {/* Duration badge */}
        <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{durationHours > 0.1 ? `${durationHours}h span` : 'Single event'}</span>
        </div>
      </div>

      {/* Cluster Label / Keyphrase Heading */}
      <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-sky-400 transition-colors line-clamp-2 mb-1.5 flex items-start justify-between gap-2">
        <span>{label}</span>
        <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 shrink-0 opacity-0 group-hover:opacity-100 transition" />
      </h3>

      {/* Representative Headline */}
      {representativeHeadline && (
        <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-3">
          "{representativeHeadline}"
        </p>
      )}

      {/* Keyword tags */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {keywords.slice(0, 3).map((kw, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50"
            >
              #{kw}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Time window bar & Source icons */}
      <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Time range string */}
        <div className="text-slate-400 flex items-center gap-1 text-[11px]">
          <span>{startFormatted}</span>
          {isMultiArticle && startTime !== endTime && (
            <>
              <span className="text-slate-600">→</span>
              <span>{endFormatted}</span>
            </>
          )}
        </div>

        {/* Source Badges */}
        <div className="flex items-center gap-1">
          {Object.entries(sourceBreakdown).map(([sourceId, count]) => {
            const theme = SOURCE_COLORS[sourceId] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
            return (
              <span
                key={sourceId}
                className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${theme.bg} ${theme.text} ${theme.border}`}
                title={`${count} article(s) from ${sourceId.toUpperCase()}`}
              >
                {sourceId} {count > 1 ? `(${count})` : ''}
              </span>
            );
          })}
        </div>
      </div>

    </motion.div>
  );
}
