import React from "react";

/**
 * FormInput Komponente
 * Wiederverwendbares Input-Feld mit Label
 */
export function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
  disabled = false,
  className = ""
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-slate-900">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
      />
    </div>
  );
}

/**
 * FormSection Komponente
 * Container für eine Gruppe von Formularelementen
 */
export function FormSection({ title, children, divider = false }) {
  return (
    <div className={divider ? "border-t border-slate-200 pt-6" : ""}>
      {title && (
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{title}</h2>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

/**
 * FormGrid Komponente
 * Grid-Layout für Formulare
 */
export function FormGrid({ children, columns = 2 }) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4"
  };

  return (
    <div className={`grid ${colClass[columns]} gap-4`}>
      {children}
    </div>
  );
}

/**
 * FormSelect Komponente
 * Wiederverwendbares Select/Dropdown-Feld mit Label
 */
export function FormSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = "Bitte wählen...",
  required = false,
  disabled = false,
  className = ""
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-slate-900">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
