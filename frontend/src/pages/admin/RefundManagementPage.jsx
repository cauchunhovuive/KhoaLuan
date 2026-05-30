import React, { useState, useEffect } from 'react';
import { FiSearch, FiCheck, FiX, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  PENDING: { label: 'Chờ xử lý', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-700' },
  REJECTED: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'bg-green-100 text-green-700' },
};

const RefundManagementPage = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRefund, setSelectedRefund] = useState(null);

  const fetchRefunds = () => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (filter) params.status = filter;
    api.get('/refunds', { params })
      .then(({ data }) => {
        setRefunds(data.data.refunds);
        setTotalPages(data.data.pagination.totalPages);
      })
      .catch(() => toast.error('Không thể tải yêu cầu hoàn tiền'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRefunds(); }, [page, filter]);

  const handleResolve = async (id, status, adminReply = '') => {
    try {
      await api.put(`/refunds/${id}`, { status, adminReply: adminReply || undefined });
      toast.success(status === 'REFUNDED' ? 'Đã hoàn tiền' : status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối');
      setSelectedRefund(null);
      fetchRefunds();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-ink">Quản lý hoàn tiền</h2>
        <p className="text-ink-tertiary text-sm mt-1">Xử lý yêu cầu hoàn tiền từ khách hàng</p>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'].map((s) => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === s ? 'bg-primary-600 text-white shadow-premium-sm' : 'bg-surface-secondary text-ink-secondary hover:bg-surface-tertiary'}`}>
            {STATUS_MAP[s]?.label || 'Tất cả'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner size="skeleton" /> : (
        <div className="space-y-3">
          {refunds.map((r) => (
            <div key={r.id} className="card p-5 cursor-pointer hover:border-gray-200 transition-all" onClick={() => setSelectedRefund(r)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 min-w-0 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${STATUS_MAP[r.status]?.color || 'bg-gray-100'}`}>
                    <FiRefreshCw className="text-lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="font-semibold text-ink">{r.user?.name}</h3>
                      <span className={`badge text-xs ${STATUS_MAP[r.status]?.color}`}>{STATUS_MAP[r.status]?.label}</span>
                    </div>
                    <p className="text-sm text-ink-secondary mt-0.5">{r.reason}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-tertiary">
                      <span>Đơn: #{r.order?.id?.slice(0, 8)}</span>
                      <span>Số tiền: <strong>{(r.amount || r.order?.finalAmount || 0).toLocaleString('vi-VN')}₫</strong></span>
                      <span>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    {r.description && <p className="text-xs text-ink-tertiary mt-2 bg-gray-50 rounded-lg p-2">{r.description}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {refunds.length === 0 && (
            <div className="text-center py-16 text-ink-tertiary">
              <FiRefreshCw className="text-3xl mx-auto mb-3" />
              <p>Không có yêu cầu hoàn tiền nào</p>
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

      {/* Detail Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setSelectedRefund(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium-xl border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">Chi tiết yêu cầu</h3>
              <button onClick={() => setSelectedRefund(null)} className="text-gray-400 hover:text-ink text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-ink-tertiary">Khách hàng:</span> <span className="font-medium text-ink ml-1">{selectedRefund.user?.name}</span></div>
                <div><span className="text-ink-tertiary">Số tiền:</span> <span className="font-medium text-ink ml-1">{(selectedRefund.amount || selectedRefund.order?.finalAmount || 0).toLocaleString('vi-VN')}₫</span></div>
                <div><span className="text-ink-tertiary">Lý do:</span> <span className="font-medium text-ink ml-1">{selectedRefund.reason}</span></div>
                <div><span className="text-ink-tertiary">Ngày tạo:</span> <span className="font-medium text-ink ml-1">{new Date(selectedRefund.createdAt).toLocaleDateString('vi-VN')}</span></div>
              </div>
              {selectedRefund.description && (
                <div><label className="text-sm text-ink-tertiary">Mô tả:</label><p className="text-sm text-ink mt-1 bg-gray-50 rounded-lg p-3">{selectedRefund.description}</p></div>
              )}
              {selectedRefund.images?.length > 0 && (
                <div><label className="text-sm text-ink-tertiary">Hình ảnh:</label><div className="flex gap-2 mt-1">{selectedRefund.images.map((img, i) => (
                  <img key={i} src={img} alt="" className="w-20 h-20 object-cover rounded-lg" onError={e => { e.target.style.display = 'none'; }} />
                ))}</div></div>
              )}
              {selectedRefund.adminReply && (
                <div><label className="text-sm text-ink-tertiary">Phản hồi admin:</label><p className="text-sm text-ink mt-1 bg-blue-50 rounded-lg p-3">{selectedRefund.adminReply}</p></div>
              )}

              {(selectedRefund.status === 'PENDING' || selectedRefund.status === 'APPROVED') && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-sm font-medium text-ink">Xử lý yêu cầu</p>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleResolve(selectedRefund.id, 'REFUNDED')} className="btn-primary flex-1 py-2.5 inline-flex items-center justify-center space-x-1.5">
                      <FiCheck size={16} /><span>Hoàn tiền</span>
                    </button>
                    <button onClick={() => {
                      const reply = prompt('Nhập lý do từ chối:');
                      if (reply) handleResolve(selectedRefund.id, 'REJECTED', reply);
                    }} className="flex-1 py-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all text-sm font-medium inline-flex items-center justify-center space-x-1.5">
                      <FiX size={16} /><span>Từ chối</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundManagementPage;
