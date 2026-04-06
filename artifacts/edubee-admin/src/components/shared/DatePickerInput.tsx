import { useState } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerInputProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
}

export default function DatePickerInput({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  className = "",
  disabled = false,
  fromYear = 1920,
  toYear = 2040,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() =>
    value ? formatToDisplay(value) : ""
  );

  function formatToDisplay(iso: string) {
    if (!iso) return "";
    const d = parse(iso, "yyyy-MM-dd", new Date());
    return isValid(d) ? format(d, "dd/MM/yyyy") : "";
  }

  function parseDisplay(s: string): Date | null {
    if (s.length !== 10) return null;
    const d = parse(s, "dd/MM/yyyy", new Date());
    return isValid(d) ? d : null;
  }

  const selected: Date | undefined = (() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  })();

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, "");
    let formatted = raw;
    if (raw.length > 2) formatted = raw.slice(0, 2) + "/" + raw.slice(2);
    if (raw.length > 4) formatted = raw.slice(0, 2) + "/" + raw.slice(2, 4) + "/" + raw.slice(4, 8);
    setText(formatted);

    if (formatted.length === 10) {
      const d = parseDisplay(formatted);
      if (d) onChange(format(d, "yyyy-MM-dd"));
    } else if (formatted === "") {
      onChange("");
    }
  };

  const handleCalendarSelect = (day: Date | undefined) => {
    if (!day) return;
    const iso = format(day, "yyyy-MM-dd");
    onChange(iso);
    setText(format(day, "dd/MM/yyyy"));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "flex h-9 w-full items-center rounded-md border border-border bg-background px-3 text-sm ring-offset-background",
            "focus-within:ring-2 focus-within:ring-(--e-orange)/40 focus-within:border-(--e-orange)",
            "cursor-pointer",
            disabled && "opacity-50 pointer-events-none",
            className
          )}
          onClick={() => !disabled && setOpen(true)}
        >
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            onFocus={() => setOpen(false)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={10}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground cursor-text"
            onClick={e => e.stopPropagation()}
          />
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleCalendarSelect}
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          defaultMonth={selected}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
