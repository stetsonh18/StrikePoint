import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Star, Upload, XCircle, Plus, Trash2 } from 'lucide-react';
import type { JournalEntry, JournalEntryType, EmotionType } from '@/domain/types';
import { useCreateJournalEntry, useUpdateJournalEntry } from '@/application/hooks/useJournal';
import { usePositions } from '@/application/hooks/usePositions';
import { useTransactions } from '@/application/hooks/useTransactions';
import { StorageService } from '@/infrastructure/services/storageService';
import { Select } from './Select';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { logger } from '@/shared/utils/logger';

interface JournalEntryFormProps {
  userId: string;
  entry?: JournalEntry;
  onClose: () => void;
  onSuccess: () => void;
}

const EMOTION_OPTIONS: { value: EmotionType; label: string; emoji: string }[] = [
  { value: 'confident', label: 'Confident', emoji: '💪' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'excited', label: 'Excited', emoji: '🚀' },
  { value: 'fearful', label: 'Fearful', emoji: '😨' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { value: 'greedy', label: 'Greedy', emoji: '🤑' },
  { value: 'disciplined', label: 'Disciplined', emoji: '🎯' },
];

const ENTRY_TYPE_OPTIONS = [
  { value: 'pre_trade', label: 'Pre-Trade' },
  { value: 'post_trade', label: 'Post-Trade' },
  { value: 'lesson_learned', label: 'Lesson Learned' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'general', label: 'General' },
];

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
  userId,
  entry,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!entry;
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const { data: positions = [] } = usePositions(userId);
  const { data: transactions = [] } = useTransactions(userId);

  // Core fields
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');
  const [entryType, setEntryType] = useState<JournalEntryType>(entry?.entryType || 'general');
  const [entryDate, setEntryDate] = useState(() => {
    if (entry?.entryDate) {
      return entry.entryDate;
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Linked data
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);

  // Update selected IDs when entry or data loads
  useEffect(() => {
    if (entry?.linkedTradeIds && positions.length > 0) {
      const positionIds = entry.linkedTradeIds.filter((id: string) => 
        positions.some((p: any) => p.id === id)
      );
      setSelectedPositionIds(positionIds);
    }
  }, [entry?.linkedTradeIds, positions]);

  useEffect(() => {
    if (entry?.linkedTradeIds && transactions.length > 0) {
      const transactionIds = entry.linkedTradeIds.filter((id: string) => 
        transactions.some((t: any) => t.id === id)
      );
      setSelectedTransactionIds(transactionIds);
    }
  }, [entry?.linkedTradeIds, transactions]);
  const [linkedSymbols, setLinkedSymbols] = useState<string[]>(entry?.linkedSymbols || []);
  const [symbolInput, setSymbolInput] = useState('');

  // Emotional tracking
  const [emotions, setEmotions] = useState<EmotionType[]>(entry?.emotions || []);
  const [marketCondition, setMarketCondition] = useState(entry?.marketCondition || '');

  // Strategy
  const [strategy, setStrategy] = useState(entry?.strategy || '');
  const [setupQuality, setSetupQuality] = useState<string>(entry?.setupQuality?.toString() || '');
  const [executionQuality, setExecutionQuality] = useState<string>(
    entry?.executionQuality?.toString() || ''
  );

  // Analysis
  const [whatWentWell, setWhatWentWell] = useState(entry?.whatWentWell || '');
  const [whatWentWrong, setWhatWentWrong] = useState(entry?.whatWentWrong || '');
  const [lessonsLearned, setLessonsLearned] = useState(entry?.lessonsLearned || '');
  const [actionItems, setActionItems] = useState<string[]>(entry?.actionItems || []);
  const [actionItemInput, setActionItemInput] = useState('');

  // Attachments
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [chartFiles, setChartFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(entry?.imageUrls || []);
  const [existingChartUrls, setExistingChartUrls] = useState<string[]>(entry?.chartUrls || []);

  // Organization
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(entry?.isFavorite || false);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const isSectionExpanded = (section: string) => expandedSections.has(section);

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const chartInputRef = useRef<HTMLInputElement>(null);

  // Handle symbol input
  const handleAddSymbol = () => {
    const symbol = symbolInput.trim().toUpperCase();
    if (symbol && !linkedSymbols.includes(symbol)) {
      setLinkedSymbols([...linkedSymbols, symbol]);
      setSymbolInput('');
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    setLinkedSymbols(linkedSymbols.filter((s) => s !== symbol));
  };

  // Handle action items
  const handleAddActionItem = () => {
    const item = actionItemInput.trim();
    if (item && !actionItems.includes(item)) {
      setActionItems([...actionItems, item]);
      setActionItemInput('');
    }
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  // Handle tags
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Handle file uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });
    setImageFiles([...imageFiles, ...validFiles]);
  };

  const handleChartUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'].includes(
        file.type
      );
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });
    setChartFiles([...chartFiles, ...validFiles]);
  };

  const handleRemoveImageFile = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  };

  const handleRemoveChartFile = (index: number) => {
    setChartFiles(chartFiles.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (url: string) => {
    setExistingImageUrls(existingImageUrls.filter((u) => u !== url));
  };

  const handleRemoveExistingChart = (url: string) => {
    setExistingChartUrls(existingChartUrls.filter((u) => u !== url));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!title.trim()) {
        throw new Error('Title is required');
      }
      if (!content.trim()) {
        throw new Error('Content is required');
      }

      // Upload new files
      const newImageUrls: string[] = [];
      const newChartUrls: string[] = [];
      const entryId = entry?.id || 'temp-' + Date.now();

      for (const file of imageFiles) {
        try {
          const result = await StorageService.uploadJournalImage(userId, entryId, file);
          newImageUrls.push(result.url);
        } catch (err) {
          logger.error('Error uploading image', err);
        }
      }

      for (const file of chartFiles) {
        try {
          const result = await StorageService.uploadJournalChart(userId, entryId, file);
          newChartUrls.push(result.url);
        } catch (err) {
          logger.error('Error uploading chart', err);
        }
      }

      // Combine existing and new URLs
      const allImageUrls = [...existingImageUrls, ...newImageUrls];
      const allChartUrls = [...existingChartUrls, ...newChartUrls];

      // Prepare entry data
      const entryData = {
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        entry_type: entryType,
        entry_date: entryDate,
        linked_position_ids: selectedPositionIds,
        linked_transaction_ids: selectedTransactionIds,
        linked_symbols: linkedSymbols,
        emotions: emotions,
        market_condition: marketCondition || undefined,
        strategy: strategy || undefined,
        setup_quality: setupQuality ? parseInt(setupQuality, 10) : undefined,
        execution_quality: executionQuality ? parseInt(executionQuality, 10) : undefined,
        what_went_well: whatWentWell || undefined,
        what_went_wrong: whatWentWrong || undefined,
        lessons_learned: lessonsLearned || undefined,
        action_items: actionItems,
        image_urls: allImageUrls,
        chart_urls: allChartUrls,
        tags: tags,
        is_favorite: isFavorite,
      };

      if (isEditing && entry) {
        await updateMutation.mutateAsync({ id: entry.id, updates: entryData });
      } else {
        await createMutation.mutateAsync(entryData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      logger.error('Error saving journal entry', err);
      setError(err.message || 'Failed to save journal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Collapsible section component
  const CollapsibleSection: React.FC<{
    title: string;
    sectionKey: string;
    children: React.ReactNode;
  }> = ({ title, sectionKey, children }) => {
    const isExpanded = isSectionExpanded(sectionKey);
    return (
      <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800/70 flex items-center justify-between transition-colors"
        >
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">{title}</span>
          {isExpanded ? (
            <ChevronUp size={18} className="text-slate-600 dark:text-slate-400" />
          ) : (
            <ChevronDown size={18} className="text-slate-600 dark:text-slate-400" />
          )}
        </button>
        {isExpanded && <div className="p-4 space-y-4">{children}</div>}
      </div>
    );
  };

  const modalRef = useFocusTrap(true);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, isSubmitting]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="journal-entry-title"
      aria-describedby="journal-entry-description"
    >
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 id="journal-entry-title" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
            </h2>
            <p id="journal-entry-description" className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isEditing ? 'Update your journal entry' : 'Document your trade, lesson, or strategy'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X className="text-slate-600 dark:text-slate-400" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Core Fields - Always Visible */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Entry Type *
                </label>
                <Select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as JournalEntryType)}
                  options={ENTRY_TYPE_OPTIONS}
                  fullWidth
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Entry Date *
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Content / Notes *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Collapsible Sections */}
          <div className="space-y-4">
            {/* Linked Trades & Symbols */}
            <CollapsibleSection title="Linked Trades & Symbols" sectionKey="linked">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Link Positions
                  </label>
                  <select
                    multiple
                    value={selectedPositionIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                      setSelectedPositionIds(selected);
                    }}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 min-h-[100px]"
                    disabled={isSubmitting}
                  >
                    {positions.map((position: any) => (
                      <option key={position.id} value={position.id}>
                        {position.symbol} - {position.asset_type} ({position.side})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Hold Ctrl/Cmd to select multiple positions
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Link Transactions
                  </label>
                  <select
                    multiple
                    value={selectedTransactionIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                      setSelectedTransactionIds(selected);
                    }}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 min-h-[100px]"
                    disabled={isSubmitting}
                  >
                    {transactions.slice(0, 100).map((transaction: any) => (
                      <option key={transaction.id} value={transaction.id}>
                        {transaction.description} - {transaction.activity_date}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Hold Ctrl/Cmd to select multiple transactions
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Manual Symbols
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={symbolInput}
                      onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSymbol();
                        }
                      }}
                      placeholder="Enter symbol (e.g., AAPL)"
                      className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={handleAddSymbol}
                      className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all"
                      disabled={isSubmitting}
                    >
                      Add
                    </button>
                  </div>
                  {linkedSymbols.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {linkedSymbols.map((symbol) => (
                        <span
                          key={symbol}
                          className="px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded flex items-center gap-1"
                        >
                          {symbol}
                          <button
                            type="button"
                            onClick={() => handleRemoveSymbol(symbol)}
                            className="hover:text-emerald-500 dark:hover:text-emerald-300"
                            disabled={isSubmitting}
                          >
                            <XCircle size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Emotional & Market Context */}
            <CollapsibleSection title="Emotional & Market Context" sectionKey="emotions">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Emotions
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {EMOTION_OPTIONS.map((emotion) => (
                      <label
                        key={emotion.value}
                        className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-lg cursor-pointer hover:border-emerald-500/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={emotions.includes(emotion.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEmotions([...emotions, emotion.value]);
                            } else {
                              setEmotions(emotions.filter((e) => e !== emotion.value));
                            }
                          }}
                          className="w-4 h-4 text-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-emerald-500/50"
                          disabled={isSubmitting}
                        />
                        <span className="text-lg">{emotion.emoji}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{emotion.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Market Condition
                  </label>
                  <input
                    type="text"
                    value={marketCondition}
                    onChange={(e) => setMarketCondition(e.target.value)}
                    placeholder="e.g., Bullish, Bearish, Sideways, Volatile"
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Strategy & Quality Ratings */}
            <CollapsibleSection title="Strategy & Quality Ratings" sectionKey="strategy">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Strategy
                  </label>
                  <input
                    type="text"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    placeholder="e.g., Breakout, Pullback, Momentum"
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Setup Quality (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={setupQuality}
                      onChange={(e) => setSetupQuality(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Execution Quality (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={executionQuality}
                      onChange={(e) => setExecutionQuality(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Analysis */}
            <CollapsibleSection title="Analysis" sectionKey="analysis">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    What Went Well
                  </label>
                  <textarea
                    value={whatWentWell}
                    onChange={(e) => setWhatWentWell(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    What Went Wrong
                  </label>
                  <textarea
                    value={whatWentWrong}
                    onChange={(e) => setWhatWentWrong(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Lessons Learned
                  </label>
                  <textarea
                    value={lessonsLearned}
                    onChange={(e) => setLessonsLearned(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Action Items
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={actionItemInput}
                      onChange={(e) => setActionItemInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddActionItem();
                        }
                      }}
                      placeholder="Enter action item"
                      className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={handleAddActionItem}
                      className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all"
                      disabled={isSubmitting}
                    >
                      <Plus size={18} className="inline" />
                    </button>
                  </div>
                  {actionItems.length > 0 && (
                    <ul className="space-y-2">
                      {actionItems.map((item, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg"
                        >
                          <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveActionItem(index)}
                            className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                            disabled={isSubmitting}
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Attachments */}
            <CollapsibleSection title="Attachments" sectionKey="attachments">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Images
                  </label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    <Upload size={18} />
                    Upload Images (JPG, PNG, WebP - Max 5MB)
                  </button>
                  {(imageFiles.length > 0 || existingImageUrls.length > 0) && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {existingImageUrls.map((url, index) => (
                        <div key={`existing-${index}`} className="relative">
                          <img
                            src={url}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(url)}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-full"
                            disabled={isSubmitting}
                          >
                            <XCircle size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                      {imageFiles.map((file, index) => (
                        <div key={`new-${index}`} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`New ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImageFile(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-full"
                            disabled={isSubmitting}
                          >
                            <XCircle size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Charts
                  </label>
                  <input
                    ref={chartInputRef}
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/jpg"
                    multiple
                    onChange={handleChartUpload}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => chartInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    <Upload size={18} />
                    Upload Charts (PNG, SVG, JPG - Max 5MB)
                  </button>
                  {(chartFiles.length > 0 || existingChartUrls.length > 0) && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {existingChartUrls.map((url, index) => (
                        <div key={`existing-${index}`} className="relative">
                          <img
                            src={url}
                            alt={`Existing chart ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingChart(url)}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-full"
                            disabled={isSubmitting}
                          >
                            <XCircle size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                      {chartFiles.map((file, index) => (
                        <div key={`new-${index}`} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`New chart ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveChartFile(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-full"
                            disabled={isSubmitting}
                          >
                            <XCircle size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Organization */}
            <CollapsibleSection title="Organization" sectionKey="organization">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
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
                      placeholder="Enter tag"
                      className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all"
                      disabled={isSubmitting}
                    >
                      Add
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/50 text-xs rounded flex items-center gap-1"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-red-600 dark:hover:text-red-400"
                            disabled={isSubmitting}
                          >
                            <XCircle size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFavorite}
                      onChange={(e) => setIsFavorite(e.target.checked)}
                      className="w-5 h-5 text-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-emerald-500/50"
                      disabled={isSubmitting}
                    />
                    <Star
                      size={18}
                      className={isFavorite ? 'text-emerald-600 dark:text-emerald-400 fill-current' : 'text-slate-500 dark:text-slate-400'}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Mark as favorite</span>
                  </label>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800/70 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium transition-all"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

