import type { PredictBet } from '@/src/lib/types.ts';
import { ZeroAddress } from '@betfinio/abi';
import { BarElement, CategoryScale, Chart as ChartJS, type ChartOptions, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { type FC, useMemo } from 'react';
import { Bar } from 'react-chartjs-2'; //todo rewrite to nivo rocks
import { useAccount } from 'wagmi';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BonusChart: FC<{ bonuses: { bet: PredictBet; bonus: number }[]; oneWay?: boolean; minBars?: number; height?: number }> = ({
	bonuses,
	oneWay = false,
	minBars = 20,
	height = 50,
}) => {
	const { address = ZeroAddress } = useAccount();
	const colors: string[] = [];
	const values: number[] = [];
	for (const { bet, bonus } of bonuses) {
		if (oneWay) {
			values.push(bonus);
		} else {
			values.push(bet.side ? bonus : -bonus);
		}
		colors.push(bet.player === address ? '#FFC800' : bet.side ? '#27AE60' : '#EB5757');
	}

	const options = useMemo<ChartOptions<'bar'>>(
		() => ({
			plugins: {
				title: {
					display: false,
					text: 'Chart.js Bar Chart - Stacked',
				},
				legend: {
					display: false,
				},
				tooltip: {
					displayColors: false,
					callbacks: {
						label: (context) => `${Math.abs(context.parsed.y)} BET`,
						title(): string | string[] | undefined {
							return '';
						},
					},
				},
			},
			interaction: {
				mode: 'nearest',
			},
			responsive: true,
			scales: {
				x: {
					display: false,
				},
				y: {
					display: false,
					min: oneWay ? 0 : -Math.max(...values),
					max: Math.max(...values),
				},
			},
		}),
		[oneWay, values],
	);

	const data = {
		labels: Array.from(Array(Math.max(values.length, minBars)), (_, i) => i),
		datasets: [
			{
				label: 'Dataset 1',
				data: values,
				backgroundColor: colors,
				borderRadius: 2,
			},
		],
	};
	return <Bar height={height} options={options} data={data} />;
};

export default BonusChart;
