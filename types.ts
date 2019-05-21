import { GirModule } from "./girModule";

interface GjsDollar<T> {
  $: T;
}

export interface TsForGjsExtended<T> extends GjsDollar<T> {
  _module?: GirModule;
  _fullSymName?: string;
}

export interface IGirInclude {
  name: string;
  version: string;
}
export type GirInclude = GjsDollar<IGirInclude>;

export interface IGirDoc {
  "xml:space"?: string;
}
export interface GirDoc extends GjsDollar<IGirDoc> {
  _: string;
}

export interface IGirImplements {
  name?: string;
}
export type GirImplements = GjsDollar<IGirImplements>;

export interface IGirType {
  name: string;
  "c:type"?: string;
}
export type GirType = GjsDollar<IGirType>;

export interface IGirArray {
  length?: string;
  "zero-terminated"?: string;
  "c:type"?: string;
}
export interface GirArray extends Partial<GjsDollar<IGirArray>> {
  type?: GirType[];
}

export interface IGirVariable {
  name?: string;
  "transfer-ownership"?: string;
  nullable?: string;
  "allow-none"?: string;
  writable?: string;
  readable?: string;
  private?: string;
  "construct-only"?: string;
  direction?: string;
  introspectable?: string;
  closure?: string;
  destroy?: string;
}
export interface GirVariable extends TsForGjsExtended<IGirVariable> {
  doc?: GirDoc[];
  type?: GirType[];
  array?: GirArray[];
}

export interface GirParameter {
  parameter?: GirVariable[];
  "instance-parameter"?: GirVariable[];
}

export interface IGirFunction {
  name: string;
  version?: string;
  "c-identifier"?: string;
  introspectable?: string;
  "moved-to"?: string;
  "shadowed-by"?: string;
}
export interface GirFunction extends TsForGjsExtended<IGirFunction> {
  doc?: GirDoc[];
  parameters?: GirParameter[];
  "return-value"?: GirVariable[];
}

export interface IGirSignal {
  name: string;
  when: string;
}
export interface GirSignal extends TsForGjsExtended<IGirSignal> {
  doc?: GirDoc[];
  "return-value"?: GirParameter[];
}

export interface IGirClass {
  name: string;
  parent?: string;
  version?: string;
  // Not sure what this means
  disguised?: string;
  // c:symbol-prefix, c:type, glib:get-type, glib:type-name
  "glib:is-gtype-struct-for"?: string;
}
export interface GirClass extends TsForGjsExtended<IGirClass> {
  doc?: GirDoc[];
  function?: GirFunction[];
  "glib:signal"?: GirFunction[];
  method?: GirFunction[];
  property?: GirVariable[];
  field?: GirVariable[];
  "virtual-method"?: GirFunction[];
  constructor?: GirFunction[] | Function;
  implements?: GirImplements[];
  _module?: GirModule;
}

export interface IGirEnumMember {
  name: string;
  value: string;
}
export interface GirEnumerationMember extends GjsDollar<IGirEnumMember> {
  doc?: GirDoc[];
}

export interface IGirEnum {
  name: string;
  version?: string;
  "c:type"?: string;
  introspectable?: string;
}
export interface GirEnumeration extends TsForGjsExtended<IGirEnum> {
  doc?: GirDoc[];
  member?: GirEnumerationMember[];
}

export interface IGirAlias {
  name: string;
  "c:type"?: string;
  introspectable?: string;
}
export interface GirAlias extends TsForGjsExtended<IGirAlias> {
  type?: GirType[];
}

export interface IGirNS {
  name: string;
  version: string;
}
export interface GirNamespace extends GjsDollar<IGirNS> {
  alias?: GirAlias[];
  bitfield?: GirEnumeration[];
  callback?: GirFunction[];
  class?: GirClass[];
  constant?: GirVariable[];
  enumeration?: GirEnumeration[];
  function?: GirFunction[];
  interface?: GirClass[];
  record?: GirClass[];
  union?: GirClass[];
}

export interface GirRepository {
  include?: GirInclude[];
  namespace?: GirNamespace[];
}
