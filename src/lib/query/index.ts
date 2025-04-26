import logger from '@/src/config/logger';
import {
	calculateRound,
	fetchBetsCount,
	fetchBetsVolume,
	fetchLatestPrice,
	fetchPlayerRounds,
	fetchRounds,
	fetchYesterdayPrice,
	placeBet,
} from '@/src/lib/api';
import {
	fetchPrice,
	getCurrentRoundPool,
	getLastBets,
	getPlayerBetsByRound,
	getPlayerRoundsCount,
	getRound,
	getRoundBets,
	getRoundsCount,
} from '@/src/lib/gql';
import type { CalculateRoundParams, Game, PlaceBetParams, PredictBet, Result, Round } from '@/src/lib/types.ts';
import { ZeroAddress } from '@betfinio/abi';
import { toast } from '@betfinio/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WriteContractReturnType } from '@wagmi/core';
import { getTransactionLink } from 'betfinio_context/lib/helpers';
import type { Address, WriteContractErrorType } from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';
import { useAccount, useConfig } from 'wagmi';

export const useCurrentRound = (interval: number) => {
	return useQuery<number>({
		initialData: Math.floor(Date.now() / 1000 / interval),
		queryKey: ['predict', 'round', 'current', interval],
		queryFn: async () => Math.floor(Date.now() / 1000 / interval),
		refetchIntervalInBackground: true,
		refetchInterval: 5 * 1000,
	});
};

export const useLatestPrice = (pair: string) => {
	const config = useConfig();
	return useQuery<Result>({
		queryKey: ['predict', 'price', 'latest', pair],
		queryFn: () => fetchLatestPrice({ pair }, config),
	});
};

export const usePrice = (feed: Address, time: number) => {
	const config = useConfig();
	return useQuery<Result>({
		queryKey: ['predict', 'price', feed, time],
		queryFn: async () => fetchPrice(feed, time, config),
	});
};

export const useYesterdayPrice = (pair: string) => {
	const config = useConfig();
	return useQuery<Result>({
		queryKey: ['predict', 'price', 'yesterday', pair],
		queryFn: () => fetchYesterdayPrice({ pair }, config),
	});
};

export const useBetsCount = () => {
	const config = useConfig();
	return useQuery<number>({
		queryKey: ['predict', 'bets', 'count'],
		queryFn: () => fetchBetsCount(config),
	});
};

export const useBetsVolume = () => {
	const config = useConfig();

	return useQuery<bigint>({
		queryKey: ['predict', 'bets', 'volume'],
		queryFn: () => fetchBetsVolume(config),
	});
};

export const usePlayerBets = (player: Address, game: Address, round: number) => {
	return useQuery<PredictBet[]>({
		queryKey: ['predict', 'bets', player, game, round],
		queryFn: () => getPlayerBetsByRound(game, round, player),
	});
};

export const useLastBets = (address: Address, count: number) => {
	return useQuery<PredictBet[]>({
		queryKey: ['predict', 'bets', 'last', address, count],
		queryFn: () => getLastBets(address, count),
	});
};

export const useObserveBet = (game: Game) => {
	const queryClient = useQueryClient();
	const resetObservedBet = () => {
		queryClient.setQueryData(['predict', game.address, 'bets', 'newBet'], { side: null, strength: 0 });
	};

	const query = useQuery<{ side: 'long' | 'short' | null; strength: number }>({
		queryKey: ['predict', game.address, 'bets', 'newBet'],
		initialData: { side: null, strength: 0 },
	});

	return { query, resetObservedBet };
};

export const useRoundBets = (game: Address, round: number) => {
	return useQuery<PredictBet[]>({
		queryKey: ['predict', 'bets', 'round', game, round],
		queryFn: () => getRoundBets(game, round),
	});
};

export const usePool = (game: Address, round: number) => {
	return useQuery<{ long: bigint; short: bigint }>({
		queryKey: ['predict', 'pool', game, round],
		queryFn: () => getCurrentRoundPool(game, round),
	});
};
export const useRoundsCount = (game: Game) => {
	return useQuery<number>({
		queryKey: ['predict', 'rounds', 'count', game.address],
		queryFn: () => getRoundsCount(),
	});
};

export const usePlayerRoundsCount = (game: Game, player: Address) => {
	return useQuery<number>({
		queryKey: ['predict', 'rounds', 'count', game.address, 'player', player],
		queryFn: () => getPlayerRoundsCount(player),
	});
};

export const useRounds = (game: Game, limit = 0, page = 0) => {
	const config = useConfig();
	const { address = ZeroAddress } = useAccount();
	return useQuery<Round[]>({
		queryKey: ['predict', 'rounds', game.address, address, limit, page],
		queryFn: () => fetchRounds(config, { game, player: address, limit, page }),
	});
};
export const usePlayerRounds = (game: Game, address: Address, limit = 0, page = 0) => {
	const config = useConfig();
	return useQuery<Round[]>({
		queryKey: ['predict', 'rounds', game.address, address, 'player', limit, page],
		queryFn: () => fetchPlayerRounds(config, { game, player: address, limit, page }),
	});
};

export const useRoundInfo = (game: Game, round: number) => {
	const { address = ZeroAddress } = useAccount();
	return useQuery({
		queryKey: ['predict', 'round', round],
		queryFn: () => getRound(game.address, round, address),
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});
};

export const usePlaceBet = () => {
	const config = useConfig();
	return useMutation<WriteContractReturnType, WriteContractErrorType, PlaceBetParams>({
		mutationKey: ['predict', 'bets', 'place'],
		mutationFn: (params) => placeBet(params, config),
		onError: (e) => {
			console.log(e);
		},
		onMutate: () => logger.info('placeBet'),
		onSuccess: async (data) => {
			logger.info(data);
			const promise = async () => {
				await waitForTransactionReceipt(config.getClient(), { hash: data });
			};
			toast.promise(promise, {
				loading: 'Placing a bet',
				success: 'Bet placed',
				error: 'Transaction failed',
				action: getTransactionLink(data),
			});
		},
		onSettled: () => logger.info('placeBet settled'),
	});
};

export const useCalculate = () => {
	const client = useQueryClient();
	const config = useConfig();
	return useMutation<WriteContractReturnType, WriteContractErrorType, CalculateRoundParams>({
		mutationKey: ['predict', 'bets', 'calculate'],
		mutationFn: (params) => calculateRound(params, config),
		onError: async () => {
			toast.error('Error happened', {
				description: 'Transaction failed',
			});
		},
		onSuccess: async (data) => {
			const promise = async () => {
				await waitForTransactionReceipt(config.getClient(), { hash: data });
				await client.invalidateQueries({ queryKey: ['predict'] });
			};
			toast.promise(promise, {
				loading: 'Calculating a round',
				success: 'Round calculated',
				error: 'Transaction failed',
				action: getTransactionLink(data),
			});
		},
	});
};
