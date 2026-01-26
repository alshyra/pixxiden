/**
 * Global type declarations for WebDriverIO E2E tests
 * These types are injected at runtime by WebDriverIO
 */

/// <reference types="webdriverio/async" />

import type {
  Browser as WdioBrowser,
  Element as WdioElement,
  ElementArray as WdioElementArray,
} from "webdriverio";

declare global {
  const browser: WdioBrowser;
  function $(selector: string): ChainablePromiseElement;
  function $$(selector: string): ChainablePromiseArray;
  const expect: typeof import("expect-webdriverio").expect;

  // WebDriverIO element types that support chaining
  interface ChainablePromiseElement extends Promise<WdioElement> {
    getText(): Promise<string>;
    click(): Promise<void>;
    isDisplayed(): Promise<boolean>;
    isExisting(): Promise<boolean>;
    waitForDisplayed(options?: { timeout?: number }): Promise<void>;
    moveTo(): Promise<void>;
    getAttribute(name: string): Promise<string>;
    getHTML(includeSelf?: boolean): Promise<string>;
    $(selector: string): ChainablePromiseElement;
    $$(selector: string): ChainablePromiseArray;
    selectByAttribute(attr: string, value: string): Promise<void>;
  }

  interface ChainablePromiseArray extends Promise<WdioElementArray> {
    length: Promise<number>;
  }
}

export {};
