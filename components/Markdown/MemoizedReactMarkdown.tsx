import { FC, memo } from 'react';
import ReactMarkdown, { Options } from 'react-markdown';

type MemoizedOptions = Options & { className?: string };

export const MemoizedReactMarkdown: FC<MemoizedOptions> = memo(
  ({ className, children, ...rest }) => (
    <div className={className}>
      <ReactMarkdown {...rest}>{children}</ReactMarkdown>
    </div>
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);
