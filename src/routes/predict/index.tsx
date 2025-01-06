import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/predict/')({
	beforeLoad: () => {
		throw redirect({ to: '/predict/$pair', params: { pair: 'BTCUSDT' }, replace: true });
	},
});
