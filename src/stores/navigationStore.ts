import { create } from 'zustand';
import { PullRequest } from '../types/github';

interface NavigationState {
  allPullRequests: PullRequest[];
  currentPRIndex: number;
  setAllPullRequests: (prs: PullRequest[]) => void;
  setCurrentPR: (pr: PullRequest) => void;
  getNextPR: () => PullRequest | null;
  getPreviousPR: () => PullRequest | null;
  getCurrentPR: () => PullRequest | null;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  allPullRequests: [],
  currentPRIndex: -1,

  setAllPullRequests: prs => set({ allPullRequests: prs }),

  setCurrentPR: pr => {
    const { allPullRequests } = get();
    const index = allPullRequests.findIndex(p => p.id === pr.id);
    set({ currentPRIndex: index });
  },

  getNextPR: () => {
    const { allPullRequests, currentPRIndex } = get();
    if (currentPRIndex >= 0 && currentPRIndex < allPullRequests.length - 1) {
      return allPullRequests[currentPRIndex + 1];
    }
    return null;
  },

  getPreviousPR: () => {
    const { allPullRequests, currentPRIndex } = get();
    if (currentPRIndex > 0) {
      return allPullRequests[currentPRIndex - 1];
    }
    return null;
  },

  getCurrentPR: () => {
    const { allPullRequests, currentPRIndex } = get();
    if (currentPRIndex >= 0 && currentPRIndex < allPullRequests.length) {
      return allPullRequests[currentPRIndex];
    }
    return null;
  },
}));
