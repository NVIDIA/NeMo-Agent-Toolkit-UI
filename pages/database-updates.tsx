
import React, { useState, useEffect } from 'react';
import { IconRefresh, IconFilter, IconHistory, IconSortAscending, IconSortDescending, IconClock, IconCheck } from '@tabler/icons-react';
import { useTheme } from '@/contexts/ThemeContext';
import { HTTP_PROXY_PATH, UPDATE_DATA_STREAM } from '@/constants';
import Head from 'next/head';

/**
 * Database Updates History Page (/database-updates)
 *
 * Purpose: Monitoring dashboard for finalized text entries marked for database storage in the streaming
 * RAG pipeline. Shows which chunks have been sent to the database and their ingestion status.
 *
 * Key Features:
 * - Lists finalized entries with status: "Database Pending" (yellow) or "Database Ingested" (green)
 * - Filter by stream ID and processing status (pending/ingested/all)
 * - Auto-refresh every 5 seconds
 * - Sort by newest/oldest (persists to localStorage)
 *
 * Data Flow:
 * 1. Backend marks chunk as finalized → Entry appears with "Database Pending" status
 * 2. Backend ingests chunk → Updates entry to "Database Ingested" status
 *
 * API Integration:
 * - GET /api/update-data-stream?type=finalized (polls every 5s)
 * - Reads entry.pending field for status
 * - Uses entry.uuid for backend correlation
 *
 * Access: Opened via "Data Updates" button in DataStreamControls (opens in new tab)
 *
 * Use Cases: Monitor ASR transcript ingestion, verify successful database storage, debug pipeline issues
 *
 * Related: DataStreamControls.tsx (opens page), DataStreamDisplay.tsx (shows live text), /api/update-data-stream
 *
 * For detailed architecture and API documentation, see DATA_STREAMING.md
 */

interface FinalizedDataEntry {
  text: string;
  stream_id: string;
  timestamp: number;
  id: string;
  uuid?: string;
  pending?: boolean;
}

