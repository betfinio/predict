import { RouterProvider, createRouter } from '@tanstack/react-router';
import ReactDOM from 'react-dom/client';
import '@betfinio/components/style.css';
import './globals.css';

import { routeTree } from './routeTree.gen';

export const router = createRouter({ routeTree });

// Render the app
const rootElement = document.getElementById('root');
if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
