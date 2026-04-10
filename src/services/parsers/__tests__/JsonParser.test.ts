import { describe, it, expect } from "vitest";
import { JsonParser } from "@/services/parsers/JsonParser";

const validJsonData = {
  version: "1.0.0",
  exportTime: Date.now(),
  bookmarks: [
    {
      id: "b1",
      title: "Example",
      url: "https://example.com",
      folderId: "f1",
      tags: [],
      createTime: Date.now(),
      updateTime: Date.now(),
      visitCount: 0,
    },
  ],
  folders: [{ id: "f1", name: "Test", sort: 0, createTime: Date.now() }],
};

describe("JsonParser", () => {
  describe("parseJson", () => {
    it("应正确解析有效 JSON", () => {
      const result = JsonParser.parseJson(JSON.stringify(validJsonData));
      expect(result.bookmarks).toHaveLength(1);
      expect(result.version).toBe("1.0.0");
    });

    it("缺少 version 应抛出错误", () => {
      const data = { bookmarks: [] };
      expect(() => JsonParser.parseJson(JSON.stringify(data))).toThrow(
        "version",
      );
    });

    it("缺少 bookmarks 应抛出错误", () => {
      const data = { version: "1.0.0" };
      expect(() => JsonParser.parseJson(JSON.stringify(data))).toThrow(
        "bookmarks",
      );
    });

    it("书签缺少 id 应抛出错误", () => {
      const data = {
        version: "1.0.0",
        bookmarks: [{ title: "Test", url: "https://example.com" }],
      };
      expect(() => JsonParser.parseJson(JSON.stringify(data))).toThrow("id");
    });

    it("书签缺少 title 应抛出错误", () => {
      const data = {
        version: "1.0.0",
        bookmarks: [{ id: "1", url: "https://example.com" }],
      };
      expect(() => JsonParser.parseJson(JSON.stringify(data))).toThrow("title");
    });

    it("书签缺少 url 应抛出错误", () => {
      const data = {
        version: "1.0.0",
        bookmarks: [{ id: "1", title: "Test" }],
      };
      expect(() => JsonParser.parseJson(JSON.stringify(data))).toThrow("url");
    });

    it("无效 JSON 字符串应抛出格式错误", () => {
      expect(() => JsonParser.parseJson("not json")).toThrow("JSON 格式错误");
    });

    it("无效 URL 应抛出错误", () => {
      const data = {
        version: "1.0.0",
        bookmarks: [{ id: "1", title: "Test", url: "not-a-url" }],
      };
      expect(() => JsonParser.parseJson(JSON.stringify(data))).toThrow("URL");
    });
  });

  describe("parsePbm", () => {
    it("应正确解析明文 PBM 格式", () => {
      const pbmData = {
        format: "pbm",
        version: "1.0.0",
        encrypted: false,
        createTime: Date.now(),
        data: validJsonData,
      };
      const result = JsonParser.parsePbm(JSON.stringify(pbmData));
      expect(result.format).toBe("pbm");
      expect(result.encrypted).toBe(false);
    });

    it("非 PBM 格式应抛出错误", () => {
      const data = { format: "other", version: "1.0.0" };
      expect(() => JsonParser.parsePbm(JSON.stringify(data))).toThrow("PBM");
    });

    it("加密 PBM 缺少 encryptedData 应抛出错误", () => {
      const data = {
        format: "pbm",
        version: "1.0.0",
        encrypted: true,
        createTime: Date.now(),
      };
      expect(() => JsonParser.parsePbm(JSON.stringify(data))).toThrow(
        "encryptedData",
      );
    });
  });

  describe("validate", () => {
    it("有效 JSON 应通过验证", () => {
      expect(JsonParser.validate('{"key": "value"}').isValid).toBe(true);
    });

    it("无效 JSON 应不通过验证", () => {
      const result = JsonParser.validate("not json");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("detectJsonType", () => {
    it("应检测 PBM 格式", () => {
      const data = { format: "pbm", version: "1.0.0" };
      expect(JsonParser.detectJsonType(JSON.stringify(data))).toBe("pbm");
    });

    it("应检测标准 JSON 格式", () => {
      expect(JsonParser.detectJsonType(JSON.stringify(validJsonData))).toBe(
        "json",
      );
    });

    it("未知格式应返回 unknown", () => {
      expect(JsonParser.detectJsonType(JSON.stringify({ foo: "bar" }))).toBe(
        "unknown",
      );
    });

    it("无效 JSON 应返回 unknown", () => {
      expect(JsonParser.detectJsonType("not json")).toBe("unknown");
    });
  });

  describe("checkVersionCompatibility", () => {
    it("相同主版本应兼容", () => {
      const result = JsonParser.checkVersionCompatibility("1.0.0", "1.2.0");
      expect(result.compatible).toBe(true);
    });

    it("不同主版本应不兼容", () => {
      const result = JsonParser.checkVersionCompatibility("2.0.0", "1.0.0");
      expect(result.compatible).toBe(false);
    });

    it("数据次版本高于当前应给出警告", () => {
      const result = JsonParser.checkVersionCompatibility("1.3.0", "1.2.0");
      expect(result.compatible).toBe(true);
      expect(result.warning).toBeDefined();
    });
  });

  describe("sanitizeData", () => {
    it("应过滤无效书签", () => {
      const data = {
        ...validJsonData,
        bookmarks: [
          ...validJsonData.bookmarks,
          { id: "", title: "", url: "" } as never,
        ],
      };
      const result = JsonParser.sanitizeData(data);
      expect(result.bookmarks).toHaveLength(1);
    });

    it("应保留有效数据", () => {
      const result = JsonParser.sanitizeData(validJsonData);
      expect(result.bookmarks).toHaveLength(1);
      expect(result.folders).toHaveLength(1);
    });
  });
});
