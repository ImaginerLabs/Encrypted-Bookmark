import React, { useState, useCallback, useRef } from 'react';
import type { ImportFormat, ImportStrategy } from '@/types/import-export';
import { ImportExportService } from '@/services';
import { ChromeStorageAdapter } from '@/storage';
import './SettingsPanel.css';

interface ImportSectionProps {
  onMessage: (message: string, type: 'success' | 'error') => void;
  onImportSuccess?: () => void;
  masterKey: string; // 主密钥，用于解密数据
}

/**
 * 导入区域组件
 */
const ImportSection: React.FC<ImportSectionProps> = ({ onMessage, onImportSuccess, masterKey }) => {
  const [importing, setImporting] = useState(false);
  const [importFormat, setImportFormat] = useState<ImportFormat>('html');
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>('merge');
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [decryptionKey, setDecryptionKey] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // 前端校验文件大小（最大 50MB）
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_FILE_SIZE) {
        onMessage(`文件过大，最大支持 50MB（当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB）`, 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // 如果选择覆盖模式，显示二次确认
      if (importStrategy === 'overwrite') {
        pendingFileRef.current = file;
        setShowOverwriteConfirm(true);
        return;
      }

      // 直接执行导入
      await executeImport(file);
    },
    [importStrategy, onMessage]
  );

  /**
   * 确认覆盖导入
   */
  const confirmOverwrite = useCallback(async () => {
    setShowOverwriteConfirm(false);
    if (pendingFileRef.current) {
      await executeImport(pendingFileRef.current);
      pendingFileRef.current = null;
    }
  }, []);

  /**
   * 取消覆盖导入
   */
  const cancelOverwrite = useCallback(() => {
    setShowOverwriteConfirm(false);
    pendingFileRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * 执行导入
   */
  const executeImport = async (file: File) => {
    setImporting(true);
    setProgress(0);
    setProgressStage('读取文件...');

    try {
      // 1. 读取文件内容
      const fileContent = await readFileContent(file);
      setProgress(10);
      setProgressStage('解析文件格式...');

      // 2. 验证格式
      if (!validateFileFormat(file, importFormat)) {
        throw new Error(`文件格式不匹配，期望 ${getFormatExtension(importFormat)} 格式`);
      }

      setProgress(20);
      setProgressStage('验证数据...');

      // 3. 实例化 ImportExportService
      const storageAdapter = new ChromeStorageAdapter();
      const importService = new ImportExportService(storageAdapter);
      importService.setMasterKey(masterKey);

      // 4. 设置进度回调
      importService.setProgressCallback((progress) => {
        setProgress(Math.round(20 + progress.percentage * 0.7)); // 20-90%
        setProgressStage(progress.stage);
      });

      // 5. 调用导入服务
      const result = await importService.importBookmarks({
        format: importFormat,
        fileContent: fileContent,
        strategy: importStrategy,
        decryptionKey: decryptionKey || undefined
      });

      setProgress(100);
      setProgressStage('导入完成');

      if (!result.success) {
        throw new Error(result.error || '导入失败');
      }

      // 显示详细的导入结果
      const successMessage = [
        `✅ 导入成功！`,
        `书签: ${result.importedBookmarks} 个`,
        result.importedFolders ? `文件夹: ${result.importedFolders} 个` : '',
        result.importedTags ? `标签: ${result.importedTags} 个` : '',
        result.skippedBookmarks ? `跳过: ${result.skippedBookmarks} 个（重复）` : '',
        result.deletedBookmarks ? `覆盖: ${result.deletedBookmarks} 个旧书签` : ''
      ].filter(Boolean).join('，');

      onMessage(successMessage, 'success');

      // 显示警告信息（如果有）
      if (result.warnings && result.warnings.length > 0) {
        console.warn('导入警告:', result.warnings);
      }

      onImportSuccess?.();

      // 清空文件选择
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : '导入失败',
        'error'
      );
    } finally {
      setImporting(false);
      setTimeout(() => {
        setProgress(0);
        setProgressStage('');
      }, 2000);
    }
  };

  /**
   * 读取文件内容
   */
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  };

  /**
   * 验证文件格式
   */
  const validateFileFormat = (file: File, format: ImportFormat): boolean => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (format) {
      case 'html':
        return extension === 'html' || extension === 'htm';
      case 'json':
        return extension === 'json';
      case 'pbm':
        return extension === 'pbm';
      default:
        return false;
    }
  };

  /**
   * 获取格式扩展名
   */
  const getFormatExtension = (format: ImportFormat): string => {
    switch (format) {
      case 'html':
        return '.html';
      case 'json':
        return '.json';
      case 'pbm':
        return '.pbm';
    }
  };

  /**
   * 触发文件选择
   */
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="settings-section">
      <h3>📥 导入书签</h3>

      {/* 格式选择 */}
      <div className="form-group">
        <label>导入格式</label>
        <select
          value={importFormat}
          onChange={(e) => setImportFormat(e.target.value as ImportFormat)}
          disabled={importing}
        >
          <option value="html">Chrome HTML 书签 (.html)</option>
          <option value="json">JSON 格式 (.json)</option>
          <option value="pbm">插件备份文件 (.pbm)</option>
        </select>
        <small className="form-hint">
          {importFormat === 'html' && '支持 Chrome、Firefox、Edge 导出的标准 HTML 书签'}
          {importFormat === 'json' && '通用 JSON 格式，包含书签、文件夹、标签'}
          {importFormat === 'pbm' && '本插件导出的加密备份文件'}
        </small>
      </div>

      {/* 策略选择 */}
      <div className="form-group">
        <label>导入策略</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="importStrategy"
              value="merge"
              checked={importStrategy === 'merge'}
              onChange={(e) => setImportStrategy(e.target.value as ImportStrategy)}
              disabled={importing}
            />
            <span>合并模式（推荐）</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="importStrategy"
              value="overwrite"
              checked={importStrategy === 'overwrite'}
              onChange={(e) => setImportStrategy(e.target.value as ImportStrategy)}
              disabled={importing}
            />
            <span>覆盖模式（清空现有数据）</span>
          </label>
        </div>
        <small className="form-hint">
          {importStrategy === 'merge' && '智能去重，相同 URL 的书签将被跳过'}
          {importStrategy === 'overwrite' && '⚠️ 警告：将删除所有现有书签，导入新数据'}
        </small>
      </div>

      {/* 解密密钥（仅 PBM 格式） */}
      {importFormat === 'pbm' && (
        <div className="form-group">
          <label>解密密钥（可选）</label>
          <input
            type="password"
            value={decryptionKey}
            onChange={(e) => setDecryptionKey(e.target.value)}
            placeholder="如果是加密备份文件，请输入密钥"
            disabled={importing}
          />
          <small className="form-hint">
            如果备份文件未加密，留空即可
          </small>
        </div>
      )}

      {/* 文件选择 */}
      <div className="form-group">
        <input
          ref={fileInputRef}
          type="file"
          accept={getFormatExtension(importFormat)}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={importing}
        />
        <button
          className="btn btn-primary"
          onClick={triggerFileSelect}
          disabled={importing}
        >
          {importing ? '导入中...' : '选择文件导入'}
        </button>
      </div>

      {/* 进度条 */}
      {importing && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <small className="progress-text">
            {progressStage} ({progress}%)
          </small>
        </div>
      )}

      {/* 覆盖确认对话框 */}
      {showOverwriteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>⚠️ 确认覆盖导入</h4>
            <p>
              覆盖模式将<strong>删除所有现有书签</strong>，并导入新数据。
              <br />
              此操作<strong>不可撤销</strong>，建议先导出备份。
            </p>
            <p>确定要继续吗？</p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={confirmOverwrite}>
                确认覆盖
              </button>
              <button className="btn btn-secondary" onClick={cancelOverwrite}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportSection;
