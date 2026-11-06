// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // El patrón actual de carga (marcar "cargando" al disparar el fetch dentro
      // de un efecto) dispara esta regla. La solución de fondo es mover el estado
      // del servidor a TanStack Query; hasta entonces
      // queda como aviso para no ocultar el resto de los errores.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
