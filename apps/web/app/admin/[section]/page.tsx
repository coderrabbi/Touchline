import {notFound} from 'next/navigation';
import {AdminConsole} from '@/features/admin/admin-console';
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!['tournaments','players','registrations','matches','disputes','announcements','statistics','audit'].includes(section))notFound();return <AdminConsole section={section}/>}
