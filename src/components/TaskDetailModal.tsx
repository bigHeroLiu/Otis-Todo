import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Edit2, Trash2, CheckCircle, Clock, Save, Sparkles, Loader2, Plane, Car, Train, MapPin, Calendar, Phone, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { summarizeTask } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export function TaskDetailModal({ isOpen, onClose, task, onUpdate, onDelete, onEdit, canEditDetails, canUpdateStatus, members }: any) {
  const [updateText, setUpdateText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    setSummary(null);
  }, [task?.id]);

  if (!task) return null;

  // Resolve lead name
  const leadMember = members?.find((m: any) => m.id === task.projectLead || m.name === task.projectLead);
  const leadName = leadMember ? leadMember.name : (task.projectLead || '未指派');

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
    const newUpdate = `【${timestamp} 进展】${updateText}`;
    const newDescription = task.description ? `${task.description}\n\n${newUpdate}` : newUpdate;
    
    onUpdate(task.id, { 
      currentUpdate: updateText,
      description: newDescription
    });
    setUpdateText('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] max-h-[92dvh] overflow-y-auto p-0 border-0 bg-white/95 backdrop-blur-3xl shadow-2xl rounded-[32px] font-sans">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-6">
            <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 leading-tight">
              {task.name}
            </DialogTitle>
            {canEditDetails && (
              <div className="flex items-center gap-2 shrink-0 bg-slate-100/50 p-1 rounded-xl">
                <button onClick={() => onEdit(task)} className="p-2 text-slate-400 hover:text-[#1abc9c] hover:bg-white rounded-lg transition-all shadow-sm"><Edit2 className="w-5 h-5" /></button>
                <button onClick={() => onDelete(task.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={() => canUpdateStatus && onUpdate(task.id, { status: task.status === 'completed' ? 'in_progress' : 'completed' })}
              disabled={!canUpdateStatus}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide transition-all",
                task.status === 'completed' 
                  ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50" 
                  : "bg-blue-50 text-blue-600 ring-1 ring-blue-200/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
                !canUpdateStatus && "cursor-default",
                canUpdateStatus && "hover:shadow-md hover:scale-105 active:scale-95"
              )}
            >
              {task.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {task.status === 'completed' ? '已完成 COMPLETED' : '进行中 IN PROGRESS'}
            </button>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 flex items-center justify-center border border-white shadow-sm">
                <span className="text-[10px] font-black text-slate-500">{leadName?.charAt(0)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">负责人</span>
                <span className="text-[13px] font-bold text-slate-700 leading-none mt-1">{leadName}</span>
              </div>
            </div>
            
            {(() => {
              const teamMemNames = (task.teamMembers || [])
                .map((idOrName: string) => {
                  const m = members?.find((m: any) => m.id === idOrName || m.name === idOrName);
                  return m ? m.name : idOrName;
                })
                .filter((name: string) => name && name !== leadName);

              if (teamMemNames.length === 0) return null;

              return (
                <>
                  <div className="h-4 w-px bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap gap-1">
                      {teamMemNames.slice(0, 3).map((name: string, i: number) => (
                        <div key={i} className="px-2 py-1 bg-white border border-slate-200/60 shadow-sm rounded-md text-[11px] font-bold text-slate-600 relative overflow-hidden group/team">
                          <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500/10 rounded-bl-full group-hover/team:bg-blue-500/20 transition-colors" />
                          {name}
                        </div>
                      ))}
                      {teamMemNames.length > 3 && (
                        <div className="px-2 py-1 bg-slate-50 border border-slate-200/50 shadow-inner rounded-md text-[11px] font-bold text-slate-400">
                          +{teamMemNames.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">团队</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Content Body */}
        <div className="px-8 pb-8 pt-6 space-y-8">
          
          {/* AI Summary Section */}
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-slate-800 tracking-wide">任务详情</h4>
              {!summary && (
                <button 
                  onClick={handleSummarize} 
                  disabled={isSummarizing} 
                  className="group relative overflow-hidden text-xs flex items-center gap-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-xl transition-all font-bold disabled:opacity-50"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isSummarizing ? '正在生成洞察...' : 'AI 智能洞察'}
                </button>
              )}
            </div>
            
            <AnimatePresence>
              {summary && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  className="mb-6 relative overflow-hidden rounded-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-emerald-50 opacity-50" />
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-emerald-400" />
                  <div className="relative p-5 border border-indigo-100/50 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-white rounded-lg shadow-sm">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                      </div>
                      <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600 tracking-wide text-sm">AI 智能总结</span>
                    </div>
                    <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{summary}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-slate-50/50 p-5 rounded-2xl text-[13px] text-slate-700 whitespace-pre-wrap border border-slate-100 min-h-[120px] shadow-inner leading-relaxed font-medium">
              {task.description || '暂无描述信息'}
            </div>
          </div>

          {/* Add Progress Input */}
          {canUpdateStatus && (
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1abc9c] to-blue-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
              <div className="relative flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                <input 
                  type="text"
                  value={updateText}
                  onChange={e => setUpdateText(e.target.value)}
                  placeholder="追踪最新进展..."
                  className="flex-1 bg-transparent px-4 py-3 text-sm outline-none font-medium placeholder:text-slate-400"
                  onKeyDown={e => e.key === 'Enter' && handleAddUpdate()}
                />
                <button 
                  onClick={handleAddUpdate}
                  className="px-6 py-2 m-1 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  更新
                </button>
              </div>
            </div>
          )}

          {/* Bento Grid: Departments & Special Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Liaison Departments */}
            {task.liaisonDepartments && task.liaisonDepartments.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all">
                <h4 className="text-xs font-black text-slate-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> 协同部门
                </h4>
                <div className="flex flex-col gap-3">
                  {task.liaisonDepartments.map((ld: any, i: number) => {
                    const name = typeof ld === 'string' ? ld : ld.name;
                    const contact = typeof ld === 'string' ? '' : ld.contact;
                    return (
                      <div key={name + i} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                        <span className="text-[13px] font-bold text-slate-700">{name}</span>
                        {contact && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-200/50">
                            <span>{contact}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meeting Info */}
            {task.meetingInfo && (
              <div className="md:col-span-1 bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/30 rounded-full blur-3xl -mr-10 -mt-10" />
                <h4 className="text-xs font-black text-indigo-400 tracking-wider uppercase mb-4 flex items-center gap-2 relative z-10">
                  <Calendar className="w-4 h-4" /> 会见安排
                </h4>
                <div className="space-y-4 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-500 overflow-hidden shrink-0">
                      <span className="font-bold text-lg">{task.meetingInfo.person?.charAt(0) || '?'}</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">会见人</div>
                      <div className="text-[14px] font-extrabold text-indigo-900">{task.meetingInfo.person || '未指定'}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white">
                    <div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3"/> 时间</div>
                      <div className="text-[12px] font-bold text-indigo-900 mt-0.5">
                        {task.meetingInfo.time ? format(new Date(task.meetingInfo.time), 'MM-dd HH:mm') : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3"/> 地点</div>
                      <div className="text-[12px] font-bold text-indigo-900 mt-0.5 line-clamp-1">{task.meetingInfo.location || '-'}</div>
                    </div>
                  </div>

                  {task.meetingInfo.agenda && (
                    <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">概要</div>
                      <div className="text-[12px] font-medium text-indigo-900 leading-relaxed">{task.meetingInfo.agenda}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trip Info */}
            {task.tripInfo && (
              <div className="md:col-span-full bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all">
                <h4 className="text-xs font-black text-slate-400 tracking-wider uppercase mb-5 flex items-center gap-2">
                  {task.tripInfo.transport === '飞机' ? <Plane className="w-4 h-4"/> : task.tripInfo.transport === '高铁' ? <Train className="w-4 h-4"/> : <Car className="w-4 h-4"/>} 
                  行程安排
                </h4>
                
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Destination Large Format */}
                  <div className="flex-1 w-full bg-slate-50/80 rounded-2xl p-5 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">目的地</div>
                      <div className="text-2xl font-black text-slate-800 mt-1">{task.tripInfo.destination}</div>
                      <div className="text-[12px] font-bold text-[#1abc9c] mt-2">{task.tripInfo.dates}</div>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-[#1abc9c]/10 flex items-center justify-center text-[#1abc9c]">
                      {task.tripInfo.transport === '飞机' ? <Plane className="w-8 h-8"/> : task.tripInfo.transport === '高铁' ? <Train className="w-8 h-8"/> : <Car className="w-8 h-8"/>}
                    </div>
                  </div>

                  {/* Flight/Transport Details */}
                  <div className="flex-1 w-full space-y-3">
                    {task.tripInfo.transport === '飞机' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">航班号</div>
                          <div className="text-[13px] font-bold text-slate-800 mt-0.5">{task.tripInfo.flightNo || '-'}</div>
                        </div>
                        <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">起降时间</div>
                          <div className="text-[13px] font-bold text-slate-800 mt-0.5">{task.tripInfo.flightTime || '-'}</div>
                        </div>
                      </div>
                    )}
                    
                    {task.tripInfo.needsDriver && (
                      <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                        <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5" /> 专车接送安排
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                          <div>
                            <div className="text-[10px] text-emerald-600/70">司机</div>
                            <div className="text-[12px] font-bold text-emerald-900">{task.tripInfo.driverName || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-emerald-600/70">电话</div>
                            <div className="text-[12px] font-bold text-emerald-900">{task.tripInfo.driverPhone || '-'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-[10px] text-emerald-600/70">接车地点</div>
                            <div className="text-[12px] font-bold text-emerald-900">{task.tripInfo.driverPickupLocation || '-'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Trip Estimate */}
                {task.tripInfo.estimatedTravelTime && (
                  <div className="mt-4 bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-xl text-white relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] group-hover:animate-[shimmer_2s_infinite]" />
                    <div className="relative flex gap-3">
                      <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI 行程预估</div>
                        <div className="text-[13px] font-medium leading-relaxed text-slate-200">
                          {task.tripInfo.estimatedTravelTime}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

