import PlayersExpectedWinnings from '@/src/components/PlayersExpectedWinnings.tsx';
import { useCurrentRound, usePlaceBet, usePlayerBets, useRoundBets } from '@/src/lib/query';
import type { Game, RoundPool } from '@/src/lib/types';
import { ZeroAddress, valueToNumber } from '@betfinio/abi';
import { Bet } from '@betfinio/ui/dist/icons';
import { useAllowanceModal } from 'betfinio_app/allowance';
import { useIsMember } from 'betfinio_app/lib/query/pass';
import { useAllowance, useBalance } from 'betfinio_app/lib/query/token';
import { toast } from 'betfinio_app/use-toast';
import cx from 'clsx';
import { motion } from 'framer-motion';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import millify from 'millify';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NumericFormat } from 'react-number-format';
import { useAccount } from 'wagmi';

const PlaceBet: FC<{ game: Game }> = ({ game }) => {
	const { t } = useTranslation('predict', { keyPrefix: 'placeBet' });
	const [amount, setAmount] = useState<string>('5000');
	const { address = ZeroAddress } = useAccount();
	const { data: isMember = false } = useIsMember(address);
	const { data: allowance = 0n, isFetching: loading } = useAllowance(address);
	const { data: balance = 0n } = useBalance(address);
	const { data: round } = useCurrentRound(game.interval);
	const { requestAllowance, requested, setResult } = useAllowanceModal();
	useEffect(() => {
		if (requested) {
			handleBet(s);
		}
	}, [requested]);
	const { mutate: placeBet, data, isSuccess } = usePlaceBet();
	useEffect(() => {
		if (data && isSuccess) {
			setResult?.(data);
		}
	}, [isSuccess, data]);
	const { data: roundBets = [] } = useRoundBets(game.address, round);
	const [pool, setPool] = useState<RoundPool>({
		long: 0n,
		short: 0n,
		longPlayersCount: 0,
		shortPlayersCount: 0,
		longCount: 0,
		shortCount: 0,
	});

	useEffect(() => {
		const p: RoundPool = {
			long: roundBets.filter((e) => e.side).reduce((a, b) => a + b.amount, 0n),
			short: roundBets.filter((e) => !e.side).reduce((a, b) => a + b.amount, 0n),
			longPlayersCount: new Set(roundBets.filter((e) => e.side).map((e) => e.player)).size,
			shortPlayersCount: new Set(roundBets.filter((e) => !e.side).map((e) => e.player)).size,
			longCount: roundBets.filter((e) => e.side).length,
			shortCount: roundBets.filter((e) => !e.side).length,
		};
		setPool(p);
	}, [roundBets]);

	const [s, setSide] = useState<boolean>(false);

	const handleBet = async (side: boolean) => {
		if (address === ZeroAddress) {
			toast({
				description: t('toast.connect'),
				variant: 'destructive',
			});
			return;
		}
		if (!isMember) {
			toast({
				description: t('toast.notMember'),
				variant: 'destructive',
			});
			return;
		}
		if (amount === '') {
			toast({
				title: t('toast.amount'),
				variant: 'destructive',
			});
			return;
		}
		if (Number(amount) < 1) {
			toast({
				title: t('toast.minimalBet'),
				variant: 'destructive',
			});
			return;
		}
		try {
			BigInt(Number(amount));
		} catch (e) {
			toast({
				title: t('toast.invalidAmount'),
				variant: 'destructive',
			});
			return;
		}
		if (valueToNumber(allowance) < Number(amount)) {
			setSide(s);
			requestAllowance?.('bet', BigInt(amount) * 10n ** 18n);
			toast({
				title: t('toast.allowance'),
				variant: 'destructive',
			});
			return;
		}
		placeBet({ amount: BigInt(amount) * 10n ** 18n, side, game: game.address });
	};

	const handleBetChange = (value: string) => {
		setAmount(value);
	};
	return (
		<div className={'flex flex-col gap-4 col-span-4 md:col-span-3 items-center drop-shadow-[0_0_35px_rgba(87,101,242,0.75)]'}>
			<h2 className={'font-medium uppercase hidden md:block'}>{t('title')}</h2>
			<div className={cx('w-full border border-gray-800 rounded-[10px] bg-primaryLight py-5 px-10 flex flex-col items-center gap-6 relative')}>
				<div className={'w-full'}>
					<NumericFormat
						className={'w-full rounded-[10px] text-center border border-yellow-400 text-sm bg-primary p-3 font-semibold text-white disabled:cursor-not-allowed'}
						thousandSeparator={','}
						min={1}
						disabled={loading || balance === 0n}
						placeholder={allowance === 0n ? t('allowance') : balance === 0n ? t('topUpTitle') : t('amount')}
						value={amount === null ? '' : amount}
						suffix={' BET'}
						onValueChange={(values) => {
							const { value } = values;
							handleBetChange(value);
						}}
					/>
				</div>

				<div className={'grid grid-cols-2 gap-3 w-full'}>
					<motion.button
						whileHover={{ scale: 1.03 }}
						whileTap={{ scale: 0.97 }}
						onClick={() => handleBet(true)}
						disabled={loading || amount === null || Number(amount) < 1 || BigInt(amount) * 10n ** 18n > balance}
						className={
							' rounded-lg flex flex-col items-center pb-2 p-3 gap-2 leading-[0px] justify-between bg-green-500 font-semibold  disabled:cursor-not-allowed disabled:grayscale duration-500'
						}
					>
						<span className={'text-lg leading-3'}>{t('long')}</span>
						<div className={'flex flex-row items-center text-xs leading-3 gap-1 whitespace-nowrap'}>
							{millify(Number(amount) + (valueToNumber(pool.short) / (valueToNumber(pool.long) + Number(amount))) * Number(amount) || 0, { precision: 2 })}
							<Bet className={'w-3 h-3'} color={'white'} /> + {t('bonus')}
						</div>
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.03 }}
						whileTap={{ scale: 0.97 }}
						onClick={() => handleBet(false)}
						disabled={loading || amount === null || Number(amount) < 1 || BigInt(amount) * 10n ** 18n > balance}
						className={
							' rounded-lg flex flex-col items-center pb-2 p-3 gap-2 leading-[0px] justify-between bg-red-500 font-semibold disabled:cursor-not-allowed disabled:grayscale duration-500'
						}
					>
						<span className={'text-lg leading-3'}>{t('short')}</span>
						<div className={'flex flex-row items-center text-xs leading-3 gap-1 whitespace-nowrap'}>
							{millify(Number(amount) + (valueToNumber(pool.long) / (valueToNumber(pool.short) + Number(amount))) * Number(amount) || 0, { precision: 2 })}
							<Bet className={'w-3 h-3'} color={'white'} /> + {t('bonus')}
						</div>
					</motion.button>
				</div>
				<PlayersBets game={game} />
				<CoefficientRatio pool={pool} amount={amount} />
				<div className={'w-full text-xs'}>
					<h4 className={'font-medium text-gray-500 text-center mb-2'}>{t('expectedWinnings')}</h4>
					<PlayersExpectedWinnings game={game} />
				</div>
			</div>
		</div>
	);
};

