import React, { useEffect, useState } from 'react';
import { FiSearch, FiUser } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const UsersManagePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    const params = { limit: 50 };
    if (search) params.search = search;
    api.get('/users', { params })
      .then(({ data }) => setUsers(data.data.users))
      .catch(() => toast.error('Không thể tải người dùng'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Quản lý người dùng</h2>

      <div className="card p-4 mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Tìm kiếm người dùng..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            className="input-field pl-10" />
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div key={user.id} className="card p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <FiUser className="text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{user.phone || 'Chưa có SĐT'}</span>
                <span className={`badge ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                  {user.role === 'ADMIN' ? 'Admin' : 'Khách hàng'}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-3">
                Đã mua: {user.orderCount} đơn - Tổng: {user.totalSpent?.toLocaleString('vi-VN')}₫
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UsersManagePage;
