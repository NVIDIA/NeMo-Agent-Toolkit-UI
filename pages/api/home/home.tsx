'use client';

import { useEffect, useRef } from 'react';

import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

import { useCreateReducer } from '@/hooks/useCreateReducer';
import { DataStreamManager } from '@/components/DataStreamDisplay/DataStreamManager';
import { ChatHeader } from '@/components/Chat/ChatHeader';
import { useTheme } from '@/contexts/ThemeContext';

import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { getWorkflowName } from '@/utils/app/helper';
import { getSettings } from '@/utils/app/settings';

import { APPLICATION_NAME } from '@/constants';

import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderInterface, FolderType } from '@/types/folder';

import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';

import HomeContext from './home.context';
import { HomeInitialState, initialState } from './home.state';

import { v4 as uuidv4 } from 'uuid';

const webSocketMode = initialState.webSocketMode;

const Home = (props: any) => {
  const { t } = useTranslation('chat');

  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const workflow = getWorkflowName();

  const {
    state: { folders, conversations, selectedConversation, enableStreamingRagVizOptions },
    dispatch,
  } = contextValue;

  const { lightMode, setLightMode } = useTheme();

  const stopConversationRef = useRef<boolean>(false);

  const webSocketModeRef = useRef(
    typeof window !== 'undefined'
      ? (() => {
          const stored = sessionStorage.getItem('webSocketMode');
          return stored !== null ? stored === 'true' : webSocketMode;
        })()
      : webSocketMode
  );

  const handleSelectConversation = (conversation: Conversation) => {
    // Clear any streaming states before switching conversations
    dispatch({ field: 'messageIsStreaming', value: false });
    dispatch({ field: 'loading', value: false });

    dispatch({
      field: 'selectedConversation',
      value: conversation,
    });

    saveConversation(conversation);
  };

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: FolderInterface = {
      id: uuidv4(),
      name,
      type,
    };

    const updatedFolders = [...folders, newFolder];

    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: null,
        };
      }

      return c;
    });

    dispatch({ field: 'conversations', value: updatedConversations });
    saveConversations(updatedConversations);
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    dispatch({ field: 'folders', value: updatedFolders });

    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = () => {
    // Check if current conversation is a homepage conversation with no messages
    if (selectedConversation?.isHomepageConversation && selectedConversation.messages.length === 0) {
      // Just remove the homepage flag to make it visible in sidebar, don't create a new conversation
      const updatedConversation = {
        ...selectedConversation,
        isHomepageConversation: undefined,
      };

      const updatedConversations = conversations.map(c =>
        c.id === selectedConversation.id ? updatedConversation : c
      );

      dispatch({ field: 'selectedConversation', value: updatedConversation });
      dispatch({ field: 'conversations', value: updatedConversations });

      saveConversation(updatedConversation);
      saveConversations(updatedConversations);

      return;
    }

    const lastConversation = conversations[conversations.length - 1];

    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation'),
      messages: [],
      folderId: null,
    };

    const updatedConversations = [...conversations, newConversation];

    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'conversations', value: updatedConversations });

    saveConversation(newConversation);
    saveConversations(updatedConversations);

    dispatch({ field: 'loading', value: false });
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    dispatch({ field: 'selectedConversation', value: single });
    dispatch({ field: 'conversations', value: all });
  };

  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }
  }, [selectedConversation, dispatch]);

  useEffect(() => {
    const settings = getSettings();
    if (settings.theme) {
      setLightMode(settings.theme);
    }

    const showChatbar = sessionStorage.getItem('showChatbar');
    if (showChatbar) {
      dispatch({ field: 'showChatbar', value: showChatbar === 'true' });
    }

    const enableIntermediateSteps = sessionStorage.getItem('enableIntermediateSteps');
    if (enableIntermediateSteps !== null) {
      dispatch({ field: 'enableIntermediateSteps', value: enableIntermediateSteps === 'true' });
    }

    const expandIntermediateSteps = sessionStorage.getItem('expandIntermediateSteps');
    if (expandIntermediateSteps !== null) {
      dispatch({ field: 'expandIntermediateSteps', value: expandIntermediateSteps === 'true' });
    }

    const intermediateStepOverride = sessionStorage.getItem('intermediateStepOverride');
    if (intermediateStepOverride !== null) {
      dispatch({ field: 'intermediateStepOverride', value: intermediateStepOverride === 'true' });
    }

    const folders = sessionStorage.getItem('folders');
    if (folders) {
      dispatch({ field: 'folders', value: JSON.parse(folders) });
    }

    const conversationHistory = sessionStorage.getItem('conversationHistory');
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] =
        JSON.parse(conversationHistory);
      const cleanedConversationHistory = cleanConversationHistory(
        parsedConversationHistory,
      );

      dispatch({ field: 'conversations', value: cleanedConversationHistory });
    }

    const selectedConversation = sessionStorage.getItem('selectedConversation');
    if (selectedConversation) {
      const parsedSelectedConversation: Conversation =
        JSON.parse(selectedConversation);
      const cleanedSelectedConversation = cleanSelectedConversation(
        parsedSelectedConversation,
      );

      dispatch({
        field: 'selectedConversation',
        value: cleanedSelectedConversation,
      });
    } else {
      // Create homepage conversation like sidebar does, but mark it as homepage conversation
      const homepageConversation: Conversation = {
        id: uuidv4(),
        name: t('New Conversation'),
        messages: [],
        folderId: null,
        isHomepageConversation: true, // Flag to track it's a homepage conversation
      };

      const updatedConversations = [...conversations, homepageConversation];

      dispatch({ field: 'selectedConversation', value: homepageConversation });
      dispatch({ field: 'conversations', value: updatedConversations });

      saveConversation(homepageConversation);
      saveConversations(updatedConversations);
    }
  }, [dispatch, t, setLightMode]);

  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        handleNewConversation,
        handleCreateFolder,
        handleDeleteFolder,
        handleUpdateFolder,
        handleSelectConversation,
        handleUpdateConversation,
      }}
    >
      <Head>
        <title>{workflow}</title>
        <meta name="description" content={workflow} />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/nvidia.jpg" />
      </Head>
      {selectedConversation && (
        <div
          className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}
        >
          <div className="fixed top-0 w-full sm:hidden">
            <Navbar
              selectedConversation={selectedConversation}
              onNewConversation={handleNewConversation}
            />
          </div>

          <div className="flex h-full w-full sm:pt-0">
            <Chatbar />

            <main className="flex flex-col w-full min-w-0 max-w-full overflow-x-hidden pt-0 relative border-l md:pt-0 dark:border-white/20 transition-width">
              <div className="flex flex-1 flex-col min-h-screen min-w-0 max-w-full dark:bg-black">
                <ChatHeader webSocketModeRef={webSocketModeRef} />
                {enableStreamingRagVizOptions && (
                  <DataStreamManager
                    selectedConversation={selectedConversation}
                    dispatch={dispatch}
                  />
                )}
                <Chat />
              </div>
            </main>
          </div>
        </div>
      )}
    </HomeContext.Provider>
  );
};
export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const defaultModelId = process.env.NAT_DEFAULT_MODEL || '';

  return {
    props: {
      defaultModelId,
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'chat',
        'sidebar',
        'markdown',
        'promptbar',
        'settings',
      ])),
    },
  };
};
