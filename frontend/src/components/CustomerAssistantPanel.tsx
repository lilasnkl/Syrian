import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, ExternalLink, FileText, Send } from "lucide-react";
import { toast } from "sonner";

import { askProviderQuestion, type BackendAssistantTurn } from "@/features/customer-assistant";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface CustomerAssistantPanelProps {
  providerId: string;
}

export function CustomerAssistantPanel({ providerId }: CustomerAssistantPanelProps) {
  const { isAuthenticated, user } = useAuthStore();
  const { setLoginModalOpen } = useUIStore();
  const { t } = useLanguage();
  const [question, setQuestion] = useState("");
  const [turn, setTurn] = useState<BackendAssistantTurn | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    if (user?.role !== "client") {
      toast.error(t("assistant.customer_only"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await askProviderQuestion({
        provider_id: Number(providerId),
        question: trimmed,
      });
      setTurn(payload.turn);
      setQuestion("");
    } catch {
      toast.error(t("assistant.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-foreground">{t("assistant.title")}</h3>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2 sm:self-start">
            <Link to={`/assistant?provider=${providerId}`}>
              <ExternalLink className="h-4 w-4" />
              {t("assistant.open_full")}
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t("assistant.placeholder")}
            className="min-h-20 flex-1"
          />
          <Button onClick={() => void handleAsk()} disabled={!question.trim() || isSubmitting} className="gap-2 sm:self-end">
            <Send className="h-4 w-4" />
            {isSubmitting ? t("assistant.asking") : t("assistant.ask")}
          </Button>
        </div>

        {turn && (
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Badge variant={turn.answer_status === "answered" ? "default" : "secondary"}>
                {t(`assistant.status.${turn.answer_status}` as const)}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-foreground">{turn.answer}</p>
            {turn.customer_next_step && <p className="text-xs text-muted-foreground">{turn.customer_next_step}</p>}
            {turn.citations.length > 0 && (
              <div className="space-y-2">
                {turn.citations.map((citation) => (
                  <div key={citation.id} className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                    <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      {citation.source_title}
                    </div>
                    <p>{citation.quote}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
