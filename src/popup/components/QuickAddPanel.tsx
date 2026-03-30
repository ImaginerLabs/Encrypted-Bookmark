import React, { useState, useEffect } from 'react';
import type { AddBookmarkInput } from '@/types/bookmark';
import type { Folder } from '@/types/data';
import { useCurrentTab } from '../hooks/useCurrentTab';
import { isValidUrl } from '@/utils/helpers';
import './QuickAddPanel.css';

/**
 * 快速添加面板组件
 * 支持快速添加书签并自动填充当前页面信息
 */

interface QuickAddPanelProps {
  visible: boolean;
  folders: Folder[];
  onClose: () => void;
  onSave: (data: AddBookmarkInput) => Promise<void>;
}

export const QuickAddPanel: React.FC<QuickAddPanelProps> = ({ 
  visible, 
  folders,
  onClose, 
  onSave 
}) => {
  const { currentTab } = useCurrentTab();
  
  const [title, setTitle] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  // 自动填充当前页面信息
  useEffect(() => {
    if (visible && currentTab) {
      setTitle(currentTab.title);
      setUrl(currentTab.url);
    }
  }, [visible, currentTab]);

  // 重置表单
  const resetForm = () => {
    setTitle('');
    setUrl('');
    setFolderId('');
    setTags('');
    setNote('');
    setErrors({});
  };

  // 表单验证
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '标题不能为空';
    }

    if (!url.trim()) {
      newErrors.url = 'URL 不能为空';
    } else if (!isValidUrl(url)) {
      newErrors.url = '请输入有效的 URL (http:// 或 https://)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 保存书签
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      // 处理标签（逗号分隔）
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await onSave({
        title,
        url,
        folderId: folderId || undefined,
        tags: tagArray,
        note: note || undefined
      });

      // 成功提示
      showToast('书签已保存');

      // 重置并关闭
      resetForm();
      setTimeout(onClose, 1500);
    } catch (error) {
      console.error('保存书签失败:', error);
      setErrors({ general: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  // Toast 提示
  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  // 关闭面板
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="quick-add-panel">
      <div className="overlay" onClick={handleClose} />

      <div className="panel-content">
        <h3>添加书签</h3>

        {/* 标题 */}
        <div className="form-group">
          <label htmlFor="title">标题 *</label>
          <input
            id="title"
            type="text"
            placeholder="请输入书签标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>

        {/* URL */}
        <div className="form-group">
          <label htmlFor="url">URL *</label>
          <input
            id="url"
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {errors.url && <span className="error-text">{errors.url}</span>}
        </div>

        {/* 文件夹 */}
        <div className="form-group">
          <label htmlFor="folder">文件夹</label>
          <select
            id="folder"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          >
            <option value="">未分类</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        {/* 标签 */}
        <div className="form-group">
          <label htmlFor="tags">标签（逗号分隔）</label>
          <input
            id="tags"
            type="text"
            placeholder="例如: 工作, 技术, 学习"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        {/* 备注 */}
        <div className="form-group">
          <label htmlFor="note">备注</label>
          <textarea
            id="note"
            placeholder="可选的备注信息"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>

        {/* 通用错误 */}
        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        {/* 操作按钮 */}
        <div className="actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={handleClose}
            disabled={saving}
          >
            取消
          </button>
          <button
            type="button"
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};
