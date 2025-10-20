'use client';

import { useEffect, useContext } from 'react';

import HomeContext from '@/pages/api/home/home.context';
import { Conversation } from '@/types/chat';
import { saveConversation } from '@/utils/app/conversation';
import { HTTP_PROXY_PATH, UPDATE_DATA_STREAM } from '@/constants';
import { DataStreamDisplay } from './DataStreamDisplay';

/**
 * DataStreamManager Component
 *
 * Purpose: Manages the state, lifecycle, and discovery of live data streams in the chat interface.
 * This component acts as a bridge between the HomeContext global state and the DataStreamDisplay
 * visualization component, handling stream discovery, selection persistence, and conditional rendering.
 *
 * Responsibilities:
 * - Discovers available streams by polling the API every 2 seconds
 * - Manages stream selection state per conversation
 * - Persists selected stream preference to conversation history
 * - Conditionally renders DataStreamDisplay based on user toggle state
 * - Updates global dataStreams list when new streams become available
 *
 * Stream Discovery:
 * - Polls GET /api/update-data-stream every 2 seconds
 * - Detects newly available streams automatically
 * - Only updates state when stream list actually changes (prevents unnecessary re-renders)
 * - Maintains list of all active streams in HomeContext
 *
 * Stream Selection:
 * - Tracks which stream is selected per conversation
 * - Saves selection to conversation object (persists across sessions)
 * - Defaults to first available stream or 'default' if none exist
 * - Allows users to switch between multiple concurrent streams
 *
 * State Management:
 * - Reads showDataStreamDisplay and dataStreams from HomeContext
 * - Updates dataStreams via dispatch when new streams are discovered
 * - Updates selectedConversation.selectedStream when user changes stream
 * - Persists conversation changes via saveConversation utility
 *
 * Use Cases:
 * - Automatically detect when new ASR streams become available
 * - Remember which stream a user was viewing in each conversation
 * - Provide seamless stream switching in multi-stream environments
 * - Ensure display only shows when user has enabled it
 *
 * Related Components:
 * - DataStreamDisplay.tsx - The visualization component this manages
 * - DataStreamControls.tsx - Controls that toggle showDataStreamDisplay state
 * - HomeContext - Provides global state for streams and display visibility
 * - Conversation type - Stores per-conversation stream selection
 *
 * For detailed architecture and API documentation, see DATA_STREAMING.md
 */

interface DataStreamManagerProps {
  selectedConversation: Conversation | undefined;
  dispatch: any;
}

export const DataStreamManager = ({
  selectedConversation,
  dispatch,
}: DataStreamManagerProps) => {
  const {
    state: { showDataStreamDisplay, dataStreams },
  } = useContext(HomeContext);

  const handleDataStreamChange = (stream: string) => {
    if (selectedConversation) {
      const updatedConversation = {
        ...selectedConversation,
        selectedStream: stream,
      };
      dispatch({ field: 'selectedConversation', value: updatedConversation });
      saveConversation(updatedConversation);
    }
  };

  // Poll /api/update-data-stream every 2 seconds to discover available streams
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Get available streams
        const streamsRes = await fetch(`${HTTP_PROXY_PATH}${UPDATE_DATA_STREAM}`);
        if (streamsRes.ok) {
          const streamsData = await streamsRes.json();
          if (streamsData.streams && Array.isArray(streamsData.streams)) {
            // Only update if streams actually changed
            const currentStreams = dataStreams || [];
            const newStreams = streamsData.streams;
            if (JSON.stringify(currentStreams.sort()) !== JSON.stringify(newStreams.sort())) {
              dispatch({ field: 'dataStreams', value: newStreams });
            }
          }
        }
      } catch (err) {
        // Optionally handle error
      }
    }, 2000); // Less frequent polling for stream discovery
    return () => clearInterval(interval);
  }, [dispatch, dataStreams]);

  if (!showDataStreamDisplay || !selectedConversation) {
    return null;
  }

  return (
    <DataStreamDisplay
      dataStreams={dataStreams || []}
      selectedStream={selectedConversation?.selectedStream || (dataStreams && dataStreams.length > 0 ? dataStreams[0] : 'default')}
      onStreamChange={handleDataStreamChange}
    />
  );
};

