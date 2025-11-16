import { memo } from 'react';
import { ExternalLink } from 'lucide-react';
import type { NewsArticle } from '@/domain/types';
import { formatDate } from '@/shared/utils/dateUtils';

interface NewsArticleCardProps {
  article: NewsArticle;
}

export const NewsArticleCard = memo<NewsArticleCardProps>(({ article }) => {
  return (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-100 mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2">
            {article.title}
          </h4>
          <p className="text-xs text-slate-400 line-clamp-2 mb-2">
            {article.summary}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{article.source}</span>
            <span>•</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-1" />
      </div>
    </a>
  );
});

NewsArticleCard.displayName = 'NewsArticleCard';

