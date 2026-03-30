import React from 'react';

/**
 * 搜索高亮工具函数
 * 支持关键词高亮显示
 */

/**
 * 转义正则表达式特殊字符
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 高亮文本中的关键词
 * @param text 原始文本
 * @param keyword 搜索关键词
 * @returns React 节点（包含 <mark> 标签）
 */
export const highlightText = (text: string, keyword?: string): React.ReactNode => {
  if (!keyword || !keyword.trim()) {
    return text;
  }

  const escapedKeyword = escapeRegex(keyword.trim());
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return <mark key={index}>{part}</mark>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

/**
 * 检查文本是否匹配关键词（不区分大小写）
 */
export const matchesKeyword = (text: string, keyword: string): boolean => {
  if (!keyword || !keyword.trim()) return true;
  return text.toLowerCase().includes(keyword.toLowerCase());
};
