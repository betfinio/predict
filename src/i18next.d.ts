import type { resources } from './i18n';

declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: 'predict';
		resources: (typeof resources)['en'];
	}
}

export type ILanguageKeys = (typeof resources)['en']['predict'];
export type ILanguageErrorKeys = keyof (typeof resources)['en']['shared']['errors'];
