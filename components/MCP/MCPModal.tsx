import { FC, useEffect, useRef, useState } from 'react';
import { IconX, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';

import { fetchMCPClients, MCPClient, MCPTool } from '@/utils/api/mcpClient';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const MCPModal: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('sidebar');
  const modalRef = useRef<HTMLDivElement>(null);
  const [mcpClients, setMcpClients] = useState<MCPClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      window.addEventListener('mousedown', handleClickOutside);
      fetchData();
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchMCPClients();
      setMcpClients(response.mcp_clients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MCP clients');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 dark:bg-opacity-20">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-[#202123] rounded-2xl shadow-lg p-6 transform transition-all relative max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            MCP
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <IconX size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#76b900]"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-400 text-sm">
                Error: {error}
              </p>
              <button
                onClick={fetchData}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && mcpClients.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No MCP clients found
            </div>
          )}

          {!loading && !error && mcpClients.map((client) => (
            <div key={client.function_group} className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => toggleGroup(client.function_group)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg"
              >
                <div className="flex items-center space-x-3">
                  {expandedGroups.has(client.function_group) ? (
                    <IconChevronDown size={16} className="text-gray-500" />
                  ) : (
                    <IconChevronRight size={16} className="text-gray-500" />
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {client.function_group}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {client.transport} • {client.server}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    client.session_healthy
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {client.session_healthy ? 'Healthy' : 'Unhealthy'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {client.available_tools}/{client.total_tools} tools
                  </span>
                </div>
              </button>

              {expandedGroups.has(client.function_group) && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                  {client.tools.map((tool) => (
                    <div key={tool.name} className="mb-3 last:mb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {tool.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {tool.description}
                          </p>
                        </div>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          tool.available
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {tool.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
