import type { BetInterface } from 'betfinio_app/lib/types';
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
	};
}

export interface Round {
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
