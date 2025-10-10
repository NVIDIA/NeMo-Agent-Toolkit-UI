'use client';

/**
 * DataStreamControls Component
 *
 * Purpose: Provides UI controls for managing the live data streaming visualization in the chat
 * interface. This component is part of a streaming RAG architecture and offers users the ability
 * to toggle the live stream display and access the database history page.
 *
 * Key Features:
 * - Toggle switch to show/hide the DataStreamDisplay component in the chat interface
 * - Button to open the Database Updates page (/database-updates) in a new tab
 * - Responsive design with icon-only view on small screens
 * - Visual feedback with color transitions (green/black for enabled state)
 *
 * Controls Provided:
 * 1. "Data Stream Display" Toggle:
 *    - Enables/disables the live stream visualization component
 *    - When ON: Shows DataStreamDisplay component below the chat header
 *    - When OFF: Hides the live stream display to maximize chat space
 *    - State managed via HomeContext (showDataStreamDisplay field)
 *
 * 2. "Data Updates" Button:
 *    - Opens the Database Updates page (/database-updates) in a new tab
 *    - Provides access to finalized entries and their ingestion status
 *    - Shows which chunks have been sent to the database and their processing state
 *    - Icon: Database icon (IconDatabase from Tabler Icons)
 *
 * Location: Displayed in the chat interface header, typically alongside other chat controls
 *
 * Use Cases:
 * - Enable live stream display when monitoring real-time ASR transcripts
 * - Access database history to verify which chunks have been ingested
 * - Toggle off display when focusing solely on chat interaction
 * - Quick access to view processing status of finalized stream entries
 *
 * Related Components:
 * - DataStreamDisplay.tsx - The live stream visualization component this controls
 * - DataStreamManager.tsx - Manages stream state and lifecycle
 * - /database-updates page - Database history page opened by the button
 * - HomeContext - Provides state management for toggle visibility
 *
 * For detailed architecture and API documentation, see DATA_STREAMING.md
 */

import { IconDatabase } from '@tabler/icons-react';
import React, { useContext } from 'react';

import HomeContext from '@/pages/api/home/home.context';

export const DataStreamControls = () => {
  const {
    state: { showDataStreamDisplay },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  return (
    <>
      {/* Data Stream Display Toggle */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <span className="text-sm font-medium text-black dark:text-white">
          Data Stream Display
          </span>
          <div
            onClick={() => {
              homeDispatch({
                field: 'showDataStreamDisplay',
                value: !showDataStreamDisplay,
              });
            }}
            className={`relative inline-flex h-5 w-10 items-center cursor-pointer rounded-full transition-colors duration-300 ease-in-out ${
              showDataStreamDisplay ? 'bg-black dark:bg-[#76b900]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
                showDataStreamDisplay ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Database Updates Button */}
      <div className="flex items-center">
          <button
              onClick={() => window.open('/database-updates', '_blank')}
              className="flex items-center gap-2 px-3 py-1 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="View Database Updates"
          >
              <IconDatabase size={16} />
              <span className="hidden sm:inline">Data Updates</span>
          </button>
      </div>
    </>
  );
};

