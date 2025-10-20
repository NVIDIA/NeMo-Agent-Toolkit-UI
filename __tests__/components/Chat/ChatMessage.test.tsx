import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatMessage } from '@/components/Chat/ChatMessage';
import HomeContext from '@/pages/api/home/home.context';
import { Message } from '@/types/chat';

// Mock the HtmlFileRenderer to check if it's being rendered
jest.mock('@/components/Chat/HtmlFileRenderer', () => ({
  HtmlFileRenderer: jest.fn(() => <div data-testid="html-file-renderer" />),
}));

// Mock the Avatar component
jest.mock('@/components/Avatar/BotAvatar', () => ({
    BotAvatar: jest.fn(() => <div data-testid="bot-avatar" />),
}));

describe('ChatMessage', () => {
  const mockHomeContextValue = {
    state: {
      selectedConversation: {
        messages: [],
      },
      conversations: [],
      messageIsStreaming: false,
    },
    dispatch: jest.fn(),
  };

  const renderWithMessage = (message: Message) => {
    return render(
      <HomeContext.Provider value={mockHomeContextValue as any}>
        <ChatMessage message={message} messageIndex={0} />
      </HomeContext.Provider>
    );
  };

  it('should render HtmlFileRenderer for an assistant message with an HTML file link', () => {
    const message: Message = {
      id: "1",
      role: 'assistant',
      content: 'Here is your plot: <a href="file:///path/to/plot.html">Plot</a>',
    };
    renderWithMessage(message);

    expect(screen.getByTestId('html-file-renderer')).toBeInTheDocument();
  });

  it('should remove the HTML file link from the displayed message content', () => {
    const message: Message = {
        id: "1",
        role: 'assistant',
        content: 'Here is your plot: <a href="file:///path/to/plot.html">Plot</a>',
    };
    renderWithMessage(message);

    // Verify the link is removed but surrounding text is preserved
    expect(screen.getByText(/Here is your plot/i)).toBeInTheDocument();
    // The HtmlFileRenderer should be shown instead of the raw link
    expect(screen.getByTestId('html-file-renderer')).toBeInTheDocument();
  });

  it('should not render HtmlFileRenderer for a user message, even with a link', () => {
    const message: Message = {
        id: "1",
        role: 'user',
        content: 'Can you show me a plot from <a href="file:///path/to/plot.html">Plot</a>?',
    };
    renderWithMessage(message);

    expect(screen.queryByTestId('html-file-renderer')).not.toBeInTheDocument();
    // Check that the content is rendered as is for the user message
    expect(screen.getByText(/Can you show me a plot from/)).toBeInTheDocument();
  });

  it('should not render HtmlFileRenderer for an assistant message without a link', () => {
    const message: Message = {
      id: "1",
      role: 'assistant',
      content: 'Hello! How can I help you today?',
    };
    renderWithMessage(message);

    expect(screen.queryByTestId('html-file-renderer')).not.toBeInTheDocument();
    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
  });

  it('should render HtmlFileRenderer for inline HTML content', () => {
    const message: Message = {
        id: "1",
        role: 'assistant',
        content: 'Here is an inline plot: <html><body><h1>My Plot</h1></body></html>',
    };
    renderWithMessage(message);

    expect(screen.getByTestId('html-file-renderer')).toBeInTheDocument();
    expect(screen.getByText(/Here is an inline plot/i)).toBeInTheDocument();
  });

  it('should handle multiple HTML files in one message', () => {
    const message: Message = {
      id: "1",
      role: 'assistant',
      content: 'First: <a href="file:///plot1.html">Plot 1</a> and second: [Plot 2](file:///plot2.html)',
    };
    renderWithMessage(message);

    // Should render multiple HtmlFileRenderer components (mocked)
    const renderers = screen.getAllByTestId('html-file-renderer');
    expect(renderers.length).toBeGreaterThanOrEqual(2);
  });
});
