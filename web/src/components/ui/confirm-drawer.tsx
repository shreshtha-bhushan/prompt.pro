"use client";

import * as React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDrawerProps = {
  /** Visible control that opens the drawer (e.g. a destructive icon button). */
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Called after user confirms (drawer closes first). */
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  className?: string;
};

/**
 * Bottom-sheet confirmation pattern for destructive actions (clear history, delete rows).
 * Matches PromptPro popup flows where native `confirm()` is used in the extension.
 */
export function ConfirmDrawer({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  destructive = true,
  className,
}: ConfirmDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className={cn(className)}>
        <div className="mx-auto w-full max-w-md px-4 pb-6 pt-2">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={pending}>
                {cancelLabel}
              </Button>
            </DrawerClose>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => void handleConfirm()}
            >
              {pending ? "…" : confirmLabel}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
