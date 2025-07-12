import { DataFeedABI } from '@betfinio/abi';
import { type Config, readContract } from '@wagmi/core';
import { getBlockByTimestamp } from 'betfinio_context/lib/gql';
import type { ExecutionResult } from 'graphql/execution';
import type { Address } from 'viem';
import {
	BetDocument,
	type BetQuery,
	BetsByRoundDocument,
	type BetsByRoundQuery,
	execute,
	LastBetsDocument,
	type LastBetsQuery,
	PlayerBetsByRoundDocument,
	type PlayerBetsByRoundQuery,
	PlayerRoundsCountDocument,
	type PlayerRoundsCountQuery,
	PlayerRoundsDocument,
	type PlayerRoundsQuery,
	RoundDocument,
	RoundPoolDocument,
	type RoundPoolQuery,
	type RoundQuery,
	RoundsCountDocument,
	type RoundsCountQuery,
	RoundsDocument,
	type RoundsQuery,
} from '@/.graphclient';
import logger from '@/src/config/logger.ts';
import { defaultBet, defaultResult, defaultRound, type PredictBet, type Result, type Round } from '@/src/lib/types.ts';
import { intToLittleEndianI32 } from '..';

export const getRoundsCount = async (): Promise<number> => {
	const { data }: ExecutionResult<RoundsCountQuery> = await execute(RoundsCountDocument, {});
	return Number(data?.counter?.rounds || 0);
};

export const getPlayerRoundsCount = async (player: Address): Promise<number> => {
	const { data }: ExecutionResult<PlayerRoundsCountQuery> = await execute(PlayerRoundsCountDocument, {
		player,
	});
	return Number(data?.player?.roundsCount || 0);
};

export const getRound = async (address: Address, round: number, player: Address): Promise<Round> => {
	logger.start('fetching round', round);
	const roundI32 = intToLittleEndianI32(round);
	const id = `${address.toLowerCase()}${roundI32}`;
	const { data }: ExecutionResult<RoundQuery> = await execute(RoundDocument, {
		id,
	});

	if (data) {
		logger.success('fetching round', round);
		return { ...roundQueryDataToPredictRound(data.round, player) };
	}
	return defaultRound;
};

export const getRounds = async (address: Address, player: Address, limit: number, page: number): Promise<Round[]> => {
	logger.start('fetching round starts by game address', address, limit, page);
	const { data }: ExecutionResult<RoundsQuery> = await execute(RoundsDocument, {
		address: address,
		limit: limit || 100,
		skip: page * limit,
	});

	if (data) {
		logger.success('fetching round starts by game address', data.rounds?.length);
		return mapDataToRounds(data, player);
	}
	return [];
};
export const getPlayerRounds = async (address: Address, player: Address, limit: number, page: number): Promise<Round[]> => {
	logger.start('fetching player rounds', address, player, limit, page);
	const { data }: ExecutionResult<PlayerRoundsQuery> = await execute(PlayerRoundsDocument, {
		address: address,
		player,
		limit: limit || 100,
		skip: page * limit,
	});

	if (data) {
		logger.success('fetching player rounds', data.rounds?.length);
		return mapDataToRounds(data, player);
	}
	return [];
};

export const getBetByAddress = async (address: Address): Promise<PredictBet> => {
	logger.start('fetching bet by address', address);
	const { data }: ExecutionResult<BetQuery> = await execute(BetDocument, {
		address,
	});

	if (data) {
		logger.success('fetching bet by address', data.predictBet);
		return betQueryToPredictBet(data.predictBet);
	}

	return defaultBet;
};

export const getPlayerBetsByRound = async (address: Address, round: number, player: Address): Promise<PredictBet[]> => {
	logger.start('fetching player bets by round', address, round, player);
	const { data }: ExecutionResult<PlayerBetsByRoundQuery> = await execute(PlayerBetsByRoundDocument, {
		address,
		round,
		player,
	});

	if (data) {
		logger.success('fetching player bets by round', data.predictBets?.length);
		return mapGraphBets(data.predictBets);
	}

	return [];
};

