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

export function intToLittleEndianI32(num: number): string {
	const buffer = new ArrayBuffer(4);
	const view = new DataView(buffer);

	view.setUint32(0, num, true);

	let hex = '';
	for (let i = 0; i < 4; i++) {
		hex += view.getUint8(i).toString(16).padStart(2, '0');
	}

	return hex;
}
