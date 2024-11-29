import logger from '@/src/config/logger';
import { BETS_MEMORY_ADDRESS, PARTNER_ADDRESS, PREDICT_ADDRESS } from '@/src/global.ts';
import { games } from '@/src/lib';
import { fetchPrice, getPlayerRounds, getRounds } from '@/src/lib/gql';
import { BetInterfaceABI, BetsMemoryABI, DataFeedABI, PartnerABI, PredictBetABI, PredictGameABI, defaultMulticall } from '@betfinio/abi';
import type { QueryClient } from '@tanstack/react-query';
import { type Config, type WriteContractReturnType, multicall, readContract, simulateContract, writeContract } from '@wagmi/core';
import { getBlockByTimestamp } from 'betfinio_app/lib/gql';
import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { CalculateRoundParams, Game, PlaceBetParams, PredictBet, Result, Round, RoundPool, RoundWithStartPrice } from '../types';

export const fetchRounds = async (config: Config, params: { game: Game; player: Address }): Promise<Round[]> => {
	const { game, player } = params;
	const { address: gameAddress } = game;

	if (!config) return [];
	const rounds: RoundWithStartPrice[] = await getRounds(gameAddress);

	return await Promise.all(rounds.map((round) => fetchRound(config, { game, round, player })));
};

export const fetchPlayerRounds = async (game: Game, player: Address, config: Config): Promise<Round[]> => {
	const rounds: number[] = await getPlayerRounds(game.address, player);
	return await Promise.all(rounds.map((round) => fetchRound(config, { game, round: { round: round, price: { start: 0n } }, player })));
};

export async function fetchRound(config: Config, params: { game: Game; round: RoundWithStartPrice; player: Address }): Promise<Round> {
	const { game, round, player } = params;
	const feed = game.dataFeed;
	const ended = (round.round + game.duration) * game.interval;
	const pool = await fetchPool(config, { game: game.address, round: round.round });
	const endPrice = await fetchPrice(feed, ended);
	const startPrice = await fetchPrice(feed, round.round * game.interval);
	const data = await multicall(config, {
		multicallAddress: defaultMulticall,
		contracts: [
			{
				abi: PredictGameABI,
				address: game.address,
				functionName: 'getPlayerBets',
				args: [player, BigInt(round.round)],
			},
			{
				abi: PredictGameABI,
				address: game.address,
				functionName: 'roundCalculated',
				args: [BigInt(round.round)],
			},
			{
				abi: PredictGameABI,
				address: game.address,
				functionName: 'start',
				args: [BigInt(round.round)],
			},
			{
				abi: PredictGameABI,
				address: game.address,
				functionName: 'end',
				args: [BigInt(round.round)],
			},
		],
	});
	const bets = data[0].result as [bigint, string[]];
	const calculated = data[1].result as boolean;
	const start = data[2].result?.[1] || startPrice.answer || round.price.start;
	const end = data[3].result?.[1] || endPrice.answer;
	return {
		round: round.round,
		price: { start, end },
		pool: pool,
		currentPlayerBets: Number(bets[0]),
		calculated: calculated,
	} as Round;
}

export async function fetchPool(config: Config, params: { game: Address; round: number }): Promise<RoundPool> {
	const { game, round } = params;
	const betsData = await multicall(config, {
		multicallAddress: defaultMulticall,
		contracts: [
			{
				abi: PredictGameABI,
				address: game,
				functionName: 'longPool',
				args: [BigInt(round)],
			},
			{
				abi: PredictGameABI,
				address: game,
				functionName: 'shortPool',
				args: [BigInt(round)],
			},
		],
	});
	return {
		long: betsData[0].result as bigint,
		short: betsData[1].result as bigint,
		longCount: 0,
		shortCount: 0,
	};
}

export async function fetchLastBets(config: Config, params: { count: number }): Promise<PredictBet[]> {
	logger.info('fetching last bets');
	const count = params.count;
	try {
		const bets = (await readContract(config, {
			abi: BetsMemoryABI,
			address: BETS_MEMORY_ADDRESS,
			functionName: 'getBets',
			args: [BigInt(count), 0n, PREDICT_ADDRESS],
		})) as Address[];
		return await Promise.all(bets.map((bet) => fetchPredictBet(config, { address: bet })));
	} catch (e) {
		console.log(e);
		return [];
	}
}

export const fetchPlayerBets = async (config: Config, params: { address: Address; game: Address; round: number }): Promise<PredictBet[]> => {
	const { address, game, round } = params;
	const data = (await readContract(config, {
		abi: PredictGameABI,
		address: game,
		functionName: 'getPlayerBets',
		args: [address, BigInt(round)],
	})) as [bigint, Address[]];
	return Promise.all(data[1].map((bet) => fetchPredictBet(config, { address: bet })));
};

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

export const fetchLatestPrice = async (params: { pair: string }): Promise<Result> => {
	const pair = params.pair;
	const address = games[pair].dataFeed;
	logger.info('fetching latest price', pair, address);
	return await fetchPrice(address, Math.floor(Date.now() / 1000));
};
export const fetchYesterdayPrice = async (params: { pair: string }): Promise<Result> => {
	if (!games) throw Error('Games are required!');
	const pair = params.pair;
	const address = games[pair].dataFeed;
	logger.info('fetching latest price', pair, address);
	return await fetchPrice(address, Math.floor(Date.now() / 1000) - 60 * 60 * 24);
};

export const fetchRoundBets = async (config: Config, params: { game: Address; round: number }) => {
	logger.info('fetching round bets');
	const { game, round } = params;
	const data = (await readContract(config, {
		abi: PredictGameABI,
		address: game,
		functionName: 'getRoundBets',
		args: [BigInt(round)],
	})) as [bigint, Address[]];

	return Promise.all(data[1].map((bet) => fetchPredictBet(config, { address: bet })));
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
