import React from 'react';
import { Phone } from 'lucide-react';

const MY_PHONE_REGEX = /^\+?6?0[-\s]?1\d[-\s]?\d{3,4}[-\s]?\d{4}$|^\+?6?0[-\s]?[3-9]\d{1}[-\s]?\d{4}[-\s]?\d{4}$/;

export function formatMalaysianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Normalize leading country code
  const local = digits.startsWith('60') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits;
  if (local.startsWith('1') && local.length >= 9) {
    // Mobile: +60-1X-XXXX XXXX
    const prefix = local.slice(0, 2);
    const mid = local.slice(2, 6);
    const end = local.slice(6, 10);
    return `+60-${prefix}-${mid} ${end}`;
  } else if (local.length >= 8) {
    // Landline: +60-X-XXXX XXXX
    const prefix = local.slice(0, 1);
    const mid = local.slice(1, 5);
    const end = local.slice(5, 9);
    return `+60-${prefix}-${mid} ${end}`;
  }
  return raw;
}

export function isValidMalaysianPhone(value: string): boolean {
  return MY_PHONE_REGEX.test(value.trim());
}

/**
 * Sanitize raw keyboard input for a phone field: strip alphabets and any
 * character that isn't a digit, '+', '-' or space. Once enough digits are
 * present, re-apply the canonical +60-XX-XXXX XXXX spacing automatically.
 */
export function sanitizePhoneInput(raw: string): string {
  const cleaned = raw.replace(/[^\d+\-\s]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  // Auto-format only once we have a plausible number of digits, otherwise let
  // the user keep typing without the caret jumping around.
  if (digits.length >= 9) {
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
