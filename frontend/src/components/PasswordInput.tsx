import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(({ className, ...props }, ref) => {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input ref={ref} type={isVisible ? "text" : "password"} className={cn("password-input-field pr-12", className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? t("hide_password") : t("show_password")}
        title={isVisible ? t("hide_password") : t("show_password")}
      >
        {isVisible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
