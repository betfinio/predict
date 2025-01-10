import BonusInfo from '@/src/components/BonusInfo.tsx';
import PriceChart from '@/src/components/PriceGraph.tsx';
import type { Game } from '@/src/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@betfinio/components/ui';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const BonusAndChart: FC<{ game: Game }> = ({ game }) => {
	const { t } = useTranslation('predict');
	return (
		<div className={'min-h-[300px]'}>
			<Tabs defaultValue={'chart'}>
				<TabsList>
					<TabsTrigger value={'chart'}>{t('tabs.priceGraph')}</TabsTrigger>
					<TabsTrigger value={'bonus'}>{t('tabs.bonusChart')}</TabsTrigger>
				</TabsList>
				<TabsContent value={'bonus'}>
					<BonusInfo game={game} />
				</TabsContent>
				<TabsContent value={'chart'} className={'h-[300px] overflow-y-hidden'}>
					<PriceChart />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default BonusAndChart;
