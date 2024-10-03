import { useCurrentRound, usePlayerRounds, useRounds } from '@/src/lib/query';
import type { Game, Round, RoundStatus } from '@/src/lib/types';
import { ZeroAddress, valueToNumber } from '@betfinio/abi';
import { useNavigate } from '@tanstack/react-router';
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { BetValue } from 'betfinio_app/BetValue';
import { DataTable } from 'betfinio_app/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'betfinio_app/tabs';
import cx from 'clsx';
import { motion } from 'framer-motion';
import { ArrowDownIcon, ArrowUpIcon, Search } from 'lucide-react';
import millify from 'millify';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import type { CircularProgressbarStyles } from 'react-circular-progressbar/dist/types';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';

const columnHelper = createColumnHelper<Round>();
const RoundsTable: FC<{ game: Game }> = ({ game }) => {
	const { data: currentRound } = useCurrentRound(game.interval);
	const { t } = useTranslation('predict', { keyPrefix: 'table' });

	const getStatus = (game: Game, round: number, calculated: boolean): RoundStatus => {
		const last = (round + 1) * game.interval;
		const ended = (round + game.duration) * game.interval;
		const now = Math.floor(Date.now() / 1000);
		if (now < last) return 'accepting';
		if (now < ended) return 'waiting';
		if (calculated) return 'calculated';
		return 'ended';
	};

	const columns = useMemo(
		() => [
			columnHelper.accessor('round', {
				header: t('columns.round'),
				cell: (props) => {
					const { currentPlayerBets, round } = props.row.original;

					return <div className={cx('text-gray-400 md:w-[90px]', currentPlayerBets > 0 && 'text-yellow-400')}>#{round.toString().slice(2)}</div>;
				},
			}),
			columnHelper.accessor('price', {
				header: t('columns.price'),
				cell: (props) => {
					const { start, end } = props.getValue();
					const formattedStart = valueToNumber(start, 8, 0);
					const formattedEnd = valueToNumber(end, 8, 0);

					return (
						<div className={'flex md:w-[160px] flex-row gap-1 items-center rounded-lg'}>
							<div className={'w-[60px] text-center hidden md:block'}>{formattedStart}</div>
							<div
								className={cx(
									'w-[80px] flex flex-row items-center justify-center gap-1 rounded-md',
									end > start ? 'bg-green-600 ' : 'bg-opacity-30 text-red-500 bg-red-900',
								)}
							>
								{formattedEnd}
								{end > start ? <ArrowUpIcon className={'w-3 h-3 stroke-[3]'} /> : <ArrowDownIcon className={'w-3 h-3 stroke-[3]'} />}
							</div>
						</div>
					);
				},
			}),
			columnHelper.display({
				header: t('columns.bets'),
				cell: (props) => {
					const { pool } = props.row.original;
					const longValue = valueToNumber(pool.long);
					const shortValue = valueToNumber(pool.short);
					const longPercentage = (longValue / (longValue + shortValue)) * 100;
					const shortPercentage = (shortValue / (longValue + shortValue)) * 100;

					return (
						<div className={'flex h-[36px] md:h-[40px] flex-row w-[100px] md:w-[200px] text-white items-center rounded-md overflow-hidden'}>
							<div
								className={'px-1 py-[6px] h-full bg-opacity-30 bg-green-900 text-green-500 flex flex-row items-center gap-1'}
								style={{ width: `${longPercentage}%` }}
							>
								{millify(longValue, { precision: 2 })}
							</div>
							<div
								className={' px-1 py-[6px] h-full bg-opacity-30 bg-red-900 text-red-500 flex flex-row items-center gap-1 justify-end'}
								style={{ width: `${shortPercentage}%` }}
							>
								{millify(shortValue, { precision: 2 })}
							</div>
						</div>
					);
				},
			}),

			columnHelper.display({
				header: t('columns.status'),
				meta: {
					className: 'hidden md:table-cell',
				},
				cell: (props) => {
					const { round, calculated } = props.row.original;

					const status: RoundStatus = useMemo(() => {
						return getStatus(game, round, calculated);
					}, [currentRound, round]);

					return <div className={'text-gray-300 w-[80px]'}>{t(`roundStatuses.${status}`)}</div>;
				},
			}),

			columnHelper.display({
				id: 'search',
				cell: (props) => {
					const { round, calculated } = props.row.original;

					const status: RoundStatus = useMemo(() => {
						return getStatus(game, round, calculated);
					}, [currentRound, round]);

					return (
						<div className={'w-[30px]'}>
							{['waiting', 'accepting'].includes(status) ? (
								<TableTimer roundId={round} currentRoundId={currentRound} duration={game.duration} />
							) : (
								<Search className={'w-6 h-6'} />
							)}
						</div>
					);
				},
			}),
		],
		[currentRound, game],
	);

	return (
		<Tabs defaultValue={'all'}>
			<TabsList>
				<TabsTrigger value={'all'}>{t('tabs.all')}</TabsTrigger>
				<TabsTrigger value={'my'}>{t('tabs.my')}</TabsTrigger>
			</TabsList>
			<TabsContent value={'all'}>
				<AllRoundsTable columns={columns} game={game} />
			</TabsContent>
			<TabsContent value={'my'}>
				<MyRounds columns={columns} game={game} />
			</TabsContent>
		</Tabs>
	);
};
export default RoundsTable;

