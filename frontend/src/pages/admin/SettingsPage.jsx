import React, { useState, useEffect } from 'react';
import { FiSave, FiSliders, FiLoader, FiMail } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { fetchSettings } from '../../store/settingsSlice';

const SettingsPage = () => {
  const dispatch = useDispatch();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/settings');
      setSettings(data.data);
    } catch (error) {
      toast.error('Không thể tải cài đặt');
    } finally {
      setLoading(false);
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
      const { data } = await api.put('/settings', settings);
      setSettings(data.data);
      dispatch(fetchSettings());
      toast.success('Đã lưu cài đặt thành công');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <FiLoader className="animate-spin text-3xl text-primary-600" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-20 text-gray-500">Không thể tải cài đặt</div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Cài đặt</h2>

      <div className="card p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          {/* General */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <FiSliders className="text-primary-600" />
              <span>Cài đặt chung</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên website</label>
                <input type="text" name="siteName" value={settings.siteName} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea name="siteDescription" value={settings.siteDescription} onChange={handleChange} className="input-field" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số sản phẩm mỗi trang</label>
                <input type="number" name="itemsPerPage" value={settings.itemsPerPage} onChange={handleChange} className="input-field w-32" min={1} />
              </div>
            </div>
          </div>

          {/* ML Settings */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Machine Learning</h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input type="checkbox" name="enableRecommendations" checked={settings.enableRecommendations}
                  onChange={handleChange} className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-gray-700">Bật gợi ý sản phẩm</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" name="enableClustering" checked={settings.enableClustering}
                  onChange={handleChange} className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-gray-700">Bật phân cụm khách hàng</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" name="autoRunClustering" checked={settings.autoRunClustering}
                  onChange={handleChange} className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-gray-700">Tự động chạy phân cụm</span>
              </label>
              {settings.autoRunClustering && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chu kỳ (ngày)</label>
                  <input type="number" name="clusteringInterval" value={settings.clusteringInterval}
                    onChange={handleChange} className="input-field w-32" min={1} />
                </div>
              )}
            </div>
          </div>

          {/* Shipping */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Vận chuyển</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miễn phí vận chuyển cho đơn trên (₫)</label>
                <input type="number" name="freeShippingThreshold" value={settings.freeShippingThreshold}
                  onChange={handleChange} className="input-field w-48" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phí vận chuyển mặc định (₫)</label>
                <input type="number" name="shippingFee" value={settings.shippingFee}
                  onChange={handleChange} className="input-field w-48" />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <FiMail className="text-primary-600" />
              <span>Thông tin liên hệ</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="siteContactEmail" value={settings.siteContactEmail}
                  onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input type="text" name="siteContactPhone" value={settings.siteContactPhone}
                  onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input type="text" name="siteContactAddress" value={settings.siteContactAddress}
                  onChange={handleChange} className="input-field" />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2 disabled:opacity-50">
              {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
              <span>{saving ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
