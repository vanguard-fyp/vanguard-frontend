import React from 'react';
import { Phone } from 'lucide-react';

export const MY_PHONE_REGEX = /^(?:\+?60|0)[-\s]?(?:11[-\s]?[0-9]{4}[-\s]?[0-9]{4}|1[02-9][-\s]?[0-9]{3}[-\s]?[0-9]{4}|3[-\s]?[0-9]{4}[-\s]?[0-9]{4}|[4-9][-\s]?[0-9]{3}[-\s]?[0-9]{4})$/;

export function formatMalaysianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Normalize leading country code or zero
  let local = digits;
  if (local.startsWith('60')) {
    local = local.slice(2);
  } else if (local.startsWith('0')) {
    local = local.slice(1);
  }

  if (local.startsWith('11')) {
    // 011 prefix (11 digits total: 011-XXXX XXXX -> 8 digits after 011)
    const prefix = '11';
    const rest = local.slice(2, 10);
    const mid = rest.slice(0, 4);
    const end = rest.slice(4, 8);
    return end ? `+60-${prefix}-${mid} ${end}` : mid ? `+60-${prefix}-${mid}` : `+60-${prefix}`;
  } else if (local.startsWith('1')) {
    // 010, 012, 013, 014, 015, 016, 017, 018, 019 (10 digits total: 01X-XXX XXXX -> 7 digits after 01X)
    const prefix = local.slice(0, 2);
    const rest = local.slice(2, 9);
    const mid = rest.slice(0, 3);
    const end = rest.slice(3, 7);
    return end ? `+60-${prefix}-${mid} ${end}` : mid ? `+60-${prefix}-${mid}` : `+60-${prefix}`;
  } else if (local.startsWith('3')) {
    // 03 landline (10 digits total: 03-XXXX XXXX -> 8 digits after 03)
    const prefix = '3';
    const rest = local.slice(1, 9);
    const mid = rest.slice(0, 4);
    const end = rest.slice(4, 8);
    return end ? `+60-${prefix}-${mid} ${end}` : mid ? `+60-${prefix}-${mid}` : `+60-${prefix}`;
  } else if (local.length > 0 && ['4', '5', '6', '7', '8', '9'].includes(local[0])) {
    // 04-09 landlines (9 digits total: 0X-XXX XXXX -> 7 digits after 0X)
    const prefix = local[0];
    const rest = local.slice(1, 8);
    const mid = rest.slice(0, 3);
    const end = rest.slice(3, 7);
    return end ? `+60-${prefix}-${mid} ${end}` : mid ? `+60-${prefix}-${mid}` : `+60-${prefix}`;
  }
  return raw;
}

export function isValidMalaysianPhone(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('60')) local = local.slice(2);
  else if (local.startsWith('0')) local = local.slice(1);

  if (local.startsWith('11')) {
    return local.length === 10; // 11 + 8 digits = 10 digits
  }
  if (local.startsWith('1')) {
    return local.length === 9; // 1X + 7 digits = 9 digits
  }
  if (local.startsWith('3')) {
    return local.length === 9; // 3 + 8 digits = 9 digits
  }
  if (['4', '5', '6', '7', '8', '9'].includes(local[0])) {
    return local.length === 8; // X + 7 digits = 8 digits
  }
  return false;
}

export function sanitizePhoneInput(raw: string): string {
  const cleaned = raw.replace(/[^\d+\-\s]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length >= 8) {
    return formatMalaysianPhone(cleaned);
  }
  return cleaned;
}

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** If true, shows validation error span below input */
  showValidation?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  label = 'Phone Number',
  placeholder = '+60-12-3456 7890',
  required = false,
  className = '',
  showValidation = true,
}) => {
  const dirty = value.trim().length > 0;
  const valid = isValidMalaysianPhone(value);
  const showError = showValidation && dirty && !valid;

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-bold text-slate-800 mb-1">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
          {!required && <span className="text-[10px] text-slate-500 font-normal ml-0.5">(optional)</span>}
        </label>
      )}
      <div className="relative">
        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => onChange(sanitizePhoneInput(e.target.value))}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
            showError
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-slate-200 focus:border-blue-600'
          }`}
        />
      </div>
      {showError && (
        <span className="block mt-1 text-[10px] text-rose-500 font-medium">
          Enter a valid Malaysian number, e.g.{' '}
          <span className="font-mono">+60-12-3456 7890</span>
        </span>
      )}
      {showValidation && dirty && valid && (
        <span className="block mt-1 text-[10px] text-emerald-600 font-medium">
          ✓ {formatMalaysianPhone(value)}
        </span>
      )}
    </div>
  );
};
