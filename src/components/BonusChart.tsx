import type { PredictBet } from '@/src/lib/types.ts';
import { arrayFrom, truncateEthAddress } from '@betfinio/abi';
import { type BarDatum, ResponsiveBar } from '@nivo/bar';
import type { BarTooltipProps } from '@nivo/bar/dist/types/types';
import { BetValue } from 'betfinio_app/BetValue';
import cx from 'clsx';
import type { FC } from 'react';
import * as React from 'react';
import type { Address } from 'viem';

interface BonusItem extends BarDatum {
	bet: Address;
	bonus: number;
	bonusColor: string;
	index: number;
}

const mockData: BonusItem[] = arrayFrom(30).map((num, i) => ({
	bet: `0x123${num}`,
	bonus: (Math.floor(Math.random() * 10000) + 1000) * (i % 2 ? 1 : -1),
	bonusColor: i % 2 ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
	index: i,
}));

const BonusChart: FC<{ bonuses: { bet: PredictBet; bonus: number; index: number }[]; oneWay?: boolean; minBars?: number; height?: number }> = ({ bonuses }) => {
	const data: BonusItem[] = bonuses
		.map((bonus) => ({
			bet: bonus.bet.address,
			bonus: bonus.bet.side ? bonus.bonus : -bonus.bonus,
			bonusColor: bonus.bet.side ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
			index: bonus.index,
		}))
		.sort((a, b) => a.index - b.index);

	const result: BonusItem[] = data.length > 0 ? data : mockData;

	const [min, max] = result.reduce(
		([min, max], bar) => {
			return [Math.min(min, bar.bonus), Math.max(max, bar.bonus)];
		},
		[0, -0],
	);

	if (result.length < 40) {
		const toAdd = 40 - result.length;
		result.unshift(
			...arrayFrom(Math.floor(toAdd / 2)).map((num, i) => ({
				bet: `0x123${num}` as Address,
				bonus: 0,
				bonusColor: 'hsl(var(--success))',
				index: i + result.length,
			})),
		);
		result.push(
			...arrayFrom(Math.floor(toAdd / 2)).map((num, i) => ({
				bet: `0x123${num + 100}` as Address,
				bonus: 0,
				bonusColor: 'hsl(var(--success))',
				index: i + result.length,
			})),
		);
	}

	return (
		<div className={cx('h-full w-full', data.length === 0 && 'pointer-events-none grayscale')}>
			<ResponsiveBar
				tooltip={CustomTooltip}
				enableGridX={false}
				enableGridY={false}
				data={result as readonly BonusItem[]}
				minValue={-Math.max(Math.abs(min), max)}
				maxValue={Math.max(Math.abs(min), max)}
				keys={['bonus']}
				axisLeft={null}
				axisBottom={null}
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
		<div className={'border border-gray-800 text-xs rounded-lg bg-primary p-2 flex flex-col'}>
			<div>{truncateEthAddress(data.bet)}</div>
			<div className={'flex flex-row items-center gap-1'}>
				Bonus: <BetValue value={Math.abs(data.bonus)} withIcon />
			</div>
		</div>
	);
};

export default BonusChart;
