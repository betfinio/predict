import i18n from '@/src/i18n.ts';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import MockRoot from 'betfinio_context/components/MockRoot';
import { GlobalContextProvider } from 'betfinio_context/lib/context';
import { I18nextProvider } from 'react-i18next';

export const Route = createRootRoute({
	component: () => (
		<GlobalContextProvider>
			<I18nextProvider i18n={i18n}>
				<MockRoot>
					<Outlet />
				</MockRoot>
			</I18nextProvider>
		</GlobalContextProvider>
	),
});
