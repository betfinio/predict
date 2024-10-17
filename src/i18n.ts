import { sharedLang } from 'betfinio_app/locales/index';
import type { i18n } from 'i18next';
import * as i18 from 'i18next';
import ICU from 'i18next-icu';
import { initReactI18next } from 'react-i18next';
import czJSON from './translations/cz.json';
import enJSON from './translations/en.json';
import ruJSON from './translations/ru.json';

export const defaultNS = 'predict';
export const defaultLocale = 'en';

export const resources = {
	en: {
		predict: enJSON,
		shared: sharedLang.en,
	},
	cz: {
		predict: czJSON,
		shared: sharedLang.cz,
	},
	cs: {
		predict: czJSON,
		shared: sharedLang.cz,
	},
	ru: {
		predict: ruJSON,
		shared: sharedLang.ru,
	},
} as const;

const instance: i18n = i18.createInstance();
instance
	.use(initReactI18next)
	.use(ICU)
	.init({
		resources: resources,
		fallbackLng: 'en',
		defaultNS,
		interpolation: { escapeValue: false },
		react: { useSuspense: true },
	});

const changeLanguage = async (locale: string | null) => {
	const lng = locale ?? defaultLocale;
	await instance.changeLanguage(lng);
	localStorage.setItem('i18nextLng', lng);
};

if (!localStorage.getItem('i18nextLng')) {
	const locale = navigator.language.split('-')[0];
	console.log(locale, changeLanguage);
	changeLanguage(locale);
} else {
	changeLanguage(localStorage.getItem('i18nextLng'));
}

export default instance;
