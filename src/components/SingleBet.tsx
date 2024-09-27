import btcSvg from '@/src/assets/btc.svg';
import { ETHSCAN } from '@/src/global.ts';
import { games } from '@/src/lib';
import { useCurrentRound, useLatestPrice, usePrice } from '@/src/lib/query';
import { type Game, type PredictBet, defaultResult } from '@/src/lib/types.ts';
import { truncateEthAddress, valueToNumber } from '@betfinio/abi';
import { Medal, Pig } from '@betfinio/ui';
import { Bank, Bet } from '@betfinio/ui/dist/icons';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from 'betfinio_app/dialog';
import cx from 'clsx';
import { motion } from 'framer-motion';
import { ArrowDownIcon, ArrowUpIcon, SquareArrowOutUpRight, X } from 'lucide-react';
import { DateTime } from 'luxon';
import millify from 'millify';
import { type FC, useEffect, useState } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import type { CircularProgressbarStyles } from 'react-circular-progressbar/dist/types';
import { useTranslation } from 'react-i18next';

const SingleBet: FC<PredictBet & { loading: boolean }> = (bet) => {
	const amount = valueToNumber(bet.amount);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<motion.div
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					className={cx(
						'border border-gray-800 rounded-lg bg-primaryLight cursor-pointer px-[10px] p-4 flex flex-row items-center py-4 gap-4 relative justify-start',
						bet.side ? 'text-green-600' : 'text-red-500',
						bet.loading && 'animate-pulse text-gray-800 blur-sm',
					)}
				>
					<div className={'border border-gray-800 bg-primary aspect-square w-[32px] rounded-full flex justify-center items-center'}>
						{bet.side ? <ArrowUpIcon className={'w-4'} /> : <ArrowDownIcon className={'w-4'} />}
					</div>
					<div className={cx('flex flex-col w-2/5 text-white', bet.loading && '!text-primary bg-primary rounded-lg')}>
						<span className={'text-sm'}>{truncateEthAddress(bet.player)}</span>
						<span className={cx('text-xs text-gray-500', bet.loading && 'text-primary bg-primary rounded-lg')}>#{Number(bet.round).toString().slice(2)}</span>
					</div>
					<div
						className={cx(
							'whitespace-nowrap flex flex-grow  flex-row gap-[6px] items-center justify-end text-sm',
							bet.loading && 'text-primary bg-primary rounded-lg',
						)}
					>
						{millify(amount, { precision: 2 })} <Bet className={'w-4 h-4'} color={bet.side ? 'green' : 'red'} />
					</div>
				</motion.div>
			</DialogTrigger>
			<DialogContent className={'predict w-fit'} aria-describedby={undefined}>
				<DialogTitle className={'hidden'} />
				<BetModal {...bet} />
			</DialogContent>
		</Dialog>
	);
};
export default SingleBet;

