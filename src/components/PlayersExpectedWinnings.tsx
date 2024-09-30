import { useCurrentRound, useRoundBets } from '@/src/lib/query';
import type { Game } from '@/src/lib/types.ts';
import { ZeroAddress, valueToNumber } from '@betfinio/abi';
import { Bet } from '@betfinio/ui/dist/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from 'betfinio_app/tooltip';
import cx from 'clsx';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import millify from 'millify';
import { type FC, useMemo } from 'react';
import { useAccount } from 'wagmi';

const PlayersExpectedWinnings: FC<{ game: Game }> = ({ game }) => {
	const { data: round } = useCurrentRound(game.interval);
	const { address = ZeroAddress } = useAccount();
	const { data: bets = [], isFetching: isBetsFetched } = useRoundBets(game.address, round);

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
	return (
		<div className={'grid grid-cols-2 gap-4 w-full'}>
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger>
						<div className={'bg-primary rounded-lg p-2 flex flex-col justify-center items-center '}>
							<div className={'w-full flex flex-row justify-center gap-1 text-green-500 font-semibold'}>
								<ArrowUpIcon className={'h-3 w-3'} />
								<div className={cx('flex flex-row gap-1 items-center', { 'animate-pulse blur-sm': isBetsFetched })}>
									{millify(expected.long, { precision: 2 })}
									<Bet className={'w-3 h-3'} color={'green'} />
								</div>
							</div>
							<div className={'w-full flex flex-row items-center  gap-1 justify-center text-blue-500 opacity-70 text-xs'}>
								+ {expected.longBonus.toFixed(2)} <Bet className={'w-[10px] h-[10px]'} />
							</div>
						</div>
					</TooltipTrigger>
					<TooltipContent>{`${(expected.longBonus + expected.long).toFixed(2)} BET`}</TooltipContent>
				</Tooltip>
				<Tooltip>
					<div className={'bg-primary rounded-lg p-2 flex flex-col justify-center items-center '}>
						<TooltipTrigger>
							<div className={'w-full flex flex-row justify-center gap-1 text-red-500 font-semibold'}>
								<ArrowDownIcon className={'h-3 w-3'} />
								<div className={cx('flex flex-row gap-1 items-center', { 'animate-pulse blur-sm': isBetsFetched })}>
									{millify(expected.short, { precision: 2 })}
									<Bet className={'w-3 h-3'} color={'red'} />
								</div>
							</div>
							<div className={'w-full flex flex-row items-center  gap-1 justify-center text-blue-500 opacity-70 text-xs'}>
								+ {expected.shortBonus.toFixed(2)} <Bet className={'w-[10px] h-[10px]'} />
							</div>
						</TooltipTrigger>
						<TooltipContent>{`${(expected.shortBonus + expected.short).toFixed(2)} BET`}</TooltipContent>
					</div>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
};

export default PlayersExpectedWinnings;
