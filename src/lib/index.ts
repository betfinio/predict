import type { Game } from '@/src/lib/types.ts';

export const games: Record<string, Game> = {
	BTCUSDT: {
		address: import.meta.env.PUBLIC_BTCUSDT_GAME_ADDRESS,
		dataFeed: import.meta.env.PUBLIC_BTCUSDT_FEED_ADDRESS,
		name: 'BTCUSDT',
		duration: 4,
		interval: 270,
	},
};
