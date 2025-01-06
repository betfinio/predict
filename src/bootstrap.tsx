import '@betfinio/components';
import './globals.css';
import 'betfinio_context/style';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { routeTree } from './routeTree.gen';

export const router = createRouter({ routeTree });

// Render the app
const rootElement = document.getElementById('root');
if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} basepath={'/games'} />);
}
