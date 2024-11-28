import { VersionValidation } from '@/src/components/VersionValidation.tsx';
import instance from '@/src/i18n.ts';
import { Toaster } from '@betfinio/components/ui';
import { createRootRoute } from '@tanstack/react-router';
import { Root } from 'betfinio_app/root';

export const Route = createRootRoute({
	component: () => (
		<Root id={'predict'} instance={instance}>
			<Toaster />
			<VersionValidation repository={'affiliate'} branch={import.meta.env.PUBLIC_BRANCH} current={import.meta.env.PUBLIC_DEPLOYED} />
		</Root>
	),
});
