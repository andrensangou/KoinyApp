import React, { useState, useId } from 'react';

interface AndroidInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  required?: boolean;
  suffix?: string;
}

export const AndroidInput: React.FC<AndroidInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  step,
  required,
  suffix,
}) => {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const isFloating = focused || value.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        step={step}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ''}
        required={required}
        className={`w-full px-4 ${suffix ? 'pr-10' : 'pr-4'} pt-5 pb-2 rounded-2xl border-2 bg-transparent outline-none transition-all text-base font-medium text-slate-900 dark:text-white ${
          focused
            ? 'border-indigo-600 dark:border-indigo-400'
            : 'border-slate-300 dark:border-slate-600'
        }`}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 transition-all pointer-events-none ${
          isFloating
            ? 'top-1.5 text-[11px] font-medium'
            : 'top-1/2 -translate-y-1/2 text-base'
        } ${
          focused
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {label}
      </label>
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">
          {suffix}
        </span>
      )}
    </div>
  );
};
