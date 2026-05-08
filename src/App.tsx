import React, { useState, useEffect, useCallback } from 'react';
import { format, differenceInYears, differenceInMonths, differenceInDays, parse, addDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Plus, Users, Printer, Menu, X, ChevronRight, Trash2, Briefcase, Plane, Train, Car, RotateCcw, Cake, GripVertical, Sparkles } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskModal } from './components/TaskModal';
import { HRModal } from './components/HRModal';
import { MissionListModal } from './components/MissionListModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { ChatAI } from './components/ChatAI';
import { 
  fetchTasks, saveTask, updateTask, deleteTask as deleteDbTask, 
  fetchMembers, saveMember, deleteMember, 
  fetchDepts, saveDept, deleteDept,
  reorderTasks
} from './services/api';

// Types
type TaskStatus = 'pending' | 'in_progress' | 'completed';
type DepartmentKey = 'legal' | 'investment' | 'audit' | 'family_office' | 'ir' | 'personal';

interface Task {
  id: string;
  name: string;
  description: string;
  departments: DepartmentKey[];
  projectLead: string;
  teamMembers: string[];
  liaisonDepartments: string[];
  status: TaskStatus;
  currentUpdate: string;
  tripInfo: any;
  meetingInfo: any;
  deletedAt: string | null;
  visibleToChairman?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const DEPARTMENTS: Record<DepartmentKey, { label: string; color: string; bg: string; border: string }> = {
  legal: { label: '法务部', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  investment: { label: '投资部', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  audit: { label: '审计部', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  family_office: { label: '家族办公室', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  ir: { label: '投资者关系部', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  personal: { label: '个人事务', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
};

export default function App() {
  const [userRole, setUserRole] = useState<'staff' | 'otis' | 'chairman' | null>(null);
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [chairmanPassword, setChairmanPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [chairmanLoginError, setChairmanLoginError] = useState(false);
  const [showStaffSelect, setShowStaffSelect] = useState(false);
  const [showChairmanLogin, setShowChairmanLogin] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [liaisonDepts, setLiaisonDepts] = useState<any[]>([]);
  
  const [view, setView] = useState<'tasks' | 'trash'>('tasks');
  const [selectedDept, setSelectedDept] = useState<DepartmentKey | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isHRModalOpen, setIsHRModalOpen] = useState(false);
  const [isMissionListOpen, setIsMissionListOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before dragging starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Requires 250ms hold to start dragging on touch devices
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (userRole !== 'otis' || view !== 'tasks') return;

    const oldIndex = tasks.findIndex((t) => String(t.id) === String(active.id));
    const newIndex = tasks.findIndex((t) => String(t.id) === String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    // We must find the actual tasks in the global array and move them
    const newTasks = arrayMove(tasks, oldIndex, newIndex);
    setTasks(newTasks);

    // Persist reorder to backend
    const orders = newTasks.map((t: Task, index: number) => ({
      id: t.id,
      sortOrder: index
    }));

    try {
      await reorderTasks(orders);
    } catch (error) {
      console.error('Failed to save reorder', error);
      toast.error('排序保存失败');
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [fetchedTasks, fetchedMembers, fetchedDepts] = await Promise.all([
        fetchTasks(view === 'trash'),
        fetchMembers(),
        fetchDepts()
      ]);
      setTasks(fetchedTasks);
      setMembers(fetchedMembers);
      setLiaisonDepts(fetchedDepts);
    } catch (e) {
      console.error('Failed to load initial data', e);
    }
  }, [view]);

  useEffect(() => {
    if (!userRole) return;
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [userRole, loadData]);

  // Initial load specifically for staff selection list if not logged in
  useEffect(() => {
    if (!userRole) {
      fetchMembers().then(setMembers).catch(console.error);
    }
  }, [userRole]);

  const handleLogin = async (role: 'staff' | 'otis' | 'chairman', staffId?: string) => {
    try {
      if (role === 'staff' && staffId) {
        setUserRole('staff');
        setCurrentStaffId(staffId);
        await loadData();
        
        // Birthday alert logic
        const today = new Date();
        const alertingMembers = members.filter(m => {
          if (!m.profile?.birthday) return false;
          // birthday is string format: YYYY年M月d日
          const birthDateMatch = m.profile.birthday.match(/(\d+)年(\d+)月(\d+)日/);
          if (!birthDateMatch) return false;
          const birthDate = new Date(today.getFullYear(), parseInt(birthDateMatch[2]) - 1, parseInt(birthDateMatch[3]));
          
          // Check if today is within 3 days before birthday (including birthday itself)
          for (let i = 0; i <= 3; i++) {
            if (isSameDay(addDays(today, i), birthDate)) return true;
          }
          return false;
        });

        if (alertingMembers.length > 0) {
          toast.info('生日提醒', {
            description: (
              <div className="space-y-2">
                {alertingMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-amber-500" />
                    <span>{m.name} 即将于 {m.profile.birthday} 生日！</span>
                  </div>
                ))}
              </div>
            ),
            duration: 10000,
          });
        }
      } else if (role === 'chairman') {
        if (chairmanPassword === '123456') {
          setUserRole('chairman');
          setChairmanLoginError(false);
          await loadData();
        } else {
          setChairmanLoginError(true);
        }
      } else if (role === 'otis') {
        if (password === '123456') {
          setUserRole('otis');
          setLoginError(false);
          await loadData();
        } else {
          setLoginError(true);
        }
        
        // Birthday alert logic - Otis
        const today = new Date();
        const alertingMembers = members.filter(m => {
          if (!m.profile?.birthday) return false;
          // birthday is string format: YYYY年M月d日
          const birthDateMatch = m.profile.birthday.match(/(\d+)年(\d+)月(\d+)日/);
          if (!birthDateMatch) return false;
          const birthDate = new Date(today.getFullYear(), parseInt(birthDateMatch[2]) - 1, parseInt(birthDateMatch[3]));
          
          // Check if today is within 3 days before birthday (including birthday itself)
          for (let i = 0; i <= 3; i++) {
            if (isSameDay(addDays(today, i), birthDate)) return true;
          }
          return false;
        });

        if (alertingMembers.length > 0) {
          toast.info('生日提醒', {
            description: (
              <div className="space-y-2">
                {alertingMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-amber-500" />
                    <span>{m.name} 即将于 {m.profile.birthday} 生日！</span>
                  </div>
                ))}
              </div>
            ),
            duration: 10000,
          });
        }

        // Trip alert logic - Otis (check if any trip is TODAY, needs to be filtered globally)
        const todayTrips = tasks.filter(t => {
           if (!t.tripInfo?.dates) return false;
           // assuming dates format like "YYYY-MM-DD 至 YYYY-MM-DD"
           const dateRange = t.tripInfo.dates.split(' 至 ');
           if (dateRange.length < 1) return false;
           const startDate = new Date(dateRange[0]);
           return isSameDay(today, startDate);
        });

        if (todayTrips.length > 0) {
          toast.info('出差提醒', {
            description: (
              <div className="space-y-2">
                {todayTrips.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-sky-500" />
                    <span>任务 "{t.name}" 今日出差：{t.tripInfo.destination}。</span>
                  </div>
                ))}
              </div>
            ),
            duration: 10000,
          });
        }
      }
    } catch (error) {
      console.error('Login failed', error);
      toast.error('登录失败，请检查网络连接');
    }
  };

  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#1abc9c] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#1abc9c]/20">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">Otis' Dashboard</h1>
            <p className="text-slate-500 mt-2">请选择您的身份进入系统</p>
          </div>

          {!showStaffSelect ? (
            <div className="space-y-4">
              <button 
                onClick={() => setShowStaffSelect(true)}
                className="w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-slate-500" />
                  <span>我是员工 (选择姓名)</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {!showChairmanLogin ? (
                <button 
                  onClick={() => setShowChairmanLogin(true)}
                  className="w-full py-4 px-6 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-2xl font-bold transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-amber-600" />
                    <span>主席</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-amber-800 flex items-center gap-2">
                       <Users className="w-4 h-4" /> 主席登录
                    </span>
                    <button onClick={() => setShowChairmanLogin(false)} className="text-amber-400 hover:text-amber-600 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <input 
                    type="password" 
                    placeholder="请输入主席专用密码" 
                    value={chairmanPassword}
                    onChange={(e) => setChairmanPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin('chairman')}
                    className={cn(
                      "w-full py-3 px-4 bg-white border rounded-xl outline-none transition-all font-medium",
                      chairmanLoginError ? "border-red-300 focus:ring-4 focus:ring-red-100" : "border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    )}
                    autoFocus
                  />
                  {chairmanLoginError && <p className="text-red-500 text-[10px] mt-0.5 ml-1 font-bold">密码验证失败</p>}
                  <button 
                    onClick={() => handleLogin('chairman')}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-sm active:scale-[0.98]"
                  >
                    立即登录
                  </button>
                </div>
              )}

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">或者</span></div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input 
                    type="password" 
                    placeholder="Otis登陆" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin('otis')}
                    className={cn(
                      "w-full py-4 px-6 bg-white border rounded-2xl outline-none transition-all font-medium",
                      loginError ? "border-red-300 focus:ring-4 focus:ring-red-100" : "border-slate-200 focus:border-[#1abc9c] focus:ring-4 focus:ring-[#1abc9c]/10"
                    )}
                  />
                  {loginError && <p className="text-red-500 text-xs mt-1 ml-2 font-medium">密码错误，请重试</p>}
                </div>
                <button 
                  onClick={() => handleLogin('otis')}
                  className="w-full py-4 px-6 bg-[#1abc9c] hover:bg-[#16a085] text-white rounded-2xl font-bold shadow-lg shadow-[#1abc9c]/20 transition-all active:scale-[0.98]"
                >
                  以 Otis 身份登录
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <button onClick={() => setShowStaffSelect(false)} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-4">
                 <X className="w-4 h-4" /> 返回
               </button>
               <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                 {members.length === 0 && <p className="text-center text-slate-500 py-4 text-sm">暂无员工数据</p>}
                 {members.map(m => (
                   <button
                     key={m.id}
                     onClick={() => handleLogin('staff', m.id)}
                     className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-medium transition-colors"
                   >
                     {m.name} <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded ml-2">{DEPARTMENTS[m.department as DepartmentKey]?.label || m.department}</span>
                   </button>
                 ))}
               </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const handleSaveTask = async (taskData: any) => {
    try {
      const isNew = !taskData.id;
      const savedTask = await saveTask(taskData);
      
      setIsTaskModalOpen(false);
      setEditingTask(null);
      if (selectedTask && savedTask.id === selectedTask.id) {
        setSelectedTask(savedTask);
      }
      
      await loadData();
      
      if (isNew) {
        toast.success('新待办已生成', {
          description: savedTask.name,
        });
      }
    } catch (error) {
      console.error('Failed to save task', error);
      toast.error('保存失败');
    }
  };

  const handleDeleteTask = async (id: string | number) => {
    try {
      await updateTask(id.toString(), { deletedAt: new Date().toISOString() });
      setSelectedTask(null);
      await loadData();
    } catch (error) {
      console.error('Failed to delete task', error);
    }
  };

  const handlePermanentDelete = async (id: string | number) => {
    try {
      await deleteDbTask(id.toString());
      await loadData();
    } catch (error) {
      console.error('Failed to permanent delete task', error);
    }
  };

  const handleRestoreTask = async (id: string | number) => {
    try {
      await updateTask(id.toString(), { deletedAt: null });
      await loadData();
    } catch (error) {
      console.error('Failed to restore task', error);
    }
  };

  const handleUpdateTask = async (id: string | number, updates: any) => {
    try {
      await updateTask(id.toString(), updates);
      if (selectedTask?.id === id) {
        setSelectedTask({ ...selectedTask, ...updates });
      }
      await loadData();
    } catch (error) {
      console.error('Failed to update task', error);
    }
  };

  const handleSaveMember = async (memberData: any) => {
    try {
      await saveMember(memberData);
      await loadData();
    } catch (error) {
      console.error('Failed to save member', error);
    }
  };

  const handleDeleteMember = async (id: string | number) => {
    try {
      await deleteMember(id.toString());
      await loadData();
    } catch (error) {
      console.error('Failed to delete member', error);
    }
  };

  const handleSaveDept = async (deptData: any) => {
    try {
      await saveDept(deptData);
      await loadData();
    } catch (error) {
      console.error('Failed to save dept', error);
    }
  };

  const handleDeleteDept = async (id: string | number) => {
    try {
      await deleteDept(id.toString());
      await loadData();
    } catch (error) {
      console.error('Failed to delete dept', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    // Role based visibility
    if (userRole === 'chairman') {
      if (!task.visibleToChairman) return false;
    } else if (userRole === 'staff') {
      const currentMember = members.find(m => m.id === currentStaffId);
      const isLead = task.projectLead === currentStaffId || (currentMember && task.projectLead === currentMember.name);
      const isTeam = task.teamMembers?.includes(currentStaffId || '') || (currentMember && (task.teamMembers as string[])?.includes(currentMember.name));
      if (!isLead && !isTeam) return false;
    }
    // Otis sees all

    // Category and status filtering
    if (selectedDept !== 'all' && !task.departments?.includes(selectedDept)) return false;
    if (selectedStatus !== 'all' && task.status !== selectedStatus) return false;
    return true;
  });

  const todayStr = format(new Date(), 'yyyy年M月d日 EEEE', { locale: zhCN });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Toaster position="top-right" richColors />
      {/* Top Navigation Bar */}
      <header className="bg-[#1abc9c] text-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">Otis' To-Do Dashboard</h1>
            <span className="hidden md:inline-block text-sm opacity-90 font-medium">{todayStr}</span>
          </div>

          {/* Desktop Stats */}
          <div className="hidden lg:flex items-center gap-2">
            {Object.entries(DEPARTMENTS).map(([key, dept]) => {
              const count = tasks.filter(t => t.departments?.includes(key as DepartmentKey) && t.status !== 'completed').length;
              if (count === 0) return null;
              return (
                <div key={key} className="bg-white/20 px-2 py-1 rounded text-xs font-medium backdrop-blur-sm">
                  {dept.label} {count}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {userRole === 'staff' && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm mr-2 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-sm font-medium">当前登录：{members.find(m => m.id === currentStaffId)?.name || '员工'}</span>
              </div>
            )}
            {userRole === 'otis' && (
              <>
                <button 
                  onClick={() => setIsMissionListOpen(true)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2" 
                  title="Mission List"
                >
                  <Printer className="w-5 h-5" />
                  <span className="hidden sm:inline text-sm font-medium">Mission List</span>
                </button>
                <button 
                  onClick={() => setIsHRModalOpen(true)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2" 
                  title="人力资源管理"
                >
                  <Users className="w-5 h-5" />
                  <span className="hidden sm:inline text-sm font-medium">HR</span>
                </button>
              </>
            )}
            {userRole === 'otis' && (
              <button 
                onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                className="p-2 bg-white text-[#1abc9c] hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 shadow-sm ml-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-bold">新建事项</span>
              </button>
            )}
            <button 
              onClick={() => { setUserRole(null); setPassword(''); }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 ml-1"
              title="退出登录"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">退出</span>
            </button>
            <button 
              className="p-2 hover:bg-white/20 rounded-lg transition-colors md:hidden ml-1"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 py-6 pr-6 border-r border-slate-200">
          <div className="space-y-1 mb-8">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">视图</div>
            <button 
              onClick={() => setView('tasks')}
              className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all", view === 'tasks' ? "bg-[#1abc9c]/10 text-[#1abc9c]" : "text-slate-600 hover:bg-slate-100")}
            >
              <span>任务列表</span>
              {view === 'tasks' && <ChevronRight className="w-4 h-4" />}
            </button>
            {userRole === 'otis' && (
              <button 
                onClick={() => setView('trash')}
                className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all", view === 'trash' ? "bg-[#1abc9c]/10 text-[#1abc9c]" : "text-slate-600 hover:bg-slate-100")}
              >
                <span>回收站</span>
                {view === 'trash' && <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="space-y-1 mb-8">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">部门</div>
            <button 
              onClick={() => setSelectedDept('all')}
              className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all", selectedDept === 'all' ? "bg-[#1abc9c]/10 text-[#1abc9c]" : "text-slate-600 hover:bg-slate-100")}
            >
              <span>全部部门</span>
            </button>
            {Object.entries(DEPARTMENTS).map(([key, dept]) => (
              <button 
                key={key}
                onClick={() => setSelectedDept(key as DepartmentKey)}
                className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all", selectedDept === key ? "bg-[#1abc9c]/10 text-[#1abc9c]" : "text-slate-600 hover:bg-slate-100")}
              >
                <span>{dept.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">状态</div>
            <button 
              onClick={() => setSelectedStatus('all')}
              className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all", selectedStatus === 'all' ? "bg-[#1abc9c]/10 text-[#1abc9c]" : "text-slate-600 hover:bg-slate-100")}
            >
              <span>全部</span>
            </button>
            <button 
              onClick={() => setSelectedStatus('pending')}
              className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all", selectedStatus === 'pending' ? "bg-[#1abc9c]/10 text-[#1abc9c]" : "text-slate-600 hover:bg-slate-100")}
            >
              <span>待处理</span>
            </button>
            <button 
              onClick={() => setSelectedStatus('in_progress')}
              className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all", selectedStatus === 'in_progress' ? "bg-[#1abc9c]/10 text-[#1abc9c]" : "text-slate-600 hover:bg-slate-100")}
            >
              <span>进行中</span>
            </button>
            <button 
              onClick={() => setSelectedStatus('completed')}
              className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all", selectedStatus === 'completed' ? "bg-[#1abc9c]/10 text-[#1abc9c]" : "text-slate-600 hover:bg-slate-100")}
            >
              <span>已完成</span>
            </button>
          </div>
        </aside>

        {/* Mobile Filter Bar */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex gap-2 overflow-x-auto hide-scrollbar">
          <select 
            value={view} 
            onChange={(e) => setView(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
          >
            <option value="tasks">任务列表</option>
            {userRole === 'otis' && <option value="trash">回收站</option>}
          </select>
          <select 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
          >
            <option value="all">全部部门</option>
            {Object.entries(DEPARTMENTS).map(([key, dept]) => (
              <option key={key} value={key}>{dept.label}</option>
            ))}
          </select>
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#1abc9c]/50"
          >
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
          </select>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
              <SortableContext 
                items={filteredTasks.map(t => t.id)}
                strategy={rectSortingStrategy}
              >
                <AnimatePresence>
                  {filteredTasks.map(task => (
                    <SortableTaskCard 
                      key={task.id} 
                      task={task} 
                      onClick={() => view === 'tasks' ? setSelectedTask(task) : null}
                      isTrash={view === 'trash'}
                      onRestore={() => handleRestoreTask(task.id)}
                      onPermanentDelete={() => handlePermanentDelete(task.id)}
                      canEdit={userRole === 'otis'}
                      onToggleChairman={(e) => {
                        e.stopPropagation();
                        handleUpdateTask(task.id, { visibleToChairman: !task.visibleToChairman });
                      }}
                      members={members}
                    />
                  ))}
                </AnimatePresence>
              </SortableContext>
              {filteredTasks.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-500">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    <Briefcase className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium">没有找到相关任务</p>
                  <p className="text-sm mt-1">尝试调整筛选条件或新建一个事项</p>
                </div>
              )}
            </div>
          </DndContext>
        </main>
      </div>

      {/* Modals */}
      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
        task={editingTask}
        onSave={handleSaveTask}
        members={members}
        liaisonDepts={liaisonDepts}
      />

      <TaskDetailModal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onUpdate={handleUpdateTask}
        onDelete={(id: string) => { handleDeleteTask(id); setSelectedTask(null); }}
        onEdit={(task: Task) => { setSelectedTask(null); setEditingTask(task); setIsTaskModalOpen(true); }}
        canEditDetails={userRole === 'otis'}
        canUpdateStatus={userRole === 'otis' || userRole === 'staff'}
        members={members}
      />

      <HRModal
        isOpen={isHRModalOpen}
        onClose={() => setIsHRModalOpen(false)}
        members={members}
        onSaveMember={handleSaveMember}
        onDeleteMember={handleDeleteMember}
        liaisonDepts={liaisonDepts}
        onSaveDept={handleSaveDept}
        onDeleteDept={handleDeleteDept}
      />

      <MissionListModal
        isOpen={isMissionListOpen}
        onClose={() => setIsMissionListOpen(false)}
        tasks={tasks}
      />

      {userRole === 'otis' && (
        <ChatAI onActionComplete={loadData} />
      )}
    </div>
  );
}

interface TaskCardProps {
  key?: React.Key;
  task: Task;
  onClick: () => void;
  isTrash?: boolean;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  canEdit?: boolean;
  onToggleChairman?: (e: React.MouseEvent) => void;
  members: any[];
}

function SortableTaskCard(props: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: props.task.id,
    disabled: !props.canEdit || props.isTrash
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard {...props} dndProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
}

function TaskCard({ task, onClick, isTrash, onRestore, onPermanentDelete, canEdit, onToggleChairman, members, dndProps, isDragging }: TaskCardProps & { dndProps?: any, isDragging?: boolean }) {
  const primaryDept = task.departments?.[0] ? DEPARTMENTS[task.departments[0]] : null;
  
  // Resolve member info for project lead
  const leadMember = members.find(m => m.id === task.projectLead || m.name === task.projectLead);
  const leadName = leadMember ? leadMember.name : task.projectLead;

  // Resolve team members info
  const teamMemNames = (task.teamMembers || [])
    .map((idOrName: string) => {
      const m = members.find(m => m.id === idOrName || m.name === idOrName);
      return m ? m.name : idOrName;
    })
    .filter((name: string) => name && name !== leadName);
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      onClick={onClick}
      className={cn(
        "bg-white/80 backdrop-blur-md rounded-[24px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 overflow-hidden flex flex-col relative h-full group",
        !isTrash && "cursor-pointer hover:-translate-y-1",
        isDragging && "shadow-2xl cursor-grabbing scale-[1.05] z-50 ring-2 ring-[#1abc9c]/50"
      )}
    >
      {/* Drag & Chairman Tools */}
      <div className={cn(
        "absolute top-3 right-3 flex items-center gap-1.5 transition-opacity duration-300 z-10",
        task.visibleToChairman ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      )}>
        {canEdit && !isTrash && (
          <div 
            {...dndProps}
            className="p-1.5 rounded-xl bg-white/50 backdrop-blur-md shadow-sm border border-slate-100 text-slate-400 hover:text-[#1abc9c] hover:bg-white cursor-grab active:cursor-grabbing transition-all"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        
        {canEdit && onToggleChairman && (
          <button
            onClick={onToggleChairman}
            className={cn(
              "p-1.5 rounded-xl backdrop-blur-md shadow-sm border transition-all flex items-center justify-center",
              task.visibleToChairman 
                ? "bg-amber-500 text-white border-amber-600 shadow-amber-500/20" 
                : "bg-white/50 text-slate-400 border-slate-100 hover:text-amber-500 hover:bg-white"
            )}
            title={task.visibleToChairman ? "主席可见" : "设为主席可见"}
          >
            <span className="text-[10px] font-bold px-1 tracking-widest">主席</span>
          </button>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1 pt-8">
        {/* Title Section */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-bold text-slate-800 text-[1.1rem] leading-snug line-clamp-2 tracking-tight group-hover:text-[#1abc9c] transition-colors pr-14">
              {task.name}
            </h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1 tracking-wider tabular-nums bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/50">
              {format(new Date(task.createdAt), 'MM/dd HH:mm')}
            </span>
            <StatusBadge status={task.status} />
            {task.tripInfo && (
              <span className="flex items-center gap-1.5 text-[#1abc9c] bg-[#1abc9c]/10 px-2.5 py-0.5 rounded-md border border-[#1abc9c]/20 font-semibold shadow-sm">
                {(task.tripInfo.transport === '飞机' || !task.tripInfo.transport) ? <Plane className="w-3 h-3" /> : 
                 task.tripInfo.transport === '高铁' ? <Train className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                {task.tripInfo.destination}
              </span>
            )}
            {task.meetingInfo && (
              <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 font-semibold shadow-sm">
                <Users className="w-3 h-3" />
                {task.meetingInfo.person}
              </span>
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap gap-1.5 mb-6 min-h-[1.75rem] items-center">
          {task.departments?.map(d => (
            <span key={d} className={cn("text-[10px] px-2 py-0.5 rounded-md font-bold border shadow-sm tracking-wide", DEPARTMENTS[d].bg, DEPARTMENTS[d].color, DEPARTMENTS[d].border)}>
              {DEPARTMENTS[d].label}
            </span>
          ))}
          {task.liaisonDepartments && task.liaisonDepartments.length > 0 && (
            <ChevronRight className="w-3 h-3 text-slate-300 ml-1 mr-0.5" />
          )}
          {task.liaisonDepartments?.slice(0, 2).map((ld: any, i: number) => {
            const name = typeof ld === 'string' ? ld : ld.name;
            const contact = typeof ld === 'string' ? '' : ld.contact;
            return (
              <span key={name + i} className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-violet-50/80 text-violet-700 border border-violet-100 shadow-sm leading-tight tracking-wide">
                {name}{contact ? `(${contact})` : ''}
              </span>
            );
          })}
          {(task.liaisonDepartments?.length || 0) > 2 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-50 text-slate-500 border border-slate-200">
              +{task.liaisonDepartments.length - 2}
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Footer info */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
          <div className={cn("flex flex-wrap items-center gap-3 w-full", task.projectLead ? "justify-between" : "justify-end")}>
            <div className="flex items-center flex-wrap gap-3">
              {task.projectLead && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#1abc9c] to-[#16a085] flex items-center justify-center text-xs font-black text-white shadow-md shadow-[#1abc9c]/20 ring-1 ring-white/50">
                    {leadName?.charAt(0) || ''}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-800 leading-none">{leadName}</span>
                    <span className="text-[9px] text-[#1abc9c] font-black tracking-widest uppercase leading-tight mt-0.5">LEAD</span>
                  </div>
                </div>
              )}

              {teamMemNames.length > 0 && (
                <div className="flex items-center gap-2 pl-3 border-l border-slate-200 min-h-[32px]">
                  <div className="flex flex-wrap gap-1 max-w-[130px]">
                    {teamMemNames.slice(0, 2).map((name: string, i: number) => (
                      <div key={i} className="px-1.5 py-0.5 bg-white border border-slate-200 shadow-sm rounded flex items-center justify-center text-[10px] font-bold text-slate-600 truncate max-w-[60px]" title={name}>
                        {name}
                      </div>
                    ))}
                    {teamMemNames.length > 2 && (
                      <div className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 shadow-sm rounded flex items-center justify-center text-[10px] font-bold text-slate-400">
                        +{teamMemNames.length - 2}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col shrink-0">
                    <span className="text-[10px] font-bold text-slate-600 leading-none">团队成员</span>
                    <span className="text-[9px] text-slate-400 font-bold tracking-wider leading-tight mt-0.5">TEAM</span>
                  </div>
                </div>
              )}
            </div>
            
            {isTrash && canEdit && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button 
                  onClick={(e) => { e.stopPropagation(); onRestore?.(); }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 shadow-sm bg-white"
                  title="恢复"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onPermanentDelete?.(); }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 shadow-sm bg-white"
                  title="永久删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Preview at the very bottom */}
        {!isTrash && (task.currentUpdate || task.meetingInfo?.agenda || task.description) && (
          <div className="mt-4 p-3.5 bg-gradient-to-br from-slate-50/80 to-slate-100/50 rounded-2xl border border-slate-200/60 relative overflow-hidden group/preview">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover/preview:bg-[#1abc9c]/40 transition-colors" />
            <div className="flex items-center justify-between mb-1.5 pl-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {task.currentUpdate ? '最新进展' : (task.meetingInfo?.agenda ? '事项概要' : '任务描述')}
              </span>
              {task.updatedAt && (
                <span className="text-[10px] text-slate-400 tabular-nums font-medium tracking-wide">
                  {format(new Date(task.updatedAt), 'MM/dd HH:mm')}
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-700 font-medium line-clamp-2 leading-relaxed pl-1.5">
              {task.currentUpdate || task.meetingInfo?.agenda || task.description}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const config = {
    pending: { label: '待处理', className: 'bg-slate-100 text-slate-500 border-slate-200' },
    in_progress: { label: '进行中', className: 'bg-blue-50 text-blue-600 border-blue-100' },
    completed: { label: '已完成', className: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={cn("text-[10px] px-1.5 py-0 rounded-md font-bold border whitespace-nowrap leading-tight", c.className)}>
      {c.label}
    </span>
  );
}


