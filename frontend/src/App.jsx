import React, { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import StatsBanner from './components/StatsBanner';
import SourceFilter from './components/SourceFilter';
import TimelineView from './components/TimelineView';
import ClusterDetailDrawer from './components/ClusterDetailDrawer';
import IngestStatusModal from './components/IngestStatusModal';
import { useTimeline, useTriggerIngest, useIngestStatus } from './api/client';
import { AlertTriangle, RotateCw } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function Dashboard() {
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Ingest tracking state
  const [activeJobId, setActiveJobId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queries & Mutations
  const { 
    data: timelineData, 
    isLoading, 
    isPending, 
    error, 
    refetch: refetchTimeline 
  } = useTimeline(selectedSources, { autoRefresh });

  const triggerIngestMutation = useTriggerIngest();

  // Ingest polling hook
  const { data: jobStatus } = useIngestStatus(activeJobId, (completedJob) => {
    // Keep modal open so user sees summary
  });

  // Source toggle handlers
  const handleToggleSource = useCallback((sourceId) => {
    setSelectedSources(prev => {
      if (prev.includes(sourceId)) {
        return prev.filter(s => s !== sourceId);
      } else {
        return [...prev, sourceId];
      }
    });
  }, []);

  const handleClearSources = useCallback(() => {
    setSelectedSources([]);
  }, []);

  // Trigger manual ingestion
  const handleTriggerIngest = async () => {
    try {
      const res = await triggerIngestMutation.mutateAsync();
      if (res.jobId) {
        setActiveJobId(res.jobId);
        setIsModalOpen(true);
      }
    } catch (err) {
      alert(`Failed to trigger ingestion: ${err.message}`);
    }
  };

  const isIngesting = triggerIngestMutation.isPending || (jobStatus && (jobStatus.status === 'running' || jobStatus.status === 'queued'));

  return (
    <div className="min-h-screen bg-slate-950 bg-grid-pattern text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      
      {/* Top Navigation Header */}
      <Header
        onRefresh={handleTriggerIngest}
        isIngesting={isIngesting}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(prev => !prev)}
        totalClusters={timelineData?.totalClusters || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Metric Overview Banner */}
        <StatsBanner
          timelineData={timelineData}
          isPending={isPending}
        />

        {/* Source Filter Bar */}
        <SourceFilter
          selectedSources={selectedSources}
          onToggleSource={handleToggleSource}
          onClearAll={handleClearSources}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto mb-4">
              <RotateCw className="w-6 h-6 text-sky-400 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Loading Topic Timeline...</h3>
            <p className="text-xs text-slate-400">Fetching live clusters and chronological article data</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-panel rounded-2xl p-6 border-rose-500/30 text-center my-8">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Failed to Connect to News Pulse API</h3>
            <p className="text-xs text-slate-400 mb-4">{error.message}</p>
            <button
              onClick={() => refetchTimeline()}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Timeline & Cluster View */}
        {!isLoading && !error && timelineData && (
          <TimelineView
            timelineData={timelineData}
            onSelectCluster={(cluster) => setSelectedClusterId(cluster.id)}
            selectedClusterId={selectedClusterId}
            searchTerm={searchTerm}
          />
        )}

      </main>

      {/* Cluster Detail Reader Drawer */}
      <ClusterDetailDrawer
        clusterId={selectedClusterId}
        onClose={() => setSelectedClusterId(null)}
      />

      {/* Live Ingestion Job Modal */}
      <IngestStatusModal
        isOpen={isModalOpen}
        jobData={jobStatus}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>News Pulse • Topic-Clustered News Timeline Engine</span>
          <span>BBC News • NPR • The Guardian • Al Jazeera</span>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
