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
  messageId = '',
) => {
  return {
      code: memo(
        ({
          node,
          inline,
          className,
          children,
          ...props
        }: {
          children: React.ReactNode;
          [key: string]: any;
        }) => {
          // Handle inline code (single backticks)
          if (inline) {
            return (
              <code
                className="bg-gray-200 dark:bg-gray-800 text-[#76b900] px-1 py-0.5 rounded before:content-none after:content-none"
                {...props}
              >
                {children}
              </code>
            );
          }

          // Handle code blocks (triple backticks)
          const match = /language-(\w+)/.exec(className || '');

          return (
            <CodeBlock
              key={Math.random()}
              language={(match && match.length > 1 && match[1]) || ''}
              value={String(children).replace(/\n$/, '')}
              {...props}
            />
          );
        },
        (prevProps, nextProps) => {
          return isEqual(prevProps.children, nextProps.children);
        },
      ),

      chart: memo(
        ({ children }) => {
          try {
            const payload = JSON.parse(children[0].replaceAll('\n', ''));
            return payload ? <Chart payload={payload} /> : null;
          } catch (error) {
            console.error(error);
            return null;
          }
        },
        (prevProps, nextProps) =>
          isEqual(prevProps.children, nextProps.children),
      ),

      table: memo(
        ({ children }) => (
          <table className="border-collapse border border-black px-3 py-1 dark:border-white">
            {children}
          </table>
        ),
        (prevProps, nextProps) =>
          isEqual(prevProps.children, nextProps.children),
      ),

      th: memo(
        ({ children }) => (
          <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
            {children}
          </th>
        ),
        (prevProps, nextProps) =>
          isEqual(prevProps.children, nextProps.children),
      ),

      td: memo(
        ({ children }) => (
          <td className="break-words border border-black px-3 py-1 dark:border-white">
            {children}
          </td>
        ),
        (prevProps, nextProps) =>
          isEqual(prevProps.children, nextProps.children),
      ),

      a: memo(
        ({ href, children, ...props }) => (
          <a
            href={href}
            className="text-[#76b900] no-underline hover:underline"
            {...props}
          >
            {children}
          </a>
        ),
        (prevProps, nextProps) =>
          isEqual(prevProps.children, nextProps.children),
      ),

      li: memo(
        ({ children, ...props }) => (
          <li className="leading-[1.35rem] mb-1 list-disc" {...props}>
            {children}
          </li>
        ),
        (prevProps, nextProps) =>
          isEqual(prevProps.children, nextProps.children),
      ),

      sup: memo(
        ({ children, ...props }) => {
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
        (prevProps, nextProps) =>
          isEqual(prevProps.children, nextProps.children),
      ),

      p: memo(
        ({
          children,
          ...props
        }: {
          children: React.ReactNode;
          [key: string]: any;
        }) => {
          return <p {...props}>{children}</p>;
        },
        (prevProps, nextProps) => {
          return isEqual(prevProps.children, nextProps.children);
        },
      ),
      img: memo(
        (props) => <Image {...props} />,
        (prevProps, nextProps) => isEqual(prevProps, nextProps),
      ),
      video: memo(
        (props) => <Video {...props} />,
        (prevProps, nextProps) => isEqual(prevProps, nextProps),
      ),
      details: memo(
        (props) => <CustomDetails messageIndex={messageIndex} {...props} />,
        (prevProps, nextProps) => isEqual(prevProps, nextProps),
      ),
      summary: memo(
        (props) => <CustomSummary {...props} />,
        (prevProps, nextProps) => isEqual(prevProps, nextProps),
      ),
  };
};
