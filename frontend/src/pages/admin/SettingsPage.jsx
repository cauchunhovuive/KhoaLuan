import React, { useState, useEffect } from 'react';
import { FiSave, FiSliders, FiLoader, FiMail, FiMapPin, FiPhone as FiPhoneIcon, FiTruck, FiCpu } from 'react-icons/fi';
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
        <div className="relative">
          <FiLoader className="animate-spin text-3xl text-primary-600" />
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-primary-200 opacity-20" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-ink-secondary">
        <FiSliders className="text-4xl mb-3 text-gray-300" />
        <p className="font-medium">Không thể tải cài đặt</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-ink">Cài đặt</h2>
        <p className="text-ink-tertiary text-sm mt-1">Quản lý cấu hình hệ thống</p>
      </div>

      <div className="p-1.5 bg-primary-50/50 rounded-[2rem] ring-1 ring-primary-100/50">
        <div className="bg-white rounded-[calc(2rem-0.375rem)] shadow-premium-lg p-6 md:p-8">
          <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
            {/* General */}
            <div>
              <h3 className="font-medium text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                <FiSliders className="text-primary-600" />
                <span>Cài đặt chung</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tên website</label>
                  <input type="text" name="siteName" value={settings.siteName} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mô tả</label>
                  <textarea name="siteDescription" value={settings.siteDescription} onChange={handleChange} className="input-field" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số sản phẩm mỗi trang</label>
                  <input type="number" name="itemsPerPage" value={settings.itemsPerPage} onChange={handleChange} className="input-field w-32" min={1} />
                </div>
              </div>
            </div>

            {/* ML Settings */}
            <div>
              <h3 className="font-medium text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                <FiCpu className="text-primary-600" />
                <span>Machine Learning</span>
              </h3>
              <div className="space-y-4 bg-surface-secondary rounded-2xl p-5">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" name="enableRecommendations" checked={settings.enableRecommendations}
                    onChange={handleChange} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                  <div>
                    <span className="text-sm font-medium text-ink group-hover:text-primary-600 transition-colors">Bật gợi ý sản phẩm</span>
                    <p className="text-xs text-ink-tertiary">Đề xuất sản phẩm dựa trên hành vi người dùng</p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" name="enableClustering" checked={settings.enableClustering}
                    onChange={handleChange} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                  <div>
                    <span className="text-sm font-medium text-ink group-hover:text-primary-600 transition-colors">Bật phân cụm khách hàng</span>
                    <p className="text-xs text-ink-tertiary">Phân nhóm khách hàng dựa trên hành vi mua sắm</p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input type="checkbox" name="autoRunClustering" checked={settings.autoRunClustering}
                    onChange={handleChange} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                  <div>
                    <span className="text-sm font-medium text-ink group-hover:text-primary-600 transition-colors">Tự động chạy phân cụm</span>
                    <p className="text-xs text-ink-tertiary">Chạy tự động theo chu kỳ</p>
                  </div>
                </label>
                {settings.autoRunClustering && (
                  <div className="pl-7">
                    <label className="block text-sm font-medium text-ink-secondary mb-1.5">Chu kỳ (ngày)</label>
                    <input type="number" name="clusteringInterval" value={settings.clusteringInterval}
                      onChange={handleChange} className="input-field w-32" min={1} />
                  </div>
                )}
              </div>
            </div>

            {/* Shipping */}
            <div>
              <h3 className="font-medium text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                <FiTruck className="text-primary-600" />
                <span>Vận chuyển</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Miễn phí vận chuyển cho đơn trên (₫)</label>
                  <input type="number" name="freeShippingThreshold" value={settings.freeShippingThreshold}
                    onChange={handleChange} className="input-field w-48" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Phí vận chuyển mặc định (₫)</label>
                  <input type="number" name="shippingFee" value={settings.shippingFee}
                    onChange={handleChange} className="input-field w-48" />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-medium text-ink mb-5 flex items-center space-x-2 pb-3 border-b border-gray-100">
                <FiMail className="text-primary-600" />
                <span>Thông tin liên hệ</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Email</label>
                  <div className="relative group">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input type="email" name="siteContactEmail" value={settings.siteContactEmail}
                      onChange={handleChange} className="input-field pl-10" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Số điện thoại</label>
                  <div className="relative group">
                    <FiPhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input type="text" name="siteContactPhone" value={settings.siteContactPhone}
                      onChange={handleChange} className="input-field pl-10" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1.5">Địa chỉ</label>
                  <div className="relative group">
                    <FiMapPin className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    <input type="text" name="siteContactAddress" value={settings.siteContactAddress}
                      onChange={handleChange} className="input-field pl-10" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center space-x-2 disabled:opacity-60">
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
