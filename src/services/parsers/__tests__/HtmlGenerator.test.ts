import { describe, it, expect } from "vitest";
import { HtmlGenerator } from "@/services/parsers/HtmlGenerator";
import type { Bookmark, Folder } from "@/types/data";

const mockBookmarks: Bookmark[] = [
  {
    id: "b1",
    title: "Example",
    url: "https://example.com",
    folderId: "f1",
    tags: [],
    createTime: 1700000000000,
    updateTime: 1700000000000,
    visitCount: 0,
  },
  {
    id: "b2",
    title: "GitHub",
    url: "https://github.com",
    folderId: "uncategorized",
    tags: [],
    createTime: 1700000001000,
    updateTime: 1700000001000,
    visitCount: 0,
  },
];

const mockFolders: Folder[] = [
  {
    id: "f1",
    name: "Test Folder",
    sort: 0,
    createTime: 1700000000000,
  },
];

describe("HtmlGenerator", () => {
  describe("generate", () => {
    it("应生成有效的 Netscape Bookmark HTML", () => {
      const html = HtmlGenerator.generate(mockBookmarks, mockFolders);

      expect(html).toContain("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
      expect(html).toContain("<TITLE>Bookmarks</TITLE>");
      expect(html).toContain("<DL><p>");
    });

    it("应包含文件夹结构", () => {
      const html = HtmlGenerator.generate(mockBookmarks, mockFolders);

      expect(html).toContain("<H3");
      expect(html).toContain("Test Folder");
    });

    it("应包含书签链接", () => {
      const html = HtmlGenerator.generate(mockBookmarks, mockFolders);

      expect(html).toContain('HREF="https://example.com"');
      expect(html).toContain("Example");
      expect(html).toContain('HREF="https://github.com"');
      expect(html).toContain("GitHub");
    });

    it("应包含 ADD_DATE 属性", () => {
      const html = HtmlGenerator.generate(mockBookmarks, mockFolders);

      expect(html).toContain('ADD_DATE="1700000000"');
    });

    it("空数据应生成有效的空 HTML 结构", () => {
      const html = HtmlGenerator.generate([], []);

      expect(html).toContain("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
      expect(html).toContain("<DL><p>");
      expect(html).toContain("</DL><p>");
    });

    it("应正确转义 HTML 特殊字符", () => {
      const bookmarks: Bookmark[] = [
        {
          id: "b3",
          title: "Test & <Demo>",
          url: "https://example.com?a=1&b=2",
          folderId: "uncategorized",
          tags: [],
          createTime: Date.now(),
          updateTime: Date.now(),
          visitCount: 0,
        },
      ];
      const html = HtmlGenerator.generate(bookmarks, []);

      expect(html).toContain("&amp;");
      expect(html).toContain("&lt;");
    });
  });

  describe("unescapeHtml", () => {
    it("应反转义 HTML 实体", () => {
      expect(HtmlGenerator.unescapeHtml("&amp;")).toBe("&");
      expect(HtmlGenerator.unescapeHtml("&lt;")).toBe("<");
      expect(HtmlGenerator.unescapeHtml("&gt;")).toBe(">");
      expect(HtmlGenerator.unescapeHtml("&quot;")).toBe('"');
      expect(HtmlGenerator.unescapeHtml("&#039;")).toBe("'");
    });

    it("普通文本应保持不变", () => {
      expect(HtmlGenerator.unescapeHtml("hello world")).toBe("hello world");
    });
  });
});
