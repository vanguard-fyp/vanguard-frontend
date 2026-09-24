import React, { createContext, useContext, useState, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'ms';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    'nav.dashboard': 'EOC Command Center',
    'nav.incidentManagement': 'Incident Management',
    'nav.disasterIntelligence': 'Disaster Intelligence',
    'nav.rescueOperations': 'Rescue Operations',
    'nav.resourceManagement': 'Resource Management',
    'nav.publicCommunication': 'Public Communication',
    'nav.reportsAnalytics': 'Reports & Analytics',
    'nav.systemAdmin': 'System Administration',
    'status.verified': 'Verified',
    'status.investigating': 'Investigating',
    'status.contained': 'Contained',
    'status.resolved': 'Resolved',
    'status.archived': 'Archived',
    'urgency.critical': 'Critical',
    'urgency.high': 'High',
    'urgency.medium': 'Medium',
    'urgency.low': 'Low',
    'action.save': 'Save Changes',
    'action.cancel': 'Cancel',
    'action.approve': 'Approve',
    'action.reject': 'Reject',
    'action.dispatch': 'Dispatch Unit',
    'action.create': 'Create',
    'action.delete': 'Delete',
    'action.filter': 'Filter',
  },
  ms: {
    'nav.dashboard': 'Pusat Kawalan EOC',
    'nav.incidentManagement': 'Pengurusan Insiden',
    'nav.disasterIntelligence': 'Perisikan Bencana',
    'nav.rescueOperations': 'Operasi Menyelamat',
    'nav.resourceManagement': 'Pengurusan Sumber',
    'nav.publicCommunication': 'Komunikasi Awam',
    'nav.reportsAnalytics': 'Laporan & Analitik',
    'nav.systemAdmin': 'Pentadbiran Sistem',
    'status.verified': 'Disahkan',
    'status.investigating': 'Sedang Disiasat',
    'status.contained': 'Terkawal',
    'status.resolved': 'Selesai',
    'status.archived': 'Diarkibkan',
    'urgency.critical': 'Kritikal',
    'urgency.high': 'Tinggi',
    'urgency.medium': 'Sederhana',
    'urgency.low': 'Rendah',
    'action.save': 'Simpan Perubahan',
    'action.cancel': 'Batal',
    'action.approve': 'Luluskan',
    'action.reject': 'Tolak',
    'action.dispatch': 'Hantar Pasukan',
    'action.create': 'Cipta',
    'action.delete': 'Padam',
    'action.filter': 'Tapis',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'vanguard_locale';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'ms' ? 'ms' : 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  useEffect(() => {
    document.documentElement.lang = language === 'ms' ? 'ms-MY' : 'en-MY';
  }, [language]);

  const t = (key: string, defaultText?: string): string => {
    return translations[language]?.[key] || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
