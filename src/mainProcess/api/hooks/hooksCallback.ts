import type { OctokitResponse, RequestOptions } from "@octokit/types";
import { RequestError } from "@octokit/request-error";
import { getPage } from "../utils/getPage";

interface BeforeParams {
  name: string;
  callback: (options: RequestOptions, page: string) => void;
}

export const before =
  ({ name, callback }: BeforeParams) =>
  async (options: RequestOptions) => {
    const operationName = options.headers?.["x-operation-name"];

    if (!operationName) {
      return;
    }

    // Different
    if (name !== operationName) {
      return;
    }

    const page = getPage(options);
    callback(options, page);
  };

interface AfterParams<T> {
  name: string;
  callback: (
    response: OctokitResponse<T, number>,
    options: RequestOptions,
    page: string
  ) => void;
}

export const after =
  <T>({ name, callback }: AfterParams<T>) =>
  async (response: OctokitResponse<T, number>, options: RequestOptions) => {
    const operationName = options.headers?.["x-operation-name"];

    if (!operationName) {
      return;
    }

    if (response.status === 304) {
      return;
    }

    // Different
    if (name !== operationName) {
      return;
    }

    const page = getPage(options);
    callback(response, options, page);
  };

// TODO - NOT USED YET
// SHOULD BE USED TO CLEAR WHATEVER WAS DELETED
interface ErrorParams {
  name: string;
  callback: (error: RequestError, options: RequestOptions) => void;
}

export const error =
  ({ name, callback }: ErrorParams) =>
  async (error: RequestError, options: RequestOptions) => {
    const operationName = options.headers?.["x-operation-name"];

    if (!operationName) {
      throw error;
    }

    // Different
    if (name !== operationName) {
      throw error;
    }

    callback(error, options);

    throw error;
  };
