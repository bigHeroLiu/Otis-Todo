import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { processNaturalLanguageTask } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTask?: boolean;
  taskData?: any;
}

export function ChatAI({ onAddTask }: { onAddTask: (task: any) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是您的 AI 助手。您可以直接告诉我需要处理的事项，我会为您自动生成待办。'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTemplate, setActiveTemplate] = useState<'meeting' | 'trip' | null>(null);
  const [placeholder, setPlaceholder] = useState('例如：帮我记一下，明天下午三点要和法务部开会讨论投资协议，负责人是张三。');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTemplateClick = (type: 'meeting' | 'trip') => {
    setActiveTemplate(type);
    if (type === 'meeting') {
      setPlaceholder('帮我记一下，明天下午三点要和法务部开会讨论投资协议，负责人是张三。');
    } else {
      setPlaceholder('4月15日上午十点我要出差去美国密西西比。需要张师傅在T3航站楼接我，电话13812345678。');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const taskData = await processNaturalLanguageTask(input);
      
      if (taskData) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `已为您识别到新任务：**${taskData.name}**。是否现在添加到待办列表？`,
          isTask: true,
          taskData: taskData
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '抱歉，我没能识别出具体的任务信息，请尝试更详细地描述。'
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '处理请求时出错了，请稍后再试。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAddTask = async (msgId: string, taskData: any) => {
    await onAddTask(taskData);
    setMessages(prev => prev.map(m => 
      m.id === msgId ? { ...m, content: '已为您在表单中填好信息，请确认并保存。', isTask: false } : m
    ));
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#1abc9c] text-white rounded-full shadow-lg shadow-[#1abc9c]/30 flex items-center justify-center hover:scale-110 transition-transform z-40"
      >
        <Sparkles className="w-6 h-6" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            
            {/* Chat Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-[#1abc9c] text-white">
                <div className="flex items-center gap-2">
                  <Bot className="w-6 h-6" />
                  <span className="font-bold">AI 任务助手</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === 'user' ? "bg-slate-200" : "bg-[#1abc9c]/10 text-[#1abc9c]"
                    )}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className="space-y-2 max-w-[80%]">
                      <div className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm",
                        msg.role === 'user' ? "bg-[#1abc9c] text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                      )}>
                        {msg.content}
                      </div>
                      {msg.isTask && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3">
                          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">识别结果</div>
                          <div className="text-sm font-bold text-slate-900">{msg.taskData.name}</div>
                          <div className="text-xs text-slate-600 line-clamp-2">{msg.taskData.description}</div>
                          <button
                            onClick={() => confirmAddTask(msg.id, msg.taskData)}
                            className="w-full py-2 bg-[#1abc9c] text-white rounded-lg text-xs font-bold hover:bg-[#16a085] transition-colors"
                          >
                            在表单中确认并添加
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1abc9c]/10 text-[#1abc9c] flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-100 bg-white">
                {/* Templates */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => handleTemplateClick('meeting')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full transition-colors border",
                      activeTemplate === 'meeting' 
                        ? "bg-[#1abc9c] text-white border-[#1abc9c]" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    🤝 会议
                  </button>
                  <button
                    onClick={() => handleTemplateClick('trip')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full transition-colors border",
                      activeTemplate === 'trip' 
                        ? "bg-[#1abc9c] text-white border-[#1abc9c]" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    ✈️ 出差
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={placeholder}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50 resize-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute bottom-3 right-3 p-2 bg-[#1abc9c] text-white rounded-lg hover:bg-[#16a085] disabled:opacity-50 disabled:hover:bg-[#1abc9c] transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  按 Enter 发送，Shift + Enter 换行
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
