import RoundPool from '@/src/components/RoundPool.tsx';
import SingleBet from '@/src/components/SingleBet.tsx';
import { useLastBets } from '@/src/lib/query';
import type { Game } from '@/src/lib/types';
import cx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const LastBets: FC<{ game: Game }> = ({ game }) => {
	const { t } = useTranslation('predict', { keyPrefix: 'lastBets' });
	const { data: bets = [], isLoading } = useLastBets(4);

	return (
		<div className={'md:col-start-3 col-span-4 lg:col-span-2 items-center flex flex-col gap-2 lg:gap-4'}>
			{bets.length === 0 ? (
				<div className={'text-center text-gray-600 p-5'}>{t('noBets')}</div>
			) : (
				<>
					<h2 className={'font-medium uppercase '}>{t('latestBets')}</h2>
					<AnimatePresence initial={false}>
						<div className={cx('w-full grid grid-cols-1 grid-rows-4 gap-1', { 'animate-pulse blur-sm': isLoading })}>
							{bets.map((e, i) => (
								<motion.div key={i} initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} transition={{ duration: 0.5 }}>
									<SingleBet {...e} loading={false} />
								</motion.div>
							))}
							<div className={'row-span-1'}>
								<RoundPool game={game} />
							</div>
						</div>
					</AnimatePresence>
				</>
			)}
		</div>
	);
};

export default LastBets;
