import { FC, memo } from 'react';

import { ChatMessage, Props } from './ChatMessage';

import isEqual from 'lodash/isEqual';

export const MemoizedChatMessage: FC<Props> = memo(
  ChatMessage,
  (prevProps, nextProps) => {
    // Component should NOT re-render if all props are the same
    const messageEqual = isEqual(prevProps.message, nextProps.message);
    const messageIndexEqual = prevProps.messageIndex === nextProps.messageIndex;
    const onEditEqual = prevProps.onEdit === nextProps.onEdit;

    // Return true if all props are equal (don't re-render)
    return messageEqual && messageIndexEqual && onEditEqual;
  },
);
