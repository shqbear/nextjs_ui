import { CoreMessage, generateId, Message } from "ai";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ChatSession {
  messages: Message[];
  createdAt: string;
}

interface State {
  base64Images: string[] | null;
  chats: Record<string, ChatSession>;
  currentChatId: string | null;
  selectedModel: string | null;
  userName: string | "用户";
  isDownloading: boolean;
  downloadProgress: number;
  downloadingModel: string | null;
}

interface Actions {
  setBase64Images: (base64Images: string[] | null) => void;
  setCurrentChatId: (chatId: string) => void;
  setSelectedModel: (selectedModel: string) => void;
  getChatById: (chatId: string) => ChatSession | undefined;
  getMessagesById: (chatId: string) => Message[];
  saveMessages: (chatId: string, messages: Message[]) => void;
  handleDelete: (chatId: string, messageId?: string) => void;
  setUserName: (userName: string) => void;
  startDownload: (modelName: string) => void;
  stopDownload: () => void;
  setDownloadProgress: (progress: number) => void;
}

const useChatStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      base64Images: null,
      chats: {},
      currentChatId: null,
      selectedModel: null,
      userName: "用户",
      isDownloading: false,
      downloadProgress: 0,
      downloadingModel: null, 

      setBase64Images: (base64Images) => set({ base64Images }),
      setUserName: (userName) => set({ userName }),

      setCurrentChatId: (chatId) => set({ currentChatId: chatId }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      getChatById: (chatId) => {
        const state = get();
        return state.chats[chatId];
      },
      getMessagesById: (chatId) => {
        const state = get();
        return state.chats[chatId]?.messages || [];
      },
      saveMessages: (chatId, messages) => {
        set((state) => {
          const existingChat = state.chats[chatId];
          const existingMessages = existingChat?.messages || [];
          
          console.log("==== saveMessages called ====");
          console.log(`Chat ID: ${chatId}`);
          
          // Merge with existing messages if needed
          let combinedMessages: Message[];
          
          // If saving just one message, check if it already exists
          if (messages.length === 1 && existingMessages.length > 0) {
            const newMsg = messages[0];
            const duplicate = existingMessages.find(m => 
              m.role === newMsg.role && m.content === newMsg.content
            );
            
            if (duplicate) {
              console.log(`Duplicate message detected! ID: ${duplicate.id}, not adding again`);
              return state; // Return unchanged state - no need to update
            }
            
            combinedMessages = [...existingMessages, ...messages];
          } else {
            combinedMessages = messages;
          }
          
          // Additional deduplication code here (similar to your current logic)
          
          return {
            chats: {
              ...state.chats,
              [chatId]: {
                messages: combinedMessages,
                createdAt: existingChat?.createdAt || new Date().toISOString(),
              },
            },
          };
        });
      },
      handleDelete: (chatId, messageId) => {
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;

          // If messageId is provided, delete specific message
          if (messageId) {
            const updatedMessages = chat.messages.filter(
              (message) => message.id !== messageId
            );
            return {
              chats: {
                ...state.chats,
                [chatId]: {
                  ...chat,
                  messages: updatedMessages,
                },
              },
            };
          }

          // If no messageId, delete the entire chat
          const { [chatId]: _, ...remainingChats } = state.chats;
          return {
            chats: remainingChats,
          };
        });
      },

      startDownload: (modelName) =>
        set({ isDownloading: true, downloadingModel: modelName, downloadProgress: 0 }),
      stopDownload: () =>
        set({ isDownloading: false, downloadingModel: null, downloadProgress: 0 }),
      setDownloadProgress: (progress) => set({ downloadProgress: progress }),
    }),
    {
      name: "nextjs-ollama-ui-state",
      partialize: (state) => ({
        chats: state.chats,
        currentChatId: state.currentChatId,
        selectedModel: state.selectedModel,
        userName: state.userName,
      }),
    }
  )
);

export default useChatStore;