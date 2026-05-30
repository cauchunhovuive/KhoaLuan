import React, { useEffect, useState } from 'react';
import { FiSearch, FiUser, FiShoppingBag, FiCheck, FiX, FiShield } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  PARTNER: 'Đối tác',
  CUSTOMER: 'Khách hàng',
};

const ROLE_COLORS = {
  ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
  PARTNER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CUSTOMER: 'bg-gray-50 text-gray-600 border-gray-200',
};

const UsersManagePage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, partnersRes, allRes] = await Promise.all([
        api.get('/users', { params: { limit: 50, role: 'CUSTOMER', search } }),
        api.get('/partner/admin/all', { params: { limit: 50, search } }),
        api.get('/users', { params: { limit: 100, search } }),
      ]);
      setUsers(usersRes.data.data.users);
      setPartners(partnersRes.data.data.partners);
      setAllUsers(allRes.data.data.users);
    } catch (err) {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const handleApprove = async (id, approved) => {
    try {
      const rejectedReason = !approved ? prompt('Lý do từ chối:') : null;
      if (!approved && !rejectedReason) return;

      await api.put(`/partner/admin/${id}/approve`, { approved, rejectedReason });
      toast.success(approved ? 'Đã duyệt đối tác' : 'Đã từ chối đối tác');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    }
  };

  const handleChangeRole = async (userId, userName, newRole) => {
    if (!confirm(`Đổi vai trò của ${userName} thành ${ROLE_LABELS[newRole]}?`)) return;
    try {
      await api.put(`/users/${userId}`, { role: newRole });
      toast.success(`Đã đổi vai trò thành ${ROLE_LABELS[newRole]}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi vai trò');
    }
  };

  const tabs = [
    { key: 'all', label: 'Tất cả', icon: FiShield },
    { key: 'customers', label: 'Khách hàng', icon: FiUser },
    { key: 'partners', label: 'Đối tác', icon: FiShoppingBag },
  ];

  const getDisplayUsers = () => {
    switch (activeTab) {
      case 'customers': return users;
      case 'partners': return partners;
      default: return allUsers;
    }
  };

  const displayUsers = getDisplayUsers();

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-ink">Quản lý người dùng</h2>
        <p className="text-ink-tertiary text-sm mt-1">Quản lý khách hàng, đối tác và phân quyền người dùng</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 p-1 bg-surface-secondary rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
              activeTab === tab.key ? 'bg-white text-ink shadow-premium-sm' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
            {tab.key === 'partners' && partners.filter(p => !p.isApproved).length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {partners.filter(p => !p.isApproved).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm kiếm tên, email..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-surface-secondary border border-gray-200 rounded-xl text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-200" />
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Tất cả / Khách hàng */}
          {activeTab !== 'partners' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade">
              {displayUsers.length > 0 ? displayUsers.map((user) => (
                <div key={user.id} className="card p-5 hover:border-gray-200 transition-all duration-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ring-1 ${
                      user.role === 'ADMIN' ? 'bg-purple-50 ring-purple-200' : 'bg-primary-50 ring-primary-100'
                    }`}>
                      <span className={`text-lg font-bold ${
                        user.role === 'ADMIN' ? 'text-purple-600' : 'text-primary-600'
                      }`}>{user.name?.[0] || '?'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink truncate">{user.name}</p>
                      <p className="text-xs text-ink-tertiary truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-secondary">Số điện thoại</span>
                      <span className="font-medium text-ink">{user.phone || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink-secondary">Vai trò</span>
                      <select
                        value={user.role || 'CUSTOMER'}
                        onChange={(e) => handleChangeRole(user.id, user.name, e.target.value)}
                        className={`text-xs font-medium rounded-lg border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                          ROLE_COLORS[user.role] || ROLE_COLORS.CUSTOMER
                        }`}
                      >
                        <option value="CUSTOMER">Khách hàng</option>
                        <option value="PARTNER">Đối tác</option>
                        <option value="ADMIN">Quản trị viên</option>
                      </select>
                    </div>
                  </div>
                  {(user.totalSpent !== undefined || user.orderCount !== undefined) && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-ink-tertiary">
                      <span>Đã mua: {user.orderCount || 0} đơn</span>
                      <span className="font-medium text-ink">{(user.totalSpent || 0).toLocaleString('vi-VN')}₫</span>
                    </div>
                  )}
                </div>
              )) : (
                <div className="col-span-full text-center py-12 text-gray-400">
                  <FiUser className="mx-auto text-2xl mb-2" />
                  <p className="text-sm">Không tìm thấy người dùng</p>
                </div>
              )}
            </div>
          )}

          {/* Đối tác */}
          {activeTab === 'partners' && (
            <div className="space-y-3 stagger-fade">
              {displayUsers.length > 0 ? displayUsers.map((partner) => (
                <div key={partner.id} className="card p-5 hover:border-gray-200 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ring-1 flex-shrink-0 ${
                        partner.isApproved ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200'
                      }`}>
                        <FiShoppingBag className={`text-lg ${partner.isApproved ? 'text-emerald-600' : 'text-amber-600'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-ink">{partner.storeName || partner.name}</h3>
                          {partner.isApproved ? (
                            <span className="badge bg-green-100 text-green-700 text-xs">Đã duyệt</span>
                          ) : (
                            <span className="badge bg-amber-100 text-amber-700 text-xs">Chờ duyệt</span>
                          )}
                        </div>
                        <p className="text-sm text-ink-secondary mt-0.5">{partner.name} - {partner.email}</p>
                        {partner.storeDescription && (
                          <p className="text-xs text-ink-tertiary mt-1">{partner.storeDescription}</p>
                        )}
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-ink-tertiary">
                          <span>📞 {partner.phone || '—'}</span>
                          <span>🏪 {partner.businessAddress || '—'}</span>
                          {partner.taxCode && <span>📋 MST: {partner.taxCode}</span>}
                          <span>📦 {partner._count?.products || 0} sản phẩm</span>
                        </div>
                        {partner.rejectedReason && (
                          <p className="text-xs text-red-600 mt-1">Lý do từ chối: {partner.rejectedReason}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                      {!partner.isApproved ? (
                        <>
                          <button
                            onClick={() => handleApprove(partner.id, true)}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all text-sm font-medium"
                          >
                            <FiCheck size={14} />
                            <span>Duyệt</span>
                          </button>
                          <button
                            onClick={() => handleApprove(partner.id, false)}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition-all text-sm font-medium"
                          >
                            <FiX size={14} />
                            <span>Từ chối</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleApprove(partner.id, false)}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 active:scale-[0.98] transition-all text-sm font-medium"
                        >
                          <FiX size={14} />
                          <span>Thu hồi</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-gray-400">
                  <FiShoppingBag className="mx-auto text-2xl mb-2" />
                  <p className="text-sm">Không có đối tác nào</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UsersManagePage;
