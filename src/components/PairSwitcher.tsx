import btcSvg from '@/src/assets/btc.svg';
import { games } from '@/src/lib';
import type { Game } from '@/src/lib/types';
import { Link } from '@tanstack/react-router';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from 'betfinio_app/dialog';
import cx from 'clsx';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const PairSwitcher: FC<Game> = (game) => {
	const { t } = useTranslation('predict', { keyPrefix: 'pairSwitcher' });
	return (
		<Dialog>
			<DialogTrigger asChild>
				<motion.div className={'flex gap-2 md:gap-4 items-center  cursor-pointer'}>
					<div>
						<Menu className={'w-8 md:w-10 aspect-square text-white'} />
					</div>
					<div className={'w-8 md:w-10 aspect-square'}>{getImage(game.name)}</div>
					<div className={'flex flex-col'}>
						<span className={'text-lg leading-5'}>{game.name}</span>
						<span className={'text-sm leading-5'}>
							{t('predict')} {game.interval / 60}
							{t('minutes')}
						</span>
					</div>
				</motion.div>
			</DialogTrigger>
			<DialogContent className={'w-fit predict'} aria-describedby={undefined}>
				<SwitchModal selected={game} />
			</DialogContent>
		</Dialog>
	);
};

export default PairSwitcher;

const SwitchModal: FC<{ selected: Game }> = ({ selected }) => {
	const pairs = Object.keys(games).map((key) => games[key]);
	return (
		<motion.div layoutId={'switcher'} className={'bg-primary p-2 min-w-[300px] text-white'}>
			{pairs.map((pair, index) => (
				<DialogClose key={index} className={cx('w-full ', pair.name === selected.name && 'border border-gray-800 bg-primaryLighter rounded-lg')}>
					<Link to={`/predict/${pair.name}`} key={index} className={cx('w-full flex flex-row items-center gap-2 p-4 py-2')}>
						{getImage(pair.name)}
						{pair.name}
					</Link>
				</DialogClose>
			))}
		</motion.div>
	);
};

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
