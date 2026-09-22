import React from 'react';
import { Filter, Check } from 'lucide-react';

const AVAILABLE_SOURCES = [
  { id: 'bbc', name: 'BBC News', color: '#bb1919', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  { id: 'npr', name: 'NPR', color: '#1b629b', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  { id: 'guardian', name: 'The Guardian', color: '#005689', bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-300' },
  { id: 'aljazeera', name: 'Al Jazeera', color: '#e05a1e', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
];

export default function SourceFilter({ selectedSources, onToggleSource, onSelectAll, onClearAll }) {
  const allSelected = selectedSources.length === 0 || selectedSources.length === AVAILABLE_SOURCES.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3.5 glass-panel rounded-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
          <Filter className="w-3.5 h-3.5 text-sky-400" />
          <span>Filter Sources:</span>
        </div>

        {/* All Sources Pill */}
        <button
          onClick={onClearAll}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            allSelected
              ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          {allSelected && <Check className="w-3.5 h-3.5" />}
          <span>All Outlets</span>
        </button>

        {/* Individual Source Pills */}
        {AVAILABLE_SOURCES.map(source => {
          const isSelected = selectedSources.includes(source.id);
          return (
            <button
              key={source.id}
              onClick={() => onToggleSource(source.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                isSelected
                  ? `${source.bg} ${source.border} ${source.text} ring-1 ring-offset-1 ring-offset-slate-950 ring-${source.text}`
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: source.color }} 
              />
              <span>{source.name}</span>
              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      <div className="text-xs text-slate-400">
        Showing clusters containing selected feeds
      </div>
    </div>
  );
}
