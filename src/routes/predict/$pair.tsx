import BonusAndChart from '@/src/components/BonusAndChart.tsx';
import LastBets from '@/src/components/LastBets.tsx';
import PairInfo from '@/src/components/PairInfo.tsx';
import PlaceBet from '@/src/components/PlaceBet.tsx';
import RoundConditions from '@/src/components/RoundConditions.tsx';
import RoundsTable from '@/src/components/RoundsTable.tsx';
import i18n from '@/src/i18n.ts';
import { games } from '@/src/lib';
import { animateNewBet, fetchPredictBet, fetchRound } from '@/src/lib/api';
import { BetsMemoryContract, GameContract, ZeroAddress } from '@betfinio/abi';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { getStakingUrl } from 'betfinio_app/lib';
import { Trans, useTranslation } from 'react-i18next';
import { useAccount, useConfig, useWatchContractEvent } from 'wagmi';

export const Route = createFileRoute('/predict/$pair')({
	validateSearch: (search: Record<string, unknown>) => {
		if (!search.round) return {};
		return { round: Number(search.round) };
	},
	component: PredictPage,
});

function PredictPage() {
	const { pair } = Route.useParams();
	const game = games[pair];
	const { t } = useTranslation('predict');

	const client = useQueryClient();
	const config = useConfig();
	const { address = ZeroAddress } = useAccount();

	useWatchContractEvent({
		abi: GameContract.abi,
		address: game.address,
		config: config,
		eventName: 'RoundCreated',
		onLogs: async (logs) => {
			const roundId = Number(logs[0]?.args?.round ?? 0n);
			if (roundId) {
				console.log('fetching a round', roundId);
				const res = await fetchRound({ config }, { game, round: { round: roundId, price: { start: 0n } }, player: address });
				const rounds = client.getQueryData(['predict', 'rounds', game]);
				client.setQueryData(['predict', 'rounds', game], [res, ...rounds]);
			}
		},
	});

	useWatchContractEvent({
		abi: BetsMemoryContract.abi,
		address: game,
		config: config,
		eventName: 'NewBet',
		onLogs: async (logs) => {
			const betAddress = logs[0].args.bet;
			const bet = await fetchPredictBet({ config }, { address: betAddress });

			await client.invalidateQueries({ queryKey: ['predict', 'bets'] });
			await client.invalidateQueries({ queryKey: ['predict', 'pool', game] });
			animateNewBet(bet.side ? 'long' : 'short', 10, client, game);
		},
	});

	return (
		<div className={'rounded-lg w-full h-full p-2 md:p-3 lg:p-4 gap-2 flex flex-col'}>
			<PairInfo game={game} />
			<div className={'grid lg:mt-2 grid-cols-1 md:grid-cols-8 gap-10 md:gap-4'}>
				<RoundConditions game={game} />
				<PlaceBet game={game} />
				<LastBets game={game} />
			</div>
			<BonusAndChart game={game} />
			<a href={getStakingUrl()} className={'text-center text-gray-400 text-sm md:text-base cursor-pointer'}>
				<Trans t={t} i18nKey={'feeStaking'} i18n={i18n} components={{ b: <b className={'text-yellow-400 font-medium'} /> }} />
			</a>
			<RoundsTable game={game} />
			<div className={'max-w-[200px]'}>
				<a target={'_blank'} rel={'noreferrer'} href="https://data.chain.link/feeds/polygon/mainnet/btc-usd">
					<img src="https://chain.link/badge-market-data-black" alt="market data secured with chainlink" />
				</a>
			</div>
		</div>
	);
}
