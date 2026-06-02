import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiTrash2, FiClock, FiCalendar, FiZap, FiPackage, FiSearch, FiX, FiChevronUp, FiDollarSign, FiLayers } from 'react-icons/fi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const FlashSaleModal = ({ sale, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: sale?.title || '',
    description: sale?.description || '',
    bannerUrl: sale?.bannerUrl || '',
    startTime: sale?.startTime ? new Date(sale.startTime).toISOString().slice(0, 16) : '',
    endTime: sale?.endTime ? new Date(sale.endTime).toISOString().slice(0, 16) : '',
    isActive: sale?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.startTime || !form.endTime) {
      toast.error('Vui lòng nhập đầy đủ thông tin'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
      };
      if (sale) {
        await api.put(`/flash-sales/${sale.id}`, payload);
        toast.success('Đã cập nhật flash sale');
      } else {
        await api.post('/flash-sales', payload);
        toast.success('Đã tạo flash sale');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium-xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{sale ? 'Sửa Flash Sale' : 'Tạo Flash Sale'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-ink transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tiêu đề *</label>
            <input name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Flash Sale Cuối Tuần" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Mô tả</label>
            <textarea name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">URL Banner</label>
            <input name="bannerUrl" value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} className="input-field" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Bắt đầu *</label>
              <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">Kết thúc *</label>
              <input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" />
            <label className="text-sm text-ink-secondary">Kích hoạt</label>
          </div>
          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">{saving ? 'Đang lưu...' : sale ? 'Cập nhật' : 'Tạo Flash Sale'}</button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-ink-secondary hover:bg-surface-secondary rounded-xl transition-colors">Huỷ</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   ADD PRODUCT MODAL
   ═══════════════════════════════════════════ */
const AddProductModal = ({ flashSaleId, onClose, onSaved }) => {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [salePrice, setSalePrice] = useState('');
  const [maxQuantity, setMaxQuantity] = useState('');
  const [saving, setSaving] = useState(false);

  const searchProducts = useCallback(async (q) => {
    if (!q.trim()) { setProducts([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get(`/products?search=${encodeURIComponent(q)}&limit=15&inStock=true`);
      setProducts(data.data.products || []);
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(search), 300);
    return () => clearTimeout(timer);
  }, [search, searchProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !salePrice) {
      toast.error('Vui lòng chọn sản phẩm và nhập giá flash sale');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/flash-sales/${flashSaleId}/products`, {
        productId: selectedProduct.id,
        salePrice: parseFloat(salePrice),
        maxQuantity: parseInt(maxQuantity) || 0,
      });
      toast.success('Đã thêm sản phẩm vào flash sale');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi thêm sản phẩm');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium-xl border border-gray-100 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-base font-semibold text-ink">Thêm sản phẩm vào Flash Sale</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-ink transition-colors text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Tìm sản phẩm</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
                placeholder="Gõ tên sản phẩm..."
              />
              {search && (
                <button type="button" onClick={() => { setSearch(''); setSelectedProduct(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ink">
                  <FiX size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Search results */}
          {search && (
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
              {searching ? (
                <div className="p-4 text-center text-sm text-ink-tertiary">Đang tìm...</div>
              ) : products.length === 0 ? (
                <div className="p-4 text-center text-sm text-ink-tertiary">Không tìm thấy sản phẩm</div>
              ) : (
                products.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        if (!salePrice) setSalePrice(String(p.price));
                      }}
                      className={`w-full flex items-center space-x-3 p-3 text-left transition-colors ${
                        isSelected ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <img
                        src={p.images?.[0]}
                        alt={p.name}
                        className={`w-10 h-10 rounded-lg object-cover flex-shrink-0 ${isSelected ? 'ring-2 ring-primary-300' : ''}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                        <p className="text-xs text-ink-tertiary">
                          {p.price.toLocaleString('vi-VN')}₫
                          {p.discountPrice && ` → ${p.discountPrice.toLocaleString('vi-VN')}₫`}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <FiPlus className="text-white text-[10px] rotate-45" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Selected product */}
          {selectedProduct && (
            <div className="p-3 bg-surface-secondary rounded-xl border border-gray-100">
              <p className="text-xs text-ink-tertiary uppercase tracking-wider font-semibold mb-2">Sản phẩm đã chọn</p>
              <div className="flex items-center space-x-3">
                <img src={selectedProduct.images?.[0]} alt={selectedProduct.name} className="w-12 h-12 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-medium text-ink">{selectedProduct.name}</p>
                  <p className="text-xs text-ink-tertiary">Giá gốc: {selectedProduct.price.toLocaleString('vi-VN')}₫</p>
                </div>
              </div>
            </div>
          )}

          {/* Price & quantity */}
          {selectedProduct && (
            <>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Giá Flash Sale (₫) *</label>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="input-field pl-10"
                    placeholder="149000"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">
                  Số lượng tối đa
                  <span className="text-ink-tertiary font-normal ml-1">(0 = không giới hạn)</span>
                </label>
                <div className="relative">
                  <FiLayers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={maxQuantity}
                    onChange={(e) => setMaxQuantity(e.target.value)}
                    className="input-field pl-10"
                    placeholder="100"
                    min="0"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button type="submit" disabled={saving || !selectedProduct} className="btn-primary flex-1 py-2.5">
              {saving ? 'Đang thêm...' : 'Thêm vào Flash Sale'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-ink-secondary hover:bg-surface-secondary rounded-xl transition-colors">Huỷ</button>
          </div>
        </form>
      </div>
    </div>
  );
};


/* ═══════════════════════════════════════════
   FLASH SALE MANAGEMENT PAGE
   ═══════════════════════════════════════════ */

const FlashSaleManagementPage = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);       // flashSale ID đang mở rộng
  const [expandedData, setExpandedData] = useState(null); // dữ liệu chi tiết của flash sale đang mở
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showAddModal, setShowAddModal] = useState(null);  // flashSale ID để thêm sản phẩm

  const fetchSales = () => {
    setLoading(true);
    api.get('/flash-sales/admin/all')
      .then(({ data }) => setSales(data.data.flashSales))
      .catch(() => toast.error('Không thể tải flash sale'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSales(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá flash sale này?')) return;
    try { await api.delete(`/flash-sales/${id}`); toast.success('Đã xoá'); fetchSales(); }
    catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const toggleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
      setExpandedData(null);
      return;
    }
    setExpanded(id);
    setExpandedData(null);
    setLoadingProducts(true);
    try {
      const { data } = await api.get(`/flash-sales/${id}`);
      setExpandedData(data.data);
    } catch (err) {
      toast.error('Không thể tải sản phẩm flash sale');
      setExpanded(null);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleRemoveProduct = async (flashSaleId, productId) => {
    if (!window.confirm('Xoá sản phẩm này khỏi flash sale?')) return;
    try {
      await api.delete(`/flash-sales/${flashSaleId}/products/${productId}`);
      toast.success('Đã xoá sản phẩm');
      // Reload expanded data
      const { data } = await api.get(`/flash-sales/${flashSaleId}`);
      setExpandedData(data.data);
      fetchSales(); // refresh count
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    }
  };

  const handleProductAdded = () => {
    setShowAddModal(null);
    // Reload expanded flash sale detail
    if (expanded) {
      api.get(`/flash-sales/${expanded}`).then(({ data }) => setExpandedData(data.data));
      fetchSales();
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Quản lý Flash Sale</h2>
          <p className="text-ink-tertiary text-sm mt-1">Tạo và quản lý các chương trình flash sale</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary inline-flex items-center space-x-2">
          <FiPlus /><span>Tạo Flash Sale</span>
        </button>
      </div>

      {loading ? <LoadingSpinner size="skeleton" /> : (
        <div className="space-y-4">
          {sales.map((s) => {
            const isActive = s.isActive && new Date(s.startTime) <= new Date() && new Date(s.endTime) >= new Date();
            const isUpcoming = s.isActive && new Date(s.startTime) > new Date();
            const isExpired = new Date(s.endTime) < new Date();
            const statusColor = !s.isActive ? 'bg-gray-100 text-gray-600' : isExpired ? 'bg-red-100 text-red-700' : isUpcoming ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
            const statusText = !s.isActive ? 'Tạm dừng' : isExpired ? 'Đã kết thúc' : isUpcoming ? 'Sắp diễn ra' : 'Đang diễn ra';
            const isExpanded = expanded === s.id;
            const now = new Date();

            return (
              <div key={s.id} className="card overflow-hidden transition-all duration-300">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <FiZap className="text-amber-600 text-xl" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-ink">{s.title}</h3>
                        {s.description && <p className="text-sm text-ink-tertiary mt-0.5">{s.description}</p>}
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          <span className={`badge text-xs ${statusColor}`}>{statusText}</span>
                          <span className="text-xs text-ink-tertiary flex items-center">
                            <FiCalendar className="mr-1" size={12} />
                            {new Date(s.startTime).toLocaleDateString('vi-VN')} - {new Date(s.endTime).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="text-xs text-ink-tertiary">{s._count?.products || 0} sản phẩm</span>
                        </div>
                        {isActive && (
                          <div className="mt-2 flex items-center space-x-1 text-xs text-amber-600">
                            <FiClock size={12} />
                            <span>Còn {Math.floor((new Date(s.endTime) - now) / 3600000)} giờ</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleExpand(s.id)}
                        className={`p-2 rounded-xl transition-colors ${
                          isExpanded ? 'bg-primary-50 text-primary-600' : 'text-ink-tertiary hover:bg-surface-secondary'
                        }`}
                        title={isExpanded ? 'Thu gọn' : 'Quản lý sản phẩm'}
                      >
                        {isExpanded ? <FiChevronUp size={16} /> : <FiPackage size={16} />}
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><FiTrash2 size={14} /></button>
                    </div>
                  </div>
                </div>

                {/* ── Expanded: Product list ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 animate-fade-in">
                    {loadingProducts ? (
                      <div className="p-8 flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                      </div>
                    ) : (
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm font-semibold text-ink flex items-center space-x-2">
                            <FiPackage className="text-primary-500" />
                            <span>Danh sách sản phẩm ({expandedData?.products?.length || 0})</span>
                          </p>
                          <button
                            onClick={() => setShowAddModal(s.id)}
                            className="btn-secondary text-xs inline-flex items-center space-x-1.5 py-2 px-3"
                          >
                            <FiPlus size={12} />
                            <span>Thêm sản phẩm</span>
                          </button>
                        </div>

                        {expandedData?.products?.length === 0 ? (
                          <div className="text-center py-10 text-ink-tertiary bg-surface-secondary rounded-xl">
                            <FiPackage className="text-2xl mx-auto mb-2" />
                            <p className="text-sm">Chưa có sản phẩm nào</p>
                            <p className="text-xs mt-1">Nhấn "Thêm sản phẩm" để bắt đầu</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {expandedData?.products?.map((item) => {
                              const product = item.product || {};
                              const originalPrice = product.discountPrice || product.price || 0;
                              const flashPrice = item.salePrice || 0;
                              const discountPct = originalPrice > 0 ? Math.round((1 - flashPrice / originalPrice) * 100) : 0;

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center space-x-3 p-3 bg-surface-secondary rounded-xl border border-gray-100 group hover:border-gray-200 transition-all"
                                >
                                  <img
                                    src={product.images?.[0]}
                                    alt={product.name}
                                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-ink truncate">{product.name || 'Đã xoá'}</p>
                                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                                      <span className="text-xs text-red-600 font-semibold">
                                        {flashPrice.toLocaleString('vi-VN')}₫
                                      </span>
                                      <span className="text-xs text-ink-tertiary line-through">
                                        {originalPrice.toLocaleString('vi-VN')}₫
                                      </span>
                                      {discountPct > 0 && (
                                        <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold">
                                          -{discountPct}%
                                        </span>
                                      )}
                                      <span className="text-xs text-ink-tertiary">
                                        Đã bán: {item.soldCount || 0}
                                      </span>
                                      {item.maxQuantity > 0 && (
                                        <span className="text-xs text-ink-tertiary">
                                          / {item.maxQuantity}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveProduct(s.id, product.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                    title="Xoá khỏi flash sale"
                                  >
                                    <FiTrash2 size={14} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {sales.length === 0 && (
            <div className="text-center py-16 text-ink-tertiary">
              <FiZap className="text-3xl mx-auto mb-3" />
              <p>Chưa có flash sale nào</p>
            </div>
          )}
        </div>
      )}

      {showModal && <FlashSaleModal sale={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={() => { setShowModal(false); setEditing(null); fetchSales(); }} />}
      {showAddModal && <AddProductModal flashSaleId={showAddModal} onClose={() => setShowAddModal(null)} onSaved={handleProductAdded} />}
    </div>
  );
};

export default FlashSaleManagementPage;
