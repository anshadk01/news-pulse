/**
 * API client and TanStack Query hooks for News Pulse.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Fetch helper with error handling
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to fetch timeline clusters data.
 */
export function useTimeline(selectedSources = [], options = {}) {
  const sourceParam = selectedSources.length > 0 ? `?sources=${selectedSources.join(',')}` : '';

  return useQuery({
    queryKey: ['timeline', selectedSources],
    queryFn: async () => {
      const res = await apiFetch(`/timeline${sourceParam}`);
      return res.data;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: options.autoRefresh ? 15000 : false, // Auto-refresh poll every 15s if enabled
    ...options
  });
}

/**
 * Hook to fetch detailed cluster info with full article list.
 */
export function useCluster(clusterId) {
  return useQuery({
    queryKey: ['cluster', clusterId],
    queryFn: async () => {
      if (!clusterId) return null;
      const res = await apiFetch(`/clusters/${clusterId}`);
      return res.data;
    },
    enabled: Boolean(clusterId),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
}

/**
 * Mutation hook to trigger ingestion subprocess.
 */
export function useTriggerIngest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/ingest/trigger', { method: 'POST' });
      return res;
    },
    onSuccess: () => {
      // Invalidation will happen when job completes
    }
  });
}

/**
 * Hook to poll status of a running ingestion job.
 */
export function useIngestStatus(jobId, onComplete) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['ingestStatus', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await apiFetch(`/ingest/status/${jobId}`);
      const jobData = res.data;

      if (jobData.status === 'completed' || jobData.status === 'failed') {
        if (onComplete) onComplete(jobData);
        // Refresh timeline and clusters cache
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
        queryClient.invalidateQueries({ queryKey: ['cluster'] });
      }

      return jobData;
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'completed' || data.status === 'failed')) {
        return false; // Stop polling
      }
      return 1200; // Poll every 1.2s while in progress
    }
  });
}
