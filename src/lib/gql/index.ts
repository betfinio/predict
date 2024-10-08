import {
	GetPriceDocument,
	type GetPriceQuery,
	PlayerBetsByRoundDocument,
	type PlayerBetsByRoundQuery,
	PlayerBetsDocument,
	type PlayerBetsQuery,
	RoundsDocument,
	type RoundsQuery,
	execute,
} from '@/.graphclient';
import logger from '@/src/config/logger.ts';
import { type PredictBet, type Result, type RoundWithStartPrice, defaultResult } from '@/src/lib/types.ts';
import type { ExecutionResult } from 'graphql/execution';
import type { Address } from 'viem';

export const getRounds = async (address: Address): Promise<RoundWithStartPrice[]> => {
	logger.start('fetching round starts by game address', address);
	const { data }: ExecutionResult<RoundsQuery> = await execute(RoundsDocument, {
		address: address,
	});
	if (data) {
		logger.success('fetching round starts by game address', data.rounds?.length);
		return mapDataToRounds(data);
	}
	return [];
};
export const getPlayerRounds = async (game: Address, player: Address): Promise<number[]> => {
	logger.start('fetching round starts by game address and player', game);
	const { data }: ExecutionResult<PlayerBetsQuery> = await execute(PlayerBetsDocument, {
		player,
		game: game,
	});
	if (data) {
		logger.success('fetching round starts by game address and player', data.predictBets?.length);
		return [...new Set(data.predictBets.map((bet) => Number(bet.round)))];
	}
	return [];
};

export const getPlayerBetsByRound = async (game: Address, player: Address, round: number): Promise<PredictBet[]> => {
	logger.start('fetching player bets by round', round);
	const { data }: ExecutionResult<PlayerBetsByRoundQuery> = await execute(PlayerBetsByRoundDocument, {
		player,
		game: game,
		round: round,
	});
	if (data) {
		logger.success('fetching player bets by round', data.predictBets?.length);
		const bets = data.predictBets;
		console.log(bets);

		return [] as PredictBet[];
	}
	return [];
};
export const fetchPrice = async (address: Address, timestamp: number): Promise<Result> => {
	logger.verbose('fetching price by timestamp', timestamp);
	const result: ExecutionResult<GetPriceQuery> = await execute(GetPriceDocument, { timestamp: timestamp, feed: address });
	if (result.data) {
		return {
			roundId: BigInt(result.data.answers[0].roundId),
			answer: BigInt(result.data.answers[0].current),
			timestamp: BigInt(result.data.answers[0].blockTimestamp),
			exist: true,
		};
	}
	return defaultResult;
};

const mapDataToRounds = (data: RoundsQuery): RoundWithStartPrice[] => {
	return data.rounds.map((created) => {
		return {
			round: Number(created.round),
			price: {
				start: BigInt(created.startPrice),
			},
		};
	});
};
