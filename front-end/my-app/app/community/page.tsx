'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/api';

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

const LIMIT = 15;

export default function CommunityPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'newest' | 'top' | 'mostCommented'>('newest');
  const [page, setPage] = useState(1);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        sort,
        page: page.toString(),
        limit: LIMIT.toString(),
      });
      const res = await fetch(`http://localhost:3001/api/community/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  }, [sort, page]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    setError('');
    try {
      setSubmitting(true);
      const tags = newPost.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      const res = await authenticatedFetch('http://localhost:3001/api/community/posts', {
        method: 'POST',
        body: JSON.stringify({ title: newPost.title, content: newPost.content, tags }),
      });
      if (res.ok) {
        setNewPost({ title: '', content: '', tags: '' });
        setShowNewPostForm(false);
        setSort('newest');
        setPage(1);
        loadPosts();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to create post');
      }
    } catch (err) {
      setError('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (postId: string, type: 'upvote' | 'downvote') => {
    if (!user) { router.push('/login'); return; }
    try {
      const res = await authenticatedFetch(
        `http://localhost:3001/api/community/posts/${postId}/vote`,
        { method: 'POST', body: JSON.stringify({ type }) },
      );
      if (res.ok) {
        const updated = await res.json();
        setPosts(prev =>
          prev.map(p =>
            p._id === postId
              ? { ...p, upvotes: updated.upvotes, downvotes: updated.downvotes }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Back to Home"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Community Forum</h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Share knowledge · Ask questions · Help others
              </p>
            </div>
          </div>
          {user ? (
            <button
              onClick={() => setShowNewPostForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Post</span>
              <span className="sm:hidden">Post</span>
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Login to Post
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* New post form */}
        {showNewPostForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Post</h2>
            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                  placeholder="Give your post a descriptive title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
                  placeholder="Write your post content..."
                  rows={7}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags{' '}
                  <span className="text-gray-400 font-normal">(comma-separated, optional)</span>
                </label>
                <input
                  type="text"
                  value={newPost.tags}
                  onChange={e => setNewPost(p => ({ ...p, tags: e.target.value }))}
                  placeholder="e.g. engine, brakes, DIY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowNewPostForm(false); setError(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sort controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {(['newest', 'top', 'mostCommented'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setSort(s); setPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  sort === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {s === 'newest' ? 'Newest' : s === 'top' ? 'Top Rated' : 'Most Discussed'}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500">{total} post{total !== 1 ? 's' : ''}</span>
        </div>

        {/* Post list */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="w-14 h-14 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="font-medium text-gray-700 text-lg">No posts yet</p>
            <p className="text-sm mt-1">Be the first to start a discussion!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const netVotes = post.upvotes.length - post.downvotes.length;
              const userUpvoted = user && post.upvotes.includes(user.id);
              const userDownvoted = user && post.downvotes.includes(user.id);
              const excerpt =
                post.content.length > 200
                  ? post.content.slice(0, 200) + '…'
                  : post.content;

              return (
                <div
                  key={post._id}
                  className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex gap-0">
                    {/* Vote column */}
                    <div className="flex flex-col items-center gap-0.5 px-3 py-5 border-r border-gray-100 flex-shrink-0">
                      <button
                        onClick={() => handleVote(post._id, 'upvote')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          userUpvoted
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        title="Upvote"
                      >
                        <svg className="w-5 h-5" fill={userUpvoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <span
                        className={`text-sm font-bold leading-none ${
                          netVotes > 0
                            ? 'text-blue-600'
                            : netVotes < 0
                            ? 'text-red-500'
                            : 'text-gray-400'
                        }`}
                      >
                        {netVotes}
                      </span>
                      <button
                        onClick={() => handleVote(post._id, 'downvote')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          userDownvoted
                            ? 'text-red-500 bg-red-50'
                            : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title="Downvote"
                      >
                        <svg className="w-5 h-5" fill={userDownvoted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Content area — clicks through to detail */}
                    <div
                      className="flex-1 p-4 cursor-pointer min-w-0"
                      onClick={() => router.push(`/community/${post._id}`)}
                    >
                      <h3 className="text-base font-semibold text-gray-900 mb-1.5 hover:text-blue-600 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">
                        {excerpt}
                      </p>
                      <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{post.authorName}</span>
                        <span>·</span>
                        <span>{formatDate(post.createdAt)}</span>
                        {post.updatedAt !== post.createdAt && (
                          <span className="italic text-gray-400">(edited)</span>
                        )}
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {post.commentCount}
                        </span>
                        {post.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-full font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
