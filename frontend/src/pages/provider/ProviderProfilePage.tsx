import { useState } from 'react';
import { PasswordInput } from '@/components/PasswordInput';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { extractFirstApiErrorMessage } from '@/features/auth/errors';
import { CATEGORIES, type ServiceCategory } from '@/types';
import { X, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';

const ProviderProfilePage = () => {
  const { user, changePassword } = useAuthStore();
  const { providers, updateProvider } = useDataStore();
  const { t } = useLanguage();
  const provider = providers.find((p) => p.userId === user?.id);

  const [name, setName] = useState(provider?.name ?? '');
  const [bio, setBio] = useState(provider?.bio ?? '');
  const [location, setLocation] = useState(provider?.location ?? '');
  const [hourlyRate, setHourlyRate] = useState(provider?.hourlyRate ?? 0);
  const [availability, setAvailability] = useState(provider?.availability ?? '');
  const [responseTime, setResponseTime] = useState(provider?.responseTime ?? '');
  const [category, setCategory] = useState<ServiceCategory>(provider?.category ?? 'plumbing');
  const [skills, setSkills] = useState<string[]>(provider?.skills ?? []);
  const [newSkill, setNewSkill] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { isLoading } = useSkeletonLoading();

  if (isLoading) {
    return <PageTransition><div className="space-y-6 p-6"><CardSkeleton /><CardSkeleton /></div></PageTransition>;
  }

  if (!provider) {
    return <PageTransition><div className="p-6 text-center text-muted-foreground">{t('profile.not_found')}</div></PageTransition>;
  }

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => setSkills(skills.filter((s) => s !== skill));

  const handleSave = async () => {
    await updateProvider(provider.id, { name, bio, location, hourlyRate, availability, responseTime, category, skills });
    toast.success(t('profile.updated'));
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('profile.password_required'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('profile.password_min'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.password_mismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(t('profile.password_same'));
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      toast.success(t('profile.password_updated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(extractFirstApiErrorMessage(error) ?? t('profile.password_change_failed'));
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
          <p className="text-muted-foreground">{t('profile.subtitle')}</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('profile.basic_info')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('profile.field.name')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.field.location')}</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('profile.field.bio')}</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('profile.field.hourly_rate')}</Label>
                <Input type="number" min={1} value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.field.availability')}</Label>
                <Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder={t('profile.placeholder.availability')} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.field.response_time')}</Label>
                <Input value={responseTime} onChange={(e) => setResponseTime(e.target.value)} placeholder={t('profile.placeholder.response_time')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('profile.field.category')}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ServiceCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.icon} {t(`cat.${c.value}` as const)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('profile.skills')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder={t('profile.add_skill')} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
              <Button variant="outline" size="sm" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => void handleSave()} className="gap-2"><Save className="h-4 w-4" /> {t('profile.save')}</Button>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('profile.change_password')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.current_password')}</Label>
              <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('profile.new_password')}</Label>
                <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.confirm_password')}</Label>
                <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <Button variant="outline" onClick={() => void handleChangePassword()}>{t('profile.update_password')}</Button>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ProviderProfilePage;
