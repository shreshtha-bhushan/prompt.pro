"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, isValid } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

export function DatePickerInput({
  value,
  onChange,
  placeholder = "June 01, 2025",
  className,
}: {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  
  // Parse incoming value into a Date object if valid
  const date = React.useMemo(() => {
    if (!value) return undefined
    // Handle yyyy-mm-dd explicitly to avoid timezone shifts
    const [y, m, d] = value.split("-").map(Number)
    if (y && m && d) {
      return new Date(y, m - 1, d)
    }
    const parsed = new Date(value)
    return isValid(parsed) ? parsed : undefined
  }, [value])

  const [month, setMonth] = React.useState<Date | undefined>(date)

  // Local state for the text input
  const [inputValue, setInputValue] = React.useState(
    date ? format(date, "MMMM dd, yyyy") : ""
  )

  // Sync text input when external value changes
  React.useEffect(() => {
    if (date) {
      setInputValue(format(date, "MMMM dd, yyyy"))
      setMonth(date)
    } else {
      setInputValue("")
    }
  }, [date])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    const parsed = new Date(e.target.value)
    if (isValid(parsed)) {
      onChange(format(parsed, "yyyy-MM-dd"))
      setMonth(parsed)
    } else if (e.target.value === "") {
      onChange("")
    }
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <Input
        value={inputValue}
        placeholder={placeholder}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="pr-10 bg-[--layer-3] border-[--border-side] text-[--text-primary]"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 h-full px-3 hover:bg-transparent text-[--text-secondary] hover:text-[--text-primary]"
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="sr-only">Select date</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-[#111113] border-[--border-side]"
          align="end"
        >
          <Calendar
            mode="single"
            selected={date}
            month={month}
            onMonthChange={setMonth}
            onSelect={(selectedDate) => {
              if (selectedDate) {
                onChange(format(selectedDate, "yyyy-MM-dd"))
                setInputValue(format(selectedDate, "MMMM dd, yyyy"))
              } else {
                onChange("")
                setInputValue("")
              }
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
