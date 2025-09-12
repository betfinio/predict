import { BetsMemoryABI, PredictGameABI, ZeroAddress } from '@betfinio/abi';
import { SonnerToaster } from '@betfinio/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import { useAccount, useConfig, useWatchContractEvent } from 'wagmi';
import BonusAndChart from '@/src/components/BonusAndChart.tsx';
import LastBets from '@/src/components/LastBets.tsx';
import { Maintenance } from '@/src/components/Maintenance';
import PairInfo from '@/src/components/PairInfo.tsx';
import PlaceBet from '@/src/components/PlaceBet.tsx';
import RoundConditions from '@/src/components/RoundConditions.tsx';
import RoundsTable from '@/src/components/RoundsTable.tsx';
import { BETS_MEMORY_ADDRESS, PREDICT_ADDRESS } from '@/src/global.ts';
import i18n from '@/src/i18n.ts';
import { games } from '@/src/lib';
import { animateNewBet } from '@/src/lib/api';
import { getBetByAddress } from '@/src/lib/gql';

export const Route = createFileRoute('/games/predict/$pair')({
	component: PredictPage,
});

export function PredictPage() {
	const { t } = useTranslation('predict');
	const { address = ZeroAddress } = useAccount();
	const { pair } = useParams({ from: '/games/predict/$pair' });

	const client = useQueryClient();
	const config = useConfig();

	const game = games[pair];

	useWatchContractEvent({
		abi: PredictGameABI,
		address: game.address,
		config: config,
		strict: true,
		eventName: 'RoundCreated',
		onLogs: async (logs) => {
			const round = logs[0].args.round;
			if (round) {
				setTimeout(() => {
					client.invalidateQueries({ queryKey: ['predict', 'rounds', game.address, address] });
				}, 3000);
			}
		},
	});

	useWatchContractEvent({
		abi: BetsMemoryABI,
		address: BETS_MEMORY_ADDRESS,
		args: {
			game: PREDICT_ADDRESS,
		},
		config: config,
		eventName: 'NewBet',
		onLogs: async (logs) => {
			if (logs.length === 0) return;
			const betAddress = logs[0].args.bet;
			if (!betAddress) return;

			setTimeout(async () => {
				const bet = await getBetByAddress(betAddress);
				if (bet.amount === 0n) return;
				await client.invalidateQueries({ queryKey: ['predict', 'bets'] });
				await client.invalidateQueries({ queryKey: ['predict', 'pool', game] });
				animateNewBet(bet.side ? 'long' : 'short', 10, client, game);
			}, 3000);
		},
	});

	const isMaintenance = true;

	if (isMaintenance) {
		return (
			<div className={'predict w-full h-full'}>
				<Maintenance />
			</div>
		);
	}
	return (
		<div className={'predict w-full h-full'}>
			<div className={'rounded-lg w-full h-full p-2 md:py-3 lg:py-4 gap-2 flex flex-col 2xl:px-0'}>
				<PairInfo game={game} />
				<div className={'grid lg:mt-2 grid-cols-1 md:grid-cols-8 gap-10 md:gap-4'}>
					<RoundConditions game={game} />
					<PlaceBet game={game} />
					<LastBets game={game} />
				</div>
				<BonusAndChart game={game} />
				<Link to={'/staking/conservative'} className={'text-center text-muted-foreground text-sm md:text-base cursor-pointer'}>
					<Trans t={t} i18nKey={'feeStaking'} i18n={i18n} components={{ b: <b className={'text-secondary-foreground font-medium'} /> }} />
				</Link>
				<RoundsTable game={game} />
				<div className={'max-w-[200px]'}>
					<a target={'_blank'} rel={'noreferrer'} href="https://data.chain.link/feeds/polygon/mainnet/btc-usd">
						<img src="https://chain.link/badge-market-data-black" alt="market data secured with chainlink" />
					</a>
				</div>
			</div>
			<SonnerToaster />
		</div>
	);
}
