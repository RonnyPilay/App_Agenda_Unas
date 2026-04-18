const localHosts = ["localhost", "127.0.0.1", "::1"];
const isLocalEnv =
  window.location.protocol === "file:" || localHosts.includes(window.location.hostname);

window.APP_CONFIG = {
  API_BASE: isLocalEnv
    ? "http://localhost:4000/api"
    : "https://app-agenda-unas.onrender.com/api",
};

