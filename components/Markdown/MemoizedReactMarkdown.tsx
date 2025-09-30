import { FC, memo } from 'react';
import ReactMarkdown, { Options } from 'react-markdown';

const MemoizedReactMarkdownComponent: FC<Options> = memo(
  (props) => <ReactMarkdown {...props} />,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

MemoizedReactMarkdownComponent.displayName = 'MemoizedReactMarkdown';
export const MemoizedReactMarkdown = MemoizedReactMarkdownComponent;
