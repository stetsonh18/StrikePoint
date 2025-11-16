import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Star, Calendar, TrendingUp, BookOpen, Filter, Edit, Trash2, X } from 'lucide-react';
import type { JournalEntry, JournalEntryType, EmotionType } from '@/domain/types';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';
import { useAuthStore } from '@/application/stores/auth.store';
import {
  useJournalEntries,
  useJournalStats,
  useDeleteJournalEntry,
} from '@/application/hooks/useJournal';
import { JournalEntryForm } from '@/presentation/components/JournalEntryForm';
import { Select } from '@/presentation/components/Select';
import { LoadingSpinner } from '@/presentation/components/LoadingSpinner';
import { EmptyState } from '@/presentation/components/EmptyState';
import { EnhancedEmptyState, EmptyJournal } from '@/presentation/components/EnhancedEmptyState';
import { useToast } from '@/shared/hooks/useToast';
import { ConfirmationDialog } from '@/presentation/components/ConfirmationDialog';
import { useConfirmation } from '@/shared/hooks/useConfirmation';

const EMOTION_OPTIONS: { value: EmotionType; label: string }[] = [
  { value: 'confident', label: 'Confident' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'excited', label: 'Excited' },
  { value: 'fearful', label: 'Fearful' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'frustrated', label: 'Frustrated' },
  { value: 'greedy', label: 'Greedy' },
  { value: 'disciplined', label: 'Disciplined' },
];

const ENTRY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'pre_trade', label: 'Pre-Trade' },
  { value: 'post_trade', label: 'Post-Trade' },
  { value: 'lesson_learned', label: 'Lessons' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'general', label: 'General' },
];

