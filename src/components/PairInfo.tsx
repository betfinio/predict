import CoinInfo from '@/src/components/CoinInfo.tsx';
import { useBetsCount, useBetsVolume, useLatestPrice, useYesterdayPrice } from '@/src/lib/query';
import { type Game, defaultResult } from '@/src/lib/types';
import { valueToNumber } from '@betfinio/abi';
import { cn } from '@betfinio/components/lib';
import { BetValue } from '@betfinio/components/shared';
import { Separator } from '@betfinio/components/ui';
import { useChatbot } from 'betfinio_context/lib/context';
import { AlertCircle, CircleHelp } from 'lucide-react';
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
	const { toggle } = useChatbot();

	const handleReport = () => {
		toggle();
	};
	return (
		<div
			className={
				'h-[80px] border border-border w-full whitespace-nowrap bg-background-light rounded-md px-4 sm:px-6 py-4 flex flex-row items-center justify-start gap-2 sm:gap-4 md:gap-6 relative'
			}
		>
			<div className={'flex items-center grow'}>
				<PairSwitcher {...game} />
				<div className={cn('hidden md:block text-xl ml-8 text-secondary-foreground font-semibold', { 'blur-xs animate-pulse': !isLatestFetched })}>
					{valueToNumber(isLatestFetched ? latest.answer : 123456n * 10n ** 7n, 8)}$
				</div>
			</div>
			<div className={'grow flex justify-end items-center gap-4 lg:gap-8'}>
				<div className={'hidden lg:flex flex-col'}>
					<span className={'text-sm'}>{t('tile.bets')}</span>
					<span className={cn('font-semibold', { 'animate-pulse blur-xs': !isBetsFetched })}>{bets}</span>
				</div>
				<Separator orientation={'vertical'} className={'h-[36px] hidden md:block '} />
				<div className={'hidden lg:flex flex-col'}>
					<span className={'text-sm'}>{t('tile.volume')}</span>
					<div className={cn('font-semibold flex flex-row items-center gap-1', { 'animate-pulse blur-xs': !isVolumeFetched })}>
						<BetValue value={volume} precision={3} withIcon />
					</div>
				</div>
				<Separator orientation={'vertical'} className={'h-[36px] hidden md:block'} />
				<div className={'hidden lg:flex flex-col'}>
					<span className={'text-sm'}>{t('tile.staking')}</span>
					<div className={cn('font-semibold flex flex-row items-center gap-1', { 'animate-pulse blur-xs': !isVolumeFetched })}>
						<BetValue value={staking} precision={3} withIcon />
					</div>
				</div>
			</div>

			<div className={cn('flex flex-row justify-between items-center gap-4 sm:gap-8 px-6')}>
				<CoinInfo bets={bets} volume={volume} staking={staking} diff={diff} />
				<a
					target={'_blank'}
					href={'https://betfin.gitbook.io/betfin-public/v/games-manual/games-guide/predict-game'}
					className={
						'flex flex-col items-center justify-center cursor-pointer text-secondary-foreground hover:text-secondary-foreground lg:text-foreground duration-300'
					}
					rel="noreferrer"
				>
					<CircleHelp className={'w-6 h-6'} />
					<span className={'hidden sm:inline text-xs'}>{t('howToPlay')}</span>
				</a>
				<div className={'flex flex-col items-center text-secondary-foreground group lg:text-foreground hover:text-secondary-foreground text-xs cursor-pointer'}>
					<AlertCircle className={'w-6 h-6'} onClick={handleReport} />
					<span className={'hidden md:block'}>Report</span>
				</div>
			</div>
		</div>
	);
};

export default PairInfo;
