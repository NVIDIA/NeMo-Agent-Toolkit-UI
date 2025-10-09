'use client';

/* This file is typically used for context-aware RAG integrations, see DATA_STREAMING.md */

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

