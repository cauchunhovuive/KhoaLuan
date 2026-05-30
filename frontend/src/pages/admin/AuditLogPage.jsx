import React, { useState, useEffect } from 'react';
import { FiClock, FiSearch, FiChevronLeft, FiChevronRight, FiActivity } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  CREATE: 'text-green-600 bg-green-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
  APPROVE: 'text-emerald-600 bg-emerald-50',
  BAN: 'text-red-700 bg-red-100',
};

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (actionFilter) params.action = actionFilter;
    if (entityFilter) params.entity = entityFilter;
    api.get('/audit', { params })
      .then(({ data }) => {
        setLogs(data.data.logs);
        setTotalPages(data.data.pagination.totalPages);
      })
      .catch(() => toast.error('Không thể tải audit log'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [page, actionFilter, entityFilter]);

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-ink">Audit Log</h2>
        <p className="text-ink-tertiary text-sm mt-1">Lịch sử hoạt động và thay đổi trên hệ thống</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="input-field text-sm">
              <option value="">Tất cả hành động</option>
              {['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'BAN'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="input-field text-sm">
              <option value="">Tất cả đối tượng</option>
              {['USER', 'PRODUCT', 'ORDER', 'COUPON', 'BANNER', 'FLASH_SALE', 'REFUND', 'VIOLATION'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <LoadingSpinner size="skeleton" /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary text-left">
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Thời gian</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Người dùng</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Hành động</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Đối tượng</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">Chi tiết</th>
                  <th className="p-4 font-medium text-ink-tertiary text-xs uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100 hover:bg-surface-secondary/50 transition-colors">
                    <td className="p-4 text-xs text-ink-tertiary whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-ink">{log.user?.name}</p>
                        <p className="text-xs text-ink-tertiary">{log.user?.role}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`badge text-xs font-mono ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="text-xs font-medium text-ink">{log.entity}</span>
                        {log.entityId && <p className="text-[10px] text-ink-tertiary font-mono">{log.entityId.slice(0, 12)}</p>}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-ink-secondary max-w-[200px] truncate">
                      {log.details || '—'}
                    </td>
                    <td className="p-4 text-xs text-ink-tertiary font-mono">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && (
            <div className="text-center py-16 text-ink-tertiary">
              <FiActivity className="text-3xl mx-auto mb-3" />
              <p>Chưa có log nào</p>
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

export default AuditLogPage;
