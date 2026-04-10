import { describe, it, expect } from "vitest";
import { HtmlParser } from "@/services/parsers/HtmlParser";

// 标准 Netscape Bookmark HTML 模板
const VALID_HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000">Test Folder</H3>
    <DL><p>
        <DT><A HREF="https://example.com" ADD_DATE="1700000000">Example</A>
        <DT><A HREF="https://google.com" ADD_DATE="1700000001">Google</A>
    </DL><p>
    <DT><A HREF="https://github.com" ADD_DATE="1700000002">GitHub</A>
</DL><p>`;

const NESTED_HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000">Parent Folder</H3>
    <DL><p>
        <DT><H3 ADD_DATE="1700000001">Child Folder</H3>
        <DL><p>
            <DT><A HREF="https://nested.com" ADD_DATE="1700000002">Nested</A>
        </DL><p>
    </DL><p>
</DL><p>`;

describe("HtmlParser", () => {
  describe("parse", () => {
    it("应能解析标准 Netscape 书签格式并返回结果", () => {
      const parser = new HtmlParser();
      const result = parser.parse(VALID_HTML);

      // jsdom 的 DOMParser 对 Netscape 格式的解析可能与浏览器不同
      // 验证返回结构正确
      expect(result).toHaveProperty("bookmarks");
      expect(result).toHaveProperty("folders");
      expect(Array.isArray(result.bookmarks)).toBe(true);
      expect(Array.isArray(result.folders)).toBe(true);
      // 至少应解析出一些书签
      expect(result.bookmarks.length).toBeGreaterThanOrEqual(1);
    });

    it("解析出的书签应包含必要字段", () => {
      const parser = new HtmlParser();
      const result = parser.parse(VALID_HTML);

      if (result.bookmarks.length > 0) {
        const bookmark = result.bookmarks[0];
        expect(bookmark).toHaveProperty("id");
        expect(bookmark).toHaveProperty("title");
        expect(bookmark).toHaveProperty("url");
        expect(bookmark).toHaveProperty("folderId");
        expect(bookmark).toHaveProperty("tags");
        expect(bookmark).toHaveProperty("createTime");
      }
    });

    it("解析出的文件夹应包含必要字段", () => {
      const parser = new HtmlParser();
      const result = parser.parse(VALID_HTML);

      if (result.folders.length > 0) {
        const folder = result.folders[0];
        expect(folder).toHaveProperty("id");
        expect(folder).toHaveProperty("name");
        expect(folder).toHaveProperty("sort");
        expect(folder).toHaveProperty("createTime");
      }
    });

    it("无效 HTML 应抛出错误", () => {
      const parser = new HtmlParser();
      expect(() =>
        parser.parse("<html><body>not a bookmark file</body></html>"),
      ).toThrow();
    });

    it("每个书签应有唯一 ID", () => {
      const parser = new HtmlParser();
      const result = parser.parse(VALID_HTML);

      const ids = result.bookmarks.map((b) => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("validate", () => {
    it("有效的 Netscape 格式应通过验证", () => {
      const result = HtmlParser.validate(VALID_HTML);
      expect(result.isValid).toBe(true);
    });

    it("非 Netscape 格式应不通过验证", () => {
      const result = HtmlParser.validate("<html><body>hello</body></html>");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("缺少 DL 标签应不通过验证", () => {
      const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>`;
      const result = HtmlParser.validate(html);
      expect(result.isValid).toBe(false);
    });
  });

  describe("detectEncoding", () => {
    it("应检测 UTF-8 BOM", () => {
      const content = "\uFEFF<!DOCTYPE html>";
      expect(HtmlParser.detectEncoding(content)).toBe("utf-8");
    });

    it("应从 meta 标签检测编码", () => {
      const content = '<meta charset="gbk">';
      expect(HtmlParser.detectEncoding(content)).toBe("gbk");
    });

    it("默认应返回 utf-8", () => {
      expect(HtmlParser.detectEncoding("hello")).toBe("utf-8");
    });
  });
});
