import React from 'react';
import { 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Terminal, 
  Layers, 
  Sparkles,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function IngestStatusModal({ jobData, onClose, isOpen }) {
  if (!isOpen || !jobData) return null;

  const isRunning = jobData.status === 'running' || jobData.status === 'queued';
  const isCompleted = jobData.status === 'completed';
  const isFailed = jobData.status === 'failed';

  const stages = [
    { name: 'Ingesting Multi-Feed RSS Streams', active: isRunning, done: isCompleted },
    { name: 'Extracting Full Text & Deduplicating', active: isRunning, done: isCompleted },
    { name: 'TF-IDF Vectorization & Topic Grouping', active: isRunning, done: isCompleted },
    { name: 'Updating Timeline Database', active: isRunning, done: isCompleted }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isCompleted 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isFailed
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}>
                {isCompleted && <CheckCircle2 className="w-5 h-5" />}
                {isFailed && <AlertCircle className="w-5 h-5" />}
                {isRunning && <RotateCw className="w-5 h-5 animate-spin" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRunning && 'Running Ingestion Pipeline...'}
                  {isCompleted && 'Pipeline Ingestion Completed!'}
                  {isFailed && 'Ingestion Failed'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Job ID: {jobData.jobId}
                </p>
              </div>
            </div>

            {!isRunning && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Current Stage Indicator */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-400">Current Phase</span>
              {jobData.durationSeconds && (
                <span className="font-mono text-emerald-400 font-bold">{jobData.durationSeconds}s elapsed</span>
              )}
            </div>
            <p className="text-sm font-bold text-sky-400 flex items-center gap-2">
              {isRunning && <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />}
              {jobData.stage || 'Processing articles...'}
            </p>
          </div>

          {/* Result summary if completed */}
          {isCompleted && jobData.result && (
            <div className="grid grid-cols-3 gap-2.5 mb-6 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center">
              <div>
                <span className="text-[11px] text-slate-400 block">Fetched</span>
                <span className="text-lg font-extrabold text-white">{jobData.result.fetched_count}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">New Added</span>
                <span className="text-lg font-extrabold text-emerald-400">+{jobData.result.new_articles_count}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Topic Clusters</span>
                <span className="text-lg font-extrabold text-sky-400">{jobData.result.clusters_count}</span>
              </div>
            </div>
          )}

          {/* Error display if failed */}
          {isFailed && jobData.error && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 mb-6">
              {jobData.error}
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              disabled={isRunning}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${
                isRunning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30'
              }`}
            >
              {isRunning ? 'Processing in background...' : 'View Updated Timeline'}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
