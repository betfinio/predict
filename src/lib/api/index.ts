import logger from '@/src/config/logger';
import { BETS_MEMORY_ADDRESS, PARTNER_ADDRESS, PREDICT_ADDRESS } from '@/src/global.ts';
import { games } from '@/src/lib';
import { fetchPrice, getPlayerRounds, getRounds } from '@/src/lib/gql';
import { getBlockByTimestamp } from '@/src/lib/gql';
import { BetInterfaceContract, BetsMemoryContract, DataFeedContract, GameContract, PartnerContract, PredictBetContract, defaultMulticall } from '@betfinio/abi';
import { type WriteContractReturnType, multicall, readContract, writeContract } from '@wagmi/core';
import type { Options } from 'betfinio_app/lib/types';
import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { CalculateRoundParams, Game, PlaceBetParams, PredictBet, Result, Round, RoundPool, RoundWithStartPrice } from '../types';

export const fetchRounds = async (options: Options, params: { game: Game; player: Address }): Promise<Round[]> => {
	const { config } = options;
	const { game, player } = params;
	const { address: gameAddress } = game;

	if (!config) return [];
	const rounds: RoundWithStartPrice[] = await getRounds(gameAddress);

	return await Promise.all(rounds.map((round) => fetchRound(options, { game, round, player })));
};

export const fetchPlayerRounds = async (game: Game, player: Address, options: Options): Promise<Round[]> => {
	const rounds: number[] = await getPlayerRounds(game.address, player);
	return await Promise.all(rounds.map((round) => fetchRound(options, { game, round: { round: round, price: { start: 0n } }, player })));
};

export async function fetchRound(options: Options, params: { game: Game; round: RoundWithStartPrice; player: Address }): Promise<Round> {
	if (!options.config) throw Error('Config is required!');
	const { game, round, player } = params;
	const feed = game.dataFeed;
	const ended = (round.round + game.duration) * game.interval;
	const pool = await fetchPool(options, { game: game.address, round: round.round });
	const endPrice = await fetchPrice(feed, ended);
	const startPrice = await fetchPrice(feed, round.round * game.interval);
	const data = await multicall(options.config, {
		multicallAddress: defaultMulticall,
		contracts: [
			{
				abi: GameContract.abi,
				address: game.address,
				functionName: 'getPlayerBets',
				args: [player, BigInt(round.round)],
			},
			{
				abi: GameContract.abi,
				address: game.address,
				functionName: 'roundCalculated',
				args: [BigInt(round.round)],
			},
			{
				abi: GameContract.abi,
				address: game.address,
				functionName: 'start',
				args: [BigInt(round.round)],
			},
			{
				abi: GameContract.abi,
				address: game.address,
				functionName: 'end',
				args: [BigInt(round.round)],
			},
		],
	});
	const bets = data[0].result as [number, string[]];
	const calculated = data[1].result as boolean;
	const start = (data[2].result as bigint[])[1] || startPrice.answer || round.price.start;
	const end = (data[3].result as bigint[])[1] || endPrice.answer;
	return {
		round: round.round,
		price: { start, end },
		pool: pool,
		currentPlayerBets: Number(bets[0]),
		calculated: calculated,
	} as Round;
}

