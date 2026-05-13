import toast from 'react-hot-toast';

import { Conversation } from '@/types/chat';

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const saveConversation = (conversation: Conversation) => {
  try {
    sessionStorage.setItem(
      'selectedConversation',
      JSON.stringify(conversation),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.log('Storage quota exceeded, cannot save conversation.');
      toast.error('Storage quota exceeded, cannot save conversation.');
    }
  }
};

export const saveConversations = (conversations: Conversation[]) => {
  try {
    sessionStorage.setItem(
      'conversationHistory',
      JSON.stringify(conversations),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.log('Storage quota exceeded, cannot save conversations.');
      toast.error('Storage quota exceeded, cannot save conversation.');
    }
  }
};
