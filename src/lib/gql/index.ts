import { BlockByTimestampDocument, type BlockByTimestampQuery, RoundsDocument, type RoundsQuery, execute } from '@/.graphclient';
import logger from '@/src/config/logger.ts';
import type { RoundWithStartPrice } from '@/src/lib/types.ts';
import type { ExecutionResult } from 'graphql/execution';
import type { Address } from 'viem';

export const getRounds = async (address: Address): Promise<RoundWithStartPrice[]> => {
	logger.start('fetching round starts by game address', address);
	const { data, errors }: ExecutionResult<RoundsQuery> = await execute(RoundsDocument, {
		address: address,
	});
	if (data) {
		logger.success('fetching round starts by game address', data.rounds?.length);
		return mapDataToRounds(data);
	}
	return [];
};

export const fetchBlockByTimestamp = async (timestamp: number): Promise<bigint> => {
	logger.start('fetching block by timestamp', timestamp);
	const result: ExecutionResult<BlockByTimestampQuery> = await execute(BlockByTimestampDocument, { timestamp: BigInt(timestamp) });
	logger.success('fetching block by timestamp', result.data?.blocks);
	if (result.data) {
		return result.data.blocks[0].number?.valueOf() || 0n;
	}
	return 0n;
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
