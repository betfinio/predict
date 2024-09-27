import BonusInfo from '@/src/components/BonusInfo.tsx';
import PriceChart from '@/src/components/PiceGraph.tsx';
import type { Game } from '@/src/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'betfinio_app/tabs';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const BonusAndChart: FC<{ game: Game }> = ({ game }) => {
	const { t } = useTranslation('predict');
	return (
		<div className={''}>
			<Tabs defaultValue={'bonus'}>
				<TabsList>
					<TabsTrigger value={'bonus'}>{t('tabs.bonusChart')}</TabsTrigger>
					<TabsTrigger value={'chart'}>{t('tabs.priceGraph')}</TabsTrigger>
				</TabsList>
				<TabsContent value={'bonus'}>
					<BonusInfo game={game} />
				</TabsContent>
				<TabsContent value={'chart'} className={'h-[300px]'}>
					<PriceChart />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default BonusAndChart;