const DataStreamHistory = () => {
  const [entries, setEntries] = useState<FinalizedDataEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<FinalizedDataEntry[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [availableStreams, setAvailableStreams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>(() => {
    // Initialize from localStorage, fallback to 'newest'
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('entry-sort-order') as 'newest' | 'oldest') || 'newest';
    }
    return 'newest';
  });
  const [pendingFilter, setPendingFilter] = useState<'all' | 'pending' | 'ingested'>(() => {
    // Initialize from localStorage, fallback to 'all'
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('entry-pending-filter') as 'all' | 'pending' | 'ingested') || 'all';
    }
    return 'all';
  });

  const { lightMode } = useTheme();

  // Save sort order to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('entry-sort-order', sortOrder);
    }
  }, [sortOrder]);

  // Save pending filter to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('entry-pending-filter', pendingFilter);
    }
  }, [pendingFilter]);

  // Fetch finalized entries
  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${HTTP_PROXY_PATH}${UPDATE_DATA_STREAM}?type=finalized`);
      if (!response.ok) {
        throw new Error('Failed to fetch entries');
      }
      const data = await response.json();

      // Guard against missing entries
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      setEntries(entries);

      // Extract unique stream IDs from entries
      const streamIds = entries.map((t: FinalizedDataEntry) => t.stream_id);
      const streams = Array.from(new Set<string>(streamIds)).sort((a: string, b: string) => a.localeCompare(b));
      setAvailableStreams(streams);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort entries based on selected stream, pending status, and sort order
  useEffect(() => {
    let filtered = entries;

    // Apply stream filter
    if (selectedStream !== null) {
      filtered = filtered.filter((t: FinalizedDataEntry) => t.stream_id === selectedStream);
    }

    // Apply pending status filter
    if (pendingFilter !== 'all') {
      filtered = filtered.filter((t: FinalizedDataEntry) => {
        if (pendingFilter === 'pending') {
          return t.pending === true;
        } else if (pendingFilter === 'ingested') {
          return t.pending === false;
        }
        return true;
      });
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      // First sort by stream_id
      if (a.stream_id !== b.stream_id) {
        return a.stream_id.localeCompare(b.stream_id);
      }
      // Then sort by timestamp based on sort order
      // Convert timestamps to numbers to ensure proper comparison
      const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
      const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;

      if (sortOrder === 'newest') {
        return timestampB - timestampA; // Newest first
      } else {
        return timestampA - timestampB; // Oldest first
      }
    });

    setFilteredEntries(filtered);
  }, [entries, selectedStream, pendingFilter, sortOrder]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatStreamName = (streamId: string) => {
    return streamId || 'Default Stream';
  };

  const getStreamColor = (streamId: string) => {
    // Generate a consistent color based on stream ID hash
    let hash = 0;
    for (let i = 0; i < streamId.length; i++) {
      const char = streamId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <>
      <Head>
        <title>Database Updates</title>
        <meta name="description" content="View and manage database entry updates" />
        <link rel="icon" href="/nvidia.jpg" />
      </Head>

      <div className={`min-h-screen ${lightMode === 'dark' ? 'dark' : ''}`}>
        <div className="bg-white dark:bg-gray-900 min-h-screen">
          {/* Header */}
          <div className="bg-[#76b900] dark:bg-gray-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                  <IconHistory className="w-8 h-8 text-white" />
                  <h1 className="text-xl font-semibold text-white">
                    Database History
                  </h1>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                    className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-white transition-colors"
                    title={`Sort by ${sortOrder === 'newest' ? 'oldest first' : 'newest first'}`}
                  >
                    {sortOrder === 'newest' ? (
                      <IconSortDescending className="w-4 h-4" />
                    ) : (
                      <IconSortAscending className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                    </span>
                  </button>
                  <button
                    onClick={fetchEntries}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-white transition-colors disabled:opacity-50"
                  >
                    <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Filters */}
            <div className="mb-6">
              <div className="flex items-center space-x-4 flex-wrap gap-y-2">
                <IconFilter className="w-5 h-5 text-gray-500 dark:text-gray-400" />

                {/* Stream Filter */}
                <select
                  value={selectedStream ?? ''}
                  onChange={(e) => setSelectedStream(e.target.value ? e.target.value : null)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#76b900] focus:border-transparent"
                >
                  <option value="">All Streams</option>
                  {availableStreams.map((streamId: string) => (
                    <option key={streamId} value={streamId}>
                      {formatStreamName(streamId)}
                    </option>
                  ))}
                </select>

                {/* Pending Status Filter */}
                <select
                  value={pendingFilter}
                  onChange={(e) => setPendingFilter(e.target.value as 'all' | 'pending' | 'ingested')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#76b900] focus:border-transparent"
                >
                  <option value="all">Any Status</option>
                  <option value="pending">Pending</option>
                  <option value="ingested">Ingested</option>
                </select>

                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredEntries.length} {filteredEntries.length !== 1 ? 'entries' : 'entry'}
                </span>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-red-800 dark:text-red-200">Error: {error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && entries.length === 0 && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#76b900]"></div>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredEntries.length === 0 && !error && (
              <div className="text-center py-12">
                <IconHistory className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  No entries found
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedStream !== null
                    ? `No finalized entries for ${formatStreamName(selectedStream)}`
                    : 'No finalized entries available'
                  }
                </p>
              </div>
            )}

            {/* Entries List */}
            {filteredEntries.length > 0 && (
              <div className="space-y-4">
                {filteredEntries.map((entry: FinalizedDataEntry) => (
                  <div
                    key={entry.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStreamColor(entry.stream_id)}`}>
                          {formatStreamName(entry.stream_id)}
                        </span>
                        {/* Processing Status Indicator */}
                        {entry.pending !== undefined && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.pending
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {entry.pending ? (
                              <>
                                <IconClock className="w-3 h-3 mr-1" />
                                Database Pending
                              </>
                            ) : (
                              <>
                                <IconCheck className="w-3 h-3 mr-1" />
                                Database Ingested
                              </>
                            )}
                          </span>
                        )}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                        {/* UUID Display (for debugging/admin purposes) */}
                        {entry.uuid && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            ID: {entry.uuid.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                        {entry.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DataStreamHistory;