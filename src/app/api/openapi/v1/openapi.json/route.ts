import { NextResponse } from "next/server";
import { PASSWORD_PREFIX_OPTIONS } from "@/lib/types";

const prefixEnum = [...PASSWORD_PREFIX_OPTIONS];

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "LockPass Password Generation API",
    version: "1.0.0",
    description:
      "External password generation API for other systems. Authenticate with a per-caller API key. Every call requires a purpose and is written to a server-side call log (including the plaintext password).",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/openapi/v1/password/generate": {
      post: {
        operationId: "generatePassword",
        summary: "Generate a password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["purpose"],
                properties: {
                  purpose: {
                    type: "string",
                    minLength: 1,
                    maxLength: 500,
                    description: "Why this password is being generated",
                    example: "provisioning user for CRM",
                  },
                  length: {
                    type: "integer",
                    minimum: 8,
                    maximum: 128,
                    default: 16,
                  },
                  prefix: {
                    type: "string",
                    enum: prefixEnum,
                    default: "",
                    description: 'Optional prefix. Use "" for none.',
                  },
                  includeUppercase: { type: "boolean", default: true },
                  includeLowercase: { type: "boolean", default: true },
                  includeNumbers: { type: "boolean", default: true },
                  includeSpecial: { type: "boolean", default: true },
                  minNumbers: {
                    type: "integer",
                    minimum: 0,
                    maximum: 32,
                    default: 1,
                  },
                  minSpecialChars: {
                    type: "integer",
                    minimum: 0,
                    maximum: 32,
                    default: 1,
                  },
                  excludeAmbiguous: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["password", "requestId"],
                  properties: {
                    password: { type: "string" },
                    requestId: {
                      type: "string",
                      description: "Call log entry id",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation or generation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid API key",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { error: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key issued to the calling system",
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiDocument);
}
