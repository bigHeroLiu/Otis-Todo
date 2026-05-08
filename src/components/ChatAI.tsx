import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { processNaturalLanguageTask, saveTask, updateTask, saveMember, saveDept } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isAction?: boolean;
  actionData?: any;
}

export function ChatAI({ onActionComplete }: { onActionComplete: () => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是您的系统 AI 助手。您可以告诉我想要新增待办、修改员工信息，或者添加新部门等，我会自动识别意图并帮您执行。'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTemplate, setActiveTemplate] = useState<'meeting' | 'trip' | 'hr' | null>(null);
  const [placeholder, setPlaceholder] = useState('如：帮我记一下，明天下午和法务开会，负责人张三。');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTemplateClick = (type: 'meeting' | 'trip' | 'hr') => {
    setActiveTemplate(type);
    if (type === 'meeting') {
      setPlaceholder('如：帮我记一下，明天下午三点和法务开会，负责人张三。');
    } else if (type === 'trip') {
      setPlaceholder('如：4月15日要去美国出差。需要张师傅在T3接我。');
    } else {
      setPlaceholder('如：帮我录入一个新员工，名字叫李四，是法务部的。');
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
      const responseData = await processNaturalLanguageTask(input, '');
      
      if (responseData && responseData.intent && responseData.intent !== 'UNKNOWN') {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseData.message || '识别到以下操作，是否为您执行？',
          isAction: true,
          actionData: responseData
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseData.message || '抱歉，我没能准确识别出您想执行的操作，请换个说法试试。'
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

  const confirmAction = async (msgId: string, actionData: any) => {
    try {
      if (actionData.intent === 'CREATE_TASK') {
        await saveTask(actionData.taskData);
      } else if (actionData.intent === 'UPDATE_TASK') {
        await updateTask(actionData.taskData.id, actionData.taskData);
      } else if (actionData.intent === 'CREATE_MEMBER' || actionData.intent === 'UPDATE_MEMBER') {
        await saveMember(actionData.memberData);
      } else if (actionData.intent === 'CREATE_DEPT') {
        await saveDept(actionData.deptData);
      }
      
      // refresh UI data
      await onActionComplete();

      setMessages(prev => prev.map(m => 
        m.id === msgId ? { ...m, content: (m.content + '\n\n✅ 已为您成功执行！'), isAction: false } : m
      ));
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '执行操作失败，请重试或检查后台日志。'
      }]);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#1abc9c] text-white rounded-full shadow-lg shadow-[#1abc9c]/30 flex items-center justify-center hover:scale-110 transition-transform z-40"
      >
        <Sparkles className="w-6 h-6" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-[#1abc9c] text-white">
                <div className="flex items-center gap-2">
                  <Bot className="w-6 h-6" />
                  <span className="font-bold">全能 AI 助理</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3 items-start", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                      msg.role === 'user' ? "bg-slate-200" : "bg-[#1abc9c]/10 text-[#1abc9c]"
                    )}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={cn("space-y-2 max-w-[80%]", msg.role === 'user' ? "items-end" : "items-start")}>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap",
                        msg.role === 'user' ? "bg-[#1abc9c] text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                      )}>
                        {msg.content}
                      </div>

                      {msg.isAction && msg.actionData && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                          <div className="text-xs text-[#1abc9c] bg-[#1abc9c]/10 px-2 py-1 rounded inline-flex font-bold tracking-wider">
                            {msg.actionData.intent.replace('_', ' ')}
                          </div>
                          
                          {/* Show extracted data based on intent */}
                          {['CREATE_TASK', 'UPDATE_TASK'].includes(msg.actionData.intent) && msg.actionData.taskData && (
                            <div>
                              <div className="text-sm font-bold text-slate-800">{msg.actionData.taskData.name}</div>
                              {msg.actionData.taskData.projectLead && <div className="text-xs text-slate-500 mt-1">负责人: {msg.actionData.taskData.projectLead}</div>}
                            </div>
                          )}

                          {['CREATE_MEMBER', 'UPDATE_MEMBER'].includes(msg.actionData.intent) && msg.actionData.memberData && (
                            <div>
                              <div className="text-sm font-bold text-slate-800">{msg.actionData.memberData.name}</div>
                              <div className="text-xs text-slate-500 mt-1">部门: {msg.actionData.memberData.department}</div>
                            </div>
                          )}
                          
                          {msg.actionData.intent === 'CREATE_DEPT' && msg.actionData.deptData && (
                            <div>
                              <div className="text-sm font-bold text-slate-800">{msg.actionData.deptData.name}</div>
                            </div>
                          )}

                          <button
                            onClick={() => confirmAction(msg.id, msg.actionData)}
                            className="w-full flex items-center justify-center gap-1 py-2 mt-2 bg-[#1abc9c] text-white rounded-lg text-xs font-bold hover:bg-[#16a085] transition-colors"
                          >
                            <Check className="w-4 h-4" /> 确认执行
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 mt-1 rounded-full bg-[#1abc9c]/10 text-[#1abc9c] flex items-center justify-center">
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

              <div className="p-4 border-t border-slate-100 bg-white">
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
                    🤝 会议安排
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
                    ✈️ 出差登记
                  </button>
                  <button
                    onClick={() => handleTemplateClick('hr')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-full transition-colors border",
                      activeTemplate === 'hr' 
                        ? "bg-[#1abc9c] text-white border-[#1abc9c]" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    👥 人员信息
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

