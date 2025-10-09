'use client';

import { memo, useMemo, useRef } from 'react';
import { IconExclamationCircle } from '@tabler/icons-react';

import Loading from '@/components/Markdown/Loading';
import { isValidMediaURL } from '@/utils/media/validation';

// First, define the Video component at module level

export const Video = memo(
  ({ src, controls = true, muted = false, ...props }) => {
    // Use ref to maintain stable reference for video element
    const videoRef = useRef(null);

    // Memoize the video element to prevent re-renders from context changes
    const videoElement = useMemo(() => {
      if (src === 'loading') {
        return <Loading message="Loading..." type="image" />;
      }

      // Validate URL before rendering to prevent SSRF and privacy leaks
      if (!isValidMediaURL(src)) {
        return (
          <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg border border-red-200">
            <IconExclamationCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-600 text-sm">
              Invalid or potentially dangerous video URL blocked for security
            </p>
          </div>
        );
      }

      return (
        <video
          ref={videoRef}
          src={src}
          controls={controls}
          autoPlay={false}
          loop={false}
          muted={muted}
          playsInline={false}
          className="rounded-md border border-slate-400 shadow-sm object-cover"
          {...props}
        >
          Your browser does not support the video tag.
        </video>
      );
    }, [src, controls, muted]); // Only dependencies that should cause a re-render

    return videoElement;
  },
  (prevProps, nextProps) => {
    return prevProps.src === nextProps.src;
  },
);
