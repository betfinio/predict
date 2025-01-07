import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/games/predict/')({
	beforeLoad: () => {
		throw redirect({ to: '/games/predict/$pair', params: { pair: 'BTCUSDT' }, replace: true });
	},
});
