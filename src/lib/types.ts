import { ZeroAddress } from '@betfinio/abi';
import type { BetInterface } from 'betfinio_context/lib/types';
import type { Address } from 'viem';

export interface PredictBet extends BetInterface {
	side: boolean;
	round: bigint;
	predictGame: string;
	bonus: bigint;
}

export interface Game {
	address: Address;
	dataFeed: Address;
	name: string;
	duration: number;
	interval: number;
}

export const defaultResult: Result = {
	roundId: 0n,
	answer: 0n,
	timestamp: 0n,
};

export interface Result {
	roundId: bigint;
	answer: bigint;
	timestamp: bigint;
	exist?: boolean;
}

export interface RoundPool {
	long: bigint;
	short: bigint;
	longCount: number;
	shortCount: number;
	longPlayersCount?: number;
	shortPlayersCount?: number;
}

export type RoundStatus = 'ended' | 'waiting' | 'accepting' | 'calculated';

export interface RoundWithStartPrice {
	round: number;
	price: {
		start: bigint;
		end: bigint;
	};
	pool: {
		long: bigint;
		short: bigint;
	};
}

export interface Round extends RoundWithStartPrice {
	round: number;
	price: {
		start: bigint;
		end: bigint;
	};
	pool: RoundPool;
	currentPlayerBets: number;
	calculated: boolean;
}

export interface PlaceBetParams {
	amount: bigint;
	side: boolean;
	game: Address;
}

export interface CalculateRoundParams {
	round: number;
	game: Game;
}

export interface Pagination {
	pageSize: number;
	pageIndex: number;
}

export const defaultRound: Round = {
	round: 0,
	price: {
		start: 0n,
		end: 0n,
	},
	pool: {
		long: 0n,
		short: 0n,
		longCount: 0,
		shortCount: 0,
	},
	currentPlayerBets: 0,
	calculated: false,
};

export const defaultBet: PredictBet = {
	side: false,
	round: 0n,
	predictGame: '',
	bonus: 0n,
	address: ZeroAddress,
	player: ZeroAddress,
	game: '',
	amount: 0n,
	result: 0n,
	status: 0n,
	created: 0n,
};
