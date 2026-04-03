import React from "react";
import { List } from "react-window";
import type { Bookmark } from "@/types/data";
import { BookmarkItem } from "./BookmarkItem";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import "./BookmarkList.css";

/**
 * 书签列表组件
 * 使用虚拟滚动支持大量书签
 */

interface BookmarkListProps {
  bookmarks: Bookmark[];
  loading: boolean;
  searchKeyword?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  loading,
  searchKeyword,
  onEdit,
  onDelete,
}) => {
  // 加载状态
  if (loading) {
    return <LoadingState />;
  }

  // 空状态
  if (bookmarks.length === 0) {
    return <EmptyState type={searchKeyword ? "no-results" : "no-bookmarks"} />;
  }

  // 虚拟滚动行渲染组件
  const RowComponent = ({
    index,
    style,
    ariaAttributes,
  }: {
    index: number;
    style: React.CSSProperties;
    ariaAttributes: {
      "aria-posinset": number;
      "aria-setsize": number;
      role: "listitem";
    };
  }) => (
    <div style={style} {...ariaAttributes}>
      <BookmarkItem
        bookmark={bookmarks[index]}
        searchKeyword={searchKeyword}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );

  return (
    <div className="bookmark-list-container">
      <List
        defaultHeight={500}
        rowCount={bookmarks.length}
        rowHeight={76}
        rowComponent={RowComponent}
        rowProps={{}}
      >
        {null}
      </List>
    </div>
  );
};
