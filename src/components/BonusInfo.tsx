import BonusChart from '@/src/components/BonusChart.tsx';
import { useCurrentRound, usePool, useRoundBets } from '@/src/lib/query';
import type { Game } from '@/src/lib/types';
import { valueToNumber } from '@betfinio/abi';
import { BetValue } from 'betfinio_app/BetValue';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const BonusInfo: FC<{ game: Game }> = ({ game }) => {
	const { t } = useTranslation('predict');
	const { data: round } = useCurrentRound(game.interval);
	const { data: pool } = usePool(game.address, round);
	const { data: bets = [] } = useRoundBets(game.address, round);

	const stakes = bets.reduce(
		(st, bet, index) => {
			return {
				long: st.long + bet.amount * BigInt(bets.length - index) * (bet.side ? 1n : 0n),
				short: st.short + bet.amount * BigInt(bets.length - index) * (bet.side ? 0n : 1n),
			};
		},
		{ long: 0n, short: 0n },
	);

	const bonuses = bets.map((bet, index) => {
		const bonusPool = (((pool?.short || 0n) + (pool?.long || 0n)) / 100n) * 5n;
		const weight = bet.amount * BigInt(bets.length - index);
		return {
			bet,
			index,
			bonus: valueToNumber((bonusPool * weight) / (bet.side ? stakes.long : stakes.short)),
		};
	});

	if (!pool) return null;

	return (
		<div className={'h-full'}>
			<h1 className={'flex gap-1 text-xl font-semibold pl-2'}>
				{t('bonus.title')}
				<div className={'text-blue-500'}>
					<BetValue value={0n} iconClassName={'!text-blue-500'} precision={2} withIcon={true} />
				</div>
			</h1>
			<div className={'bg-primaryLight rounded-md p-2 lg:p-4 flex flex-col  justify-between gap-2 lg:gap-4 '}>
				<div className={'relative h-[200px] lg:w-[80%] mx-auto'}>
					<BonusChart bonuses={bonuses} />
				</div>
				<div className={'text-xs text-[#959DAD] italic'}>
					<div className={'text-center'}>
						The bonus represents <span className={'text-yellow-400'}>4%</span> of all bets{' '}
						<span className={'text-yellow-400'}>{valueToNumber(pool.long + pool.short).toLocaleString()}</span> that are split among winners according to
						<span className={'text-yellow-400'}>order</span> and <span className={'text-yellow-400'}>size</span> of bets.
					</div>
					<p className={'text-center font-semibold'}>{t('bonus.info')}</p>
				</div>
			</div>
		</div>
	);
};

export default BonusInfo;
