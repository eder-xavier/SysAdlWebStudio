export function getDefaultValue(type) {
  if (type === "Int") return 0;
  if (type === "Float") return 0.0;
  if (type === "String") return "";
  if (type === "Boolean") return false;
  if (type === "Position") return { x: 0, y: 0 };
  if (type === "Load") return { id: "", weight: 0 };
  if (type === "Status") return "IDLE";
  if (type === "Distance") return 0;
  if (type.endsWith("[]")) return [];
  return null;
}

export function log(message) {
  const logEl = document.getElementById("log");
  if (logEl) {
    logEl.innerText += message + "\n";
    logEl.scrollTop = logEl.scrollHeight;
  }
  console.log(message);
}