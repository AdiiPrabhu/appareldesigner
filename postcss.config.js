// CommonJS syntax: package.json has no "type":"module",
// so .js files are CJS by default. Using export default causes the
// [MODULE_TYPELESS_PACKAGE_JSON] Node.js warning.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
