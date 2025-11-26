import { CheckIcon, InfoCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import * as Dialog from "@radix-ui/react-dialog";
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
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <div
              className="custom-checkbox-info"
              onClick={(e) => e.stopPropagation()}
              role="button"
              tabIndex={0}
            >
              <InfoCircledIcon />
            </div>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="DialogOverlay" />
            <Dialog.Content className="DialogContent">
              <Dialog.Title className="DialogTitle">{label}</Dialog.Title>
              <Dialog.Description className="DialogDescription">
                {description}
              </Dialog.Description>
              <Dialog.Close asChild>
                <button className="DialogClose" aria-label="Close">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
      {count !== undefined && <span className="custom-checkbox-count">{count}</span>}
    </div>
  );
}