export default PlaceBet;

const CoefficientRatio: FC<{ pool: RoundPool; amount: string | number }> = ({ pool, amount }) => {
	const longWidth = useMemo(() => {
		if (pool.long > 0) {
			return (valueToNumber(pool.long) / (valueToNumber(pool.long) + valueToNumber(pool.short))) * 100;
		}
		return 50;
	}, [pool]);

	const longCoef = useMemo(() => {
		if (Number(amount) > 0) {
			return (Number(amount) + (valueToNumber(pool.short) / (valueToNumber(pool.long) + Number(amount))) * Number(amount)) / Number(amount);
		}
		return 1;
	}, [pool, amount]);

	const shortCoef = useMemo(() => {
		if (Number(amount) > 0) {
			return (Number(amount) + (valueToNumber(pool.long) / (valueToNumber(pool.short) + Number(amount))) * Number(amount)) / Number(amount);
		}
		return 1;
	}, [pool, amount]);

	const shortWidth = useMemo(() => {
		if (pool.short > 0) {
			return (valueToNumber(pool.short) / (valueToNumber(pool.long) + valueToNumber(pool.short))) * 100;
		}
		return 50;
	}, [pool]);
	return (
		<div className={'flex  text-xs flex-row w-full text-white items-center rounded-md overflow-hidden'}>
			<div className={'px-3 py-1 h-full bg-opacity-30 bg-green-900 text-green-500 flex flex-row items-center gap-1'} style={{ width: `${longWidth}%` }}>
				{millify(longCoef, { precision: 2 })}x
			</div>
			<div
				className={'px-3 py-1 h-full bg-opacity-30 bg-red-900 text-red-500 flex flex-row items-center gap-1 justify-end'}
				style={{ width: `${shortWidth}%` }}
			>
				{millify(shortCoef, { precision: 2 })}x
			</div>
		</div>
	);
};

const PlayersBets: FC<{ game: Game }> = ({ game }) => {
	const { data: round } = useCurrentRound(game.interval);
	const { address = ZeroAddress } = useAccount();
	const { data: playerBets = [], isFetched: isBetsFetched } = usePlayerBets(address, game.address, round);
	const userPool: RoundPool = {
		long: 0n,
		short: 0n,
		longCount: 0,
		shortCount: 0,
		longPlayersCount: 0,
		shortPlayersCount: 0,
	};
	for (const bet of playerBets) {
		if (bet.side) {
			userPool.longCount += 1;
			userPool.long += bet.amount;
		} else {
			userPool.shortCount++;
			userPool.short += bet.amount;
		}
	}

	return (
		<div className={'hidden md:grid grid-cols-2 gap-4 w-full'}>
			<div className={'bg-primary rounded-lg p-2 flex justify-center gap-2 items-center text-green-500 font-semibold'}>
				<ArrowUpIcon className={'h-3 w-3'} />
				<div className={cx('flex flex-row gap-1 items-center text-sm', { 'animate-pulse blur-sm': !isBetsFetched })}>
					{millify(valueToNumber(userPool.long), { precision: 2 })}
					<Bet className={'w-3 h-3'} color={'green'} />
				</div>
			</div>
			<div className={'bg-primary rounded-lg p-2 flex justify-center gap-2 items-center text-red-500 font-semibold'}>
				<ArrowDownIcon className={'h-3 w-3'} />
				<div className={cx('flex flex-row gap-1 items-center text-sm', { 'animate-pulse blur-sm': !isBetsFetched })}>
					{millify(valueToNumber(userPool.short), { precision: 2 })}
					<Bet color={'red'} className={'w-3 h-3'} />
				</div>
			</div>
		</div>
	);
};
