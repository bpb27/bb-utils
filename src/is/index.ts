import { isNumber, isString } from "./is";

export const is = Object.freeze({
  string: isString,
  number: isNumber,
});
