import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Edit2, Trash2, CheckCircle, Clock, Save, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { summarizeTask } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export function TaskDetailModal({ isOpen, onClose, task, onUpdate, onDelete, onEdit, canEdit }: any) {
  const [updateText, setUpdateText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    setSummary(null);
  }, [task?.id]);

  if (!task) return null;

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const res = await summarizeTask(task);
      if (res) {
        setSummary(res);
      } else {
        toast.error('总结生成失败');
      }
    } catch (e) {
      toast.error('总结生成失败');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAddUpdate = () => {
    if (!updateText.trim()) return;
    const timestamp = format(new Date(), 'yyyy/MM/dd HH:mm');
    const newUpdate = `【${timestamp} 更新】${updateText}`;
    const newDescription = task.description ? `${task.description}\n\n${newUpdate}` : newUpdate;
    
    onUpdate(task.id, { 
      currentUpdate: updateText,
      description: newDescription
    });
    setUpdateText('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader className="pr-10">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl leading-tight">{task.name}</DialogTitle>
            {canEdit && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onEdit(task)} className="p-1.5 text-slate-400 hover:text-[#1abc9c] bg-slate-50 rounded-md"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">状态:</span>
              <button 
                onClick={() => canEdit && onUpdate(task.id, { status: task.status === 'completed' ? 'in_progress' : 'completed' })}
                disabled={!canEdit}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  task.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700",
                  !canEdit && "cursor-default"
                )}
              >
                {task.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {task.status === 'completed' ? '已完成' : '进行中'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">负责人:</span>
              <span className="text-sm font-medium">{task.projectLead || '未指派'}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-700">任务描述</h4>
                {!summary && (
                  <button 
                    onClick={handleSummarize} 
                    disabled={isSummarizing} 
                    className="text-xs flex items-center gap-1.5 text-[#1abc9c] bg-[#1abc9c]/10 hover:bg-[#1abc9c]/20 px-2.5 py-1.5 rounded-md transition-colors font-medium disabled:opacity-50"
                  >
                    {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isSummarizing ? '正在总结...' : 'AI 智能总结'}
                  </button>
                )}
              </div>
              
              <AnimatePresence>
                {summary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    className="mb-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-2 mb-2 text-emerald-700 font-bold text-sm">
                      <Sparkles className="w-4 h-4" />
                      AI 总结
                    </div>
                    <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap">{summary}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap border border-slate-100 min-h-[100px]">
                {task.description || '暂无描述'}
              </div>
            </div>

            {canEdit && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">添加进展</h4>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={updateText}
                    onChange={e => setUpdateText(e.target.value)}
                    placeholder="输入最新进展..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
                    onKeyDown={e => e.key === 'Enter' && handleAddUpdate()}
                  />
                  <button 
                    onClick={handleAddUpdate}
                    className="px-4 py-2 bg-[#1abc9c] text-white rounded-lg text-sm font-medium hover:bg-[#16a085] flex items-center gap-2 whitespace-nowrap"
                  >
                    <Save className="w-4 h-4" />
                    合并入描述
                  </button>
                </div>
              </div>
            )}

            {task.tripInfo && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">出差信息</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">目的地:</span> {task.tripInfo.destination}</div>
                  <div><span className="text-slate-500">日期:</span> {task.tripInfo.dates}</div>
                  <div><span className="text-slate-500">交通方式:</span> {task.tripInfo.transport}</div>
                  {task.tripInfo.transport === '飞机' && (
                    <>
                      <div><span className="text-slate-500">航班号:</span> {task.tripInfo.flightNo}</div>
                      <div className="col-span-2"><span className="text-slate-500">起降时间与机场:</span> {task.tripInfo.flightTime}</div>
                    </>
                  )}
                  {task.tripInfo.needsDriver && (
                    <>
                      <div><span className="text-slate-500">需要司机:</span> 是</div>
                      {task.tripInfo.driverName && <div><span className="text-slate-500">司机姓名:</span> {task.tripInfo.driverName}</div>}
                      {task.tripInfo.driverPhone && <div><span className="text-slate-500">司机手机号:</span> {task.tripInfo.driverPhone}</div>}
                      {task.tripInfo.driverPickupLocation && <div className="col-span-2"><span className="text-slate-500">接车地点:</span> {task.tripInfo.driverPickupLocation}</div>}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
