import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiShield, FiChevronLeft, FiChevronRight, FiCheck, FiX, FiSearch } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xử lý', color: 'bg-amber-100 text-amber-700' },
  INVESTIGATING: { label: 'Đang điều tra', color: 'bg-blue-100 text-blue-700' },
  RESOLVED: { label: 'Đã xử lý', color: 'bg-green-100 text-green-700' },
  DISMISSED: { label: 'Bác bỏ', color: 'bg-gray-100 text-gray-600' },
};

const ViolationManagementPage = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchViolations = () => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (filter) params.status = filter;
    api.get('/violations', { params })
      .then(({ data }) => {
        setViolations(data.data.violations);
        setTotalPages(data.data.pagination.totalPages);
      })
      .catch(() => toast.error('Không thể tải vi phạm'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchViolations(); }, [page, filter]);

  const handleResolve = async (id, status, penalty = null) => {
    try {
      await api.put(`/violations/${id}`, { status, penalty });
      toast.success('Đã cập nhật');
      fetchViolations();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-ink">Vi phạm & Báo cáo</h2>
        <p className="text-ink-tertiary text-sm mt-1">Quản lý báo cáo vi phạm từ người dùng</p>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['', 'PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].map((s) => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === s ? 'bg-primary-600 text-white shadow-premium-sm' : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary'}`}>
            {STATUS_MAP[s]?.label || 'Tất cả'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner size="skeleton" /> : (
        <div className="space-y-3">
          {violations.map((v) => (
            <div key={v.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 min-w-0 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${STATUS_MAP[v.status]?.color || 'bg-gray-100'}`}>
                    <FiAlertTriangle className="text-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="font-semibold text-ink">{v.targetType === 'SHOP' ? 'Cửa hàng' : 'Sản phẩm'}</h3>
                      <span className={`badge text-xs ${STATUS_MAP[v.status]?.color}`}>{STATUS_MAP[v.status]?.label}</span>
                      {v.penalty && <span className="badge text-xs bg-red-100 text-red-700">{v.penalty === 'BAN' ? 'Đã khóa' : v.penalty === 'SUSPEND' ? 'Tạm khóa' : 'Cảnh cáo'}</span>}
                    </div>
                    <p className="text-sm text-ink-secondary mt-0.5">{v.reason}</p>
                    {v.description && <p className="text-xs text-ink-tertiary mt-1">{v.description}</p>}
                    <p className="text-xs text-ink-tertiary mt-1">Mã đối tượng: <span className="font-mono">{v.targetId?.slice(0, 12)}</span> | {new Date(v.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              </div>

              {v.status === 'PENDING' && (
                <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => handleResolve(v.id, 'INVESTIGATING')} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">Điều tra</button>
                  <button onClick={() => {
                    if (window.confirm('Cảnh báo shop này?')) handleResolve(v.id, 'RESOLVED', 'WARNING');
                  }} className="px-4 py-2 text-sm font-medium bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-all">Cảnh cáo</button>
                  <button onClick={() => {
                    if (window.confirm('Tạm khóa shop này?')) handleResolve(v.id, 'RESOLVED', 'SUSPEND');
                  }} className="px-4 py-2 text-sm font-medium bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-all">Tạm khóa</button>
                  <button onClick={() => {
                    if (window.confirm('Khóa vĩnh viễn shop này?')) handleResolve(v.id, 'RESOLVED', 'BAN');
                  }} className="px-4 py-2 text-sm font-medium bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all">Khóa</button>
                  <button onClick={() => handleResolve(v.id, 'DISMISSED')} className="px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-secondary rounded-xl transition-all">Bác bỏ</button>
                </div>
              )}
              {v.status === 'INVESTIGATING' && (
                <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => handleResolve(v.id, 'RESOLVED')} className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all"><FiCheck className="inline mr-1" size={14} />Giải quyết</button>
                  <button onClick={() => handleResolve(v.id, 'DISMISSED')} className="px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-secondary rounded-xl transition-all"><FiX className="inline mr-1" size={14} />Bác bỏ</button>
                </div>
              )}
            </div>
          ))}
          {violations.length === 0 && (
            <div className="text-center py-16 text-ink-tertiary">
              <FiShield className="text-3xl mx-auto mb-3" />
              <p>Không có vi phạm nào</p>
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl border border-gray-200 text-ink-secondary hover:bg-surface-secondary disabled:opacity-40"><FiChevronLeft /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-xl text-sm font-medium ${p === page ? 'bg-primary-600 text-white shadow-premium-sm' : 'border border-gray-200 text-ink-secondary hover:bg-surface-secondary'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-xl border border-gray-200 text-ink-secondary hover:bg-surface-secondary disabled:opacity-40"><FiChevronRight /></button>
        </div>
      )}
    </div>
  );
};

export default ViolationManagementPage;
