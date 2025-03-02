// 新增 src/lib/store.ts
import { create } from 'zustand'

interface ChatState {
  inputValue: string
  setInputValue: (value: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  inputValue: '',
  setInputValue: (value) => set({ inputValue: value })
}))
