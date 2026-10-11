/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as autenticacion from "../autenticacion.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_password from "../lib/password.js";
import type * as seed from "../seed.js";
import type * as seguimientos from "../seguimientos.js";
import type * as usuarios from "../usuarios.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  autenticacion: typeof autenticacion;
  "lib/authz": typeof lib_authz;
  "lib/password": typeof lib_password;
  seed: typeof seed;
  seguimientos: typeof seguimientos;
  usuarios: typeof usuarios;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
