import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSave, FiSliders, FiLoader, FiMail, FiMapPin, FiPhone as FiPhoneIcon,
  FiTruck, FiCpu, FiClock, FiPlay, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiCalendar, FiActivity, FiZap, FiLayers, FiTrendingUp,
  FiChevronRight, FiAlertCircle, FiInfo,
} from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { fetchSettings } from '../../store/settingsSlice';

// ─── AI Task Runner Component ───
const AITaskCard = ({ icon: Icon, title, description, taskKey, lastRun, onRun, running }) => {
  return (
    <div className={`group p-5 rounded-2xl border transition-all duration-300 ${
      running ? 'border-primary-200 bg-primary-50/30 shadow-premium-glow' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-premium-sm'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            running ? 'bg-primary-100' : 'bg-gray-50 group-hover:bg-primary-50'
          }`}>
            <Icon className={`text-lg ${running ? 'text-primary-600 animate-pulse' : 'text-gray-500'}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink">{title}</h4>
            <p className="text-xs text-ink-tertiary mt-0.5">{description}</p>
            {lastRun && (
              <p className="text-[10px] text-ink-tertiary mt-1.5 flex items-center space-x-1">
                <FiClock className="text-[9px]" />
                <span>Lần cuối: {lastRun}</span>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => onRun(taskKey)}
          disabled={running}
          className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
            running
              ? 'bg-primary-100 text-primary-600 cursor-wait'
              : 'bg-gray-50 text-ink-secondary hover:bg-primary-50 hover:text-primary-600 border border-gray-200 hover:border-primary-200'
          }`}
        >
          {running ? (
            <><FiLoader className="animate-spin text-xs" /><span>Đang chạy...</span></>
          ) : (
            <><FiPlay className="text-xs" /><span>Chạy</span></>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Interval Selector ───
const IntervalSelector = ({ value, onChange, label, disabled }) => (
  <div className="flex items-center space-x-3">
    <label className="text-xs text-ink-secondary whitespace-nowrap">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-ink
        focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
        disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      <option value="0">Tắt</option>
      <option value="15">Mỗi 15 phút</option>
      <option value="30">Mỗi 30 phút</option>
      <option value="60">Mỗi 1 giờ</option>
      <option value="180">Mỗi 3 giờ</option>
      <option value="360">Mỗi 6 giờ</option>
      <option value="720">Mỗi 12 giờ</option>
      <option value="1440">Mỗi 1 ngày</option>
      <option value="4320">Mỗi 3 ngày</option>
      <option value="10080">Mỗi 1 tuần</option>
    </select>
  </div>
);

// ─── Main SettingsPage ───
const SettingsPage = () => {
  const dispatch = useDispatch();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // AI Auto-Run State
  const [aiTasks, setAiTasks] = useState({
    sessionTrain: { running: false, lastRun: null, status: null },
    clustering: { running: false, lastRun: null, status: null },
  });
  const [runAllRunning, setRunAllRunning] = useState(false);
  const [aiLogs, setAiLogs] = useState([]);

  // Auto-schedule intervals (minutes)
  const [schedules, setSchedules] = useState({
    sessionTrainInterval: 0,
    clusteringInterval: 0,
  });

  useEffect(() => {
    loadSettings();
    loadAiLogs();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/settings');
      setSettings(data.data);
      // Load saved intervals from settings
      if (data.data) {
        setSchedules({
          sessionTrainInterval: data.data.sessionTrainInterval || 0,
          clusteringInterval: data.data.clusteringInterval || 0,
        });
      }
    } catch (error) {
      toast.error('Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const loadAiLogs = async () => {
    try {
      const { data } = await api.get('/admin/ai-logs?limit=20');
      if (data.success) setAiLogs(data.data || []);
    } catch (_) {
      // Optional - logs may not exist yet
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Merge schedules into settings before saving
      const mergedSettings = { ...settings, ...schedules };
      const { data } = await api.put('/settings', mergedSettings);
      setSettings(data.data);
      dispatch(fetchSettings());
      toast.success('Đã lưu cài đặt thành công');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  // ─── AI Task Runner ───
  const runTask = useCallback(async (taskKey) => {
    setAiTasks(prev => ({ ...prev, [taskKey]: { ...prev[taskKey], running: true, status: null } }));

    const endpoints = {
      sessionTrain: '/ml/session/train',
      clustering: '/clusters/run',
    };

    const labels = {
      sessionTrain: 'Huấn luyện Session',
      clustering: 'Phân cụm KH',
    };

    const endpoint = endpoints[taskKey];
    if (!endpoint) return;

    toast.loading(`Đang ${labels[taskKey]}...`, { id: `task-${taskKey}` });

    try {
      const start = Date.now();
      const { data } = await api.post(endpoint);
      const ms = Date.now() - start;

      const success = data.success || data.data?.trained;
      const statusText = success
        ? `✅ Hoàn tất (${(ms / 1000).toFixed(1)}s)`
        : `❌ Thất bại`;

      setAiTasks(prev => ({
        ...prev,
        [taskKey]: {
          running: false,
          lastRun: new Date().toLocaleString('vi-VN'),
          status: statusText,
          duration: ms,
        },
      }));

      toast.success(`${labels[taskKey]} thành công!`, { id: `task-${taskKey}` });

      // Log to audit
      try {
        await api.post(`/audit`, {
          action: 'AI_RUN',
          entity: 'ML',
          details: `${labels[taskKey]} — ${statusText} (${(ms / 1000).toFixed(1)}s)`,
        });
      } catch (_) {}

      // Refresh logs
      loadAiLogs();
    } catch (error) {
      setAiTasks(prev => ({
        ...prev,
        [taskKey]: {
          running: false,
          lastRun: new Date().toLocaleString('vi-VN'),
          status: '❌ Lỗi: ' + (error.response?.data?.message || error.message),
        },
      }));
      toast.error(`${labels[taskKey]} thất bại!`, { id: `task-${taskKey}` });
    }
  }, []);

  const runAllTasks = useCallback(async () => {
    setRunAllRunning(true);
    const tasks = ['sessionTrain', 'clustering'];
    for (const task of tasks) {
      await runTask(task);
    }
    setRunAllRunning(false);
    toast.success('Đã chạy tất cả AI tasks!');
  }, [runTask]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="relative">
          <FiLoader className="animate-spin text-3xl text-primary-600" />
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-primary-200 opacity-20" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-ink-secondary">
        <FiSliders className="text-4xl mb-3 text-gray-300" />
        <p className="font-medium">Không thể tải cài đặt</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink tracking-tight">Cài đặt</h2>
          <p className="text-ink-tertiary text-sm mt-1">Quản lý cấu hình hệ thống và AI tự động</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={loadSettings} className="btn-ghost btn-sm flex items-center space-x-1.5">
            <FiRefreshCw className="text-xs" /> <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* ═══════════════ AI AUTO-RUN SCHEDULER ═══════════════ */}
      <div className="card-double-bezel">
        <div className="card-inner">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <FiCpu className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">AI Auto-Run Scheduler</h3>
                <p className="text-xs text-ink-tertiary">Tự động huấn luyện và chạy các mô hình AI theo lịch</p>
              </div>
            </div>
            <button
              onClick={runAllTasks}
              disabled={runAllRunning}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-primary-600 text-white rounded-xl font-medium text-sm
                hover:from-violet-700 hover:to-primary-700 active:scale-[0.97] disabled:opacity-60 disabled:cursor-wait
                shadow-lg shadow-violet-600/20 transition-all duration-200"
            >
              {runAllRunning ? (
                <><FiLoader className="animate-spin" /> <span>Đang chạy tất cả...</span></>
              ) : (
                <><FiZap className="text-sm" /> <span>Chạy tất cả</span></>
              )}
            </button>
          </div>

          {/* Task Cards */}
          <div className="space-y-3 mb-6">
            <AITaskCard
              icon={FiClock}
              title="Huấn luyện Session Model"
              description="Xây dựng co-occurrence matrix từ product views (281 views)"
              taskKey="sessionTrain"
              lastRun={aiTasks.sessionTrain.lastRun}
              onRun={runTask}
              running={aiTasks.sessionTrain.running}
            />
            <AITaskCard
              icon={FiLayers}
              title="Phân cụm khách hàng"
              description="RFM Analysis + K-Means Clustering (15 khách hàng)"
              taskKey="clustering"
              lastRun={aiTasks.clustering.lastRun}
              onRun={runTask}
              running={aiTasks.clustering.running}
            />
          </div>

          {/* Schedule Configuration */}
          <div className="bg-surface-secondary rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2.5">
              <FiCalendar className="text-primary-600" />
              <h4 className="text-sm font-semibold text-ink">Lịch tự động</h4>
              <span className="text-[10px] text-ink-tertiary bg-white px-2 py-0.5 rounded-full border border-gray-200">
                Lưu cài đặt để áp dụng
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <IntervalSelector
                label="Session:"
                value={schedules.sessionTrainInterval}
                onChange={(v) => setSchedules(prev => ({ ...prev, sessionTrainInterval: Number(v) }))}
              />
              <IntervalSelector
                label="Cluster:"
                value={schedules.clusteringInterval}
                onChange={(v) => setSchedules(prev => ({ ...prev, clusteringInterval: Number(v) }))}
              />
            </div>
            {Object.values(schedules).some(v => v > 0) && (
              <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <FiAlertCircle className="text-amber-600 text-sm mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  AI tasks sẽ tự động chạy theo lịch đã cấu hình. Backend cần chạy liên tục (Docker) để scheduler hoạt động.
                  Lịch được lưu vào cài đặt hệ thống và áp dụng sau khi nhấn "Lưu cài đặt".
                </p>
              </div>
            )}
          </div>

          {/* Recent AI Logs */}
          {aiLogs.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center space-x-2 mb-3">
                <FiActivity className="text-primary-600 text-sm" />
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">Lịch sử chạy AI</h4>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {aiLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3.5 py-2 bg-surface-secondary rounded-xl text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.details?.includes('✅') ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-ink truncate">{log.details || log.action}</span>
                    </div>
                    <span className="text-ink-tertiary flex-shrink-0 ml-2">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ SYSTEM SETTINGS FORM ═══════════════ */}
      <div className="card-double-bezel">
        <div className="card-inner space-y-8">
          <form onSubmit={handleSave} className="space-y-8">
            {/* General */}
            <div>
              <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                <FiSliders className="text-primary-600" />
                <span>Cài đặt chung</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tên website</label>
                  <input type="text" name="siteName" value={settings.siteName} onChange={handleChange} className="input-premium" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số SP mỗi trang</label>
                  <input type="number" name="itemsPerPage" value={settings.itemsPerPage} onChange={handleChange} className="input-premium w-32" min={1} />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mô tả</label>
                <textarea name="siteDescription" value={settings.siteDescription} onChange={handleChange} className="input-premium" rows={2} />
              </div>
            </div>

            {/* ML Toggles */}
            <div>
              <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                <FiCpu className="text-primary-600" />
                <span>Machine Learning</span>
              </h3>
              <div className="space-y-3 bg-surface-secondary rounded-2xl p-5">
                {[
                  { name: 'enableRecommendations', label: 'Bật gợi ý sản phẩm', desc: 'Đề xuất sản phẩm dựa trên hành vi người dùng' },
                  { name: 'enableClustering', label: 'Bật phân cụm khách hàng', desc: 'Phân nhóm khách hàng dựa trên hành vi mua sắm' },
                ].map((item) => (
                  <label key={item.name} className="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" name={item.name}
                      checked={settings[item.name]}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                    <div>
                      <span className="text-sm font-medium text-ink group-hover:text-primary-600 transition-colors">{item.label}</span>
                      <p className="text-xs text-ink-tertiary">{item.desc}</p>
                    </div>
                  </label>
                ))}
                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-xl mt-3">
                  <FiInfo className="text-blue-600 text-sm flex-shrink-0" />
                  <p className="text-xs text-blue-800">
                    Cấu hình AI Auto-Run ở phần trên để tự động huấn luyện các mô hình ML theo lịch.
                  </p>
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div>
              <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                <FiTruck className="text-primary-600" />
                <span>Vận chuyển</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Miễn phí ship cho đơn trên (₫)</label>
                  <input type="number" name="freeShippingThreshold" value={settings.freeShippingThreshold} onChange={handleChange} className="input-premium" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Phí ship mặc định (₫)</label>
                  <input type="number" name="shippingFee" value={settings.shippingFee} onChange={handleChange} className="input-premium" />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                <FiMail className="text-primary-600" />
                <span>Thông tin liên hệ</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Email</label>
                  <div className="relative group">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input type="email" name="siteContactEmail" value={settings.siteContactEmail} onChange={handleChange} className="input-premium pl-10" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số điện thoại</label>
                  <div className="relative group">
                    <FiPhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input type="text" name="siteContactPhone" value={settings.siteContactPhone} onChange={handleChange} className="input-premium pl-10" />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Địa chỉ</label>
                <div className="relative group">
                  <FiMapPin className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                  <input type="text" name="siteContactAddress" value={settings.siteContactAddress} onChange={handleChange} className="input-premium pl-10" />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-ink-tertiary">
                <FiCheckCircle className="inline mr-1 text-emerald-500" />
                Cài đặt được lưu vào database
              </p>
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center space-x-2 disabled:opacity-60 px-6 py-2.5">
                {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
                <span>{saving ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
