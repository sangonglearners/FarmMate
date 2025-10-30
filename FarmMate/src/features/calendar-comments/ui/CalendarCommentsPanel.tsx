import { useState } from "react";
import { MessageSquare, Send, Trash2, Edit2, X, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCalendarComments, useCreateCalendarComment, useDeleteCalendarComment, useUpdateCalendarComment } from "../model/calendar-comment.hooks";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/shared/api/calendar-share.repository";

interface CalendarCommentsPanelProps {
  calendarId: string;
  userRole: UserRole;
}

export function CalendarCommentsPanel({ calendarId, userRole }: CalendarCommentsPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useCalendarComments(calendarId);
  const createComment = useCreateCalendarComment();
  const updateComment = useUpdateCalendarComment();
  const deleteComment = useDeleteCalendarComment();

  // 댓글 읽기 권한: 소유자, editor, commenter
  const canReadComments = userRole === 'owner' || userRole === 'editor' || userRole === 'commenter';
  
  // 댓글 작성 권한: 소유자, editor, commenter
  const canWriteComments = userRole === 'owner' || userRole === 'editor' || userRole === 'commenter';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !canWriteComments) return;

    await createComment.mutateAsync({
      calendarId,
      content: newComment.trim(),
    });
    setNewComment("");
  };

  const handleEditStart = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditContent(currentContent);
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleEditSave = async (commentId: string) => {
    if (!editContent.trim()) return;

    await updateComment.mutateAsync({
      commentId,
      content: editContent.trim(),
    });
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleDelete = async (commentId: string) => {
    if (confirm("이 댓글을 삭제하시겠습니까?")) {
      await deleteComment.mutateAsync(commentId);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "?";
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" aria-label="댓글" title="댓글">
          <MessageSquare className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>댓글</SheetTitle>
          <SheetDescription>
            캘린더에 대한 의견을 남겨주세요
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* 댓글 목록 */}
          {!canReadComments ? (
            <div className="text-center py-8 text-gray-500">
              <p>댓글을 볼 권한이 없습니다.</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <p>댓글을 불러오는 중...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>아직 댓글이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(comment.userDisplayName, comment.userEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {comment.userDisplayName || comment.userEmail}
                          </p>
                          <p className="text-xs text-gray-500">
                            {comment.userEmail}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {(() => {
                            const date = new Date(comment.createdAt);
                            const year = date.getFullYear().toString().slice(-2);
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hour = date.getHours();
                            const minute = String(date.getMinutes()).padStart(2, '0');
                            const period = hour >= 12 ? 'p.m.' : 'a.m.';
                            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            
                            return `${year}.${month}.${day} ${String(displayHour).padStart(2, '0')}:${minute}${period}`;
                          })()}
                        </span>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2 mt-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleEditSave(comment.id)}
                              disabled={!editContent.trim() || updateComment.isPending}
                            >
                              저장
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={handleEditCancel}
                              disabled={updateComment.isPending}
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {comment.content}
                          </p>
                          {user?.id === comment.userId && (
                            <div className="flex justify-end mt-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 px-2">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditStart(comment.id, comment.content)}>
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    수정
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(comment.id)} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    삭제
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 댓글 작성 폼 */}
          {canWriteComments ? (
            <form onSubmit={handleSubmit} className="pt-4 border-t border-gray-200">
              <div className="space-y-2">
                <Textarea
                  placeholder="댓글을 입력하세요..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={!newComment.trim() || createComment.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createComment.isPending ? "작성 중..." : "댓글 작성"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                댓글을 작성할 권한이 없습니다.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

