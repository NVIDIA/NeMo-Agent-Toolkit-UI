import { FC } from 'react';
import { IconX } from '@tabler/icons-react';

import { VideoLibrary } from './VideoLibrary';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectVideo?: (_videoKey: string) => void;
}

export const VideoLibraryModal: FC<Props> = ({ open, onClose, onSelectVideo }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 dark:bg-opacity-20">
      <div className="w-full max-w-6xl h-[90vh] bg-white dark:bg-[#202123] rounded-2xl shadow-lg flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors z-10"
          aria-label="Close"
        >
          <IconX size={24} />
        </button>
        <VideoLibrary onSelectVideo={onSelectVideo} />
      </div>
    </div>
  );
};

