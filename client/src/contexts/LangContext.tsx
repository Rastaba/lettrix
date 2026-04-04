import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Lang, getT } from '../i18n';

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: 'fr',
  toggleLang: () => {},
  t: (k) => k,
});

export function useLang() {
  return useContext(LangContext);
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('lettrix-lang') as Lang) || 'fr';
  });

  // Sync <html lang=""> attribute with current language
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang((l) => {
      const next = l === 'fr' ? 'en' : 'fr';
      localStorage.setItem('lettrix-lang', next);
      return next;
    });
  }, []);

  const t = getT(lang);

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}
