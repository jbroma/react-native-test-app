// @ts-check
import { deepEqual, equal, match, notEqual } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  findFile as findFileActual,
  validateManifest as validateManifestActual,
} from "../scripts/validate-manifest.js";
import fs from "./fs.mock.js";
import spy from "./spy.mjs";

describe("validate-manifest", () => {
  /** @type {typeof findFileActual} */
  const findFile = (file, startDir = undefined) =>
    findFileActual(file, startDir, fs);

  /** @type {typeof validateManifestActual} */
  const validateManifest = (p) => validateManifestActual(p, fs);

  afterEach(() => {
    fs.__setMockFiles();
  });

  it("finds app manifest", () => {
    fs.__setMockFiles({
      "example/app.json": `{ "name": "Example" }`,
      "example/node_modules/react-native-test-app/package.json": `{ "name": "Example" }`,
    });

    equal(findFile("app.json"), undefined);
    notEqual(findFile("app.json", "example"), undefined);
    notEqual(
      findFile("app.json", "example/node_modules/react-native-test-app"),
      undefined
    );
  });

  it("handles missing app manifest", (t) => {
    t.mock.method(console, "error", () => null);

    equal(validateManifest(undefined), 1);
    equal(spy(console.error).calls.length, 1);
    deepEqual(spy(console.error).calls[0].arguments, [
      `Failed to find 'app.json'. Please make sure you're in the right directory.`,
    ]);
  });

  it("catches missing root properties", (t) => {
    t.mock.method(console, "error", () => null);
    fs.__setMockFiles({
      "app.json": `{ "name": "Example" }`,
    });

    equal(validateManifest(findFile("app.json")), 1001);
    equal(spy(console.error).calls.length, 2);
    match(
      spy(console.error).calls[0].arguments[0],
      /app.json: error: app.json is not a valid app manifest$/
    );
    match(
      spy(console.error).calls[1].arguments[0],
      /app.json: error: <root> must have required property 'displayName'$/
    );
  });

  it("catches missing component properties", (t) => {
    t.mock.method(console, "error", () => null);
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "components": [
          {
            "displayName": "App"
          },
          {
            "appKey": "Example",
            "displayName": "App (modal)",
            "presentationStyle": "modal"
          }
        ]
      }`,
    });

    equal(validateManifest(findFile("app.json")), 1001);
    equal(spy(console.error).calls.length, 2);
    match(
      spy(console.error).calls[0].arguments[0],
      /app.json: error: app.json is not a valid app manifest$/
    );
    match(
      spy(console.error).calls[1].arguments[0],
      /app.json: error: \/components\/0 must have required property 'appKey'$/
    );
  });

  it("catches invalid values for `presentationStyle`", (t) => {
    t.mock.method(console, "error", () => null);
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "components": [
          {
            "appKey": "Example",
            "presentationStyle": "null"
          }
        ]
      }`,
    });

    equal(validateManifest(findFile("app.json")), 1001);
    equal(spy(console.error).calls.length, 2);
    match(
      spy(console.error).calls[0].arguments[0],
      /app.json: error: app.json is not a valid app manifest$/
    );
    match(
      spy(console.error).calls[1].arguments[0],
      /app.json: error: \/components\/0\/presentationStyle must be equal to one of the allowed values$/
    );
  });

  it("catches invalid values for resources", (t) => {
    t.mock.method(console, "error", () => null);
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "resources": 0
      }`,
    });

    equal(validateManifest(findFile("app.json")), 1003);
    match(
      spy(console.error).calls[0].arguments[0],
      /app.json: error: app.json is not a valid app manifest$/
    );
    match(
      spy(console.error).calls[1].arguments[0],
      /app.json: error: \/resources must be array$/
    );
    match(
      spy(console.error).calls[2].arguments[0],
      /app.json: error: \/resources must be object$/
    );
  });

  it("catches duplicate resources", (t) => {
    t.mock.method(console, "error", () => null);
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "resources": [
          "app.json",
          "app.json"
        ]
      }`,
    });

    equal(validateManifest(findFile("app.json")), 1003);
    match(
      spy(console.error).calls[0].arguments[0],
      /app.json: error: app.json is not a valid app manifest$/
    );
    match(
      spy(console.error).calls[1].arguments[0],
      /app.json: error: \/resources must NOT have duplicate items/
    );
  });

  for (const platform of ["android", "ios", "macos", "windows"]) {
    it(`catches duplicate, ${platform} specific resources`, (t) => {
      t.mock.method(console, "error", () => null);
      fs.__setMockFiles({
        "app.json": `{
          "name": "Example",
          "displayName": "Example",
          "resources": {
            "${platform}": [
              "app.json",
              "app.json"
            ]
          }
        }`,
      });

      equal(validateManifest(findFile("app.json")), 1003);
      match(
        spy(console.error).calls[0].arguments[0],
        /app.json: error: app.json is not a valid app manifest$/
      );
      match(
        spy(console.error).calls[1].arguments[0],
        /app.json: error: \/resources must be array$/
      );
      match(
        spy(console.error).calls[2].arguments[0],
        new RegExp(
          `app.json: error: /resources/${platform} must NOT have duplicate items`
        )
      );
    });
  }

  it("is silent on valid manifests", (t) => {
    t.mock.method(console, "error", () => null);
    fs.__setMockFiles({
      "app.json": `{
        "name": "Example",
        "displayName": "Example",
        "components": [
          {
            "appKey": "Example",
            "displayName": "App"
          },
          {
            "appKey": "Example",
            "displayName": "App (modal)",
            "presentationStyle": "modal"
          }
        ],
        "resources": {
          "android": [
            "dist/res",
            "dist/main.android.jsbundle"
          ],
          "ios": [
            "dist/assets",
            "dist/main.ios.jsbundle"
          ],
          "macos": [
            "dist/assets",
            "dist/main.macos.jsbundle"
          ],
          "windows": [
            "dist/assets",
            "dist/main.windows.bundle"
          ]
        }
      }`,
    });
    deepEqual(validateManifest(findFile("app.json")), {
      components: [
        {
          appKey: "Example",
          displayName: "App",
        },
        {
          appKey: "Example",
          displayName: "App (modal)",
          presentationStyle: "modal",
        },
      ],
      displayName: "Example",
      name: "Example",
    });
    equal(spy(console.error).calls.length, 0);
  });
});
