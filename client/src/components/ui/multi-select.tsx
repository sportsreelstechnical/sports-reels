// Create a new file at src/components/ui/multi-select.tsx
import * as React from 'react';
import { Checkbox } from './checkbox';
import { Label } from './label';

interface MultiSelectProps {
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (selected: string[]) => void;
    className?: string;
}

export const MultiSelect = ({
    options,
    selected,
    onChange,
    className = ''
}: MultiSelectProps) => {
    const toggleOption = (value: string) => {
        onChange(
            selected.includes(value)
                ? selected.filter(v => v !== value)
                : [...selected, value]
        );
    };

    return (
        <div className={`space-y-2  ${className}`}>
            {options.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                        id={`option-${option.value}`}
                        checked={selected.includes(option.value)}
                        onCheckedChange={() => toggleOption(option.value)}
                    />
                    <Label htmlFor={`option-${option.value}`}>{option.label}</Label>
                </div>
            ))}
        </div>
    );
};