export const getRoundBets = async (address: Address, round: number): Promise<PredictBet[]> => {
	logger.start('fetching bets by round', address, round);
	const res: ExecutionResult<BetsByRoundQuery> = await execute(BetsByRoundDocument, {
		address: address,
		round: round,
	});

	const { data } = res;

	if (data) {
		logger.success('fetching bets by round', data.predictBets?.length, data.predictBets);
		return mapGraphBets(data.predictBets);
	}

	return [];
};

export const getLastBets = async (address: Address, count: number): Promise<PredictBet[]> => {
	logger.start('fetching last bets', address, count);
	const res: ExecutionResult<LastBetsQuery> = await execute(LastBetsDocument, {
		address: address,
		limit: count,
	});
	const { data } = res;

	if (data) {
		logger.success('fetching last bets', data.predictBets?.length, data.predictBets);
		return mapGraphBets(data.predictBets);
	}
	return [];
};

export const getCurrentRoundPool = async (address: Address, round: number): Promise<{ long: bigint; short: bigint }> => {
	logger.start('fetching round pool', round);

	const roundI32 = intToLittleEndianI32(round);
	const id = `${address.toLowerCase()}${roundI32}`;
	const res: ExecutionResult<RoundPoolQuery> = await execute(RoundPoolDocument, {
		id,
	});
	const { data } = res;

	if (data) {
		logger.success('fetching round pool', data.round);
		return {
			long: BigInt(data.round?.long ?? 0n),
			short: BigInt(data.round?.short ?? 0n),
		};
	}
	return {
		long: 0n,
		short: 0n,
	};
};

export const fetchPrice = async (address: Address, timestamp: number, config: Config): Promise<Result> => {
	logger.verbose('fetching price by timestamp', timestamp);
	const block = await getBlockByTimestamp(timestamp);
	if (block === 0n) return defaultResult;
	const data = await readContract(config, {
		address: address,
		abi: DataFeedABI,
		functionName: 'latestRoundData',
		blockNumber: BigInt(block),
	});
	if (data) {
		return {
			roundId: BigInt(data[0]),
			answer: BigInt(data[1]),
			timestamp: BigInt(data[2]),
			exist: true,
		};
	}
	return defaultResult;
};

const roundQueryDataToPredictRound = (round: RoundQuery['round'], player: Address) => {
	if (!round) return defaultRound;

	const currentPlayerBets = round?.bets.filter((bet) => bet.player === player.toLowerCase()).length ?? 0;

	return {
		round: Number(round.round),
		price: {
			start: BigInt(round.startPrice),
			end: BigInt(round.endPrice),
		},
		pool: {
			short: BigInt(round.short),
			long: BigInt(round.long),
			longCount: 0,
			shortCount: 0,
		},
		calculated: round.calculated,
		refunded: round.refunded,
		currentPlayerBets,
	};
};

const mapDataToRounds = (data: RoundsQuery, player: Address): Round[] => {
	return data.rounds.map((round) => roundQueryDataToPredictRound(round, player));
};

const betQueryToPredictBet = (bet: BetQuery['predictBet']): PredictBet => {
	if (!bet) return defaultBet;
	return {
		...bet,
		created: BigInt(bet.blockTimestamp),
		address: bet.address as Address,
		game: bet.predictGame as Address,
		player: bet.player as Address,
		hash: bet.hash as Address,
		amount: BigInt(bet.amount),
		round: BigInt(bet.round),
		bonus: BigInt(bet.bonus),
		result: BigInt(bet.result),
		status: BigInt(bet.status),
	};
};

const mapGraphBets = (bets: BetsByRoundQuery['predictBets']): PredictBet[] => {
	return bets.map(betQueryToPredictBet);
};
