import { valueToNumber, ZeroAddress } from '@betfinio/abi';
import { cn } from '@betfinio/components/lib';
import { BetValue } from '@betfinio/components/shared';
import { Button, type NumberFormatValues, NumericInput, toast } from '@betfinio/components/ui';
import { useAllowanceModal } from 'betfinio_context/lib/context';
import { useAllowance, useBalance, useIsMember } from 'betfinio_context/lib/query';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import millify from 'millify';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseEther } from 'viem';
import { useAccount } from 'wagmi';
import PlayersExpectedWinnings from '@/src/components/PlayersExpectedWinnings.tsx';
import { useCurrentRound, usePlaceBet, usePlayerBets, useRoundBets } from '@/src/lib/query';
import type { Game, RoundPool } from '@/src/lib/types';

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
			handleBet(s).then(undefined);
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
	}, [roundBets.length]);

	const [s, setSide] = useState<boolean>(false);

	const handleBet = async (side: boolean) => {
		if (address === ZeroAddress) {
			toast.error(t('toast.connect'));
			return;
		}
		if (!isMember) {
			toast.error(t('toast.notMember'));
			return;
		}
		if (amount === '') {
			toast.error(t('toast.amount'));
			return;
		}
		if (Number(amount) < 1) {
			toast.error(t('toast.minimalBet'));
			return;
		}
		try {
			parseEther(amount);
		} catch {
			toast.error(t('toast.invalidAmount'));
			return;
		}
		if (valueToNumber(allowance) < Number(amount)) {
			setSide(s);
			requestAllowance?.('bet', parseEther(amount));
			toast.error(t('toast.allowance'));
			return;
		}
		placeBet({ amount: parseEther(amount), side, game: game.address });
	};

	const handleBetChange = (values: NumberFormatValues) => {
		const { value } = values;
		setAmount(value);
	};
	return (
		<div className={'flex flex-col gap-4 col-span-4 md:col-span-3 items-center drop-shadow-[0_0_35px_rgba(87,101,242,0.75)]'}>
			<h2 className={'font-medium uppercase hidden md:block'}>{t('title')}</h2>
			<div className={cn('w-full border border-border rounded-[10px] bg-background-light py-5 px-10 flex flex-col items-center gap-6 relative')}>
				<div className={'w-full'}>
					<NumericInput
						className={'border border-yellow-400'}
						scale="lg"
						suffix={' BET'}
						placeholder={allowance === 0n ? t('allowance') : balance === 0n ? t('topUpTitle') : t('amount')}
						hasError={valueToNumber(balance) < Number(amount) && address !== ZeroAddress}
						decimalScale={2}
						value={amount}
						onValueChange={handleBetChange}
					/>
				</div>

				<div className={'grid grid-cols-2 gap-3 w-full'}>
					<Button
						variant={'success'}
						onClick={() => handleBet(true)}
						disabled={loading || amount === null || Number(amount) < 1 || parseEther(amount || '0') > balance}
						className={'flex flex-col items-center h-auto pb-2 p-3 gap-2 leading-[0px] justify-between'}
					>
						<span className={'text-lg leading-3'}>{t('long')}</span>
						<div className={'flex flex-row items-center text-xs leading-3 gap-1 whitespace-nowrap'}>
							<BetValue
								value={Number(amount) + (valueToNumber(pool.short) / (valueToNumber(pool.long) + Number(amount))) * Number(amount) || 0}
								withIcon
								iconClassName={'text-foreground w-3 h-3'}
							/>
							+ {t('bonus')}
						</div>
					</Button>
					<Button
						variant={'destructive'}
						onClick={() => handleBet(false)}
						disabled={loading || amount === null || Number(amount) < 1 || parseEther(amount || '0') > balance}
						className={' h-auto flex flex-col items-center pb-2 p-3 gap-2 leading-[0px] justify-between '}
					>
						<span className={'text-lg leading-3'}>{t('short')}</span>
						<div className={'flex flex-row items-center text-xs leading-3 gap-1 whitespace-nowrap'}>
							<BetValue
								value={Number(amount) + (valueToNumber(pool.long) / (valueToNumber(pool.short) + Number(amount))) * Number(amount) || 0}
								withIcon
								iconClassName={'text-foreground w-3 h-3'}
							/>
							+ {t('bonus')}
						</div>
					</Button>
				</div>
				<PlayersBets game={game} />
				<CoefficientRatio pool={pool} amount={amount} />
				<div className={'w-full text-xs'}>
					<h4 className={'font-medium text-muted-foreground text-center mb-2'}>{t('expectedWinnings')}</h4>
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
		<div className={'flex  text-xs flex-row w-full text-foreground items-center rounded-md overflow-hidden'}>
			<div className={'px-3 py-1 h-full bg-opacity-30 bg-green-900 text-success flex flex-row items-center gap-1'} style={{ width: `${longWidth}%` }}>
				{millify(longCoef, { precision: 2 })}x
			</div>
			<div
				className={'px-3 py-1 h-full bg-opacity-30 bg-red-900 text-destructive flex flex-row items-center gap-1 justify-end'}
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
			userPool.longCount++;
			userPool.long += bet.amount;
		} else {
			userPool.shortCount++;
			userPool.short += bet.amount;
		}
	}

	return (
		<div className={'hidden md:grid grid-cols-2 gap-4 w-full'}>
			<div className={'bg-background rounded-lg p-2 flex justify-center gap-2 items-center text-success font-semibold'}>
				<ArrowUpIcon className={'h-4 w-4'} />
				<div
					className={cn('flex flex-row gap-1 items-center text-sm', {
						'animate-pulse blur-xs': !isBetsFetched,
					})}
				>
					<BetValue value={userPool.long} withIcon iconClassName={'text-success w-3 h-3'} />
				</div>
			</div>
			<div className={'bg-background rounded-lg p-2 flex justify-center gap-2 items-center text-destructive font-semibold'}>
				<ArrowDownIcon className={'h-4 w-4'} />
				<div
					className={cn('flex flex-row gap-1 items-center text-sm', {
						'animate-pulse blur-xs': !isBetsFetched,
					})}
				>
					<BetValue value={userPool.short} withIcon iconClassName={'text-destructive w-3 h-3'} />
				</div>
			</div>
		</div>
	);
};
