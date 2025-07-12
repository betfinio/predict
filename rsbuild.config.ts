import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { TanStackRouterRspack } from '@tanstack/router-plugin/rspack';

export default defineConfig({
	server: {
		port: 4004,
		cors: {
			origin: '*',
		},
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
		pluginModuleFederation(
			{
				name: 'betfinio_predict',
				remotes: {
					betfinio_context: `betfinio_context@${process.env.PUBLIC_CONTEXT_URL}/mf-manifest.json`,
				},
				exposes: {
					'./route': './src/routes/games/predict/$pair',
					'./style': './src/style.ts',
					'./i18n': './src/i18n.ts',
				},
				shared: [
					'react',
					'react-dom',
					'@tanstack/react-router',
					'@tanstack/react-query',
					'wagmi',
					'i18next',
					'react-i18next',
					'@privy-io/wagmi',
					'@privy-io/react-auth',
					'@betfinio/components',
				],
			},
			{},
		),
	],
	tools: {
		rspack: {
			ignoreWarnings: [/Critical dependency: the request of a dependency is an expression/],
			plugins: [TanStackRouterRspack()],
		},
	},
});
