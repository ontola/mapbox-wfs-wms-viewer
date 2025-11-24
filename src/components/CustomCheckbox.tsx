import { CheckIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import React from "react";

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  count?: number;
  description?: string;
  className?: string;
  [key: string]: any; // Allow any additional props like data-* attributes
}

export function CustomCheckbox({ checked, onChange, label, count, description, className = "", ...rest }: CustomCheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    // Prevent default behavior if the click is not on the input element
    if ((e.target as HTMLElement).tagName.toLowerCase() !== "input") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      className={`custom-checkbox-container ${className}`}
      onClick={handleClick}
      role="checkbox"
      aria-checked={checked}
      {...rest}
    >
      <div className={`custom-checkbox ${checked ? 'checked' : ''}`}>
        {checked && <CheckIcon className="check-icon" />}
      </div>
      <span className="custom-checkbox-label">{label}</span>
      {description && (
        <div className="custom-checkbox-info" title={description}>
          <InfoCircledIcon />
        </div>
      )}
      {count !== undefined && <span className="custom-checkbox-count">{count}</span>}
    </div>
  );
}
