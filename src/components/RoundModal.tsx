import BetsTable from '@/src/components/BetsTable.tsx';
import { useCalculate, useRoundBets, useRoundInfo } from '@/src/lib/query';
import type { Game, RoundStatus } from '@/src/lib/types';
import { valueToNumber } from '@betfinio/abi';
import { Bank, MoneyHand, People } from '@betfinio/ui/dist/icons';
import { BetValue } from 'betfinio_app/BetValue';
import { DialogClose, DialogContent, DialogTitle } from 'betfinio_app/dialog';
import cx from 'clsx';
import { X } from 'lucide-react';
import { DateTime } from 'luxon';
import { type FC, useEffect, useMemo, useState } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import type { CircularProgressbarStyles } from 'react-circular-progressbar/dist/types';
import { useTranslation } from 'react-i18next';

const RoundModal: FC<{
	round: number;
	game: Game;
}> = ({ round, game }) => {
	const { t } = useTranslation('predict', { keyPrefix: 'roundModal' });
	const { mutate: calculate } = useCalculate();
	const { data: roundData = null, isFetched: isRoundFetched } = useRoundInfo(game, round);
	const { data: bets = [] } = useRoundBets(game.address, round);

	const start = DateTime.fromMillis(round * game.interval * 1000);
	const end = DateTime.fromMillis((round + game.duration) * game.interval * 1000);
	const isFinished = DateTime.fromMillis(Date.now()).diff(end).milliseconds > 0;
	const players = new Set(bets.map((e) => e.player)).size;
	const volume = bets.reduce((a, b) => a + b.amount, 0n);
	const staking = (volume * BigInt(360)) / BigInt(10000);
	const priceStart = roundData?.price.start || 0n;
	const priceEnd = roundData?.price.end || 0n;
	const isLong = priceStart < priceEnd;

	const handleCalculate = async () => {
		calculate({ game, round });
	};

	const handleDistribute = async () => {};

	const status: RoundStatus = useMemo(() => {
		if (!roundData) return t('status.ended') as RoundStatus;
		const last = (round + 1) * game.interval;
		const ended = (round + game.duration) * game.interval;
		const now = Math.floor(Date.now() / 1000);
		if (now < last) return t('status.accepting') as RoundStatus;
		if (now < ended) return t('status.waiting') as RoundStatus;
		if (roundData.calculated) return t('status.calculated') as RoundStatus;
		return t('status.ended') as RoundStatus;
	}, [roundData, round]);

	return (
		<DialogContent className={'predict text-white'} aria-describedby={undefined}>
			<div className={'p-2 md:p-3 lg:p-4 relative lg:min-w-[800px] max-h-[90vh] overflow-y-auto lg:min-h-[650px] flex flex-col justify-between'}>
				<DialogTitle className={'hidden'} />
				<DialogClose asChild>
					<X className={'absolute top-5 right-5 w-6 h-6  border-2 border-white rounded-full cursor-pointer  duration-300'} />
				</DialogClose>
				<div className={'flex flex-row gap-2 justify-start items-center'}>
					<div className={'flex flex-col md:w-1/3 md:whitespace-nowrap'}>
						<div className={'text-xl flex items-center gap-2 cursor-pointer'} onClick={handleCalculate}>
							{t('title')} #{round.toString().slice(2)}
							{isFinished &&
								isRoundFetched &&
								(isLong ? (
									<div className={'text-xl font-semibold text-green-500 flex items-center gap-1'}>{t('long')}</div>
								) : (
									<div className={'text-xl font-semibold text-red-500 flex items-center gap-1'}>{t('short')}</div>
								))}
						</div>

						<span className={'text-gray-400'}>
							{start.toFormat('dd.MM.yyyy / HH:mm:ss')} - {end.toFormat('HH:mm:ss')}
						</span>
					</div>
					{!isFinished && <RoundTimer game={game} end={(round + game.duration) * game.interval} className={'!justify-start'} size={'60px'} />}
				</div>

				<div className={'grid grid-cols-3 gap-4 my-4'}>
					<div className={' bg-primaryLight md:col-span-1 col-span-3 rounded-lg p-4 flex flex-row md:flex-col items-center  justify-between gap-2 py-4'}>
						<People className={'w-8 h-8 md:w-14 md:h-14'} />
						<h2 className={'font-semibold text-xl md:text-2xl'}>
							{t('users', { players })} / {t('bets', { bets: bets.length })}
						</h2>
						<span className={'text-gray-500 hidden md:block'}>{t('activity')}</span>
					</div>
					<div className={' bg-primaryLight md:col-span-1 col-span-3 rounded-lg p-4 flex flex-row md:flex-col items-center justify-between gap-2 py-4'}>
						<MoneyHand className={'w-8 h-8 md:w-14 md:h-14 text-yellow-400'} />
						<h2 className={'font-semibold text-xl md:text-2xl'}>
							<BetValue precision={2} value={valueToNumber(volume)} withIcon={true} />
						</h2>
						<span className={'text-gray-500 hidden md:block '}>{t('volume')}</span>
					</div>
					<div className={' bg-primaryLight md:col-span-1 col-span-3 rounded-lg p-4 flex flex-row md:flex-col items-center  justify-between gap-2 py-4'}>
						<Bank className={'w-8 h-8 md:w-14 md:h-14 text-yellow-400'} />
						<h2 className={'font-semibold text-xl md:text-2xl'}>
							<BetValue value={valueToNumber(staking)} withIcon={true} precision={2} />
						</h2>
						<span className={'text-gray-500 hidden md:block'}>{t('staking')}</span>
					</div>
				</div>
				<BetsTable game={game} round={round} />
				<div className={cx('flex flex-row justify-end w-full p-2', status !== 'ended' && '!hidden')}>
					<button type={'button'} className={'rounded-md px-4 py-2 bg-yellow-400 text-black '} onClick={handleCalculate}>
						{t('calculateResult')}
					</button>
				</div>
			</div>
		</DialogContent>
	);
};
export default RoundModal;

export const RoundTimer: FC<{ game: Game; end: number; className?: string; size?: string }> = ({ game: { interval }, end, className = '', size = '100px' }) => {
	const progressStyle: CircularProgressbarStyles = {
		root: {
			width: size,
		},
		path: {
			strokeLinecap: 'round',
			stroke: '#FFC800',
			strokeWidth: '6px',
		},
		trail: {
			stroke: 'rgba(256, 256, 256, 0.2)',
			strokeWidth: '1px',
		},
		text: {
			fill: 'white',
			fontSize: '30px',
		},
	};

	useEffect(() => {
		const i = setInterval(() => {
			const now = Math.floor(Date.now() / 1000);
			const timeLeft = end - now;
			setTimer({ mins: Math.floor(timeLeft / 60), secs: timeLeft % 60 });
		}, 500);
		return () => clearInterval(i);
	}, []);

	const [timer, setTimer] = useState({ mins: 0, secs: 0 });
	return (
		<div className={cx('flex items-center gap-2 px-6 w-full justify-center', className)}>
			<CircularProgressbar styles={progressStyle} counterClockwise={true} value={(timer.mins / (interval / 60)) * 100} text={timer.mins.toString()} />
			<span className={'text-xs'}>:</span>
			<CircularProgressbar styles={progressStyle} counterClockwise={true} value={(timer.secs / 60) * 100} text={timer.secs.toString()} />
		</div>
	);
};
