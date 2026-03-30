import React, { useState, useCallback } from 'react';
import type { ExportFormat, ExportScope } from '@/types/import-export';
import { ImportExportService } from '@/services';
import { ChromeStorageAdapter } from '@/storage';
import './SettingsPanel.css';

interface ExportSectionProps {
  onMessage: (message: string, type: 'success' | 'error') => void;
  masterKey: string; // 主密钥，用于加密数据
}

/**
 * 导出区域组件
 */
const ExportSection: React.FC<ExportSectionProps> = ({ onMessage, masterKey }) => {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json-encrypted');
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [showPlainWarning, setShowPlainWarning] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');

  /**
   * 处理导出
   */
  const handleExport = useCallback(async () => {
    // 明文导出需要二次确认
    if (exportFormat === 'json-plain') {
      setShowPlainWarning(true);
      return;
    }

    await executeExport();
  }, [exportFormat, exportScope, encryptionKey]);

  /**
   * 确认明文导出
   */
  const confirmPlainExport = useCallback(async () => {
    setShowPlainWarning(false);
    await executeExport();
  }, [exportScope]);

  /**
   * 取消明文导出
   */
  const cancelPlainExport = useCallback(() => {
    setShowPlainWarning(false);
  }, []);

  /**
   * 执行导出
   */
  const executeExport = async () => {
    setExporting(true);

    try {
      // 1. 实例化 ImportExportService
      const storageAdapter = new ChromeStorageAdapter();
      const exportService = new ImportExportService(storageAdapter);
      exportService.setMasterKey(masterKey);

      // 2. 调用导出服务
      const result = await exportService.exportBookmarks({
        format: exportFormat,
        scope: exportScope,
        encryptionKey: encryptionKey || undefined
      });

      if (!result.success) {
        throw new Error(result.error || '导出失败');
      }

      // 3. 触发文件下载
      if (result.fileContent && result.fileName && result.mimeType) {
        downloadFile(result.fileContent, result.fileName, result.mimeType);
        onMessage(`✅ 导出成功：${result.fileName}`, 'success');
      } else {
        throw new Error('导出数据不完整');
      }
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : '导出失败',
        'error'
      );
    } finally {
      setExporting(false);
    }
  };

  /**
   * 下载文件
   */
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="settings-section">
      <h3>📤 导出书签</h3>

      {/* 格式选择 */}
      <div className="form-group">
        <label>导出格式</label>
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
          disabled={exporting}
        >
          <option value="json-encrypted">JSON 加密备份（推荐）</option>
          <option value="json-plain">JSON 明文导出</option>
          <option value="html">HTML 标准格式</option>
        </select>
        <small className="form-hint">
          {exportFormat === 'json-encrypted' && '加密保护，可设置独立密钥，最安全'}
          {exportFormat === 'json-plain' && '⚠️ 明文保存，数据未加密，请妥善保管'}
          {exportFormat === 'html' && '可导入到 Chrome、Firefox、Edge 等浏览器'}
        </small>
      </div>

      {/* 范围选择 */}
      <div className="form-group">
        <label>导出内容</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="exportScope"
              value="all"
              checked={exportScope === 'all'}
              onChange={(e) => setExportScope(e.target.value as ExportScope)}
              disabled={exporting}
            />
            <span>完整数据（书签 + 文件夹 + 标签）</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="exportScope"
              value="bookmarks-only"
              checked={exportScope === 'bookmarks-only'}
              onChange={(e) => setExportScope(e.target.value as ExportScope)}
              disabled={exporting}
            />
            <span>仅书签列表</span>
          </label>
        </div>
      </div>

      {/* 加密密钥（仅加密导出） */}
      {exportFormat === 'json-encrypted' && (
        <div className="form-group">
          <label>加密密钥（可选）</label>
          <input
            type="password"
            value={encryptionKey}
            onChange={(e) => setEncryptionKey(e.target.value)}
            placeholder="留空将使用当前登录密码"
            disabled={exporting}
          />
          <small className="form-hint">
            可设置独立密钥，用于分享给他人或跨设备迁移
          </small>
        </div>
      )}

      {/* 导出按钮 */}
      <div className="form-group">
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? '导出中...' : '开始导出'}
        </button>
      </div>

      {/* 导出说明 */}
      <div className="info-box">
        <h4>📋 导出说明</h4>
        <ul>
          <li>
            <strong>JSON 加密备份</strong>：推荐用于日常备份，可设置独立密钥
          </li>
          <li>
            <strong>JSON 明文导出</strong>：数据未加密，适合分析或迁移到其他工具
          </li>
          <li>
            <strong>HTML 标准格式</strong>：可导入到任何支持 Netscape 书签格式的浏览器
          </li>
          <li>导出的文件将自动下载到浏览器默认下载目录</li>
        </ul>
      </div>

      {/* 明文导出警告对话框 */}
      {showPlainWarning && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>⚠️ 明文导出风险提示</h4>
            <p>
              您选择了<strong>明文导出</strong>，导出的文件将<strong>不包含任何加密保护</strong>。
            </p>
            <ul style={{ textAlign: 'left', marginTop: '10px' }}>
              <li>任何人获取该文件都可以直接查看您的书签</li>
              <li>请妥善保管导出文件，避免泄露</li>
              <li>建议优先使用「JSON 加密备份」格式</li>
            </ul>
            <p style={{ marginTop: '15px' }}>确定要继续明文导出吗？</p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={confirmPlainExport}>
                确认导出
              </button>
              <button className="btn btn-secondary" onClick={cancelPlainExport}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportSection;
