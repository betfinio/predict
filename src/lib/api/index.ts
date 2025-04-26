import logger from '@/src/config/logger';
import { BETS_MEMORY_ADDRESS, PARTNER_ADDRESS, PREDICT_ADDRESS } from '@/src/global.ts';
import { games } from '@/src/lib';
import { fetchPrice, getPlayerRounds, getRounds } from '@/src/lib/gql';
import { BetInterfaceABI, BetsMemoryABI, DataFeedABI, PartnerABI, PredictBetABI, PredictGameABI, defaultMulticall } from '@betfinio/abi';
import type { QueryClient } from '@tanstack/react-query';
import { type Config, type WriteContractReturnType, multicall, readContract, simulateContract, writeContract } from '@wagmi/core';
import { getBlockByTimestamp } from 'betfinio_context/lib/gql';
import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { CalculateRoundParams, Game, PlaceBetParams, PredictBet, Result, Round } from '../types';

// header stats

export const fetchBetsVolume = async (config: Config): Promise<bigint> => {
	logger.info('fetching bets volume', PREDICT_ADDRESS);
	return (await readContract(config, {
		abi: BetsMemoryABI,
		address: BETS_MEMORY_ADDRESS,
		functionName: 'gamesVolume',
		args: [PREDICT_ADDRESS],
	})) as bigint;
};

export const fetchBetsCount = async (config: Config): Promise<number> => {
	try {
		const address = PREDICT_ADDRESS;
		logger.info('fetching bets count', address);
		return Number(
			await readContract(config, {
				abi: BetsMemoryABI,
				address: BETS_MEMORY_ADDRESS,
				functionName: 'getGamesBetsCount',
				args: [address],
			}),
		);
	} catch (e) {
		console.error(e);
		return 0;
	}
};

export const fetchYesterdayPrice = async (params: { pair: string }, config: Config): Promise<Result> => {
	if (!games) throw Error('Games are required!');
	const pair = params.pair;
	const address = games[pair].dataFeed;
	logger.info('fetching latest price', pair, address);
	return await fetchPrice(address, Math.floor(Date.now() / 1000) - 60 * 60 * 24, config);
};

// tables

export const fetchRounds = async (config: Config, params: { game: Game; player: Address; limit: number; page: number }): Promise<Round[]> => {
	const { game, player, limit, page } = params;
	const { address: gameAddress } = game;

	if (!config) return [];
	const rounds = await getRounds(gameAddress, player, limit, page);

	return await Promise.all(rounds.map((round) => populateRoundWithEndPrice(game, round, player, config)));
};

export const fetchPlayerRounds = async (config: Config, params: { game: Game; player: Address; limit: number; page: number }): Promise<Round[]> => {
	const { game, player, limit, page } = params;
	const { address: gameAddress } = game;

	if (!config) return [];

	const rounds = await getPlayerRounds(gameAddress, player, limit, page);

	return await Promise.all(rounds.map((round) => populateRoundWithEndPrice(game, round, player, config)));
};

export const populateRoundWithEndPrice = async (game: Game, round: Round, player: Address, config: Config): Promise<Round> => {
	if (round.price.end) {
		return round;
	}

	const feed = game.dataFeed;
	const ended = (round.round + game.duration) * game.interval;
	const endPrice = await fetchPrice(feed, ended, config);
	const end = endPrice.answer;
	return {
		...round,
		price: { ...round.price, end },
	};
};

export const fetchLatestPrice = async (params: { pair: string }, config: Config): Promise<Result> => {
	const pair = params.pair;
	const address = games[pair].dataFeed;
	logger.info('fetching latest price', pair, address);
	return await fetchPrice(address, Math.floor(Date.now() / 1000), config);
};

export async function fetchPredictBet(config: Config, params: { address: Address }): Promise<PredictBet> {
	const { address } = params;
	const output = await multicall(config, {
		multicallAddress: defaultMulticall,
		contracts: [
			{
				abi: BetInterfaceABI,
				address: address,
				functionName: 'getBetInfo',
				args: [],
			},
			{
				abi: PredictBetABI,
				address: address,
				functionName: 'getSide',
			},
			{
				abi: PredictBetABI,
				address: address,
				functionName: 'getRound',
			},
			{
				abi: PredictBetABI,
				address: address,
				functionName: 'getPredictGame',
			},
			{
				abi: PredictBetABI,
				address: address,
				functionName: 'getBonus',
			},
		],
	});
	const data = output[0].result as [Address, string, bigint, bigint, bigint, bigint];
	const side = output[1].result as boolean;
	const round = output[2].result as bigint;
	const predictGame = output[3].result as string;
	const bonus = output[4].result as bigint;
	return {
		address: address,
		player: data[0],
		game: data[1],
		amount: data[2],
		result: data[3],
		status: data[4],
		created: data[5],
		side: side,
		round: round,
		predictGame: predictGame,
		bonus: bonus,
	} as PredictBet;
}

export const placeBet = async ({ amount, side, game }: PlaceBetParams, config: Config): Promise<WriteContractReturnType> => {
	const data = encodeAbiParameters(parseAbiParameters('uint256 _amount, bool _side, address _game'), [amount, side, game]);
	return await writeContract(config, {
		abi: PartnerABI,
		address: PARTNER_ADDRESS,
		functionName: 'placeBet',
		args: [PREDICT_ADDRESS, amount, data],
	});
};
export const calculateRound = async ({ round, game }: CalculateRoundParams, config: Config): Promise<WriteContractReturnType> => {
	const start = round * game.interval;
	const end = (round + game.duration) * game.interval;
	const startBlock = await getBlockByTimestamp(start);
	const endBlock = await getBlockByTimestamp(end);
	const priceStart = await readContract(config, {
		abi: DataFeedABI,
		address: game.dataFeed,
		functionName: 'latestRoundData',
		blockNumber: startBlock,
	});
	const priceEnd = await readContract(config, {
		abi: DataFeedABI,
		address: game.dataFeed,
		functionName: 'latestRoundData',
		blockNumber: endBlock,
	});
	await simulateContract(config, {
		abi: PredictGameABI,
		address: game.address,
		functionName: 'calculateBets',
		args: [BigInt(round), priceStart[0], priceEnd[0]],
	});
	return await writeContract(config, {
		abi: PredictGameABI,
		address: game.address,
		functionName: 'calculateBets',
		args: [BigInt(round), priceStart[0], priceEnd[0]],
	});
};

export const animateNewBet = (side: 'long' | 'short', strength: number, queryClient: QueryClient, game: Game) => {
	queryClient.setQueryData(['predict', game.address, 'bets', 'newBet'], { side, strength });
};
