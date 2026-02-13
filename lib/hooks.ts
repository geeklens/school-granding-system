
import { useAppStore } from './store';
import { translations, Locale } from './translations';

export const useTranslation = () => {
    const language = useAppStore((state) => state.language);

    const t = (path: string) => {
        const keys = path.split('.');
        let result: any = translations[language];

        for (const key of keys) {
            if (result && result[key]) {
                result = result[key];
            } else {
                // Fallback to Russian if translation missing
                let fallback: any = translations['ru'];
                for (const fkey of keys) {
                    if (fallback && fallback[fkey]) {
                        fallback = fallback[fkey];
                    } else {
                        return path; // Return the path itself if all fails
                    }
                }
                return fallback;
            }
        }

        return result;
    };

    return { t, language, setLanguage: useAppStore((state) => state.setLanguage) };
};
