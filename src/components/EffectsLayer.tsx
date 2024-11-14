import { useObserveBet } from '@/src/lib/query';
import type { Game } from '@/src/lib/types.ts';
import { ZeroAddress } from '@betfinio/abi';
import { addressToColor } from 'betfinio_app/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Address } from 'viem';
import { useAccount } from 'wagmi';

export const EffectsLayer: FC<{ game: Game }> = ({ game }) => {
	const {
		query: { data: observedBetData },
		resetObservedBet,
	} = useObserveBet(game);
	const { side } = observedBetData;
	const { address } = useAccount();
	const [longParticles, setLongParticles] = useState<Array<{ x: number; y: number; color: string }>>([]);
	const [shortParticles, setShortParticles] = useState<Array<{ x: number; y: number; color: string }>>([]);

	const ref = useRef<HTMLDivElement | null>(null);

	const generateParticles = (address?: Address) => {
		const { width, height } = ref.current?.getBoundingClientRect() ?? { width: 300, height: 300 };

		const arr = Array.from(new Array(30));
		return arr.map(() => ({
			color: addressToColor(address ?? ZeroAddress),
			x: Math.floor(Math.random() * (width + 40)) - 20, // Adjusted for wider range
			y: Math.floor(Math.random() * (height + 40)) - 20, // Adjusted for wider range
		}));
	};

	useEffect(() => {
		if (!side) return;
		if (side === 'long') {
			setLongParticles(generateParticles(address));
			setTimeout(() => {
				setLongParticles([]);
				resetObservedBet();
			}, 4000);
		} else if (side === 'short') {
			setShortParticles(generateParticles(address));
			setTimeout(() => {
				setShortParticles([]);
				resetObservedBet();
			}, 4000);
		}
	}, [side]);

	return (
		<div ref={ref} className={'absolute top-0 right-0 left-0 bottom-0 duration-300 overflow-hidden'}>
			<AnimatePresence>
				{longParticles?.map((particle, i) => (
					<motion.div
						key={particle.color + i}
						initial={{ opacity: 0, y: 300 }}
						animate={{ opacity: 1, y: -500 }}
						transition={{ duration: Math.random() * 2.3 + 1, delay: i * 0.01 }}
						className="w-5 h-5 absolute"
						style={{ left: particle.x, top: particle.y }}
					>
						<TrendingUp width={24} height={24} className="text-green-400 w-5 h-5" />
					</motion.div>
				))}

				{shortParticles?.map((particle, i) => (
					<motion.div
						key={i}
						initial={{ opacity: 0, y: -500 }}
						animate={{ opacity: 1, y: 300 }}
						transition={{ duration: Math.random() * 2.3 + 1, delay: i * 0.01 }}
						className="w-5 h-5 absolute"
						style={{ left: particle.x, top: particle.y }}
					>
						<div style={{ color: particle.color }}>
							<TrendingDown width={24} height={24} className="text-red-400 w-5 h-5" />
						</div>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
};
