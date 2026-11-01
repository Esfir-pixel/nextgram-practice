import './global.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

export const metadata = {
title: 'NextGram',
description:
'A sample Next.js app showing dynamic routing with modals as a route.',
};

export default function RootLayout(props: {
children: React.ReactNode;
modal: React.ReactNode;
}) {
return ( <html><body> <AppRouterCacheProvider>
{props.children}
{props.modal} <div id="modal-root" /> </AppRouterCacheProvider> </body></html>
);
}

