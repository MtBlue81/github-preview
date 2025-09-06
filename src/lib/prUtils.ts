import { PullRequest } from '../types/github';

export interface Category {
  title: string;
  icon: string;
}

export interface PRWithCategories extends PullRequest {
  categories: Category[];
}

export interface CategoryData {
  title: string;
  icon: string;
  prs: PullRequest[];
}

/**
 * PRを重複除外して統合し、カテゴリ情報を付与する
 */
export function deduplicatePullRequests(
  categories: CategoryData[],
  isIgnored: (prKey: string) => boolean,
  excludedLabels: Set<string>
): PRWithCategories[] {
  const prMap = new Map<string, PRWithCategories>();

  // 各カテゴリのPRをマップに追加
  categories.forEach(category => {
    category.prs.forEach((pr: PullRequest) => {
      const prKey = `${pr.repository.owner.login}:${pr.repository.name}:${pr.number}`;

      // 無視リストチェック
      if (isIgnored(prKey)) return;

      // 除外ラベルチェック
      const hasExcludedLabel = pr.labels.nodes.some(label =>
        excludedLabels.has(label.name)
      );
      if (hasExcludedLabel) return;

      if (prMap.has(pr.id)) {
        // 既存のPRにカテゴリを追加
        const existingPR = prMap.get(pr.id)!;
        existingPR.categories.push({
          title: category.title,
          icon: category.icon,
        });
      } else {
        // 新しいPRを追加
        prMap.set(pr.id, {
          ...pr,
          categories: [{ title: category.title, icon: category.icon }],
        });
      }
    });
  });

  // 更新日時でソート（新しい順）
  return Array.from(prMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * GraphQLクエリ用の検索文字列を生成する
 */
export function buildGitHubSearchQuery(
  username: string,
  type:
    | 'author'
    | 'assignee'
    | 'mentions'
    | 'review-requested'
    | 'reviewed-by'
    | 'commenter'
): string {
  const baseQuery = 'is:pr is:open';
  const sortQuery = 'sort:updated-desc';

  switch (type) {
    case 'author':
      return `${baseQuery} author:${username} ${sortQuery}`;
    case 'assignee':
      return `${baseQuery} assignee:${username} ${sortQuery}`;
    case 'mentions':
      return `${baseQuery} mentions:${username} ${sortQuery}`;
    case 'review-requested':
      return `${baseQuery} review-requested:${username} ${sortQuery}`;
    case 'reviewed-by':
      return `${baseQuery} reviewed-by:${username} ${sortQuery}`;
    case 'commenter':
      return `${baseQuery} commenter:${username} ${sortQuery}`;
    default:
      return `${baseQuery} ${sortQuery}`;
  }
}
