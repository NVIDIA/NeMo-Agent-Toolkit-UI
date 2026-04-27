/**
 * Tests for PromptSuggestions component
 *
 * Tests cover:
 * - Component rendering and visibility toggling
 * - Flat list of prompts (array format)
 * - Categorized prompts (object format with categories)
 * - Nested subcategories navigation
 * - Breadcrumb navigation and path management
 * - Click outside and Escape key to close functionality
 * - Disabled state during message streaming
 * - Prompt selection and callback handling
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { PromptSuggestions } from '@/components/Chat/PromptSuggestions';
import type { PromptSuggestionsData } from '@/components/Chat/PromptSuggestions';

describe('PromptSuggestions Component', () => {
  const mockOnPromptSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering and Visibility', () => {
    /**
     * Description: Verifies button rendering, menu toggle behavior, and disabled state during streaming
     * Success: Button toggles menu visibility, disabled when streaming
     */
    test('renders button and handles menu visibility', () => {
      const prompts: PromptSuggestionsData = ['Prompt 1'];

      const { rerender } = render(
        <PromptSuggestions
          promptSuggestions={prompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();

      // Menu not visible initially
      expect(screen.queryByText('Prompt Suggestions')).not.toBeInTheDocument();

      // Toggle open
      fireEvent.click(button);
      expect(screen.getByText('Prompt Suggestions')).toBeInTheDocument();

      // Toggle closed
      fireEvent.click(button);
      expect(screen.queryByText('Prompt Suggestions')).not.toBeInTheDocument();

      // Disabled when streaming
      rerender(
        <PromptSuggestions
          promptSuggestions={prompts}
          messageIsStreaming={true}
          onPromptSelect={mockOnPromptSelect}
        />,
      );
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Flat Prompt List - Array Format', () => {
    /**
     * Description: Verifies flat prompt rendering, selection callback, menu closure, and chevron absence
     * Success: All prompts displayed, callback invoked with correct value, menu closes after selection, no chevrons shown
     */
    test('renders and handles flat prompt selection', () => {
      const flatPrompts: PromptSuggestionsData = [
        'What is the weather today?',
        'Tell me a joke',
      ];

      render(
        <PromptSuggestions
          promptSuggestions={flatPrompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // All prompts visible
      expect(
        screen.getByText('What is the weather today?'),
      ).toBeInTheDocument();
      expect(screen.getByText('Tell me a joke')).toBeInTheDocument();

      // No chevrons for flat prompts
      const promptButton = screen
        .getByText('What is the weather today?')
        .closest('button');
      expect(promptButton).not.toBeNull();
      expect(promptButton!.querySelector('svg')).not.toBeInTheDocument();

      // Select prompt
      fireEvent.click(screen.getByText('Tell me a joke'));

      // Callback invoked correctly
      expect(mockOnPromptSelect).toHaveBeenCalledWith('Tell me a joke');
      expect(mockOnPromptSelect).toHaveBeenCalledTimes(1);

      // Menu closed after selection
      expect(screen.queryByText('Prompt Suggestions')).not.toBeInTheDocument();
    });

    /**
     * Description: Verifies flat array with mixed subcategories and direct prompts
     * Success: Both subcategories and direct prompts render correctly, navigation works for nested items
     */
    test('handles flat array with mixed subcategories and prompts', () => {
      const mixedFlatPrompts: PromptSuggestionsData = [
        { 'Category A': ['Nested prompt 1', 'Nested prompt 2'] },
        'Direct prompt in flat array',
        { 'Category B': ['Another nested'] },
      ];

      render(
        <PromptSuggestions
          promptSuggestions={mixedFlatPrompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Both subcategories and direct prompts visible at top level
      expect(screen.getByText('Category A')).toBeInTheDocument();
      expect(
        screen.getByText('Direct prompt in flat array'),
      ).toBeInTheDocument();
      expect(screen.getByText('Category B')).toBeInTheDocument();

      // Subcategory has chevron, direct prompt does not
      const categoryButton = screen.getByText('Category A').closest('button');
      expect(categoryButton).not.toBeNull();
      expect(categoryButton!.querySelector('svg')).toBeInTheDocument();

      const directButton = screen
        .getByText('Direct prompt in flat array')
        .closest('button');
      expect(directButton).not.toBeNull();
      expect(directButton!.querySelector('svg')).not.toBeInTheDocument();

      // Navigate into subcategory
      fireEvent.click(screen.getByText('Category A'));
      expect(screen.getByText('Nested prompt 1')).toBeInTheDocument();
      expect(screen.getByText('Nested prompt 2')).toBeInTheDocument();
    });
  });

  describe('Categorized Prompts - Object Format', () => {
    /**
     * Description: Verifies category rendering, navigation, and chevron display
     * Success: Categories shown at top level with chevrons, navigation into categories displays prompts
     */
    test('renders categories and handles navigation', () => {
      const categorizedPrompts: PromptSuggestionsData = {
        General: ['Hello', 'Goodbye'],
        Technical: ['Debug this', 'Optimize code'],
      };

      render(
        <PromptSuggestions
          promptSuggestions={categorizedPrompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Categories visible at top level
      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.queryByText('Hello')).not.toBeInTheDocument();

      // Categories have chevrons
      const categoryButton = screen.getByText('General').closest('button');
      expect(categoryButton).not.toBeNull();
      expect(categoryButton!.querySelector('svg')).toBeInTheDocument();

      // Navigate into category
      fireEvent.click(screen.getByText('General'));
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Goodbye')).toBeInTheDocument();
      expect(screen.queryByText('Debug this')).not.toBeInTheDocument();
    });
  });

  describe('Nested Subcategories Navigation', () => {
    /**
     * Description: Verifies multi-level nested navigation and mixed content handling
     * Success: Can navigate through nested levels, mixed prompts and subcategories render correctly with appropriate chevrons
     */
    test('navigates through nested subcategories', () => {
      const nestedPrompts: PromptSuggestionsData = {
        Programming: [
          'Direct prompt',
          { JavaScript: ['Async/await', 'Promises'] },
          { Python: ['List comprehension'] },
        ],
      };

      render(
        <PromptSuggestions
          promptSuggestions={nestedPrompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(screen.getByText('Programming'));

      // Mixed content: direct prompt and subcategories
      expect(screen.getByText('Direct prompt')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();

      // Direct prompt has no chevron, subcategories have chevrons
      const directPromptButton = screen
        .getByText('Direct prompt')
        .closest('button');
      expect(directPromptButton).not.toBeNull();
      expect(directPromptButton!.querySelector('svg')).not.toBeInTheDocument();

      const subcategoryButton = screen
        .getByText('JavaScript')
        .closest('button');
      expect(subcategoryButton).not.toBeNull();
      expect(subcategoryButton!.querySelector('svg')).toBeInTheDocument();

      // Navigate deeper
      fireEvent.click(screen.getByText('JavaScript'));
      expect(screen.getByText('Async/await')).toBeInTheDocument();
      expect(screen.getByText('Promises')).toBeInTheDocument();
      expect(screen.queryByText('List comprehension')).not.toBeInTheDocument();
    });
  });

  describe('Breadcrumb Navigation', () => {
    /**
     * Description: Verifies breadcrumb displays correct text at each navigation level
     * Success: Shows "Prompt Suggestions" at root, "All Categories" when in category, full path for nested levels
     */
    test('displays correct breadcrumb text at each level', () => {
      const nestedPrompts: PromptSuggestionsData = {
        A: [{ B: ['Prompt'] }],
        Other: ['Prompt'],
      };

      render(
        <PromptSuggestions
          promptSuggestions={nestedPrompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Top level
      expect(screen.getByText('Prompt Suggestions')).toBeInTheDocument();

      // Level 1
      fireEvent.click(screen.getByText('A'));
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();

      // Level 2
      fireEvent.click(screen.getByText('B'));
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      expect(screen.getAllByText('A')).toHaveLength(1);
      expect(screen.getAllByText('B')).toHaveLength(1);
    });

    /**
     * Description: Verifies clicking breadcrumb items navigates back to that level
     * Success: Navigation jumps to selected level, showing correct content
     */
    test('navigates back when clicking breadcrumb items', () => {
      const nestedPrompts: PromptSuggestionsData = {
        A: [{ B: [{ C: ['Deep prompt'] }] }],
        Other: ['Other prompt'],
      };

      render(
        <PromptSuggestions
          promptSuggestions={nestedPrompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Navigate deep
      fireEvent.click(screen.getByText('A'));
      fireEvent.click(screen.getByText('B'));
      fireEvent.click(screen.getByText('C'));
      expect(screen.getByText('Deep prompt')).toBeInTheDocument();

      // Click intermediate breadcrumb - find it within breadcrumb nav
      const breadcrumbNav = screen.getByRole('navigation', {
        name: 'Breadcrumb',
      });
      const allButtonsInNav = breadcrumbNav.querySelectorAll('button');
      const breadcrumbB = Array.from(allButtonsInNav).find(
        (btn) => btn.textContent === 'B',
      );

      expect(breadcrumbB).toBeDefined();
      fireEvent.click(breadcrumbB!);
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.queryByText('Deep prompt')).not.toBeInTheDocument();

      // Click "All Categories" to go back to root
      fireEvent.click(screen.getByText('All Categories'));
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
      expect(screen.queryByText('B')).not.toBeInTheDocument();
    });
  });

  describe('Click Outside to Close', () => {
    /**
     * Description: Verifies menu closes when clicking outside, stays open when clicking inside
     * Success: Outside clicks close menu, inside clicks keep it open
     */
    test('closes menu on outside click only', async () => {
      const prompts: PromptSuggestionsData = ['Prompt'];

      render(
        <div>
          <div data-testid="outside">Outside element</div>
          <PromptSuggestions
            promptSuggestions={prompts}
            messageIsStreaming={false}
            onPromptSelect={mockOnPromptSelect}
          />
        </div>,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(screen.getByText('Prompt Suggestions')).toBeInTheDocument();

      // Click inside menu - stays open
      const menu = screen.getByTestId('prompt-suggestions-menu');
      fireEvent.mouseDown(menu);
      expect(screen.getByText('Prompt Suggestions')).toBeInTheDocument();

      // Click outside - closes
      fireEvent.mouseDown(screen.getByTestId('outside'));
      await waitFor(() => {
        expect(
          screen.queryByText('Prompt Suggestions'),
        ).not.toBeInTheDocument();
      });
    });

    /**
     * Description: Verifies menu closes when Escape key is pressed
     * Success: Pressing Escape closes the menu and resets path
     */
    test('closes menu on Escape key', () => {
      const prompts: PromptSuggestionsData = {
        Category: ['Prompt'],
      };

      render(
        <PromptSuggestions
          promptSuggestions={prompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(screen.getByText('Prompt Suggestions')).toBeInTheDocument();

      // Navigate into a category
      fireEvent.click(screen.getByText('Category'));
      expect(screen.getByText('All Categories')).toBeInTheDocument();

      // Press Escape - should close menu and reset path
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText('Prompt Suggestions')).not.toBeInTheDocument();

      // Reopen - should be at root (path was reset)
      fireEvent.click(button);
      expect(screen.getByText('Prompt Suggestions')).toBeInTheDocument();
      expect(screen.queryByText('All Categories')).not.toBeInTheDocument();
    });
  });

  describe('Path Management and Edge Cases', () => {
    /**
     * Description: Verifies path resets on menu close and after prompt selection
     * Success: Path resets when closing menu or selecting a prompt, empty categories handled gracefully
     */
    test('resets path on close and prompt selection', () => {
      const prompts: PromptSuggestionsData = {
        Category: ['Prompt 1', 'Prompt 2'],
        EmptyCategory: [],
      };

      render(
        <PromptSuggestions
          promptSuggestions={prompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');

      // Navigate and close via toggle - path should reset
      fireEvent.click(button);
      fireEvent.click(screen.getByText('Category'));
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      fireEvent.click(button); // Close via toggle
      fireEvent.click(button); // Reopen
      expect(screen.getByText('Prompt Suggestions')).toBeInTheDocument();
      expect(screen.queryByText('All Categories')).not.toBeInTheDocument();

      // Navigate again and select prompt - path should reset
      fireEvent.click(screen.getByText('Category'));
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Prompt 1'));

      // Menu should close and callback should be invoked
      expect(screen.queryByText('Prompt Suggestions')).not.toBeInTheDocument();
      expect(mockOnPromptSelect).toHaveBeenCalledWith('Prompt 1');

      // Reopen - should be at root, not in Category
      fireEvent.click(button);
      expect(screen.getByText('Prompt Suggestions')).toBeInTheDocument();
      expect(screen.queryByText('All Categories')).not.toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();

      // Navigate to empty category - should render gracefully
      fireEvent.click(screen.getByText('EmptyCategory'));
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      expect(screen.getByText('EmptyCategory')).toBeInTheDocument();

      // Verify no prompt or category buttons are displayed (only breadcrumb navigation buttons exist)
      const menu = screen.getByTestId('prompt-suggestions-menu');
      expect(menu).toBeInTheDocument();

      // Get all buttons and filter out breadcrumb buttons
      const allButtons = screen.getAllByRole('button');
      const breadcrumbNav = screen.getByRole('navigation', {
        name: 'Breadcrumb',
      });
      const menuButtons = allButtons.filter(
        (btn) => !breadcrumbNav.contains(btn) && menu.contains(btn),
      );
      expect(menuButtons.length).toBe(0);
    });
  });

  describe('Styling and Accessibility', () => {
    /**
     * Description: Verifies correct styling and accessibility features
     * Success: Font styles distinguish categories from prompts, hover states work, ARIA labels present
     */
    test('applies correct styling and accessibility', () => {
      const prompts: PromptSuggestionsData = {
        Category: ['Prompt'],
      };

      render(
        <PromptSuggestions
          promptSuggestions={prompts}
          messageIsStreaming={false}
          onPromptSelect={mockOnPromptSelect}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Categories have font-medium
      const categoryText = screen.getByText('Category');
      expect(categoryText).toHaveClass('font-medium');

      // Navigate to see prompts
      fireEvent.click(categoryText);

      // Prompts have font-light
      const promptText = screen.getByText('Prompt');
      expect(promptText).toHaveClass('font-light');

      // Hover classes present
      const promptButton = promptText.closest('button');
      expect(promptButton).toHaveClass('hover:bg-neutral-100');
      expect(promptButton).toHaveClass('dark:hover:bg-gray-700');

      // ARIA label for breadcrumb
      const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(breadcrumb).toBeInTheDocument();
    });
  });
});
