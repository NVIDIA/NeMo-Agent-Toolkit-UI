import { IconVideo, IconTrash, IconSearch } from '@tabler/icons-react';
import { FC, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

import { VideoUpload } from './VideoUpload';

import { VideoUploadResponse, VideoItem, listVideos, deleteVideo } from '@/utils/api/videoUpload';

interface Props {
  onSelectVideo?: (_videoKey: string) => void;
}

export const VideoLibrary: FC<Props> = ({ onSelectVideo }) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const videos = await listVideos();
      setVideos(videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleUploadSuccess = (_response: VideoUploadResponse) => {
    // Refresh video list to show the new upload
    fetchVideos();
  };

  const handleDeleteVideo = async (videoKey: string) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await deleteVideo(videoKey);
      
      // Refresh video list to reflect deletion
      fetchVideos();
      toast.success('Video deleted successfully');
    } catch (error) {
      console.error('Error deleting video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete video';
      toast.error(errorMessage);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredVideos = videos.filter(video =>
    video.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.video_key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
        <IconVideo size={24} className="text-[#76b900]" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {'Video Library'}
        </h2>
      </div>

      {/* Upload Section*/}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <VideoUpload onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <IconSearch
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder={'Search videos...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#76b900]"
          />
        </div>
      </div>

      {/* Video List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {'Loading videos...'}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {searchTerm
              ? 'No videos found'
              : 'No videos uploaded yet'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
              <div
                key={video.video_key}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {video.filename || video.video_key.split('/').pop()}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatFileSize(video.size)} • {video.content_type}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteVideo(video.video_key)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Delete video"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
                {onSelectVideo && (
                  <button
                    onClick={() => onSelectVideo(video.video_key)}
                    className="w-full mt-2 px-3 py-1.5 text-sm bg-[#76b900] text-white rounded hover:bg-[#5a9100] transition-colors"
                  >
                    {'Select'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

