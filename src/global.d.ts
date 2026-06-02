/// <reference types="nativewind/types" />

// Type declarations for CSS modules (*.module.css)
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

// Type declaration for plain CSS side-effect imports (e.g. global.css)
declare module '*.css' {}
