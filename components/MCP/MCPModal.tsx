import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { IconX, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { fetchMCPClients, MCPClient } from '@/utils/api/mcpClient';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const MCPModal: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('sidebar');
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const [mcpClients, setMcpClients] = useState<MCPClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchMCPClients();
      setMcpClients(response.mcp_clients ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mcp.fetchError', 'Failed to fetch MCP clients'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Open/close side-effects
  useEffect(() => {
    if (!open) return;

    // Save & move focus
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // Lock scroll
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Outside click & ESC handling with abortable listeners
    const ac = new AbortController();
    const { signal } = ac;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside, { signal });
    window.addEventListener('keydown', handleKeyDown, { signal });

    // Focus the dialog
    requestAnimationFrame(() => {
      modalRef.current?.focus();
    });

    // Fetch
    fetchData();

    return () => {
      ac.abort();
      document.body.style.overflow = overflow;
      // restore focus
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose, fetchData]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 dark:bg-opacity-20"
      aria-hidden={false}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-modal-title"
        tabIndex={-1}
        className="w-full max-w-2xl bg-white dark:bg-[#202123] rounded-2xl shadow-lg p-6 transform transition-all relative max-h-[80vh] overflow-hidden flex flex-col outline-none"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="mcp-modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('mcp.title', 'MCP')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring"
            aria-label={t('close', 'Close')}
          >
            <IconX size={24} />
          </button>
        </div>

        {/* Live region for async status */}
        <div className="sr-only" aria-live="polite">
          {loading ? t('loading', 'Loading…') : error ? t('mcp.fetchError', 'Failed to fetch MCP clients') : ''}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#76b900]" />
            </div>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-400 text-sm">
                {t('mcp.errorPrefix', 'Error')}: {error}
              </p>
              <button
                type="button"
                onClick={fetchData}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                {t('retry', 'Retry')}
              </button>
            </div>
          )}

          {!loading && !error && mcpClients.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('mcp.noneFound', 'No MCP clients found')}
            </div>
          )}

          {!loading && !error && mcpClients.map((client) => {
            const groupKey = client.function_group;
            const expanded = expandedGroups.has(groupKey);
            const tools = client.tools ?? [];

            return (
              <div key={groupKey} className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg"
                  aria-expanded={expanded}
                  aria-controls={`mcp-group-${groupKey}`}
                >
                  <div className="flex items-center space-x-3">
                    {expanded ? (
                      <IconChevronDown size={16} className="text-gray-500" />
                    ) : (
                      <IconChevronRight size={16} className="text-gray-500" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {groupKey}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {client.server}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {client.protected === true && (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        🔒 {t('mcp.protected', 'Protected')}
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        client.session_healthy
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {client.session_healthy ? t('healthy', 'Healthy') : t('unhealthy', 'Unhealthy')}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {client.available_tools}/{client.total_tools} {t('mcp.tools', 'tools')}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div
                    id={`mcp-group-${groupKey}`}
                    className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50"
                  >
                    {tools.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('mcp.noTools', 'No tools available')}</p>
                    ) : (
                      tools.map((tool) => (
                        <div key={tool.name} className="mb-3 last:mb-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                {tool.name}
                              </h4>
                              {tool.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                  {tool.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                tool.available
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}
                            >
                              {tool.available ? t('available', 'Available') : t('unavailable', 'Unavailable')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
