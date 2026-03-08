'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { authenticatedFetch } from '../../utils/api';

interface Post {
  _id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  tags: string[];
  upvotes: string[];
  downvotes: string[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface QuotedComment {
  commentId: string;
  authorName: string;
  content: string;
}

interface Comment {
  _id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  quotedComment?: QuotedComment;
  upvotes: string[];
  downvotes: string[];
  createdAt: string;
}

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [quotedComment, setQuotedComment] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', tags: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const loadPost = useCallback(async () => {
    const res = await fetch(`http://localhost:3001/api/community/posts/${postId}`);
    if (res.ok) {
      const data = await res.json();
      setPost(data);
      setEditForm({ title: data.title, content: data.content, tags: data.tags.join(', ') });
    } else if (res.status === 404) {
      router.push('/community');
    }
  }, [postId, router]);

  const loadComments = useCallback(async () => {
    const res = await fetch(`http://localhost:3001/api/community/comments/${postId}`);
    if (res.ok) setComments(await res.json());
  }, [postId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPost(), loadComments()]);
      setLoading(false);
    })();
  }, [loadPost, loadComments]);

  const handleVotePost = async (type: 'upvote' | 'downvote') => {
    if (!user) { router.push('/login'); return; }
    const res = await authenticatedFetch(
      `http://localhost:3001/api/community/posts/${postId}/vote`,
      { method: 'POST', body: JSON.stringify({ type }) },
    );
    if (res.ok) {
      const updated = await res.json();
      setPost(prev => prev ? { ...prev, upvotes: updated.upvotes, downvotes: updated.downvotes } : prev);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this post? All comments will also be removed.')) return;
    const res = await authenticatedFetch(
      `http://localhost:3001/api/community/posts/${postId}`,
      { method: 'DELETE' },
    );
    if (res.ok) router.push('/community');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const tags = editForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await authenticatedFetch(
        `http://localhost:3001/api/community/posts/${postId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ title: editForm.title, content: editForm.content, tags }),
        },
      );
      if (res.ok) {
        setPost(await res.json());
        setIsEditing(false);
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleVoteComment = async (commentId: string, type: 'upvote' | 'downvote') => {
    if (!user) { router.push('/login'); return; }
    const res = await authenticatedFetch(
      `http://localhost:3001/api/community/comments/${commentId}/vote`,
      { method: 'POST', body: JSON.stringify({ type }) },
    );
    if (res.ok) {
      const updated = await res.json();
      setComments(prev =>
        prev.map(c =>
          c._id === commentId ? { ...c, upvotes: updated.upvotes, downvotes: updated.downvotes } : c,
        ),
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    const res = await authenticatedFetch(
      `http://localhost:3001/api/community/comments/${commentId}`,
      { method: 'DELETE' },
    );
    if (res.ok) {
      setComments(prev => prev.filter(c => c._id !== commentId));
      setPost(prev => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev);
    }
  };

  const handleQuote = (comment: Comment) => {
    setQuotedComment(comment);
    commentInputRef.current?.focus();
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const body: Record<string, string> = { postId, content: commentText.trim() };
      if (quotedComment) body.quotedCommentId = quotedComment._id;
      const res = await authenticatedFetch('http://localhost:3001/api/community/comments', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [...prev, newComment]);
        setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
        setCommentText('');
        setQuotedComment(null);
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleSubmitReply = async (e: React.FormEvent, parentComment: Comment) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    if (!replyText.trim()) return;
    try {
      setSubmittingReply(true);
      const res = await authenticatedFetch('http://localhost:3001/api/community/comments', {
        method: 'POST',
        body: JSON.stringify({ postId, content: replyText.trim(), quotedCommentId: parentComment._id }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [...prev, newComment]);
        setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
        setReplyText('');
        setReplyingTo(null);
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  const renderCommentCard = (comment: Comment, isReply: boolean) => {
    const netVotes = comment.upvotes.length - comment.downvotes.length;
    const userUpvoted = user && comment.upvotes.includes(user.id);
    const userDownvoted = user && comment.downvotes.includes(user.id);
    const canDelete = user && (user.id === comment.authorId || user.role === 'admin');
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4${isReply ? ' border-l-4 border-l-indigo-200' : ''}`}>
        {comment.quotedComment && (
          <div className="mb-3 pl-3 border-l-2 border-blue-300 bg-blue-50 rounded-r-lg py-2 pr-3">
            <p className="text-xs font-semibold text-blue-700 mb-0.5">
              Quoting {comment.quotedComment.authorName}:
            </p>
            <p className="text-xs text-blue-600 italic line-clamp-2">
              {comment.quotedComment.content}
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <button
              onClick={() => handleVoteComment(comment._id, 'upvote')}
              className={`p-1 rounded transition-colors ${userUpvoted ? 'text-blue-600' : 'text-gray-300 hover:text-blue-600'}`}
              title="Upvote"
            >
              <svg className="w-4 h-4" fill={userUpvoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className={`text-xs font-bold ${netVotes > 0 ? 'text-blue-600' : netVotes < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {netVotes}
            </span>
            <button
              onClick={() => handleVoteComment(comment._id, 'downvote')}
              className={`p-1 rounded transition-colors ${userDownvoted ? 'text-red-500' : 'text-gray-300 hover:text-red-500'}`}
              title="Downvote"
            >
              <svg className="w-4 h-4" fill={userDownvoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{comment.authorName}</span>
                <span>·</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                {user && (
                  <button
                    onClick={() => setReplyingTo(comment)}
                    className="p-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Reply"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDeleteComment(comment._id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete comment"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Post not found.</p>
      </div>
    );
  }

  const postNetVotes = post.upvotes.length - post.downvotes.length;
  const userUpvotedPost = user && post.upvotes.includes(user.id);
  const userDownvotedPost = user && post.downvotes.includes(user.id);
  const canEditPost = user && (user.id === post.authorId || user.role === 'admin');
  const topLevelComments = comments;
  const repliesMap: Record<string, Comment[]> = {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/community')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Community
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ── Post card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isEditing ? (
            /* Edit form */
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Post</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={editForm.content}
                  onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags{' '}
                  <span className="text-gray-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 rounded-lg transition-colors"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            /* Post view */
            <div className="flex">
              {/* Vote sidebar */}
              <div className="flex flex-col items-center gap-1 px-4 py-6 bg-gray-50 border-r border-gray-100 flex-shrink-0">
                <button
                  onClick={() => handleVotePost('upvote')}
                  className={`p-2 rounded-lg transition-colors ${
                    userUpvotedPost
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title="Upvote"
                >
                  <svg className="w-6 h-6" fill={userUpvotedPost ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <span
                  className={`text-lg font-bold leading-none ${
                    postNetVotes > 0 ? 'text-blue-600' : postNetVotes < 0 ? 'text-red-500' : 'text-gray-400'
                  }`}
                >
                  {postNetVotes}
                </span>
                <button
                  onClick={() => handleVotePost('downvote')}
                  className={`p-2 rounded-lg transition-colors ${
                    userDownvotedPost
                      ? 'text-red-500 bg-red-50'
                      : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                  }`}
                  title="Downvote"
                >
                  <svg className="w-6 h-6" fill={userDownvotedPost ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Post body */}
              <div className="flex-1 p-6 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                    {post.title}
                  </h1>
                  {canEditPost && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit post"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={handleDeletePost}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete post"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mb-5">
                  <span className="font-medium text-gray-700">{post.authorName}</span>
                  <span>·</span>
                  <span>{formatDate(post.createdAt)}</span>
                  {post.updatedAt !== post.createdAt && (
                    <span className="italic text-gray-400">(edited)</span>
                  )}
                  <span>·</span>
                  <span>
                    {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
                  </span>
                  {post.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-full font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Content */}
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                  {post.content}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Comments ──────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </h2>

          {comments.length > 0 && (
            <div className="space-y-3 mb-6">
              {topLevelComments.map(comment => {
                const replies = repliesMap[comment._id] ?? [];
                return (
                  <div key={comment._id} className="space-y-2">
                    {renderCommentCard(comment, false)}

                    {/* Inline reply form for this comment */}
                    {replyingTo?._id === comment._id && (
                      <div className="ml-8">
                        <form
                          onSubmit={e => handleSubmitReply(e, comment)}
                          className="bg-indigo-50 border border-indigo-200 rounded-xl p-4"
                        >
                          <p className="text-xs font-semibold text-indigo-600 mb-2">
                            Replying to {comment.authorName}
                          </p>
                          <textarea
                            autoFocus
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Write your reply..."
                            rows={2}
                            className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y bg-white mb-2"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submittingReply || !replyText.trim()}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
                            >
                              {submittingReply ? 'Posting...' : 'Post Reply'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Nested replies */}
                    {replies.length > 0 && (
                      <div className="ml-8 space-y-2">
                        {replies.map(reply => (
                          <div key={reply._id} className="space-y-2">
                            {renderCommentCard(reply, true)}
                            {/* Inline reply form for a reply */}
                            {replyingTo?._id === reply._id && (
                              <form
                                onSubmit={e => handleSubmitReply(e, reply)}
                                className="bg-indigo-50 border border-indigo-200 rounded-xl p-4"
                              >
                                <p className="text-xs font-semibold text-indigo-600 mb-2">
                                  Replying to {reply.authorName}
                                </p>
                                <textarea
                                  autoFocus
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  placeholder="Write your reply..."
                                  rows={2}
                                  className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y bg-white mb-2"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setReplyingTo(null)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={submittingReply || !replyText.trim()}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
                                  >
                                    {submittingReply ? 'Posting...' : 'Post Reply'}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Reply form ──────────────────────────────────────────────── */}
          {user ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Leave a comment</h3>

              {/* Quote preview */}
              {quotedComment && (
                <div className="mb-3 flex items-start gap-2">
                  <div className="flex-1 pl-3 border-l-2 border-blue-300 bg-blue-50 rounded-r-lg py-2 pr-3">
                    <p className="text-xs font-semibold text-blue-700 mb-0.5">
                      Quoting {quotedComment.authorName}:
                    </p>
                    <p className="text-xs text-blue-600 line-clamp-2 italic">
                      {quotedComment.content}
                    </p>
                  </div>
                  <button
                    onClick={() => setQuotedComment(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
                    title="Remove quote"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmitComment}>
                <textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Write your comment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y mb-3"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-600 mb-3">Login to leave a comment</p>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
