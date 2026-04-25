import { create } from 'zustand';
import { useEffect, useState } from 'react';
import { Sparkles, Award, Star, TrendingUp, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'xp' | 'badge' | 'success' | 'info';
  title: string;
  message: string;
  xpAmount?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Auto-remove after 4 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Helper functions
export const notifyXP = (amount: number, reason?: string) => {
  useToastStore.getState().addToast({
    type: 'xp',
    title: `+${amount} XP!`,
    message: reason || 'Keep up the great work!',
    xpAmount: amount,
  });
};

export const notifyBadge = (badgeName: string) => {
  useToastStore.getState().addToast({
    type: 'badge',
    title: 'Badge Unlocked!',
    message: `You earned the "${badgeName}" badge! 🎉`,
  });
};

export const notifySuccess = (message: string) => {
  useToastStore.getState().addToast({
    type: 'success',
    title: 'Success!',
    message,
  });
};

// Toast Renderer Component
export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '380px' }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), 3600);
    return () => clearTimeout(timer);
  }, []);

  const iconMap = {
    xp: <Sparkles className="text-yellow-400" size={24} />,
    badge: <Award className="text-purple-400" size={24} />,
    success: <Star className="text-green-400" size={24} />,
    info: <TrendingUp className="text-blue-400" size={24} />,
  };

  const bgMap = {
    xp: 'from-yellow-600/95 to-amber-700/95',
    badge: 'from-purple-600/95 to-indigo-700/95',
    success: 'from-green-600/95 to-emerald-700/95',
    info: 'from-blue-600/95 to-indigo-700/95',
  };

  return (
    <div
      className={`pointer-events-auto bg-gradient-to-r ${bgMap[toast.type]} backdrop-blur-lg text-white rounded-2xl p-4 shadow-elevated flex items-center gap-4 ${
        leaving ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 animate-pop">
        {iconMap[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{toast.title}</p>
        <p className="text-xs text-white/80 truncate">{toast.message}</p>
      </div>
      <button onClick={onClose} className="text-white/50 hover:text-white/90 transition-colors flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  );
};
