import logger from '@/src/config/logger';
import {
	calculateRound,
	fetchBetsCount,
	fetchBetsVolume,
	fetchLastBets,
	fetchLatestPrice,
	fetchPlayerBets,
	fetchPlayerRounds,
	fetchPool,
	fetchPrice,
	fetchRound,
	fetchRoundBets,
	fetchRounds,
	fetchYesterdayPrice,
	placeBet,
} from '@/src/lib/api';
import type { CalculateRoundParams, Game, PlaceBetParams, PredictBet, Result, Round } from '@/src/lib/types.ts';
import { BetsMemoryContract, GameContract, ZeroAddress } from '@betfinio/abi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WriteContractReturnType } from '@wagmi/core';
import { getTransactionLink } from 'betfinio_app/helpers';
import { useSupabase } from 'betfinio_app/supabase';
import { toast } from 'betfinio_app/use-toast';
import type { Address, WriteContractErrorType } from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';
import { useAccount, useConfig, useWatchContractEvent } from 'wagmi';

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
		queryFn: () => fetchLatestPrice({ config }, { pair }),
	});
};

export const usePrice = (feed: Address, time: number) => {
	const config = useConfig();
	return useQuery<Result>({
		queryKey: ['predict', 'price', feed, time],
		queryFn: async () => fetchPrice({ config }, { address: feed, time }),
	});
};

export const useYesterdayPrice = (pair: string) => {
	const config = useConfig();
	return useQuery<Result>({
		queryKey: ['predict', 'price', 'yesterday', pair],
		queryFn: () => fetchYesterdayPrice({ config }, { pair }),
	});
};

export const useBetsCount = () => {
	const config = useConfig();
	return useQuery<number>({
		queryKey: ['predict', 'bets', 'count'],
		queryFn: () => fetchBetsCount({ config }),
	});
};

export const useBetsVolume = () => {
	const config = useConfig();
	const { client: supabase } = useSupabase();

	return useQuery<bigint>({
		queryKey: ['predict', 'bets', 'volume'],
		queryFn: () => fetchBetsVolume({ config, supabase }),
	});
};

export const usePlayerBets = (address: Address, game: Address, round: number) => {
	const config = useConfig();

	return useQuery<PredictBet[]>({
		queryKey: ['predict', 'bets', address, game, round],
		queryFn: () => fetchPlayerBets({ config }, { address, game, round }),
	});
};

export const useLastBets = (count: number) => {
	const config = useConfig();

	const queryClient = useQueryClient();
	useWatchContractEvent({
		...BetsMemoryContract,
		config: config,
		eventName: 'NewBet',
		onLogs: () => queryClient.invalidateQueries({ queryKey: ['predict', 'bets'] }),
		poll: false,
	});
	return useQuery<PredictBet[]>({
		queryKey: ['predict', 'bets', 'last', count],
		queryFn: () => fetchLastBets({ config }, { count }),
	});
};

export const useRoundBets = (game: Address, round: number) => {
	const config = useConfig();
	return useQuery<PredictBet[]>({
		initialData: [],
		queryKey: ['predict', 'bets', 'round', game, round],
		queryFn: () => fetchRoundBets({ config }, { game, round }),
	});
};

export const usePool = (game: Address, round: number) => {
	const config = useConfig();
	const client = useQueryClient();
	useWatchContractEvent({
		abi: BetsMemoryContract.abi,
		address: game,
		config: config,
		eventName: 'NewBet',
		onLogs: async () => {
			await client.invalidateQueries({ queryKey: ['predict', 'pool', game] });
		},
	});
	return useQuery({
		queryKey: ['predict', 'pool', game, round],
		queryFn: () => fetchPool({ config }, { game, round }),
	});
};
export const useRounds = (game: Game, onlyPlayers?: boolean) => {
	const config = useConfig();
	const client = useQueryClient();
	const { address = ZeroAddress } = useAccount({ config });
	useWatchContractEvent({
		abi: GameContract.abi,
		address: game.address,
		config: config,
		eventName: 'RoundCreated',
		onLogs: async () => {
			await client.invalidateQueries({ queryKey: ['predict', 'rounds', game, onlyPlayers] });
		},
	});
	return useQuery<Round[]>({
		queryKey: ['predict', 'rounds', game, onlyPlayers],
		queryFn: () => fetchRounds({ config }, { game, player: address, onlyPlayers }),
	});
};

export const useRoundInfo = (game: Game, round: number) => {
	const config = useConfig();

	const { address = ZeroAddress } = useAccount({ config });
	return useQuery({
		queryKey: ['predict', 'round', round],
		queryFn: () => fetchRound({ config }, { game, round: { round, price: { start: 0n } }, player: address }),
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});
};

export const usePlayerRounds = (game: Address) => {
	const config = useConfig();
	const { client: supabase } = useSupabase();
	const { address = ZeroAddress } = useAccount({ config });
	return useQuery<number[]>({
		queryKey: ['predict', 'playerRounds', game, address],
		queryFn: () => fetchPlayerRounds({ config, supabase }, { game, player: address }),
	});
};

export const usePlaceBet = () => {
	const client = useQueryClient();
	const config = useConfig();
	return useMutation<WriteContractReturnType, WriteContractErrorType, PlaceBetParams>({
		mutationKey: ['predict', 'bets', 'place'],
		mutationFn: (params) => placeBet(params, { config }),
		onError: (e) => {
			console.log(e);
		},
		onMutate: () => logger.info('placeBet'),
		onSuccess: async (data) => {
			logger.info(data);
			const { update } = toast({
				title: 'Placing a bet',
				description: 'Transaction is pending',
				variant: 'loading',
				duration: 10000,
			});
			await waitForTransactionReceipt(config.getClient(), { hash: data });
			update({ variant: 'default', description: 'Transaction is confirmed', title: 'Bet placed', action: getTransactionLink(data), duration: 5000 });
			await client.invalidateQueries({ queryKey: ['predict', 'bets'] });
		},
		onSettled: () => logger.info('placeBet settled'),
	});
};

export const useCalculate = () => {
	const client = useQueryClient();
	const config = useConfig();
	const { client: supabase } = useSupabase();
	return useMutation<WriteContractReturnType, WriteContractErrorType, CalculateRoundParams>({
		mutationKey: ['predict', 'bets', 'calculate'],
		mutationFn: (params) => calculateRound(params, { config, supabase }),
		onError: (e) => {
			console.log(e);
		},
		onSuccess: async (data) => {
			const { update } = toast({
				title: 'Calculating a round',
				description: 'Transaction is pending',
				variant: 'loading',
				duration: 10000,
			});
			await waitForTransactionReceipt(config.getClient(), { hash: data });
			update({ variant: 'default', description: 'Transaction is confirmed', title: 'Bet placed', action: getTransactionLink(data), duration: 3000 });
			await client.invalidateQueries({ queryKey: ['predict'] });
		},
	});
};
