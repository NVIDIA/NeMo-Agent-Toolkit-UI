import { IconVideo, IconUpload, IconX, IconCheck } from '@tabler/icons-react';
import { FC, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'next-i18next';

import { uploadVideo, VideoUploadResponse } from '@/utils/api/videoUpload';

interface Props {
  onUploadSuccess?: (_response: VideoUploadResponse) => void;
}

export const VideoUpload: FC<Props> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<string>('');
  const [uploadedVideo, setUploadedVideo] = useState<VideoUploadResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    if (!file.type || !file.type.startsWith('video/')) {
      toast.error('File must be a video. Please select a video file.');
      return false;
    }

    const maxSize = 8 * 1024 * 1024 * 1024; // 8GB
    if (file.size > maxSize) {
      toast.error(`File size exceeds ${formatFileSize(maxSize)} (2-hour limit). Please select a smaller file.`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      setUploadedVideo(null);
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a video file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadVideo(selectedFile, metadata || undefined);

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Auto-clear form after successful upload
      setSelectedFile(null);
      setUploadedVideo(null);
      setMetadata('');
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Video uploaded successfully!', { duration: 4000 });
      
      if (onUploadSuccess) {
        onUploadSuccess(response);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload video. Please try again.',
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedVideo(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? 'border-[#76b900] bg-green-50 dark:bg-green-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <IconUpload
            size={48}
            className={`mb-4 ${isDragging ? 'text-[#76b900]' : 'text-gray-400 dark:text-gray-500'}`}
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {'Drag and drop a video file here, or click to select'}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#76b900] text-white rounded-md hover:bg-[#5a9100] focus:outline-none focus:ring-2 focus:ring-[#76b900] focus:ring-offset-2 transition-colors"
            disabled={isUploading}
          >
            {'Select Video File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconVideo size={20} className="text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={handleRemoveFile}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove file"
              >
                <IconX size={18} />
              </button>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-[#76b900] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadedVideo && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <IconCheck size={18} />
              <span>Upload successful!</span>
            </div>
          )}
        </div>
      )}

      {/* Metadata Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {'Metadata (Optional)'}
        </label>
        <textarea
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          placeholder={'Enter optional metadata for the video...'}
          className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#76b900] resize-none"
          rows={3}
          disabled={isUploading || !selectedFile}
        />
      </div>

      {/* Upload Button */}
      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
            isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-[#76b900] hover:bg-[#5a9100] text-white'
          } focus:outline-none focus:ring-2 focus:ring-[#76b900] focus:ring-offset-2`}
        >
          {isUploading
            ? 'Uploading...'
            : 'Upload Video'}
        </button>
      )}
    </div>
  );
};

