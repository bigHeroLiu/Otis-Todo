import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Plus, Users, Printer, Menu, X, ChevronRight, Trash2, Briefcase, Plane, Train, Car, RotateCcw } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { TaskModal } from './components/TaskModal';
import { HRModal } from './components/HRModal';
import { MissionListModal } from './components/MissionListModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { ChatAI } from './components/ChatAI';
import { 
  fetchTasks, saveTask, updateTask, deleteTask as deleteDbTask, 
  fetchMembers, saveMember, deleteMember, 
  fetchDepts, saveDept, deleteDept 
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
  deletedAt: string | null;
  visibleToChairman?: boolean;
  createdAt: string;
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
      const isLead = task.projectLead === currentStaffId;
      const isTeam = task.teamMembers?.includes(currentStaffId || '');
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            <AnimatePresence>
              {filteredTasks.map(task => (
                <TaskCard 
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
                />
              ))}
            </AnimatePresence>
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
        canEdit={userRole === 'otis'}
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
        <ChatAI onAddTask={async (taskData) => {
          setEditingTask(taskData);
          setIsTaskModalOpen(true);
        }} />
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
}

function TaskCard({ task, onClick, isTrash, onRestore, onPermanentDelete, canEdit, onToggleChairman }: TaskCardProps) {
  const primaryDept = task.departments?.[0] ? DEPARTMENTS[task.departments[0]] : null;
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col relative",
        !isTrash && "cursor-pointer"
      )}
    >
      {primaryDept && (
        <div className={cn("h-1.5 w-full", primaryDept.bg.replace('50', '400'))} />
      )}
      
      {canEdit && onToggleChairman && (
        <button
          onClick={onToggleChairman}
          className={cn(
            "absolute top-4 right-4 p-1.5 rounded-full transition-colors flex items-center justify-center border",
            task.visibleToChairman 
              ? "bg-amber-100 text-amber-600 border-amber-200" 
              : "bg-slate-50 text-slate-300 border-slate-200 hover:text-slate-500 hover:bg-slate-100"
          )}
          title={task.visibleToChairman ? "主席可见" : "设为主席可见"}
        >
          <span className="text-[10px] font-bold px-1 whitespace-nowrap">主席</span>
        </button>
      )}

      <div className="p-5 flex flex-col flex-1 mt-2">
        <div className="flex items-start justify-between gap-3 mb-3 pr-10">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2">{task.name}</h3>
          <StatusBadge status={task.status} />
        </div>
        
        <div className="text-xs text-slate-500 mb-4 flex flex-wrap items-center gap-2">
          <span>{format(new Date(task.createdAt), 'yyyy/MM/dd HH:mm')}</span>
          {task.tripInfo && (
            <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
              {task.tripInfo.transport === '飞机' ? <Plane className="w-3 h-3" /> : 
               task.tripInfo.transport === '高铁' ? <Train className="w-3 h-3" /> : <Car className="w-3 h-3" />}
              {task.tripInfo.destination}
              {task.tripInfo.flightNo && ` (${task.tripInfo.flightNo})`}
              {task.tripInfo.needsDriver && ` | 司机: ${task.tripInfo.driverName || '是'}`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {task.departments?.map(d => (
            <span key={d} className={cn("text-xs px-2 py-1 rounded-md font-medium border", DEPARTMENTS[d].bg, DEPARTMENTS[d].color, DEPARTMENTS[d].border)}>
              {DEPARTMENTS[d].label}
            </span>
          ))}
          {task.liaisonDepartments?.slice(0, 2).map((ld: any, i: number) => {
            const name = typeof ld === 'string' ? ld : ld.name;
            const contact = typeof ld === 'string' ? '' : ld.contact;
            return (
              <span key={name + i} className="text-xs px-2 py-1 rounded-md font-medium bg-violet-50 text-violet-700 border border-violet-200">
                {name}{contact ? `(${contact})` : ''}
              </span>
            );
          })}
          {(task.liaisonDepartments?.length || 0) > 2 && (
            <span className="text-xs px-2 py-1 rounded-md font-medium bg-slate-50 text-slate-600 border border-slate-200">
              +{task.liaisonDepartments.length - 2}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                {task.projectLead?.charAt(0) || '?'}
              </div>
              <span className="text-sm font-medium">{task.projectLead || '未指派'}</span>
              {task.teamMembers?.length > 0 && (
                <span className="text-xs text-slate-500 truncate">
                  等 {task.teamMembers.length + 1} 人
                </span>
              )}
            </div>
            
            {isTrash && canEdit && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onRestore?.(); }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="恢复"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onPermanentDelete?.(); }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="永久删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {task.currentUpdate && !isTrash && (
            <p className="text-sm text-slate-600 line-clamp-2 mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
              {task.currentUpdate}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const config = {
    pending: { label: '待处理', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    in_progress: { label: '进行中', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    completed: { label: '已完成', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={cn("text-xs px-2 py-1 rounded-full font-medium border whitespace-nowrap", c.className)}>
      {c.label}
    </span>
  );
}


