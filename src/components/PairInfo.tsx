import CoinInfo from '@/src/components/CoinInfo.tsx';
import { useBetsCount, useBetsVolume, useLatestPrice, useYesterdayPrice } from '@/src/lib/query';
import { type Game, defaultResult } from '@/src/lib/types';
import { valueToNumber } from '@betfinio/abi';
import { BetValue } from 'betfinio_app/BetValue';
import cx from 'clsx';
import { CircleHelp } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import PairSwitcher from './PairSwitcher.tsx';

const PairInfo: FC<{ game: Game }> = ({ game }) => {
	const { t } = useTranslation('predict');
	const { data: latest = defaultResult, isFetched: isLatestFetched } = useLatestPrice(game.name);
	const { data: yesterday = defaultResult, isFetched: isYesterdayFetched } = useYesterdayPrice(game.name);
	const { data: bets = 0, isFetched: isBetsFetched } = useBetsCount();
	const { data: volume = 0n, isFetched: isVolumeFetched } = useBetsVolume();
	const diff = isYesterdayFetched ? ((valueToNumber(latest.answer, 8) - valueToNumber(yesterday.answer, 8)) / valueToNumber(yesterday.answer, 8)) * 100 : 0;
	const staking = (volume * 36n) / 1000n;
	return (
		<div
			className={
				'h-[80px] border border-gray-800 w-full whitespace-nowrap bg-primaryLight rounded-lg px-4 sm:px-6 py-4 flex flex-row items-center justify-start gap-2 sm:gap-4 md:gap-6 relative'
			}
		>
			<div className={'flex items-center flex-grow'}>
				<PairSwitcher {...game} />
				<div className={cx('hidden md:block text-xl ml-8 text-yellow-400 font-semibold', { 'blur-sm animate-pulse': !isLatestFetched })}>
					{valueToNumber(isLatestFetched ? latest.answer : 123456n * 10n ** 7n, 8)}$
				</div>
			</div>
			<div className={'grow flex justify-end items-center gap-4 lg:gap-8'}>
				<div className={'hidden lg:flex flex-col'}>
					<span className={'text-sm'}>{t('tile.bets')}</span>
					<span className={cx('font-semibold', { 'animate-pulse blur-sm': !isBetsFetched })}>{bets}</span>
				</div>
				<div className={'w-[1px] bg-white h-[36px] hidden lg:block'} />

				<div className={'hidden lg:flex flex-col'}>
					<span className={'text-sm'}>{t('tile.volume')}</span>
					<div className={cx('font-semibold flex flex-row items-center gap-1', { 'animate-pulse blur-sm': !isVolumeFetched })}>
						<BetValue value={volume} precision={3} withIcon />
					</div>
				</div>
				<div className={'w-[1px] bg-white h-[36px] hidden lg:block'} />

				<div className={'hidden lg:flex flex-col'}>
					<span className={'text-sm'}>{t('tile.staking')}</span>
					<div className={cx('font-semibold flex flex-row items-center gap-1', { 'animate-pulse blur-sm': !isVolumeFetched })}>
						<BetValue value={staking} precision={3} withIcon />
					</div>
				</div>
			</div>

			<div className={cx('flex flex-row justify-between items-center gap-4 sm:gap-8 px-6')}>
				<CoinInfo bets={bets} volume={volume} staking={staking} diff={diff} />
				<a
					target={'_blank'}
					href={'https://betfin.gitbook.io/betfin-public/v/games-manual/games-guide/predict-game'}
					className={'flex flex-col items-center justify-center cursor-pointer text-yellow-400 hover:text-yellow-400 lg:text-white duration-300'}
					rel="noreferrer"
				>
					<CircleHelp className={'w-6 h-6'} />
					<span className={'hidden sm:inline text-xs'}>{t('howToPlay')}</span>
				</a>
			</div>
		</div>
	);
};

export default PairInfo;
