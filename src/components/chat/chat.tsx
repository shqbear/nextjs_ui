"use client";

import ChatTopbar from "./chat-topbar";
import ChatList from "./chat-list";
import ChatBottombar from "./chat-bottombar";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { BytesOutputParser } from "@langchain/core/output_parsers";
import { Attachment, ChatRequestOptions, generateId } from "ai";
import { Message, useChat } from "ai/react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import useChatStore from "@/app/hooks/useChatStore";
import { useRouter } from "next/navigation";
import Image from "next/image";

export interface ChatProps {
  id: string;
  initialMessages: Message[] | [];
  isMobile?: boolean;
}

export default function Chat({ initialMessages, id, isMobile }: ChatProps) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    setInput,
    reload,
  } = useChat({
    id,
    initialMessages,
    onResponse: (response) => {
      if (response) {
        setLoadingSubmit(false);
      }
    },
    onFinish: (message) => {
      const savedMessages = getMessagesById(id);
      saveMessages(id, [...savedMessages, message]);
      setLoadingSubmit(false);
      router.replace(`/c/${id}`);
    },
    onError: (error) => {
      setLoadingSubmit(false);
      router.replace("/");
      console.error(error.message);
      console.error(error.cause);
    },
  });
  const [loadingSubmit, setLoadingSubmit] = React.useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const base64Images = useChatStore((state) => state.base64Images);
  const setBase64Images = useChatStore((state) => state.setBase64Images);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const saveMessages = useChatStore((state) => state.saveMessages);
  const getMessagesById = useChatStore((state) => state.getMessagesById);
  const router = useRouter();

  const [hasAutoSubmitted, setHasAutoSubmitted] = React.useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    window.history.replaceState({}, "", `/c/${id}`);

    if (!selectedModel) {
      toast.error("Please select a model");
      return;
    }

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input,
    };

    setLoadingSubmit(true);

    const attachments: Attachment[] = base64Images
      ? base64Images.map((image) => ({
          contentType: "image/base64",
          url: image,
        }))
      : [];

    const requestOptions: ChatRequestOptions = {
      body: {
        selectedModel: selectedModel,
      },
      ...(base64Images && {
        data: {
          images: base64Images,
        },
        experimental_attachments: attachments,
      }),
    };

    handleSubmit(e, requestOptions);
    saveMessages(id, [...messages, userMessage]);
    setBase64Images(null);
  };

  // Modified useEffect for persistent message display
useEffect(() => {
  console.log("Auto-submit effect running, initialMessages:", initialMessages.length, "hasAutoSubmitted:", hasAutoSubmitted);
  
  if (initialMessages.length > 0) {
    // Show initial messages immediately
    const uniqueMessages = initialMessages.filter((msg, index, arr) => {
      if (msg.role === 'user') {
        return arr.findIndex(m => m.role === 'user' && m.content === msg.content) === index;
      }
      return true;
    });
    
    // Set messages immediately so they appear right away
    setMessages(uniqueMessages);
    
    // Only auto-submit if needed
    if (!hasAutoSubmitted) {
      const hasAssistantResponse = initialMessages.some(msg => msg.role === "assistant");
      
      if (!hasAssistantResponse) {
        const lastUserMessage = [...initialMessages]
          .reverse()
          .find(msg => msg.role === "user");
        
        if (lastUserMessage && lastUserMessage.content && selectedModel) {
          // Create a copy of the message to ensure it persists
          const persistentUserMessage = {
            id: lastUserMessage.id || generateId(),
            role: "user",
            content: lastUserMessage.content
          };
          
          // Explicitly save this message to ensure persistence
          saveMessages(id, [persistentUserMessage]);
          
          // Set input without clearing messages
          setInput(typeof lastUserMessage.content === 'string' 
            ? lastUserMessage.content 
            : '');
          
          const event = {
            preventDefault: () => {},
          } as React.FormEvent<HTMLFormElement>;
          
          // Use a longer timeout to ensure UI stability
          setTimeout(() => {
            console.log("Executing auto-submit with persistent message");
            // Create a synthetic submission that preserves the message
            const requestOptions: ChatRequestOptions = {
              body: {
                selectedModel: selectedModel,
              }
            };
            
            // Submit directly through handleSubmit to bypass potential message clearing
            handleSubmit(event, requestOptions);
            setHasAutoSubmitted(true);
          }, 300);
        } else {
          setHasAutoSubmitted(true);
        }
      } else {
        setHasAutoSubmitted(true);
      }
    }
  }
}, [initialMessages, hasAutoSubmitted, selectedModel, id, saveMessages, generateId, setMessages, setInput, handleSubmit]);

  const removeLatestMessage = () => {
    const updatedMessages = messages.slice(0, -1);
    setMessages(updatedMessages);
    saveMessages(id, updatedMessages);
    return updatedMessages;
  };

  const handleStop = () => {
    stop();
    saveMessages(id, [...messages]);
    setLoadingSubmit(false);
  };

  return (
    <div className="flex flex-col w-full max-w-3xl h-full">
      <ChatTopbar
        isLoading={isLoading}
        chatId={id}
        messages={messages}
        setMessages={setMessages}
      />

      {messages.length === 0 ? (
        <div className="flex flex-col h-full w-full items-center gap-4 justify-center">
          <Image
            src="/ollama.png"
            alt="AI"
            width={40}
            height={40}
            className="h-16 w-14 object-contain dark:invert"
          />
          <p className="text-center text-base text-muted-foreground">
            How can I help you today?
          </p>
          <ChatBottombar
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={onSubmit}
            isLoading={isLoading}
            stop={handleStop}
            setInput={setInput}
          />
        </div>
      ) : (
        <>
          <ChatList
            messages={messages}
            isLoading={isLoading || hasAutoSubmitted && !isLoading} // Show loading state during auto-submit
            loadingSubmit={loadingSubmit}
            reload={async () => {
              removeLatestMessage();

              const requestOptions: ChatRequestOptions = {
                body: {
                  selectedModel: selectedModel,
                },
              };

              setLoadingSubmit(true);
              return reload(requestOptions);
            }}
          />
          <ChatBottombar
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={onSubmit}
            isLoading={isLoading}
            stop={handleStop}
            setInput={setInput}
          />
        </>
      )}
    </div>
  );
}
