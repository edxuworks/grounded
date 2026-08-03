/**
 * CommentStream — Deal Comment Thread
 *
 * Lists all comments on a deal, oldest first, with author name + role badge.
 * Authenticated users can post new comments. Authors and moderators can delete.
 */

import { useState, useRef, useEffect } from "react";
import { Send, Trash2 } from "lucide-react";
import { trpc, queryClient } from "@/api/trpc";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";

interface CommentStreamProps {
  dealId: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export function CommentStream({ dealId }: CommentStreamProps) {
  const { activeWorkspaceId, userRole } = useWorkspace();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: comments, isLoading } = trpc.comment.listByDeal.useQuery(
    { dealId, workspaceId: activeWorkspaceId },
    { enabled: !!dealId }
  );

  // Fetch current user ID from auth.me so we can show delete on own comments.
  const { data: me } = trpc.auth.me.useQuery();

  const createMutation = trpc.comment.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["comment", "listByDeal"]] });
      setText("");
    },
  });

  const deleteMutation = trpc.comment.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["comment", "listByDeal"]] });
    },
  });

  // Scroll to bottom when new comments load.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments?.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    createMutation.mutate({ dealId, workspaceId: activeWorkspaceId, text: text.trim() });
  };

  if (isLoading) {
    return <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />)}</div>;
  }

  const isModerator = userRole === "OWNER" || userRole === "ADMIN";

  return (
    <div className="flex flex-col gap-3">
      {/* Comment list */}
      <div className="space-y-3 max-h-64 overflow-y-auto styled-scrollbar pr-1">
        {(!comments || comments.length === 0) && (
          <p className="text-xs text-land-muted text-center py-4">No comments yet.</p>
        )}
        {comments?.map((c) => {
          const isOwn = c.authorId === me?.id;
          const canDelete = isOwn || isModerator;
          return (
            <div key={c.id} className="group flex gap-2.5">
              {/* Avatar initial */}
              <div className="w-7 h-7 rounded-full bg-land-accent/20 flex items-center justify-center text-xs font-medium text-land-accent shrink-0 mt-0.5">
                {(c.author.fullName ?? c.author.email)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-medium text-land-text">
                    {c.author.fullName ?? c.author.email}
                  </span>
                  {c.authorRole && (
                    <span className="text-xs text-land-muted bg-white/5 px-1 py-0.5 rounded">
                      {ROLE_LABELS[c.authorRole] ?? c.authorRole}
                    </span>
                  )}
                  <span className="text-xs text-land-muted ml-auto">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => deleteMutation.mutate({ id: c.id, workspaceId: activeWorkspaceId })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-land-muted hover:text-red-400"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-land-text/80 break-words">{c.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose box */}
      <div className="flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Add a comment…"
          rows={2}
          className="flex-1 px-2.5 py-2 text-xs bg-land-surface border border-white/10 rounded-lg text-land-text placeholder-land-muted focus:outline-none focus:ring-1 focus:ring-land-accent/50 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || createMutation.isPending}
          className="p-2 bg-land-accent rounded-lg text-white hover:bg-land-accent-hover transition-colors disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
