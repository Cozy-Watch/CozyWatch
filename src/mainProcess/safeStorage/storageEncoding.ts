import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const COMPRESSED_VALUE_PREFIX = "gzip:";

export const encodeStorageValue = async (
  value: unknown,
  compress: boolean,
): Promise<string> => {
  const serializedValue = JSON.stringify(value);
  if (!compress) {
    return serializedValue;
  }
  const compressedValue = await gzipAsync(serializedValue);
  return `${COMPRESSED_VALUE_PREFIX}${compressedValue.toString("base64")}`;
};

export const decodeStorageValue = async <T>(value: string): Promise<T> => {
  const serializedValue = value.startsWith(COMPRESSED_VALUE_PREFIX)
    ? (
        await gunzipAsync(
          Buffer.from(value.slice(COMPRESSED_VALUE_PREFIX.length), "base64"),
        )
      ).toString("utf8")
    : value;
  return JSON.parse(serializedValue) as T;
};
