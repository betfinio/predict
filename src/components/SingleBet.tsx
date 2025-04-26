import btcSvg from '@/src/assets/btc.svg';
import { ETHSCAN } from '@/src/global.ts';
import { games } from '@/src/lib';
import { useCurrentRound, useLatestPrice, usePrice } from '@/src/lib/query';
import { type Game, type PredictBet, defaultResult } from '@/src/lib/types.ts';
import { truncateEthAddress, valueToNumber } from '@betfinio/abi';
import { Bank, Medal, Pig } from '@betfinio/components/icons';
import { cn } from '@betfinio/components/lib';
import { BetValue } from '@betfinio/components/shared';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@betfinio/components/ui';
import { useUsername } from 'betfinio_context/lib/query';
import { ArrowDownIcon, ArrowUpIcon, SquareArrowOutUpRight, X } from 'lucide-react';
import { DateTime } from 'luxon';
import { motion } from 'motion/react';
import { type FC, useEffect, useState } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import type { CircularProgressbarStyles } from 'react-circular-progressbar/dist/types';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';

const SingleBet: FC<PredictBet & { loading: boolean }> = (bet) => {
	const amount = valueToNumber(bet.amount);

	const { address } = useAccount();
	const { data: username } = useUsername(bet.player, address);

	const formatPlayer = (player?: string) => {
		if (!player) return '';
		if (player.length > 12) {
			return `${player.slice(0, 12)}...`;
		}
		return player;
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<motion.div
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					className={cn(
						'border border-border rounded-lg bg-background-light cursor-pointer px-[10px] p-4 flex flex-row items-center py-4 gap-4 relative justify-start',
						bet.side ? 'text-success' : 'text-destructive',
						bet.loading && 'animate-pulse text-muted-foreground blur-xs',
					)}
				>
					<div className={'border border-border bg-background aspect-square w-[32px] rounded-full flex justify-center items-center'}>
						{bet.side ? <ArrowUpIcon className={'w-4'} /> : <ArrowDownIcon className={'w-4'} />}
					</div>
					<div className={cn('flex flex-col w-2/5 text-foreground', bet.loading && 'text-background! bg-background rounded-lg')}>
						<span className={'text-sm'}>{formatPlayer(username)}</span>
						<span className={cn('text-xs text-muted-foreground', bet.loading && 'rounded-lg')}>#{Number(bet.round).toString().slice(2)}</span>
					</div>
					<div className={cn('whitespace-nowrap flex grow  flex-row gap-[6px] items-center justify-end text-sm', bet.loading && 'rounded-lg')}>
						<BetValue value={amount} withIcon iconClassName={cn('w-4 h-4', bet.side ? 'text-success' : 'text-destructive')} />
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
	const game = Object.values(games).find((g) => g.address?.toLowerCase() === bet.predictGame) as Game;

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
			stroke: 'hsl(var(--primary))',
			strokeWidth: '6px',
		},
		trail: {
			stroke: 'rgba(256, 256, 256, 0.2)',
			strokeWidth: '1px',
		},
		text: {
			fill: 'hsl(var(--foreground))',
			fontSize: '30px',
		},
	};
	const renderStatus = () => {
		switch (bet.status) {
			case 1n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-secondary-foreground '}>
						{t('pending')}
					</span>
				);
			case 2n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-success'}>
						{t('win')}
					</span>
				);
			case 3n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-destructive'}>
						{t('lost')}
					</span>
				);
			case 4n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-bonus'}>
						{t('draw')}
					</span>
				);
			case 5n:
				return (
					<span key={Number(bet.status)} className={'text-4xl uppercase font-semibold text-secondary-foreground'}>
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
				'rounded-lg relative border border-border  text-foreground w-full aspect-video max-w-[98vw] md:max-w-[600px] mx-auto bg-background-lighter py-6 px-8 BET_MODAL'
			}
		>
			<div className={'flex items-center justify-between'}>
				<div className={'flex flex-row items-center gap-2'}>
					{getImage()}
					<span className={'font-semibold text-sm'}>{game.name}</span>
					<a href={`${ETHSCAN}/address/${bet.address}#internaltx`} target={'_blank'} className={'text-sm underline flex gap-2 items-center'} rel="noreferrer">
						{truncateEthAddress(bet.address)}
						<SquareArrowOutUpRight className={'w-4 h-4 text-secondary-foreground'} />
					</a>
				</div>
				<DialogClose asChild>
					<X className={'w-6 h-6 border-2 p-1 border-gray-200 cursor-pointer rounded-full'} />
				</DialogClose>
			</div>

			<div className={'flex flex-col justify-center items-center gap-2 mt-7'}>
				<div className={'text-center'}>
					<h2 className={'text-muted-foreground text-sm'}>{isCurrent ? t('startCurrentPrice') : t('startFinalPrice')}</h2>
					<div className={cn('text-xl font-semibold flex flex-row gap-1 items-center', (isStartLoading || isEndLoading) && 'animate-pulse blur-xs')}>
						<span>{startPrice}$</span>
						<div className={'text-base font-medium flex flex-row gap-1'}>
							{t('at')}
							<span>{startTime}</span>
						</div>
						<span className={cn(diff > 0 ? 'text-success' : 'text-destructive')}> / {endPrice}$</span>
						<span className={cn('text-base font-medium')}>
							{t('at')} {endTime}
						</span>
					</div>
				</div>

				<div className={'text-center'}>
					<h2 className={'text-muted-foreground text-sm'}>
						{t('betUser')}{' '}
						<span className={cn('text-foreground', !bet.player && 'animate-pulse rounded-lg bg-black px-4 py-2 text-primary-foreground w-[200px]')}>
							<a href={`${ETHSCAN}/address/${bet.player}`} target={'_blank'} className={'underline'} rel="noreferrer">
								{truncateEthAddress(bet.player)}
							</a>
						</span>
					</h2>
				</div>

				<div className={'text-muted-foreground pt-2 text-sm'}>
					{t('text', {
						amount: (
							<span key={'amount'} className={'text-foreground font-semibold'}>
								{valueToNumber(bet.amount)} BET
							</span>
						),
						time: (
							<span key={'time'} className={'text-secondary-foreground'}>
								{DateTime.fromMillis((Number(bet.round) + game.duration) * game.interval * 1000).toFormat('HH:mm')}
							</span>
						),
						side: (
							<span
								key={'side'}
								className={cn('font-semibold p-1 px-2 text-base rounded-lg', bet.side ? 'bg-green-900 text-success' : 'bg-red-900 text-destructive')}
							>
								{bet.side ? 'LONG' : 'SHORT'}
							</span>
						),
					})}
				</div>
				<div className={cn(bet.status === 1n ? 'h-[132px]' : 'h-0')}>
					<div className={cn(timer.mins < 0 && 'hidden')}>
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

				<div className={cn((isCurrent || bet.status === 1n) && 'hidden', 'flex flex-col items-center my-2 gap-2 mt-5')}>
					<span className={'text-muted-foreground'}>{t('status')}</span>
					{renderStatus()}
				</div>
				<div className={'mt-12'}>
					<div className={cn('flex flex-row w-full justify-between gap-8', !(!isCurrent && (bet.status === 2n || bet.status === 3n)) && 'hidden!')}>
						<div className={'flex flex-row items-center gap-3 text-sm'}>
							<Medal />
							<span>
								{t('winnings')}
								<BetValue value={bet.result} withIcon />
							</span>
						</div>
						<div className={'flex flex-row items-center gap-3 text-sm'}>
							<Pig />
							<span>
								{t('bonus')} <BetValue value={bet.bonus} withIcon />
							</span>
						</div>
						<div className={'flex flex-row items-center gap-3 text-sm'}>
							{t('total')}
							<span className={'font-semibold rounded-lg bg-green-900  text-success-foreground p-1 px-2 text-base'}>
								<BetValue value={bet.bonus + bet.result} withIcon />
							</span>
						</div>
					</div>
				</div>
				<div className={'w-full flex flex-row gap-2 mt-4 items-center'}>
					<span className={'font-normal'}>{t('stakingContribution')}</span>
					<span className={'font-semibold'}>{valueToNumber((bet.amount / BigInt(10000)) * BigInt(360))} BET</span>
					<Bank className={'w-6 h-6 text-secondary-foreground'} />
				</div>
			</div>
		</div>
	);
};
