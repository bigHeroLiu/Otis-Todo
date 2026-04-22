import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { DEPARTMENTS } from '../App';

export function MissionListModal({ isOpen, onClose, tasks }: any) {
  const inProgressTasks = tasks
    .filter((t: any) => t.status === 'in_progress')
    .sort((a: any, b: any) => {
      // Sort by sortOrder first, then by createdAt descending
      const orderDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto print:max-w-none print:h-auto print:overflow-visible bg-[#f8fafc]">
        <DialogHeader className="print:hidden flex flex-row items-center justify-between pb-4 border-b border-slate-200/60">
          <DialogTitle className="text-2xl font-serif font-bold text-slate-900">Mission List</DialogTitle>
          <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-[#1abc9c] hover:bg-slate-100 rounded-lg transition-colors">
            <Printer className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        <div className="mt-6 space-y-8 print:mt-0">
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-3xl font-serif font-bold">Mission List</h1>
            <p className="text-slate-500 mt-2">{new Date().toLocaleDateString('zh-CN')}</p>
          </div>

          {inProgressTasks.map((task: any) => {
            const primaryDeptKey = task.departments?.[0];
            const config = getDeptConfig(primaryDeptKey || 'personal');
            return (
              <div key={task.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                <div className="col-span-2 text-sm text-slate-500 font-mono">
                  {format(new Date(task.createdAt), 'MM/dd HH:mm')}
                </div>
                <div className="col-span-4 text-sm font-bold text-slate-800 pr-4 flex flex-col gap-1">
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
                <div className="col-span-3 flex flex-wrap gap-2 text-sm text-slate-700">
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
          {inProgressTasks.length === 0 && (
            <div className="text-center text-slate-500 py-10 bg-white rounded-xl border border-slate-200 border-dashed">
              当前没有进行中的任务
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
