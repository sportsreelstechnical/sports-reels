import React, { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { useCountries } from '@/hooks/useCountries';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onValueChange,
  placeholder = "Select country",
  className,
  triggerClassName,
  contentClassName,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { countries, loading, error } = useCountries();

  const filteredCountries = useMemo(() => {
    if (!searchValue) return countries;
    
    return countries.filter(country =>
      country.name.common.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [countries, searchValue]);

  const selectedCountry = countries.find(country => country.name.common === value);

  const handleSelect = (countryName: string) => {
    onValueChange(countryName);
    setOpen(false);
    setSearchValue('');
  };

  if (loading) {
    return (
      <div className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}>
        <span className="text-muted-foreground">Loading countries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex h-10 w-full items-center justify-between rounded-md border border-destructive bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}>
        <span className="text-destructive">Error loading countries</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedCountry && "text-muted-foreground",
            triggerClassName
          )}
          disabled={disabled}
        >
          {selectedCountry ? (
            <div className="flex items-center gap-2">
              {selectedCountry.flag && (
                <span className="text-sm">{selectedCountry.flag}</span>
              )}
              <span>{selectedCountry.name.common}</span>
            </div>
          ) : (
            placeholder
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-full p-0", contentClassName)} align="start">
        <Command>
          <CommandInput
            placeholder="Search countries..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {filteredCountries.map((country) => (
                <CommandItem
                  key={country.cca2}
                  value={country.name.common}
                  onSelect={() => handleSelect(country.name.common)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.name.common ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {country.flag && (
                    <span className="text-sm">{country.flag}</span>
                  )}
                  <span>{country.name.common}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
