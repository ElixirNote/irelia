/**
 * This module was automatically generated by `ts-interface-builder`
 */
import * as t from "ts-interface-checker";
// tslint:disable:object-literal-key-quotes

export const NewRecord = t.iface([], {
  "fields": t.opt(t.iface([], {
    [t.indexKey]: "CellValue",
  })),
});

export const Record = t.iface([], {
  "id": "number",
  "fields": t.iface([], {
    [t.indexKey]: "CellValue",
  }),
});

export const AddOrUpdateRecord = t.iface([], {
  "require": t.intersection(t.iface([], {
    [t.indexKey]: "CellValue",
  }), t.iface([], {
    "id": t.opt("number"),
  })),
  "fields": t.opt(t.iface([], {
    [t.indexKey]: "CellValue",
  })),
});

export const RecordsPatch = t.iface([], {
  "records": t.tuple("Record", t.rest(t.array("Record"))),
});

export const RecordsPost = t.iface([], {
  "records": t.tuple("NewRecord", t.rest(t.array("NewRecord"))),
});

export const RecordsPut = t.iface([], {
  "records": t.tuple("AddOrUpdateRecord", t.rest(t.array("AddOrUpdateRecord"))),
});

export const RecordId = t.name("number");

export const MinimalRecord = t.iface([], {
  "id": "number",
});

const exportedTypeSuite: t.ITypeSuite = {
  NewRecord,
  Record,
  AddOrUpdateRecord,
  RecordsPatch,
  RecordsPost,
  RecordsPut,
  RecordId,
  MinimalRecord,
};
export default exportedTypeSuite;
