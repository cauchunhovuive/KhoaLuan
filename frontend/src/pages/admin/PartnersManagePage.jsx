import React, { useState, useEffect } from 'react';
import { FiSearch, FiCheck, FiX, FiShoppingBag } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const PartnersManagePage = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, search };
      if (filter === 'approved') params.isApproved = 'true';
      if (filter === 'pending') params.isApproved = 'false';
      const { data } = await api.get('/partner/admin/all', { params });
      setPartners(data.data.partners);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      toast.error('Không thể tải danh sách đối tác');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (search) setPage(1);
    fetchPartners();
  }, [page, filter, search]);

  const handleApprove = async (id, approved) => {
    let rejectedReason = null;
    if (!approved) {
      rejectedReason = prompt('Nhập lý do từ chối:');
      if (!rejectedReason) return;
    }
    try {
      await api.put(`/partner/admin/${id}/approve`, { approved, rejectedReason });
      toast.success(approved ? 'Đã duyệt đối tác' : 'Đã từ chối đối tác');
      fetchPartners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Quản lý đối tác</h2>
          <p className="text-ink-tertiary text-sm mt-1">Phê duyệt và quản lý tài khoản đối tác kinh doanh</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-ink-tertiary">
            {partners.filter(p => !p.isApproved).length} đang chờ
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Tìm kiếm tên, email, cửa hàng..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200" />
          </div>
          <div className="flex items-center space-x-1 p-1 bg-surface-secondary rounded-xl">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'pending', label: 'Chờ duyệt' },
              { key: 'approved', label: 'Đã duyệt' },
            ].map((tab) => (
              <button key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === tab.key ? 'bg-white text-ink shadow-premium-sm' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {tab.label}
                {tab.key === 'pending' && partners.filter(p => !p.isApproved).length > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {partners.filter(p => !p.isApproved).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Partner List */}
      {loading ? <LoadingSpinner size="skeleton" /> : (
        <div className="space-y-3 stagger-fade">
          {partners.length > 0 ? partners.map((partner) => (
            <div key={partner.id} className="card p-5 hover:border-gray-200 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 min-w-0 flex-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-1 flex-shrink-0 ${
                    partner.isApproved ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200'
                  }`}>
                    <FiShoppingBag className={`text-xl ${partner.isApproved ? 'text-emerald-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="font-semibold text-ink">{partner.storeName || partner.name}</h3>
                      {partner.isApproved ? (
                        <span className="badge bg-green-100 text-green-700 text-xs">Đã duyệt</span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-700 text-xs">Chờ duyệt</span>
                      )}
                      {partner.rejectedReason && (
                        <span className="badge bg-red-100 text-red-700 text-xs">Bị từ chối</span>
                      )}
                    </div>
                    <p className="text-sm text-ink-secondary mt-0.5">
                      <span className="font-medium">{partner.name}</span> — {partner.email}
                    </p>
                    {partner.storeDescription && (
                      <p className="text-xs text-ink-tertiary mt-1 italic">{partner.storeDescription}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 mt-3 text-xs">
                      <div>
                        <span className="text-ink-tertiary">📞</span>
                        <span className="ml-1 text-ink-secondary">{partner.phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-ink-tertiary">🏪</span>
                        <span className="ml-1 text-ink-secondary">{partner.businessAddress || '—'}</span>
                      </div>
                      <div>
                        <span className="text-ink-tertiary">📋 MST</span>
                        <span className="ml-1 text-ink-secondary">{partner.taxCode || '—'}</span>
                      </div>
                      <div>
                        <span className="text-ink-tertiary">📦</span>
                        <span className="ml-1 text-ink-secondary">{partner._count?.products || 0} sản phẩm</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-tertiary">
                      <span>Đăng ký: {new Date(partner.createdAt).toLocaleDateString('vi-VN')}</span>
                      {partner.approvedAt && (
                        <span>Duyệt: {new Date(partner.approvedAt).toLocaleDateString('vi-VN')}</span>
                      )}
                    </div>
                    {partner.rejectedReason && (
                      <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-red-700"><strong>Lý do từ chối:</strong> {partner.rejectedReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-2 ml-4 flex-shrink-0">
                  {!partner.isApproved && !partner.rejectedReason ? (
                    <>
                      <button onClick={() => handleApprove(partner.id, true)}
                        className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all text-sm font-medium shadow-premium-sm">
                        <FiCheck size={15} />
                        <span>Duyệt</span>
                      </button>
                      <button onClick={() => handleApprove(partner.id, false)}
                        className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition-all text-sm font-medium">
                        <FiX size={15} />
                        <span>Từ chối</span>
                      </button>
                    </>
                  ) : partner.isApproved ? (
                    <div className="text-right">
                      <span className="text-xs text-green-600 font-medium flex items-center">
                        <FiCheck className="mr-1" />
                        Đã duyệt
                      </span>
                      <button onClick={() => handleApprove(partner.id, false)}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 underline">
                        Thu hồi duyệt
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleApprove(partner.id, true)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all text-sm font-medium">
                      <FiCheck size={15} />
                      <span>Duyệt lại</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiShoppingBag className="text-2xl text-gray-400" />
              </div>
              <p className="text-sm text-ink-secondary">Không tìm thấy đối tác nào</p>
              <p className="text-xs text-ink-tertiary mt-1">Thử thay đổi từ khoá tìm kiếm hoặc bộ lọc</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                page === p ? 'bg-primary-600 text-white shadow-premium-sm' : 'bg-white text-ink-secondary hover:bg-surface-secondary border border-gray-200'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnersManagePage;
