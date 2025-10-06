import { IconFileImport } from '@tabler/icons-react';
import { FC } from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { SupportedExportFormats } from '@/types/export';

import { SidebarButton } from '../Sidebar/SidebarButton';

import { validateJsonData } from '@/utils/security/import-validation';

// Re-export for use in this component
export { validateJsonData as validateImportData };

interface Props {
  onImport: (data: SupportedExportFormats) => void;
}

export const Import: FC<Props> = ({ onImport }) => {
  const { t } = useTranslation('sidebar');
  return (
    <>
      <input
        id="import-file"
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept=".json"
        onChange={(e) => {
          if (!e.target.files?.length) return;

          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const rawContent = e.target?.result as string;
              
              // Validate and sanitize the imported data
              const validatedData = validateJsonData(rawContent);
              
              if (validatedData) {
                onImport(validatedData);
                toast.success('Import successful!');
              }
              // Error messages are handled by validateImportData
            } catch (error) {
              console.error('Import error:', error);
              toast.error('Failed to import file. Please check the file format.');
            }
          };
          
          reader.onerror = () => {
            toast.error('Failed to read file. Please try again.');
          };
          
          reader.readAsText(file);
        }}
      />

      <SidebarButton
        text={t('Import data')}
        icon={<IconFileImport size={18} />}
        onClick={() => {
          const importFile = document.querySelector(
            '#import-file',
          ) as HTMLInputElement;
          if (importFile) {
            importFile.click();
          }
        }}
      />
    </>
  );
};
