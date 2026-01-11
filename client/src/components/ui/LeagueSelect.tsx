import React, { useState, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface LeagueSelectProps {
    value?: string;
    onValueChange: (value: string) => void;
    leagues: string[];
    placeholder?: string;
    className?: string;
    triggerClassName?: string;
    contentClassName?: string;
    disabled?: boolean;
}

export const LeagueSelect: React.FC<LeagueSelectProps> = ({
    value,
    onValueChange,
    leagues,
    placeholder = "Select league",
    className,
    triggerClassName,
    contentClassName,
    disabled = false
}) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const filteredLeagues = useMemo(() => {
        if (!searchValue) return leagues;

        return leagues.filter(league =>
            league.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [leagues, searchValue]);

    const handleSelect = (leagueName: string) => {
        onValueChange(leagueName);
        setOpen(false);
        setSearchValue('');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between bg-[#111111] border-0 text-white hover:bg-[#1a1a1a]",
                        !value && "text-gray-400",
                        triggerClassName
                    )}
                    disabled={disabled}
                >
                    {value || placeholder}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("w-full p-0 bg-[#1a1a1a] border-0", contentClassName)} align="start">
                <Command className="bg-[#1a1a1a]">
                    <CommandInput
                        placeholder="Search leagues..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        className="text-white"
                    />
                    <CommandList>
                        <CommandEmpty className="text-gray-400">No league found.</CommandEmpty>
                        <CommandGroup>
                            {filteredLeagues.map((league) => (
                                <CommandItem
                                    key={league}
                                    value={league}
                                    onSelect={() => handleSelect(league)}
                                    className="text-white hover:bg-[#111111] cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === league ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {league}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

