import RoundPool from '@/src/components/RoundPool.tsx';
import SingleBet from '@/src/components/SingleBet.tsx';
import { useLastBets } from '@/src/lib/query';
import type { Game } from '@/src/lib/types';
import { cn } from '@betfinio/components/lib';
import { AnimatePresence, motion } from 'framer-motion';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const LastBets: FC<{ game: Game }> = ({ game }) => {
	const { t } = useTranslation('predict', { keyPrefix: 'lastBets' });
	const { data: bets = [], isLoading } = useLastBets(game.address, 4);

	return (
		<div className={'md:col-start-3 col-span-4 lg:col-span-2 items-center flex flex-col gap-2 lg:gap-4'}>
			{bets.length === 0 ? (
				<div className={'text-center text-muted-foreground p-5'}>{t('noBets')}</div>
			) : (
				<>
					<h2 className={'font-medium uppercase '}>{t('latestBets')}</h2>
					<AnimatePresence>
						<div className={cn('w-full grid grid-cols-1 grid-rows-4 gap-1', { 'animate-pulse blur-sm': isLoading })}>
							{bets.map((e, i) => (
								<motion.div
									key={e.address}
									layout
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: 'spring', stiffness: 500, damping: 30 }}
									exit={{ opacity: 0, y: 10 }}
								>
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