const Journal: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const toast = useToast();
  const confirmation = useConfirmation();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<JournalEntryType | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  // Delete confirmation
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // Fetch data
  const filters = useMemo(() => {
    const filterObj: any = {};
    if (filterType !== 'all') {
      filterObj.entryType = filterType;
    }
    if (startDate) {
      filterObj.startDate = startDate;
    }
    if (endDate) {
      filterObj.endDate = endDate;
    }
    if (selectedEmotions.length > 0) {
      filterObj.emotions = selectedEmotions;
    }
    if (selectedTags.length > 0) {
      filterObj.tags = selectedTags;
    }
    return filterObj;
  }, [filterType, startDate, endDate, selectedEmotions, selectedTags]);

  const { data: entries = [], isLoading: entriesLoading } = useJournalEntries(userId, filters);
  const { data: stats } = useJournalStats(userId);
  const deleteMutation = useDeleteJournalEntry();

  // Filter entries by search query (client-side since it's text search)
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;

    const query = searchQuery.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        entry.linkedSymbols?.some((symbol) => symbol.toLowerCase().includes(query)) ||
        entry.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [entries, searchQuery]);

  // Get unique tags from entries for filter
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((entry) => {
      entry.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [entries]);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setTagInput('');
    }
  }, [tagInput, selectedTags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleToggleEmotion = useCallback((emotion: EmotionType) => {
    setSelectedEmotions((prev) => {
      if (prev.includes(emotion)) {
        return prev.filter((e) => e !== emotion);
      } else {
        return [...prev, emotion];
      }
    });
  }, []);

  const handleEdit = useCallback((entry: JournalEntry) => {
    setEditingEntry(entry);
    setShowAddModal(true);
  }, []);

  const handleDelete = async (entryId: string) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Journal Entry',
      message: 'Are you sure you want to delete this journal entry? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      setDeletingEntryId(entryId);
      await deleteMutation.mutateAsync(entryId);
      toast.success('Journal entry deleted successfully');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setEditingEntry(null);
  }, []);

  const handleSuccess = useCallback(() => {
    handleCloseModal();
  }, [handleCloseModal]);

  const getEntryTypeColor = (type: JournalEntryType) => {
    const colors = {
      pre_trade: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      post_trade: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      lesson_learned: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      strategy: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      general: 'bg-slate-800/50 text-slate-300 border border-slate-700/50',
    };
    return colors[type];
  };

  const getEmotionEmoji = (emotion: EmotionType) => {
    const emojis = {
      confident: '💪',
      anxious: '😰',
      excited: '🚀',
      fearful: '😨',
      neutral: '😐',
      frustrated: '😤',
      greedy: '🤑',
      disciplined: '🎯',
    };
    return emojis[emotion];
  };

  const formatDate = formatDateUtil;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Trading Journal
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Document your trades, track lessons learned, and improve your strategy
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all"
        >
          <Plus size={18} className="inline mr-2" />
          New Entry
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Entries"
          value={stats?.totalEntries.toString() || '0'}
          icon={BookOpen}
          positive
        />
        <StatCard
          title="This Month"
          value={stats?.entriesThisMonth.toString() || '0'}
          icon={Calendar}
          positive
        />
        <StatCard
          title="Avg Setup Quality"
          value={
            stats?.averageSetupQuality
              ? `${stats.averageSetupQuality.toFixed(1)}/10`
              : 'N/A'
          }
          icon={TrendingUp}
          positive
        />
        <StatCard
          title="Avg Execution"
          value={
            stats?.averageExecutionQuality
              ? `${stats.averageExecutionQuality.toFixed(1)}/10`
              : 'N/A'
          }
          icon={Star}
          positive
        />
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-4">
        <div className="space-y-4">
          {/* First Row: Search and Entry Type */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[300px]">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-400" />
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as JournalEntryType | 'all')}
                options={ENTRY_TYPE_OPTIONS}
                size="sm"
              />
            </div>
          </div>

          {/* Second Row: Date Range */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Date Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="Start date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                placeholder="End date"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Third Row: Emotions */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-400">Emotions:</span>
            {EMOTION_OPTIONS.map((emotion) => (
              <button
                key={emotion.value}
                type="button"
                onClick={() => handleToggleEmotion(emotion.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedEmotions.includes(emotion.value)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:border-emerald-500/50'
                }`}
              >
                {getEmotionEmoji(emotion.value)} {emotion.label}
              </button>
            ))}
            {selectedEmotions.length > 0 && (
              <button
                onClick={() => setSelectedEmotions([])}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Fourth Row: Tags */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-400">Tags:</span>
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag filter"
                className="flex-1 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium transition-all"
              >
                Add
              </button>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-slate-800/50 text-slate-300 border border-slate-700/50 text-xs rounded flex items-center gap-1"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Journal Entries */}
      <div className="space-y-4">
        {entriesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-2xl border border-slate-800/50 p-6"
                aria-hidden="true"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-slate-800/50 rounded w-48" />
                  <div className="h-8 w-8 bg-slate-800/50 rounded-lg" />
                </div>
                <div className="h-4 bg-slate-800/50 rounded w-full mb-2" />
                <div className="h-4 bg-slate-800/50 rounded w-5/6 mb-4" />
                <div className="flex items-center gap-2">
                  <div className="h-3 bg-slate-800/50 rounded w-20" />
                  <div className="h-3 bg-slate-800/50 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          searchQuery || filterType !== 'all' || startDate || endDate || selectedEmotions.length > 0 || selectedTags.length > 0 ? (
            <EnhancedEmptyState
              icon={BookOpen}
              title="No journal entries match your filters"
              description="Try adjusting your filters to see more results"
              action={{
                label: 'Clear Filters',
                onClick: () => {
                  setSearchQuery('');
                  setFilterType('all');
                  setStartDate('');
                  setEndDate('');
                  setSelectedEmotions([]);
                  setSelectedTags([]);
                },
                variant: 'secondary',
              }}
              tips={[
                'Try removing date range filters',
                'Clear emotion and tag filters',
                'Use broader search terms',
              ]}
            />
          ) : (
            <EmptyJournal onNewEntry={() => setShowAddModal(true)} />
          )
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-100">{entry.title}</h3>
                    {entry.isFavorite && (
                      <Star size={18} className="text-emerald-400 fill-current" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getEntryTypeColor(
                        entry.entryType
                      )}`}
                    >
                      {entry.entryType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-400">{formatDate(entry.entryDate)}</span>
                    {entry.strategy && (
                      <span className="text-sm text-slate-400">Strategy: {entry.strategy}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
                    title="Edit entry"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingEntryId === entry.id}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete entry"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <p className="text-slate-300 mb-4">{entry.content}</p>

              {/* Linked Symbols */}
              {entry.linkedSymbols && entry.linkedSymbols.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-slate-400">Symbols:</span>
                  <div className="flex gap-2">
                    {entry.linkedSymbols.map((symbol) => (
                      <span
                        key={symbol}
                        className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded"
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Emotions */}
              {entry.emotions && entry.emotions.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-slate-400">Emotions:</span>
                  <div className="flex gap-2">
                    {entry.emotions.map((emotion) => (
                      <span key={emotion} className="text-lg" title={emotion}>
                        {getEmotionEmoji(emotion)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality Ratings */}
              {(entry.setupQuality || entry.executionQuality) && (
                <div className="flex gap-6 mb-3">
                  {entry.setupQuality && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Setup:</span>
                      <span className="text-sm font-semibold text-slate-100">
                        {entry.setupQuality}/10
                      </span>
                    </div>
                  )}
                  {entry.executionQuality && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Execution:</span>
                      <span className="text-sm font-semibold text-slate-100">
                        {entry.executionQuality}/10
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Lessons and Action Items */}
              {entry.lessonsLearned && (
                <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <p className="text-sm font-medium text-emerald-400 mb-1">Lesson Learned:</p>
                  <p className="text-sm text-slate-300">{entry.lessonsLearned}</p>
                </div>
              )}

              {entry.actionItems && entry.actionItems.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-slate-100 mb-2">Action Items:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {entry.actionItems.map((item, index) => (
                      <li key={index} className="text-sm text-slate-300">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Attachments */}
              {(entry.imageUrls?.length > 0 || entry.chartUrls?.length > 0) && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-slate-100 mb-2">Attachments:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {entry.imageUrls?.map((url, index) => (
                      <img
                        key={`img-${index}`}
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                        loading="lazy"
                      />
                    ))}
                    {entry.chartUrls?.map((url, index) => (
                      <img
                        key={`chart-${index}`}
                        src={url}
                        alt={`Chart ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-slate-800/50 text-slate-300 border border-slate-700/50 text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Journal Entry Form Modal */}
      {showAddModal && (
        <JournalEntryForm
          userId={userId}
          entry={editingEntry || undefined}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmLabel={confirmation.options.confirmLabel}
        cancelLabel={confirmation.options.cancelLabel}
        variant={confirmation.options.variant}
        onConfirm={confirmation.handleConfirm}
        onCancel={confirmation.handleCancel}
      />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  positive: boolean;
}

const StatCard = ({ title, value, icon: Icon, positive }: StatCardProps) => (
  <div className="group relative bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-100">{value}</p>
    </div>
  </div>
);

export default Journal;
