import 'react-circular-progressbar/dist/styles.css';
import i18n from '@/src/i18n.ts';
import { useCurrentRound, useLatestPrice, usePrice } from '@/src/lib/query';
import { type Game, defaultResult } from '@/src/lib/types';
import { valueToNumber } from '@betfinio/abi';
import cx from 'clsx';
import { DateTime } from 'luxon';
import { type FC, useEffect, useState } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import type { CircularProgressbarStyles } from 'react-circular-progressbar/dist/types';
import { Trans, useTranslation } from 'react-i18next';

const RoundConditions: FC<{ game: Game }> = ({ game }) => {
	const { t } = useTranslation('predict', { keyPrefix: 'roundConditions' });
	const { data: price = defaultResult, isFetched: isLatestPriceFetched } = useLatestPrice(game.name);
	const { data: round, isFetching } = useCurrentRound(game.interval);
	const { data: start = defaultResult } = usePrice(game.dataFeed, round * game.interval);

	return (
		<div className={'flex flex-col gap-4 h-full items-center col-span-4 md:col-span-3 md:col-start-2 lg:col-start-1 relative'}>
			<h2 className={'font-medium uppercase'}>
				{t('title')} #{round.toString().slice(2)}
			</h2>
			<div className={cx('w-full border border-gray-800 rounded-[10px] bg-primaryLight p-2 py-5', isFetching && 'animate-pulse blur-sm')}>
				<div className={'flex flex-col items-center relative justify-center gap-4 w-[285px] aspect-square mx-auto'}>
					<Clock game={game} />
					<div className={'text-center flex flex-col gap-1'}>
						<h4 className={'font-medium text-xs text-gray-500'}>
							<Trans
								t={t}
								values={{ time: DateTime.fromMillis(Number(start.timestamp) * 1000).toFormat('HH:mm') }}
								i18nKey={'price'}
								i18n={i18n}
								components={{ b: <b className={'text-yellow-400 font-semibold'} /> }}
							/>
						</h4>
						<div
							className={cx('rounded-[10px] mt-1 text-center text-sm bg-primary px-4 py-2 font-semibold text-yellow-400', {
								'animate-pulse blur-sm': !isLatestPriceFetched,
							})}
						>
							{valueToNumber(start.answer, 8)}$
						</div>
					</div>

					<Timer game={game} />
					<div className={'text-center flex flex-col gap-1'}>
						<h4 className={'font-medium text-gray-500 text-xs'}>{t('currentPrice')}</h4>
						<div
							className={cx(
								'rounded-[10px] w-full text-center text-sm bg-primary px-4 py-2 font-semibold',
								price.answer > start.answer ? ' text-green-500' : 'text-red-500',
							)}
						>
							{valueToNumber(price.answer, 8)}$
						</div>
					</div>
				</div>

				<div className={'flex justify-center  text-gray-500 text-xs mt-6'}>
					<Trans
						t={t}
						values={{ time: DateTime.fromMillis((round + 4) * game.interval * 1000).toFormat('TT') }}
						i18nKey={'description'}
						i18n={i18n}
						components={{
							green: <span className={'text-green-500 px-1'} />,
							red: <span className={'text-red-500 px-1'} />,
							yellow: <span className={'text-yellow-400 pl-1'} />,
						}}
					/>
				</div>
			</div>
		</div>
	);
};

export const Clock: FC<{ game: Game; className?: string }> = ({ game: { interval } }) => {
	const progressStyle: CircularProgressbarStyles = {
		root: {
			width: '100%',
			position: 'absolute',
		},
		path: {
			strokeLinecap: 'round',
			stroke: '#FFC800',
			strokeWidth: '2px',
		},
		trail: {
			stroke: 'rgba(256, 256, 256, 0.2)',
			strokeWidth: '1px',
			width: '100%',
		},
		text: {
			fill: 'white',
			fontSize: '30px',
		},
	};

	useEffect(() => {
		const i = setInterval(() => {
			const now = Math.floor(Date.now() / 1000);
			const currentRoundStarted = Math.floor(now / interval) * interval;
			const nextRoundStart = currentRoundStarted + interval;
			const timeLeft = nextRoundStart - now;
			setTimer(timeLeft);
		}, 500);
		return () => clearInterval(i);
	}, [interval]);

	const [timer, setTimer] = useState(0);
	return <CircularProgressbar styles={progressStyle} counterClockwise={true} value={(timer / interval) * 100} />;
};

export const Timer: FC<{ game: Game; className?: string; size?: string }> = ({ game: { interval }, className = '' }) => {
	useEffect(() => {
		const i = setInterval(() => {
			const now = Math.floor(Date.now() / 1000);
			const currentRoundStarted = Math.floor(now / interval) * interval;
			const nextRoundStart = currentRoundStarted + interval;
			const timeLeft = nextRoundStart - now;
			setTimer({ mins: Math.floor(timeLeft / 60), secs: timeLeft % 60 });
		}, 500);
		return () => clearInterval(i);
	}, [interval]);

	const [timer, setTimer] = useState({ mins: 0, secs: 0 });
	return (
		<div className={cx('text-3xl', className)}>
			{timer.mins < 10 ? `0${timer.mins}` : timer.mins}:{timer.secs < 10 ? `0${timer.secs}` : timer.secs}
		</div>
	);
};

export default RoundConditions;
