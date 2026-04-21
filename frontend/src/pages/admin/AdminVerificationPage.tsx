import { useEffect, useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, FileText, File, Image, FileSpreadsheet, Eye } from 'lucide-react';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
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

const isImageFile = (file?: VerificationFile) => Boolean(file?.type?.startsWith('image/'));
const isPdfFile = (file?: VerificationFile) => file?.type === 'application/pdf';

const AdminVerificationPage = () => {
  const { verificationRequests, providers, updateVerificationStatus, revokeProviderVerification } = useDataStore();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState('');
  const [tab, setTab] = useState('all');
  const [viewingFiles, setViewingFiles] = useState<VerificationFile[] | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const { isLoading } = useSkeletonLoading();

  useEffect(() => {
    if (!viewingFiles?.length) {
      setActiveFileIndex(0);
      return;
    }

    if (activeFileIndex >= viewingFiles.length) {
      setActiveFileIndex(0);
    }
  }, [activeFileIndex, viewingFiles]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">{t('admin_verification.title')}</h1>
          <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        </div>
      </PageTransition>
    );
  }

  const filtered = tab === 'all' ? verificationRequests : verificationRequests.filter((v) => v.status === tab);
  const verifiedProviders = providers.filter((provider) => provider.verified);

  const handleApprove = async (id: string) => {
    await updateVerificationStatus(id, 'approved');
    toast({ title: t('admin_verification.approved_toast'), description: t('admin_verification.approved_desc') });
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) return;
    await updateVerificationStatus(id, 'rejected', rejectionReason);
    setRejectionReason('');
    toast({ title: t('admin_verification.rejected_toast'), description: t('admin_verification.rejected_desc') });
  };

  const handleRevokeProvider = async (providerId: string) => {
    await revokeProviderVerification(providerId);
    toast({ title: t('admin_verification.revoked_toast'), description: t('admin_verification.revoked_desc') });
  };

  const handleViewFiles = (files: VerificationFile[], initialIndex = 0) => {
    setViewingFiles(files);
    setActiveFileIndex(initialIndex);
  };

  const activeFile = viewingFiles?.[activeFileIndex];

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('admin_verification.title')}</h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">{t('status.all')}</TabsTrigger>
            <TabsTrigger value="pending">{t('status.pending')}</TabsTrigger>
            <TabsTrigger value="approved">{t('status.approved')}</TabsTrigger>
            <TabsTrigger value="rejected">{t('status.rejected')}</TabsTrigger>
            <TabsTrigger value="revoked">{t('status.revoked')}</TabsTrigger>
            <TabsTrigger value="providers">{t('admin_verification.providers_tab')}</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-4">
            {tab === 'providers' ? (
              verifiedProviders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('admin_verification.no_verified')}</p>
              ) : (
                verifiedProviders.map((provider) => (
                  <Card key={provider.id} className="border-border bg-card">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={provider.avatar} />
                          <AvatarFallback>{provider.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{provider.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{provider.category}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{provider.completedJobs} {t('provider.jobs_completed')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status="approved" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="gap-1"><XCircle className="h-4 w-4" /> {t('admin_verification.revoke')}</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('admin_verification.revoke_title')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('admin_verification.revoke_desc')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void handleRevokeProvider(provider.id)}>{t('admin_verification.revoke')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            ) : (
              <>
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t('admin_verification.no_requests')}</p>
                )}
                {filtered.map((vr) => (
              <Card key={vr.id} className="border-border bg-card">
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={vr.providerAvatar} />
                        <AvatarFallback>{vr.providerName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{vr.providerName}</p>
                        <p className="text-sm text-muted-foreground capitalize">{vr.category}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t('admin_verification.submitted')} {vr.submittedAt}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={vr.status} />
                      {vr.status === 'pending' && (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" className="gap-1"><CheckCircle className="h-4 w-4" /> {t('admin_verification.approve')}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('admin_verification.approve_title')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('admin_verification.approve_desc')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleApprove(vr.id)}>{t('admin_verification.approve')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="gap-1"><XCircle className="h-4 w-4" /> {t('admin_verification.reject')}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('admin_verification.reject_title')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('admin_verification.reject_desc')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <Textarea
                                placeholder={t('admin_verification.rejection_placeholder')}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="mt-2"
                              />
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setRejectionReason('')}>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void handleReject(vr.id)} disabled={!rejectionReason.trim()}>{t('admin_verification.reject')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {vr.description && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t('admin_verification.description')}</p>
                      <p className="text-sm">{vr.description}</p>
                    </div>
                  )}

                  {(vr.yearsExperience !== undefined || (vr.serviceAreas && vr.serviceAreas.length > 0)) && (
                    <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2">
                      {vr.yearsExperience !== undefined && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t('verification.years_exp')}</p>
                          <p className="text-sm">{vr.yearsExperience}</p>
                        </div>
                      )}
                      {vr.serviceAreas && vr.serviceAreas.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t('verification.service_areas')}</p>
                          <p className="text-sm">{vr.serviceAreas.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document names */}
                  <div className="flex flex-wrap gap-1">
                    {vr.documents.map((d) => (
                      <span key={d} className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" /> {d}
                      </span>
                    ))}
                  </div>

                  {/* Uploaded files */}
                  {vr.files && vr.files.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">{t('admin_verification.uploaded_files')} ({vr.files.length})</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs"
                          onClick={() => handleViewFiles(vr.files, 0)}
                        >
                          <Eye className="h-3 w-3" /> {t('admin_verification.view_file')}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {vr.files.map((f, i) => (
                          <div key={i} className="inline-flex items-center gap-1.5 rounded border border-border bg-secondary/50 px-2 py-1 text-xs">
                            {getFileIcon(f.type)}
                            <span>{f.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* File viewer dialog */}
        <Dialog open={!!viewingFiles} onOpenChange={(open) => !open && setViewingFiles(null)}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>{t('admin_verification.uploaded_files')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                {viewingFiles?.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveFileIndex(i)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${activeFileIndex === i ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/40'}`}
                  >
                    {getFileIcon(f.type)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.type} · {formatFileSize(f.size)}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-3 min-h-[65vh]">
                {activeFile?.url ? (
                  isImageFile(activeFile) ? (
                    <img src={activeFile.url} alt={activeFile.name} className="h-full max-h-[60vh] w-full rounded object-contain" />
                  ) : (
                    <iframe
                      src={activeFile.url}
                      title={activeFile.name}
                      className="h-[60vh] w-full rounded border-0 bg-background"
                    />
                  )
                ) : (
                  <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
                    {t('admin_verification.view_file')}
                  </div>
                )}

                {activeFile && !isImageFile(activeFile) && !isPdfFile(activeFile) && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {activeFile.type}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default AdminVerificationPage;
