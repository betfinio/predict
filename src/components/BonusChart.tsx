import type { PredictBet } from '@/src/lib/types.ts';
import { truncateEthAddress } from '@betfinio/abi';
import { type BarDatum, ResponsiveBar } from '@nivo/bar';
import type { BarTooltipProps } from '@nivo/bar/dist/types/types';
import { BetValue } from 'betfinio_app/BetValue';
import type { FC } from 'react';
import * as React from 'react';
import type { Address } from 'viem';

interface BonusItem extends BarDatum {
	bet: Address;
	bonus: number;
	bonusColor: string;
	index: number;
}
const BonusChart: FC<{ bonuses: { bet: PredictBet; bonus: number; index: number }[]; oneWay?: boolean; minBars?: number; height?: number }> = ({ bonuses }) => {
	const data: BonusItem[] = bonuses
		.map((bonus) => ({
			bet: bonus.bet.address,
			bonus: bonus.bet.side ? bonus.bonus : -bonus.bonus,
			bonusColor: bonus.bet.side ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
			index: bonus.index,
		}))
		.sort((a, b) => a.index - b.index);

	const [min, max] = data.reduce(
		([min, max], bar) => {
			return [Math.min(min, bar.bonus), Math.max(max, bar.bonus)];
		},
		[0, -0],
	);
	return (
		<div className={'h-full w-full'}>
			<ResponsiveBar
				tooltip={CustomTooltip}
				enableGridX={false}
				enableGridY={false}
				data={data as readonly BonusItem[]}
				minValue={min}
				maxValue={max}
				keys={['bonus']}
				indexBy={'bet'}
				colors={(bar) => bar.data.bonusColor}
				colorBy={'indexValue'}
				enableLabel={false}
				borderRadius={4}
			/>
		</div>
	);
};

const CustomTooltip: FC<BarTooltipProps<BonusItem>> = ({ data }) => {
	return (
		<div className={'border border-gray-800 rounded-lg bg-primary p-2 flex flex-col'}>
			<div>{truncateEthAddress(data.bet)}</div>
			<div className={'flex flex-row items-center gap-1'}>
				Bonus: <BetValue value={data.bonus} withIcon />
			</div>
		</div>
	);
};

export default BonusChart;
