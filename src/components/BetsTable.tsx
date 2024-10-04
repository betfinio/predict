import BonusChart from '@/src/components/BonusChart.tsx';
import { ETHSCAN } from '@/src/global.ts';
import { usePool, useRoundBets } from '@/src/lib/query';
import type { Game, PredictBet } from '@/src/lib/types.ts';
import { truncateEthAddress, valueToNumber } from '@betfinio/abi';
import { Predict } from '@betfinio/ui/dist/icons';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { BetValue } from 'betfinio_app/BetValue';
import { DataTable } from 'betfinio_app/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'betfinio_app/tabs';
import cx from 'clsx';
import { ExternalLink } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';

const columnHelper = createColumnHelper<PredictBet>();

const BetsTable: FC<{ round: number; game: Game }> = ({ round, game }) => {
	const { t } = useTranslation('predict');
	const { address } = useAccount();
	const { data: bets = [], isFetching } = useRoundBets(game.address, round);
	const { data: pool } = usePool(game.address, round);
	const columns: ColumnDef<PredictBet, never>[] = [
		columnHelper.accessor('address', {
			header: '',
			cell: (props) => (
				<a href={`${ETHSCAN}/address/${props.getValue()}#internaltx`} target={'_blank'} className={'text-blue-700'} rel="noreferrer">
					{<Predict className={'w-4 h-4 md:w-6 md:h-6'} />}
				</a>
			),
		}),
		columnHelper.accessor('player', {
			header: t('table.player'),
			cell: (props) => (
				<a
					href={`${ETHSCAN}/address/${props.getValue()}`}
					target={'_blank'}
					className={'text-blue-600 flex text-xs md:text-sm flex-row items-start gap-1 cursor-pointer whitespace-nowrap'}
					rel="noreferrer"
				>
					{truncateEthAddress(props.getValue())}
					<ExternalLink className={'w-[14px] h-[16px]'} />
				</a>
			),
		}),
		columnHelper.accessor('side', {
			header: t('table.side'),
			cell: (props) => (
				<span className={cx('font-semibold text-xs md:text-base', props.getValue() ? 'text-green-500' : 'text-red-500')}>
					{props.getValue() ? t('table.long') : t('table.short')}
				</span>
			),
		}),
		columnHelper.accessor('amount', {
			header: t('table.amount'),
			cell: (props) => <BetValue precision={2} withIcon={true} value={valueToNumber(props.getValue())} />,
		}),
		columnHelper.accessor('result', {
			id: 'result',
			meta: {
				className: 'hidden md:table-cell',
			},
			header: t('table.win'),
			cell: (props) => {
				const res = valueToNumber(props.getValue());
				return (
					<span className={cx('font-medium', res === 0 ? 'text-gray-500' : 'text-green-500')}>
						<BetValue precision={2} withIcon={true} value={res} />
					</span>
				);
			},
		}),
		columnHelper.accessor('bonus', {
			id: 'bonus',
			meta: {
				className: 'hidden md:table-cell',
			},
			header: t('table.bonus'),
			cell: (props) => <BetValue value={props.getValue()} withIcon className={'text-blue-500'} iconClassName={'!text-blue-500'} />,
		}),
		columnHelper.display({
			id: 'total',
			header: t('table.total'),
			cell: (props) => (
				<span className={'font-medium'}>
					{props.row.original.status === 5n ? (
						t('table.statuses.5')
					) : (
						<BetValue value={(valueToNumber(props.row.getValue('bonus')) + valueToNumber(props.row.getValue('result'))).round(3)} withIcon />
					)}
				</span>
			),
		}),
		columnHelper.accessor('status', {
			header: t('table.status'),
			cell: (props) => (
				<span
					className={cx({
						'text-gray-500': props.getValue() === 0n,
						'text-yellow-500': props.getValue() === 1n,
						'text-green-500': props.getValue() === 2n,
						'text-red-500': props.getValue() === 3n,
						'text-sky-500': props.getValue() === 5n,
					})}
				>
					{t(`table.statuses.${props.row.original.status.toString() as '0' | '1' | '2' | '3' | '4'}`)}
				</span>
			),
		}),
	];

	const stakes = bets.reduce(
		(st, bet, index) => {
			return {
				long: st.long + bet.amount * BigInt(bets.length - index) * (bet.side ? 1n : 0n),
				short: st.short + bet.amount * BigInt(bets.length - index) * (bet.side ? 0n : 1n),
			};
		},
		{ long: 0n, short: 0n },
	);
	const bonuses = bets.map((bet, index) => {
		const bonusPool = (((pool?.short || 0n) + (pool?.long || 0n)) / 100n) * 5n;
		const weight = bet.amount * BigInt(bets.length - index);
		return {
			bet,
			index,
			bonus: valueToNumber((bonusPool * weight) / (bet.side ? stakes.long : stakes.short)),
		};
	});

	const myBets = bets.filter((e) => e.player === address);
	return (
		<Tabs defaultValue={'all'} className={'min-h-[353px]'}>
			<TabsList>
				<TabsTrigger value={'all'}>{t('roundModal.tabs.all')}</TabsTrigger>
				<TabsTrigger value={'my'}>{t('roundModal.tabs.my')}</TabsTrigger>
				<TabsTrigger value={'bonus'}>{t('roundModal.tabs.bonus')}</TabsTrigger>
			</TabsList>
			<TabsContent value={'all'}>
				<DataTable columns={columns} data={bets} isLoading={isFetching} noResultsClassName={'h-[200px]'} />
			</TabsContent>
			<TabsContent value={'my'}>
				<DataTable columns={columns} data={myBets} isLoading={isFetching} noResultsClassName={'h-[200px]'} />
			</TabsContent>
			<TabsContent value={'bonus'} className={'h-[310px] w-full border rounded-md p-4'}>
				<BonusChart bonuses={bonuses} />
			</TabsContent>
		</Tabs>
	);
};

export default BetsTable;
