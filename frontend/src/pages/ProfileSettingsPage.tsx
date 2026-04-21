import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageTransition } from "@/components/PageTransition";
import { PasswordInput } from "@/components/PasswordInput";
import { RequireAuth } from "@/components/RouteGuards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CardSkeleton } from "@/components/PageSkeleton";
import { Save, LogOut } from "lucide-react";
import { toast } from "sonner";

import { extractFirstApiErrorMessage } from "@/features/auth/errors";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/stores/auth-store";
import { useSkeletonLoading } from "@/hooks/use-skeleton-loading";

const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const { user, updateUser, changePassword, logout } = useAuthStore();
  const { isLoading } = useSkeletonLoading();
  const { t } = useLanguage();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setLocation(user?.location ?? "");
    setPhone(user?.phone ?? "");
  }, [user]);

  useEffect(() => {
    if (user?.role === "provider") {
      navigate("/provider/profile");
    }
  }, [navigate, user?.role]);

  if (isLoading) {
    return (
      <RequireAuth>
        <PageTransition>
          <div className="p-6 max-w-2xl mx-auto space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </PageTransition>
      </RequireAuth>
    );
  }

  const handleSave = async () => {
    try {
      await updateUser({ name, email, location, phone });
      toast.success(t('client_profile.updated'));
    } catch {
      toast.error(t('client_profile.update_failed'));
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('client_profile.password_required'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('client_profile.password_mismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('client_profile.password_min'));
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(t('client_profile.password_same'));
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      toast.success(t('client_profile.password_updated'));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(extractFirstApiErrorMessage(error) ?? t('client_profile.password_change_failed'));
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <RequireAuth>
        <PageTransition>
          <div className="p-6 max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">{t('client_profile.title')}</h1>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('client_profile.personal')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('client_profile.field.name')}</Label>
                    <Input value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('client_profile.field.email')}</Label>
                    <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('client_profile.field.location')}</Label>
                    <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={t('client_profile.placeholder.location')} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('client_profile.field.phone')}</Label>
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t('client_profile.placeholder.phone')} />
                  </div>
                </div>
                <Button onClick={() => void handleSave()} className="gap-2">
                  <Save className="h-4 w-4" /> {t('client_profile.save')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('client_profile.change_password')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('client_profile.current_password')}</Label>
                  <PasswordInput value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('client_profile.new_password')}</Label>
                    <PasswordInput value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('client_profile.confirm_password')}</Label>
                    <PasswordInput value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  </div>
                </div>
                <Button variant="outline" onClick={() => void handleChangePassword()}>
                  {t('client_profile.update_password')}
                </Button>
              </CardContent>
            </Card>

          <Separator />

          <Button variant="destructive" onClick={() => void handleLogout()} className="gap-2">
            <LogOut className="h-4 w-4" /> {t('sign_out')}
          </Button>
        </div>
      </PageTransition>
    </RequireAuth>
  );
};

export default ProfileSettingsPage;
