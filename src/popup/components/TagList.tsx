import React from "react";
import type { Tag } from "@/types/data";
import { TagItem } from "./TagItem";
import "./TagList.css";

/**
 * 标签列表组件
 * 显示侧边栏标签视图
 */

interface TagListProps {
  /** 标签列表（含使用统计） */
  tags: Array<Tag & { usageCount: number }>;
  /** 当前选中的标签 ID，null 表示全部 */
  selectedTagId: string | null;
  /** 选择标签回调 */
  onSelect: (tagId: string | null) => void;
  /** 删除标签回调 */
  onDelete: (id: string) => void;
}

export const TagList: React.FC<TagListProps> = ({
  tags,
  selectedTagId,
  onSelect,
  onDelete,
}) => {
  return (
    <div className="tag-list">
      {/* 全部书签入口 */}
      <TagItem
        tag={null}
        isSelected={selectedTagId === null}
        onClick={() => onSelect(null)}
      />

      {/* 标签列表 */}
      {tags.map((tag) => (
        <TagItem
          key={tag.id}
          tag={tag}
          isSelected={selectedTagId === tag.id}
          onClick={() => onSelect(tag.id)}
          onDelete={onDelete}
        />
      ))}

      {/* 无标签提示 */}
      {tags.length === 0 && (
        <div className="tag-list-empty">
          <span className="tag-list-empty-text">暂无标签</span>
        </div>
      )}
    </div>
  );
};
