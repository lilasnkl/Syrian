import { useState } from "react";
import { Link } from "react-router-dom";

import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Zap } from "lucide-react";
import { toast } from "sonner";

export const LoginRequiredModal = () => {
  const { loginModalOpen, setLoginModalOpen } = useUIStore();
  const { login } = useAuthStore();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      toast.error(t("login.required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(email.trim(), password);
      if (!success) {
        if (useAuthStore.getState().blockedNotice) {
          setLoginModalOpen(false);
          setPassword("");
          return;
        }

        toast.error(t("login.invalid_credentials"));
        return;
      }

      toast.success(t("login.success"));
      setLoginModalOpen(false);
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Zap className="text-primary" size={20} /> {t("login.title")}
          </DialogTitle>
          <DialogDescription>{t("login.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="login-email">{t("login.field.email")}</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder={t("login.placeholder.email")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">{t("login.field.password")}</Label>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder={t("login.placeholder.password")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </div>

          <Button onClick={() => void handleSubmit()} className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("login.signing_in") : t("sign_in")}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-2">
          {t("login.no_account")}{" "}
          <Link to="/signup" onClick={() => setLoginModalOpen(false)} className="text-primary hover:underline">
            {t("login.create")}
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
};
