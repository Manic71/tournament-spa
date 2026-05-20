import React from "react";

/**
 * IconButton Komponente
 * Zeigt einen Button mit einem Icon von lucide-react
 * 
 * Props:
 * - icon: React-Komponente (aus lucide-react)
 * - label: Text-Label für den Button
 * - onClick: Click-Handler
 * - variant: 'primary' | 'secondary' | 'ghost' (default: 'primary')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 */
export function IconButton({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className = '' 
}) {
  const sizeMap = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizeMap = {
    sm: 16,
    md: 18,
    lg: 20
  };

  const variantMap = {
    primary: 'text-slate-900 hover:bg-slate-100 rounded transition-colors',
    secondary: 'text-slate-600 hover:bg-slate-50 rounded transition-colors',
    ghost: 'text-slate-500 hover:text-slate-900 transition-colors'
  };

  return (
    <button
      onClick={onClick}
      title={label}
      className={`${sizeMap[size]} ${variantMap[variant]} ${className}`}
      aria-label={label}
    >
      {Icon && <Icon size={iconSizeMap[size]} />}
    </button>
  );
}

/**
 * Icon-Text Label Komponente
 * Zeigt ein Icon mit Text nebeneinander
 */
export function IconLabel({ icon: Icon, label, size = 'md' }) {
  const sizeMap = {
    sm: 14,
    md: 16,
    lg: 18
  };

  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon size={sizeMap[size]} className="text-slate-700" />}
      <span>{label}</span>
    </div>
  );
}
