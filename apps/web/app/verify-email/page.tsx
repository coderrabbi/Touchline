import {AuthScreen} from '@/features/auth/auth-screen';
export const metadata={title:'Verify email',robots:{index:false,follow:false}};
export default function Page(){return <AuthScreen kind="verify-email"/>}
