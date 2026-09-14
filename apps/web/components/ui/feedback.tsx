import {AlertCircle,CheckCircle2} from 'lucide-react';
export function Feedback({message,error=false}:{message:string;error?:boolean}){if(!message)return null;const Icon=error?AlertCircle:CheckCircle2;return <div role={error?'alert':'status'} className={error?'feedback feedback-error':'feedback'}><Icon size={18}/><span>{message}</span></div>}