const AllRoundsTable: FC<{ game: Game; columns: unknown[] }> = ({ game, columns }) => {
	const { data: rounds = [], isLoading } = useRounds(game);
	return <RoundsTableContent game={game} columns={columns} rounds={rounds} isLoading={isLoading} />;
};

const MyRounds: FC<{ game: Game; columns: unknown[] }> = ({ game, columns }) => {
	const { address = ZeroAddress } = useAccount();
	const { data: rounds = [], isLoading } = usePlayerRounds(game, address);
	const resultColumn = columnHelper.display({
		header: 'My win',
		id: 'player win',
		cell: (cell) => <PlayerWin round={cell.row.original.round} />,
	});
	return <RoundsTableContent game={game} columns={[...columns.slice(0, 3), resultColumn, columns[4]]} rounds={rounds} isLoading={isLoading} />;
};

const progressStyle: CircularProgressbarStyles = {
	root: {
		width: '30px',
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

const PlayerWin: FC<{ round: number }> = ({ round }) => {
	return <BetValue value={0n} />;
};

const RoundsTableContent: FC<{ game: Game; columns: unknown[]; rounds: Round[]; isLoading: boolean }> = ({ game, columns, rounds, isLoading }) => {
	const navigate = useNavigate();
	const handleClick = async (row: Round) => {
		await navigate({ to: '/predict/$pair', params: { pair: game.name }, search: { round: row.round } });
	};

	return (
		<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
			<DataTable
				data={rounds}
				columns={columns as ColumnDef<Round, unknown>[]}
				isLoading={isLoading}
				onRowClick={handleClick}
				loaderClassName="h-[185px]"
				noResultsClassName="h-[185px]"
			/>
		</motion.div>
	);
};

export const TableTimer: FC<{ roundId: number; currentRoundId: number; className?: string; duration?: number }> = ({
	roundId,
	className = '',
	duration = 4,
}) => {
	const interval = 270;
	const now = Math.floor(Date.now() / 1000);
	const start = roundId * interval;
	const end = (roundId + duration) * interval;
	const [progress, setProgress] = useState(100 - ((end - now) / (end - start)) * 100);

	const updateProgress = useCallback(() => {
		const now = Math.floor(Date.now() / 1000);
		setProgress(100 - ((end - now) / (end - start)) * 100);
	}, [end, start]);

	useEffect(() => {
		const intervalId = setInterval(updateProgress, 1000);
		return () => clearInterval(intervalId);
	}, [updateProgress]);

	return (
		<div className={cx('flex w-full', className)}>
			<CircularProgressbar styles={progressStyle} value={progress} />
		</div>
	);
};
