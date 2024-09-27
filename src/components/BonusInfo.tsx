import BonusChart from '@/src/components/BonusChart.tsx';
import { useCurrentRound, usePool, useRoundBets } from '@/src/lib/query';
import type { Game } from '@/src/lib/types';
import { ZeroAddress, valueToNumber } from '@betfinio/abi';
import { BetValue } from 'betfinio_app/BetValue';
import { type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';

const BonusInfo: FC<{ game: Game }> = ({ game }) => {
	const { t } = useTranslation('predict');
	const { data: round } = useCurrentRound(game.interval);
	const { data: pool } = usePool(game.address, round);
	const { data: bets } = useRoundBets(game.address, round);
	const { address = ZeroAddress } = useAccount();

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
			bonus: valueToNumber((bonusPool * weight) / (bet.side ? stakes.long : stakes.short)),
		};
	});

	const expected = useMemo(() => {
		const userPool = bets.reduce(
			(st, bet) => {
				if (bet.player.toLowerCase() !== address.toLowerCase()) return st;
				return {
					long: st.long + valueToNumber(bet.amount) * (bet.side ? 1 : 0),
					short: st.short + valueToNumber(bet.amount) * (bet.side ? 0 : 1),
				};
			},
			{ long: 0, short: 0 },
		);
		if (userPool.long === 0 && userPool.short === 0) return { long: 0, short: 0, longBonus: 0, shortBonus: 0 };
		const pool = bets.reduce(
			(st, bet) => {
				return {
					long: st.long + valueToNumber(bet.amount) * (bet.side ? 1 : 0),
					short: st.short + valueToNumber(bet.amount) * (bet.side ? 0 : 1),
				};
			},
			{ long: 0, short: 0 },
		);

		if (pool.long === 0 || pool.short === 0) {
			return { long: userPool.long, short: userPool.short, longBonus: 0, shortBonus: 0 };
		}

		const totalPool = pool.long + pool.short;
		const bonusPool = (totalPool * 4) / 100;
		const winPool = totalPool - bonusPool;
		const longShares = bets.map((bet, index) => valueToNumber(bet.amount) * (bet.side ? 1 : 0) * (bets.length - index)).reduce((a, b) => a + b, 0);
		const shortShares = bets.map((bet, index) => valueToNumber(bet.amount) * (bet.side ? 0 : 1) * (bets.length - index)).reduce((a, b) => a + b, 0);
		const predictedWinLong: { player: string; bonus: number; win: number }[] = [];
		for (let i = 0; i < bets.length; i++) {
			const bet = bets[i];
			if (!bet.side) {
				predictedWinLong.push({ player: bet.player.toLowerCase(), bonus: 0, win: 0 });
				continue;
			}
			const win = (winPool * valueToNumber(bet.amount)) / pool.long;
			const bonus = (bonusPool * valueToNumber(bet.amount) * (bets.length - i)) / longShares;
			predictedWinLong.push({ player: bet.player.toLowerCase(), bonus, win });
		}
		const predictedWinShort: { player: string; bonus: number; win: number }[] = [];
		for (let i = 0; i < bets.length; i++) {
			const bet = bets[i];
			if (bet.side) {
				predictedWinShort.push({ player: bet.player.toLowerCase(), bonus: 0, win: 0 });
				continue;
			}
			const win = (winPool * valueToNumber(bet.amount)) / pool.short;
			const bonus = (bonusPool * valueToNumber(bet.amount) * (bets.length - i)) / shortShares;
			predictedWinShort.push({ player: bet.player.toLowerCase(), bonus, win });
		}

		return {
			long: predictedWinLong.filter((bet) => bet.player.toLowerCase() === address.toLowerCase()).reduce((s, b) => s + b.win, 0),
			short: predictedWinShort.filter((bet) => bet.player.toLowerCase() === address.toLowerCase()).reduce((s, b) => s + b.win, 0),
			longBonus: predictedWinLong.filter((bet) => bet.player.toLowerCase() === address.toLowerCase()).reduce((s, b) => s + b.bonus, 0),
			shortBonus: predictedWinShort.filter((bet) => bet.player.toLowerCase() === address.toLowerCase()).reduce((s, b) => s + b.bonus, 0),
		};
	}, [bets]);
	const myBonus = Math.max(expected.longBonus, expected.shortBonus);
	if (!pool) return null;

	return (
		<div className={'h-full'}>
			<h1 className={'flex gap-1 text-xl font-semibold pl-2'}>
				{t('bonus.title')}
				<div className={'text-blue-500'}>
					<BetValue value={myBonus} iconClassName={'!text-blue-500'} precision={2} withIcon={true} />
				</div>
			</h1>
			<div className={'bg-primaryLight rounded-[10px] px-2 md:px-[30px] py-5 flex flex-col  justify-between '}>
				<div className={'relative'}>
					<div className={'relative my-4 md:my-0 w-full py-4 h-[200px] lg:max-w-[1000px] mx-auto'}>
						<BonusChart bonuses={bonuses} />
					</div>
				</div>
				<div className={'text-xs text-[#959DAD] italic'}>
					<div className={'text-center'}>
						The bonus represents <span className={'text-yellow-400'}>4%</span> of all bets{' '}
						<span className={'text-yellow-400'}>{valueToNumber(pool?.long + pool?.short).toLocaleString()}</span> that are split among winners according to{' '}
						<span className={'text-yellow-400'}>order</span> and <span className={'text-yellow-400'}>size</span> of bets.
					</div>
					<p className={'text-center font-semibold'}>{t('bonus.info')}</p>
				</div>
			</div>
		</div>
	);
};

export default BonusInfo;
