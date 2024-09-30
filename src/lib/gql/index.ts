import { GetPriceDocument, type GetPriceQuery, RoundsDocument, type RoundsQuery, execute } from '@/.graphclient';
import logger from '@/src/config/logger.ts';
import { type Result, type RoundWithStartPrice, defaultResult } from '@/src/lib/types.ts';
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
