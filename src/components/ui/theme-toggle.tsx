"use client";

import { MonitorCog, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn("inline-flex items-center rounded-xl border border-border/70 bg-card/70 p-1", className)}>
      <Button
        type="button"
        variant={theme === "light" ? "secondary" : "ghost"}
        size="sm"
        className="h-8 px-2"
        onClick={() => setTheme("light")}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={theme === "dark" ? "secondary" : "ghost"}
        size="sm"
        className="h-8 px-2"
        onClick={() => setTheme("dark")}
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={theme === "system" ? "secondary" : "ghost"}
        size="sm"
        className="h-8 px-2"
        onClick={() => setTheme("system")}
      >
        <MonitorCog className="h-4 w-4" />
      </Button>
    </div>
  );
}

