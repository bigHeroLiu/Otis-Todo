import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Printer, CalendarDays, ListTodo } from 'lucide-react';
import { cn } from '../lib/utils';
import { DEPARTMENTS } from '../App';

export function MissionListModal({ isOpen, onClose, tasks, onTaskClick }: any) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'meetings'>('tasks');

  const inProgressTasks = tasks
    .filter((t: any) => t.status === 'in_progress' || t.status === 'pending')
    .sort((a: any, b: any) => {
      // Sort by sortOrder first, then by createdAt descending
      const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const displayedTasks = inProgressTasks.filter((t: any) => 
    activeTab === 'meetings' ? !!t.meetingInfo : !t.meetingInfo
  );

  const handlePrint = () => {
    window.print();
  };

  const getDeptConfig = (deptKey: string) => {
    return DEPARTMENTS[deptKey as keyof typeof DEPARTMENTS] || {
      label: deptKey,
      color: 'text-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-200'
    };
  };

  // Group tasks by primary department
  const groupedTasks = displayedTasks.reduce((acc: any, task: any) => {
    const primaryDeptKey = task.departments?.[0] || 'personal';
    if (!acc[primaryDeptKey]) {
      acc[primaryDeptKey] = [];
    }
    acc[primaryDeptKey].push(task);
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto print:max-w-none print:h-auto print:overflow-visible bg-[#f8fafc]">
        <DialogHeader className="print:hidden flex flex-row items-center justify-between pb-4 border-b border-slate-200/60">
          <div className="flex flex-col gap-3">
            <DialogTitle className="text-2xl font-serif font-bold text-slate-900">Mission List</DialogTitle>
            <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('tasks')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'tasks' 
                    ? "bg-white text-[#1abc9c] shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <ListTodo className="w-4 h-4" />常规任务
              </button>
              <button
                onClick={() => setActiveTab('meetings')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'meetings' 
                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <CalendarDays className="w-4 h-4" />会见安排
              </button>
            </div>
          </div>
          <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-[#1abc9c] hover:bg-slate-100 rounded-lg transition-colors self-start">
            <Printer className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        <div className="mt-6 print:mt-0">
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-3xl font-serif font-bold">Mission List - {activeTab === 'tasks' ? '常规任务' : '会见安排'}</h1>
            <p className="text-slate-500 mt-2">{new Date().toLocaleDateString('zh-CN')}</p>
          </div>

          {Object.entries(groupedTasks).map(([deptKey, deptTasks]: [string, any]) => {
            const groupConfig = getDeptConfig(deptKey);
            return (
              <div key={deptKey} className="mb-8 last:mb-0">
                <h3 className={cn("text-lg font-bold mb-4 flex items-center gap-2", groupConfig.color)}>
                  <div className={cn("w-2 h-6 rounded-full", groupConfig.bg, "ring-1 ring-inset ring-black/10")} />
                  {groupConfig.label}
                  <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
                    {deptTasks.length}
                  </span>
                </h3>
                <div className="space-y-4">
                  {deptTasks.map((task: any) => {
                    const primaryDeptKey = task.departments?.[0];
                    const config = getDeptConfig(primaryDeptKey || 'personal');
                    return (
                      <div 
                        key={task.id} 
                        onClick={() => onTaskClick?.(task)}
                        className="grid grid-cols-12 gap-4 px-6 py-4 items-center bg-white border border-slate-200 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer cursor-action"
                      >
                        <div className="col-span-5 text-sm font-bold text-slate-800 pr-4 flex flex-col gap-1">
                          <span>{task.name}</span>
                          {task.meetingInfo && (
                            <div className="text-[10px] text-indigo-600 font-medium space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="shrink-0 bg-indigo-100 px-1 rounded text-[9px]">会见</span>
                                <span className="truncate font-bold">{task.meetingInfo.person} | {task.meetingInfo.location}</span>
                              </div>
                              {task.meetingInfo.agenda && (
                                <div className="pl-1 italic text-slate-500 line-clamp-1 border-l border-indigo-200 ml-1">
                                  {task.meetingInfo.agenda}
                                </div>
                              )}
                            </div>
                          )}
                          {task.tripInfo && (
                            <div className="text-[10px] text-[#1abc9c] font-medium flex items-center gap-1">
                              <span className="shrink-0 bg-[#1abc9c]/10 px-1 rounded">出差</span>
                              <span className="truncate">{task.tripInfo.destination} | {task.tripInfo.dates}</span>
                            </div>
                          )}
                        </div>
                        <div className="col-span-3">
                          <span className={cn("inline-flex px-2.5 py-1 rounded-full text-xs font-medium border", config.bg, config.color, config.border)}>
                            {config.label}
                          </span>
                        </div>
                        <div className="col-span-4 flex flex-wrap gap-2 text-sm text-slate-700">
                          {task.liaisonDepartments && task.liaisonDepartments.length > 0 ? (
                            task.liaisonDepartments.map((ld: any, idx: number) => {
                              const name = typeof ld === 'string' ? ld : ld.name;
                              const contact = typeof ld === 'string' ? '' : ld.contact;
                              return (
                                <span key={idx} className="inline-flex flex-col px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 leading-tight">
                                  <span className="font-bold">{name}</span>
                                  {contact && <span className="text-[10px] opacity-70">对接: {contact}</span>}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {displayedTasks.length === 0 && (
            <div className="text-center text-slate-500 py-10 bg-white rounded-xl border border-slate-200 border-dashed">
              当前没有进行中的{activeTab === 'tasks' ? '常规任务' : '会见安排'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
