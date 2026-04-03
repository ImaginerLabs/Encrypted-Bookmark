import React, { useState } from "react";
import "./SearchBox.css";

/**
 * 搜索框组件
 * 支持实时搜索、清空功能，带搜索图标前缀
 */

interface SearchBoxProps {
  onSearch: (keyword: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    onSearch(value);
  };

  const handleClear = () => {
    setKeyword("");
    onSearch("");
  };

  return (
    <div className="search-box">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        className="search-input"
        placeholder="搜索书签..."
        value={keyword}
        onChange={handleChange}
      />
      {keyword && (
        <button
          className="clear-btn"
          onClick={handleClear}
          aria-label="清空搜索"
        >
          ✕
        </button>
      )}
    </div>
  );
};
