import BonusChart from '@/src/components/BonusChart.tsx';
import i18n from '@/src/i18n.ts';
import { useCurrentRound, usePool, useRoundBets } from '@/src/lib/query';
import type { Game } from '@/src/lib/types';
import { valueToNumber } from '@betfinio/abi';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from 'betfinio_app/tooltip';
import { CircleHelp } from 'lucide-react';
import type { FC } from 'react';
import { Trans, useTranslation } from 'react-i18next';

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
			<div className={'bg-primaryLight rounded-md p-2 lg:p-4 flex flex-col relative  justify-between gap-2 lg:gap-4 '}>
				<div className={'relative h-[200px] w-full'}>
					<BonusChart bonuses={bonuses} />
				</div>
				<TooltipProvider delayDuration={0}>
					<Tooltip>
						<TooltipTrigger className={'absolute bottom-3 right-3'}>
							<CircleHelp className={'w-5 h-5'} />
						</TooltipTrigger>
						<TooltipContent>
							<div className={'text-xs text-gray-500 italic'}>
								<div className={'text-center'}>
									<Trans
										t={t}
										i18nKey={'bonus.explain'}
										values={{ bonus: (valueToNumber(pool.short + pool.long) / 25).toLocaleString() }}
										i18n={i18n}
										components={{ b: <b className={'text-yellow-400 font-medium'} /> }}
									/>
								</div>
								<p className={'text-center font-semibold'}>{t('bonus.info')}</p>
							</div>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
};

export default BonusInfo;
