import { BetValue } from 'betfinio_app/BetValue';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from 'betfinio_app/drawer';
import cx from 'clsx';
import { motion } from 'framer-motion';
import { ChartBarIcon } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const CoinInfo: FC<{ bets: number; volume: bigint; staking: bigint; diff: number }> = ({ bets, volume, staking, diff }) => {
	const { t } = useTranslation('predict');

	return (
		<div className={'lg:hidden'}>
			<Drawer>
				<DrawerTrigger asChild>
					<motion.div className={'flex flex-col items-center justify-center cursor-pointer text-yellow-400 hover:text-yellow-400 lg:text-white duration-300'}>
						<ChartBarIcon className={'text-yellow-400 w-6'} />
						<span className={'hidden sm:inline text-xs'}>{t('stats')}</span>
					</motion.div>
				</DrawerTrigger>
				<DrawerContent aria-describedby={undefined} className={'focus:ring-0'}>
					<DrawerTitle className={'hidden'} />
					<StatModal bets={bets} volume={volume} staking={staking} diff={diff} />
				</DrawerContent>
			</Drawer>
		</div>
	);
};

export default CoinInfo;

const StatModal: FC<{ bets: number; volume: bigint; staking: bigint; diff: number }> = ({ bets, volume, staking, diff }) => {
	const { t } = useTranslation('predict');

	return (
		<div className={'p-4 w-full lg:w-[300px] flex flex-col gap-4 text-white'}>
			<div className={'flex justify-between'}>
				<span className={'text-sm'}>{t('tile.24change')}</span>
				<span
					className={cx('font-semibold text-sm lg:text-lg', {
						'text-green-500': diff > 0,
						'text-red-500': diff < 0,
						'text-gray-500': diff === 0,
					})}
				>
					{diff > 0 ? '+' : ''}
					{diff.toFixed(2)}%
				</span>
			</div>

			<div className={'flex justify-between'}>
				<span className={'text-sm'}>{t('tile.bets')}</span>
				<span className={'font-semibold'}>{bets}</span>
			</div>

			<div className={'flex justify-between'}>
				<span className={'text-sm'}>{t('tile.volume')}</span>
				<span className={'font-semibold'}>
					<BetValue value={volume} withIcon />
				</span>
			</div>
			<div className={'flex justify-between'}>
				<span className={'text-sm'}>{t('tile.staking')}</span>
				<span className={'font-semibold'}>
					<BetValue value={staking} withIcon />
				</span>
			</div>
		</div>
	);
};
