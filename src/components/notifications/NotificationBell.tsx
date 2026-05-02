import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications via Realtime
    const setupChannel = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          () => fetchNotifications()
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    const cleanup = setupChannel();
    return () => { cleanup.then(fn => fn?.()); };
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unread.length === 0) return;
    for (const id of unread) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    }
    fetchNotifications();
  };

  const deleteOldNotifications = async () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", session.user.id)
      .lt("created_at", oneMonthAgo.toISOString());
    fetchNotifications();
  };

  const typeIcons: Record<string, string> = {
    appointment: "📅",
    review: "⭐",
    system: "🔔",
    info: "ℹ️",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}>
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-[70vh] flex flex-col" align="end" sideOffset={8} avoidCollisions>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-primary h-auto p-0" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-xs text-destructive h-auto p-0" onClick={deleteOldNotifications}>
              Delete old
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 overflow-auto" style={{ maxHeight: 'calc(70vh - 48px)' }}>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex gap-2">
                    <span className="text-base mt-0.5">{typeIcons[n.type] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
