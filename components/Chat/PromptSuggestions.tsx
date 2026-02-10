import {
  IconBulb,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  promptSuggestions: Record<string, string[]>;
  messageIsStreaming: boolean;
  onPromptSelect: (prompt: string) => void;
}

export const PromptSuggestions = ({
  promptSuggestions,
  messageIsStreaming,
  onPromptSelect,
}: Props) => {
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const promptGuideRef = useRef<HTMLButtonElement>(null);

  // Handle clicks outside prompt guide to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        promptGuideRef.current &&
        !promptGuideRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.prompt-guide-menu')
      ) {
        setShowPromptGuide(false);
        setSelectedCategory(null);
      }
    };

    if (showPromptGuide) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPromptGuide]);

  const handlePromptSelect = (prompt: string) => {
    onPromptSelect(prompt);
    setShowPromptGuide(false);
    setSelectedCategory(null);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  return (
    <>
      <button
        ref={promptGuideRef}
        onClick={() => {
          setShowPromptGuide(!showPromptGuide);
          if (showPromptGuide) {
            setSelectedCategory(null);
          }
        }}
        className={`absolute left-10 top-2 rounded-sm p-[5px] text-neutral-800 opacity-60 dark:bg-opacity-50 dark:text-neutral-100 ${
          messageIsStreaming
            ? 'text-neutral-400'
            : 'hover:text-[#76b900] dark:hover:text-neutral-200'
        }`}
        disabled={messageIsStreaming}
      >
        <IconBulb size={18} />
      </button>

      {showPromptGuide && (
        <div className="prompt-guide-menu absolute left-2 bottom-14 w-96 max-h-[500px] overflow-y-auto bg-white dark:bg-[#40414F] border border-neutral-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              {selectedCategory && (
                <button
                  onClick={handleBackToCategories}
                  className="flex items-center text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  <IconChevronLeft size={16} />
                  <span>Back</span>
                </button>
              )}
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                {selectedCategory || 'Prompt Suggestions'}
              </h3>
              <div className="w-12"></div>
            </div>

            {!selectedCategory ? (
              <div className="space-y-2">
                {Object.keys(promptSuggestions).map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    className="w-full flex items-center justify-between py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <span>{category}</span>
                    <IconChevronRight size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {promptSuggestions[selectedCategory]?.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptSelect(prompt)}
                    className="w-full text-left py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
