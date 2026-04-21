import { useState, useRef } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import { Plus, X, Shield, FileText, Upload, File, Image, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import type { VerificationRequest, VerificationFile } from '@/types';

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-400" />;
  if (type.includes('image')) return <Image className="h-4 w-4 text-blue-400" />;
  if (type.includes('sheet') || type.includes('excel') || type.includes('xls')) return <FileSpreadsheet className="h-4 w-4 text-emerald-400" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ProviderVerificationPage = () => {
  const { user } = useAuthStore();
  const { providers, verificationRequests, addVerificationRequest } = useDataStore();
  const { t } = useLanguage();
  const { isLoading } = useSkeletonLoading();
  const provider = providers.find((p) => p.userId === user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<VerificationFile[]>([]);
  const [selectedFileBlobs, setSelectedFileBlobs] = useState<File[]>([]);
  const [documents, setDocuments] = useState<string[]>(['']);
  const [certificates, setCertificates] = useState<string[]>(['']);
  const [yearsExp, setYearsExp] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState('');

  if (isLoading) {
    return (
      <PageTransition>
        <div className="p-6 space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (!provider) {
    return <PageTransition><div className="p-6 text-center text-muted-foreground">{t('profile.not_found')}</div></PageTransition>;
  }

  const latestVR = verificationRequests.find((vr) => vr.providerId === provider.id);
  const existingVR = latestVR && (latestVR.status === 'pending' || latestVR.status === 'approved') ? latestVR : undefined;

  const addArea = () => {
    const trimmed = newArea.trim();
    if (trimmed && !serviceAreas.includes(trimmed)) {
      setServiceAreas([...serviceAreas, trimmed]);
      setNewArea('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024);
    const newFiles: VerificationFile[] = validFiles.map((f) => ({ name: f.name, type: f.type, size: f.size }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setSelectedFileBlobs(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setSelectedFileBlobs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const docs = documents.filter((d) => d.trim());
    const certs = certificates.filter((c) => c.trim());
    if (docs.length === 0 && selectedFiles.length === 0) {
      toast.error(t('verification.at_least_one'));
      return;
    }

    const vr: VerificationRequest = {
      id: `vr${Date.now()}`,
      providerId: provider.id,
      providerName: provider.name,
      providerAvatar: provider.avatar,
      category: provider.category,
      documents: [...docs, ...certs],
      files: selectedFiles,
      description: description.trim() || undefined,
      status: 'pending',
      submittedAt: new Date().toISOString().split('T')[0],
      yearsExperience: yearsExp ? Number(yearsExp) : undefined,
      serviceAreas: serviceAreas.length > 0 ? serviceAreas : undefined,
    };

    await addVerificationRequest(vr, selectedFileBlobs);
    toast.success(t('verification.submitted'));
  };

  if (existingVR) {
    return (
      <PageTransition>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t('verification.status_title')}</h1>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={existingVR.status} />
                <span className="text-sm text-muted-foreground">{t('verification.submitted_on')} {existingVR.submittedAt}</span>
              </div>
              {existingVR.reviewedAt && (
                <p className="text-sm text-muted-foreground">{t('verification.reviewed_on')} {existingVR.reviewedAt}</p>
              )}
              {existingVR.rejectionReason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-sm font-medium text-destructive">{t('verification.rejection_reason')}:</p>
                  <p className="text-sm text-muted-foreground">{existingVR.rejectionReason}</p>
                </div>
              )}
              {existingVR.description && (
                <div>
                  <p className="text-sm font-medium mb-1">{t('verification.description')}</p>
                  <p className="text-sm text-muted-foreground">{existingVR.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-2">{t('verification.documents')}</p>
                <div className="flex flex-wrap gap-2">
                  {existingVR.documents.map((d) => (
                    <Badge key={d} variant="outline" className="gap-1"><FileText className="h-3 w-3" />{d}</Badge>
                  ))}
                </div>
              </div>
              {existingVR.files && existingVR.files.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{t('verification.selected_files')}</p>
                  <div className="space-y-2">
                    {existingVR.files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded border border-border p-2 text-sm">
                        {getFileIcon(f.type)}
                        <span className="flex-1">{f.name}</span>
                        <span className="text-muted-foreground text-xs">{formatFileSize(f.size)}</span>
                        <Button variant="outline" size="sm" onClick={() => f.url && window.open(f.url, '_blank', 'noopener,noreferrer')} disabled={!f.url}>{t('open_file')}</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t('verification.title')}</h1>
        </div>
        <p className="text-muted-foreground">{t('verification.subtitle')}</p>

        {/* Description */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('verification.description')}</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('verification.description_placeholder')}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('verification.files')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('verification.files_desc')}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" /> {t('verification.files')}
            </Button>
            {selectedFiles.length > 0 ? (
              <div className="space-y-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded border border-border p-2 text-sm">
                    {getFileIcon(f.type)}
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-muted-foreground text-xs">{formatFileSize(f.size)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('verification.no_files')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('verification.documents')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {documents.map((doc, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={doc}
                  onChange={(e) => { const d = [...documents]; d[i] = e.target.value; setDocuments(d); }}
                  placeholder={`Document URL or filename ${i + 1}`}
                />
                {documents.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setDocuments(documents.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setDocuments([...documents, ''])} className="gap-1">
              <Plus className="h-3 w-3" /> {t('verification.add_doc')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('verification.certificates')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {certificates.map((cert, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={cert}
                  onChange={(e) => { const c = [...certificates]; c[i] = e.target.value; setCertificates(c); }}
                  placeholder={`Certificate name ${i + 1}`}
                />
                {certificates.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setCertificates(certificates.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setCertificates([...certificates, ''])} className="gap-1">
              <Plus className="h-3 w-3" /> {t('verification.add_cert')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('verification.experience')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('verification.years_exp')}</Label>
              <Input type="number" min={0} value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder={t('verification.years_exp_placeholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('verification.service_areas')}</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {serviceAreas.map((area) => (
                  <Badge key={area} variant="secondary" className="gap-1">
                    {area}
                    <button onClick={() => setServiceAreas(serviceAreas.filter((a) => a !== area))}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder={t('verification.add_area')} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArea())} />
                <Button variant="outline" size="sm" onClick={addArea}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => void handleSubmit()} className="gap-2">
          <Shield className="h-4 w-4" /> {t('verification.submit')}
        </Button>
      </div>
    </PageTransition>
  );
};

export default ProviderVerificationPage;