const BetModal: FC<PredictBet> = (bet) => {
	const { t } = useTranslation('predict', { keyPrefix: 'modal' });
	const game = Object.values(games).find((g) => g.address === bet.predictGame) as Game;
	const { data: start = defaultResult, isLoading: isStartLoading } = usePrice(game.dataFeed, Number(bet.round) * game.interval);
	const { data: end = defaultResult, isLoading: isEndLoading } = usePrice(game.dataFeed, (Number(bet.round) + game.duration) * game.interval);
	const [timer, setTimer] = useState<{ mins: number; secs: number }>({ mins: -1, secs: -1 });

	useEffect(() => {
		const i = setInterval(() => {
			const now = Math.floor(Date.now() / 1000);
			const finishRound = (Number(bet.round) + game.duration) * game.interval;
			const timeLeft = finishRound - now;
			setTimer({ mins: Math.floor(timeLeft / 60), secs: timeLeft % 60 });
		}, 1000);
		return () => clearInterval(i);
	}, [bet]);

	const getImage = () => {
		switch (game.name) {
			case 'BTCUSDT':
				return <img src={btcSvg} width={30} height={30} alt={'btc'} />;
			case 'ETHUSDT':
				return <img src={'/eth.svg'} width={30} height={30} alt={'eth'} />;
			case 'MATICUSDT':
				return <img src={'/matic.svg'} width={30} height={30} alt={'matic'} />;
		}
	};

	const { data: latest = defaultResult } = useLatestPrice(game.name);
	const diff = (valueToNumber(((latest.answer as bigint) - start.answer) as bigint, 8) / valueToNumber(start.answer, 8)) * 100;

	const progressStyle: CircularProgressbarStyles = {
		root: {
			width: '100px',
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
	const renderStatus = () => {
		switch (bet.status) {
			case 1n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-yellow-500'}>
						{t('pending')}
					</span>
				);
			case 2n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-green-500'}>
						{t('win')}
					</span>
				);
			case 3n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-red-500'}>
						{t('lost')}
					</span>
				);
			case 4n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-sky-500'}>
						{t('draw')}
					</span>
				);
			case 5n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-yellow-400'}>
						{t('refund')}
					</span>
				);
		}
	};
	const { data: round = Math.round(Date.now() / 1000 / game.interval) } = useCurrentRound(game.interval);

	const isCurrent = Number(bet.round) + game.duration > round;
	const startPrice = valueToNumber(start.answer, 8) || 0;
	const startTime = DateTime.fromMillis(Number(start.timestamp) * 1000).toFormat('HH:mm:ss');
	const endPrice = isCurrent ? valueToNumber(latest.answer, 8) : valueToNumber(end.answer, 8);
	const endTime = DateTime.fromMillis(Number(end.timestamp) * 1000).toFormat('HH:mm:ss');
	return (
		<div
			onClick={(e) => e.stopPropagation()}
			className={
				'rounded-lg relative border border-gray-800  text-white w-full aspect-video max-w-[98vw] md:max-w-[600px] mx-auto bg-primaryLighter py-6 px-8 BET_MODAL'
			}
		>
			<div className={'flex items-center justify-between'}>
				<div className={'flex flex-row items-center gap-2'}>
					{getImage()}
					<span className={'font-semibold text-sm'}>{game.name}</span>
					<a href={`${ETHSCAN}/address/${bet.address}#internaltx`} target={'_blank'} className={'text-sm underline flex gap-2 items-center'} rel="noreferrer">
						{truncateEthAddress(bet.address)}
						<SquareArrowOutUpRight className={'w-4 h-4 text-yellow-400'} />
					</a>
				</div>
				<DialogClose asChild>
					<X className={'w-6 h-6 border-2 p-1 border-gray-200 cursor-pointer rounded-full'} />
				</DialogClose>
			</div>

			<div className={'flex flex-col justify-center items-center gap-2 mt-7'}>
				<div className={'text-center'}>
					<h2 className={'text-gray-500 text-sm'}>{isCurrent ? t('startCurrentPrice') : t('startFinalPrice')}</h2>
					<div className={cx('text-xl font-semibold flex flex-row gap-1 items-center', (isStartLoading || isEndLoading) && 'animate-pulse blur-sm')}>
						<span>{startPrice}$</span>
						<div className={'text-base font-medium flex flex-row gap-1'}>
							{t('at')}
							<span>{startTime}</span>
						</div>
						<span className={cx(diff > 0 ? 'text-green-500' : 'text-red-500')}> / {endPrice}$</span>
						<span className={cx('text-base font-medium')}>
							{t('at')} {endTime}
						</span>
					</div>
				</div>

				<div className={'text-center'}>
					<h2 className={'text-gray-500 text-sm'}>
						{t('betUser')}{' '}
						<span className={cx('text-white', !bet.player && 'animate-pulse rounded-lg bg-black px-4 py-2 text-black w-[200px]')}>
							<a href={`${ETHSCAN}/address/${bet.player}`} target={'_blank'} className={'underline'} rel="noreferrer">
								{truncateEthAddress(bet.player)}
							</a>
						</span>
					</h2>
				</div>

				<div className={'text-gray-600 pt-2 text-sm'}>
					{t('text', {
						amount: (
							<span key={'amount'} className={'text-white font-semibold'}>
								{valueToNumber(bet.amount)} BET
							</span>
						),
						time: (
							<span key={'time'} className={'text-yellow-400'}>
								{DateTime.fromMillis((Number(bet.round) + game.duration) * game.interval * 1000).toFormat('HH:mm')}
							</span>
						),
						side: (
							<span
								key={'side'}
								className={cx('font-semibold p-1 px-2 text-base rounded-lg', bet.side ? 'bg-green-900 text-green-500' : 'bg-red-900 text-red-500')}
							>
								{bet.side ? 'LONG' : 'SHORT'}
							</span>
						),
					})}
				</div>
				<div className={cx(bet.status === 1n ? 'h-[132px]' : 'h-[0]')}>
					<div className={cx(timer.mins < 0 && 'hidden')}>
						<div className={'flex items-center gap-2 px-6 w-full justify-center py-4'}>
							<CircularProgressbar
								styles={progressStyle}
								counterClockwise={true}
								value={(timer.mins / (game.interval / 60)) * 100}
								text={timer.mins.toString()}
							/>
							<span className={'text-xs'}>:</span>
							<CircularProgressbar styles={progressStyle} counterClockwise={true} value={(timer.secs / 60) * 100} text={timer.secs.toString()} />
						</div>
					</div>
				</div>

				<div className={cx((isCurrent || bet.status === 1n) && 'hidden', 'flex flex-col items-center my-2 gap-2 mt-5')}>
					<span className={'text-gray-500'}>{t('status')}</span>
					{renderStatus()}
				</div>
				<div className={'mt-12'}>
					<div className={cx('flex flex-row w-full justify-between gap-8', !(!isCurrent && (bet.status === 2n || bet.status === 3n)) && '!hidden')}>
						<div className={'flex flex-row items-center gap-3 text-sm'}>
							<Medal />
							<span>
								{t('winnings')} <span className={'text font-semibold text-base'}>{valueToNumber(bet.result)} BET</span>
							</span>
						</div>
						<div className={'flex flex-row items-center gap-3 text-sm'}>
							<Pig />
							<span>
								{t('bonus')} <span className={'font-semibold text-base'}>{valueToNumber(bet.bonus)} BET</span>
							</span>
						</div>
						<div className={'flex flex-row items-center gap-3 text-sm'}>
							<span>
								{t('total')}{' '}
								<span className={'font-semibold rounded-lg bg-green-900 text-green-500 p-1 px-2 text-base'}>{valueToNumber(bet.bonus + bet.result)} BET</span>
							</span>
						</div>
					</div>
				</div>
				<div className={'w-full flex flex-row gap-2 mt-4 items-center'}>
					<span className={'font-normal'}>{t('stakingContribution')}</span>
					<span className={'font-semibold'}>{valueToNumber((bet.amount / BigInt(10000)) * BigInt(360))} BET</span>
					<Bank className={'w-6 h-6 text-yellow-400'} />
				</div>
			</div>
		</div>
	);
};
