import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/predict/')({
	component: Redirect,
});

function Redirect() {
	const navigate = useNavigate();
	useEffect(() => {
		navigate({ to: '/predict/$pair', params: { pair: 'BTCUSDT' }, replace: true });
	}, []);
	return null;
}
