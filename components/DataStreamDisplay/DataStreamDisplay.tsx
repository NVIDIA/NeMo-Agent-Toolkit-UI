
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { HTTP_PROXY_PATH, UPDATE_DATA_STREAM } from '@/constants';

/**
 * DataStreamDisplay Component
 *
 * Purpose: Visualizes live, continuously updating text streams BEFORE they're finalized
 * and committed to the RAG database. This component is part of a streaming RAG architecture
 * where continuous streams of text (e.g., live ASR transcripts, sensor data) are being
 * processed in real-time and eventually stored in a vector database.
 *
 * Key Features:
 * - Polls and displays live stream text every 100ms for real-time updates
 * - Shows the last database update timestamp for the selected stream
 * - Supports multiple concurrent streams with a stream selector dropdown
 * - Auto-scrolls to display the latest streaming content
 *
 * API Integration:
 * - GET /api/update-data-stream?stream={id} - Fetches live stream text (polled every 100ms)
 * - GET /api/update-data-stream?type=finalized&stream={id} - Fetches last DB update time
 *
 * Use Cases:
 * - Monitoring live ASR transcripts as they're being generated
 * - Viewing real-time sensor data feeds
 * - Tracking any streaming text content before database ingestion
 *
 * Related Components:
 * - DataStreamControls.tsx - Toggle visibility of this display in chat interface
 * - DataStreamManager.tsx - Manages stream state and lifecycle
 * - /database-updates page - Shows finalized entries and their ingestion status
 *
 * For detailed architecture and API documentation, see DATA_STREAMING.md
 */

interface DataStreamDisplayProps {
  dataStreams: string[];
  selectedStream: string;
  onStreamChange: (stream: string) => void;
}

interface FinalizedDataEntry {
  text: string;
  stream_id: string;
  timestamp: number;
  id: string;
  uuid?: string;
  pending?: boolean;
}

export const DataStreamDisplay: React.FC<DataStreamDisplayProps> = React.memo(({
  dataStreams,
  selectedStream,
  onStreamChange
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [lastDbUpdate, setLastDbUpdate] = useState<number | null>(null);

  // Move polling logic into this component to isolate updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Get text for selected stream
        const textRes = await fetch(`${HTTP_PROXY_PATH}${UPDATE_DATA_STREAM}?stream=${selectedStream}`);
        if (textRes.ok) {
          const textData = await textRes.json();
          if (typeof textData.text === 'string') {
            setText(textData.text);
          }
        }
      } catch (err) {
        // Optionally handle error
      }
    }, 100);
    return () => clearInterval(interval);
  }, [selectedStream]);

  // Fetch last database update time for the selected stream
  useEffect(() => {
    const fetchLastDbUpdate = async () => {
      try {
        const response = await fetch(`${HTTP_PROXY_PATH}${UPDATE_DATA_STREAM}?type=finalized&stream=${selectedStream}`);
        if (response.ok) {
          const data = await response.json();
          const entries: FinalizedDataEntry[] = data.entries || [];

          if (entries.length > 0) {
            // Find the most recent entry for this stream
            const sortedEntries = entries.sort((a, b) => {
              const timestampA = parseTimestampAsUTC(a.timestamp);
              const timestampB = parseTimestampAsUTC(b.timestamp);
              return timestampB - timestampA; // Most recent first
            });

            const latestTimestamp = parseTimestampAsUTC(sortedEntries[0].timestamp);
            setLastDbUpdate(latestTimestamp);
          } else {
            setLastDbUpdate(null);
          }
        }
      } catch (err) {
        // Handle error silently
        setLastDbUpdate(null);
      }
    };

    if (selectedStream) {
      fetchLastDbUpdate();
      // Check for updates every 5 seconds
      const interval = setInterval(fetchLastDbUpdate, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedStream]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text]);

  const formatStreamName = (streamId: string) => {
    return streamId || 'Default Stream';
  };

  const parseTimestampAsUTC = (timestamp: string | number): number => {
    if (typeof timestamp === 'number') return timestamp;
    // Only add 'Z' if not already present
    const utcString = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    console.log(`[SERVER] Timestamp debug ${utcString}`);
    return new Date(utcString).getTime();
  };

  const formatLastUpdateTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

        // Less than 1 minute
    if (diff < 60000) {
      const seconds = Math.floor(diff / 1000);
      return `${seconds}s ago`;
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }

    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // More than 1 day - show date
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="w-full sm:w-[95%] 2xl:w-[60%] mx-auto mt-1 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-left text-lg font-semibold text-black dark:text-white">
            Live Data Streams
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {lastDbUpdate ? `Last DB update: ${formatLastUpdateTime(lastDbUpdate)}` : 'No database updates yet'}
          </span>
        </div>
        {dataStreams.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-black dark:text-white">Stream:</label>
            <select
              value={selectedStream}
              onChange={(e) => onStreamChange(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-black dark:text-white"
            >
              {dataStreams.map(stream => (
                <option key={stream} value={stream}>
                  {formatStreamName(stream)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        className="bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-900 p-2 max-h-16 overflow-y-auto"
      >
        <p className="text-black dark:text-white whitespace-pre-wrap m-0">
          {text || 'Waiting for data...'}
        </p>
      </div>
    </div>
  );
});