import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Printer } from 'lucide-react';

export function MissionListModal({ isOpen, onClose, tasks }: any) {
  const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress');
  
  const groupedTasks = inProgressTasks.reduce((acc: any, task: any) => {
    const dept = task.departments?.[0] || '未分类';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(task);
    return acc;
  }, {});

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92dvh] overflow-y-auto print:max-w-none print:h-auto print:overflow-visible">
        <DialogHeader className="print:hidden flex flex-row items-center justify-between">
          <DialogTitle>Mission List (进行中)</DialogTitle>
          <button onClick={handlePrint} className="p-2 text-slate-500 hover:text-[#1abc9c] hover:bg-slate-100 rounded-lg transition-colors">
            <Printer className="w-5 h-5" />
          </button>
        </DialogHeader>
        
        <div className="mt-6 space-y-8 print:mt-0">
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-2xl font-serif font-bold">Otis' To-Do Dashboard - Mission List</h1>
            <p className="text-slate-500 mt-2">{new Date().toLocaleDateString('zh-CN')}</p>
          </div>

          {Object.entries(groupedTasks).map(([dept, deptTasks]: [string, any]) => (
            <div key={dept} className="break-inside-avoid">
              <h2 className="text-lg font-bold text-[#1abc9c] border-b-2 border-[#1abc9c] pb-2 mb-4">{dept === 'legal' ? '法务部' : dept === 'investment' ? '投资部' : dept === 'audit' ? '审计部' : dept === 'family_office' ? '家族办公室' : dept === 'ir' ? '投资者关系部' : dept === 'personal' ? '个人事务' : dept}</h2>
              <div className="space-y-4">
                {deptTasks.map((task: any) => (
                  <div key={task.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 print:border-slate-300 print:bg-white">
                    <h3 className="font-semibold text-lg mb-2">{task.name}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-slate-500">负责人:</span> {task.projectLead || '-'}</div>
                      <div><span className="text-slate-500">成员:</span> {task.teamMembers?.join(', ') || '-'}</div>
                      <div className="col-span-2"><span className="text-slate-500">协同部门:</span> {task.liaisonDepartments?.join(', ') || '-'}</div>
                      {task.tripInfo && (
                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                          <span className="text-slate-500 block mb-1">出差信息:</span>
                          <div className="text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                            <span>目的地: {task.tripInfo.destination || '-'}</span>
                            <span>日期: {task.tripInfo.dates || '-'}</span>
                            <span>交通: {task.tripInfo.transport || '-'}</span>
                            {task.tripInfo.flightNo && <span>航班: {task.tripInfo.flightNo}</span>}
                            {task.tripInfo.flightTime && <span>时间: {task.tripInfo.flightTime}</span>}
                            {task.tripInfo.needsDriver && <span>司机: {task.tripInfo.driverName || '需要'}</span>}
                          </div>
                        </div>
                      )}
                      {task.currentUpdate && (
                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                          <span className="text-slate-500 block mb-1">最新进展:</span>
                          <p className="text-slate-700">{task.currentUpdate}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {inProgressTasks.length === 0 && (
            <div className="text-center text-slate-500 py-10">
              当前没有进行中的任务
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
