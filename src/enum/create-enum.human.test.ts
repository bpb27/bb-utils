import { createEnum, createEnumWithMeta, type EnumValues } from "./create-enum";
import { describe, test, expect } from "vite-plus/test";

describe("Human-written createEnum test", () => {
  test("happy path", () => {
    const STATUS = createEnum("active", "inactive", "pending");
    type Status = EnumValues<typeof STATUS>;

    expect(STATUS.ref.active).toEqual("active");
    expect(STATUS.ref.inactive).toEqual("inactive");
    expect(STATUS.ref.pending).toEqual("pending");

    expect(STATUS.keys).toEqual<Status[]>(["active", "inactive", "pending"]);

    const contained = "active";
    expect(STATUS.contains(contained)).toEqual(true);
    expect(STATUS.contains("fake")).toEqual(false);
    if (STATUS.contains(contained)) {
      expect(contained).toEqual<Status>("active");
    }

    expect(() => STATUS.assert("active")).not.toThrow();
    expect(() => STATUS.assert("fake")).toThrow(RangeError);

    const letterMap = STATUS.remap({ active: "A", inactive: "I", pending: "P" });
    expect(letterMap).toEqual({
      active: "A",
      inactive: "I",
      pending: "P",
    });
    expect(letterMap.active).toEqual<string>("A");
    expect(letterMap.inactive).toEqual<string>("I");
    expect(letterMap.pending).toEqual<string>("P");
    // @ts-expect-error - missing keys
    const _remapNonExhaustive = STATUS.remap({ active: "A" });
    // @ts-expect-error - contains non-enum keys
    const _remapBadKey = STATUS.remap({ active: "A", inactive: "I", pending: "P", fake: "F" });

    for (const status of STATUS.keys) {
      expect(status).toBeOneOf<Status>([...STATUS.keys]);
    }
  });

  test("happy path with metda", () => {
    const STATUS = createEnumWithMeta({
      active: { label: "Active" },
      inactive: { label: "Inactive" },
      pending: { label: "Pending" },
    });
    type Status = EnumValues<typeof STATUS>;

    expect(STATUS.meta.active.label).toEqual<string>("Active");
    expect(STATUS.meta.inactive.label).toEqual<string>("Inactive");
    expect(STATUS.meta.pending.label).toEqual<string>("Pending");

    expect(STATUS.get("active")).toEqual({ label: "Active" });
    expect(STATUS.get("fake")).toEqual(undefined);

    expect(STATUS.values).toEqual([
      { label: "Active" },
      { label: "Inactive" },
      { label: "Pending" },
    ]);

    expect(STATUS.ref.active).toEqual("active");
    expect(STATUS.ref.inactive).toEqual("inactive");
    expect(STATUS.ref.pending).toEqual("pending");

    expect(STATUS.keys).toEqual<Status[]>(["active", "inactive", "pending"]);

    const contained = "active";
    expect(STATUS.contains(contained)).toEqual(true);
    expect(STATUS.contains("fake")).toEqual(false);
    if (STATUS.contains(contained)) {
      expect(contained).toEqual<Status>("active");
    }

    expect(() => STATUS.assert("active")).not.toThrow();
    expect(() => STATUS.assert("fake")).toThrow(RangeError);

    const letterMap = STATUS.remap({ active: "A", inactive: "I", pending: "P" });
    expect(letterMap).toEqual({
      active: "A",
      inactive: "I",
      pending: "P",
    });
    expect(letterMap.active).toEqual<string>("A");
    expect(letterMap.inactive).toEqual<string>("I");
    expect(letterMap.pending).toEqual<string>("P");
    // @ts-expect-error - missing keys
    const _remapNonExhaustive = STATUS.remap({ active: "A" });
    // @ts-expect-error - contains non-enum keys
    const _remapBadKey = STATUS.remap({ active: "A", inactive: "I", pending: "P", fake: "F" });

    for (const status of STATUS.keys) {
      expect(status).toBeOneOf<Status>([...STATUS.keys]);
    }
  });
});
