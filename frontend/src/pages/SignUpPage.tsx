import { useNavigate, Link } from "react-router-dom";

import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { PageTransition } from "@/components/PageTransition";
import { PasswordInput } from "@/components/PasswordInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/stores/auth-store";
import { Zap } from "lucide-react";
import { toast } from "sonner";

type FormData = {
  name: string;
  email: string;
  password: string;
  role: "client" | "provider";
};

const SignUpPage = () => {
  const navigate = useNavigate();
  const { register: registerAccount } = useAuthStore();
  const { t } = useLanguage();

  const schema = z.object({
    name: z.string().trim().min(2, t('signup.validation.name_required')).max(100),
    email: z.string().trim().email(t('signup.validation.invalid_email')).max(255),
    password: z.string().min(8, t('signup.validation.password_min')),
    role: z.enum(["client", "provider"]),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "client" },
  });

  const onSubmit = async (data: FormData) => {
    const success = await registerAccount({
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
    });

    if (!success) {
      toast.error(t('signup.error'));
      return;
    }

    toast.success(t('signup.success'));
    navigate("/");
  };

  return (
    <PageTransition>
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="text-primary" size={24} />
              <span className="font-display text-xl font-bold">{t('app.name')}</span>
            </div>
            <CardTitle className="text-2xl">{t('signup.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>{t('signup.field.name')}</Label>
                <Input {...register("name")} placeholder={t('signup.placeholder.name')} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label>{t('signup.field.email')}</Label>
                <Input type="email" {...register("email")} placeholder={t('signup.placeholder.email')} />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <Label>{t('signup.field.password')}</Label>
                <PasswordInput {...register("password")} placeholder={t('signup.placeholder.password')} />
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <Label className="mb-2 block">{t('signup.role_label')}</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="client" id="role-client" />
                        <Label htmlFor="role-client" className="cursor-pointer">
                          {t('signup.role.client')}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="provider" id="role-provider" />
                        <Label htmlFor="role-provider" className="cursor-pointer">
                          {t('signup.role.provider')}
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('signup.creating') : t('signup.create')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('signup.already_have')} <Link to="/" className="text-primary hover:underline">{t('sign_in')}</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default SignUpPage;
