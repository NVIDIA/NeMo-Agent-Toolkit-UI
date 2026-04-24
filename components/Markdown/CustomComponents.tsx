import { memo } from 'react';

import Chart from '@/components/Markdown/Chart';
import { CodeBlock } from '@/components/Markdown/CodeBlock';
import { CustomDetails } from '@/components/Markdown/CustomDetails';
import { CustomSummary } from '@/components/Markdown/CustomSummary';
import { Image } from '@/components/Markdown/Image';
import { Video } from '@/components/Markdown/Video';

import { isEqual } from 'lodash';

export const getReactMarkDownCustomComponents = (
  messageIndex = 0,
  _messageId = '',
) => {
  return {
    code: memo(
      function Code({
        node: _node,
        className,
        children,
        ...props
      }: {
        children: React.ReactNode;
        [key: string]: any;
      }) {
        const match = /language-(\w+)/.exec(className || '');
        const isInline = !match;
        if (isInline) {
          return (
            <code
              className="bg-gray-200 dark:bg-gray-800 text-[#76b900] px-1 py-0.5 rounded before:content-none after:content-none"
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <CodeBlock
            key={Math.random()}
            language={match[1] || ''}
            value={String(children).replace(/\n$/, '')}
            {...props}
          />
        );
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    chart: memo(
      function Chart_({ children }) {
        try {
          const payload = JSON.parse(children.replaceAll('\n', ''));
          return payload ? <Chart payload={payload} /> : null;
        } catch (error) {
          console.error(error);
          return null;
        }
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    table: memo(
      function Table({ children }) {
        return (
          <table className="border-collapse border border-black px-3 py-1 dark:border-white">
            {children}
          </table>
        );
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    th: memo(
      function Th({ children }) {
        return (
          <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
            {children}
          </th>
        );
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    td: memo(
      function Td({ children }) {
        return (
          <td className="break-words border border-black px-3 py-1 dark:border-white">
            {children}
          </td>
        );
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    a: memo(
      function A({ href, children, ...props }) {
        return (
          <a
            href={href}
            className="text-[#76b900] no-underline hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        );
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    ol: memo(
      function Ol({ children, ...props }) {
        return (
          <ol className="list-decimal" {...props}>
            {children}
          </ol>
        );
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    ul: memo(
      function Ul({ children, ...props }) {
        return (
          <ul className="list-disc" {...props}>
            {children}
          </ul>
        );
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    li: memo(
      function Li({ children, ...props }) {
        return (
          <li className="leading-[1.35rem]" {...props}>
            {children}
          </li>
        );
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    sup: memo(
      function Sup({ children, ...props }) {
        const validContent = Array.isArray(children)
          ? children
              .filter(
                (child) =>
                  typeof child === 'string' &&
                  child.trim() &&
                  child.trim() !== ',',
              )
              .join('')
          : typeof children === 'string' &&
            children.trim() &&
            children.trim() !== ','
          ? children
          : null;
        return validContent ? (
          <sup
            className="text-xs bg-gray-100 text-[#76b900] border border-[#e7ece0] px-1 py-0.5 rounded-md shadow-sm"
            style={{
              fontWeight: 'bold',
              marginLeft: '2px',
              transform: 'translateY(-3px)',
              fontSize: '0.7rem',
            }}
            {...props}
          >
            {validContent}
          </sup>
        ) : null;
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),

    p: memo(
      function P({
        children,
        ...props
      }: {
        children: React.ReactNode;
        [key: string]: any;
      }) {
        return <p {...props}>{children}</p>;
      },
      (prevProps, nextProps) => isEqual(prevProps.children, nextProps.children),
    ),
    img: memo(
      function Img(props) {
        return <Image {...props} />;
      },
      (prevProps, nextProps) => isEqual(prevProps, nextProps),
    ),
    video: memo(
      function Vid(props) {
        return <Video {...props} />;
      },
      (prevProps, nextProps) => isEqual(prevProps, nextProps),
    ),
    details: memo(
      function Details(props) {
        return <CustomDetails messageIndex={messageIndex} {...props} />;
      },
      (prevProps, nextProps) => isEqual(prevProps, nextProps),
    ),
    summary: memo(
      function Summary(props) {
        return <CustomSummary {...props} />;
      },
      (prevProps, nextProps) => isEqual(prevProps, nextProps),
    ),
  };
};
