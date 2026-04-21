import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { RequireAuth } from '@/components/RouteGuards';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { ListItemSkeleton } from '@/components/PageSkeleton';
import { ArrowLeft, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const ChatPage = () => {
  const { user } = useAuthStore();
  const { conversations, messages, hydrateConversationMessages, sendMessage } = useDataStore();
  const { isLoading } = useSkeletonLoading();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [text, setText] = useState('');

  const myConvs = conversations.filter((c) => c.participants.some((p) => p.id === user?.id));
  const activeConv = myConvs.find((c) => c.id === activeConvId);
  const convMessages = messages.filter((m) => m.conversationId === activeConvId);
  const otherParticipant = activeConv?.participants.find((p) => p.id !== user?.id);
  const requestedConversationId = searchParams.get('conversation');

  useEffect(() => {
    if (requestedConversationId && myConvs.some((conversation) => conversation.id === requestedConversationId)) {
      setActiveConvId(requestedConversationId);
      return;
    }

    if (activeConvId && !myConvs.some((conversation) => conversation.id === activeConvId)) {
      setActiveConvId(null);
    }
  }, [activeConvId, myConvs, requestedConversationId]);

  useEffect(() => {
    if (!activeConvId) {
      return;
    }

    void hydrateConversationMessages(activeConvId);
  }, [activeConvId, hydrateConversationMessages]);

  const handleSend = async () => {
    if (!text.trim() || !activeConvId || !user) return;
    await sendMessage(activeConvId, text.trim());
    setText('');
  };

  const formatTime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <RequireAuth>
        <PageTransition>
          <div className="p-6 max-w-5xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold mb-4">{t('chat.title')}</h1>
            {Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}
          </div>
        </PageTransition>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <PageTransition>
        <div className="p-6 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">{t('chat.title')}</h1>
          <Card className="border-border bg-card overflow-hidden flex h-[calc(100vh-12rem)]">
            <div className={cn(
              "w-full sm:w-80 border-r border-border shrink-0 flex flex-col",
              activeConvId ? "hidden sm:flex" : "flex"
            )}>
              <ScrollArea className="flex-1">
                {myConvs.map((conv) => {
                  const other = conv.participants.find((p) => p.id !== user?.id);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={cn(
                        "w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors border-b border-border/50",
                        activeConvId === conv.id && "bg-muted/40"
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={other?.avatar} />
                        <AvatarFallback>{other?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{other?.name}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(conv.lastMessageAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">{conv.unreadCount}</Badge>
                      )}
                    </button>
                  );
                })}
              </ScrollArea>
            </div>

            <div className={cn(
              "flex-1 flex flex-col",
              !activeConvId ? "hidden sm:flex" : "flex"
            )}>
              {!activeConvId ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">{t('chat.select_conversation')}</div>
              ) : (
                <>
                  <div className="p-3 border-b border-border flex items-center gap-3">
                    <button onClick={() => setActiveConvId(null)} className="sm:hidden"><ArrowLeft className="h-5 w-5" /></button>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={otherParticipant?.avatar} />
                      <AvatarFallback>{otherParticipant?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{otherParticipant?.name}</span>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {convMessages.map((msg) => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                            <div className={cn(
                              "max-w-[75%] px-4 py-2 rounded-2xl text-sm",
                              isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                            )}>
                              <p>{msg.text}</p>
                              <p className={cn("text-xs mt-1", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>{formatTime(msg.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t border-border flex gap-2">
                    <Input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t('chat.type_message')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button size="icon" onClick={() => void handleSend()} disabled={!text.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </PageTransition>
    </RequireAuth>
  );
};

export default ChatPage;
