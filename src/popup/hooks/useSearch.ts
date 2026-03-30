import { useState, useMemo } from 'react';
import { debounce } from '@/utils/helpers';

/**
 * 搜索功能 Hook
 * 提供防抖搜索能力
 */
export const useSearch = (delay = 300) => {
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 防抖处理
  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => {
      setSearchKeyword(value);
    }, delay),
    [delay]
  );

  const handleSearch = (value: string) => {
    debouncedSetSearch(value);
  };

  const clearSearch = () => {
    setSearchKeyword('');
  };

  return {
    searchKeyword,
    handleSearch,
    clearSearch
  };
};