export async function fetchPool(options: Options, params: { game: Address; round: number }): Promise<RoundPool> {
	if (!options.config) throw Error('Config is required!');

	const { game, round } = params;
	const betsData = await multicall(options.config, {
		multicallAddress: defaultMulticall,
		contracts: [
			{
				abi: GameContract.abi,
				address: game,
				functionName: 'longPool',
				args: [round],
			},
			{
				abi: GameContract.abi,
				address: game,
				functionName: 'shortPool',
				args: [round],
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

export async function fetchLastBets(options: Options, params: { count: number }): Promise<PredictBet[]> {
	logger.info('fetching last bets');
	if (!options.config) throw Error('Config is required!');
	const { config } = options;
	const count = params.count;
	try {
		const bets = (await readContract(config, {
			...BetsMemoryContract,
			address: BETS_MEMORY_ADDRESS,
			functionName: 'getBets',
			args: [BigInt(count), 0n, PREDICT_ADDRESS],
		})) as Address[];
		return await Promise.all(bets.map((bet) => fetchPredictBet(options, { address: bet })));
	} catch (e) {
		console.log(e);
		return [];
	}
}

export const fetchPlayerBets = async (options: Options, params: { address: Address; game: Address; round: number }): Promise<PredictBet[]> => {
	if (!options.config) throw Error('Config is required!');
	const { address, game, round } = params;
	const { config } = options;
	const data = (await readContract(config, {
		abi: GameContract.abi,
		address: game,
		functionName: 'getPlayerBets',
		args: [address, round],
	})) as [number, Address[]];
	return Promise.all(data[1].map((bet) => fetchPredictBet(options, { address: bet })));
};

export const fetchBetsVolume = async (options: Options): Promise<bigint> => {
	if (!options.config) throw Error('Config is required!');
	logger.info('fetching bets volume', PREDICT_ADDRESS);
	return (await readContract(options.config, {
		...BetsMemoryContract,
		address: BETS_MEMORY_ADDRESS,
		functionName: 'gamesVolume',
		args: [PREDICT_ADDRESS],
	})) as bigint;
};

export const fetchBetsCount = async (options: Options): Promise<number> => {
	if (!options.config) throw Error('Config is required!');
	try {
		const address = PREDICT_ADDRESS;
		logger.info('fetching bets count', address);
		return Number(
			await readContract(options.config, {
				...BetsMemoryContract,
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

export const fetchLatestPrice = async (options: Options, params: { pair: string }): Promise<Result> => {
	const pair = params.pair;
	const address = games[pair].dataFeed;
	logger.info('fetching latest price', pair, address);
	return await fetchPrice(address, Math.floor(Date.now() / 1000));
};
export const fetchYesterdayPrice = async (options: Options, params: { pair: string }): Promise<Result> => {
	if (!games) throw Error('Games are required!');
	const pair = params.pair;
	const address = games[pair].dataFeed;
	logger.info('fetching latest price', pair, address);
	return await fetchPrice(address, Math.floor(Date.now() / 1000) - 60 * 60 * 24);
};

export const fetchRoundBets = async (options: Options, params: { game: Address; round: number }) => {
	logger.info('fetching round bets');

	if (!options.config) throw Error('Config is required!');
	const { game, round } = params;
	const { config } = options;
	const data = (await readContract(config, {
		abi: GameContract.abi,
		address: game,
		functionName: 'getRoundBets',
		args: [round],
	})) as [number, Address[]];

	return Promise.all(data[1].map((bet) => fetchPredictBet(options, { address: bet })));
};

export async function fetchPredictBet(options: Options, params: { address: Address }): Promise<PredictBet> {
	if (!options.config) throw Error('Config is required!');
	const { address } = params;
	const output = await multicall(options.config, {
		multicallAddress: defaultMulticall,
		contracts: [
			{
				...BetInterfaceContract,
				address: address,
				functionName: 'getBetInfo',
				args: [],
			},
			{
				...PredictBetContract,
				address: address,
				functionName: 'getSide',
			},
			{
				...PredictBetContract,
				address: address,
				functionName: 'getRound',
			},
			{
				...PredictBetContract,
				address: address,
				functionName: 'getPredictGame',
			},
			{
				...PredictBetContract,
				address: address,
				functionName: 'getBonus',
			},
		],
	});
	const data = output[0].result as [string, string, bigint, bigint, bigint, bigint];
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

export const placeBet = async ({ amount, side, game }: PlaceBetParams, options: Options): Promise<WriteContractReturnType> => {
	if (!options.config) throw new Error('Config are required!');
	const data = encodeAbiParameters(parseAbiParameters('uint256 _amount, bool _side, address _game'), [amount, side, game]);
	return await writeContract(options.config, {
		abi: PartnerContract.abi,
		address: PARTNER_ADDRESS,
		functionName: 'placeBet',
		args: [PREDICT_ADDRESS, amount, data],
	});
};
export const calculateRound = async ({ round, game }: CalculateRoundParams, options: Options): Promise<WriteContractReturnType> => {
	if (!options.config) throw new Error('Config are required!');
	if (!options.supabase) throw new Error('Supabase is required!');
	const { config } = options;
	const start = round * game.interval;
	const end = (round + game.duration) * game.interval;
	const startBlock = await getBlockByTimestamp(start);
	const endBlock = await getBlockByTimestamp(end);
	const priceStart = (await readContract(config, {
		abi: DataFeedContract.abi,
		address: game.dataFeed,
		functionName: 'latestRoundData',
		blockNumber: startBlock,
	})) as bigint[];
	const priceEnd = (await readContract(config, {
		abi: DataFeedContract.abi,
		address: game.dataFeed,
		functionName: 'latestRoundData',
		blockNumber: endBlock,
	})) as bigint[];
	return await writeContract(config, {
		...GameContract,
		address: game.address,
		functionName: 'calculateBets',
		args: [round, priceStart[0], priceEnd[0]],
	});
};
