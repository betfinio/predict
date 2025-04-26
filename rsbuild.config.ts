import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { TanStackRouterRspack } from '@tanstack/router-plugin/rspack';
import { dependencies } from './package.json';

export default defineConfig({
	server: {
		port: 4004,
	},
	dev: {
		assetPrefix: 'http://localhost:4004',
	},
	html: {
		title: 'Betfin Predict',
		favicon: './src/assets/favicon.svg',
	},
	output: {
		assetPrefix: process.env.PUBLIC_OUTPUT_URL,
	},
	plugins: [
		pluginReact(),
		pluginModuleFederation({
			name: 'betfinio_predict',
			remotes: {
				betfinio_context: `betfinio_context@${process.env.PUBLIC_CONTEXT_URL}/mf-manifest.json`,
			},
			exposes: {
				'./route': './src/routes/games/predict/$pair',
				'./style': './src/style.ts',
				'./i18n': './src/i18n.ts',
			},
			shared: {
				react: {
					singleton: true,
					requiredVersion: dependencies.react,
				},
				'react-dom': {
					singleton: true,
					requiredVersion: dependencies['react-dom'],
				},
				'@tanstack/react-router': {
					singleton: true,
					requiredVersion: dependencies['@tanstack/react-router'],
				},
				'@tanstack/react-query': {
					singleton: true,
					requiredVersion: dependencies['@tanstack/react-query'],
				},
				wagmi: {
					singleton: true,
					requiredVersion: dependencies.wagmi,
				},
				i18next: {
					singleton: true,
					requiredVersion: dependencies.i18next,
				},
				'react-i18next': {
					singleton: true,
					requiredVersion: dependencies['react-i18next'],
				},
				'@privy-io/wagmi': {
					singleton: true,
					requiredVersion: dependencies['@privy-io/wagmi'],
				},
				'@privy-io/react-auth': {
					singleton: true,
					requiredVersion: dependencies['@privy-io/react-auth'],
				},
				'@betfinio/components': {
					singleton: true,
					requiredVersion: dependencies['@betfinio/components'],
				},
			},
		}),
	],
	tools: {
		rspack: {
			ignoreWarnings: [/Critical dependency: the request of a dependency is an expression/],
			plugins: [TanStackRouterRspack()],
		},
	},
});
