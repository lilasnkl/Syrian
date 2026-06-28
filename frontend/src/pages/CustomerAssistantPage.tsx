import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUp,
  Bot,
  CheckCircle,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { PageTransition } from "@/components/PageTransition";
import { RatingStars } from "@/components/RatingStars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  askProviderQuestion,
  listAssistantSessionTurns,
  type BackendAssistantCitation,
  type BackendAssistantTurn,
} from "@/features/customer-assistant";
import { useLanguage } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/stores/data-store";
import { CATEGORIES, type Provider } from "@/types";

type AssistantStatus = BackendAssistantTurn["answer_status"];
type ProviderCategoryFilter = Provider["category"] | "all";

type ChatMessage =
  | {
      id: string;
      role: "customer";
      content: string;
      createdAt: string;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
      createdAt: string;
      answerStatus: AssistantStatus;
      nextStep: string;
      citations: BackendAssistantCitation[];
    };

interface ProviderConversation {
  sessionId: number | null;
  messages: ChatMessage[];
}

const emptyConversation: ProviderConversation = {
  sessionId: null,
  messages: [],
};

const statusBadgeClass: Record<AssistantStatus, string> = {
  answered: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  insufficient_evidence: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  blocked_by_policy: "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  error: "border-destructive/25 bg-destructive/10 text-destructive",
};

const promptKeys = [
  "assistant_chat.prompt.services",
  "assistant_chat.prompt.pricing",
  "assistant_chat.prompt.availability",
  "assistant_chat.prompt.prepare",
] as const;

const INITIAL_PROVIDER_LIMIT = 12;
const SEARCH_PROVIDER_LIMIT = 25;

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCategoryLabel(provider: Provider): string {
  return CATEGORIES.find((category) => category.value === provider.category)?.label ?? provider.category;
}

function getCitationLocation(citation: BackendAssistantCitation): string {
  const parts = [];
  if (citation.page_number) {
    parts.push(`p. ${citation.page_number}`);
  }
  if (citation.row_number) {
    parts.push(`row ${citation.row_number}`);
  }
  return parts.join(" - ");
}

function getProviderSearchText(provider: Provider): string {
  return [
    provider.name,
    provider.location,
    provider.category,
    provider.bio,
    ...provider.skills,
    ...provider.services.map((service) => service.title),
  ]
    .join(" ")
    .toLowerCase();
}

function mapTurnToMessages(turn: BackendAssistantTurn): ChatMessage[] {
  return [
    {
      id: `turn-${turn.id}-question`,
      role: "customer",
      content: turn.question,
      createdAt: turn.created_at,
    },
    {
      id: `turn-${turn.id}-answer`,
      role: "assistant",
      content: turn.answer,
      createdAt: turn.created_at,
      answerStatus: turn.answer_status,
      nextStep: turn.customer_next_step,
      citations: turn.citations,
    },
  ];
}

