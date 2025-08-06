import { AlertTriangle } from 'lucide-react';
import headerLogo from '@/src/assets/header-logo.svg';
import duckMascot from '@/src/assets/mascot.png';
import patternOverlay from '@/src/assets/patternzinho.png';

export const Maintenance = () => {
	return (
		<div className="h-[calc(100vh-65px)] relative flex items-center justify-center">
			{/* Layer 2: Gradient circle */}
			<div
				className="absolute w-full h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
				style={{
					background: 'radial-gradient(circle, rgba(81, 74, 179, 0.9) 0%, rgba(15, 20, 33, 0) 70%)',
				}}
			/>

			{/* Layer 3: Pattern overlay */}
			<div className="absolute inset-0 w-full h-full">
				<div
					className="w-full h-full opacity-60"
					style={{
						backgroundImage: `url(${patternOverlay})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
					}}
				/>
			</div>

			{/* Layer 4: Main content */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 h-full">
				<div className="flex flex-col items-center justify-center h-full">
					{/* Header */}
					<header className="mb-8">
						<img src={headerLogo} alt="Betfin Logo" className="h-14 w-auto" />
					</header>

					{/* Main content */}
					<main className="w-full">
						{/* Alert box */}
						<div className="bg-slate-900/50 border border-amber-400 rounded-xl p-4 md:p-8 max-w-2xl mx-auto flex items-center gap-4">
							<AlertTriangle size={24} className="w-10 h-10 flex-shrink-0 mt-0.5 text-amber-400" />
							<div className="flex flex-col text-left">
								<span className="text-amber-400 text-lg md:text-xl mb-2 font-bold">Planned Web Maintenance</span>
								<span className="mb-2 text-sm md:text-base leading-relaxed">Crypto Predict is unavailable due to maintenance. Please come back later.</span>
								<span className="text-sm md:text-base text-gray-300">
									You can check the current status at{' '}
									<a href="https://t.me/betfin_official" className="text-amber-400 hover:underline">
										https://t.me/betfin_official
									</a>
								</span>
							</div>
						</div>

						{/* Mascot container */}
						<div className="mt-12 flex justify-center">
							<img src={duckMascot} alt="Betfin Duck Mascot" className="max-w-sm w-full" />
						</div>
					</main>
				</div>
			</div>
		</div>
	);
};
