"use client";

import { ChatLayout } from "@/components/chat/chat-layout";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import UsernameForm from "@/components/username-form";
import { generateUUID } from "@/lib/utils";
import React, { useEffect } from "react"; // 新增useEffect
import useChatStore from "../hooks/useChatStore";
import { useSearchParams } from "next/navigation"; // 新增hook

export default function Home() {
  const id = generateUUID();
  const [open, setOpen] = React.useState(false);
  const userName = useChatStore((state) => state.userName);
  const setUserName = useChatStore((state) => state.setUserName);
  const searchParams = useSearchParams(); // 获取查询参数

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      // 使用name属性选择器定位输入框
      const input = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
      if (input) {
        input.value = q;
        
        // 构造更规范的键盘事件
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(enterEvent);
      }
    }
  }, [searchParams]);

  const onOpenChange = (isOpen: boolean) => {
    if (userName) return setOpen(isOpen);

    setUserName("Anonymous");
    setOpen(isOpen);
  };

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center ">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ChatLayout
          key={id}
          id={id}
          initialMessages={[]}
          navCollapsedSize={10}
          defaultLayout={[30, 160]}
        />
        <DialogContent className="flex flex-col space-y-4">
          <DialogHeader className="space-y-2">
            <DialogTitle>Welcome to Ollama!</DialogTitle>
            <DialogDescription>
              Enter your name to get started. This is just to personalize your
              experience.
            </DialogDescription>
            <UsernameForm setOpen={setOpen} />
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  );
}
