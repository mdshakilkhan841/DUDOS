"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** A password field with a show/hide toggle. Takes every <Input> prop except `type`. */
export function PasswordInput({
    className,
    showLabel = "Show password",
    hideLabel = "Hide password",
    ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & { showLabel?: string; hideLabel?: string }) {
    const [visible, setVisible] = React.useState(false);
    return (
        <div className="relative">
            <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? hideLabel : showLabel}
                aria-pressed={visible}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#5b6f7b] hover:text-[#162c38]"
            >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}
