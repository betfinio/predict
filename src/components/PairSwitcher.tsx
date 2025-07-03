import { motion } from 'motion/react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import btcSvg from '@/src/assets/btc.svg';
import type { Game } from '@/src/lib/types';

const PairSwitcher: FC<Game> = (game) => {
	const { t } = useTranslation('predict', { keyPrefix: 'pairSwitcher' });
	return (
		<motion.div className={'flex gap-2 md:gap-4 items-center'}>
			<div className={'w-8 md:w-10 aspect-square'}>{getImage(game.name)}</div>
			<div className={'flex flex-col'}>
				<span className={'text-lg leading-5'}>{game.name}</span>
				<span className={'text-sm leading-5'}>
					{t('predict')} {game.interval / 60}
					{t('minutes')}
				</span>
			</div>
		</motion.div>
	);
};

export default PairSwitcher;

const getImage = (name: string) => {
	switch (name) {
		case 'BTCUSDT':
			return <img src={btcSvg} width={40} height={40} alt={'btc'} />;
		case 'BTCUSDT_OLD':
			return <img src={'/predict/btc.svg'} width={40} height={40} alt={'btc'} />;
		case 'ETHUSDT':
			return <img src={'/predict/eth.svg'} width={40} height={40} alt={'eth'} />;
		case 'MATICUSDT':
			return <img src={'/predict/matic.svg'} width={40} height={40} alt={'matic'} />;
	}
};
