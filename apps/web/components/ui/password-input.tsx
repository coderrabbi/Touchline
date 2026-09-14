'use client';

import {useState, type ComponentProps} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {passwordStrength} from '@touchline/shared';
import {Input} from './input';

export function PasswordInput({showStrength = false, label = 'password', ...props}: ComponentProps<'input'> & {showStrength?: boolean; label?: string}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(String(props.defaultValue ?? props.value ?? ''));
  const strength = value ? passwordStrength(value) : null;
  const descriptionId = `${props.id}-strength`;
  return <>
    <div className="password-control">
      <Input {...props} type={visible ? 'text' : 'password'} className="password-input"
        aria-describedby={[props['aria-describedby'], showStrength ? descriptionId : null].filter(Boolean).join(' ') || undefined}
        onChange={event => {setValue(event.target.value); props.onChange?.(event);}} />
      <button type="button" className="password-toggle" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        aria-pressed={visible} aria-controls={props.id} onClick={() => setVisible(current => !current)}>
        {visible ? <EyeOff size={20} aria-hidden="true"/> : <Eye size={20} aria-hidden="true"/>}
      </button>
    </div>
    {showStrength && <div id={descriptionId} className="password-strength" data-strength={strength?.toLowerCase() || 'empty'}>
      <div className="password-strength-track" aria-hidden="true"><span /></div>
      <p aria-live="polite" aria-atomic="true">{strength ? `Password strength: ${strength}${strength === 'Poor' ? ' — choose a medium or strong password.' : ' — accepted.'}` : 'Enter a password to check its strength.'}</p>
      <p className="muted">Use 8+ characters with three types: uppercase, lowercase, numbers or symbols. Or use 16+ characters with two types. Avoid common passwords. Maximum 72 bytes.</p>
    </div>}
  </>;
}
