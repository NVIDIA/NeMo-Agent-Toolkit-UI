import { IconBulb, IconChevronRight } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

/** A prompt string or a nested category: { [categoryName]: PromptItem[] } */
type PromptItem = string | Record<string, PromptItem[]>;
export type PromptSuggestionsData = Record<string, PromptItem[]> | PromptItem[];

// Returns the list of items (prompts and/or subcategories) at the given path.
function getItemsAtPath(data: PromptSuggestionsData, path: string[]): PromptItem[] {
  if (path.length === 0) return Array.isArray(data) ? data : [];

  const [first, ...rest] = path;

  if (!Array.isArray(data)) {
    const items = data[first];
    if (!items) return [];
    return rest.length === 0 ? items : getItemsAtPath(items, rest);
  }

  // Find the subcategory object in the array whose key matches the next segment
  const obj = data.find(
    (item): item is Record<string, PromptItem[]> =>
      typeof item === 'object' && item !== null && !Array.isArray(item) && first in item
  );
  if (!obj) return [];
  const next = obj[first];
  if (!Array.isArray(next)) return [];
  return rest.length === 0 ? next : getItemsAtPath(next, rest);
}

interface MenuItemProps {
  label: string;
  onClick: () => void;
  hasChevron?: boolean;
}

const MenuItem = ({ label, onClick, hasChevron = false }: MenuItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex text-left justify-between py-2 space-x-5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-gray-700 rounded transition-colors"
  >
    <span className={hasChevron ? 'font-medium' : 'font-light'}>{label}</span>
    {hasChevron && <IconChevronRight size={16} />}
  </button>
);

interface Props {
  promptSuggestions: PromptSuggestionsData;
  messageIsStreaming: boolean;
  onPromptSelect: (prompt: string) => void;
}

export const PromptSuggestions = ({
  promptSuggestions,
  messageIsStreaming,
  onPromptSelect,
}: Props) => {
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  /** Breadcrumb path: [] = top level, [cat] = in category, [cat, subcat] = in subcategory, etc. */
  const [path, setPath] = useState<string[]>([]);
  const promptGuideRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => {
    setShowPromptGuide(false);
    setPath([]);
  };

  useEffect(() => {
    if (!showPromptGuide) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        promptGuideRef.current &&
        !promptGuideRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.prompt-guide-menu')
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPromptGuide]);

  const handlePromptSelect = (prompt: string) => {
    onPromptSelect(prompt);
    closeMenu();
  };

  const isCategorized = !Array.isArray(promptSuggestions);
  const showCategories = path.length === 0 && isCategorized;

  return (
    <>
      <button
        ref={promptGuideRef}
        onClick={() => (showPromptGuide ? closeMenu() : setShowPromptGuide(true))}
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
        <div className="prompt-guide-menu absolute bottom-12 w-max max-w-xl max-h-[500px] overflow-y-auto bg-white dark:bg-[#40414F] border border-neutral-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <nav className="flex items-center gap-1.5 mb-3 text-sm whitespace-nowrap" aria-label="Breadcrumb">
              <button
                onClick={() => setPath([])}
                className={`font-bold ${
                  path.length > 0
                    ? 'text-[#76b900] hover:text-[#5a8f00] dark:hover:text-[#8fcf00]'
                    : 'text-neutral-800 dark:text-neutral-100 cursor-default'
                }`}
              >
                {path.length > 0 ? 'All Categories' : 'Prompt Suggestions'}
              </button>
              {path.map((segment, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="text-neutral-400 dark:text-neutral-500" aria-hidden>/</span>
                  {i < path.length - 1 ? (
                    <button
                      onClick={() => setPath(path.slice(0, i + 1))}
                      className="font-semibold text-[#76b900] hover:text-[#5a8f00] dark:hover:text-[#8fcf00]"
                    >
                      {segment}
                    </button>
                  ) : (
                    <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                      {segment}
                    </span>
                  )}
                </span>
              ))}
            </nav>

            <div className="space-y-2">
              {showCategories ? (
                Object.keys(promptSuggestions).map((category) => (
                  <MenuItem
                    key={category}
                    label={category}
                    onClick={() => setPath([category])}
                    hasChevron
                  />
                ))
              ) : (
                getItemsAtPath(promptSuggestions, path).map((item, index) =>
                  typeof item === 'string' ? (
                    <MenuItem
                      key={`${index}-${item.slice(0, 20)}`}
                      label={item}
                      onClick={() => handlePromptSelect(item)}
                    />
                  ) : (
                    Object.keys(item).map((subName) => (
                      <MenuItem
                        key={subName}
                        label={subName}
                        onClick={() => setPath([...path, subName])}
                        hasChevron
                      />
                    ))
                  )
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
