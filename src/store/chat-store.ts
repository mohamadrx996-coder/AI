import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  provider?: string;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  lastProvider: string | null;
  remaining: number;
  characterLimit: number;
  usedCharacters: number;
  activeKey: string | null;
  chatId: string | null;
  _hasHydrated: boolean;
  addMessage: (role: 'user' | 'assistant', content: string, provider?: string) => void;
  setLoading: (loading: boolean) => void;
  setRemaining: (remaining: number, characterLimit?: number, usedCharacters?: number) => void;
  setActiveKey: (key: string | null) => void;
  setChatId: (chatId: string | null) => void;
  clearMessages: () => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isLoading: false,
      lastProvider: null,
      remaining: 0,
      characterLimit: 700,
      usedCharacters: 0,
      activeKey: null,
      chatId: null,
      _hasHydrated: false,
      addMessage: (role, content, provider) =>
        set((state) => ({
          messages: [...state.messages, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, role, content, timestamp: Date.now(), provider }],
          ...(provider ? { lastProvider: provider } : {}),
        })),
      setLoading: (isLoading) => set({ isLoading }),
      setRemaining: (remaining, characterLimit, usedCharacters) =>
        set((state) => ({
          remaining,
          ...(characterLimit !== undefined ? { characterLimit } : {}),
          ...(usedCharacters !== undefined ? { usedCharacters } : {}),
        })),
      setActiveKey: (activeKey) => set({ activeKey }),
      setChatId: (chatId) => set({ chatId }),
      clearMessages: () => set({ messages: [], lastProvider: null, chatId: null }),
      logout: () => set({ messages: [], lastProvider: null, activeKey: null, remaining: 0, characterLimit: 700, usedCharacters: 0, chatId: null }),
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
    }),
    {
      name: 'pygen-chat-storage',
      partialize: (state) => ({
        activeKey: state.activeKey,
        remaining: state.remaining,
        characterLimit: state.characterLimit,
        usedCharacters: state.usedCharacters,
        messages: state.messages,
        lastProvider: state.lastProvider,
        chatId: state.chatId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
