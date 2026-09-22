import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import SourceFilter from '../components/SourceFilter';
import ClusterCard from '../components/ClusterCard';
import TimelineView from '../components/TimelineView';
import ClusterDetailDrawer from '../components/ClusterDetailDrawer';
import { useCluster } from '../api/client';

vi.mock('../api/client', () => ({
  useCluster: vi.fn()
}));

describe('SourceFilter Component', () => {
  it('renders all source buttons', () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();
    render(
      <SourceFilter
        selectedSources={['bbc']}
        onToggleSource={onToggle}
        onSelectAll={vi.fn()}
        onClearAll={onClear}
      />
    );

    expect(screen.getByText('All Outlets')).toBeInTheDocument();
    expect(screen.getByText('BBC News')).toBeInTheDocument();
    expect(screen.getByText('NPR')).toBeInTheDocument();
    expect(screen.getByText('The Guardian')).toBeInTheDocument();
    expect(screen.getByText('Al Jazeera')).toBeInTheDocument();
  });

  it('calls onToggleSource when a source is clicked', () => {
    const onToggle = vi.fn();
    render(
      <SourceFilter
        selectedSources={[]}
        onToggleSource={onToggle}
        onSelectAll={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('BBC News'));
    expect(onToggle).toHaveBeenCalledWith('bbc');
  });
});

describe('ClusterCard Component', () => {
  const mockCluster = {
    id: 'c_test123',
    label: 'Global Climate Summit Accord',
    keywords: ['Climate', 'Summit', 'Accord'],
    representativeHeadline: 'World leaders sign binding climate emissions treaty in Geneva',
    articleCount: 3,
    startTime: '2026-09-21T10:00:00Z',
    endTime: '2026-09-21T14:30:00Z',
    durationHours: 4.5,
    intensityScore: 3.2,
    sourceBreakdown: { bbc: 2, guardian: 1 }
  };

  it('renders cluster label, keywords, and article count', () => {
    const onSelect = vi.fn();
    render(
      <ClusterCard
        cluster={mockCluster}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Global Climate Summit Accord')).toBeInTheDocument();
    expect(screen.getByText('3 articles')).toBeInTheDocument();
    expect(screen.getByText('#Climate')).toBeInTheDocument();
    expect(screen.getByText('4.5h span')).toBeInTheDocument();
  });

  it('triggers onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(
      <ClusterCard
        cluster={mockCluster}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('Global Climate Summit Accord'));
    expect(onSelect).toHaveBeenCalledWith(mockCluster);
  });
});

describe('TimelineView Component', () => {
  const timelineData = {
    clusters: [
      {
        id: 'cluster-1',
        label: 'Latest topic',
        representativeHeadline: 'Latest news headline',
        articleCount: 2,
        startTime: '2026-09-21T10:00:00Z',
        endTime: '2026-09-21T12:00:00Z',
        durationHours: 2,
        intensityScore: 2,
        sourceBreakdown: { bbc: 2 }
      }
    ]
  };

  it('defaults to a right-to-left timeline with latest topics on the left', () => {
    render(
      <TimelineView
        timelineData={timelineData}
        onSelectCluster={vi.fn()}
        selectedClusterId={null}
      />
    );

    expect(screen.getByText('Latest on Left (RTL)')).toBeInTheDocument();
    expect(screen.getByText(/Right-to-Left Mode/)).toBeInTheDocument();
  });
});

describe('ClusterDetailDrawer Component', () => {
  it('keeps the interface visible when detail data contains invalid dates', () => {
    useCluster.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        id: 'cluster-1',
        label: 'Topic with incomplete metadata',
        articleCount: 1,
        startTime: null,
        durationHours: 0,
        intensityScore: 1,
        sourceBreakdown: {},
        keywords: [],
        articles: [{
          id: 'article-1',
          sourceId: 'bbc',
          sourceName: 'BBC News',
          title: 'Article without a date',
          publishedAt: 'not-a-date',
          url: 'https://example.com/article'
        }]
      }
    });

    render(<ClusterDetailDrawer clusterId="cluster-1" onClose={vi.fn()} />);

    expect(screen.getByText('Topic with incomplete metadata')).toBeInTheDocument();
    expect(screen.getAllByText('Date unavailable')).toHaveLength(2);
    expect(screen.getByText('Article without a date')).toBeInTheDocument();
  });

  it('formats a valid article timestamp without treating UTC as date tokens', () => {
    useCluster.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        id: 'cluster-2',
        label: 'Topic with a valid date',
        articleCount: 1,
        startTime: '2026-09-23T12:30:00Z',
        durationHours: 0,
        intensityScore: 1,
        sourceBreakdown: {},
        keywords: [],
        articles: [{
          id: 'article-2',
          sourceId: 'bbc',
          sourceName: 'BBC News',
          title: 'Article with a valid date',
          publishedAt: '2026-09-23T12:30:00Z',
          url: 'https://example.com/article'
        }]
      }
    });

    render(<ClusterDetailDrawer clusterId="cluster-2" onClose={vi.fn()} />);

    expect(screen.getByText(/\(UTC\)/)).toBeInTheDocument();
  });
});
