import React, { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'fr' as const, name: t('common.french'), flag: '🇫🇷' },
    { code: 'en' as const, name: t('common.english'), flag: '🇺🇸' }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
        title={t('common.language')}
      >
        <Globe className="h-5 w-5" />
        <span className="hidden sm:inline text-sm">
          {languages.find(lang => lang.code === language)?.flag}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-700">
            <p className="text-sm font-medium text-white">{t('common.language')}</p>
          </div>
          
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </div>
              {language === lang.code && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;