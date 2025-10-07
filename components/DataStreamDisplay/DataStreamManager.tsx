'use client';

import { useEffect, useContext } from 'react';

import HomeContext from '@/pages/api/home/home.context';
import { Conversation } from '@/types/chat';
import { saveConversation } from '@/utils/app/conversation';

import { DataStreamDisplay } from './DataStreamDisplay';

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
        const streamsRes = await fetch('/api/update-data-stream');
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

