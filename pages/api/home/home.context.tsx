import { Dispatch, createContext } from 'react';

import { ActionType } from '@/hooks/useCreateReducer';
import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderType } from '@/types/folder';

import { HomeInitialState } from './home.state';

export interface HomeContextProps {
  state: HomeInitialState;
  dispatch: Dispatch<ActionType<HomeInitialState>>;
  handleNewConversation: () => void;
  handleCreateFolder: (_name: string, _type: FolderType) => void;
  handleDeleteFolder: (_folderId: string) => void;
  handleUpdateFolder: (_folderId: string, _name: string) => void;
  handleSelectConversation: (_conversation: Conversation) => void;
  handleUpdateConversation: (
    _conversation: Conversation,
    _data: KeyValuePair,
  ) => void;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export default HomeContext;
