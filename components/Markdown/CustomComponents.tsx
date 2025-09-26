import { memo } from 'react';
import { isEqual } from 'lodash';

import Chart from '@/components/Markdown/Chart';
import { CodeBlock } from '@/components/Markdown/CodeBlock';
import { CustomDetails } from '@/components/Markdown/CustomDetails';
import { CustomSummary } from '@/components/Markdown/CustomSummary';
import { Image } from '@/components/Markdown/Image';
import { Video } from '@/components/Markdown/Video';

const CodeComponent = memo(
  ({
    _node,
    _inline,
    className,
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: any;
  }) => {
    // if (children?.length) {
    //   if (children[0] === '▍') {
    //     return <span className="animate-pulse cursor-default mt-1">▍</span>;
    //   }
    //   children[0] = children.length > 0 ? (children[0] as string)?.replace("`▍`", "▍") : '';
    // }

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
);
CodeComponent.displayName = 'CodeComponent';

const ChartComponent = memo(
  ({ children }) => {
    try {
      const payload = JSON.parse(children[0].replaceAll('\n', ''));
      return payload ? <Chart payload={payload} /> : null;
    } catch (error) {
      return null;
    }
  },
  (prevProps, nextProps) =>
    isEqual(prevProps.children, nextProps.children),
);
ChartComponent.displayName = 'ChartComponent';

const TableComponent = memo(
  ({ children }) => (
    <table className="border-collapse border border-black px-3 py-1 dark:border-white">
      {children}
    </table>
  ),
  (prevProps, nextProps) =>
    isEqual(prevProps.children, nextProps.children),
);
TableComponent.displayName = 'TableComponent';

const ThComponent = memo(
  ({ children }) => (
    <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
      {children}
    </th>
  ),
  (prevProps, nextProps) =>
    isEqual(prevProps.children, nextProps.children),
);
ThComponent.displayName = 'ThComponent';

const TdComponent = memo(
  ({ children }) => (
    <td className="break-words border border-black px-3 py-1 dark:border-white">
      {children}
    </td>
  ),
  (prevProps, nextProps) =>
    isEqual(prevProps.children, nextProps.children),
);
TdComponent.displayName = 'TdComponent';

const AComponent = memo(
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
);
AComponent.displayName = 'AComponent';

const LiComponent = memo(
  ({ children, ...props }) => (
    <li className="leading-[1.35rem] mb-1 list-disc" {...props}>
      {children}
    </li>
  ),
  (prevProps, nextProps) =>
    isEqual(prevProps.children, nextProps.children),
);
LiComponent.displayName = 'LiComponent';

const SupComponent = memo(
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
);
SupComponent.displayName = 'SupComponent';

const PComponent = memo(
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
);
PComponent.displayName = 'PComponent';

const ImgComponent = memo(
  (props) => <Image alt="" {...props} />,
  (prevProps, nextProps) => isEqual(prevProps, nextProps),
);
ImgComponent.displayName = 'ImgComponent';

const VideoComponent = memo(
  (props) => <Video {...props} />,
  (prevProps, nextProps) => isEqual(prevProps, nextProps),
);
VideoComponent.displayName = 'VideoComponent';

const DetailsComponent = memo(
  (props) => <CustomDetails messageIndex={props.messageIndex || 0} {...props} />,
  (prevProps, nextProps) => isEqual(prevProps, nextProps),
);
DetailsComponent.displayName = 'DetailsComponent';

const SummaryComponent = memo(
  (props) => <CustomSummary {...props} />,
  (prevProps, nextProps) => isEqual(prevProps, nextProps),
);
SummaryComponent.displayName = 'SummaryComponent';

export const getReactMarkDownCustomComponents = (
  messageIndex = 0,
  _messageId = '',
) => {
  return {
    code: CodeComponent,
    chart: ChartComponent,
    table: TableComponent,
    th: ThComponent,
    td: TdComponent,
    a: AComponent,
    li: LiComponent,
    sup: SupComponent,
    p: PComponent,
    img: ImgComponent,
    video: VideoComponent,
    details: (props) => <CustomDetails messageIndex={messageIndex} {...props} />,
    summary: SummaryComponent,
  };
};