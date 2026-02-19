"use strict";
/**
 * @grounded/db — Public API
 *
 * This is the only entry point for other packages to consume the database layer.
 * Exporting from a single index file means that if we reorganise internals
 * (e.g. split client.ts into multiple files), consumers don't need updating.
 *
 * What's exported:
 *  - prisma: the singleton PrismaClient instance
 *  - All Prisma-generated types (Deal, Workspace, Annotation etc.) so that
 *    apps/api can import them from '@grounded/db' instead of the generated path
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotationCategory = exports.FieldType = exports.DealStatus = exports.WorkspaceMemberRole = exports.prisma = void 0;
var client_1 = require("./client");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return client_1.prisma; } });
var client_2 = require("./generated/client");
Object.defineProperty(exports, "WorkspaceMemberRole", { enumerable: true, get: function () { return client_2.WorkspaceMemberRole; } });
Object.defineProperty(exports, "DealStatus", { enumerable: true, get: function () { return client_2.DealStatus; } });
Object.defineProperty(exports, "FieldType", { enumerable: true, get: function () { return client_2.FieldType; } });
Object.defineProperty(exports, "AnnotationCategory", { enumerable: true, get: function () { return client_2.AnnotationCategory; } });
//# sourceMappingURL=index.js.map