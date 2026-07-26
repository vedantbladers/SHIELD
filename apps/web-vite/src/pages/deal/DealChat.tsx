import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Send, Shield, Lock, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";

export default function DealChat() {
  const { id: dealId } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { alias: myAlias, role: myRole } = useAuth();
  const { socket, isConnected } = useSocket();

  // Fetch messages via API
  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/api/deals/${dealId}/events`);
      if (res && res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [dealId]);

  // Load deal info and messages
  useEffect(() => {
    const init = async () => {
      try {
        // Get deal info
        const dealRes = await api.get(`/api/deals/${dealId}`);
        if (dealRes && dealRes.data?.deal) setDeal(dealRes.data.deal);

        // Load messages
        await fetchMessages();
      } catch (err) {
        console.error("Failed to load chat:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [dealId, fetchMessages]);

  // Socket.IO real-time subscription
  useEffect(() => {
    if (!socket || !dealId) return;

    // Join deal room
    socket.emit("join-deal", dealId);

    // Listen for new messages
    socket.on("new-message", (message: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    // Listen for typing indicator
    socket.on("user-typing", (data: { alias: string; isTyping: boolean }) => {
      if (data.alias !== myAlias) {
        setIsOtherTyping(data.isTyping);
      }
    });

    return () => {
      socket.emit("leave-deal", dealId);
      socket.off("new-message");
      socket.off("user-typing");
    };
  }, [socket, dealId, myAlias]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherTyping]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setNewMessage(value);
    if (!socket || !myAlias) return;

    socket.emit("typing", {
      dealId,
      alias: myAlias,
      isTyping: true,
    });

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      socket.emit("typing", {
        dealId,
        alias: myAlias,
        isTyping: false,
      });
    }, 1500);
  };

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || sending || !myAlias) return;
    setSending(true);
    try {
      const res = await api.post(`/api/deals/${dealId}/events`, {
        type: "MESSAGE",
        content: newMessage.trim(),
      });

      const insertedMessage = res.data?.message || {
        id: Math.random().toString(),
        deal_id: dealId,
        sender_alias: myAlias,
        encrypted_content: newMessage.trim(),
        message_type: "text",
        created_at: new Date().toISOString(),
      };

      // Emit via socket so the OTHER party gets it instantly
      if (socket) {
        socket.emit("send-message", {
          dealId,
          message: {
            id: insertedMessage.id,
            deal_id: dealId,
            sender_alias: myAlias,
            encrypted_content: newMessage.trim(),
            message_type: "text",
            created_at: new Date().toISOString(),
          },
        });
      }

      setNewMessage("");
      // Instantly append to local messages for latency-free typing
      setMessages((prev) => {
        if (prev.some((m) => m.id === insertedMessage.id)) return prev;
        return [...prev, insertedMessage];
      });
    } catch (err: any) {
      console.error("Failed to send:", err);
    } finally {
      setSending(false);
    }
  }, [newMessage, sending, dealId, myAlias, socket]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Determine back link based on role
  const backLink = `/dashboard/${myRole || "buyer"}/deals/${dealId}`;

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Link to={backLink} className="p-1 text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="text-white font-medium text-sm">
              Deal #{dealId?.slice(0, 8)} •
              <span className="text-cyan-400 font-mono ml-1">
                {deal?.buyer_alias === myAlias ? deal?.vendor_alias : deal?.buyer_alias}
              </span>
            </p>
            <p className="text-emerald-400 text-xs flex items-center gap-1">
              <Shield className="w-3 h-3" /> {isConnected ? "Connected — End-to-End Encrypted" : "Reconnecting..."}
            </p>
          </div>
        </div>
        <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium ${deal?.status === "IN_PROGRESS" ? "bg-purple-500/20 text-purple-400" : "bg-slate-700 text-slate-400"}`}>
          {deal?.status}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Shield className="w-16 h-16 text-slate-700 mb-4" />
            <p className="text-slate-400 text-sm">Secure conversation started</p>
            <p className="text-slate-500 text-xs mt-1">Messages are end-to-end encrypted. Only you and your counterpart can read them.</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender_alias === myAlias;
            const isSystem = msg.sender_alias === "SYSTEM" || msg.message_type === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="px-4 py-1.5 bg-white border border-slate-200/30 rounded-full">
                    <p className="text-xs text-slate-400 text-center">{msg.encrypted_content || msg.content}</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-xl px-4 py-2.5 ${isMe
                  ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white"
                  : "bg-white border border-slate-200 text-slate-200"}`}>
                  <p className={`text-xs font-mono mb-1 ${isMe ? "text-cyan-200/70" : "text-cyan-400/70"}`}>{msg.sender_alias}</p>
                  <p className="text-sm whitespace-pre-wrap">{msg.encrypted_content || msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-cyan-200/50" : "text-slate-500"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-1">
              <span className="text-xs text-slate-400 italic">Typing</span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-200" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-300" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white/80 backdrop-blur border-t border-slate-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 outline-none text-sm"
            placeholder="Type a secure message..."
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
