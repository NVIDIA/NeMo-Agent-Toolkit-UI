import { FC, memo } from 'react';
import ReactMarkdown, { Options, defaultUrlTransform } from 'react-markdown';

type MemoizedOptions = Options & { className?: string };

/**
 * Custom URL transform that allows data: URIs for inline base64 images
 * while using the default transform for all other URLs
 */
const customUrlTransform = (url: string): string => {
  // Allow data: URIs (base64 encoded images) to pass through unchanged
  if (url.startsWith('data:')) {
    return url;
  }
  // Use default transform for all other URLs
  return defaultUrlTransform(url);
};

export const MemoizedReactMarkdown: FC<MemoizedOptions> = memo(
  ({ className, children, urlTransform = customUrlTransform, ...rest }) => (
    <div className={className}>
      <ReactMarkdown urlTransform={urlTransform} {...rest}>{children}</ReactMarkdown>
    </div>
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);
