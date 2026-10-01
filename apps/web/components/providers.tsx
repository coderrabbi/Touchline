'use client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Toaster} from 'react-hot-toast';
import {useState} from 'react';
export function Providers({children}:{children:React.ReactNode}){const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:30000,retry:1,refetchOnWindowFocus:false}}}));return <QueryClientProvider client={client}>{children}<Toaster position="top-center" containerStyle={{top:16,left:16,right:16}} toastOptions={{duration:4500,style:{background:'#151b22',color:'#f3f6fa',border:'1px solid #35404c',maxWidth:'min(440px, calc(100vw - 32px))',overflowWrap:'anywhere'},success:{iconTheme:{primary:'#b5f65b',secondary:'#10151b'}},error:{duration:6500}}}/></QueryClientProvider>}
