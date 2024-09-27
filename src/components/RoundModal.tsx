import BetsTable from '@/src/components/BetsTable.tsx';
import BonusChart from '@/src/components/BonusChart.tsx';
import i18n from '@/src/i18n.ts';
import { useCalculate, useRoundBets, useRoundInfo } from '@/src/lib/query';
import type { Game, PredictBet, RoundStatus } from '@/src/lib/types';
import { valueToNumber } from '@betfinio/abi';
import { Bank, MoneyHand, People } from '@betfinio/ui/dist/icons';
import { useRouter } from '@tanstack/react-router';
import { BetValue } from 'betfinio_app/BetValue';
import { DialogContent, DialogTitle } from 'betfinio_app/dialog';
import cx from 'clsx';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { DateTime } from 'luxon';
import millify from 'millify';
import { type FC, useEffect, useMemo, useState } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import type { CircularProgressbarStyles } from 'react-circular-progressbar/dist/types';
import { Trans, useTranslation } from 'react-i18next';

const RoundModal: FC<{
	round: number;
	game: Game;
}> = ({ round, game }) => {
	const { t } = useTranslation('predict', { keyPrefix: 'roundModal' });
	const { mutate: calculate } = useCalculate();
	const start = DateTime.fromMillis(round * game.interval * 1000);
	const end = DateTime.fromMillis((round + game.duration) * game.interval * 1000);
	const isFinished = DateTime.fromMillis(Date.now()).diff(end).milliseconds > 0;
	const { data: roundData = null, isFetched: isRoundFetched } = useRoundInfo(game, round);
	const { data: bets, isFetched } = useRoundBets(game.address, round);
	const players = new Set(bets.map((e) => e.player)).size;
	const volume = bets.reduce((a, b) => a + b.amount, 0n);
	const staking = (volume * BigInt(360)) / BigInt(10000);
	const totalBonus = (volume * BigInt(4)) / BigInt(100);
	const priceStart = roundData?.price.start || 0n;
	const priceEnd = roundData?.price.end || 0n;
	const isLong = priceStart < priceEnd;

	const router = useRouter();

	const bonuses = useMemo(() => {
		return bets.reduce((acc: Array<{ bet: PredictBet; bonus: number }>, val) => {
			if (val.bonus > 0n) {
				acc.push({ bet: val, bonus: valueToNumber(val.bonus) });
			}
			return acc;
		}, []);
	}, [bets]);

	const coef = isLong
		? Number((roundData?.pool?.long || 0n) + (roundData?.pool?.short || 0n)) / Number(roundData?.pool?.long || 0n)
		: Number((roundData?.pool?.long || 0n) + (roundData?.pool?.short || 0n)) / Number(roundData?.pool?.short || 0n);

	const handleCalculate = async () => {
		calculate({ game, round });
	};

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
	const handleClose = () => {
		router?.navigate({ to: `/predict/${game.name}` });
	};
	useEffect(() => {
		if (isRoundFetched && roundData && roundData.pool.long + roundData.pool.short === 0n) {
			router?.navigate({ to: `/predict/${game.name}`, replace: true });
		}
	}, [isRoundFetched, roundData]);

	if (roundData === null || roundData.pool.long + roundData.pool.short === 0n) return null;
	return (
		<DialogContent className={'predict text-white'} aria-describedby={undefined}>
			<DialogTitle className={'hidden'} />
			<motion.div
				onClick={(e) => e.stopPropagation()}
				className={
					'border relative mx-auto border-gray-800 bg-primary w-full max-w-[1000px] lg:min-w-[800px]  max-h-[800px] min-h-[300px] rounded-lg flex flex-col p-2 md:p-8 pt-5'
				}
			>
				<X
					className={
						'absolute top-5 right-5 w-6 h-6  border-2 border-white rounded-full cursor-pointer hover:text-[#EB5757] hover:border-[#EB5757] duration-300'
					}
					onClick={handleClose}
				/>
				<div className={'flex flex-row gap-2 justify-start items-center'}>
					<div className={'flex flex-col gap-1 md:w-1/3 md:whitespace-nowrap'} onClick={handleCalculate}>
						<div className={'text-2xl flex items-center gap-5'}>
							<span>
								{t('title')} #{round.toString().slice(2)}
							</span>
							{isFinished &&
								(isLong ? (
									<div className={'text-2xl font-semibold text-green-500 flex items-center gap-1'}>
										{t('long')} ({coef === Number.POSITIVE_INFINITY ? 1 : coef.toFixed(2)}x)
									</div>
								) : (
									<div className={'text-2xl font-semibold text-red-500 flex items-center gap-1'}>
										{t('short')} ({coef === Number.POSITIVE_INFINITY ? 1 : coef.toFixed(2)}x)
									</div>
								))}
						</div>
						<span className={'-mt-1'}>
							{start.toFormat('dd.MM.yyyy / HH:mm')} - {end.toFormat('HH:mm')}
						</span>
					</div>
					{!isFinished && <RoundTimer game={game} end={(round + game.duration) * game.interval} className={'!justify-start'} size={'60px'} />}
				</div>

				{isFinished && (
					<div className={'flex flex-col gap-2 md:flex-row md:gap-10 mt-2 items-start'}>
						<div className={'flex flex-col gap-2'}>
							<span className={' flex gap-2'}>
								{t('totalBonus')}
								<BetValue value={valueToNumber(totalBonus)} withIcon={true} className={'text-yellow-400'} />
							</span>

							<div className={'px-4 py-2 border rounded-[10px] border-yellow-400 hidden md:block'}>
								<BonusChart bonuses={bonuses} oneWay={true} minBars={0} />
							</div>
						</div>

						<div className={' gap-5 md:gap-1 flex md:flex-col'}>
							<div>
								<Trans
									t={t}
									i18nKey={'longShortRatio'}
									i18n={i18n}
									components={{ green: <span className={'text-green-500'} />, red: <span className={'text-red-500'} /> }}
								/>
							</div>
							<div className={'flex h-[36px] md:h-[40px] flex-row w-[200px] text-white items-center rounded-md overflow-hidden'}>
								<div
									className={'px-1 py-[6px] h-full bg-opacity-30 bg-green-900 text-green-500 flex flex-row items-center gap-1'}
									style={{
										width: `${(valueToNumber(roundData.pool.long) / (valueToNumber(roundData.pool.long) + valueToNumber(roundData.pool.long))) * 100}%`,
									}}
								>
									{millify(valueToNumber(roundData.pool.long), { precision: 2 })}
								</div>
								<div
									className={' px-1 py-[6px] h-full bg-opacity-30 bg-red-900 text-red-500 flex flex-row items-center gap-1 justify-end'}
									style={{
										width: `${(valueToNumber(roundData.pool.long) / (valueToNumber(roundData.pool.long) + valueToNumber(roundData.pool.long))) * 100}%`,
									}}
								>
									{millify(valueToNumber(roundData.pool.long), { precision: 2 })}
								</div>
							</div>
						</div>
					</div>
				)}

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
				{/*<BonusChart bonuses={bonuses} />*/}
				<BetsTable isFetching={!isFetched} bets={bets} isFinished={isFinished} />
				<div className={cx('flex flex-row justify-end w-full p-2', status !== 'ended' && '!hidden')}>
					<button type={'button'} className={'rounded-md px-4 py-2 bg-yellow-400 text-black '} onClick={handleCalculate}>
						{t('calculateResult')}
					</button>
				</div>
			</motion.div>
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
