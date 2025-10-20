import { FC, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'next-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import HomeContext from '@/pages/api/home/home.context';
import {
  DEFAULT_CORE_ROUTE,
  CHAT_STREAM,
  CHAT,
  GENERATE_STREAM,
  GENERATE,
  CA_RAG_INIT,
  CHAT_CA_RAG,
} from '@/constants';

// WebSocket schema display names to match HTTP endpoint naming
const WEBSOCKET_SCHEMA_LABELS: Record<string, string> = {
  'chat_stream': 'Chat Completions — Streaming',
  'chat': 'Chat Completions — Non-Streaming',
  'generate_stream': 'Generate — Streaming',
  'generate': 'Generate — Non-Streaming',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SettingDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('settings');
  const modalRef = useRef<HTMLDivElement>(null);
  const { lightMode: themeLightMode, setLightMode } = useTheme();
  const {
    state: {
      httpEndpoint,
      httpEndpoints,
      optionalGenerationParameters,
      webSocketSchema: schema,
      expandIntermediateSteps,
      intermediateStepOverride,
      enableIntermediateSteps,
      enableStreamingRagVizOptions,
      webSocketSchemas,
    },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [theme, setTheme] = useState<'light' | 'dark'>(themeLightMode);
  const [selectedHttpEndpoint, setSelectedHttpEndpoint] = useState(
    sessionStorage.getItem('httpEndpoint') || httpEndpoint || DEFAULT_CORE_ROUTE,
  );
  const [jsonBodyInput, setJsonBodyInput] = useState(
    sessionStorage.getItem('optionalGenerationParameters') || optionalGenerationParameters || '',
  );
  const [jsonValidationError, setJsonValidationError] = useState<string>('');
  const [webSocketSchema, setWebSocketSchema] = useState(
    sessionStorage.getItem('webSocketSchema') || schema || 'chat_stream',
  );
  const [isIntermediateStepsEnabled, setIsIntermediateStepsEnabled] = useState(
    sessionStorage.getItem('enableIntermediateSteps')
      ? sessionStorage.getItem('enableIntermediateSteps') === 'true'
      : enableIntermediateSteps,
  );
  const [detailsToggle, setDetailsToggle] = useState(
    sessionStorage.getItem('expandIntermediateSteps') === 'true'
      ? true
      : expandIntermediateSteps,
  );
  const [intermediateStepOverrideToggle, setIntermediateStepOverrideToggle] =
    useState(
      sessionStorage.getItem('intermediateStepOverride') === 'false'
        ? false
        : intermediateStepOverride,
    );
  const [enableStreamingRagVizOptionsToggle, setenableStreamingRagVizOptionsToggle] =
    useState(
      sessionStorage.getItem('enableStreamingRagVizOptions')
        ? sessionStorage.getItem('enableStreamingRagVizOptions') === 'true'
        : enableStreamingRagVizOptions,
    );

  // Sync local theme state when the actual theme changes
  useEffect(() => {
    setTheme(themeLightMode);
  }, [themeLightMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  // Validation function for additional JSON body
  const validateAdditionalJson = (jsonString: string): { isValid: boolean; error: string } => {
    if (!jsonString.trim()) {
      return { isValid: true, error: '' }; // Empty is valid
    }

    try {
      const parsed = JSON.parse(jsonString);

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { isValid: false, error: 'JSON must be a valid object (not array or null)' };
      }

      // Reserved fields that cannot be overridden (only for chat/chat stream endpoints)
      const reservedFields = [
        // Core system fields that will be in the final payload
        'messages', 'stream'
      ];

      const conflictingFields = Object.keys(parsed).filter(key =>
        reservedFields.includes(key)
      );

      if (conflictingFields.length > 0) {
        return {
          isValid: false,
          error: `Cannot override reserved fields: ${conflictingFields.join(', ')}`
        };
      }

      return { isValid: true, error: '' };
    } catch (error) {
      return { isValid: false, error: 'Invalid JSON format' };
    }
  };

  // Handle JSON input change with validation
  const handleJsonInputChange = (value: string) => {
    setJsonBodyInput(value);
    const validation = validateAdditionalJson(value);
    setJsonValidationError(validation.error);
  };

  // Handle HTTP endpoint change
  const handleHttpEndpointChange = (endpoint: string) => {
    setSelectedHttpEndpoint(endpoint);

    // Clear JSON validation error when switching to generate endpoints
    // since the additional JSON field won't be visible/used
    if (endpoint === GENERATE || endpoint === GENERATE_STREAM) {
      setJsonValidationError('');
    }
  };

  const handleSave = () => {
    if (!selectedHttpEndpoint) {
      toast.error('Please select an HTTP endpoint to save settings');
      return;
    }

    const isChatEndpoint = selectedHttpEndpoint === CHAT ||
                           selectedHttpEndpoint === CHAT_STREAM ||
                           selectedHttpEndpoint === CHAT_CA_RAG;

    if (isChatEndpoint) {
      const validation = validateAdditionalJson(jsonBodyInput);
      if (!validation.isValid) {
        toast.error(`JSON Validation Error: ${validation.error}`);
        return;
      }
    }

    setLightMode(theme);
    homeDispatch({ field: 'httpEndpoint', value: selectedHttpEndpoint || DEFAULT_CORE_ROUTE });
    homeDispatch({ field: 'optionalGenerationParameters', value: jsonBodyInput });
    homeDispatch({ field: 'webSocketSchema', value: webSocketSchema || 'chat_stream' });
    homeDispatch({ field: 'expandIntermediateSteps', value: detailsToggle });
    homeDispatch({
      field: 'intermediateStepOverride',
      value: intermediateStepOverrideToggle,
    });
    homeDispatch({
      field: 'enableIntermediateSteps',
      value: isIntermediateStepsEnabled,
    });
    homeDispatch({
      field: 'enableStreamingRagVizOptions',
      value: enableStreamingRagVizOptionsToggle,
    });

    sessionStorage.setItem('httpEndpoint', selectedHttpEndpoint || DEFAULT_CORE_ROUTE);
    sessionStorage.setItem('optionalGenerationParameters', jsonBodyInput);
    sessionStorage.setItem('webSocketSchema', webSocketSchema || 'chat_stream');
    sessionStorage.setItem('expandIntermediateSteps', String(detailsToggle));
    sessionStorage.setItem(
      'intermediateStepOverride',
      String(intermediateStepOverrideToggle),
    );
    sessionStorage.setItem(
      'enableIntermediateSteps',
      String(isIntermediateStepsEnabled),
    );
    sessionStorage.setItem(
      'enableStreamingRagVizOptions',
      String(enableStreamingRagVizOptionsToggle),
    );

    toast.success('Settings saved successfully');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50 dark:bg-opacity-20">
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white dark:bg-[#202123] rounded-2xl shadow-lg p-6 transform transition-all relative"
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('Settings')}
        </h2>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('Theme')}
        </label>
        <select
          className="w-full mt-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
        >
          <option value="dark">{t('Dark mode')}</option>
          <option value="light">{t('Light mode')}</option>
        </select>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
          {t('HTTP Endpoint')}
        </label>
        <select
          className="w-full mt-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
          value={selectedHttpEndpoint}
          onChange={(e) => handleHttpEndpointChange(e.target.value)}
        >
          {httpEndpoints?.map((endpoint) => (
            <option key={endpoint.value} value={endpoint.value}>
              {endpoint.label}
            </option>
          ))}
        </select>

        {/* Show optional generation parameters for chat endpoints */}
        {(selectedHttpEndpoint === CHAT || selectedHttpEndpoint === CHAT_STREAM) && (
          <>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
              {t('Optional generation parameters')}
            </label>
            <textarea
              placeholder='{"custom_param": "value", "another_param": 123}'
              value={jsonBodyInput}
              onChange={(e) => handleJsonInputChange(e.target.value)}
              className={`w-full mt-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none resize-none ${
                jsonValidationError ? 'border-2 border-red-500' : ''
              }`}
              rows={4}
            />
            {jsonValidationError && (
              <div className="mt-1 text-sm text-red-500 dark:text-red-400">
                {jsonValidationError}
              </div>
            )}
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional: Add custom JSON parameters for chat/chat stream endpoints only.
              Cannot override: messages, stream.
            </div>
          </>
        )}

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
          {t('WebSocket Schema')}
        </label>
        <select
          className="w-full mt-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
          value={webSocketSchema}
          onChange={(e) => {
            setWebSocketSchema(e.target.value);
          }}
        >
          {webSocketSchemas?.map((schema) => (
            <option key={schema} value={schema}>
              {WEBSOCKET_SCHEMA_LABELS[schema]}
            </option>
          ))}
        </select>

        <div className="flex align-middle text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
          <input
            type="checkbox"
            id="enableIntermediateSteps"
            checked={isIntermediateStepsEnabled}
            onChange={() => {
              setIsIntermediateStepsEnabled(!isIntermediateStepsEnabled);
            }}
            className="mr-2"
          />
          <label
            htmlFor="enableIntermediateSteps"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Enable Intermediate Steps
          </label>
        </div>

        <div className="flex align-middle text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
          <input
            type="checkbox"
            id="detailsToggle"
            checked={detailsToggle}
            onChange={() => {
              setDetailsToggle(!detailsToggle);
            }}
            disabled={!isIntermediateStepsEnabled}
            className="mr-2"
          />
          <label
            htmlFor="detailsToggle"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Expand Intermediate Steps by default
          </label>
        </div>

        <div className="flex align-middle text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
          <input
            type="checkbox"
            id="intermediateStepOverrideToggle"
            checked={intermediateStepOverrideToggle}
            onChange={() => {
              setIntermediateStepOverrideToggle(
                !intermediateStepOverrideToggle,
              );
            }}
            disabled={!isIntermediateStepsEnabled}
            className="mr-2"
          />
          <label
            htmlFor="intermediateStepOverrideToggle"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Override intermediate Steps with same Id
          </label>
        </div>

        <div className="flex align-middle text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
          <input
            type="checkbox"
            id="enableStreamingRagVizOptions"
            checked={enableStreamingRagVizOptionsToggle}
            onChange={() => {
              setenableStreamingRagVizOptionsToggle(
                !enableStreamingRagVizOptionsToggle,
              );
            }}
            disabled={!isIntermediateStepsEnabled}
            className="mr-2"
          />
          <label
            htmlFor="enableStreamingRagVizOptions"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Enable Context-Aware RAG Visualization (Experimental)
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none"
            onClick={onClose}
          >
            {t('Cancel')}
          </button>
          <button
            className="px-4 py-2 bg-[#76b900] text-white rounded-md hover:bg-[#5a9100] focus:outline-none"
            onClick={handleSave}
          >
            {t('Save')}
          </button>
        </div>
      </div>
    </div>
  );
};
