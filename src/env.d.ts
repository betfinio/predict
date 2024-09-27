/// <reference types="@rsbuild/core/types" />
import '@tanstack/react-router';
import '@tanstack/react-table';
import type { Address } from 'viem';

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

interface ImportMetaEnv {
	readonly PUBLIC_TOKEN_ADDRESS: Address;
	readonly PUBLIC_PARTNER_ADDRESS: Address;
	readonly PUBLIC_BETS_MEMORY_ADDRESS: Address;
	readonly PUBLIC_PREDICT_ADDRESS: Address;
	readonly PUBLIC_ETHSCAN: Address;
}

declare module '@tanstack/react-table' {
	interface ColumnMeta {
		className?: string;
		colSpan?: number;
	}
}
