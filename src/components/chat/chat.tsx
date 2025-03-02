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
  initmodel?: string;
  isMobile?: boolean;
}

export default function Chat({ initialMessages, initmodel, id, isMobile }: ChatProps) {
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
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);
  const saveMessages = useChatStore((state) => state.saveMessages);
  const getMessagesById = useChatStore((state) => state.getMessagesById);
  const router = useRouter();

  const [hasAutoSubmitted, setHasAutoSubmitted] = React.useState(false);

  const hasAutoSubmittedRef = React.useRef(false);

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

  useEffect(() => {
    console.log("---- useEffect triggered ----");
    console.log("Current state - hasAutoSubmitted:", hasAutoSubmitted);
    console.log("Current ref - hasAutoSubmittedRef.current:", hasAutoSubmittedRef.current);
    console.log("initialMessages:", initialMessages);
    console.log("Current messages:", messages);
    
    if (initmodel && !selectedModel) {
      console.log("Setting selected model:", initmodel);
      setSelectedModel(initmodel);
    }
  
    if (initialMessages.length > 0) {
      console.log("Processing initialMessages, length:", initialMessages.length);
      
      // Only auto-submit if needed
      if (!hasAutoSubmittedRef.current) {
        console.log("hasAutoSubmittedRef is false, continuing with processing");
        //hasAutoSubmittedRef.current = true;
        //setHasAutoSubmitted(true);
        
        // Show initial messages immediately
        console.log("Before uniqueMessages filter - initialMessages:", JSON.stringify(initialMessages.map(m => ({id: m.id, role: m.role, content: typeof m.content === 'string' ? m.content.substring(0, 20) + '...' : '[complex content]'}))));
        
        const uniqueMessages = initialMessages.filter((msg, index, arr) => {
          if (msg.role === 'user') {
            const isUnique = arr.findIndex(m => m.role === 'user' && m.content === msg.content) === index;
            console.log(`Message ${index} (${msg.role}): ${isUnique ? 'keeping' : 'filtering out duplicate'}`);
            return isUnique;
          }
          return true;
        });
        
        console.log("After uniqueMessages filter - count before:", initialMessages.length, "count after:", uniqueMessages.length);
        console.log("Unique messages:", JSON.stringify(uniqueMessages.map(m => ({id: m.id, role: m.role}))));
        
        // Set messages immediately so they appear right away
        console.log("Setting messages with uniqueMessages");
        setMessages(uniqueMessages);
        console.log("Auto-submit effect running, initialMessages:", initialMessages.length, "hasAutoSubmitted:", hasAutoSubmitted);
    
        const hasAssistantResponse = initialMessages.some(msg => msg.role === "assistant");
        console.log("Has assistant response:", hasAssistantResponse);
        
        if (!hasAssistantResponse) {
          const lastUserMessage = [...initialMessages]
            .reverse()
            .find(msg => msg.role === "user");
          
          console.log("Last user message:", lastUserMessage ? JSON.stringify({
            id: lastUserMessage.id,
            content: typeof lastUserMessage.content === 'string' ? 
              lastUserMessage.content.substring(0, 20) + '...' : 
              '[complex content]'
          }) : 'none found');
          
          if (lastUserMessage && lastUserMessage.content && (initmodel || selectedModel)) {
            console.log("Processing last user message for auto-submission");
            // Create a copy of the message to ensure it persists
            const persistentUserMessage = {
              id: lastUserMessage.id || generateId(),
              role: "user",
              content: lastUserMessage.content
            };
            
            console.log("Created persistentUserMessage:", JSON.stringify({
              id: persistentUserMessage.id,
              content: typeof persistentUserMessage.content === 'string' ? 
                persistentUserMessage.content.substring(0, 20) + '...' : 
                '[complex content]'
            }));
            
            // Explicitly save this message to ensure persistence
            console.log("Saving persistentUserMessage to id:", id);
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
              console.log("Timeout fired: Executing auto-submit with persistent message");
              console.log("Selected model for auto-submit:", initmodel || selectedModel);
              // Create a synthetic submission that preserves the message
              const requestOptions: ChatRequestOptions = {
                body: {
                  selectedModel: initmodel || selectedModel, // Use initmodel if available (it's the most current)
                }
              };
              
              // Submit directly through handleSubmit to bypass potential message clearing
              console.log("Calling handleSubmit with event and requestOptions");
              console.log("Current messages before handleSubmit:", messages);
              handleSubmit(event, requestOptions);
              console.log("Setting hasAutoSubmitted flags to true");
              setHasAutoSubmitted(true);
              hasAutoSubmittedRef.current = true;
            }, 300);
          } else {
            console.log("No valid last user message or model for auto-submission, setting flags only");
            setHasAutoSubmitted(true);
            hasAutoSubmittedRef.current = true;
          }
        } else {
          console.log("Assistant response found, setting flags only");
          setHasAutoSubmitted(true);
          hasAutoSubmittedRef.current = true;
        }
      } else {
        console.log("hasAutoSubmittedRef is true, skipping processing");
      }
    } else {
      console.log("No initialMessages to process");
    }
  }, [initmodel, setHasAutoSubmitted, setSelectedModel, initialMessages, selectedModel, id, saveMessages, generateId, setMessages, setInput, handleSubmit, messages]);
  
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
