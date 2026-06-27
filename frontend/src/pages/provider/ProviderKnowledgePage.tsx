import { useEffect, useRef, useState } from "react";
import { Archive, FileText, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  archiveKnowledgeSource,
  listKnowledgeSources,
  reindexKnowledgeSource,
  uploadKnowledgeSource,
  type BackendKnowledgeSource,
  type KnowledgeVisibility,
} from "@/features/knowledge";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

const visibilityOptions: KnowledgeVisibility[] = [
  "public_marketplace",
  "customer_after_contact",
  "customer_after_order",
  "provider_private",
];

function statusVariant(status: BackendKnowledgeSource["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "failed" || status === "rejected") return "destructive";
  if (status === "archived") return "outline";
  return "secondary";
}

export default function ProviderKnowledgePage() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<BackendKnowledgeSource[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<KnowledgeVisibility>("public_marketplace");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processNow, setProcessNow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSources = async () => {
    const payload = await listKnowledgeSources();
    setSources(payload.sources);
  };

  useEffect(() => {
    void loadSources()
      .catch(() => toast.error(t("knowledge.load_error")))
      .finally(() => setIsLoading(false));
  }, [t]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVisibility("public_marketplace");
    setSelectedFile(null);
    setProcessNow(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !selectedFile) {
      toast.error(t("knowledge.validation_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      await uploadKnowledgeSource({
        title: title.trim(),
        description: description.trim(),
        visibility,
        file: selectedFile,
        processNow,
      });
      await loadSources();
      resetForm();
      toast.success(t("knowledge.uploaded"));
    } catch {
      toast.error(t("knowledge.upload_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (sourceId: number) => {
    await archiveKnowledgeSource(sourceId);
    await loadSources();
    toast.success(t("knowledge.archived"));
  };

  const handleReindex = async (sourceId: number) => {
    await reindexKnowledgeSource(sourceId);
    await loadSources();
    toast.success(t("knowledge.reindex_queued"));
  };

  return (
    <PageTransition>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">{t("knowledge.title")}</h1>
          <p className="text-muted-foreground">{t("knowledge.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("knowledge.upload_title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <Label>{t("knowledge.field.title")}</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("knowledge.placeholder.title")} />
            </div>
            <div className="space-y-2">
              <Label>{t("knowledge.field.visibility")}</Label>
              <Select value={visibility} onValueChange={(value) => setVisibility(value as KnowledgeVisibility)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((option) => (
                    <SelectItem key={option} value={option}>{t(`knowledge.visibility.${option}` as const)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full gap-2">
                <Upload className="h-4 w-4" />
                {selectedFile ? selectedFile.name : t("knowledge.choose_file")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.csv,.pdf,.xlsx,.xls,.docx"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>{t("knowledge.field.description")}</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("knowledge.placeholder.description")} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
              <Label>{t("knowledge.process_now")}</Label>
              <Switch checked={processNow} onCheckedChange={setProcessNow} />
            </div>
            <div className="lg:col-span-3">
              <Button onClick={() => void handleUpload()} disabled={isSubmitting} className="gap-2">
                <Upload className="h-4 w-4" />
                {isSubmitting ? t("knowledge.uploading") : t("knowledge.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {sources.map((source) => (
            <Card key={source.id} className={cn(source.status === "archived" && "opacity-70")}>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{source.title}</h3>
                    <Badge variant={statusVariant(source.status)}>{t(`knowledge.status.${source.status}` as const)}</Badge>
                    <Badge variant="outline">{t(`knowledge.visibility.${source.visibility}` as const)}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{source.original_filename || source.description}</p>
                  {source.error_detail && <p className="mt-1 text-sm text-destructive">{source.error_detail}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" title={t("knowledge.reindex")} onClick={() => void handleReindex(source.id)} disabled={source.status === "archived"}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title={t("knowledge.archive")} onClick={() => void handleArchive(source.id)} disabled={source.status === "archived"}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isLoading && sources.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
            {t("knowledge.empty")}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

