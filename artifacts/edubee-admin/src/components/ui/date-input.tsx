import { useState, useRef, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: string;           // yyyy-MM-dd (empty string = no date)
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}

function parseDisplayToIso(display: string): string | null {
  const m = display.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = parse(`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`, "yyyy-MM-dd", new Date());
  return isValid(d) ? format(d, "yyyy-MM-dd") : null;
}

export function DateInput({ value, onChange, className, placeholder = "DD/MM/YYYY" }: DateInputProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(
    value ? format(new Date(value + "T00:00:00"), "dd/MM/yyyy") : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(value ? format(new Date(value + "T00:00:00"), "dd/MM/yyyy") : "");
  }, [value]);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setText(raw);
    const iso = parseDisplayToIso(raw);
    if (iso) onChange(iso);
    else if (raw === "") onChange("");
  }

  function handleBlur() {
    const iso = parseDisplayToIso(text);
    if (iso) {
      setText(format(new Date(iso + "T00:00:00"), "dd/MM/yyyy"));
      onChange(iso);
    } else if (text === "") {
      onChange("");
    } else {
      setText(value ? format(new Date(value + "T00:00:00"), "dd/MM/yyyy") : "");
    }
  }

  function handleSelect(d: Date | undefined) {
    if (!d) return;
    const iso = format(d, "yyyy-MM-dd");
    onChange(iso);
    setText(format(d, "dd/MM/yyyy"));
    setOpen(false);
  }

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={10}
        className="h-9 pl-3 pr-8 rounded-lg border border-[#E8E6E2] text-sm outline-none focus:border-(--e-orange) bg-white w-full"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-2 text-[#A8A29E] hover:text-[#57534E]"
            tabIndex={-1}
          >
            <CalendarIcon size={15} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