export default function CustomerAssistantPage() {
  const { providers, isHydrated } = useDataStore();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedProviderId = searchParams.get("provider");
  const requestedSessionId = searchParams.get("session");
  const [providerSearch, setProviderSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategoryFilter>("all");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(requestedProviderId);
  const [question, setQuestion] = useState("");
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, ProviderConversation>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadedSessionKeysRef = useRef(new Set<string>());

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) ?? null;
  const activeConversation = selectedProviderId ? conversations[selectedProviderId] ?? emptyConversation : emptyConversation;
  const isSubmitting = Boolean(selectedProviderId && pendingProviderId === selectedProviderId);
  const hasProviderSearch = providerSearch.trim().length > 0;
  const hasProviderFilter = hasProviderSearch || selectedCategory !== "all";

  const filteredProviders = useMemo(() => {
    const query = providerSearch.trim().toLowerCase();
    const sorted = [...providers].sort((left, right) => {
      if (left.verified !== right.verified) {
        return left.verified ? -1 : 1;
      }
      return right.rating - left.rating;
    });

    return sorted.filter((provider) => {
      if (selectedCategory !== "all" && provider.category !== selectedCategory) {
        return false;
      }
      if (!query) {
        return true;
      }
      return getProviderSearchText(provider).includes(query);
    });
  }, [providerSearch, providers, selectedCategory]);

  const visibleProviderLimit = hasProviderFilter ? SEARCH_PROVIDER_LIMIT : INITIAL_PROVIDER_LIMIT;
  const visibleProviders = filteredProviders.slice(0, visibleProviderLimit);
  const providerResults =
    selectedProvider && !visibleProviders.some((provider) => provider.id === selectedProvider.id)
      ? [selectedProvider, ...visibleProviders]
      : visibleProviders;

  useEffect(() => {
    if (!isHydrated || providers.length === 0) {
      return;
    }

    if (!requestedProviderId) {
      setSelectedProviderId(null);
      return;
    }

    if (providers.some((provider) => provider.id === requestedProviderId)) {
      setSelectedProviderId(requestedProviderId);
      return;
    }

    setSelectedProviderId(null);
  }, [isHydrated, providers, requestedProviderId, selectedProviderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversation.messages.length, isSubmitting, selectedProviderId]);

  useEffect(() => {
    if (!selectedProviderId || !requestedSessionId) {
      return;
    }

    const numericSessionId = Number(requestedSessionId);
    if (!Number.isFinite(numericSessionId)) {
      return;
    }

    const sessionKey = `${selectedProviderId}:${numericSessionId}`;
    const currentConversation = conversations[selectedProviderId];
    if (
      loadedSessionKeysRef.current.has(sessionKey) ||
      (currentConversation?.sessionId === numericSessionId && currentConversation.messages.length > 0)
    ) {
      return;
    }

    loadedSessionKeysRef.current.add(sessionKey);
    void listAssistantSessionTurns(numericSessionId)
      .then((payload) => {
        const messages = payload.turns.flatMap(mapTurnToMessages);
        setConversations((current) => ({
          ...current,
          [selectedProviderId]: {
            sessionId: numericSessionId,
            messages,
          },
        }));
      })
      .catch(() => {
        loadedSessionKeysRef.current.delete(sessionKey);
        toast.error(t("assistant_chat.session_error"));
      });
  }, [conversations, requestedSessionId, selectedProviderId, t]);

  const handleSelectProvider = (providerId: string) => {
    setSelectedProviderId(providerId);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("provider", providerId);
      const sessionId = conversations[providerId]?.sessionId;
      if (sessionId) {
        next.set("session", String(sessionId));
      } else {
        next.delete("session");
      }
      return next;
    });
  };

  const resetActiveConversation = () => {
    if (!selectedProviderId) {
      return;
    }

    setConversations((current) => ({
      ...current,
      [selectedProviderId]: emptyConversation,
    }));
    setQuestion("");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("session");
      return next;
    });
  };

  const appendMessage = (providerId: string, message: ChatMessage, sessionId?: number | null) => {
    setConversations((current) => {
      const existing = current[providerId] ?? emptyConversation;
      return {
        ...current,
        [providerId]: {
          sessionId: sessionId ?? existing.sessionId,
          messages: [...existing.messages, message],
        },
      };
    });
  };

  const handleAsk = async (event?: FormEvent<HTMLFormElement>, promptOverride?: string) => {
    event?.preventDefault();
    const providerId = selectedProviderId;
    const provider = selectedProvider;
    const trimmedQuestion = (promptOverride ?? question).trim();

    if (!providerId || !provider || !trimmedQuestion || pendingProviderId) {
      return;
    }

    const numericProviderId = Number(providerId);
    if (!Number.isFinite(numericProviderId)) {
      toast.error(t("assistant_chat.provider_error"));
      return;
    }

    const currentConversation = conversations[providerId] ?? emptyConversation;
    appendMessage(providerId, {
      id: createMessageId(),
      role: "customer",
      content: trimmedQuestion,
      createdAt: new Date().toISOString(),
    });
    setQuestion("");
    setPendingProviderId(providerId);

    try {
      const payload = await askProviderQuestion({
        provider_id: numericProviderId,
        session_id: currentConversation.sessionId,
        question: trimmedQuestion,
      });
      appendMessage(
        providerId,
        {
          id: `turn-${payload.turn.id}`,
          role: "assistant",
          content: payload.turn.answer,
          createdAt: payload.turn.created_at,
          answerStatus: payload.turn.answer_status,
          nextStep: payload.turn.customer_next_step,
          citations: payload.turn.citations,
        },
        payload.turn.session_id,
      );
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("provider", providerId);
        next.set("session", String(payload.turn.session_id));
        return next;
      });
    } catch {
      appendMessage(providerId, {
        id: createMessageId(),
        role: "assistant",
        content: t("assistant_chat.error_message"),
        createdAt: new Date().toISOString(),
        answerStatus: "error",
        nextStep: "",
        citations: [],
      });
      toast.error(t("assistant.error"));
    } finally {
      setPendingProviderId(null);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleAsk();
    }
  };

  const renderProviderButton = (provider: Provider) => {
    const isActive = provider.id === selectedProviderId;
    const providerConversation = conversations[provider.id];

    return (
      <button
        key={provider.id}
        type="button"
        onClick={() => handleSelectProvider(provider.id)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors",
          isActive ? "border-primary/40 bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/40",
        )}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={provider.avatar} />
          <AvatarFallback>{provider.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{provider.name}</span>
            {provider.verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{getCategoryLabel(provider)}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            <span>{provider.rating.toFixed(1)}</span>
          </div>
        </div>
        {isActive ? (
          <Badge variant="secondary" className="shrink-0">
            {t("assistant_chat.selected")}
          </Badge>
        ) : providerConversation?.messages.length ? (
          <Badge variant="secondary" className="shrink-0">
            {Math.ceil(providerConversation.messages.length / 2)}
          </Badge>
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
    );
  };

  return (
    <PageTransition>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t("assistant_chat.title")}</h1>
                {selectedProvider && (
                  <p className="text-sm text-muted-foreground">
                    {selectedProvider.name} - {getCategoryLabel(selectedProvider)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={resetActiveConversation} disabled={!selectedProviderId || activeConversation.messages.length === 0}>
                <MessageSquarePlus className="h-4 w-4" />
                {t("assistant_chat.new_chat")}
              </Button>
              {selectedProvider && (
                <Button asChild className="gap-2">
                  <Link to={`/providers/${selectedProvider.id}`}>
                    <FileText className="h-4 w-4" />
                    {t("assistant_chat.open_profile")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:p-6">
          <aside className="flex min-h-[360px] flex-col rounded-md border border-border bg-card">
            <div className="space-y-4 border-b border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{t("assistant_chat.provider_label")}</p>
                <Badge variant="outline">{providers.length}</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                <Input
                  value={providerSearch}
                  onChange={(event) => setProviderSearch(event.target.value)}
                  placeholder={t("assistant_chat.provider_search")}
                  className="pl-9 rtl:pl-3 rtl:pr-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    selectedCategory === "all"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("assistant_chat.all_categories")}
                </button>
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setSelectedCategory(category.value)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      selectedCategory === category.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`cat.${category.value}` as TranslationKey)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {hasProviderFilter
                  ? t("assistant_chat.showing_results")
                      .replace("{shown}", String(visibleProviders.length))
                      .replace("{total}", String(filteredProviders.length))
                  : t("assistant_chat.top_providers").replace("{count}", String(visibleProviders.length))}
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 p-3">
                {providerResults.map(renderProviderButton)}
                {isHydrated && filteredProviders.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {t("assistant_chat.no_providers")}
                  </div>
                )}
                {isHydrated && filteredProviders.length > visibleProviders.length && (
                  <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    {t("assistant_chat.refine_results")}
                  </div>
                )}
                {!isHydrated && (
                  <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("loading")}
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>

          <section className="flex min-h-[680px] flex-col overflow-hidden rounded-md border border-border bg-card">
            {selectedProvider ? (
              <>
                <div className="flex flex-col gap-4 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedProvider.avatar} />
                      <AvatarFallback>{selectedProvider.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold text-foreground">{selectedProvider.name}</h2>
                        {selectedProvider.verified && (
                          <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                            <CheckCircle className="h-3.5 w-3.5" />
                            {t("provider.verified")}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <RatingStars rating={selectedProvider.rating} size={13} />
                        <span>{selectedProvider.rating.toFixed(1)}</span>
                        <span>-</span>
                        <span>{selectedProvider.location}</span>
                        <span>-</span>
                        <span>{selectedProvider.responseTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{getCategoryLabel(selectedProvider)}</Badge>
                    <Badge variant="outline">
                      {selectedProvider.services.length} {t("assistant_chat.services")}
                    </Badge>
                    <Badge variant="outline">
                      ${selectedProvider.hourlyRate}
                      {t("price.per_hour")}
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="mx-auto flex min-h-[470px] w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6">
                    {activeConversation.messages.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Sparkles className="h-7 w-7" />
                        </div>
                        <h3 className="mt-4 text-2xl font-semibold text-foreground">
                          {t("assistant_chat.empty_title").replace("{provider}", selectedProvider.name)}
                        </h3>
                        <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                          {promptKeys.map((key) => {
                            const prompt = t(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => void handleAsk(undefined, prompt)}
                                className="rounded-md border border-border bg-background px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                              >
                                {prompt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      activeConversation.messages.map((message) => (
                        <div key={message.id} className={cn("flex gap-3", message.role === "customer" ? "justify-end" : "justify-start")}>
                          {message.role === "assistant" && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <Bot className="h-4 w-4" />
                            </div>
                          )}
                          <div className={cn("max-w-[min(760px,88%)] space-y-3", message.role === "customer" && "flex flex-col items-end")}>
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-3 text-sm leading-6",
                                message.role === "customer"
                                  ? "rounded-br-md bg-primary text-primary-foreground"
                                  : "rounded-bl-md border border-border bg-background text-foreground",
                              )}
                            >
                              {message.content}
                            </div>
                            {message.role === "assistant" && (
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className={cn("border", statusBadgeClass[message.answerStatus])}>
                                    {t(`assistant.status.${message.answerStatus}` as TranslationKey)}
                                  </Badge>
                                  {message.citations.length > 0 && (
                                    <Badge variant="secondary">
                                      {message.citations.length} {t("assistant_chat.sources")}
                                    </Badge>
                                  )}
                                </div>
                                {message.nextStep && <p className="text-sm text-muted-foreground">{message.nextStep}</p>}
                                {message.citations.length > 0 && (
                                  <div className="grid gap-2">
                                    {message.citations.map((citation) => {
                                      const location = getCitationLocation(citation);
                                      return (
                                        <div key={`${message.id}-${citation.id}`} className="rounded-md border border-border bg-muted/25 p-3">
                                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                                            <FileText className="h-3.5 w-3.5 text-primary" />
                                            <span className="font-medium text-foreground">{citation.source_title}</span>
                                            {location && <span className="text-muted-foreground">{location}</span>}
                                            <span className="text-muted-foreground">
                                              {Math.round(citation.relevance_score * 100)}%
                                            </span>
                                          </div>
                                          <p className="text-xs leading-5 text-muted-foreground">{citation.quote}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {isSubmitting && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("assistant.asking")}
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>

                <Separator />
                <form onSubmit={(event) => void handleAsk(event)} className="p-3 sm:p-4">
                  <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-md border border-border bg-background p-2 focus-within:ring-1 focus-within:ring-ring">
                    <Textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={t("assistant_chat.composer_placeholder")}
                      className="max-h-40 min-h-12 flex-1 resize-none border-0 bg-transparent px-2 py-3 shadow-none focus-visible:ring-0"
                      disabled={isSubmitting}
                    />
                    <Button type="submit" size="icon" disabled={!question.trim() || isSubmitting} className="h-10 w-10 shrink-0">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                {isHydrated ? (
                  <div className="max-w-2xl text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Search className="h-7 w-7" />
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold text-foreground">{t("assistant_chat.choose_provider_title")}</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      {t("assistant_chat.choose_provider_subtitle")}
                    </p>
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      {visibleProviders.slice(0, 4).map((provider) => (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => handleSelectProvider(provider.id)}
                          className="rounded-md border border-border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={provider.avatar} />
                              <AvatarFallback>{provider.name.slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{provider.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {getCategoryLabel(provider)} - {provider.rating.toFixed(1)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <Button asChild variant="outline" className="mt-6">
                      <Link to="/providers">{t("assistant_chat.browse_all")}</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("loading")}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
