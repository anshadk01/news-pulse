import React from 'react';
import { 
  Activity, 
  RotateCw, 
  Search, 
  Sparkles, 
  Layers, 
  Clock, 
  Radio 
} from 'lucide-react';

export default function Header({ 
  onRefresh, 
  isIngesting, 
  searchTerm, 
  onSearchChange, 
  autoRefresh, 
  onToggleAutoRefresh,
  totalClusters = 0
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3.5 gap-3">
          
          {/* Logo & Live Badge */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-500 p-0.5 shadow-lg shadow-sky-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-sky-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                    News<span className="text-sky-400">Pulse</span>
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Radio className="w-3 h-3 animate-ping" />
                    Live Timeline
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  AI topic-clustered timeline from global RSS feeds
                </p>
              </div>
            </div>

            {/* Mobile Ingest Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={isIngesting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-semibold text-white shadow-sm transition active:scale-95"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin' : ''}`} />
                <span>{isIngesting ? 'Syncing...' : 'Sync'}</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="w-full md:max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search topic clusters, headlines, or keywords..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Desktop Controls: Auto-refresh & Refresh Button */}
          <div className="hidden md:flex items-center gap-3">
            {/* Auto Refresh Toggle */}
            <button
              onClick={onToggleAutoRefresh}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                autoRefresh 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Auto-refresh timeline every 15s"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              Auto-Sync
            </button>

            {/* Refresh Data Trigger Button */}
            <button
              onClick={onRefresh}
              disabled={isIngesting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 disabled:opacity-60 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition active:scale-95 cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isIngesting ? 'animate-spin' : ''}`} />
              <span>{isIngesting ? 'Ingesting Feeds...' : 'Refresh Data'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
