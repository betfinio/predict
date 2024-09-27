import { valueToNumber } from '@betfinio/abi';
import { Dialog, DialogContent, DialogTrigger } from 'betfinio_app/dialog';
import cx from 'clsx';
import { motion } from 'framer-motion';
import { ChartBarIcon } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const CoinInfo: FC<{ bets: number; volume: bigint; staking: bigint; diff: number }> = ({ bets, volume, staking, diff }) => {
	const { t } = useTranslation('predict');

	return (
		<div className={'lg:hidden'}>
			<Dialog>
				<DialogTrigger asChild>
					<motion.div className={'flex flex-col items-center justify-center cursor-pointer text-yellow-400 hover:text-yellow-400 lg:text-white duration-300'}>
						<ChartBarIcon className={'text-yellow-400 w-6'} />
						<span className={'hidden sm:inline text-xs'}>{t('stats')}</span>
					</motion.div>
				</DialogTrigger>
				<DialogContent>
					<SwitchModal bets={bets} volume={volume} staking={staking} diff={diff} />
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default CoinInfo;

const SwitchModal: FC<{ bets: number; volume: bigint; staking: bigint; diff: number }> = ({ bets, volume, staking, diff }) => {
	const { t } = useTranslation('predict');

	return (
		<motion.div className={'rounded-lg border border-gray-800 bg-primary p-5 w-[300px] flex flex-col gap-5'}>
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
				<span className={'font-semibold'}>{valueToNumber(volume)} BET</span>
			</div>
			<div className={'flex justify-between'}>
				<span className={'text-sm'}>{t('tile.staking')}</span>
				<span className={'font-semibold'}>{valueToNumber(staking)} BET</span>
			</div>
		</motion.div>
	);
};
