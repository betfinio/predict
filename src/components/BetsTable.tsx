import { ETHSCAN } from '@/src/global.ts';
import type { PredictBet } from '@/src/lib/types.ts';
import { truncateEthAddress, valueToNumber } from '@betfinio/abi';
import { Predict } from '@betfinio/ui/dist/icons';
import { type Row, createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { BetValue } from 'betfinio_app/BetValue';
import cx from 'clsx';
import { ExternalLink } from 'lucide-react';
import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';

// todo rewrite tables

const columnHelper = createColumnHelper<PredictBet>();

const BetsTable: FC<{ isFetching: boolean; bets: PredictBet[]; isFinished: boolean }> = ({ isFetching, isFinished, bets }) => {
	const { t } = useTranslation('predict');
	const [filter, setFilter] = useState<'all' | 'my'>('all');
	const { address } = useAccount();
	const columns = [
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
			cell: (props) => <span className={cx('font-medium text-yellow-400')}>{valueToNumber(props.getValue())} BET</span>,
		}),
		columnHelper.display({
			id: 'total',
			header: t('table.total'),
			cell: (props) => (
				<span className={'font-medium'}>
					{props.row.original.status === 5n ? (
						t('table.statuses.5')
					) : (
						<BetValue value={(valueToNumber(props.row.getValue<bigint>('bonus')) + valueToNumber(props.row.getValue<bigint>('result'))).round(3)} />
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
					{t(`table.statuses.${props.getValue().toString() as '0' | '1' | '2' | '3' | '4'}`)}
				</span>
			),
		}),
	];

	const filterBets = (bet: Row<PredictBet>) => {
		if (filter === 'all') return true;
		return bet.getValue('player') === address;
	};

	const table = useReactTable<PredictBet>({
		columns: columns,
		data: bets,
		getCoreRowModel: getCoreRowModel(),
	});

	if (!isFetching && bets.length === 0) {
		return <div />;
	}

	const renderTableSkeleton = () => {
		return [...Array(5)].map((_, i) => (
			<tr key={i} className={cx('h-[50px] p-0 ', i % 2 ? 'bg-primaryLight' : 'bg-primaryLighter')}>
				{[...Array(columns.length)].map((_, i) => (
					<td key={i} className={cx('text-left px-2')} />
				))}
			</tr>
		));
	};
	const renderTableBody = () => {
		if (isFetching) return renderTableSkeleton();
		return table
			.getRowModel()
			.rows.filter(filterBets)
			.map((row) => (
				<tr key={row.id} className={cx('h-[50px] rounded-xl p-0 ', row.index % 2 ? 'bg-primaryLight' : 'bg-primaryLighter')}>
					{row.getVisibleCells().map((cell) => (
						<td
							key={cell.id}
							className={cx(
								'text-left px-2',
								cell.column.columnDef.meta?.className,
								isFinished && cell.column.id === 'status' && 'hidden',
								!isFinished && ['bonus', 'result', 'total'].includes(cell.column.id) && 'hidden',
							)}
						>
							{flexRender(cell.column.columnDef.cell, cell.getContext())}
						</td>
					))}
				</tr>
			));
	};

	return (
		<>
			<div className={'flex flex-row justify-start items-center gap-4'}>
				<button
					type={'button'}
					onClick={() => setFilter('all')}
					className={cx('px-4 py-2 rounded-lg w-[120px]', filter === 'all' ? 'bg-yellow-400 text-black' : 'bg-primaryLighter')}
				>
					{t('table.filter.all')}
				</button>
				<button
					type={'button'}
					onClick={() => setFilter('my')}
					className={cx('px-4 py-2 rounded-lg w-[120px]', filter === 'my' ? 'bg-yellow-400 text-black' : 'bg-primaryLighter')}
				>
					{t('table.filter.my')}
				</button>
			</div>
			<div className={'max-h-[400px] overflow-y-scroll mt-2'}>
				<table className={'w-full text-sm border-separate border-spacing-y-[2px]'}>
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id} className={'text-gray-400 text-left'}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className={cx(
											'h-[40px] pl-2',
											header.column.columnDef.meta?.className,
											isFinished && header.id === 'status' && 'hidden',
											!isFinished && ['bonus', 'result', 'total'].includes(header.id) && 'hidden',
										)}
									>
										{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>{renderTableBody()}</tbody>
					<tfoot>
						{table.getFooterGroups().map((footerGroup) => (
							<tr key={footerGroup.id}>
								{footerGroup.headers.map((header) => (
									<th key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}</th>
								))}
							</tr>
						))}
					</tfoot>
				</table>
			</div>
		</>
	);
};

export default BetsTable;
